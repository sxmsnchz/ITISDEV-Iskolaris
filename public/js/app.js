/* ==========================================================================
   ISKOLARIS FRONTEND CONTROLLER (MODULAR SPA ROUTER)
   ========================================================================== */

let currentUser = null;
let currentTab = '';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  const savedUser = localStorage.getItem('iskolaris_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    launchDashboard();
  } else {
    showAuth();
  }
}

// Helper to fetch and inject templates
async function loadView(url, containerId) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch template: ${url}`);
    const html = await res.text();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
      return true;
    }
    return false;
  } catch (err) {
    console.error(err);
    showToast(`Template load error: ${url}`, true);
    return false;
  }
}

// ----------------------------------------------------
// AUTHENTICATION & LOGIN FLOW
// ----------------------------------------------------

async function showAuth() {
  const loaded = await loadView('/views/login.html', 'app');
  if (!loaded) return;

  setupAuthEventListeners();
}

function setupAuthEventListeners() {
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  });

  // Register File upload text change
  const regAwardInput = document.getElementById('reg-award-letter');
  if (regAwardInput) {
    regAwardInput.addEventListener('change', (e) => {
      const filename = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
      document.getElementById('reg-file-name').textContent = filename;
    });
  }

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('iskolaris_user', JSON.stringify(currentUser));
        showToast(`Welcome back, ${currentUser.name}!`);
        launchDashboard();
      } else {
        showToast(data.message || 'Login failed.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error. Is the server running?', true);
    }
  });

  // Register handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('id', document.getElementById('reg-id').value);
    formData.append('name', document.getElementById('reg-name').value);
    formData.append('email', document.getElementById('reg-email').value);
    formData.append('password', document.getElementById('reg-password').value);
    formData.append('college', document.getElementById('reg-college').value);
    formData.append('degree', document.getElementById('reg-degree').value);
    formData.append('scholarshipType', document.getElementById('reg-scholarship').value);
    formData.append('cgpa', document.getElementById('reg-cgpa').value);
    formData.append('awardLetter', regAwardInput.files[0]);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        showToast('Registration successful! Please sign in.');
        registerForm.reset();
        document.getElementById('reg-file-name').textContent = 'No file chosen';
        tabLoginBtn.click();
      } else {
        showToast(data.message || 'Registration failed.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to the server.', true);
    }
  });
}

// ----------------------------------------------------
// DASHBOARD INITIALIZATION
// ----------------------------------------------------

async function launchDashboard() {
  // Sync profile details
  try {
    const res = await fetch(`/api/users/profile/${currentUser.id}`);
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('iskolaris_user', JSON.stringify(currentUser));
    }
  } catch (err) {
    console.error('Profile sync failed:', err);
  }

  if (currentUser.role === 'admin') {
    launchAdminDashboard();
    return;
  }

  // Load student dashboard shell
  const loaded = await loadView('/views/student-dashboard.html', 'app');
  if (!loaded) return;

  // Render profile metadata
  document.getElementById('student-profile-name').textContent = currentUser.name;
  document.getElementById('student-profile-scholarship').textContent = currentUser.scholarshipType;
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('student-avatar-initials').textContent = initials;

  // Onboarding overlay display
  const pendingOverlay = document.getElementById('pending-overlay');
  const appealsLockBadge = document.getElementById('appeals-lock-badge');
  if (currentUser.status === 'pending') {
    pendingOverlay.classList.remove('hidden');
    appealsLockBadge.classList.remove('hidden');
  } else {
    pendingOverlay.classList.add('hidden');
    if (currentUser.renewalStatus === 'Probation') {
      appealsLockBadge.classList.add('hidden');
    } else {
      appealsLockBadge.classList.remove('hidden');
    }
  }

  // Hook navigation links
  setupNavigation();
  setupNotifications();

  // Load home overview tab immediately
  switchTab('s-overview');
}

function setupNavigation() {
  document.querySelectorAll('.sidebar-nav a').forEach(navLink => {
    navLink.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = navLink.getAttribute('data-tab');

      // Restrict tabs if pending
      if (currentUser.status === 'pending') {
        const sensitiveTabs = ['s-renewal', 's-stipend', 's-appeals'];
        if (sensitiveTabs.includes(tabName)) {
          showToast('Verification pending. Access is currently locked.', true);
          return;
        }
      }

      switchTab(tabName);
    });
  });

  // Bind logout click
  document.querySelector('.btn-logout').addEventListener('click', () => {
    localStorage.removeItem('iskolaris_user');
    currentUser = null;
    currentTab = '';
    showToast('Signed out successfully.');
    showAuth();
  });
}

// ----------------------------------------------------
// TAB VIEW ROUTING
// ----------------------------------------------------

async function switchTab(tabId) {
  currentTab = tabId;

  // Active state in sidebar navigation
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Page titles map
  const titleMap = {
    's-overview': 'Overview Dashboard',
    's-renewal': 'Scholarship Renewal Submission',
    's-analytics': 'Scholastic Analytics Workspace',
    's-budget': 'Financial Ledger & Expenses',
    's-stipend': 'Disbursement Milestone Timeline',
    's-appeals': 'Appeals Facility',
    's-resume': 'Professional Portfolio Resume'
  };
  document.getElementById('tab-title').textContent = titleMap[tabId] || 'Overview';

  // Fetch individual views
  const viewName = tabId.replace('s-', ''); // e.g. Overview, renewal
  const loaded = await loadView(`/views/student-${viewName}.html`, 'student-tab-content');
  if (!loaded) return;

  // Run view integrations
  if (tabId === 's-overview') {
    loadOverview();
  } else if (tabId === 's-renewal') {
    loadRenewalTracker();
  } else if (tabId === 's-analytics') {
    loadGPAAnalytics();
  } else if (tabId === 's-budget') {
    loadBudgetLedger();
  } else if (tabId === 's-stipend') {
    loadStipendTracker();
  } else if (tabId === 's-appeals') {
    loadAppealsTab();
  } else if (tabId === 's-resume') {
    loadResumeDetails();
  }
}

// ----------------------------------------------------
// TAB VIEWS LOAD DATA & BINDINGS
// ----------------------------------------------------

async function loadOverview() {
  document.getElementById('ov-cgpa').textContent = currentUser.cgpa.toFixed(2);

  // Retention limit alerts
  const gpaSub = document.getElementById('ov-gpa-status');
  let requiredGPA = 2.0;
  if (currentUser.scholarshipType.includes('Star')) requiredGPA = 3.0;
  else if (currentUser.scholarshipType.includes('DOST')) requiredGPA = 2.5;

  if (currentUser.cgpa >= requiredGPA) {
    gpaSub.innerHTML = `<i class="bx bx-check-circle"></i> Good Standing`;
    gpaSub.className = 'stat-sub text-success';
  } else {
    gpaSub.innerHTML = `<i class="bx bx-error-circle"></i> Retention Risk (Target: ${requiredGPA.toFixed(1)})`;
    gpaSub.className = 'stat-sub text-danger';
  }

  document.getElementById('ov-renewal-status').textContent = currentUser.renewalStatus;
  const renewalSub = document.getElementById('ov-renewal-sub');
  if (currentUser.renewalStatus === 'Processed') {
    renewalSub.textContent = 'AY 25-26 Term 3 Approved';
  } else if (currentUser.renewalStatus === 'Submitted') {
    renewalSub.textContent = 'Awaiting AdSO Review';
  } else if (currentUser.renewalStatus === 'Probation') {
    renewalSub.textContent = 'Appeals Action Required';
  } else {
    renewalSub.textContent = 'Renewal period is active';
  }

  // Populate checklist states
  const chkOnboard = document.getElementById('chk-onboard');
  const chkRenewal = document.getElementById('chk-renewal');
  const chkGpa = document.getElementById('chk-gpa');

  if (currentUser.status === 'approved') {
    chkOnboard.className = 'checked';
    chkOnboard.innerHTML = `<i class="bx bx-check-circle"></i> Onboarding Verification Approved`;
  } else {
    chkOnboard.className = '';
    chkOnboard.innerHTML = `<i class="bx bx-circle"></i> Onboarding Verification Pending`;
  }

  if (currentUser.renewalStatus === 'Processed' || currentUser.renewalStatus === 'Submitted') {
    chkRenewal.className = 'checked';
    chkRenewal.innerHTML = `<i class="bx bx-check-circle"></i> Term 3 Renewal Submitted`;
  } else {
    chkRenewal.className = '';
    chkRenewal.innerHTML = `<i class="bx bx-circle"></i> Submit Term 3 EAF & Grades`;
  }

  if (currentUser.cgpa >= requiredGPA) {
    chkGpa.className = 'checked';
    chkGpa.innerHTML = `<i class="bx bx-check-circle"></i> CGPA Meets Requirement (${currentUser.cgpa.toFixed(2)} &ge; ${requiredGPA.toFixed(1)})`;
  } else {
    chkGpa.className = '';
    chkGpa.innerHTML = `<i class="bx bx-circle text-danger"></i> Scholastic Risk: GPA Below Limit`;
  }

  // Fetch budget totals
  try {
    const res = await fetch(`/api/budget/data/${currentUser.id}`);
    const data = await res.json();
    if (data.success) {
      updateFinancialOverview(data.data);
    }
  } catch (err) {
    console.error(err);
  }

  // Active stipend timeline snapshot
  const timelineSnapshot = document.getElementById('overview-stipend-timeline');
  document.getElementById('ov-timeline-scholarship').textContent = currentUser.scholarshipType;
  if (currentUser.status === 'pending') {
    timelineSnapshot.innerHTML = `<p class="no-notif">Unlock stipend tracking once account is verified.</p>`;
  } else {
    try {
      const res = await fetch(`/api/admin/stipends`);
      const data = await res.json();
      if (data.success) {
        const match = data.stipends.find(s => s.studentId === currentUser.id);
        if (match && match.stipend) {
          const stip = match.stipend;
          let html = `<div class="overview-timeline-bars">`;
          stip.monthlyStatus.forEach(m => {
            const isDisbursed = m.status === 'Disbursed';
            html += `
              <div class="timeline-bar-block">
                <span class="bar-tag">${stip.type === 'monthly' ? `Month ${m.month}` : 'Term Grant'}</span>
                <div class="bar-status-bar ${isDisbursed ? 'bg-success' : 'bg-light'}"></div>
                <span class="bar-label">${isDisbursed ? 'Disbursed' : 'Pending'}</span>
              </div>
            `;
          });
          html += `</div>`;
          timelineSnapshot.innerHTML = html;
        } else {
          timelineSnapshot.innerHTML = `<p class="no-notif">No stipend record found for the current term.</p>`;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// Financial indicators updater
function updateFinancialOverview(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  let expenseDays = new Set();

  transactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      expenseDays.add(t.date);
    }
  });

  const walletBalance = totalIncome - totalExpense;
  const balanceEl = document.getElementById('ov-budget-balance');
  if (balanceEl) balanceEl.textContent = `₱${walletBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

  // Fill Bars
  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const incomePercent = (totalIncome / maxVal) * 100;
  const expensePercent = (totalExpense / maxVal) * 100;

  const fillIncome = document.getElementById('ov-fill-income');
  const fillExpense = document.getElementById('ov-fill-expense');
  if (fillIncome) {
    document.getElementById('ov-bar-income').textContent = `₱${totalIncome.toLocaleString()}`;
    fillIncome.style.width = `${incomePercent}%`;
  }
  if (fillExpense) {
    document.getElementById('ov-bar-expense').textContent = `₱${totalExpense.toLocaleString()}`;
    fillExpense.style.width = `${expensePercent}%`;
  }

  // Estimated Runway calculations
  const runwayDaysValue = document.getElementById('runway-days-value');
  const runwayDescValue = document.getElementById('runway-desc-value');
  const ovRunwayText = document.getElementById('ov-runway-text');

  if (walletBalance <= 0) {
    if (runwayDaysValue) runwayDaysValue.textContent = '0 Days';
    if (runwayDescValue) runwayDescValue.textContent = 'Wallet balance is empty or negative. Add income streams.';
    if (ovRunwayText) {
      ovRunwayText.textContent = '0 days runway';
      ovRunwayText.className = 'stat-sub text-danger';
    }
  } else {
    const daysCount = expenseDays.size || 1;
    const avgDailyExpense = totalExpense / daysCount;

    if (avgDailyExpense <= 0) {
      if (runwayDaysValue) runwayDaysValue.textContent = '∞ Days';
      if (runwayDescValue) runwayDescValue.textContent = 'No daily expenses logged. Your wallet is secure!';
      if (ovRunwayText) {
        ovRunwayText.textContent = 'Stable funds';
        ovRunwayText.className = 'stat-sub text-success';
      }
    } else {
      const remainingDays = Math.ceil(walletBalance / avgDailyExpense);
      if (runwayDaysValue) runwayDaysValue.textContent = `${remainingDays} Days`;
      if (runwayDescValue) runwayDescValue.textContent = `Based on average daily expenses of ₱${avgDailyExpense.toFixed(0)} across logged days.`;
      
      if (ovRunwayText) {
        ovRunwayText.textContent = `${remainingDays} days runway`;
        if (remainingDays < 7) {
          ovRunwayText.className = 'stat-sub text-danger';
        } else if (remainingDays < 14) {
          ovRunwayText.className = 'stat-sub text-warning';
        } else {
          ovRunwayText.className = 'stat-sub text-success';
        }
      }
    }
  }

  // Checklist updates
  const chkBudget = document.getElementById('chk-budget');
  if (chkBudget) {
    if (transactions.filter(t => t.type === 'expense').length > 0) {
      chkBudget.className = 'checked';
      chkBudget.innerHTML = `<i class="bx bx-check-circle"></i> Logged daily expenses in ledger`;
    } else {
      chkBudget.className = '';
      chkBudget.innerHTML = `<i class="bx bx-circle"></i> Log daily expenses in ledger`;
    }
  }
}

// ----------------------------------------------------
// SUB-TAB LOAD MANAGERS
// ----------------------------------------------------

async function loadRenewalTracker() {
  const eafInput = document.getElementById('ren-eaf');
  const gradesInput = document.getElementById('ren-grades');
  const tgpaInput = document.getElementById('ren-tgpa');
  const cgpaInput = document.getElementById('ren-cgpa');
  const submitBtn = document.getElementById('btn-submit-renewal');
  const renewalForm = document.getElementById('renewal-submit-form');

  // Input file text triggers
  eafInput.addEventListener('change', (e) => {
    document.getElementById('ren-eaf-name').textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
  });
  gradesInput.addEventListener('change', (e) => {
    document.getElementById('ren-grades-name').textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
  });

  // Form Submission
  renewalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-renewal');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const formData = new FormData();
    formData.append('studentId', currentUser.id);
    formData.append('term', document.getElementById('ren-term').value);
    formData.append('tgpa', tgpaInput.value);
    formData.append('cgpa', cgpaInput.value);
    formData.append('eaf', eafInput.files[0]);
    formData.append('grades', gradesInput.files[0]);

    try {
      const response = await fetch('/api/renewal/submit', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showToast('Renewal compliance forms uploaded successfully!');
        currentUser.renewalStatus = 'Submitted';
        localStorage.setItem('iskolaris_user', JSON.stringify(currentUser));
        renewalForm.reset();
        document.getElementById('ren-eaf-name').textContent = 'No file chosen';
        document.getElementById('ren-grades-name').textContent = 'No file chosen';
        loadRenewalTracker();
      } else {
        showToast(data.message || 'Submission failed.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Renewal Request';
    }
  });

  // Set visual status cycle steps
  try {
    const res = await fetch(`/api/renewal/status/${currentUser.id}`);
    const data = await res.json();

    const steps = ['none', 'submitted', 'acknowledged', 'review', 'processed'];
    let currentStepIndex = 0;

    if (data.success && data.renewal) {
      const status = data.renewal.status;
      if (status === 'Submitted') currentStepIndex = 1;
      else if (status === 'Acknowledged') currentStepIndex = 2;
      else if (status === 'Under Review') currentStepIndex = 3;
      else if (status === 'Processed' || status === 'Renewed') currentStepIndex = 4;

      if (status === 'Submitted' || status === 'Under Review' || status === 'Processed' || status === 'Renewed') {
        eafInput.disabled = true;
        gradesInput.disabled = true;
        tgpaInput.disabled = true;
        cgpaInput.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submission Locked (Awaiting Verification)';
        document.getElementById('renewal-period-badge').className = 'card-badge bg-danger';
        document.getElementById('renewal-period-badge').textContent = 'Submission Completed';
      }
    }

    steps.forEach((step, idx) => {
      const stepEl = document.getElementById(`step-${step}`);
      if (stepEl) {
        stepEl.className = 'step';
        if (idx < currentStepIndex) stepEl.classList.add('completed');
        else if (idx === currentStepIndex) stepEl.classList.add('active');
      }
    });

  } catch (err) {
    console.error(err);
  }
}

async function loadGPAAnalytics() {
  let threshold = 2.0;
  if (currentUser.scholarshipType.includes('Star')) threshold = 3.0;
  else if (currentUser.scholarshipType.includes('DOST')) threshold = 2.5;

  document.getElementById('min-gpa-badge').textContent = `Retention Limit: ${threshold.toFixed(2)}`;

  // Display GPA danger alerts
  const alertBanner = document.getElementById('gpa-warning-banner');
  if (currentUser.cgpa - threshold <= 0.15) {
    alertBanner.classList.remove('hidden');
  } else {
    alertBanner.classList.add('hidden');
  }

  // Pre-load calculator details
  document.getElementById('calc-completed-units').value = currentUser.unitsCompleted || 110;
  document.getElementById('calc-remaining-units').value = currentUser.unitsRemaining || 42;

  // Load line graph
  try {
    const res = await fetch(`/api/grades/history/${currentUser.id}`);
    const data = await res.json();
    if (data.success) {
      renderGPALineChart(data.history, threshold);
    }
  } catch (err) {
    console.error(err);
  }

  // Calculator logic
  document.getElementById('calc-target').addEventListener('change', (e) => {
    const val = e.target.value;
    const customGrp = document.getElementById('custom-target-group');
    if (val === 'custom') customGrp.classList.remove('hidden');
    else customGrp.classList.add('hidden');
  });

  document.getElementById('btn-calculate-gpa').addEventListener('click', () => {
    const targetSelect = document.getElementById('calc-target').value;
    let targetGPA = parseFloat(targetSelect);
    if (targetSelect === 'custom') {
      targetGPA = parseFloat(document.getElementById('calc-custom-gpa').value);
    }

    if (isNaN(targetGPA) || targetGPA < 0 || targetGPA > 4) {
      showToast('Please specify a target GPA (0.0 - 4.0)', true);
      return;
    }

    const completedUnits = parseFloat(document.getElementById('calc-completed-units').value);
    const remainingUnits = parseFloat(document.getElementById('calc-remaining-units').value);
    const currentCGPA = currentUser.cgpa;

    const totalUnits = completedUnits + remainingUnits;
    const requiredGrade = ((targetGPA * totalUnits) - (currentCGPA * completedUnits)) / remainingUnits;

    const resultsBox = document.getElementById('calc-results-box');
    const requiredGpaText = document.getElementById('calc-required-gpa');
    const impossibleWarning = document.getElementById('calc-impossible-warning');

    resultsBox.classList.remove('hidden');

    if (requiredGrade > 4.00) {
      requiredGpaText.textContent = requiredGrade.toFixed(2);
      requiredGpaText.className = 'result-number text-danger';
      impossibleWarning.classList.remove('hidden');
      impossibleWarning.textContent = `Impossible target. Requires > 4.00 average.`;
    } else if (requiredGrade < 0) {
      requiredGpaText.textContent = '0.00';
      requiredGpaText.className = 'result-number text-success';
      impossibleWarning.classList.add('hidden');
    } else {
      requiredGpaText.textContent = requiredGrade.toFixed(2);
      requiredGpaText.className = 'result-number text-success';
      impossibleWarning.classList.add('hidden');
    }
  });

  // Certificate vault uploads
  const vaultForm = document.getElementById('vault-upload-form');
  const vaultFileInput = document.getElementById('vault-file');
  vaultFileInput.addEventListener('change', (e) => {
    document.getElementById('vault-file-display').textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
  });

  vaultForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('studentId', currentUser.id);
    formData.append('term', document.getElementById('vault-term').value);
    formData.append('certificate', vaultFileInput.files[0]);

    try {
      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showToast('Academic Certificate Vault updated!');
        vaultForm.reset();
        document.getElementById('vault-file-display').textContent = 'No file chosen';
        loadCertificateVault();
      } else {
        showToast(data.message || 'Upload failed.', true);
      }
    } catch (err) {
      console.error(err);
    }
  });

  loadCertificateVault();
}

async function loadBudgetLedger() {
  const tableBody = document.getElementById('ledger-table-body');
  const ledgerForm = document.getElementById('ledger-form');
  const ledgerTypeRadios = document.getElementsByName('ledger-type');
  const categorySelect = document.getElementById('ledger-category');

  // Input defaults
  document.getElementById('ledger-date').value = new Date().toISOString().split('T')[0];

  const expenseOptions = `
    <option value="food">Food & Dining</option>
    <option value="transportation">Transportation</option>
    <option value="dorm rent">Dorm Rent / Boarding</option>
    <option value="school supplies">School Supplies & Books</option>
    <option value="other">Other Expenses</option>
  `;
  const incomeOptions = `
    <option value="allowance">Allowance from Parents</option>
    <option value="stipend">Scholarship Stipend</option>
    <option value="job">Part-time / Side job</option>
    <option value="other">Other Incomes</option>
  `;

  ledgerTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      categorySelect.innerHTML = e.target.value === 'income' ? incomeOptions : expenseOptions;
    });
  });

  ledgerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      studentId: currentUser.id,
      type: document.querySelector('input[name="ledger-type"]:checked').value,
      category: categorySelect.value,
      amount: document.getElementById('ledger-amount').value,
      date: document.getElementById('ledger-date').value,
      description: document.getElementById('ledger-desc').value
    };

    try {
      const res = await fetch('/api/budget/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Ledger balance entry saved!');
        ledgerForm.reset();
        document.getElementById('ledger-date').value = new Date().toISOString().split('T')[0];
        loadBudgetLedger();
      }
    } catch (err) {
      console.error(err);
    }
  });

  try {
    const res = await fetch(`/api/budget/data/${currentUser.id}`);
    const data = await res.json();

    if (data.success) {
      let html = '';
      const items = data.data.sort((a,b) => new Date(b.date) - new Date(a.date));
      items.forEach(t => {
        const isExpense = t.type === 'expense';
        html += `
          <tr>
            <td>${t.date}</td>
            <td><span class="badge ${isExpense ? 'badge-danger' : 'badge-success'}">${isExpense ? 'Expense' : 'Income'}</span></td>
            <td>${t.category.toUpperCase()}</td>
            <td>${t.description}</td>
            <td class="text-right ${isExpense ? 'text-danger' : 'text-success'}">
              ${isExpense ? '-' : '+'}₱${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </td>
          </tr>
        `;
      });
      tableBody.innerHTML = html || `<tr><td colspan="5" class="text-center text-muted">No transactions logged.</td></tr>`;

      renderBudgetCharts(data.data);
      updateFinancialOverview(data.data);
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadStipendTracker() {
  const container = document.getElementById('stipend-timeline-container');
  try {
    const res = await fetch(`/api/admin/stipends`);
    const data = await res.json();
    if (data.success) {
      const match = data.stipends.find(s => s.studentId === currentUser.id);
      if (match && match.stipend) {
        const stip = match.stipend;
        document.getElementById('stipend-type-badge').textContent = stip.type === 'monthly' ? 'Monthly Disbursement Cycle' : 'Term Grant Disbursement';

        let html = '';
        stip.monthlyStatus.forEach(m => {
          const isDisbursed = m.status === 'Disbursed';
          html += `
            <div class="stipend-milestone ${isDisbursed ? 'disbursed' : 'pending'}">
              <div class="stipend-milestone-circle"></div>
              <div class="stipend-milestone-card">
                <div class="stipend-m-info">
                  <h4>${stip.type === 'monthly' ? `Month ${m.month} Allowance` : 'Term Scholarship Grant'}</h4>
                  <p>${isDisbursed ? `Credited on ${m.date}` : 'Awaiting admin processing'}</p>
                </div>
                <div class="stipend-m-status">
                  <span class="stipend-m-val">₱${m.amount.toLocaleString()}</span>
                  <br>
                  <span class="badge ${isDisbursed ? 'badge-success' : 'badge-warning'}">${m.status}</span>
                </div>
              </div>
            </div>
          `;
        });
        container.innerHTML = html;
      } else {
        container.innerHTML = `<p class="no-notif">Stipends have not been initialized by FAO yet.</p>`;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function loadAppealsTab() {
  const appealForm = document.getElementById('appeal-submit-form');
  const appealLetterInput = document.getElementById('appeal-letter-file');
  const appealSupportInput = document.getElementById('appeal-support-file');

  appealLetterInput.addEventListener('change', (e) => {
    document.getElementById('appeal-letter-name').textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
  });
  appealSupportInput.addEventListener('change', (e) => {
    document.getElementById('appeal-support-name').textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
  });

  appealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-appeal');
    btn.disabled = true;
    btn.textContent = 'Uploading appeal...';

    const formData = new FormData();
    formData.append('studentId', currentUser.id);
    formData.append('term', document.getElementById('appeal-term').value);
    formData.append('reason', document.getElementById('appeal-reason').value);
    formData.append('letter', appealLetterInput.files[0]);
    formData.append('support', appealSupportInput.files[0]);

    try {
      const response = await fetch('/api/appeal/submit', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showToast('Appeal document package uploaded to review desk!');
        currentUser.renewalStatus = 'Appeal Submitted';
        localStorage.setItem('iskolaris_user', JSON.stringify(currentUser));
        appealForm.reset();
        document.getElementById('appeal-letter-name').textContent = 'No file chosen';
        document.getElementById('appeal-support-name').textContent = 'No file chosen';
        switchTab('s-overview');
      } else {
        showToast(data.message || 'Upload failed.', true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Appeal Package';
    }
  });

  // Display lock checks
  const appealsLock = document.getElementById('appeals-lock');
  if (currentUser.renewalStatus === 'Probation') {
    appealsLock.classList.add('hidden');
  } else {
    appealsLock.classList.remove('hidden');
  }
}

async function loadResumeDetails() {
  document.getElementById('res-out-name').textContent = currentUser.name;
  document.getElementById('res-out-degree').textContent = `${currentUser.degree} | De La Salle University`;
  document.getElementById('res-out-email').textContent = currentUser.email;
  document.getElementById('res-out-education-meta').textContent = `College of Computer Studies | ${currentUser.degree}`;
  document.getElementById('res-out-cgpa').textContent = currentUser.cgpa.toFixed(2);
  document.getElementById('res-out-scholarship').textContent = currentUser.scholarshipType;

  // Retrieve certificates
  const certContainer = document.getElementById('res-out-honors-container');
  try {
    const res = await fetch(`/api/vault/files/${currentUser.id}`);
    const data = await res.json();
    if (data.success && data.files.length > 0) {
      let titles = data.files.map(f => f.term).join(', ');
      certContainer.innerHTML = `<p class="res-detail text-primary" style="margin-top:0.25rem;"><i class="bx bx-star"></i> Dean's List Certificate Holder (${titles})</p>`;
    } else {
      certContainer.innerHTML = '';
    }
  } catch (err) {
    console.error(err);
  }

  // Bind live listeners
  const inputs = ['res-summary', 'res-orgs', 'res-projects', 'res-skills'];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateResumePreview);
  });

  document.getElementById('btn-export-resume').addEventListener('click', () => {
    window.print();
  });

  updateResumePreview();
}

// ----------------------------------------------------
// GLOBAL NOTIFICATIONS
// ----------------------------------------------------

async function setupNotifications() {
  const notifList = document.getElementById('notifications-list');
  const badge = document.getElementById('bell-badge');

  try {
    const res = await fetch(`/api/notifications/${currentUser.id}`);
    const data = await res.json();

    if (data.success && data.notifications.length > 0) {
      const unreadCount = data.notifications.filter(n => !n.read).length;
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }

      let html = '';
      data.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(n => {
        html += `
          <div class="notif-item ${n.read ? '' : 'unread'}">
            <p class="notif-item-title">${n.title}</p>
            <p class="notif-item-desc">${n.message}</p>
            <span class="notif-item-time">${new Date(n.createdAt).toLocaleDateString()}</span>
          </div>
        `;
      });
      notifList.innerHTML = html;
    }
  } catch (err) {
    console.error(err);
  }

  // Bell dropdown listeners
  const bellBtn = document.getElementById('bell-dropdown-btn');
  if (bellBtn) {
    bellBtn.onclick = (e) => {
      e.stopPropagation();
      document.getElementById('notification-dropdown').classList.toggle('active');
    };
  }

  const clearBtn = document.getElementById('clear-notif-btn');
  if (clearBtn) {
    clearBtn.onclick = async () => {
      try {
        await fetch(`/api/notifications/read/${currentUser.id}`, { method: 'POST' });
        setupNotifications();
      } catch (err) {
        console.error(err);
      }
    };
  }
}

// ----------------------------------------------------
// TOAST ALERT HELPER
// ----------------------------------------------------
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  if (!toast || !toastMsg || !toastIcon) return;

  toastMsg.textContent = message;

  if (isError) {
    toast.classList.add('error-toast');
    toastIcon.className = 'bx bx-error-circle toast-icon';
  } else {
    toast.classList.remove('error-toast');
    toastIcon.className = 'bx bx-check-circle toast-icon';
  }

  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}
window.showToast = showToast;
