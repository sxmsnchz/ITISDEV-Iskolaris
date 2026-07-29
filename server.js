const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsing
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static public folder and uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/database', express.static(path.join(__dirname, 'database')));

// Ensure directories exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
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

// MySQL Workbench Database Connection Pool Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iskolaris_db',
  port: process.env.DB_PORT || 3306
};

let pool = null;
let isMySQLConnected = false;

// "Initialize Database Connection"
async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    connection.release();
    isMySQLConnected = true;
    console.log('MySQL Workbench Database connected successfully to iskolaris_db.');
  } catch (err) {
    console.warn('MySQL Connection Warning:', err.message);
    console.warn('Fallback to local db.json while MySQL Workbench setup is completed by user.');
    isMySQLConnected = false;
  }
}

initDatabase();

// Local JSON DB Fallback helper
const dbPath = path.join(dbDir, 'db.json');

// "Read Local Database File"
function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.scholar_terms) parsed.scholar_terms = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.renewals) parsed.renewals = [];
    if (!parsed.appeals) parsed.appeals = [];
    if (!parsed.stipends) parsed.stipends = [];
    if (!parsed.expenses) parsed.expenses = [];
    if (!parsed.vault) parsed.vault = [];
    if (!parsed.notifications) parsed.notifications = [];
    return parsed;
  } catch (err) {
    return {
      users: [],
      degree_programs: [],
      scholarships: [],
      scholar_terms: [],
      renewals: [],
      appeals: [],
      stipends: [],
      expenses: [],
      vault: [],
      notifications: []
    };
  }
}

// "Write Local Database File"
function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing JSON DB:', err);
  }
}

// "Generate 12 Terms For Student Batch"
function generate12TermsForBatch(batchYearDigits) {
  let startYear = 2024;
  if (batchYearDigits && batchYearDigits >= 100) {
    const yrSuffix = parseInt(batchYearDigits.toString().substring(1, 3));
    startYear = 2000 + yrSuffix;
  }

  const currentAYStart = 2025;
  const currentTermNum = 3;
  const currentGlobalIndex = ((currentAYStart - startYear) * 3) + currentTermNum;

  const terms = [];
  let termCounter = 1;

  for (let y = 0; y < 4; y++) {
    const ayStart = startYear + y;
    const ayEnd = ayStart + 1;
    const ayLabel = `A.Y. ${ayStart} - ${ayEnd}`;

    for (let t = 1; t <= 3; t++) {
      let status = 'Not Scheduled';
      if (termCounter <= currentGlobalIndex) {
        status = 'No Submission';
      } else {
        status = 'Not Scheduled';
      }

      terms.push({
        term_index: termCounter,
        academic_year: ayLabel,
        term_number: t,
        term_label: `${ayLabel} Term ${t}`,
        status: status,
        tgpa: 0.00,
        cgpa: 0.00
      });
      termCounter++;
    }
  }
  return { terms, currentGlobalIndex };
}

// REST API ENDPOINTS

// "Get Dynamic Degree Programs"
app.get('/api/degree-programs', async (req, res) => {
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query('SELECT * FROM degree_programs ORDER BY name ASC');
      return res.json({ success: true, programs: rows });
    } catch (err) {
      console.error(err);
    }
  }
  const programs = [
    { id: 1, code: 'BSCS-CSE', name: 'Bachelor of Science in Computer Science Major in Computer Systems Engineering', college: 'CCS' },
    { id: 2, code: 'BSCS-NIS', name: 'Bachelor of Science in Computer Science Major in Network and Information Security', college: 'CCS' },
    { id: 3, code: 'BSCS-ST', name: 'Bachelor of Science in Computer Science Major in Software Technology', college: 'CCS' },
    { id: 4, code: 'BSCS-MSCS', name: 'Bachelor of Science (Honors) in Computer Science and Master of Science in Computer Science', college: 'CCS' },
    { id: 5, code: 'BSDS', name: 'Bachelor of Science in Data Science', college: 'CCS' },
    { id: 6, code: 'BSISec', name: 'Bachelor of Science in Information Security', college: 'CCS' },
    { id: 7, code: 'BSIS', name: 'Bachelor of Science in Information Systems', college: 'CCS' },
    { id: 8, code: 'BSIT', name: 'Bachelor of Science in Information Technology (BSIT)', college: 'CCS' },
    { id: 9, code: 'BSEMC-GAD', name: 'Bachelor of Science in Interactive Entertainment Major in Game Art and Design', college: 'CCS' },
    { id: 10, code: 'BSEMC-GD', name: 'Bachelor of Science in Interactive Entertainment Major in Game Development', college: 'CCS' }
  ];
  res.json({ success: true, programs });
});

// "Get Dynamic Scholarship Programs"
app.get('/api/scholarships', async (req, res) => {
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query('SELECT * FROM scholarships ORDER BY name ASC');
      return res.json({ success: true, scholarships: rows });
    } catch (err) {
      console.error(err);
    }
  }
  const scholarships = [
    { id: 1, name: 'Star Scholars Program', min_cgpa_req: 3.00, default_monthly_stipend: 8000.00 },
    { id: 2, name: 'Archer Achiever Scholarship', min_cgpa_req: 2.50, default_monthly_stipend: 7000.00 },
    { id: 3, name: 'Animo Grants Scholarship Program', min_cgpa_req: 2.00, default_monthly_stipend: 5000.00 },
    { id: 4, name: 'St. La Salle Financial Assistance Grant', min_cgpa_req: 2.00, default_monthly_stipend: 4000.00 },
    { id: 5, name: 'DOST-SEI Undergraduate Scholarship', min_cgpa_req: 2.50, default_monthly_stipend: 7000.00 }
  ];
  res.json({ success: true, scholarships });
});

// "Register New Scholar User"
app.post('/api/auth/register', upload.single('awardLetter'), async (req, res) => {
  const { id, name, email, password, college, degreeProgramId, scholarshipId } = req.body;

  if (!id || id.length < 3 || !/^\d+$/.test(id)) {
    return res.status(400).json({ success: false, message: 'ID Number must contain at least 8 numerical digits.' });
  }

  const batchDigits = parseInt(id.substring(0, 3));
  const awardLetterPath = req.file ? `uploads/${req.file.filename}` : '';
  const { terms, currentGlobalIndex } = generate12TermsForBatch(batchDigits);

  let resolvedDegreeId = 8;
  if (isMySQLConnected) {
    try {
      const [existing] = await pool.query('SELECT id FROM users WHERE id = ? OR email = ?', [id, email]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'User with this ID or Email already exists.' });
      }

      const [progRows] = await pool.query('SELECT id FROM degree_programs WHERE code = ?', [degreeProgramId]);
      if (progRows.length > 0) {
        resolvedDegreeId = progRows[0].id;
      } else {
        const parsed = parseInt(degreeProgramId);
        if (!isNaN(parsed)) resolvedDegreeId = parsed;
      }

      await pool.query(
        `INSERT INTO users (id, name, email, password, role, college, degree_program_id, scholarship_id, status, award_letter, batch_year, current_term_index)
         VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 'pending', ?, ?, ?)`,
        [id, name, email, password, college || 'CCS', resolvedDegreeId, parseInt(scholarshipId) || 1, awardLetterPath, batchDigits, currentGlobalIndex]
      );

      for (const t of terms) {
        await pool.query(
          `INSERT INTO scholar_terms (student_id, term_index, academic_year, term_number, term_label, status, tgpa, cgpa)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, t.term_index, t.academic_year, t.term_number, t.term_label, t.status, t.tgpa, t.cgpa]
        );
      }

      await pool.query(
        `INSERT INTO notifications (student_id, title, message) VALUES ('adso_admin', 'New Scholar Registration', ?)`,
        [`${name} (${id}) registered and is pending verification.`]
      );

      return res.json({ success: true, message: 'Registration submitted successfully!' });
    } catch (err) {
      console.error('MySQL Register Error:', err);
      return res.status(500).json({ success: false, message: 'Database registration error.' });
    }
  }

  const db = readDB();
  if (db.users.find(u => u.id === id || u.email === email)) {
    return res.status(400).json({ success: false, message: 'User with this ID or Email already exists.' });
  }

  const matchedProg = (db.degree_programs || [
    { id: 1, code: 'BSCS-CSE' },
    { id: 2, code: 'BSCS-NIS' },
    { id: 3, code: 'BSCS-ST' },
    { id: 4, code: 'BSCS-MSCS' },
    { id: 5, code: 'BSDS' },
    { id: 6, code: 'BSISec' },
    { id: 7, code: 'BSIS' },
    { id: 8, code: 'BSIT' },
    { id: 9, code: 'BSEMC-GAD' },
    { id: 10, code: 'BSEMC-GD' }
  ]).find(d => d.code === degreeProgramId);
  const resolvedJsonDegreeId = matchedProg ? matchedProg.id : (parseInt(degreeProgramId) || 8);

  const newUser = {
    id,
    name,
    email,
    password,
    role: 'student',
    college: college || 'CCS',
    degreeProgramId: resolvedJsonDegreeId,
    scholarshipId: parseInt(scholarshipId) || 1,
    status: 'pending',
    awardLetter: awardLetterPath,
    batchYear: batchDigits,
    currentTermIndex: currentGlobalIndex,
    cgpa: 0.0,
    tgpa: 0.0,
    renewalStatus: 'Not Started'
  };

  db.users.push(newUser);
  db.scholar_terms.push(...terms.map(t => ({ ...t, student_id: id })));
  db.notifications.push({
    id: Date.now(),
    studentId: 'adso_admin',
    title: 'New Scholar Registration',
    message: `${name} (${id}) registered and is pending verification.`,
    is_read: false,
    created_at: new Date().toISOString()
  });

  writeDB(db);
  res.json({ success: true, user: newUser });
});

// "Authenticate User Login"
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query(
        `SELECT u.*, d.name as degree_name, d.code as degree_code, s.name as scholarship_name, s.min_cgpa_req
         FROM users u
         LEFT JOIN degree_programs d ON u.degree_program_id = d.id
         LEFT JOIN scholarships s ON u.scholarship_id = s.id
         WHERE u.email = ? AND u.password = ?`,
        [email, password]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const u = rows[0];
      const userObj = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        adminType: u.admin_type,
        college: u.college,
        degree: u.degree_name || u.degree_code || 'BSIT',
        scholarshipType: u.scholarship_name || 'Star Scholar',
        status: u.status,
        batchYear: u.batch_year,
        currentTermIndex: u.current_term_index,
        minCgpaReq: u.min_cgpa_req || 2.0
      };

      return res.json({ success: true, user: userObj });
    } catch (err) {
      console.error('MySQL Login Error:', err);
    }
  }

  const db = readDB();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  res.json({ success: true, user });
});

// "Fetch User Profile And Terms"
app.get('/api/users/profile/:id', async (req, res) => {
  const studentId = req.params.id;

  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query(
        `SELECT u.*, d.name as degree_name, s.name as scholarship_name, s.min_cgpa_req
         FROM users u
         LEFT JOIN degree_programs d ON u.degree_program_id = d.id
         LEFT JOIN scholarships s ON u.scholarship_id = s.id
         WHERE u.id = ?`,
        [studentId]
      );

      if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      const u = rows[0];

      const [terms] = await pool.query('SELECT * FROM scholar_terms WHERE student_id = ? ORDER BY term_index ASC', [studentId]);

      const userObj = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        adminType: u.admin_type,
        college: u.college,
        degree: u.degree_name || 'BSIT',
        scholarshipType: u.scholarship_name || 'Star Scholar',
        status: u.status,
        batchYear: u.batch_year,
        currentTermIndex: u.current_term_index,
        minCgpaReq: u.min_cgpa_req || 2.0,
        cgpa: parseFloat(u.cgpa) || 0.0,
        terms: terms
      };

      return res.json({ success: true, user: userObj });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  const user = db.users.find(u => u.id === studentId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const schol = (db.scholarships || []).find(s => s.id === (user.scholarshipId || user.scholarship_id || 1));
  const deg = (db.degree_programs || []).find(d => d.id === (user.degreeProgramId || user.degree_program_id || 8));

  const terms = (db.scholar_terms || []).filter(t => t.student_id === studentId || t.studentId === studentId);
  res.json({
    success: true,
    user: {
      ...user,
      scholarshipType: user.scholarshipType || (schol ? schol.name : 'Star Scholars Program'),
      degree: user.degree || (deg ? deg.name : 'BSIT'),
      cgpa: parseFloat(user.cgpa) || 0.0,
      terms
    }
  });
});

// "Get Verified Grade History For Analytics"
app.get('/api/grades/history/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query(
        "SELECT term_label as termName, tgpa, cgpa FROM scholar_terms WHERE student_id = ? AND status = 'Renewed' ORDER BY term_index ASC",
        [studentId]
      );
      let cumSum = 0;
      let cumCount = 0;
      const history = rows.map(r => {
        const tVal = parseFloat(r.tgpa) || 0;
        if (tVal > 0) {
          cumSum += tVal;
          cumCount++;
        }
        const calcCgpa = cumCount > 0 ? (cumSum / cumCount) : (parseFloat(r.cgpa) || 0);
        return {
          termName: r.termName,
          tgpa: tVal,
          cgpa: parseFloat(calcCgpa.toFixed(3))
        };
      });
      return res.json({ success: true, history });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const rawTerms = (db.scholar_terms || [])
    .filter(g => (g.student_id === studentId || g.studentId === studentId) && g.status === 'Renewed')
    .sort((a, b) => (a.term_index || 0) - (b.term_index || 0));

  let cumSum = 0;
  let cumCount = 0;
  const history = rawTerms.map(g => {
    const tVal = parseFloat(g.tgpa) || 0;
    if (tVal > 0) {
      cumSum += tVal;
      cumCount++;
    }
    const calcCgpa = cumCount > 0 ? (cumSum / cumCount) : (parseFloat(g.cgpa) || 0);
    return {
      termName: g.term_label || `Term ${g.term_index}`,
      tgpa: tVal,
      cgpa: parseFloat(calcCgpa.toFixed(3))
    };
  });

  res.json({ success: true, history });
});

// "Submit Renewal Documents For Verification"
app.post('/api/renewal/submit', upload.fields([{ name: 'eaf' }, { name: 'grades' }]), async (req, res) => {
  const { studentId, termIndex, tgpa, cgpa } = req.body;
  const eafFile = req.files['eaf'] ? `uploads/${req.files['eaf'][0].filename}` : '';
  const gradesFileObj = req.files['grades'] ? req.files['grades'][0] : null;
  const gradesFile = gradesFileObj ? `uploads/${gradesFileObj.filename}` : '';

  const parsedTGPA = parseFloat(tgpa) || 0.0;
  const tIdx = parseInt(termIndex) || 6;
  let calculatedCGPA = parseFloat(cgpa) || 0.0;

  if (isMySQLConnected) {
    try {
      const [allTerms] = await pool.query('SELECT term_index, tgpa FROM scholar_terms WHERE student_id = ? AND term_index <= ? ORDER BY term_index ASC', [studentId, tIdx]);
      let cumSum = 0;
      let cumCount = 0;
      for (const t of allTerms) {
        const val = t.term_index === tIdx ? parsedTGPA : (parseFloat(t.tgpa) || 0);
        if (val > 0) {
          cumSum += val;
          cumCount++;
        }
      }
      calculatedCGPA = cumCount > 0 ? (cumSum / cumCount) : parsedTGPA;

      const isInvalid = calculatedCGPA <= 0.0 || parsedTGPA <= 0.0 || calculatedCGPA > 4.0 || parsedTGPA > 4.0;
      const targetStatus = isInvalid ? 'Invalid Submission' : 'Processing';

      await pool.query(
        `UPDATE scholar_terms
         SET status = ?, tgpa = ?, cgpa = ?, eaf_file = ?, grades_file = ?, evaluated_at = NOW()
         WHERE student_id = ? AND term_index = ?`,
        [targetStatus, parsedTGPA, calculatedCGPA, eafFile, gradesFile, studentId, tIdx]
      );

      return res.json({ success: true, status: targetStatus, tgpa: parsedTGPA, cgpa: calculatedCGPA, message: `Renewal submitted for verification. Status: ${targetStatus}` });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  const allTerms = (db.scholar_terms || [])
    .filter(t => (t.student_id === studentId || t.studentId === studentId) && (t.term_index || t.termIndex) <= tIdx);
  let cumSum = 0;
  let cumCount = 0;
  for (const t of allTerms) {
    const idx = t.term_index || t.termIndex;
    const val = idx === tIdx ? parsedTGPA : (parseFloat(t.tgpa) || 0);
    if (val > 0) {
      cumSum += val;
      cumCount++;
    }
  }
  calculatedCGPA = cumCount > 0 ? (cumSum / cumCount) : parsedTGPA;

  const isInvalid = calculatedCGPA <= 0.0 || parsedTGPA <= 0.0 || calculatedCGPA > 4.0 || parsedTGPA > 4.0;
  const targetStatus = isInvalid ? 'Invalid Submission' : 'Processing';

  const termObj = db.scholar_terms.find(t => (t.student_id === studentId || t.studentId === studentId) && t.term_index === tIdx);
  if (termObj) {
    termObj.status = targetStatus;
    termObj.tgpa = parsedTGPA;
    termObj.cgpa = calculatedCGPA;
    termObj.eaf_file = eafFile;
    termObj.grades_file = gradesFile;
  }

  writeDB(db);
  res.json({ success: true, status: targetStatus, tgpa: parsedTGPA, cgpa: calculatedCGPA, message: `Renewal submitted for verification. Status: ${targetStatus}` });
});

// "Get Renewal Status"
app.get('/api/renewal/status/:studentId', async (req, res) => {
  const studentId = req.params.id || req.params.studentId;

  if (isMySQLConnected) {
    try {
      const [terms] = await pool.query('SELECT * FROM scholar_terms WHERE student_id = ? ORDER BY term_index ASC', [studentId]);
      return res.json({ success: true, terms });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  const terms = (db.scholar_terms || []).filter(t => t.student_id === studentId || t.studentId === studentId);
  res.json({ success: true, terms });
});

// "Submit Student Appeal"
app.post('/api/appeal/submit', upload.fields([{ name: 'letter' }, { name: 'support' }]), async (req, res) => {
  const { studentId, termLabel, reason } = req.body;
  const letterFile = req.files['letter'] ? `uploads/${req.files['letter'][0].filename}` : '';
  const supportingFiles = req.files['support'] ? `uploads/${req.files['support'][0].filename}` : '';

  if (isMySQLConnected) {
    try {
      await pool.query(
        `INSERT INTO appeals (student_id, term_label, letter_file, supporting_files, reason, status)
         VALUES (?, ?, ?, ?, ?, 'Pending')`,
        [studentId, termLabel || 'A.Y. 2025 - 2026 Term 3', letterFile, supportingFiles, reason]
      );

      await pool.query(
        `UPDATE scholar_terms SET status = 'In Probation' WHERE student_id = ? AND status = 'Invalid Submission'`,
        [studentId]
      );

      return res.json({ success: true, message: 'Appeal submitted successfully.' });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  db.appeals.push({
    id: Date.now(),
    student_id: studentId,
    term_label: termLabel,
    letter_file: letterFile,
    supporting_files: supportingFiles,
    reason,
    status: 'Pending',
    submitted_at: new Date().toISOString()
  });
  writeDB(db);

  res.json({ success: true });
});

// "Get Budget Expense Ledger Data"
app.get('/api/budget/data/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query('SELECT * FROM expenses WHERE student_id = ? ORDER BY date DESC', [studentId]);
      return res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const data = (db.expenses || []).filter(e => e.student_id === studentId || e.studentId === studentId);
  res.json({ success: true, data });
});

// "Add Expense Item To Ledger"
app.post('/api/budget/add', async (req, res) => {
  const { studentId, type, category, amount, date, description } = req.body;

  if (isMySQLConnected) {
    try {
      const [result] = await pool.query(
        `INSERT INTO expenses (student_id, type, category, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)`,
        [studentId, type, category, parseFloat(amount), date || new Date().toISOString().split('T')[0], description]
      );
      return res.json({ success: true, id: result.insertId });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  const newItem = {
    id: Date.now(),
    studentId,
    type,
    category,
    amount: parseFloat(amount),
    date: date || new Date().toISOString().split('T')[0],
    description
  };
  db.expenses.push(newItem);
  writeDB(db);

  res.json({ success: true, data: newItem });
});

// "Get Notifications For Student"
app.get('/api/notifications/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query('SELECT * FROM notifications WHERE student_id = ? ORDER BY created_at DESC', [studentId]);
      return res.json({ success: true, notifications: rows });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const list = (db.notifications || []).filter(n => n.studentId === studentId || n.student_id === studentId);
  res.json({ success: true, notifications: list });
});

// "Mark Notifications As Read"
app.post('/api/notifications/read/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  if (isMySQLConnected) {
    try {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE student_id = ?', [studentId]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  (db.notifications || []).forEach(n => {
    if (n.studentId === studentId || n.student_id === studentId) n.is_read = true;
  });
  writeDB(db);
  res.json({ success: true });
});

// ADMINISTRATOR API ROUTES

// "Get Pending Scholar Registrations"
app.get('/api/admin/pending', async (req, res) => {
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query(
        `SELECT u.*, d.name as degree_name, s.name as scholarship_name
         FROM users u
         LEFT JOIN degree_programs d ON u.degree_program_id = d.id
         LEFT JOIN scholarships s ON u.scholarship_id = s.id
         WHERE u.status = 'pending'`
      );
      return res.json({ success: true, pending: rows });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const pending = (db.users || []).filter(u => u.status === 'pending');
  res.json({ success: true, pending });
});

// "Approve Pending Scholar User"
app.post('/api/admin/approve-user', async (req, res) => {
  const { studentId } = req.body;

  if (isMySQLConnected) {
    try {
      await pool.query(`UPDATE users SET status = 'approved' WHERE id = ?`, [studentId]);

      await pool.query(
        `INSERT INTO stipends (student_id, term_label, month_index, amount, status, date_disbursed)
         VALUES (?, 'A.Y. 2025 - 2026 Term 3', 1, 8000.00, 'Pending', NULL)`,
        [studentId]
      );

      await pool.query(
        `INSERT INTO notifications (student_id, title, message) VALUES (?, 'Account Verified & Approved!', 'Welcome to Iskolaris! Your registration has been verified and your academic progression is active.')`,
        [studentId]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  const user = (db.users || []).find(u => u.id === studentId);
  if (user) user.status = 'approved';
  writeDB(db);
  res.json({ success: true });
});

// "Reject Pending Scholar User"
app.post('/api/admin/reject-user', async (req, res) => {
  const { studentId } = req.body;
  if (isMySQLConnected) {
    try {
      await pool.query(`UPDATE users SET status = 'rejected' WHERE id = ?`, [studentId]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const user = (db.users || []).find(u => u.id === studentId);
  if (user) user.status = 'rejected';
  writeDB(db);
  res.json({ success: true });
});

// "Get Pending Renewal Submissions Queue"
app.get('/api/admin/renewals', async (req, res) => {
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query(
        `SELECT st.*, u.name as student_name, s.name as scholarship_name, s.min_cgpa_req
         FROM scholar_terms st
         JOIN users u ON st.student_id = u.id
         LEFT JOIN scholarships s ON u.scholarship_id = s.id
         WHERE st.status IN ('Processing', 'Submitted', 'Under Review', 'Invalid Submission', 'In Probation')`
      );
      return res.json({ success: true, renewals: rows });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const list = (db.scholar_terms || [])
    .filter(st => ['Processing', 'Submitted', 'Under Review', 'Invalid Submission', 'In Probation'].includes(st.status))
    .map(st => {
      const u = (db.users || []).find(usr => usr.id === st.student_id || usr.id === st.studentId);
      const s = (db.scholarships || []).find(sch => sch.id === (u ? (u.scholarshipId || u.scholarship_id) : 1));
      return {
        ...st,
        student_name: u ? u.name : `Scholar ${st.student_id || st.studentId}`,
        studentName: u ? u.name : `Scholar ${st.student_id || st.studentId}`,
        scholarship_name: s ? s.name : 'Star Scholars Program',
        scholarshipType: s ? s.name : 'Star Scholars Program'
      };
    });
  res.json({ success: true, renewals: list });
});

// "Process Renewal Verification Action"
app.post('/api/admin/renewal-action', async (req, res) => {
  const { studentId, termIndex, action } = req.body;

  const tIdx = parseInt(termIndex) || 6;

  if (isMySQLConnected) {
    try {
      await pool.query(
        `UPDATE scholar_terms SET status = ?, evaluated_at = NOW() WHERE student_id = ? AND term_index = ?`,
        [action, studentId, tIdx]
      );

      if (action === 'Renewed') {
        const [termRows] = await pool.query('SELECT cgpa FROM scholar_terms WHERE student_id = ? AND term_index = ?', [studentId, tIdx]);
        if (termRows.length > 0 && termRows[0].cgpa > 0) {
          await pool.query('UPDATE users SET cgpa = ? WHERE id = ?', [termRows[0].cgpa, studentId]);
        }
        await pool.query('UPDATE scholar_terms SET status = "Renewed" WHERE student_id = ? AND term_index < ? AND status = "No Submission"', [studentId, tIdx]);
      }

      await pool.query(
        `INSERT INTO notifications (student_id, title, message) VALUES (?, 'Scholarship Renewal Verified', ?)`,
        [studentId, `Your renewal status for term ${tIdx} is verified and updated to: ${action}`]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  const t = (db.scholar_terms || []).find(st => (st.student_id === studentId || st.studentId === studentId) && st.term_index === tIdx);
  if (t) {
    t.status = action;
    if (action === 'Renewed' && t.cgpa > 0) {
      const u = (db.users || []).find(usr => usr.id === studentId);
      if (u) u.cgpa = t.cgpa;

      (db.scholar_terms || []).forEach(st => {
        if ((st.student_id === studentId || st.studentId === studentId) && st.term_index < tIdx && st.status === 'No Submission') {
          st.status = 'Renewed';
        }
      });
    }
  }
  writeDB(db);

  res.json({ success: true });
});

// "Get Pending Appeals Desk List"
app.get('/api/admin/appeals', async (req, res) => {
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query(
        `SELECT a.*, u.name as student_name, s.name as scholarship_name
         FROM appeals a
         JOIN users u ON a.student_id = u.id
         LEFT JOIN scholarships s ON u.scholarship_id = s.id`
      );
      return res.json({ success: true, appeals: rows });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const list = (db.appeals || []).map(a => {
    const u = (db.users || []).find(usr => usr.id === a.student_id || usr.id === a.studentId);
    const s = (db.scholarships || []).find(sch => sch.id === (u ? (u.scholarshipId || u.scholarship_id) : 1));
    return {
      ...a,
      student_name: u ? u.name : `Scholar ${a.student_id || a.studentId}`,
      studentName: u ? u.name : `Scholar ${a.student_id || a.studentId}`,
      scholarship_name: s ? s.name : 'Star Scholars Program',
      scholarshipType: s ? s.name : 'Star Scholars Program'
    };
  });
  res.json({ success: true, appeals: list });
});

// "Process Appeal Action"
app.post('/api/admin/appeal-action', async (req, res) => {
  const { appealId, action } = req.body;
  const newStatus = action === 'Approve' ? 'Reconsidered' : 'Terminated';

  if (isMySQLConnected) {
    try {
      await pool.query(`UPDATE appeals SET status = ? WHERE id = ?`, [action === 'Approve' ? 'Approved' : 'Rejected', appealId]);
      await pool.query(`UPDATE scholar_terms SET status = ? WHERE student_id = (SELECT student_id FROM appeals WHERE id = ?) AND status = 'In Probation'`, [newStatus, appealId]);

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  const appeal = (db.appeals || []).find(a => a.id == appealId);
  if (appeal) appeal.status = action === 'Approve' ? 'Approved' : 'Rejected';
  writeDB(db);

  res.json({ success: true });
});

// "Get Stipend Ledger Table"
app.get('/api/admin/stipends', async (req, res) => {
  if (isMySQLConnected) {
    try {
      const [scholars] = await pool.query(
        `SELECT u.id as studentId, u.name as studentName, s.name as scholarshipType, u.renewalStatus
         FROM users u
         LEFT JOIN scholarships s ON u.scholarship_id = s.id
         WHERE u.role = 'student' AND u.status = 'approved'`
      );

      return res.json({ success: true, stipends: scholars });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const scholars = (db.users || [])
    .filter(u => u.role === 'student' && u.status === 'approved')
    .map(u => ({
      studentId: u.id,
      studentName: u.name,
      id: u.id,
      name: u.name,
      scholarshipType: u.scholarshipType || 'Star Scholar',
      renewalStatus: u.renewalStatus || 'Active'
    }));

  res.json({ success: true, stipends: scholars });
});

// "Disburse Stipend Amount To Scholar"
app.post('/api/admin/disburse-stipend', async (req, res) => {
  const { studentId, term, monthIndex, amount } = req.body;
  const disburseDate = new Date().toISOString().split('T')[0];

  if (isMySQLConnected) {
    try {
      await pool.query(
        `INSERT INTO stipends (student_id, term_label, month_index, amount, status, date_disbursed)
         VALUES (?, ?, ?, ?, 'Disbursed', ?)`,
        [studentId, term || 'A.Y. 2025 - 2026 Term 3', monthIndex || 1, amount || 8000, disburseDate]
      );

      await pool.query(
        `INSERT INTO expenses (student_id, type, category, amount, date, description)
         VALUES (?, 'income', 'stipend', ?, ?, ?)`,
        [studentId, amount || 8000, disburseDate, `Iskolaris Stipend Disbursement`]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
    }
  }

  const db = readDB();
  (db.expenses || []).push({
    id: Date.now(),
    studentId,
    type: 'income',
    category: 'stipend',
    amount: parseFloat(amount) || 8000,
    date: disburseDate,
    description: 'Iskolaris Stipend Disbursement'
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
