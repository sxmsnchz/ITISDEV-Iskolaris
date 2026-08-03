const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const pdfParse = require('pdf-parse');

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
    console.error('Write DB Error:', err);
  }
}

const fallbackScholarships = [
  { id: 1, name: 'Star Scholars Program' },
  { id: 2, name: 'Archer Achiever Scholarship' },
  { id: 3, name: 'Animo Grants Scholarship Program' },
  { id: 4, name: 'St. La Salle Financial Assistance Grant' },
  { id: 5, name: 'DOST-SEI Undergraduate Scholarship' }
];

const fallbackDegrees = [
  { id: 1, code: 'BSCS-CSE', name: 'BSCS Major in Computer Systems Engineering' },
  { id: 2, code: 'BSCS-NIS', name: 'BSCS Major in Network and Information Security' },
  { id: 3, code: 'BSCS-ST', name: 'BSCS Major in Software Technology' },
  { id: 4, code: 'BSCS-MSCS', name: 'BSCS (Honors) and MSCS' },
  { id: 5, code: 'BSDS', name: 'BS in Data Science' },
  { id: 6, code: 'BSISec', name: 'BS in Information Security' },
  { id: 7, code: 'BSIS', name: 'BS in Information Systems' },
  { id: 8, code: 'BSIT', name: 'BS in Information Technology (BSIT)' },
  { id: 9, code: 'BSEMC-GAD', name: 'BSEMC Major in Game Art and Design' },
  { id: 10, code: 'BSEMC-GD', name: 'BSEMC Major in Game Development' }
];

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
      if (termCounter < currentGlobalIndex) {
        status = 'No Records';
      } else if (termCounter === currentGlobalIndex) {
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

// "Parse EAF PDF and Verify Content"
async function parseEAFFile(filePath, studentId, termLabel) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { valid: false, reason: 'File not found', status: 'INVALID EAF' };
    }
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // Check: Contains ENROLLMENT ASSESSMENT FORM keywords
    if (!/ENROLLMENT\s*ASSESSMENT\s*FORM/i.test(text)) {
      return { valid: false, reason: 'Not an Enrollment Assessment Form', status: 'INVALID EAF' };
    }

    // Check: Contains basic enrollment fields (course/section/fees)
    const hasEnrollmentData = /tuition\s*fee/i.test(text) || /installment/i.test(text) || /total\s*fees/i.test(text);
    if (!hasEnrollmentData) {
      return { valid: false, reason: 'EAF does not contain enrollment fee data', status: 'INVALID EAF' };
    }

    return { valid: true, status: 'VALID EAF' };
  } catch (err) {
    console.error('Error parsing EAF:', err);
    return { valid: false, reason: 'Error parsing EAF PDF', status: 'INVALID EAF' };
  }
}

// "Parse Grades PDF and Verify Content"
function normalizeAcademicYear(yearStart, yearEnd) {
  return `A.Y. ${yearStart} - ${yearEnd}`;
}

function parseCurriculumSummary(rawText) {
  const normalized = (rawText || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = normalized.toLowerCase();

  if (!lower.includes('summary') || !lower.includes('sgpa') || !lower.includes('cgpa')) {
    return {
      valid: false,
      reason: 'The document does not appear to contain a recognizable curriculum progression summary table.',
      terms: []
    };
  }

  const summaryStart = lower.indexOf('summary');
  const summarySlice = normalized.slice(summaryStart);
  const stopKeywords = ['core courses', 'elective courses', 'additional courses'];
  let stopIndex = -1;

  for (const keyword of stopKeywords) {
    const idx = summarySlice.toLowerCase().indexOf(keyword);
    if (idx >= 0 && (stopIndex === -1 || idx < stopIndex)) {
      stopIndex = idx;
    }
  }

  const tableBody = stopIndex >= 0 ? summarySlice.slice(0, stopIndex) : summarySlice;
  // Split into rows anchored at AY ... - YYYY
  const rowSplit = tableBody.split(/(?=A\.?Y\.?\s*\d{4}\s*[-–]\s*\d{4})/i).map(s => s.trim()).filter(Boolean);
  const parsedTerms = [];

  function normalizeGpa(n) {
    if (n === undefined || Number.isNaN(n)) return NaN;
    if (n <= 4.5) return n;
    // try dividing by 10 then 100 to fix common OCR scaling issues
    if (n / 10 <= 4.5) return parseFloat((n / 10).toFixed(3));
    if (n / 100 <= 4.5) return parseFloat((n / 100).toFixed(3));
    return n;
  }

  for (const row of rowSplit) {
    // Extract academic year and term label
    const ayMatch = row.match(/A\.?Y\.?\s*(\d{4})\s*[-–]\s*(\d{4})/i);
    if (!ayMatch) continue;
    const yearStart = parseInt(ayMatch[1], 10);
    const yearEnd = parseInt(ayMatch[2], 10);
    const academicYear = normalizeAcademicYear(yearStart, yearEnd);

    // Term may appear as 'Term N' or 'Trimester N'
    const termMatch = row.match(/Term\s*(\d)|Trimester\s*(\d)/i);
    const termNumber = termMatch ? (termMatch[1] ? parseInt(termMatch[1], 10) : parseInt(termMatch[2], 10)) : null;

    // Gather all numeric tokens in the row
    const nums = [...row.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => parseFloat(m[1]));
    if (nums.length < 2) continue;

    // Heuristic: last two numeric tokens are SGPA (TGPA) then CGPA
    let sgpaRaw = nums[nums.length - 2];
    let cgpaRaw = nums[nums.length - 1];

    let sgpa = normalizeGpa(sgpaRaw);
    let cgpa = normalizeGpa(cgpaRaw);

    // If values still out of bounds, try to find the last small numbers in the row
    if ((isNaN(sgpa) || sgpa > 4.5) || (isNaN(cgpa) || cgpa > 4.5)) {
      const smalls = nums.filter(n => !Number.isNaN(n) && n >= 0 && n <= 4.5);
      if (smalls.length >= 2) {
        sgpa = smalls[smalls.length - 2];
        cgpa = smalls[smalls.length - 1];
      }
    }

    parsedTerms.push({
      academic_year: academicYear,
      term_number: termNumber || 0,
      term_label: `${academicYear} Term ${termNumber || 0}`,
      reg_credits: nums[0] || 0,
      earned_credits: nums[1] || 0,
      tgpa: Number.isFinite(sgpa) ? parseFloat(sgpa.toFixed(3)) : 0.0,
      cgpa: Number.isFinite(cgpa) ? parseFloat(cgpa.toFixed(3)) : 0.0
    });
  }

  if (parsedTerms.length === 0) {
    return {
      valid: false,
      reason: 'No term GPA rows could be extracted from the summary table.',
      terms: []
    };
  }

  parsedTerms.sort((a, b) => {
    if (a.academic_year !== b.academic_year) {
      return a.academic_year.localeCompare(b.academic_year);
    }
    return a.term_number - b.term_number;
  });

  const latestTerm = parsedTerms[parsedTerms.length - 1];
  const avgTgpa = parsedTerms.reduce((sum, term) => sum + term.tgpa, 0) / parsedTerms.length;

  // Sanity-check parsed numbers and attempt lightweight corrections when
  // obvious PDF extraction artefacts occur (e.g. CGPA read as 83.580).
  const issues = [];
  const correctedTerms = parsedTerms.map((t) => ({ ...t }));

  for (let i = 0; i < correctedTerms.length; ++i) {
    const t = correctedTerms[i];
    let suspect = false;

    if (t.tgpa > 4.0 || t.cgpa > 4.0 || t.tgpa < 0 || t.cgpa < 0) {
      suspect = true;
    }

    if (suspect) {
      // Try to find a nearby better-formatted numeric sequence in the
      // original summary slice. Look for the AY/Term anchor then collect
      // the next up-to-120 characters and pull any small floats (0-4).
      const ayMatch = t.academic_year.match(/(\d{4})/);
      const yearStart = ayMatch ? ayMatch[1] : '';
      const termNumber = t.term_number;
      const termAnchorRe = new RegExp(`ay\\.?\\s*${yearStart}\\s*[-–]\\s*\\d{4}[^\\n]{0,120}term[^\\d]{0,10}${termNumber}`, 'i');
      const anchorMatch = tableBody.match(termAnchorRe);
      if (anchorMatch) {
        const start = anchorMatch.index + anchorMatch[0].length;
        const look = tableBody.slice(start, start + 120);
        const numMatches = [...look.matchAll(/(\d{1,2}(?:\.\d{1,4})?)/g)].map(m => parseFloat(m[1]));
        // pick tgpa/cgpa candidates from found numbers that are <= 4.0
        const smallNums = numMatches.filter(n => !Number.isNaN(n) && n >= 0 && n <= 4.0);
        if (smallNums.length >= 2) {
          const altTgpa = smallNums[smallNums.length - 2];
          const altCgpa = smallNums[smallNums.length - 1];
          issues.push({ index: i, reason: 'suspect values', original: { tgpa: t.tgpa, cgpa: t.cgpa }, replacement: { tgpa: altTgpa, cgpa: altCgpa } });
          t.tgpa = altTgpa;
          t.cgpa = altCgpa;
        }
      }
    }

    t.suspect = suspect;
  }

  const latest = correctedTerms[correctedTerms.length - 1];
  return {
    valid: true,
    reason: null,
    terms: correctedTerms,
    latestCGPA: latest && latest.cgpa > 0 ? latest.cgpa : 0.0,
    avgTgpa: parseFloat(avgTgpa.toFixed(3)),
    issues
  };
}

async function parseGradesFile(filePath, studentId) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { valid: false, status: 'Invalid Submission', reason: 'File not found', terms: [] };
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = (data.text || '').replace(/\u00a0/g, ' ');
    const summaryResult = parseCurriculumSummary(text);

    if (!summaryResult.valid) {
      return {
        valid: false,
        status: 'Invalid Submission',
        reason: summaryResult.reason || 'Not a valid Curriculum Progression grade sheet (missing summary table or GPA headers)',
        terms: []
      };
    }

    const parsedTerms = summaryResult.terms.map((term) => ({
      ...term,
      reg_credits: parseFloat(term.reg_credits.toFixed(2)),
      earned_credits: parseFloat(term.earned_credits.toFixed(2)),
      tgpa: parseFloat(term.tgpa.toFixed(3)),
      cgpa: parseFloat(term.cgpa.toFixed(3))
    }));

    const latestTerm = parsedTerms[parsedTerms.length - 1];
    const latestCGPA = latestTerm && latestTerm.cgpa > 0 ? latestTerm.cgpa : 0.0;
    const hasFailure = parsedTerms.some((term) => term.tgpa < 2.0);
    const status = hasFailure ? 'Failed to meet GPA Limits' : 'Meets Grade Requirements';

    return {
      valid: true,
      status,
      reason: null,
      terms: parsedTerms,
      avgTgpa: parseFloat(summaryResult.avgTgpa.toFixed(3)),
      latestCGPA: parseFloat(latestCGPA.toFixed(3))
    };
  } catch (err) {
    console.error('Error parsing Grades:', err);
    return { valid: false, status: 'Invalid Submission', reason: 'Error parsing Grades PDF', terms: [] };
  }
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
        renewalStatus: u.renewalStatus || u.renewal_status || 'Active',
        cgpa: parseFloat(u.cgpa) || 0.0,
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

  const safeUser = {
    ...user,
    renewalStatus: user.renewalStatus || user.renewal_status || 'Active',
    currentTermIndex: user.currentTermIndex || user.current_term_index || null,
    cgpa: parseFloat(user.cgpa) || 0.0,
  };

  res.json({ success: true, user: safeUser });
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
        renewalStatus: u.renewalStatus || u.renewal_status || 'Active',
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

  const schol = (db.scholarships && db.scholarships.length > 0 ? db.scholarships : fallbackScholarships)
    .find(s => s.id === parseInt(user.scholarshipId || user.scholarship_id || 1));
  const deg = (db.degree_programs && db.degree_programs.length > 0 ? db.degree_programs : fallbackDegrees)
    .find(d => d.id === parseInt(user.degreeProgramId || user.degree_program_id || 8));

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
  const { studentId, termIndex } = req.body;
  const eafFile = req.files['eaf'] ? `uploads/${req.files['eaf'][0].filename}` : '';
  const gradesFileObj = req.files['grades'] ? req.files['grades'][0] : null;
  const gradesFile = gradesFileObj ? `uploads/${gradesFileObj.filename}` : '';

  const tIdx = parseInt(termIndex) || 6;

  if (isMySQLConnected) {
    try {
      // Get term label
      const [termRows] = await pool.query('SELECT term_label FROM scholar_terms WHERE student_id = ? AND term_index = ?', [studentId, tIdx]);
      const termLabel = termRows.length > 0 ? termRows[0].term_label : `A.Y. 2025 - 2026 Term 3`;

      // Validate files
      const eafResult = await parseEAFFile(eafFile, studentId, termLabel);
      const gradesResult = await parseGradesFile(gradesFile, studentId);

      // Extract TGPA and CGPA from the grades PDF summary table only.
      let parsedTGPA = 0.0;
      let calculatedCGPA = 0.0;

      if (gradesResult.valid && gradesResult.terms && gradesResult.terms.length > 0) {
        const targetTermLabel = termLabel;
        const matchedParsedTerm = gradesResult.terms.find(t => t.term_label === targetTermLabel) || gradesResult.terms[gradesResult.terms.length - 1];
        parsedTGPA = matchedParsedTerm ? (matchedParsedTerm.tgpa || 0.0) : 0.0;
        calculatedCGPA = gradesResult.latestCGPA || (matchedParsedTerm ? (matchedParsedTerm.cgpa || 0.0) : 0.0);
      } else {
        // Fallback: calculate from existing DB terms
        const [allTerms] = await pool.query('SELECT term_index, tgpa FROM scholar_terms WHERE student_id = ? AND term_index < ? ORDER BY term_index ASC', [studentId, tIdx]);
        let cumSum = 0;
        let cumCount = 0;
        for (const t of allTerms) {
          const val = parseFloat(t.tgpa) || 0;
          if (val > 0) {
            cumSum += val;
            cumCount++;
          }
        }
        calculatedCGPA = cumCount > 0 ? (cumSum / cumCount) : 0.0;
      }

      const isInvalid = !eafResult.valid || !gradesResult.valid || parsedTGPA <= 0.0 || parsedTGPA > 4.0 || calculatedCGPA > 4.0;
      const targetStatus = isInvalid ? 'Invalid Submission' : 'Processing';

      const notesObj = {
        eaf_status: eafResult.status,
        eaf_reason: eafResult.reason || '',
        grades_status: gradesResult.status,
        grades_reason: gradesResult.reason || '',
        parsed_terms: gradesResult.terms || [],
        aggregated_cgpa: calculatedCGPA
      };

      await pool.query(
        `UPDATE scholar_terms
         SET status = ?, tgpa = ?, cgpa = ?, eaf_file = ?, grades_file = ?, notes = ?, evaluated_at = NOW()
         WHERE student_id = ? AND term_index = ?`,
        [targetStatus, parsedTGPA, calculatedCGPA, eafFile, gradesFile, JSON.stringify(notesObj), studentId, tIdx]
      );

      return res.json({ success: true, status: targetStatus, tgpa: parsedTGPA, cgpa: calculatedCGPA, message: `Renewal submitted for verification. Status: ${targetStatus}` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server database error during submission.' });
    }
  }

  const db = readDB();
  const termObj = db.scholar_terms.find(t => (t.student_id === studentId || t.studentId === studentId) && t.term_index === tIdx);
  const termLabel = termObj ? termObj.term_label : `A.Y. 2025 - 2026 Term 3`;

  // Validate files
  const eafResult = await parseEAFFile(eafFile, studentId, termLabel);
  const gradesResult = await parseGradesFile(gradesFile, studentId);

  // Extract TGPA and CGPA from the grades PDF summary table only.
  let parsedTGPA = 0.0;
  let calculatedCGPA = 0.0;

  if (gradesResult.valid && gradesResult.terms && gradesResult.terms.length > 0) {
    const matchedParsedTerm = gradesResult.terms.find(t => t.term_label === termLabel) || gradesResult.terms[gradesResult.terms.length - 1];
    parsedTGPA = matchedParsedTerm ? (matchedParsedTerm.tgpa || 0.0) : 0.0;
    calculatedCGPA = gradesResult.latestCGPA || (matchedParsedTerm ? (matchedParsedTerm.cgpa || 0.0) : 0.0);
  } else {
    const allTerms = (db.scholar_terms || [])
      .filter(t => (t.student_id === studentId || t.studentId === studentId) && (t.term_index || t.termIndex) < tIdx);
    let cumSum = 0;
    let cumCount = 0;
    for (const t of allTerms) {
      const val = parseFloat(t.tgpa) || 0;
      if (val > 0) {
        cumSum += val;
        cumCount++;
      }
    }
    calculatedCGPA = cumCount > 0 ? (cumSum / cumCount) : 0.0;
  }

  const isInvalid = !eafResult.valid || !gradesResult.valid || parsedTGPA <= 0.0 || parsedTGPA > 4.0 || calculatedCGPA > 4.0;
  const targetStatus = isInvalid ? 'Invalid Submission' : 'Processing';

  const notesObj = {
    eaf_status: eafResult.status,
    eaf_reason: eafResult.reason || '',
    grades_status: gradesResult.status,
    grades_reason: gradesResult.reason || '',
    parsed_terms: gradesResult.terms || [],
    aggregated_cgpa: calculatedCGPA
  };

  if (termObj) {
    termObj.status = targetStatus;
    termObj.tgpa = parsedTGPA;
    termObj.cgpa = calculatedCGPA;
    termObj.eaf_file = eafFile;
    termObj.grades_file = gradesFile;
    termObj.notes = JSON.stringify(notesObj);
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
      const mapped = rows.map(r => ({
        ...r,
        degree: r.degree_name || 'BSIT',
        scholarshipType: r.scholarship_name || 'Star Scholars Program'
      }));
      return res.json({ success: true, pending: mapped });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const pending = (db.users || [])
    .filter(u => u.status === 'pending')
    .map(u => {
      const s = fallbackScholarships.find(sch => sch.id === parseInt(u.scholarshipId || u.scholarship_id || 1));
      const d = fallbackDegrees.find(deg => deg.id === parseInt(u.degreeProgramId || u.degree_program_id || 8));
      return {
        ...u,
        degree: u.degree || (d ? d.name : 'BSIT'),
        scholarshipType: u.scholarshipType || (s ? s.name : 'Star Scholars Program')
      };
    });
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
  if (user) {
    user.status = 'approved';

    // Initialize stipend tracker
    let type = 'monthly';
    let amount = 8000;
    const sName = user.scholarshipType || 'Star Scholars Program';
    if (sName.includes('La Salle')) {
      type = 'termly';
      amount = 15000;
    } else if (sName.includes('DOST')) {
      amount = 7000;
    }

    const monthlyStatus = [];
    if (type === 'monthly') {
      for (let m = 1; m <= 4; m++) {
        monthlyStatus.push({ month: m, status: 'Pending', amount, date: null });
      }
    } else {
      monthlyStatus.push({ month: 1, status: 'Pending', amount, date: null });
    }

    if (!db.stipends) db.stipends = [];
    db.stipends.push({
      id: `stip_${Date.now()}`,
      studentId: studentId,
      term: 'AY 2025-2026 Term 3',
      type,
      monthlyStatus
    });

    // Create verification notification
    if (!db.notifications) db.notifications = [];
    db.notifications.push({
      id: Date.now(),
      studentId,
      title: 'Account Verified & Approved!',
      message: 'Welcome to Iskolaris! Your registration has been verified and your academic progression is active.',
      read: false,
      createdAt: new Date().toISOString()
    });
  }
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
      
      const mapped = await Promise.all(rows.map(async (r) => {
        let eafStatus = 'NOT VERIFIED';
        let gradesStatus = 'NOT VERIFIED';
        
        if (r.notes) {
          try {
            const notesObj = JSON.parse(r.notes);
            eafStatus = notesObj.eaf_status || 'NOT VERIFIED';
            gradesStatus = notesObj.grades_status || 'NOT VERIFIED';
          } catch (e) {
            console.error('Error parsing notes JSON:', e);
          }
        } else if (r.eaf_file || r.grades_file) {
          // Generate on the fly and save
          const eafRes = r.eaf_file ? await parseEAFFile(r.eaf_file, r.student_id, r.term_label) : { valid: false, status: 'NOT VERIFIED' };
          const gradesRes = r.grades_file ? await parseGradesFile(r.grades_file, r.student_id) : { valid: false, status: 'NOT VERIFIED' };
          eafStatus = eafRes.status;
          gradesStatus = gradesRes.status;
          
          const notesObj = {
            eaf_status: eafStatus,
            eaf_reason: eafRes.reason || '',
            grades_status: gradesStatus,
            grades_reason: gradesRes.reason || '',
            parsed_terms: gradesRes.terms || [],
            aggregated_cgpa: gradesRes.avgTgpa || r.cgpa
          };
          r.notes = JSON.stringify(notesObj);
          await pool.query('UPDATE scholar_terms SET notes = ? WHERE student_id = ? AND term_index = ?', [r.notes, r.student_id, r.term_index]);
        }
        
        return {
          ...r,
          studentName: r.student_name,
          scholarshipType: r.scholarship_name || 'Star Scholars Program',
          eaf_status: eafStatus,
          grades_status: gradesStatus
        };
      }));
      
      return res.json({ success: true, renewals: mapped });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server database error fetching renewals.' });
    }
  }

  const db = readDB();
  const rawList = (db.scholar_terms || []).filter(st => ['Processing', 'Submitted', 'Under Review', 'Invalid Submission', 'In Probation'].includes(st.status));
  
  let dbChanged = false;
  const list = await Promise.all(rawList.map(async (st) => {
    const u = (db.users || []).find(usr => usr.id === st.student_id || usr.id === st.studentId);
    const s = (db.scholarships && db.scholarships.length > 0 ? db.scholarships : fallbackScholarships)
      .find(sch => sch.id === parseInt(u ? (u.scholarshipId || u.scholarship_id) : 1));
      
    let eafStatus = 'NOT VERIFIED';
    let gradesStatus = 'NOT VERIFIED';
    
    if (st.notes) {
      try {
        const notesObj = JSON.parse(st.notes);
        eafStatus = notesObj.eaf_status || 'NOT VERIFIED';
        gradesStatus = notesObj.grades_status || 'NOT VERIFIED';
      } catch (e) {
        console.error('Error parsing notes JSON:', e);
      }
    } else if (st.eaf_file || st.grades_file) {
      const eafRes = st.eaf_file ? await parseEAFFile(st.eaf_file, st.student_id, st.term_label) : { valid: false, status: 'NOT VERIFIED' };
      const gradesRes = st.grades_file ? await parseGradesFile(st.grades_file, st.student_id) : { valid: false, status: 'NOT VERIFIED' };
      eafStatus = eafRes.status;
      gradesStatus = gradesRes.status;
      
      const notesObj = {
        eaf_status: eafStatus,
        eaf_reason: eafRes.reason || '',
        grades_status: gradesStatus,
        grades_reason: gradesRes.reason || '',
        parsed_terms: gradesRes.terms || [],
        aggregated_cgpa: gradesRes.avgTgpa || st.cgpa
      };
      st.notes = JSON.stringify(notesObj);
      dbChanged = true;
    }
    
    return {
      ...st,
      student_name: u ? u.name : `Scholar ${st.student_id || st.studentId}`,
      studentName: u ? u.name : `Scholar ${st.student_id || st.studentId}`,
      scholarship_name: s ? s.name : 'Star Scholars Program',
      scholarshipType: s ? s.name : 'Star Scholars Program',
      eaf_status: eafStatus,
      grades_status: gradesStatus
    };
  }));
  
  if (dbChanged) {
    writeDB(db);
  }
  
  res.json({ success: true, renewals: list });
});

// "Process Renewal Verification Action"
app.post('/api/admin/renewal-action', async (req, res) => {
  const { studentId, termIndex, action } = req.body;

  const tIdx = parseInt(termIndex) || 6;

  if (isMySQLConnected) {
    try {
      // For Invalid Submission action from admin, we mark as In Probation
      const actualStatus = action === 'Invalid Submission' ? 'In Probation' : action;

      await pool.query(
        `UPDATE scholar_terms SET status = ?, evaluated_at = NOW() WHERE student_id = ? AND term_index = ?`,
        [actualStatus, studentId, tIdx]
      );

      if (action === 'Renewed' || action === 'Invalid Submission') {
        const [termRows] = await pool.query('SELECT cgpa, notes FROM scholar_terms WHERE student_id = ? AND term_index = ?', [studentId, tIdx]);
        if (termRows.length > 0) {
          let parsedTerms = [];
          if (termRows[0].notes) {
            try {
              const notesObj = JSON.parse(termRows[0].notes);
              parsedTerms = notesObj.parsed_terms || [];
            } catch (e) {
              console.error('Error parsing notes JSON:', e);
            }
          }

          if (action === 'Renewed') {
            const currentCgpa = termRows[0].cgpa;
            if (currentCgpa > 0) {
              await pool.query('UPDATE users SET cgpa = ? WHERE id = ?', [currentCgpa, studentId]);
            }
          }

          // Auto-renew all previous No Records terms
          const [pastTerms] = await pool.query(
            'SELECT term_index, term_label FROM scholar_terms WHERE student_id = ? AND term_index < ? AND status = "No Records"',
            [studentId, tIdx]
          );

          for (const pt of pastTerms) {
            const matchedParsed = parsedTerms.find(p => p.term_label === pt.term_label);
            const tgpaVal = matchedParsed ? matchedParsed.tgpa : 0.00;
            const cgpaVal = matchedParsed ? matchedParsed.cgpa : 0.00;

            await pool.query(
              'UPDATE scholar_terms SET status = "Renewed", tgpa = ?, cgpa = ? WHERE student_id = ? AND term_index = ?',
              [tgpaVal, cgpaVal, studentId, pt.term_index]
            );
          }
        }

        // Update user's renewalStatus
        const newRenewalStatus = action === 'Renewed' ? 'Renewed' : 'Probation';
        try {
          await pool.query('UPDATE users SET renewalStatus = ? WHERE id = ?', [newRenewalStatus, studentId]);
        } catch (e) { console.error('Error updating user renewalStatus:', e); }
      }

      await pool.query(
        `INSERT INTO notifications (student_id, title, message) VALUES (?, 'Scholarship Renewal Verified', ?)`,
        [studentId, `Your renewal status for term ${tIdx} is verified and updated to: ${actualStatus}`]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server database error during renewal action.' });
    }
  }


  const db = readDB();
  const t = (db.scholar_terms || []).find(st => (st.student_id === studentId || st.studentId === studentId) && st.term_index === tIdx);
  const u = (db.users || []).find(usr => usr.id === studentId);

  if (t) {
    t.status = action;

    let parsedTerms = [];
    if (t.notes) {
      try {
        const notesObj = JSON.parse(t.notes);
        parsedTerms = notesObj.parsed_terms || [];
      } catch (e) {
        console.error('Error parsing notes JSON:', e);
      }
    }

    if (action === 'Renewed') {
      // Update user CGPA
      if (u && t.cgpa > 0) u.cgpa = t.cgpa;
      if (u) u.renewalStatus = 'Renewed';

      // Auto-renew all previous No Records terms
      (db.scholar_terms || []).forEach(st => {
        if ((st.student_id === studentId || st.studentId === studentId) && st.term_index < tIdx && st.status === 'No Records') {
          st.status = 'Renewed';
          const matchedParsed = parsedTerms.find(p => p.term_label === st.term_label);
          if (matchedParsed) {
            st.tgpa = matchedParsed.tgpa;
            st.cgpa = matchedParsed.cgpa;
          }
        }
      });
    } else if (action === 'Invalid Submission' || action === 'In Probation') {
      // Mark the current term as In Probation
      t.status = 'In Probation';
      // Set user renewalStatus to Probation
      if (u) u.renewalStatus = 'Probation';

      // Auto-renew all previous No Records terms (same as Renewed flow)
      (db.scholar_terms || []).forEach(st => {
        if ((st.student_id === studentId || st.studentId === studentId) && st.term_index < tIdx && st.status === 'No Records') {
          st.status = 'Renewed';
          const matchedParsed = parsedTerms.find(p => p.term_label === st.term_label);
          if (matchedParsed) {
            st.tgpa = matchedParsed.tgpa;
            st.cgpa = matchedParsed.cgpa;
          }
        }
      });
    }
  }
  writeDB(db);

  // Add notification
  if (!db.notifications) db.notifications = [];
  db.notifications.push({
    id: Date.now(),
    studentId,
    title: 'Scholarship Renewal Verified',
    message: `Your renewal status for term ${tIdx} is verified and updated to: ${action}`,
    read: false,
    createdAt: new Date().toISOString()
  });
  writeDB(db);

  res.json({ success: true });
});


// "Update Term Grades (CGPA/TGPA)"
app.post('/api/admin/update-term-grades', async (req, res) => {
  const { studentId, termIndex, tgpa, cgpa } = req.body;
  const tIdx = parseInt(termIndex) || 0;
  const tg = parseFloat(tgpa) || 0.0;
  const cg = parseFloat(cgpa) || 0.0;

  if (isMySQLConnected) {
    try {
      await pool.query('UPDATE scholar_terms SET tgpa = ?, cgpa = ? WHERE student_id = ? AND term_index = ?', [tg, cg, studentId, tIdx]);
      return res.json({ success: true });
    } catch (err) {
      console.error('Error updating term grades:', err);
      return res.status(500).json({ success: false, message: 'Database error updating term grades.' });
    }
  }

  const db = readDB();
  const t = (db.scholar_terms || []).find(st => (st.student_id === studentId || st.studentId === studentId) && (st.term_index === tIdx || st.termIndex === tIdx));
  if (t) {
    t.tgpa = tg;
    t.cgpa = cg;
    writeDB(db);
    return res.json({ success: true });
  }

  return res.status(404).json({ success: false, message: 'Term record not found' });
});

// Get term grades for a student (returns up to 12 terms)
app.get('/api/admin/term-grades/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  if (isMySQLConnected) {
    try {
      const [rows] = await pool.query('SELECT term_index, term_label, tgpa, cgpa, notes FROM scholar_terms WHERE student_id = ? ORDER BY term_index ASC', [studentId]);
      // get user current term index
      const [urows] = await pool.query('SELECT current_term_index FROM users WHERE id = ?', [studentId]);
      const currentTermIndex = (urows && urows[0]) ? (urows[0].current_term_index || null) : null;

      // try to find the most recent notes with parsed_terms
      let parsedTerms = [];
      for (let i = rows.length - 1; i >= 0; --i) {
        const notes = rows[i].notes;
        if (notes) {
          try {
            const obj = JSON.parse(notes);
            if (Array.isArray(obj.parsed_terms) && obj.parsed_terms.length > 0) { parsedTerms = obj.parsed_terms; break; }
          } catch (e) { /* ignore invalid JSON */ }
        }
      }

      const mapped = rows.map(r => {
        const termIndex = r.term_index;
        const termLabel = r.term_label;
        let tgpa = parseFloat(r.tgpa) || 0.0;
        let cgpa = parseFloat(r.cgpa) || 0.0;

        if ((!tgpa || tgpa === 0) && parsedTerms && parsedTerms.length) {
          const found = parsedTerms.find(p => String(p.term_index || p.termIndex || p.term_number) == String(termIndex) || String(p.term_label || p.termLabel) === String(termLabel));
          if (found) {
            tgpa = parseFloat(found.tgpa) || tgpa;
            cgpa = parseFloat(found.cgpa) || cgpa;
          }
        }

        return { termIndex, termLabel, tgpa, cgpa };
      });

      // Persist parsed values back to DB for missing term rows (only when DB values are zero)
      try {
        for (const m of mapped) {
          if ((m.tgpa && m.tgpa > 0) || (m.cgpa && m.cgpa > 0)) {
            // find original row to see if DB had zero
            const orig = rows.find(r => r.term_index === m.termIndex);
            const origT = parseFloat(orig.tgpa) || 0.0;
            const origC = parseFloat(orig.cgpa) || 0.0;
            if ((origT === 0 || origT === null) && (m.tgpa > 0 || m.cgpa > 0)) {
              await pool.query('UPDATE scholar_terms SET tgpa = ?, cgpa = ? WHERE student_id = ? AND term_index = ?', [m.tgpa, m.cgpa, studentId, m.termIndex]);
            }
            // update user renewalStatus in JSON DB
            const u = (db.users || []).find(usr => usr.id === studentId || usr.userId === studentId);
            if (u) u.renewalStatus = action === 'Renewed' ? 'Renewed' : action;
          }
        }
      } catch (e) { console.error('Error persisting parsed terms:', e); }

      // Ensure current term has no grades in response
      const finalMapped = mapped.map(m => {
        if (currentTermIndex && m.termIndex === currentTermIndex) return { ...m, tgpa: 0.0, cgpa: 0.0 };
        return m;
      });

      return res.json({ success: true, terms: finalMapped, currentTermIndex });
    } catch (err) {
      console.error('Error fetching term grades:', err);
      return res.status(500).json({ success: false, message: 'Database error fetching term grades.' });
    }
  }

  const db = readDB();
  const terms = (db.scholar_terms || []).filter(t => (t.student_id === studentId || t.studentId === studentId)).sort((a,b) => (a.term_index || a.termIndex) - (b.term_index || b.termIndex));
  // find most recent parsed_terms in notes
  let parsedTerms = [];
  for (let i = terms.length - 1; i >= 0; --i) {
    const notes = terms[i].notes;
    if (notes) {
      try {
        const obj = JSON.parse(notes);
        if (Array.isArray(obj.parsed_terms) && obj.parsed_terms.length > 0) { parsedTerms = obj.parsed_terms; break; }
      } catch (e) { }
    }
  }

  const mapped = terms.map(t => {
    const termIndex = t.term_index || t.termIndex;
    const termLabel = t.term_label || t.termLabel;
    let tgpa = parseFloat(t.tgpa) || 0.0;
    let cgpa = parseFloat(t.cgpa) || 0.0;
    if ((!tgpa || tgpa === 0) && parsedTerms && parsedTerms.length) {
      const found = parsedTerms.find(p => String(p.term_index || p.termIndex || p.term_number) == String(termIndex) || String(p.term_label || p.termLabel) === String(termLabel));
      if (found) {
        tgpa = parseFloat(found.tgpa) || tgpa;
        cgpa = parseFloat(found.cgpa) || cgpa;
      }
    }
    return { termIndex, termLabel, tgpa, cgpa };
  });
  // Persist parsed values into JSON DB for missing rows
  try {
    let changed = false;
    for (const m of mapped) {
      if ((m.tgpa && m.tgpa > 0) || (m.cgpa && m.cgpa > 0)) {
        const st = (db.scholar_terms || []).find(x => (x.student_id === studentId || x.studentId === studentId) && (x.term_index === m.termIndex || x.termIndex === m.termIndex));
        if (st) {
          const origT = parseFloat(st.tgpa) || 0.0;
          const origC = parseFloat(st.cgpa) || 0.0;
          if ((origT === 0 || origT === null) && (m.tgpa > 0 || m.cgpa > 0)) {
            st.tgpa = m.tgpa; st.cgpa = m.cgpa; changed = true;
          }
        }
      }
    }
    if (changed) writeDB(db);
  } catch (e) { console.error('Error persisting parsed terms to JSON DB:', e); }

  // try to get currentTermIndex from users
  const user = (db.users || []).find(u => u.id === studentId || u.userId === studentId);
  const currentTermIndex = user ? (user.currentTermIndex || user.current_term_index || null) : null;

  // Ensure current term returned has no grades
  const finalMapped = mapped.map(m => (currentTermIndex && m.termIndex === currentTermIndex) ? { ...m, tgpa: 0.0, cgpa: 0.0 } : m);

  return res.json({ success: true, terms: finalMapped, currentTermIndex });
});

// Update multiple term TGPA values for a student
app.post('/api/admin/update-multiple-term-grades', async (req, res) => {
  const { studentId, grades } = req.body; // grades: [{ termIndex, tgpa }]
  if (!studentId || !Array.isArray(grades)) return res.status(400).json({ success: false, message: 'Invalid payload' });

  if (isMySQLConnected) {
    const conn = await pool.getConnection();
    try {
      // validate all grades first
      for (const g of grades) {
        const tg = parseFloat(g.tgpa);
        if (!Number.isFinite(tg) || tg < 0.0 || tg > 4.5) {
          return conn.release && conn.release(), res.status(400).json({ success: false, message: 'Invalid TGPA value in payload', detail: g });
        }
      }

      await conn.beginTransaction();
      for (const g of grades) {
        const tIdx = parseInt(g.termIndex);
        const tg = parseFloat(g.tgpa);
        await conn.query('UPDATE scholar_terms SET tgpa = ? WHERE student_id = ? AND term_index = ?', [tg, studentId, tIdx]);
      }
      await conn.commit();
      conn.release();
      return res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error('Error updating multiple term grades:', err);
      return res.status(500).json({ success: false, message: 'Database error updating term grades.' });
    }
  }

  const db = readDB();
  let updated = false;
  for (const g of grades) {
    const tIdx = parseInt(g.termIndex);
    const tgRaw = parseFloat(g.tgpa);
    if (!Number.isFinite(tgRaw) || tgRaw < 0.0 || tgRaw > 4.5) {
      return res.status(400).json({ success: false, message: 'Invalid TGPA value in payload', detail: g });
    }
    const tg = tgRaw;
    const t = (db.scholar_terms || []).find(st => (st.student_id === studentId || st.studentId === studentId) && (st.term_index === tIdx || st.termIndex === tIdx));
    if (t) {
      t.tgpa = tg;
      updated = true;
    }
  }
  if (updated) writeDB(db);
  return res.json({ success: true });
});

// Update multiple term TGPA+CGPA values for a student (batch)
app.post('/api/admin/update-multiple-term-grades-full', async (req, res) => {
  const { studentId, grades } = req.body; // grades: [{ termIndex, tgpa?, cgpa? }]
  if (!studentId || !Array.isArray(grades)) return res.status(400).json({ success: false, message: 'Invalid payload' });

  if (isMySQLConnected) {
    const conn = await pool.getConnection();
    try {
      // Validate values
      for (const g of grades) {
        if (g.tgpa !== undefined) {
          const tg = parseFloat(g.tgpa);
          if (!Number.isFinite(tg) || tg < 0.0 || tg > 4.5) return conn.release && conn.release(), res.status(400).json({ success: false, message: 'Invalid TGPA value', detail: g });
        }
        if (g.cgpa !== undefined) {
          const cg = parseFloat(g.cgpa);
          if (!Number.isFinite(cg) || cg < 0.0 || cg > 4.5) return conn.release && conn.release(), res.status(400).json({ success: false, message: 'Invalid CGPA value', detail: g });
        }
      }

      await conn.beginTransaction();
      for (const g of grades) {
        const tIdx = parseInt(g.termIndex);
        if (g.tgpa !== undefined && g.cgpa !== undefined) {
          await conn.query('UPDATE scholar_terms SET tgpa = ?, cgpa = ? WHERE student_id = ? AND term_index = ?', [parseFloat(g.tgpa), parseFloat(g.cgpa), studentId, tIdx]);
        } else if (g.tgpa !== undefined) {
          await conn.query('UPDATE scholar_terms SET tgpa = ? WHERE student_id = ? AND term_index = ?', [parseFloat(g.tgpa), studentId, tIdx]);
        } else if (g.cgpa !== undefined) {
          await conn.query('UPDATE scholar_terms SET cgpa = ? WHERE student_id = ? AND term_index = ?', [parseFloat(g.cgpa), studentId, tIdx]);
        }
      }
      await conn.commit();
      conn.release();
      return res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error('Error updating multiple term grades (full):', err);
      return res.status(500).json({ success: false, message: 'Database error updating term grades.' });
    }
  }

  const db = readDB();
  let updated = false;
  for (const g of grades) {
    const tIdx = parseInt(g.termIndex);
    if (g.tgpa !== undefined) {
      const tg = parseFloat(g.tgpa);
      if (!Number.isFinite(tg) || tg < 0.0 || tg > 4.5) return res.status(400).json({ success: false, message: 'Invalid TGPA value', detail: g });
    }
    if (g.cgpa !== undefined) {
      const cg = parseFloat(g.cgpa);
      if (!Number.isFinite(cg) || cg < 0.0 || cg > 4.5) return res.status(400).json({ success: false, message: 'Invalid CGPA value', detail: g });
    }
    const t = (db.scholar_terms || []).find(st => (st.student_id === studentId || st.studentId === studentId) && (st.term_index === tIdx || st.termIndex === tIdx));
    if (t) {
      if (g.tgpa !== undefined) t.tgpa = parseFloat(g.tgpa);
      if (g.cgpa !== undefined) t.cgpa = parseFloat(g.cgpa);
      updated = true;
    }
  }
  if (updated) writeDB(db);
  return res.json({ success: true });
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
      const mapped = rows.map(r => ({
        ...r,
        studentName: r.student_name,
        scholarshipType: r.scholarship_name || 'Star Scholars Program'
      }));
      return res.json({ success: true, appeals: mapped });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const list = (db.appeals || []).map(a => {
    const u = (db.users || []).find(usr => usr.id === a.student_id || usr.id === a.studentId);
    const s = (db.scholarships && db.scholarships.length > 0 ? db.scholarships : fallbackScholarships)
      .find(sch => sch.id === parseInt(u ? (u.scholarshipId || u.scholarship_id) : 1));
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

      const dbStipendMap = new Map();
      const [stipendRows] = await pool.query(
        `SELECT student_id, term_label, month_index, amount, status, date_disbursed
         FROM stipends WHERE student_id IN (SELECT id FROM users WHERE role = 'student' AND status = 'approved')`
      );
      stipendRows.forEach(row => {
        const key = `${row.student_id}_${row.month_index}`;
        dbStipendMap.set(key, {
          month: row.month_index,
          status: row.status,
          amount: parseFloat(row.amount) || 0,
          date: row.date_disbursed || null
        });
      });

      const result = scholars.map(s => {
        const sId = String(s.studentId);
        const sType = s.scholarshipType || '';
        
        let type = 'monthly';
        let defaultAmount = 8000;
        if (sType.includes('La Salle')) {
          type = 'termly';
          defaultAmount = 15000;
        } else if (sType.includes('DOST')) {
          defaultAmount = 7000;
        }

        const monthlyStatus = [];
        const limit = type === 'monthly' ? 4 : 1;
        
        for (let m = 1; m <= limit; m++) {
          const dbKey = `${sId}_${m}`;
          if (dbStipendMap.has(dbKey)) {
            monthlyStatus.push(dbStipendMap.get(dbKey));
          } else {
            monthlyStatus.push({
              month: m,
              status: 'Pending',
              amount: defaultAmount,
              date: null
            });
          }
        }

        const matchRow = stipendRows.find(r => String(r.student_id) === sId);
        return {
          ...s,
          stipend: {
            term: matchRow ? matchRow.term_label : 'AY 2025-2026 Term 3',
            type,
            monthlyStatus
          }
        };
      });

      return res.json({ success: true, stipends: result });
    } catch (err) {
      console.error(err);
    }
  }
  const db = readDB();
  const scholars = (db.users || [])
    .filter(u => u.role === 'student' && u.status === 'approved')
    .map(u => {
      const s = (db.scholarships && db.scholarships.length > 0 ? db.scholarships : fallbackScholarships)
        .find(sch => sch.id === parseInt(u.scholarshipId || u.scholarship_id || 1));
      
      const sName = u.scholarshipType || (s ? s.name : 'Star Scholars Program');
      const sId = String(u.id);

      const existingStip = (db.stipends || []).find(st => String(st.studentId || st.student_id) === sId);

      let type = 'monthly';
      let defaultAmount = 8000;
      if (sName.includes('La Salle')) {
        type = 'termly';
        defaultAmount = 15000;
      } else if (sName.includes('DOST')) {
        defaultAmount = 7000;
      }

      const monthlyStatus = [];
      const limit = type === 'monthly' ? 4 : 1;

      for (let m = 1; m <= limit; m++) {
        let existingMonth = null;
        if (existingStip && existingStip.monthlyStatus) {
          existingMonth = existingStip.monthlyStatus.find(ms => (ms.month || ms.month_index) === m);
        }
        if (existingMonth) {
          monthlyStatus.push({
            month: m,
            status: existingMonth.status || 'Pending',
            amount: parseFloat(existingMonth.amount) || defaultAmount,
            date: existingMonth.date || existingMonth.date_disbursed || null
          });
        } else {
          monthlyStatus.push({
            month: m,
            status: 'Pending',
            amount: defaultAmount,
            date: null
          });
        }
      }

      return {
        studentId: u.id,
        studentName: u.name,
        id: u.id,
        name: u.name,
        scholarshipType: sName,
        renewalStatus: u.renewalStatus || 'Active',
        stipend: {
          term: existingStip ? (existingStip.term || existingStip.term_label) : 'AY 2025-2026 Term 3',
          type,
          monthlyStatus
        }
      };
    });

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
  const actualAmount = parseFloat(amount) || 8000;
  (db.expenses || []).push({
    id: Date.now(),
    studentId,
    type: 'income',
    category: 'stipend',
    amount: actualAmount,
    date: disburseDate,
    description: `Iskolaris Stipend: Month ${monthIndex || 1} Disbursement`
  });

  const match = (db.stipends || []).find(s => String(s.studentId || s.student_id) === String(studentId));
  if (match && match.monthlyStatus) {
    const month = match.monthlyStatus.find(m => String(m.month || m.month_index) === String(monthIndex));
    if (month) {
      month.status = 'Disbursed';
      month.date = disburseDate;
    }
  }
  writeDB(db);

  res.json({ success: true });
});

// Fallback to index.html for SPA router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Iskolaris Server running on http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  parseEAFFile,
  parseGradesFile,
  generate12TermsForBatch
};
