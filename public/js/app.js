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
  const initialsEl = document.getElementById('student-avatar-initials');
  const imgEl = document.getElementById('student-avatar-img');
  if (currentUser.profilePicture) {
    if (initialsEl) initialsEl.classList.add('hidden');
    if (imgEl) {
      imgEl.src = currentUser.profilePicture;
      imgEl.classList.remove('hidden');
    }
  } else {
    if (initialsEl) {
      initialsEl.textContent = initials;
      initialsEl.classList.remove('hidden');
    }
    if (imgEl) imgEl.classList.add('hidden');
  }

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

  // Bind sidebar profile box click
  const profileBox = document.getElementById('sidebar-profile-box');
  if (profileBox) {
    profileBox.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('s-profile');
    });
  }

  // Bind footer chatbot link click
  document.addEventListener('click', (e) => {
    const chatBtn = e.target.closest('#footer-askisko-btn');
    if (chatBtn) {
      e.preventDefault();
      switchTab('s-chatbot');
    }
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
    's-profile': 'DLSU Scholar Profile',
    's-renewal': 'Scholarship Renewal Submission',
    's-analytics': 'Scholastic Analytics Workspace',
    's-budget': 'Financial Ledger & Expenses',
    's-stipend': 'Disbursement Milestone Timeline',
    's-appeals': 'Appeals Facility',
    's-resume': 'Professional Portfolio Resume',
    's-chatbot': 'AskIsko'
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

    case 's-profile':
      await loadProfile();
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

  // Initialize status explorer guide
  initStatusExplorerGuide();
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

  // Populate mini KPI stats cards
  document.getElementById('kpi-cgpa').textContent = (currentUser.cgpa || 0.00).toFixed(2);
  document.getElementById('kpi-units').textContent = currentUser.unitsCompleted || 110;
  
  // Set scholarship status badge color/text
  const statusEl = document.getElementById('kpi-scholarship-status');
  const rawStatus = currentUser.status || 'Active';
  const statusText = rawStatus.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  statusEl.textContent = statusText;
  
  const statusLower = rawStatus.toLowerCase();
  if (statusLower === 'active' || statusLower === 'approved' || statusLower === 'renewed') {
    statusEl.className = 'kpi-val text-success';
  } else if (statusLower.includes('probation') || statusLower === 'pending' || statusLower === 'processing' || statusLower === 'submitted' || statusLower === 'under review') {
    statusEl.className = 'kpi-val text-warning';
  } else if (statusLower === 'terminated') {
    statusEl.className = 'kpi-val text-danger';
  } else {
    statusEl.className = 'kpi-val text-muted';
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

    // Toggle placeholders and results
    document.getElementById('calc-result-placeholder').classList.add('hidden');
    const resBox = document.getElementById('calc-result-box');
    const reqValue = document.getElementById('calc-required-gpa');
    const reqStatus = document.getElementById('calc-result-status');
    resBox.classList.remove('hidden');

    if (requiredAvgGPA > 4.0) {
      reqValue.textContent = requiredAvgGPA.toFixed(2);
      reqValue.className = 'result-number text-danger';
      reqStatus.textContent = 'Mathematically impossible to reach target CGPA with remaining units.';
      reqStatus.className = 'result-status text-danger';
    } else if (requiredAvgGPA <= 0.0) {
      reqValue.textContent = '0.00';
      reqValue.className = 'result-number text-success';
      reqStatus.textContent = 'You have already secured your target CGPA!';
      reqStatus.className = 'result-status text-success';
    } else {
      reqValue.textContent = requiredAvgGPA.toFixed(2);
      reqValue.className = 'result-number text-success';
      reqStatus.textContent = `Required average TGPA across remaining ${remainingUnits} units.`;
      reqStatus.className = 'result-status text-success';
    }
  });

  // Certificate Vault Logic
  const dropZone = document.getElementById('vault-drop-zone');
  const fileInput = document.getElementById('vault-file');
  const fileIndicator = document.getElementById('file-selected-indicator');
  const fileDisplay = document.getElementById('vault-file-display');
  const clearBtn = document.getElementById('btn-clear-file');
  const uploadForm = document.getElementById('vault-upload-form');

  if (dropZone && fileInput) {
    // Click triggers file open
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Drag-drop events
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        updateFileSelected();
      }
    });

    fileInput.addEventListener('change', updateFileSelected);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetFileInput();
    });
  }

  function updateFileSelected() {
    if (fileInput.files && fileInput.files.length > 0) {
      fileDisplay.textContent = fileInput.files[0].name;
      dropZone.classList.add('hidden');
      fileIndicator.classList.remove('hidden');
    }
  }

  function resetFileInput() {
    fileInput.value = '';
    fileDisplay.textContent = 'No file chosen';
    fileIndicator.classList.add('hidden');
    dropZone.classList.remove('hidden');
  }

  if (uploadForm) {
    // Bind form submission
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const termVal = document.getElementById('vault-term').value.trim();
      const file = fileInput.files[0];
      
      if (!file) {
        showToast('Please select a certificate file to upload.', true);
        return;
      }

      const uploadBtn = document.getElementById('btn-vault-upload');
      const originalBtnHTML = uploadBtn.innerHTML;
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin button-icon"></i> Uploading...';

      const formData = new FormData();
      formData.append('vaultFile', file);
      formData.append('studentId', currentUser.id);
      formData.append('term', termVal);

      try {
        const response = await fetch('/api/vault/upload', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        if (result.success) {
          showToast('Certificate successfully uploaded and archived!');
          uploadForm.reset();
          resetFileInput();
          loadVault();
        } else {
          showToast(result.message || 'Failed to upload certificate.', true);
        }
      } catch (err) {
        console.error(err);
        showToast('Error uploading certificate to vault.', true);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  // Populate terms dropdown with only terms without certificates
  async function updateTermDropdown(uploadedCerts) {
    const termSelect = document.getElementById('vault-term');
    if (!termSelect) return;

    try {
      const response = await fetch(`/api/renewal/status/${currentUser.id}`);
      const resData = await response.json();
      if (resData.success && resData.terms) {
        const currentTermIdx = currentUser && (currentUser.currentTermIndex || currentUser.current_term_index) 
          ? parseInt(currentUser.currentTermIndex || currentUser.current_term_index, 10) 
          : 6;

        const uploadedTerms = new Set(uploadedCerts.map(c => (c.term || c.termName || '').trim().toLowerCase()));
        const availableTerms = resData.terms.filter(t => {
          const tIdx = t.term_index || t.termIndex || 0;
          const termLabel = (t.term_label || t.termLabel || '').trim();
          return tIdx < currentTermIdx && termLabel && !uploadedTerms.has(termLabel.toLowerCase());
        });

        termSelect.innerHTML = '<option value="" disabled selected>Select Academic Term</option>';
        
        if (availableTerms.length === 0) {
          const opt = document.createElement('option');
          opt.value = "";
          opt.disabled = true;
          opt.textContent = "All terms have certificates uploaded";
          termSelect.appendChild(opt);
          
          const uploadBtn = document.getElementById('btn-vault-upload');
          if (uploadBtn) uploadBtn.disabled = true;
        } else {
          const uploadBtn = document.getElementById('btn-vault-upload');
          if (uploadBtn) uploadBtn.disabled = false;

          availableTerms.forEach(t => {
            const termLabel = t.term_label || t.termLabel;
            const opt = document.createElement('option');
            opt.value = termLabel;
            opt.textContent = termLabel;
            termSelect.appendChild(opt);
          });
        }
      }
    } catch (err) {
      console.error('Error populating term dropdown:', err);
    }
  }

  // Load dynamic vault certificates list
  async function loadVault() {
    const container = document.getElementById('vault-items-container');
    const countBadge = document.getElementById('vault-items-count');
    if (!container) return;

    try {
      const response = await fetch(`/api/vault/${currentUser.id}`);
      const resData = await response.json();
      if (resData.success && resData.data) {
        const items = resData.data;
        countBadge.textContent = `${items.length} Document${items.length === 1 ? '' : 's'}`;

        if (items.length === 0) {
          container.innerHTML = `
            <div class="vault-empty-state">
              <i class="bx bx-folder-open empty-icon"></i>
              <h5>No Certificates Found</h5>
              <p>Upload your academic honors certificates to start archiving them in your personal vault.</p>
            </div>
          `;
          updateTermDropdown([]);
          return;
        }

        container.innerHTML = items.map(item => {
          const isPdf = item.file_name ? item.file_name.toLowerCase().endsWith('.pdf') : (item.fileName ? item.fileName.toLowerCase().endsWith('.pdf') : true);
          const iconClass = isPdf ? 'bxs-file-pdf' : 'bxs-file-image';
          const typeClass = isPdf ? '' : 'image-type';
          const fileTitle = item.file_name || item.fileName;
          const fileSizeStr = item.file_size || item.fileSize || 'N/A';
          const fileTerm = item.term || 'N/A';
          const fPath = item.file_path || item.filePath;
          const id = item.id;

          return `
            <div class="vault-item">
              <div class="vault-item-icon ${typeClass}">
                <i class="bx ${iconClass}"></i>
              </div>
              <div class="vault-item-details">
                <h4 class="vault-item-title" title="${fileTitle}">${fileTitle}</h4>
                <div class="vault-item-meta">
                  <span>${fileTerm}</span> • <span>${fileSizeStr}</span>
                </div>
              </div>
              <div class="vault-item-actions">
                <a href="${fPath}" target="_blank" class="btn-action btn-view" title="View Document">
                  <i class="bx bx-show"></i>
                </a>
                <button type="button" class="btn-action btn-delete" data-id="${id}" title="Delete Document">
                  <i class="bx bx-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');

        updateTermDropdown(items);

        // Bind delete action listeners
        container.querySelectorAll('.btn-delete').forEach(btn => {
          btn.addEventListener('click', async () => {
            const certId = btn.getAttribute('data-id');
            if (confirm('Are you sure you want to permanently delete this certificate from your vault?')) {
              try {
                const deleteRes = await fetch(`/api/vault/${certId}`, {
                  method: 'DELETE'
                });
                const delData = await deleteRes.json();
                if (delData.success) {
                  showToast('Certificate deleted successfully.');
                  loadVault();
                } else {
                  showToast(delData.message || 'Failed to delete certificate.', true);
                }
              } catch (err) {
                console.error(err);
                showToast('Error deleting certificate.', true);
              }
            }
          });
        });
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="text-center text-muted padding">Failed to load certificates.</div>`;
    }
  }

  // Initial load of vault certificates
  loadVault();
}

// "Load Budget Ledger Subtab"
async function loadBudgetLedger() {
  const form = document.getElementById('add-expense-form') || document.getElementById('ledger-form');
  if (!form) return;

  // Set default date to today's date for better UX
  const dateInput = document.getElementById('exp-date') || document.getElementById('ledger-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Fetch expense list
  try {
    const res = await fetch(`/api/budget/data/${currentUser.id}`);
    const data = await res.json();
    if (data.success) {
      // Calculate budget statistics dynamically
      calculateBudgetSummary(data.data);
      
      // Render components
      renderTransactionsTable(data.data);
      renderBudgetCharts(data.data);
      
      // Sync with global overview stats (like runway indicator)
      updateFinancialOverview(data.data);
    }
  } catch (err) {
    console.error(err);
  }

  // Handle transaction creation
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    // Extract transaction type from radio group or select
    let type = 'expense';
    const typeRadio = document.querySelector('input[name="ledger-type"]:checked');
    if (typeRadio) {
      type = typeRadio.value;
    } else {
      const typeEl = document.getElementById('exp-type');
      if (typeEl) type = typeEl.value;
    }

    const categoryEl = document.getElementById('ledger-category') || document.getElementById('exp-category');
    const amountEl = document.getElementById('ledger-amount') || document.getElementById('exp-amount');
    const dateEl = document.getElementById('ledger-date') || document.getElementById('exp-date');
    const descEl = document.getElementById('ledger-desc') || document.getElementById('exp-desc');

    const category = categoryEl ? categoryEl.value : 'other';
    const amount = amountEl ? amountEl.value : '0';
    const date = dateEl ? dateEl.value : '';
    const description = descEl ? descEl.value : '';

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
        // Keep date defaulted to today after reset
        if (dateInput) {
          dateInput.value = new Date().toISOString().split('T')[0];
        }
        loadBudgetLedger();
      }
    } catch (err) {
      console.error(err);
      showToast('Error recording entry.', true);
    }
  };
}

// "Calculate Budget Summary for Stats Row"
function calculateBudgetSummary(transactions) {
  let totalIncome = 0;
  let totalExpenses = 0;
  const expenseDays = new Set();

  transactions.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpenses += amt;
      if (t.date) expenseDays.add(t.date);
    }
  });

  const balance = totalIncome - totalExpenses;
  const daysCount = expenseDays.size || 1;
  const dailyBurn = totalExpenses / daysCount;

  // Populate Balance
  const balEl = document.getElementById('budget-total-balance');
  if (balEl) {
    balEl.textContent = `₱${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Populate Balance Subtext
  const balSubEl = document.getElementById('budget-balance-sub');
  if (balSubEl) {
    if (balance < 0) {
      balSubEl.textContent = 'Negative balance';
      balSubEl.className = 'stat-sub text-danger';
    } else {
      balSubEl.textContent = 'Remaining funds';
      balSubEl.className = 'stat-sub text-success';
    }
  }

  // Populate Income
  const incEl = document.getElementById('budget-total-income');
  if (incEl) {
    incEl.textContent = `₱${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Populate Expenses
  const expEl = document.getElementById('budget-total-expenses');
  if (expEl) {
    expEl.textContent = `₱${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Populate Daily Burn Rate
  const burnEl = document.getElementById('budget-daily-burn');
  if (burnEl) {
    burnEl.textContent = `₱${dailyBurn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// "Render Transactions Table"
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('budget-table-body') || document.getElementById('ledger-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No expenses or income entries recorded yet.</td></tr>`;
    return;
  }

  const categoryIcons = {
    'food': '🍔 Food & Dining',
    'transportation': '🚗 Transportation',
    'dorm rent': '🏠 Dorm Rent',
    'school supplies': '📚 School Books',
    'other': '📦 Other / Misc'
  };

  transactions.forEach(t => {
    const isIncome = t.type === 'income';
    const row = document.createElement('tr');
    
    // Map categories to cleaner visuals
    const displayCategory = categoryIcons[t.category] || `📦 ${t.category}`;

    row.innerHTML = `
      <td class="text-center"><strong>${t.date}</strong></td>
      <td class="text-center">
        <span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">
          <i class="bx ${isIncome ? 'bx-plus-circle' : 'bx-minus-circle'}"></i> ${t.type.toUpperCase()}
        </span>
      </td>
      <td class="text-center" style="text-transform: capitalize;">${displayCategory}</td>
      <td class="text-center text-muted">${t.description || '-'}</td>
      <td class="text-center ${isIncome ? 'text-success' : 'text-danger'} font-weight-bold">
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
      const appeals = data.success && Array.isArray(data.appeals) ? data.appeals : [];
      const hasPendingAppeal = appeals.some(a => (a.status || a.Status || '').toString() === 'Pending');

      // Update status badge dynamically
      const statusBadge = document.getElementById('appeal-status-badge');
      if (statusBadge) {
        if (appeals.length === 0) {
          statusBadge.textContent = 'Status: Pending Submission';
          statusBadge.className = 'card-badge bg-warning';
        } else {
          const latest = appeals[0];
          const st = latest.status || latest.Status || 'Pending';
          if (st === 'Pending') {
            statusBadge.textContent = 'Status: Under Review';
            statusBadge.className = 'card-badge bg-warning';
          } else if (st === 'Approved') {
            statusBadge.textContent = 'Status: Reinstated';
            statusBadge.className = 'card-badge bg-success-light text-success';
          } else {
            statusBadge.textContent = 'Status: Terminated';
            statusBadge.className = 'card-badge bg-danger';
          }
        }
      }

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

// Resume Presets for different professions using Harvard bullet formatting (Action + Context + Result)
const RESUME_PRESETS = {
  software: {
    summary: "Result-driven Computer Science scholar at De La Salle University with a CGPA of 3.85/4.00. Proven expertise in full-stack software development, agile methodologies, and database optimization. Experienced in leading student organizations and building high-performance web applications.",
    orgs: "Executive Director, DLSU CCS Assembly (2025 - Present)\n• Managed a team of 15 officers to coordinate academic and social events for 1,200+ computer science students.\n• Designed and executed a peer mentoring program that increased student retention by 15% in introductory programming courses.\nCore Member, Google Developer Student Clubs DLSU (2024 - Present)\n• Collaborated with a team of 5 developers to build and deploy 3 community-focused web applications using Node.js and React.\n• Conducted 4 technical workshops on git version control and modern JavaScript, reaching over 200 student attendees.",
    projects: "Iskolaris Portal (2026)\n• Architected and developed a full-stack scholarship tracking and budgeting system using Node.js and Express, serving 500+ scholars.\n• Integrated interactive Chart.js analytics to visualize academic and financial progress, reducing budget tracking errors by 25%.\n• Leveraged Adobe PDF Extract API to automate document verification, speeding up application workflows by 40%.",
    skills: "Programming Languages: JavaScript, Python, Java, SQL, C++, HTML/CSS. Frameworks & Tools: Node.js, Express, React, Git, MySQL, Adobe PDF API."
  },
  data: {
    summary: "Detail-oriented Data Science student at De La Salle University with solid foundational knowledge in statistical analysis, machine learning algorithms, and data visualization. Highly proficient in Python programming, SQL querying, and engineering analytics pipelines to solve complex problems.",
    orgs: "Research Lead, DLSU Data Science Society (2025 - Present)\n• Supervised a division of 8 junior analysts working on local community data mapping initiatives.\n• Authored 2 predictive analytics reports on campus budget allocations, presenting insights to the university administration.\nExecutive Analyst, CCS Student Council (2024 - 2025)\n• Conducted census survey analysis representing 3,000+ student sentiments, generating insights that shaped policy decisions.\n• Built an automated Google Sheets analytical dashboard that saved council officers 10+ manual tracking hours per week.",
    projects: "Archers Grade Predictor (2025)\n• Engineered a machine learning model using Python (Scikit-Learn) to predict student GPA progression based on historical term metrics.\n• Achieved 92% model accuracy and deployed a lightweight web interface for active student profiling.\nDLSU Scholarship Allocation Analyzer (2024)\n• Conducted exploratory data analysis on a dataset of 5,000+ financial aid grants, identifying major distribution discrepancies.\n• Visualized allocations using Tableau dashboards to propose optimal fund utilization guidelines.",
    skills: "Languages: Python, R, SQL, MATLAB. Frameworks/Libraries: Pandas, NumPy, Scikit-Learn, Matplotlib, TensorFlow. Tools: Tableau, Excel, Git."
  },
  pm: {
    summary: "Strategic and user-focused Management Information Systems scholar at De La Salle University. Adept at bridging the gap between engineering teams and business stakeholders, managing product lifecycles, and formulating go-to-market strategies for digital products.",
    orgs: "Head of Product Strategy, DLSU Innovators Club (2025 - Present)\n• Directed product discovery workshops for 6 student startup ideas, helping refine user personas and value propositions.\n• Mentored 3 product teams through MVP validation, resulting in successful prototype pitches to angel investors.\nVice President of Operations, CCS Assembly (2024 - 2025)\n• Led logistics and cross-functional operations for the annual DLSU Hackathon, drawing in 400+ participants.\n• Established agile workflow guidelines using Jira and Notion, improving team task completion rate by 35%.",
    projects: "Iskolaris Portal Product Specs (2026)\n• Authored comprehensive Product Requirement Documents (PRDs) and mapped user stories for a scholarship manager portal.\n• Conducted user interviews with 50+ scholars, identifying critical pain points that influenced the features of the current UI.\nCampus Food Delivery Platform (2025)\n• Managed a cross-functional team of 4 developers and 2 designers to launch a local campus delivery service MVP.\n• Tracked key metrics (CAC, LTV, conversion rates), acquiring 300+ active users in the first month of launching.",
    skills: "Product Management: Product Discovery, Agile/Scrum, User Research, Wireframing. Technical: SQL, HTML/CSS, Git, Jira, Confluence, Figma."
  },
  it: {
    summary: "Technical and solution-oriented Information Technology student at De La Salle University. Specialized in system administration, network infrastructure maintenance, and cross-platform hardware/software integration. Dedicated to optimizing enterprise IT operations and end-user support services.",
    orgs: "IT Infrastructure Lead, DLSU Computer Society (2025 - Present)\n• Managed local network setups and server administration for 10+ campus events, ensuring 99.9% network uptime.\n• Audited and restructured active directories for student databases, reducing lookup latency by 20%.\nTechnical Support Specialist, CCS Assembly (2024 - 2025)\n• Resolved 150+ hardware and software issues for CCS students and faculty, achieving a 95% user satisfaction rate.\n• Conducted routine backup runs on student association servers, preventing data loss across key semesters.",
    projects: "Helpdesk Ticketing System (2025)\n• Developed and deployed a lightweight internal helpdesk ticketing tool using Express and MySQL, shortening support response time by 30%.\n• Integrated Slack notification hooks to instantly alert IT staff of urgent server or client outages.\nCampus Wi-Fi Heatmap Mapper (2024)\n• Conducted extensive signal strength scans across 5 campus buildings, mapping optimal router placements.\n• Drafted network topology upgrades presented to DLSU ITS, improving average Wi-Fi coverage by 15%.",
    skills: "Systems: Windows Server, Linux (Ubuntu/CentOS), Active Directory. Networking: TCP/IP, DNS, DHCP, VLANs, Wireshark. Hardware: Cisco Routers, LAN/WAN. Tools: Shell Scripting, MySQL."
  },
  security: {
    summary: "Security-focused Information Security major at De La Salle University with a solid understanding of vulnerability assessment, penetration testing, and incident response. Experienced in identifying security loopholes, configuring secure network architectures, and enforcing compliance frameworks.",
    orgs: "Security Analyst, DLSU Hackers Club (2025 - Present)\n• Conducted monthly vulnerability assessments and security scans on club-owned servers, patching 12 critical exploits.\n• Organized and led a campus-wide Capture the Flag (CTF) tournament for 150+ students, raising security awareness.\nCompliance Officer, CCS Student Council (2024 - 2025)\n• Assessed student data handling procedures to ensure compliance with the Philippine Data Privacy Act of 2012.\n• Designed and delivered a workshop series on basic cryptography and secure password hygiene to 300+ incoming freshmen.",
    projects: "Vulnerability Scanning Script (2025)\n• Developed a custom Python-based network vulnerability scanner that analyzes open ports and cross-references common vulnerability databases (CVEs).\n• Reduced routine scanning times by 40% compared to legacy scripts.\nSecure Chat Messenger (2024)\n• Built a secure, peer-to-peer messaging application using Node.js and Socket.io, integrating end-to-end AES-256 encryption.\n• Audited codebase against OWASP Top 10 vulnerabilities, fixing 3 potential injection vulnerabilities before deployment.",
    skills: "Security Fields: Vulnerability Scanning, Penetration Testing, Threat Analysis. Tools: Kali Linux, Nmap, Wireshark, Metasploit, Snort. Languages: Python, JavaScript, Bash, C++."
  },
  ai: {
    summary: "Innovative Computer Science scholar specializing in Artificial Intelligence and Machine Learning. Highly skilled in building predictive models, implementing natural language processing (NLP) pipelines, and deploying deep learning algorithms. Passionate about solving complex real-world challenges through data-driven automation.",
    orgs: "AI Research Fellow, DLSU Cognizance (2025 - Present)\n• Spearheaded a student research project on computer vision, training convolutional neural networks (CNNs) to detect plant diseases.\n• Co-authored a peer-reviewed conference paper on automated grading algorithms using NLP models.\nWorkshop Organizer, Google Developer Student Clubs (2024 - 2025)\n• Curated and hosted 5 hands-on AI workshops covering topics from regression basics to neural networks, training 200+ students.\n• Mentored 12 student teams during the annual AI hackathon, aiding in model optimization and deployment.",
    projects: "Real-Time Object Detector (2025)\n• Developed a real-time object detection and tracking pipeline using Python, OpenCV, and YOLOv8, running at 30+ FPS on edge hardware.\n• Achieved 94% precision score in tracking target items.\nCampus Sentiment Analyzer (2024)\n• Built an automated sentiment analysis pipeline using Python (NLTK, PyTorch) that processes DLSU student discussion posts.\n• Categorized student sentiment trends with 89% accuracy, helping Student Services address campus life pain points.",
    skills: "ML Frameworks: PyTorch, TensorFlow, Keras, Scikit-Learn. Languages: Python, R, C++, SQL. Libraries: OpenCV, NumPy, Pandas, HuggingFace."
  },
  db: {
    summary: "Detail-oriented Information Systems student with comprehensive experience in database design, performance tuning, and database administration. Proficient in optimizing complex SQL queries, managing backup/recovery protocols, and designing relational and non-relational database schemas.",
    orgs: "Lead Database Architect, DLSU IS Society (2025 - Present)\n• Maintained and optimized database servers for student registrations, handling over 2,000 active student accounts.\n• Wrote and executed schema migrations, minimizing system downtime to under 5 minutes during updates.\nSystems Analyst, CCS Assembly (2024 - 2025)\n• Audited organizational data structures and designed a unified ER diagram to consolidate 5 disparate spreadsheets into a single database.\n• Trained 10 student officers on writing efficient queries and generate automated reports.",
    projects: "Database Query Optimizer (2025)\n• Analyzed slow query logs for an academic portal database and added strategic indexes, reducing average API response times by 45%.\n• Rewrote 20+ inefficient nested subqueries into optimized joins, saving server CPU cycles.\nAutomated DB Backup System (2024)\n• Created a Cron-scheduled bash script that performs daily database backups, encrypts the dump, and uploads it to secure cloud storage.\n• Successfully tested recovery workflows, reducing disaster recovery RTO to under 15 minutes.",
    skills: "Databases: PostgreSQL, MySQL, MS SQL Server, MongoDB, Redis. Concepts: Query Tuning, Database Design (ERD), Replication, Sharding, Backup & Recovery."
  },
  devops: {
    summary: "Automation-focused Software Engineering student at De La Salle University. Specialized in CI/CD pipeline design, containerization, cloud infrastructure provisioning, and infrastructure-as-code. Passionate about enhancing deployment velocity and system reliability.",
    orgs: "DevOps Specialist, DLSU Computer Society (2025 - Present)\n• Designed and maintained CI/CD pipelines using GitHub Actions, reducing deployment time from 20 minutes to 3 minutes.\n• Containerized 5 student services using Docker, standardizing development and staging environments.\nInfrastructure Coordinator, Hackathon DLSU (2024 - 2025)\n• Provisioned scalable AWS cloud instances to handle peak traffic load of 5,000+ concurrent requests during hackathon submissions.\n• Set up real-time server monitoring using Prometheus and Grafana, identifying and resolving 2 traffic bottleneck events.",
    projects: "Infrastructure as Code AWS Template (2025)\n• Created standard Terraform blueprints to automate the provisioning of secure, load-balanced, multi-AZ VPC deployments on AWS.\n• Reduced manual infrastructure setup time by 90%.\nLog Aggregation Pipeline (2024)\n• Configured a centralized log monitoring pipeline using Elasticsearch, Logstash, and Kibana (ELK Stack) for student portals.\n• Automated security alerts for abnormal login spikes, shortening threat detection time to seconds.",
    skills: "Cloud: AWS (EC2, S3, RDS, IAM). DevOps: Docker, Kubernetes, Terraform, Ansible. CI/CD: GitHub Actions, Jenkins. Systems: Linux (Ubuntu), Bash, Git."
  }
};

// Parser to convert text lines into HBS formatting with aligned dates and lists
function parseHarvardBulletList(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let html = '';
  let inList = false;
  
  lines.forEach(line => {
    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
    if (isBullet) {
      if (!inList) {
        html += '<ul class="res-bullet-list">';
        inList = true;
      }
      const cleanText = line.replace(/^[•\-\*]\s*/, '');
      html += `<li>${cleanText}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      
      let dateMatch = line.match(/\(([^)]+)\)$/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const restOfLine = line.substring(0, line.lastIndexOf('(')).trim();
        const commaIdx = restOfLine.indexOf(',');
        if (commaIdx !== -1) {
          const role = restOfLine.substring(0, commaIdx).trim();
          const org = restOfLine.substring(commaIdx + 1).trim();
          html += `<div class="org-entry-header"><span>${org}</span><span class="res-date-out">${dateStr}</span></div><div class="org-entry-title">${role}</div>`;
        } else {
          html += `<div class="org-entry-header"><span>${restOfLine}</span><span class="res-date-out">${dateStr}</span></div>`;
        }
      } else {
        html += `<div class="org-entry-header"><span>${line}</span></div>`;
      }
    }
  });
  
  if (inList) {
    html += '</ul>';
  }
  return html;
}

// "Load Resume Details"
async function loadResumeDetails() {
  if (!currentUser) return;

  const nameInput = document.getElementById('res-name');
  const emailInput = document.getElementById('res-email');
  const phoneInput = document.getElementById('res-phone');
  const linkedinInput = document.getElementById('res-linkedin');
  const githubInput = document.getElementById('res-github');
  const summaryInput = document.getElementById('res-summary');
  const orgsInput = document.getElementById('res-orgs');
  const projectsInput = document.getElementById('res-projects');
  const skillsInput = document.getElementById('res-skills');

  if (!nameInput) return; // Prevent executing if DOM isn't fully ready

  // 1. Editor Tabs Toggle Navigation
  const tabButtons = document.querySelectorAll('.tab-nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-editor-tab');
      const pane = document.getElementById(`tab-pane-${tabId}`);
      if (pane) pane.classList.add('active');
    });
  });

  // 2. Fetch Vault Data for Dean's List certificates
  let vaultCerts = [];
  try {
    const vaultRes = await fetch(`/api/vault/${currentUser.id}`);
    const vaultResData = await vaultRes.json();
    if (vaultResData.success && Array.isArray(vaultResData.data)) {
      vaultCerts = vaultResData.data;
    }
  } catch (err) {
    console.error('Failed to load vault certs for resume', err);
  }

  // Populate educational sync tags
  document.getElementById('res-sync-degree').textContent = currentUser.degree;
  document.getElementById('res-sync-cgpa').textContent = `${currentUser.cgpa.toFixed(2)} / 4.00`;
  document.getElementById('res-sync-scholarship').textContent = currentUser.scholarshipType;
  
  document.getElementById('res-out-degree').textContent = currentUser.degree;
  document.getElementById('res-out-cgpa').textContent = currentUser.cgpa.toFixed(2);
  document.getElementById('res-out-scholarship').textContent = currentUser.scholarshipType;

  let latestAy = 'A.Y. 2025 - 2026';
  if (currentUser.terms && currentUser.terms.length > 0) {
    const currentTerm = currentUser.terms.find(t => t.term_index === currentUser.currentTermIndex);
    if (currentTerm) {
      latestAy = currentTerm.academic_year || latestAy;
    }
  }
  document.getElementById('res-out-ay').textContent = latestAy;

  // Render Dean's List certificates in form & preview sheet
  const certCountBadge = document.getElementById('res-sync-cert-count');
  const certListContainer = document.getElementById('res-sync-cert-list');
  const honorsPreviewContainer = document.getElementById('res-out-honors-container');
  const pipelineDetails = document.getElementById('resume-pipeline-details');

  if (vaultCerts.length > 0) {
    certCountBadge.textContent = `${vaultCerts.length} Verified`;
    certCountBadge.className = 'badge badge-success';
    pipelineDetails.textContent = `Connected ${currentUser.degree}, CGPA of ${currentUser.cgpa.toFixed(2)}, and ${vaultCerts.length} verified DL certificate(s).`;
    
    let listHtml = '';
    let honorsHtml = '';
    vaultCerts.forEach(cert => {
      const termName = cert.term || cert.termName || 'Unknown Term';
      listHtml += `
        <div class="vault-sync-item">
          <div class="vault-sync-item-info">
            <i class="bx bxs-file-pdf"></i>
            <span>${cert.fileName || cert.file_name}</span>
          </div>
          <span class="vault-sync-item-term">${termName}</span>
        </div>
      `;
      honorsHtml += `<li>• Dean's Lister - ${termName}</li>`;
    });
    certListContainer.innerHTML = listHtml;
    honorsPreviewContainer.innerHTML = honorsHtml;
  } else {
    certCountBadge.textContent = '0 Verified';
    certCountBadge.className = 'badge badge-warning';
    pipelineDetails.textContent = `Connected ${currentUser.degree} & CGPA of ${currentUser.cgpa.toFixed(2)}. No DL certificates found.`;
    certListContainer.innerHTML = `
      <p class="no-certs-text"><i class="bx bx-info-circle"></i> No uploaded DL certificates found for this student. Head to the Academic Analytics workspace to archive your honors.</p>
    `;
    honorsPreviewContainer.innerHTML = '';
  }

  // 3. Sync Settings Bar Toggles
  const fontSelect = document.getElementById('resume-font-family');
  const colorSelect = document.getElementById('resume-color-theme');
  const marginSelect = document.getElementById('resume-margin');
  const resumeSheet = document.getElementById('resume-sheet-output');

  function applyStylesFromSettings() {
    if (!resumeSheet) return;
    
    // Typography
    const font = fontSelect.value;
    if (font === 'times') {
      resumeSheet.style.fontFamily = "'Times New Roman', Times, serif";
    } else if (font === 'georgia') {
      resumeSheet.style.fontFamily = "Georgia, serif";
    } else if (font === 'arial') {
      resumeSheet.style.fontFamily = "Arial, sans-serif";
    }
    
    // Spacing
    const margin = marginSelect.value;
    if (margin === 'compact') {
      resumeSheet.style.padding = '2rem 1.5rem';
    } else if (margin === 'wide') {
      resumeSheet.style.padding = '4rem 3rem';
    } else {
      resumeSheet.style.padding = '3rem 2rem';
    }
    
    // Theme accent color
    const colorTheme = colorSelect.value;
    const titles = resumeSheet.querySelectorAll('.section-title-out');
    titles.forEach(t => {
      if (colorTheme === 'emerald') {
        t.style.color = '#006A4E';
        t.style.borderColor = '#006A4E';
      } else if (colorTheme === 'navy') {
        t.style.color = '#0F2C59';
        t.style.borderColor = '#0F2C59';
      } else {
        t.style.color = '#000000';
        t.style.borderColor = '#000000';
      }
    });
  }

  fontSelect.addEventListener('change', applyStylesFromSettings);
  colorSelect.addEventListener('change', applyStylesFromSettings);
  marginSelect.addEventListener('change', applyStylesFromSettings);

  // 4. Autosave and LocalStorage initialization
  function saveCurrentResumeData() {
    const activePresetBtn = document.querySelector('.btn-preset-pill.active[data-preset]');
    const activePreset = activePresetBtn ? activePresetBtn.getAttribute('data-preset') : '';
    
    const resumeData = {
      name: nameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      linkedin: linkedinInput.value,
      github: githubInput.value,
      summary: summaryInput.value,
      orgs: orgsInput.value,
      projects: projectsInput.value,
      skills: skillsInput.value,
      preset: activePreset
    };
    localStorage.setItem('iskolaris_resume_data', JSON.stringify(resumeData));
  }

  function renderResumeSheet() {
    const nameVal = nameInput.value.trim() || currentUser.name;
    const emailVal = emailInput.value.trim() || currentUser.email;
    const phoneVal = phoneInput.value.trim();
    const linkedinVal = linkedinInput.value.trim();
    const githubVal = githubInput.value.trim();
    const summaryVal = summaryInput.value.trim();
    const orgsVal = orgsInput.value.trim();
    const projectsVal = projectsInput.value.trim();
    const skillsVal = skillsInput.value.trim();
    
    // Name
    document.getElementById('res-out-name').textContent = nameVal;
    
    // Contact string
    let contactParts = [];
    if (emailVal) contactParts.push(`<span>${emailVal}</span>`);
    if (phoneVal) contactParts.push(`<span>${phoneVal}</span>`);
    if (linkedinVal) contactParts.push(`<span>${linkedinVal}</span>`);
    if (githubVal) contactParts.push(`<span>${githubVal}</span>`);
    document.getElementById('res-out-contact').innerHTML = contactParts.join(' &bull; ');
    
    // Summary
    document.getElementById('res-out-summary').textContent = summaryVal || 'Provide a professional summary...';
    
    // Involvements
    document.getElementById('res-out-orgs').innerHTML = orgsVal ? parseHarvardBulletList(orgsVal) : '<p class="text-muted">List your involvements...</p>';
    
    // Projects
    document.getElementById('res-out-projects').innerHTML = projectsVal ? parseHarvardBulletList(projectsVal) : '<p class="text-muted">List your technical projects...</p>';
    
    // Skills
    document.getElementById('res-out-skills').innerHTML = skillsVal ? skillsVal.replace(/\n/g, '<br>') : 'List your skills...';

    // Make sure styles from settings are active on any rerendered layout
    applyStylesFromSettings();
  }

  // Load existing data or pre-fill with Software default
  const savedDataRaw = localStorage.getItem('iskolaris_resume_data');
  const presetButtons = document.querySelectorAll('.btn-preset-pill[data-preset]');
  
  if (savedDataRaw) {
    try {
      const data = JSON.parse(savedDataRaw);
      nameInput.value = data.name || currentUser.name;
      emailInput.value = data.email || currentUser.email;
      phoneInput.value = data.phone || '';
      linkedinInput.value = data.linkedin || '';
      githubInput.value = data.github || '';
      summaryInput.value = data.summary || '';
      orgsInput.value = data.orgs || '';
      projectsInput.value = data.projects || '';
      skillsInput.value = data.skills || '';
      
      presetButtons.forEach(b => {
        if (b.getAttribute('data-preset') === data.preset) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    // Default prefill: Software Engineer HBS Spec
    nameInput.value = currentUser.name;
    emailInput.value = currentUser.email;
    phoneInput.value = '+63 917 123 4567';
    linkedinInput.value = `linkedin.com/in/${currentUser.name.toLowerCase().replace(/\s+/g, '-')}`;
    githubInput.value = `github.com/${currentUser.name.toLowerCase().replace(/\s+/g, '')}`;
    
    const defPreset = RESUME_PRESETS.software;
    summaryInput.value = defPreset.summary;
    orgsInput.value = defPreset.orgs;
    projectsInput.value = defPreset.projects;
    skillsInput.value = defPreset.skills;
    
    presetButtons.forEach(b => {
      if (b.getAttribute('data-preset') === 'software') {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    saveCurrentResumeData();
  }

  renderResumeSheet();

  // 5. Presets Action Binding
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pType = btn.getAttribute('data-preset');
      const pData = RESUME_PRESETS[pType];
      if (pData) {
        summaryInput.value = pData.summary;
        orgsInput.value = pData.orgs;
        projectsInput.value = pData.projects;
        skillsInput.value = pData.skills;
        
        saveCurrentResumeData();
        renderResumeSheet();
        showToast(`Switched template to ${btn.textContent}!`);
      }
    });
  });

  const clearBtn = document.getElementById('btn-clear-resume');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      phoneInput.value = '';
      linkedinInput.value = '';
      githubInput.value = '';
      summaryInput.value = '';
      orgsInput.value = '';
      projectsInput.value = '';
      skillsInput.value = '';
      
      presetButtons.forEach(b => b.classList.remove('active'));
      saveCurrentResumeData();
      renderResumeSheet();
      showToast('Resume custom fields cleared.');
    });
  }

  // 6. Typing Event Syncing
  const inputsToSync = [
    nameInput, emailInput, phoneInput, linkedinInput, githubInput,
    summaryInput, orgsInput, projectsInput, skillsInput
  ];
  inputsToSync.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        saveCurrentResumeData();
        renderResumeSheet();
        // Remove preset highlight if they edit manually
        if (input === summaryInput || input === orgsInput || input === projectsInput || input === skillsInput) {
          presetButtons.forEach(b => b.classList.remove('active'));
        }
      });
    }
  });

  // 7. PDF Compiler Generation using html2pdf.js
  const exportBtn = document.getElementById('btn-export-resume');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      if (typeof html2pdf === 'undefined') {
        showToast('Compiling system libraries, please wait...', true);
        return;
      }
      
      saveCurrentResumeData();
      
      const originalHTML = exportBtn.innerHTML;
      exportBtn.disabled = true;
      exportBtn.innerHTML = '<i class="bx bx-loader-alt animate-spin button-icon"></i> Compiling...';
      
      // Inject temporary formatting override
      resumeSheet.classList.add('pdf-print-mode');
      
      const opt = {
        margin:       0,
        filename:     `${nameInput.value.trim().replace(/\s+/g, '_')}_Harvard_Resume.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 3, 
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      try {
        showToast('Compiling Harvard-format PDF...');
        await html2pdf().set(opt).from(resumeSheet).save();
        showToast('PDF downloaded successfully!');
      } catch (err) {
        console.error(err);
        showToast('Failed to compile PDF.', true);
      } finally {
        resumeSheet.classList.remove('pdf-print-mode');
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalHTML;
      }
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

// "Initialize Status Explorer Guide"
function initStatusExplorerGuide() {
  const explorerContent = document.getElementById('status-explorer-content');
  const tabs = document.querySelectorAll('.explorer-tab-btn');
  if (!explorerContent) return;

  const explainerData = {
    'not-scheduled': {
      title: 'Not Scheduled',
      badgeClass: 'pill-not-scheduled',
      color: '#94a3b8',
      desc: 'This academic term is not yet open for evaluation or compliance uploads by AdSO/DOST coordinators.',
      todo: [
        'Wait for the current term to conclude.',
        'Keep an eye on announcements from the Office of Admissions and Scholarships (OAS).',
        'No immediate compliance actions are required at this stage.'
      ],
      proactive: 'Stay focused on your current courses and maintain your GPA. Upload windows open automatically as the term begins.'
    },
    'no-sub': {
      title: 'No Submission',
      badgeClass: 'pill-no-sub',
      color: '#f97316',
      desc: 'You haven\'t uploaded compliance documents for this term yet. Uploads are required to evaluate your status.',
      todo: [
        'Obtain your official Enrollment Assessment Form (EAF) for the current term.',
        'Obtain your official Archers Hub grades printout/grades sheet.',
        'Ensure both documents are clear, unencrypted PDFs, under 5MB.',
        'Submit them using the renewal form above.'
      ],
      proactive: 'Prompt submissions prevent stipend delays. Ensure your Student ID and Academic Term are clearly visible on the files.'
    },
    'processing': {
      title: 'Processing',
      badgeClass: 'pill-processing',
      color: '#3b82f6',
      desc: 'Your files have been successfully uploaded and are currently undergoing OCR scanning or coordinator verification.',
      todo: [
        'No action required. The system is scanning and extracting grades for verification.',
        'Your status will be evaluated against academic and scholarship guidelines.',
        'Once verification is complete, the status will advance automatically.'
      ],
      proactive: 'The Intelligent verification assistant checks structural markers and verifies grades. This typically takes a few hours.'
    },
    'invalid': {
      title: 'Invalid Submission',
      badgeClass: 'pill-invalid',
      color: '#ef4444',
      desc: 'Validation failed. The uploaded files did not meet standard requirements (e.g. illegible text, corrupt files, mismatching term, or invalid student ID).',
      todo: [
        'Read the warning notes listed on your status card.',
        'Verify that you uploaded the correct PDF files (not receipts, blurry images, or incorrect terms).',
        'Ensure the PDF is readable and not password-protected.',
        'Re-upload valid documents using the form above.'
      ],
      proactive: 'Ensure that you upload the original digital PDF copies instead of scanned screenshots for maximum accuracy.'
    },
    'renewed': {
      title: 'Renewed',
      badgeClass: 'pill-renewed',
      color: '#10b981',
      desc: 'Congratulations! You met all GPA limits and guidelines. Your scholarship has been officially renewed for this term.',
      todo: [
        'Check your stipend milestone timeline to track disbursement dates.',
        'Maintain your academic performance to ensure continued renewal next term.',
        'Enjoy your term! No further renewal compliance is needed for now.'
      ],
      proactive: 'This is the final active status. Your term stipend disbursement will be processed according to your cohort schedule.'
    },
    'probation': {
      title: 'In Probation',
      badgeClass: 'pill-probation',
      color: '#eab308',
      desc: 'Your SGPA/CGPA fell below the required scholarship threshold for this academic term.',
      todo: [
        'Download your official grades summary sheet.',
        'Prepare a formal letter of reconsideration explaining your academic performance.',
        'Submit your appeal request along with supporting documents through the Appeals tab.',
        'Regularly monitor your appeal status for updates.'
      ],
      proactive: 'Probation is a temporary standing. AdSO coordinators will review your explanation letter and decide on reconsideration.'
    },
    'reconsidered': {
      title: 'Reconsidered',
      badgeClass: 'pill-reconsidered',
      color: '#a855f7',
      desc: 'Your academic appeal has been reviewed and approved by the office. Your scholarship stands active under strict conditions.',
      todo: [
        'Review the conditional requirements set by your coordinator in the notes.',
        'Work closely with your academic advisor to improve your GPA.',
        'Ensure you meet the target grade limits this term to avoid termination.'
      ],
      proactive: 'A reconsidered status is an academic safety net. You are required to meet all target limits in the next evaluation.'
    },
    'terminated': {
      title: 'Terminated',
      badgeClass: 'pill-terminated',
      color: '#1e293b',
      desc: 'Your scholarship has been discontinued due to failure to meet academic limits or your appeal was denied.',
      todo: [
        'Coordinate with the OAS office for final ledger clearances.',
        'Consult student services for alternative financial aid programs if needed.',
        'Any pending stipend disbursements are cancelled.'
      ],
      proactive: 'This is an end-state. You can contact the AdSO office directly for inquiries regarding re-instatement processes.'
    }
  };

  const defaultHtml = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; text-align: center; color: var(--text-muted); padding: 2rem; font-family: 'Inter', sans-serif;">
      <i class="bx bx-pointer" style="font-size: 3.5rem; color: var(--primary); margin-bottom: 1rem; opacity: 0.8; animation: bouncePointer 2s infinite ease-in-out;"></i>
      <h4 style="margin: 0; font-weight: 700; color: var(--text-dark); font-size: 1.15rem;">Status Explorer Guide</h4>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; max-width: 320px; line-height: 1.6;">Click on any status pill in the sidebar to explore its requirements, verification checks, and proactive action items.</p>
    </div>
  `;

  // Render default screen
  explorerContent.innerHTML = defaultHtml;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Toggle active states
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const statusKey = tab.getAttribute('data-status');
      const data = explainerData[statusKey];

      if (data) {
        // Render content dynamically with color transitions
        explorerContent.innerHTML = `
          <div class="explorer-content-card" style="border-left-color: ${data.color}; background-color: ${data.color}03; opacity: 0; transform: translateY(5px); transition: all 0.3s ease;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
              <h4 style="margin: 0; font-size: 1.15rem; color: var(--text-dark); font-weight: 700; display: flex; align-items: center; gap: 8px;">
                Status Details: <span class="status-pill ${data.badgeClass}" style="margin: 0; font-size: 0.85rem; padding: 0.3rem 0.75rem;">${data.title}</span>
              </h4>
              <i class="bx bx-info-circle" style="color: ${data.color}; font-size: 1.5rem;"></i>
            </div>
            
            <p style="font-size: 0.92rem; color: var(--text-dark); line-height: 1.6; font-weight: 500; margin: 0 0 1rem 0;">${data.desc}</p>
            
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 1.15rem; margin-bottom: 1rem;">
              <h5 style="margin: 0 0 0.6rem 0; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                <i class="bx bx-list-check" style="font-size: 1.1rem; color: ${data.color}"></i> Action Checklist
              </h5>
              <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-main); line-height: 1.6;">
                ${data.todo.map(item => `<li style="margin-bottom: 0.4rem;">${item}</li>`).join('')}
              </ul>
            </div>
            
            <div style="background: ${data.color}10; border: 1px solid ${data.color}25; border-radius: 8px; padding: 1rem; display: flex; gap: 10px; align-items: flex-start;">
              <i class="bx bx-bulb" style="font-size: 1.3rem; color: ${data.color}; margin-top: 2px;"></i>
              <p style="margin: 0; font-size: 0.8rem; line-height: 1.5; color: var(--text-main);"><strong style="color: var(--text-dark);">Pro-tip:</strong> ${data.proactive}</p>
            </div>
          </div>
        `;

        // Trigger animation reflow
        setTimeout(() => {
          const card = explorerContent.querySelector('.explorer-content-card');
          if (card) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }
        }, 50);
      }
    });
  });
}

// Scholarship Explainers Config for the 5 program types
const SCHOLARSHIP_EXPLAINERS = {
  'Star Scholars Program': {
    intent: "The Star Scholars Program is a premium merit-based scholarship awarded to the most outstanding high school graduates nationwide who exhibit exceptional academic excellence and leadership qualities. This prestigious scholarship covers full tuition, laboratory, and miscellaneous fees to support the scholar's higher education at DLSU.",
    benefits: [
      "100% waiver of tuition, laboratory, and miscellaneous fees.",
      "Monthly living stipend of ₱10,000.",
      "Academic book allowance of ₱5,000 per term.",
      "Access to exclusive leadership development seminars and mentoring."
    ],
    retention: [
      "Maintain a Cumulative Grade Point Average (CGPA) of at least 3.20.",
      "No grade lower than 2.0 in any subject.",
      "Maintain a full academic load (minimum of 12 units) each term.",
      "No disciplinary violations of any kind."
    ],
    renewalProc: "Submit scanned copy of Enrollment Assessment Form (EAF) and Grade Report for the completed term via the Iskolaris Renewal portal.",
    docs: [
      "Electronic Enrollment Assessment Form (EAF) for the incoming term.",
      "PDF Grade Report signed by the college dean/registrar."
    ]
  },
  'Archer Achiever Scholarship': {
    intent: "The Archer Achiever Scholarship is a highly selective merit-based grant awarded to top-performing freshman applicants who rank in the top percentile of the DLSU College Admission Test. It aims to foster academic excellence by providing comprehensive support to students as they pursue their degrees at the university.",
    benefits: [
      "100% tuition fee discount.",
      "Monthly stipend of ₱8,000.",
      "Laptop/Device subsidy during the first year.",
      "Early enrollment privileges."
    ],
    retention: [
      "Maintain a Cumulative GPA of at least 3.00.",
      "No grade lower than 1.5 in any course.",
      "Enroll in a full term load as defined by the curriculum.",
      "Comply with all student handbook guidelines."
    ],
    renewalProc: "Upload the Enrollment Assessment Form (EAF) and Official Class Grades through the online portal at the end of each academic year.",
    docs: [
      "PDF of Enrollment Assessment Form (EAF).",
      "Copy of certified grades for the completed year.",
      "Brief self-evaluation essay."
    ]
  },
  'Animo Grants Scholarship Program': {
    intent: "The Animo Grants Scholarship Program is a financial-based grant created to support deserving students from low-income families who wish to pursue a high-quality DLSU education. The selection is based on the applicant's financial need coupled with a strong recommendation from their high school.",
    benefits: [
      "Partial to full tuition and fees waiver (ranging from 50% to 100% based on financial status).",
      "Monthly allowance of ₱4,000.",
      "Meal voucher subsidies at the university canteen.",
      "Peer tutoring and counseling support."
    ],
    retention: [
      "Maintain a Cumulative GPA of at least 2.50.",
      "No failing grades (no 0.0 or withdrawal without valid cause).",
      "Render at least 20 hours of student assistant service per term.",
      "Attend quarterly financial literacy workshops."
    ],
    renewalProc: "Apply online at the end of each term, uploading proof of enrollment and latest grades.",
    docs: [
      "Enrollment Assessment Form (EAF) for the next term.",
      "Term grade report.",
      "Updated Income Tax Return (ITR) or parents' proof of income (annually)."
    ]
  },
  'St. La Salle Financial Assistance Grant': {
    intent: "The St. La Salle Financial Assistance Grant is a financial-based program dedicated to supporting undergraduate students who demonstrate high financial need but possess strong academic potential. It covers tuition and fees to ensure that financial obstacles do not hinder the student's pursuit of excellence.",
    benefits: [
      "100% or partial waiver of tuition and fees.",
      "Monthly stipend of ₱5,000.",
      "Exemption from laboratory and special class fees.",
      "Direct inclusion in the university's work-study program."
    ],
    retention: [
      "Maintain a Cumulative GPA of at least 2.50.",
      "No failing grade in any course.",
      "Complete 30 hours of university service per term.",
      "File renewal requests within the designated university deadline."
    ],
    renewalProc: "Submit renewal documents online through the Iskolaris Scholarship Renewal page during the enrollment period of the next term.",
    docs: [
      "Copy of current Enrollment Assessment Form (EAF).",
      "Certified copy of previous term grades.",
      "Signed statement of continued financial need."
    ]
  },
  'DOST-SEI Undergraduate Scholarship': {
    intent: "The DOST-SEI Undergraduate Scholarship is a national merit-based scholarship program administered in partnership with the Department of Science and Technology. It targets talented young Filipinos who are pursuing specialized degrees in science, technology, engineering, and mathematics.",
    benefits: [
      "Tuition subsidy of up to ₱40,000 per academic year.",
      "Monthly stipend of ₱8,000.",
      "Book allowance of ₱10,000 per year.",
      "Group health insurance and graduation/thesis allowance."
    ],
    retention: [
      "Maintain a Cumulative GPA of at least 2.75.",
      "No grade lower than 2.0 in major science/math courses.",
      "Remain enrolled in a DOST-priority STEM program.",
      "Sign a service agreement contract to work in the country after graduation for a period equal to the scholarship duration."
    ],
    renewalProc: "Submit the required documents to the DLSU Science Foundation or DOST representative on campus at the start of each semester.",
    docs: [
      "Certified true copy of grades.",
      "Enrollment Assessment Form (EAF).",
      "Copy of the DOST Scholar ID card."
    ]
  }
};

function clientNormalizeScholarshipName(name) {
  if (!name) return 'Star Scholars Program';
  const lower = name.toLowerCase();
  if (lower.includes('star')) return 'Star Scholars Program';
  if (lower.includes('animo')) return 'Animo Grants Scholarship Program';
  if (lower.includes('dost')) return 'DOST-SEI Undergraduate Scholarship';
  if (lower.includes('archer')) return 'Archer Achiever Scholarship';
  if (lower.includes('la salle') || lower.includes('salle')) return 'St. La Salle Financial Assistance Grant';
  return name;
}

async function loadProfile() {
  await syncCurrentUserProfile();
  
  // Render user basic profile details
  document.getElementById('prof-hero-name').textContent = currentUser.name;
  document.getElementById('prof-hero-scholarship-text').textContent = currentUser.scholarshipType;
  document.getElementById('prof-hero-sub-text').textContent = currentUser.degree || 'BS Information Technology';
  
  document.getElementById('prof-student-id').textContent = currentUser.id;
  document.getElementById('prof-email').textContent = currentUser.email;
  document.getElementById('prof-college').textContent = currentUser.college || 'CCS';
  document.getElementById('prof-degree').textContent = currentUser.degree || 'BSIT';
  document.getElementById('prof-batch').textContent = currentUser.batchYear || '124';
  document.getElementById('prof-verification').textContent = currentUser.status === 'approved' ? 'Verified & Approved' : 'Verification Pending';
  
  const cgpaValue = typeof currentUser.cgpa === 'number' ? currentUser.cgpa : parseFloat(currentUser.cgpa) || 0.0;
  const tgpaValue = typeof currentUser.tgpa === 'number' ? currentUser.tgpa : parseFloat(currentUser.tgpa) || 0.0;
  
  document.getElementById('prof-cgpa').textContent = cgpaValue.toFixed(3);
  document.getElementById('prof-tgpa').textContent = tgpaValue.toFixed(3);
  
  // Fill hero quick-stats
  const heroC = document.getElementById('prof-cgpa-hero');
  const heroT = document.getElementById('prof-tgpa-hero');
  if (heroC) heroC.textContent = cgpaValue.toFixed(3);
  if (heroT) heroT.textContent = tgpaValue.toFixed(3);
  
  const minCgpa = currentUser.minCgpaReq || 2.0;
  document.getElementById('prof-min-cgpa').textContent = minCgpa.toFixed(2);
  
  const gapEl = document.getElementById('prof-gpa-gap');
  const gap = cgpaValue - minCgpa;
  if (gap >= 0) {
    gapEl.textContent = `GPA Requirement Met (+${gap.toFixed(3)})`;
    gapEl.className = 'text-success';
  } else {
    gapEl.textContent = `GPA Deficit (${gap.toFixed(3)})`;
    gapEl.className = 'text-danger';
  }
  
  const fillWidth = Math.min(100, Math.max(0, (cgpaValue / 4.0) * 100));
  const fillEl = document.getElementById('prof-gpa-fill');
  fillEl.style.width = `${fillWidth}%`;
  fillEl.className = `gpa-progress-fill ${gap >= 0 ? 'bg-success' : 'bg-danger'}`;
  
  // Set up avatars
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  // Update main profile picture
  const largeInitialsEl = document.getElementById('profile-avatar-large-initials');
  const largeImgEl = document.getElementById('profile-avatar-large-img');
  
  // Update sidebar picture
  const sidebarInitialsEl = document.getElementById('student-avatar-initials');
  const sidebarImgEl = document.getElementById('student-avatar-img');
  
  const updateAvatars = (path) => {
    if (path) {
      if (largeInitialsEl) largeInitialsEl.classList.add('hidden');
      if (largeImgEl) {
        largeImgEl.src = path;
        largeImgEl.classList.remove('hidden');
      }
      if (sidebarInitialsEl) sidebarInitialsEl.classList.add('hidden');
      if (sidebarImgEl) {
        sidebarImgEl.src = path;
        sidebarImgEl.classList.remove('hidden');
      }
    } else {
      if (largeInitialsEl) {
        largeInitialsEl.textContent = initials;
        largeInitialsEl.classList.remove('hidden');
      }
      if (largeImgEl) largeImgEl.classList.add('hidden');
      
      if (sidebarInitialsEl) {
        sidebarInitialsEl.textContent = initials;
        sidebarInitialsEl.classList.remove('hidden');
      }
      if (sidebarImgEl) sidebarImgEl.classList.add('hidden');
    }
  };
  
  updateAvatars(currentUser.profilePicture);

  // Hook file upload trigger
  const fileInput = document.getElementById('profile-picture-upload');
  if (fileInput) {
    // Remove duplicate listeners if re-rendered
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    newFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('studentId', currentUser.id);
      formData.append('profilePicture', file);
      
      try {
        showToast('Uploading profile picture...');
        const response = await fetch('/api/users/upload-profile-picture', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        
        if (data.success) {
          currentUser.profilePicture = data.profilePicture;
          localStorage.setItem('iskolaris_user', JSON.stringify(currentUser));
          updateAvatars(data.profilePicture);
          showToast('Profile picture updated successfully!');
        } else {
          showToast(data.message || 'Upload failed.', true);
        }
      } catch (err) {
        console.error('Avatar upload failed:', err);
        showToast('Connection error during upload.', true);
      }
    });
  }

  // Populate dynamic explainers
  const normName = clientNormalizeScholarshipName(currentUser.scholarshipType);
  const exp = SCHOLARSHIP_EXPLAINERS[normName] || SCHOLARSHIP_EXPLAINERS['Star Scholars Program'];
  
  document.getElementById('exp-intent').innerHTML = `<p>${exp.intent}</p>`;
  
  document.getElementById('exp-benefits').innerHTML = `
    <ul class="explainer-list">
      ${exp.benefits.map(b => `<li><i class="bx bx-check-circle explainer-list-icon"></i> ${b}</li>`).join('')}
    </ul>
  `;
  
  document.getElementById('exp-retention').innerHTML = `
    <ul class="explainer-list">
      ${exp.retention.map(r => `<li><i class="bx bx-check-shield explainer-list-icon text-warning"></i> ${r}</li>`).join('')}
    </ul>
  `;
  
  document.getElementById('exp-renewal-proc').innerHTML = `<p>${exp.renewalProc}</p>`;
  
  document.getElementById('exp-docs').innerHTML = `
    <ul class="explainer-list">
      ${exp.docs.map(d => `<li><i class="bx bx-file explainer-list-icon text-info"></i> ${d}</li>`).join('')}
    </ul>
  `;

  // Bind accordion interactions
  const triggers = document.querySelectorAll('.accordion-trigger');
  triggers.forEach(trig => {
    trig.addEventListener('click', () => {
      const parent = trig.parentElement;
      const isOpen = parent.classList.contains('open');
      
      // Close other accordions
      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('open');
      });
      
      if (!isOpen) {
        parent.classList.add('open');
      }
    });
  });
}


