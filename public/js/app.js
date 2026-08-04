// Iskolaris Frontend Controller (Modular SPA Router)

let currentUser = null;
let currentTab = '';
let activeSelectedTermIndex = 6;

async function syncCurrentUserProfile() {
  if (!currentUser || currentUser.role === 'admin') return false;

  try {
    const res = await fetch(`/api/users/profile/${currentUser.id}`);
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = { ...currentUser, ...data.user };
      currentUser.status = currentUser.status ? currentUser.status.toString().trim().toLowerCase() : currentUser.status;
      currentUser.renewalStatus = normalizeRenewalStatus(currentUser.renewalStatus);
      currentUser.cgpa = parseFloat(data.user.cgpa) || parseFloat(currentUser.cgpa) || 0.0;
      currentUser.tgpa = parseFloat(data.user.tgpa) || parseFloat(currentUser.tgpa) || 0.0;
      if (Array.isArray(data.user.terms)) {
        currentUser.terms = data.user.terms;
      }
      localStorage.setItem('iskolaris_user', JSON.stringify(currentUser));
      return true;
    }
  } catch (err) {
    console.error('Profile sync failed:', err);
  }

  return false;
}

// Helper to get month name based on Term
function getTermMonthName(termString, monthIndex) {
  let termNum = 3; // Default fallback
  if (termString) {
    const match = termString.match(/Term\s*(\d)/i) || termString.match(/T\s*(\d)/i);
    if (match) {
      termNum = parseInt(match[1]);
    }
  }

  const term1Months = ['September', 'October', 'November', 'December'];
  const term2Months = ['January', 'February', 'March', 'April'];
  const term3Months = ['May', 'June', 'July', 'August'];

  const idx = (parseInt(monthIndex) - 1) % 4;
  if (termNum === 1) {
    return term1Months[idx] || 'Month ' + monthIndex;
  } else if (termNum === 2) {
    return term2Months[idx] || 'Month ' + monthIndex;
  } else {
    return term3Months[idx] || 'Month ' + monthIndex;
  }
}

function normalizeRenewalStatus(rawStatus) {
  const status = (rawStatus || '').toString().trim();
  switch (status) {
    case 'Renewed':
    case 'Processed':
    case 'Approved':
      return 'Renewed';
    case 'In Probation':
    case 'Reconsidered':
      return 'Probation';
    case 'Terminated':
      return 'Terminated';
    case 'Processing':
    case 'Under Review':
    case 'Submitted':
    case 'Invalid Submission':
      return 'Processing';
    case 'No Submission':
    case 'Not Scheduled':
    case 'No Records':
    case 'Not Started':
    case 'Pending':
    case 'Active':
      return 'Not Started';
    default:
      return status || 'Not Started';
  }
}


document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// "Initialize Application"
function initApp() {
  const savedUser = localStorage.getItem('iskolaris_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    currentUser.status = currentUser.status ? currentUser.status.toString().trim().toLowerCase() : currentUser.status;
    currentUser.renewalStatus = normalizeRenewalStatus(currentUser.renewalStatus);
    currentUser.cgpa = parseFloat(currentUser.cgpa) || 0.0;
    launchDashboard();
  } else {
    showAuth();
  }
}

// "Load View Template"
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

// "Show Authentication View"
async function showAuth() {
  const loaded = await loadView('/views/login.html', 'app');
  if (!loaded) return;

  setupAuthEventListeners();
}

// "Setup Authentication Event Listeners"
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
        currentUser.status = currentUser.status ? currentUser.status.toString().trim().toLowerCase() : currentUser.status;
        currentUser.renewalStatus = normalizeRenewalStatus(currentUser.renewalStatus);
        currentUser.cgpa = parseFloat(currentUser.cgpa) || 0.0;
        currentUser.tgpa = parseFloat(currentUser.tgpa) || 0.0;
        localStorage.setItem('iskolaris_user', JSON.stringify(currentUser));
        showToast(`Welcome back, ${currentUser.name}!`);
        await syncCurrentUserProfile();
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
    formData.append('degreeProgramId', document.getElementById('reg-degree').value || '8');
    formData.append('scholarshipId', document.getElementById('reg-scholarship').value || '1');
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

// "Launch Dashboard View"
async function launchDashboard() {
  // Sync profile details
  await syncCurrentUserProfile();

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

  updateSidebarLocks();

  // Onboarding or termination overlay display
  const pendingOverlay = document.getElementById('pending-overlay');
  const appealsLockBadge = document.getElementById('nav-appeals-lock');
  if (currentUser.status === 'pending') {
    pendingOverlay.classList.remove('hidden');
    pendingOverlay.querySelector('h3').textContent = 'Registration Status: Verification Pending';
    pendingOverlay.querySelector('p').textContent = 'Your scholarship award letter is currently undergoing manual document verification by DLSU AdSO. Sensitive areas (Renewal, Appeals, Stipend Timelines) will unlock immediately once approved. You can explore the Budget Tracker, Academic Analytics, and Resume Builder in the meantime.';
    if (appealsLockBadge) appealsLockBadge.classList.remove('hidden');
  } else if (currentUser.status === 'terminated') {
    pendingOverlay.classList.remove('hidden');
    pendingOverlay.querySelector('h3').textContent = 'Scholarship Terminated';
    pendingOverlay.querySelector('p').textContent = 'Your scholarship has been terminated. Renewal, Appeals, and Stipend Timeline access is suspended, but Budget Tracker, Academic Analytics, and Resume Builder remain available for review. Please contact your administrator if you have questions.';
    if (appealsLockBadge) appealsLockBadge.classList.remove('hidden');
  } else {
    pendingOverlay.classList.add('hidden');
    // Hide the lock badge (unlock the tab) when in Probation; show it otherwise
    if (appealsLockBadge) {
      if (currentUser.renewalStatus === 'Probation') {
        appealsLockBadge.classList.add('hidden');
      } else {
        appealsLockBadge.classList.remove('hidden');
      }
    }
  }

  // Hook navigation links
  setupNavigation();
  setupNotifications();

  // Load home overview tab immediately
  switchTab('s-overview');
}

// "Setup Navigation Handlers"
function setupNavigation() {
  document.querySelectorAll('.sidebar-nav a').forEach(navLink => {
    navLink.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = navLink.getAttribute('data-tab');

      // Restrict sensitive tabs for terminated users only.
      if (currentUser.status === 'terminated') {
        const restrictedTabs = ['s-renewal', 's-stipend', 's-appeals'];
        if (restrictedTabs.includes(tabName)) {
          showToast('Scholarship has been terminated. This section is locked.', true);
          return;
        }
      }

      if (currentUser.status === 'pending') {
        const sensitiveTabs = ['s-renewal', 's-stipend', 's-appeals'];
        const isAppealsAndProbation = tabName === 's-appeals' && currentUser.renewalStatus === 'Probation';
        if (sensitiveTabs.includes(tabName) && !isAppealsAndProbation) {
          showToast('Verification pending. Access is currently locked.', true);
          return;
        }
      }

      if (tabName === 's-appeals' && currentUser.renewalStatus !== 'Probation') {
        showToast('Appeals are only available when your renewal status is In Probation.', true);
        return;
      }

      if (tabName === 's-stipend') {
        const sName = currentUser.scholarshipType || currentUser.scholarship_name || '';
        if (sName.includes('La Salle') || sName.includes('Archer')) {
          showToast('Stipend tracker is locked (not available for this scholarship).', true);
          return;
        }
      }

      switchTab(tabName);
    });
  });

  updateSidebarLocks();

  // Bind logout click
  document.querySelector('.btn-logout').addEventListener('click', () => {
    localStorage.removeItem('iskolaris_user');
    currentUser = null;
    currentTab = '';
    showToast('Signed out successfully.');
    showAuth();
  });
}

function updateSidebarLocks() {
  const lockMap = {
    's-renewal': 'nav-renewal-lock',
    's-stipend': 'nav-stipend-lock',
    's-appeals': 'nav-appeals-lock'
  };

  const isTerminated = currentUser && currentUser.status === 'terminated';
  const isPending = currentUser && currentUser.status === 'pending';
  const isAppealsLocked = currentUser && currentUser.renewalStatus !== 'Probation';
  const sName = currentUser ? (currentUser.scholarshipType || currentUser.scholarship_name || '') : '';
  const isNoStipend = sName.includes('La Salle') || sName.includes('Archer');

  Object.entries(lockMap).forEach(([tabId, lockId]) => {
    const lockEl = document.getElementById(lockId);
    const tabEl = document.querySelector(`.sidebar-nav a[data-tab="${tabId}"]`);
    if (!lockEl || !tabEl) return;

    let locked = false;
    if (tabId === 's-appeals') {
      locked = isTerminated || isAppealsLocked;
    } else if (tabId === 's-stipend') {
      locked = isTerminated || isPending || isNoStipend;
    } else if (tabId === 's-renewal') {
      locked = isTerminated || isPending;
    }

    lockEl.classList.toggle('hidden', !locked);
    tabEl.classList.toggle('locked', locked);
  });
}

// "Switch Active Tab"
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

  // Page titles
  const titleMap = {
    's-overview': 'Overview Dashboard',
    's-renewal': 'Scholarship Renewal Submission',
    's-analytics': 'Scholastic Analytics Workspace',
    's-budget': 'Financial Ledger & Expenses',
    's-stipend': 'Disbursement Milestone Timeline',
    's-appeals': 'Appeals Facility',
    's-resume': 'Professional Portfolio Resume',
    's-chatbot': 'AI Scholar Assistant'
  };

  document.getElementById('tab-title').textContent =
    titleMap[tabId] || 'Overview';

  await syncCurrentUserProfile();

  // Load the selected HTML view
  const viewName = tabId.replace('s-', '');
  const loaded = await loadView(
    `/views/student-${viewName}.html`,
    'student-tab-content'
  );

  if (!loaded) return;

  // Initialize the selected page
  switch (tabId) {

    case 's-overview':
      loadOverview();
      break;

    case 's-renewal':
      loadRenewalTracker();
      break;

    case 's-analytics':
      loadGPAAnalytics();
      break;

    case 's-budget':
      loadBudgetLedger();
      break;

    case 's-stipend':
      loadStipendTracker();
      break;

    case 's-appeals':
      loadAppealsTab();
      break;

    case 's-resume':
      loadResumeDetails();
      break;

    case 's-chatbot':
      if (typeof loadChatbot === 'function') {
        loadChatbot();
      } else {
        console.error('chatbot.js was not loaded.');
        showToast('AI Chatbot failed to load.', true);
      }
      break;
  }

  updateSidebarLocks();
}
// "Load Overview Tab"
async function loadOverview() {
  document.getElementById('ov-cgpa').textContent = currentUser.cgpa.toFixed(2);

  // Retention limit alerts
  const gpaSub = document.getElementById('ov-gpa-status');
  const sName = currentUser.scholarshipType || currentUser.scholarship_name || 'Star Scholar';
  let requiredGPA = 2.0;
  if (sName.includes('Star') || sName.includes('DOST') || sName.includes('Archer') || sName.includes('Animo')) {
    requiredGPA = 2.5;
  } else if (sName.includes('La Salle')) {
    requiredGPA = 2.0;
  }

  if (currentUser.cgpa >= requiredGPA) {
    gpaSub.innerHTML = `<i class="bx bx-check-circle"></i> Good Standing`;
    gpaSub.className = 'stat-sub text-success';
  } else {
    gpaSub.innerHTML = `<i class="bx bx-error-circle"></i> Retention Risk (Target: ${requiredGPA.toFixed(1)})`;
    gpaSub.className = 'stat-sub text-danger';
  }

  const renewalStatus = normalizeRenewalStatus(currentUser.renewalStatus);
  document.getElementById('ov-renewal-status').textContent = renewalStatus;
  const renewalSub = document.getElementById('ov-renewal-sub');
  // The renewal card should reflect the probation state clearly for the student.
  if (renewalStatus === 'Renewed') {
    renewalSub.textContent = 'AY 25-26 Term 3 Approved';
  } else if (renewalStatus === 'Processing') {
    renewalSub.textContent = 'Awaiting AdSO Review';
  } else if (renewalStatus === 'Probation') {
    renewalSub.textContent = 'Appeals Action Required';
  } else if (renewalStatus === 'Terminated') {
    renewalSub.textContent = 'Scholarship has been terminated.';
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

  if (renewalStatus === 'Renewed' || renewalStatus === 'Processing') {
    chkRenewal.className = 'checked';
    chkRenewal.innerHTML = `<i class="bx bx-check-circle"></i> Term 3 Renewal Submitted`;
  } else if (renewalStatus === 'Probation') {
    chkRenewal.className = 'warning';
    chkRenewal.innerHTML = `<i class="bx bx-error-circle"></i> Renewal Requires Appeals Review`;
  } else {
    chkRenewal.className = '';
    chkRenewal.innerHTML = `<i class="bx bx-circle"></i> Submit Term 3 EAF & Grades`;
  }

  if (currentUser.cgpa >= requiredGPA) {
    chkGpa.className = 'checked';
    chkGpa.innerHTML = `<i class="bx bx-check-circle"></i> CGPA Meets Requirement (${currentUser.cgpa.toFixed(2)} &ge; ${requiredGPA.toFixed(1)})`;
  } else {
    chkGpa.className = 'alert';
    chkGpa.innerHTML = `<i class="bx bx-error-circle"></i> Scholastic Risk: GPA Below Limit`;
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

  const stipendNextEl = document.getElementById('ov-stipend-next');
  const stipendSubEl = document.getElementById('ov-stipend-sub');
  const isNoStipend = sName.includes('La Salle') || sName.includes('Archer');

  if (isNoStipend) {
    if (timelineSnapshot) {
      timelineSnapshot.innerHTML = `<p class="no-notif">Stipend tracking is not available for this scholarship.</p>`;
    }
    if (stipendNextEl) stipendNextEl.textContent = 'N/A';
    if (stipendSubEl) {
      stipendSubEl.textContent = 'No Stipend Allowance';
      stipendSubEl.className = 'stat-sub text-muted';
    }
  } else {
    // Reset defaults if they were overwritten
    if (stipendNextEl) stipendNextEl.textContent = '--';
    if (stipendSubEl) {
      stipendSubEl.textContent = 'Pending FAO Dispatch';
      stipendSubEl.className = 'stat-sub';
    }

    if (currentUser.status === 'pending') {
      if (timelineSnapshot) {
        timelineSnapshot.innerHTML = `<p class="no-notif">Unlock stipend tracking once account is verified.</p>`;
      }
    } else {
      try {
        const res = await fetch(`/api/admin/stipends`);
        const data = await res.json();
        if (data.success && timelineSnapshot) {
          const match = data.stipends.find(s => s.studentId === currentUser.id);
          if (match && match.stipend) {
            const stip = match.stipend;
            let html = `<div class="overview-timeline-bars">`;
            stip.monthlyStatus.forEach(m => {
              const isDisbursed = m.status === 'Disbursed';
              html += `
                <div class="timeline-bar-block">
                  <span class="bar-tag">${stip.type === 'monthly' ? getTermMonthName(stip.term, m.month) : 'Term Grant'}</span>
                  <div class="bar-status-bar" style="background-color: ${isDisbursed ? 'var(--accent)' : 'var(--border-color)'}"></div>
                  <span class="bar-label">${m.status}</span>
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
}

// "Update Financial Overview"
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
  const ovBalanceEl = document.getElementById('ov-budget-balance');
  if (ovBalanceEl) ovBalanceEl.textContent = `₱${walletBalance.toLocaleString()}`;

  const fillIncome = document.getElementById('ov-fill-income');
  const fillExpense = document.getElementById('ov-fill-expense');

  if (fillIncome && fillExpense) {
    const maxVal = Math.max(totalIncome, totalExpense, 1);
    const incomePercent = Math.min((totalIncome / maxVal) * 100, 100);
    const expensePercent = Math.min((totalExpense / maxVal) * 100, 100);

    document.getElementById('ov-bar-income').textContent = `₱${totalIncome.toLocaleString()}`;
    fillIncome.style.width = `${incomePercent}%`;

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

// "Load Renewal Tracker Subtab"
async function loadRenewalTracker() {
  const eafInput = document.getElementById('ren-eaf');
  const gradesInput = document.getElementById('ren-grades');
  const renewalForm = document.getElementById('renewal-submit-form');
  const termsSelector = document.getElementById('terms-12-selector');

  // Input file text triggers
  if (eafInput) {
    eafInput.addEventListener('change', (e) => {
      document.getElementById('ren-eaf-name').textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    });
  }

  if (gradesInput) {
    gradesInput.addEventListener('change', (e) => {
      document.getElementById('ren-grades-name').textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    });
  }

  // Fetch updated profile terms if available
  try {
    const res = await fetch(`/api/users/profile/${currentUser.id}`);
    const resData = await res.json();
    if (resData.success && resData.user.terms) {
      currentUser.terms = resData.user.terms;
      if (resData.user.currentTermIndex) {
        activeSelectedTermIndex = parseInt(resData.user.currentTermIndex, 10);
      }
    }
  } catch (err) {
    console.error(err);
  }

  // Render 12-Term Staying Selector Grid
  render12TermsSelector(termsSelector);

  // Lock form if current term already submitted
  const currentTermObj = (currentUser.terms || []).find(t => (t.term_index || t.termIndex) === activeSelectedTermIndex);
  const lockedStatuses = ['Processing', 'Under Review', 'In Probation', 'Renewed', 'Reconsidered', 'Terminated'];
  const isAlreadySubmitted = currentTermObj && lockedStatuses.includes(currentTermObj.status);

  const submitBtn = document.getElementById('btn-submit-renewal');
  const existingLockBanner = document.getElementById('renewal-submitted-banner');

  if (existingLockBanner) existingLockBanner.remove();

  if (isAlreadySubmitted && renewalForm) {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Already Submitted';
    }
    const banner = document.createElement('div');
    banner.id = 'renewal-submitted-banner';
    banner.className = 'info-alert';
    banner.innerHTML = `<i class="bx bx-lock-alt"></i><p><strong>Submission locked.</strong> This term's renewal (Status: <strong>${currentTermObj.status}</strong>) has already been submitted. Your next submission window opens for the following academic term.</p>`;
    renewalForm.parentNode.insertBefore(banner, renewalForm);
    renewalForm.style.opacity = '0.5';
    renewalForm.style.pointerEvents = 'none';
  } else if (renewalForm) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Renewal Compliance';
    }
    renewalForm.style.opacity = '';
    renewalForm.style.pointerEvents = '';
  }
  if (renewalForm) {
    renewalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-renewal');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      const formData = new FormData();
      formData.append('studentId', currentUser.id);
      formData.append('termIndex', activeSelectedTermIndex);
      if (eafInput.files[0]) formData.append('eaf', eafInput.files[0]);
      if (gradesInput.files[0]) formData.append('grades', gradesInput.files[0]);

      try {
        const response = await fetch('/api/renewal/submit', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (data.success) {
          showToast(`Renewal submitted for Term ${activeSelectedTermIndex}! Status: Processing (Under Verification by AdSO)`);
          loadRenewalTracker();
        } else {
          showToast(data.message || 'Submission failed.', true);
        }
      } catch (err) {
        console.error(err);
        showToast('Connection error.', true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Renewal Compliance';
      }
    });
  }
}

// "Render 12-Term Selector Grid"
function render12TermsSelector(container) {
  if (!container) return;
  const termsList = currentUser.terms || [];
  let html = '';

  let sumTGPA = 0;
  let countTGPA = 0;

  const currentTermIndex = currentUser && currentUser.currentTermIndex ? parseInt(currentUser.currentTermIndex, 10) : 6;

  for (let i = 1; i <= 12; i++) {
    const termObj = termsList.find(t => (t.term_index || t.termIndex) === i) || {
      term_index: i,
      term_label: `Term ${i}`,
      status: i < currentTermIndex ? 'No Records' : i === currentTermIndex ? 'No Submission' : 'Not Scheduled',
      tgpa: 0.00,
      cgpa: 0.00
    };

    const sTgpa = parseFloat(termObj.tgpa) || 0;
    let sCgpa = parseFloat(termObj.cgpa) || 0;

    // The current academic term should not show final grades yet.
    // Renewal is based on the previous completed term, so current term TGPA/CGPA are intentionally hidden.
    const isCurrentTerm = i === currentTermIndex;
    const displayTgpa = isCurrentTerm ? 0 : sTgpa;
    const displayCgpa = isCurrentTerm ? 0 : sCgpa;

    if (displayTgpa > 0) {
      sumTGPA += displayTgpa;
      countTGPA++;
      if (displayCgpa <= 0) sCgpa = sumTGPA / countTGPA;
    }

    const statusPillClass = getStatusPillClass(termObj.status);
    const isActive = i === activeSelectedTermIndex ? 'active' : '';

    const tgpaDisplay = isCurrentTerm ? '--' : (displayTgpa > 0 ? displayTgpa.toFixed(2) : '--');
    const cgpaDisplay = isCurrentTerm ? '--' : (displayCgpa > 0 ? displayCgpa.toFixed(2) : '--');

    html += `
      <div class="term-pill ${isActive}" data-index="${i}">
        <span class="term-num">Term ${i}</span>
        <span class="term-name">${termObj.academic_year || 'AY'} T${termObj.term_number || (i % 3 === 0 ? 3 : i % 3)}</span>
        <div class="term-gpa-info">
          <small>T: <strong>${tgpaDisplay}</strong> | C: <strong>${cgpaDisplay}</strong></small>
        </div>
        <span class="status-pill ${statusPillClass}">${termObj.status}</span>
      </div>
    `;
  }
  container.innerHTML = html;

  const selectedTerm = termsList.find(t => (t.term_index || t.termIndex) === activeSelectedTermIndex) || {
    term_index: activeSelectedTermIndex,
    term_label: `Term ${activeSelectedTermIndex}`,
    status: 'Not Scheduled'
  };
  const titleEl = document.getElementById('selected-term-title');
  const badgeEl = document.getElementById('renewal-period-badge');
  if (titleEl) titleEl.textContent = selectedTerm ? `${selectedTerm.term_label} Compliance` : `Term ${activeSelectedTermIndex} Compliance`;
  if (badgeEl) {
    badgeEl.textContent = `Status: ${selectedTerm ? selectedTerm.status : 'Not Scheduled'}`;
    badgeEl.className = `card-badge ${getStatusPillClass(selectedTerm ? selectedTerm.status : '')}`;
  }

  // Add click handlers
  container.querySelectorAll('.term-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      activeSelectedTermIndex = parseInt(pill.getAttribute('data-index'));
      render12TermsSelector(container);

      const hiddenTermInput = document.getElementById('ren-term-index');
      if (hiddenTermInput) hiddenTermInput.value = activeSelectedTermIndex;

      const selTerm = termsList.find(t => (t.term_index || t.termIndex) === activeSelectedTermIndex);
      const titleEl = document.getElementById('selected-term-title');
      const badgeEl = document.getElementById('renewal-period-badge');

      if (titleEl) titleEl.textContent = selTerm ? `${selTerm.term_label} Compliance` : `Term ${activeSelectedTermIndex} Compliance`;
      if (badgeEl) {
        badgeEl.textContent = `Status: ${selTerm ? selTerm.status : 'Not Scheduled'}`;
        badgeEl.className = `card-badge ${getStatusPillClass(selTerm ? selTerm.status : '')}`;
      }

      const tgpaInput = document.getElementById('ren-tgpa');
      const cgpaInput = document.getElementById('ren-cgpa');
      if (selTerm && (selTerm.tgpa > 0 || selTerm.cgpa > 0)) {
        if (tgpaInput) tgpaInput.value = parseFloat(selTerm.tgpa).toFixed(3);
        if (cgpaInput) cgpaInput.value = parseFloat(selTerm.cgpa).toFixed(3);
      } else {
        if (tgpaInput) tgpaInput.value = '';
        if (cgpaInput) cgpaInput.value = '';
      }
    });
  });
}

// "Get Status Pill Class"
function getStatusPillClass(status) {
  switch (status) {
    case 'Not Scheduled': return 'pill-not-scheduled';
    case 'No Records': return 'pill-no-records';
    case 'No Submission': return 'pill-no-sub';
    case 'Processing': return 'pill-processing';
    case 'Invalid Submission': return 'pill-invalid';
    case 'Renewed': return 'pill-renewed';
    case 'In Probation': return 'pill-probation';
    case 'Reconsidered': return 'pill-reconsidered';
    case 'Terminated': return 'pill-terminated';
    default: return 'pill-not-scheduled';
  }
}

// "Load GPA Analytics Subtab"
async function loadGPAAnalytics() {
  const sName = currentUser.scholarshipType || currentUser.scholarship_name || 'Star Scholar';
  let threshold = 2.0;
  if (sName.includes('Star') || sName.includes('DOST') || sName.includes('Archer') || sName.includes('Animo')) {
    threshold = 2.5;
  } else if (sName.includes('La Salle')) {
    threshold = 2.0;
  }

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

    const currentCGPA = currentUser.cgpa;
    const completedUnits = parseInt(document.getElementById('calc-completed-units').value) || 110;
    const remainingUnits = parseInt(document.getElementById('calc-remaining-units').value) || 42;

    const totalTargetGradePoints = targetGPA * (completedUnits + remainingUnits);
    const currentGradePoints = currentCGPA * completedUnits;
    const requiredTotalPoints = totalTargetGradePoints - currentGradePoints;
    const requiredAvgGPA = requiredTotalPoints / remainingUnits;

    const resBox = document.getElementById('calc-result-box');
    const reqValue = document.getElementById('calc-required-gpa');
    const reqStatus = document.getElementById('calc-result-status');
    resBox.classList.remove('hidden');

    if (requiredAvgGPA > 4.0) {
      reqValue.textContent = requiredAvgGPA.toFixed(2);
      reqValue.className = 'metric-value text-danger';
      reqStatus.textContent = 'Mathematically impossible to reach target CGPA with remaining units.';
      reqStatus.className = 'status-sub text-danger';
    } else if (requiredAvgGPA <= 0.0) {
      reqValue.textContent = '0.00';
      reqValue.className = 'metric-value text-success';
      reqStatus.textContent = 'You have already secured your target CGPA!';
      reqStatus.className = 'status-sub text-success';
    } else {
      reqValue.textContent = requiredAvgGPA.toFixed(2);
      reqValue.className = 'metric-value text-success';
      reqStatus.textContent = `Required average TGPA across remaining ${remainingUnits} units.`;
      reqStatus.className = 'status-sub text-success';
    }
  });
}

// "Load Budget Ledger Subtab"
async function loadBudgetLedger() {
  const form = document.getElementById('add-expense-form');
  if (!form) return;

  // Fetch expense list
  try {
    const res = await fetch(`/api/budget/data/${currentUser.id}`);
    const data = await res.json();
    if (data.success) {
      renderTransactionsTable(data.data);
      renderBudgetCharts(data.data);
    }
  } catch (err) {
    console.error(err);
  }

  // Handle transaction creation
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('exp-type').value;
    const category = document.getElementById('exp-category').value;
    const amount = document.getElementById('exp-amount').value;
    const date = document.getElementById('exp-date').value;
    const description = document.getElementById('exp-desc').value;

    try {
      const res = await fetch('/api/budget/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUser.id, type, category, amount, date, description })
      });
      const resData = await res.json();
      if (resData.success) {
        showToast('Ledger entry added successfully!');
        form.reset();
        loadBudgetLedger();
      }
    } catch (err) {
      console.error(err);
      showToast('Error recording entry.', true);
    }
  });
}

// "Render Transactions Table"
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('budget-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No expenses or income entries recorded yet.</td></tr>`;
    return;
  }

  transactions.forEach(t => {
    const isIncome = t.type === 'income';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${t.date}</strong></td>
      <td><span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">${t.type.toUpperCase()}</span></td>
      <td style="text-transform: capitalize;">${t.category}</td>
      <td>${t.description || '-'}</td>
      <td class="${isIncome ? 'text-success' : 'text-danger'} font-weight-bold">
        ${isIncome ? '+' : '-'}₱${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// "Load Stipend Tracker Subtab"
async function loadStipendTracker() {
  const container = document.getElementById('stipend-timeline-container');
  if (!container) return;

  const lockOverlay = document.getElementById('stipend-lock');
  const sName = currentUser ? (currentUser.scholarshipType || currentUser.scholarship_name || '') : '';
  const isNoStipend = sName.includes('La Salle') || sName.includes('Archer');
  const shouldLock = (currentUser && (currentUser.status === 'pending' || currentUser.status === 'terminated')) || isNoStipend;

  if (lockOverlay) {
    lockOverlay.classList.toggle('hidden', !shouldLock);
    lockOverlay.style.display = shouldLock ? '' : 'none';
    const lockText = lockOverlay.querySelector('p');
    if (lockText) {
      if (isNoStipend) {
        lockText.textContent = 'Stipend tracking is not available for this scholarship program.';
      } else if (currentUser && currentUser.status === 'pending') {
        lockText.textContent = 'Please wait until your onboarding documentation is verified by the administrator.';
      } else if (currentUser && currentUser.status === 'terminated') {
        lockText.textContent = 'Scholarship has been terminated. Stipend tracker access is suspended.';
      }
    }
  }

  if (shouldLock) return;

  try {
    const res = await fetch(`/api/admin/stipends`);
    const data = await res.json();
    if (data.success) {
      const match = data.stipends.find(s => s.studentId === currentUser.id);
      if (match && match.stipend) {
        const stip = match.stipend;
        let html = '';
        stip.monthlyStatus.forEach(m => {
          const isDisbursed = m.status === 'Disbursed';
          html += `
            <div class="stipend-milestone ${isDisbursed ? 'disbursed' : 'pending'}">
              <div class="stipend-milestone-circle"></div>
              <div class="stipend-milestone-card">
                <div class="stipend-m-info">
                  <h4>${stip.type === 'monthly' ? `${getTermMonthName(stip.term, m.month)} Allowance` : 'Term Grant'}</h4>
                  <p>${isDisbursed ? `Disbursed on ${m.date || m.date_disbursed || ''} (Ref: ${m.reference_number || m.referenceNumber || '--'})` : 'Awaiting Release'}</p>
                </div>
                <div class="stipend-m-status">
                  <div class="stipend-m-val">₱${m.amount.toLocaleString()}</div>
                  <span class="badge ${isDisbursed ? 'badge-success' : 'badge-warning'}">${m.status}</span>
                </div>
              </div>
            </div>
          `;
        });
        container.innerHTML = html;
      } else {
        container.innerHTML = `<p class="no-notif">No active stipend schedule found for this academic term.</p>`;
      }
    }
  } catch (err) {
    console.error(err);
  }
}


// "Load Appeals Tab"
async function loadAppealsTab() {
  const lockOverlay = document.getElementById('appeals-lock');
  if (lockOverlay) {
    // Show lock when NOT in Probation, hide lock when in Probation (unlocked)
    const shouldLock = !currentUser || currentUser.renewalStatus !== 'Probation';
    lockOverlay.classList.toggle('hidden', !shouldLock);
    lockOverlay.style.display = shouldLock ? '' : 'none';
  }

  console.log('Appeals load', { status: currentUser ? currentUser.status : null, renewalStatus: currentUser ? currentUser.renewalStatus : null });

  const form = document.getElementById('appeal-submit-form');
  if (!form) return;

  const pendingAppealNoticeId = 'appeal-pending-message';
  let pendingAppealNotice = document.getElementById(pendingAppealNoticeId);
  if (!pendingAppealNotice) {
    pendingAppealNotice = document.createElement('div');
    pendingAppealNotice.id = pendingAppealNoticeId;
    pendingAppealNotice.className = 'info-alert warning hidden';
    pendingAppealNotice.style.marginBottom = '16px';
    form.parentNode.insertBefore(pendingAppealNotice, form);
  }

  const letterInput = document.getElementById('appeal-letter-file');
  const supportInput = document.getElementById('appeal-support-file');
  const letterName = document.getElementById('appeal-letter-name');
  const supportName = document.getElementById('appeal-support-name');

  if (letterInput && letterName) {
    letterInput.addEventListener('change', (e) => {
      letterName.textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    });
  }
  if (supportInput && supportName) {
    supportInput.addEventListener('change', (e) => {
      supportName.textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    });
  }

  const reasonInput = document.getElementById('appeal-reason');

  async function disableAppealFormIfPending() {
    if (!currentUser || !currentUser.id) return;
    try {
      const res = await fetch(`/api/appeal/student/${currentUser.id}`);
      const data = await res.json();
      const hasPendingAppeal = data.success && Array.isArray(data.appeals) && data.appeals.some(a => (a.status || a.Status || '').toString() === 'Pending');

      if (hasPendingAppeal) {
        pendingAppealNotice.textContent = 'You already have a pending appeal. Resubmission is not permitted until the admin decides on your existing appeal.';
        pendingAppealNotice.classList.remove('hidden');
        form.querySelectorAll('input, textarea, button').forEach(el => {
          if (!el.classList.contains('btn')) el.disabled = true;
          if (el.tagName.toLowerCase() === 'button') el.disabled = true;
        });
      } else {
        pendingAppealNotice.classList.add('hidden');
        form.querySelectorAll('input, textarea, button').forEach(el => { el.disabled = false; });
      }
    } catch (err) {
      console.error(err);
    }
  }

  await disableAppealFormIfPending();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = reasonInput ? reasonInput.value.trim() : '';
    if (!reason) {
      return showToast('Please provide a reason for your appeal.', true);
    }

    const formData = new FormData();
    formData.append('studentId', currentUser.id);
    formData.append('termLabel', 'A.Y. 2025 - 2026 Term 3');
    formData.append('reason', reason);
    if (letterInput && letterInput.files[0]) formData.append('letter', letterInput.files[0]);
    if (supportInput && supportInput.files[0]) formData.append('support', supportInput.files[0]);

    try {
      const res = await fetch('/api/appeal/submit', {
        method: 'POST',
        body: formData
      });
      const resData = await res.json();
      if (resData.success) {
        showToast('Appeals package submitted successfully!');
        form.reset();
        if (letterName) letterName.textContent = 'No file chosen';
        if (supportName) supportName.textContent = 'No file chosen';
        await disableAppealFormIfPending();
      } else {
        showToast('Failed to submit appeal package.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to submit appeal package.', true);
    }
  });
}

// "Load Resume Details"
function loadResumeDetails() {
  const printBtn = document.getElementById('btn-print-resume');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

// "Setup Notifications Handler"
async function setupNotifications() {
  const notifBtn = document.getElementById('notif-bell-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  const notifBadge = document.getElementById('notif-badge-count');
  const notifList = document.getElementById('notif-list-container');

  if (!notifBtn || !notifDropdown) return;

  notifBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('hidden');

    // Mark as read
    try {
      await fetch(`/api/notifications/read/${currentUser.id}`, { method: 'POST' });
      if (notifBadge) notifBadge.classList.add('hidden');
    } catch (err) {
      console.error(err);
    }
  });

  document.addEventListener('click', () => {
    if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
      notifDropdown.classList.add('hidden');
    }
  });

  // Fetch notifications
  try {
    const res = await fetch(`/api/notifications/${currentUser.id}`);
    const data = await res.json();
    if (data.success && data.notifications.length > 0) {
      let unreadCount = 0;
      let html = '';

      data.notifications.forEach(n => {
        const readFlag = n.is_read === true || n.read === true;
        if (!readFlag) unreadCount++;
        html += `
          <div class="notif-item ${readFlag ? '' : 'unread'}">
            <strong>${n.title}</strong>
            <p>${n.message}</p>
          </div>
        `;
      });

      if (notifList) notifList.innerHTML = html;

      if (unreadCount > 0 && notifBadge) {
        notifBadge.textContent = unreadCount;
        notifBadge.classList.remove('hidden');
      } else if (notifBadge) {
        notifBadge.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// "Show Toast Notification"
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  if (isError) {
    toast.classList.add('error');
    if (toastIcon) toastIcon.className = 'bx bx-error-circle toast-icon';
  } else {
    toast.classList.remove('error');
    if (toastIcon) toastIcon.className = 'bx bx-check-circle toast-icon';
  }

  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}
