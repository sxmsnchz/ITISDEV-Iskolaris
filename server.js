const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsing
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure directories exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'db.json');

// Helper to read database
function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { users: [], renewals: [], appeals: [], stipends: [], expenses: [], grades_history: [], vault: [], notifications: [] };
  }
}

// Helper to write database
function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// API Endpoints

// 1. AUTH
app.post('/api/auth/register', upload.single('awardLetter'), (req, res) => {
  const { id, name, email, password, college, degree, scholarshipType, cgpa, tgpa } = req.body;
  const db = readDB();

  // Check if user already exists
  if (db.users.find(u => u.id === id || u.email === email)) {
    return res.status(400).json({ success: false, message: 'User with this ID or Email already exists.' });
  }

  const awardLetterPath = req.file ? `uploads/${req.file.filename}` : '';

  const newUser = {
    id,
    name,
    email,
    password,
    role: 'student',
    college,
    degree,
    scholarshipType,
    status: 'pending', // Starts pending manual approval
    awardLetter: awardLetterPath,
    cgpa: parseFloat(cgpa) || 0.0,
    tgpa: parseFloat(tgpa) || 0.0,
    currentTerm: 'AY 2025-2026 Term 3',
    renewalStatus: 'Not Started',
    unitsCompleted: 0,
    unitsRemaining: 150
  };

  db.users.push(newUser);

  // Send a default admin notification
  db.notifications.push({
    id: 'not_admin_' + Date.now(),
    studentId: 'adso_admin',
    title: 'New Scholar Registration',
    message: `${name} (${id}) registered as ${scholarshipType} and is pending verification.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  res.json({ success: true, user });
});

// 2. USER PROFILE & HISTORY
app.get('/api/users/profile/:id', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

app.post('/api/users/profile/:id/update', (req, res) => {
  const db = readDB();
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'User not found' });

  db.users[index] = { ...db.users[index], ...req.body };
  writeDB(db);
  res.json({ success: true, user: db.users[index] });
});

// 3. RENEWALS
app.post('/api/renewal/submit', upload.fields([{ name: 'eaf' }, { name: 'grades' }]), (req, res) => {
  const { studentId, tgpa, cgpa, term } = req.body;
  const db = readDB();

  const student = db.users.find(u => u.id === studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  const eafFile = req.files['eaf'] ? `uploads/${req.files['eaf'][0].filename}` : '';
  const gradesFile = req.files['grades'] ? `uploads/${req.files['grades'][0].filename}` : '';

  // Count past appeals
  const appealCount = db.appeals.filter(a => a.studentId === studentId).length;

  // Compile evaluation insights automatically
  // Star Scholar limit is 3.0, DOST limit is 2.50, St. La Salle is 2.0
  let requiredGPA = 2.0;
  if (student.scholarshipType.includes('Star')) requiredGPA = 3.0;
  else if (student.scholarshipType.includes('DOST')) requiredGPA = 2.5;

  const passesGPA = parseFloat(cgpa) >= requiredGPA;
  const insights = `${passesGPA ? 'Grades meet' : 'Grades FAIL'} the retention threshold of ${requiredGPA.toFixed(2)}. Student has ${appealCount} past appeals.`;

  const newRenewal = {
    id: 'ren_' + Date.now(),
    studentId,
    studentName: student.name,
    scholarshipType: student.scholarshipType,
    term,
    eafFile,
    gradesFile,
    tgpa: parseFloat(tgpa),
    cgpa: parseFloat(cgpa),
    status: 'Submitted',
    submittedAt: new Date().toISOString(),
    appealCount,
    insights
  };

  // Lock status on student
  student.renewalStatus = 'Submitted';
  student.cgpa = parseFloat(cgpa);
  student.tgpa = parseFloat(tgpa);

  db.renewals.push(newRenewal);
  writeDB(db);

  res.json({ success: true, renewal: newRenewal });
});

app.get('/api/renewal/status/:studentId', (req, res) => {
  const db = readDB();
  const renewal = db.renewals
    .filter(r => r.studentId === req.params.studentId)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

  res.json({ success: true, renewal: renewal || null });
});

// 4. APPEALS
app.post('/api/appeal/submit', upload.fields([{ name: 'letter' }, { name: 'support' }]), (req, res) => {
  const { studentId, term, reason } = req.body;
  const db = readDB();

  const student = db.users.find(u => u.id === studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  const letterFile = req.files['letter'] ? `uploads/${req.files['letter'][0].filename}` : '';
  const supportingFiles = req.files['support'] ? `uploads/${req.files['support'][0].filename}` : '';

  const newAppeal = {
    id: 'app_' + Date.now(),
    studentId,
    studentName: student.name,
    scholarshipType: student.scholarshipType,
    term,
    letterFile,
    supportingFiles,
    reason,
    status: 'Pending',
    submittedAt: new Date().toISOString()
  };

  student.renewalStatus = 'Appeal Submitted';

  db.appeals.push(newAppeal);
  writeDB(db);

  res.json({ success: true, appeal: newAppeal });
});

// 5. BUDGET & FINANCIAL LEDGER
app.get('/api/budget/data/:studentId', (req, res) => {
  const db = readDB();
  const data = db.expenses.filter(e => e.studentId === req.params.studentId);
  res.json({ success: true, data });
});

app.post('/api/budget/add', (req, res) => {
  const { studentId, type, category, amount, date, description } = req.body;
  const db = readDB();

  const newItem = {
    id: 'exp_' + Date.now(),
    studentId,
    type, // 'income' or 'expense'
    category, // 'food', 'transportation', 'dorm rent', 'school supplies', 'allowance', 'stipend', 'other'
    amount: parseFloat(amount),
    date: date || new Date().toISOString().split('T')[0],
    description
  };

  db.expenses.push(newItem);
  writeDB(db);
  res.json({ success: true, data: newItem });
});

// 6. ACADEMIC GRADES HISTORY
app.get('/api/grades/history/:studentId', (req, res) => {
  const db = readDB();
  const history = db.grades_history.filter(g => g.studentId === req.params.studentId);
  res.json({ success: true, history });
});

app.post('/api/grades/add', (req, res) => {
  const { studentId, termName, tgpa, cgpa } = req.body;
  const db = readDB();

  const newGrade = {
    studentId,
    termName,
    tgpa: parseFloat(tgpa),
    cgpa: parseFloat(cgpa)
  };

  db.grades_history.push(newGrade);

  // Update cumulative grades on profile
  const student = db.users.find(u => u.id === studentId);
  if (student) {
    student.cgpa = parseFloat(cgpa);
    student.tgpa = parseFloat(tgpa);
  }

  writeDB(db);
  res.json({ success: true, grade: newGrade });
});

// 7. DEAN'S LIST CERTIFICATE VAULT
app.get('/api/vault/files/:studentId', (req, res) => {
  const db = readDB();
  const files = db.vault.filter(f => f.studentId === req.params.studentId);
  res.json({ success: true, files });
});

app.post('/api/vault/upload', upload.single('certificate'), (req, res) => {
  const { studentId, term } = req.body;
  const db = readDB();

  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const newCert = {
    id: 'dl_' + Date.now(),
    studentId,
    fileName: req.file.originalname,
    filePath: `uploads/${req.file.filename}`,
    fileSize: (req.file.size / (1024 * 1024)).toFixed(1) + ' MB',
    uploadedAt: new Date().toISOString(),
    term
  };

  db.vault.push(newCert);
  writeDB(db);
  res.json({ success: true, file: newCert });
});

// 8. NOTIFICATIONS
app.get('/api/notifications/:studentId', (req, res) => {
  const db = readDB();
  const list = db.notifications.filter(n => n.studentId === req.params.studentId);
  res.json({ success: true, notifications: list });
});

app.post('/api/notifications/read/:studentId', (req, res) => {
  const db = readDB();
  db.notifications.forEach(n => {
    if (n.studentId === req.params.studentId) {
      n.read = true;
    }
  });
  writeDB(db);
  res.json({ success: true });
});


// ==========================================
// ADMINISTRATOR API ROUTES
// ==========================================

// 1. Registration approvals
app.get('/api/admin/pending', (req, res) => {
  const db = readDB();
  const pending = db.users.filter(u => u.status === 'pending');
  res.json({ success: true, pending });
});

app.post('/api/admin/approve-user', (req, res) => {
  const { studentId } = req.body;
  const db = readDB();

  const student = db.users.find(u => u.id === studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  student.status = 'approved';

  // Create notifications
  db.notifications.push({
    id: 'not_' + Date.now(),
    studentId,
    title: 'Account Approved!',
    message: 'Welcome to Iskolaris! Your account has been verified and fully unlocked.',
    read: false,
    createdAt: new Date().toISOString()
  });

  // Create initial stipend record for this term if approved
  const existingStip = db.stipends.find(s => s.studentId === studentId && s.term === 'AY 2025-2026 Term 3');
  if (!existingStip) {
    const isMonthly = student.scholarshipType.includes('Star') || student.scholarshipType.includes('DOST');
    const amount = student.scholarshipType.includes('Star') ? 8000 : (student.scholarshipType.includes('DOST') ? 7000 : 0);

    db.stipends.push({
      id: 'stip_' + Date.now(),
      studentId,
      term: 'AY 2025-2026 Term 3',
      type: isMonthly ? 'monthly' : 'termly',
      monthlyStatus: isMonthly ? [
        {"month": 1, "status": "Pending", "amount": amount, "date": null},
        {"month": 2, "status": "Pending", "amount": amount, "date": null},
        {"month": 3, "status": "Pending", "amount": amount, "date": null},
        {"month": 4, "status": "Pending", "amount": amount, "date": null}
      ] : [
        {"month": 1, "status": "Pending", "amount": 15000, "date": null} // single block payment
      ]
    });
  }

  writeDB(db);
  res.json({ success: true });
});

app.post('/api/admin/reject-user', (req, res) => {
  const { studentId } = req.body;
  const db = readDB();

  const student = db.users.find(u => u.id === studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  student.status = 'rejected';
  writeDB(db);
  res.json({ success: true });
});

// 2. Renewal Review Queue
app.get('/api/admin/renewals', (req, res) => {
  const db = readDB();
  res.json({ success: true, renewals: db.renewals });
});

app.post('/api/admin/renewal-action', (req, res) => {
  const { renewalId, action } = req.body; // action: 'Renewed', 'Probation', 'Terminated'
  const db = readDB();

  const renewal = db.renewals.find(r => r.id === renewalId);
  if (!renewal) return res.status(404).json({ success: false, message: 'Renewal not found.' });

  renewal.status = action === 'Renewed' ? 'Processed' : action;
  renewal.evaluatedAt = new Date().toISOString();

  // Update user profile status
  const student = db.users.find(u => u.id === renewal.studentId);
  if (student) {
    student.renewalStatus = action;
  }

  // Push notifications
  db.notifications.push({
    id: 'not_' + Date.now(),
    studentId: renewal.studentId,
    title: `Scholarship Status: ${action}`,
    message: action === 'Renewed'
      ? 'Your scholarship has been renewed for the current term! Stipend tracking is active.'
      : (action === 'Probation'
        ? 'Your renewal has been placed on Probation due to grade requirements. Please submit your appeal letter immediately.'
        : 'Your scholarship renewal has been terminated. You can file an appeal or seek secondary assistance.'),
    read: false,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({ success: true });
});

// 3. Appeals desk
app.get('/api/admin/appeals', (req, res) => {
  const db = readDB();
  res.json({ success: true, appeals: db.appeals });
});

app.post('/api/admin/appeal-action', (req, res) => {
  const { appealId, action } = req.body; // action: 'Approve', 'Reject'
  const db = readDB();

  const appeal = db.appeals.find(a => a.id === appealId);
  if (!appeal) return res.status(404).json({ success: false, message: 'Appeal not found.' });

  appeal.status = action === 'Approve' ? 'Approved' : 'Rejected';

  const student = db.users.find(u => u.id === appeal.studentId);
  if (student) {
    student.renewalStatus = action === 'Approve' ? 'Renewed' : 'Terminated';
  }

  // Push notification
  db.notifications.push({
    id: 'not_' + Date.now(),
    studentId: appeal.studentId,
    title: `Scholarship Appeal: ${action === 'Approve' ? 'Approved' : 'Rejected'}`,
    message: action === 'Approve'
      ? 'Your appeal has been APPROVED. Your scholarship has been reinstated to Renewed.'
      : 'Your appeal has been REJECTED. Your scholarship remains terminated.',
    read: false,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({ success: true });
});

// 4. Stipend Disbursement Desk
app.get('/api/admin/stipends', (req, res) => {
  const db = readDB();
  const scholars = db.users.filter(u => u.role === 'student' && u.status === 'approved');

  const list = scholars.map(student => {
    const stipend = db.stipends.find(s => s.studentId === student.id && s.term === 'AY 2025-2026 Term 3');
    return {
      studentId: student.id,
      studentName: student.name,
      scholarshipType: student.scholarshipType,
      renewalStatus: student.renewalStatus,
      stipend: stipend || null
    };
  });

  res.json({ success: true, stipends: list });
});

app.post('/api/admin/disburse-stipend', (req, res) => {
  const { studentId, term, monthIndex, amount } = req.body;
  const db = readDB();

  const stipend = db.stipends.find(s => s.studentId === studentId && s.term === term);
  if (!stipend) return res.status(404).json({ success: false, message: 'Stipend ledger not found.' });

  const segment = stipend.monthlyStatus.find(m => m.month === parseInt(monthIndex));
  if (!segment) return res.status(404).json({ success: false, message: 'Month segment not found.' });

  segment.status = 'Disbursed';
  segment.date = new Date().toISOString().split('T')[0];

  // Sync with student expenses tab automatically
  db.expenses.push({
    id: 'exp_' + Date.now(),
    studentId,
    type: 'income',
    category: 'stipend',
    amount: parseFloat(amount),
    date: segment.date,
    description: `Iskolaris Stipend: ${stipend.type === 'monthly' ? `Month ${monthIndex}` : 'Term Grant'} Disbursement`
  });

  // Push notification to student
  db.notifications.push({
    id: 'not_' + Date.now(),
    studentId,
    title: 'Stipend Disbursed!',
    message: `Your stipend of ₱${parseFloat(amount).toLocaleString()} has been disbursed and credited to your financial ledger.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({ success: true });
});

// Fallback to index.html for SPA router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`Iskolaris Server running on http://localhost:${PORT}`);
});
