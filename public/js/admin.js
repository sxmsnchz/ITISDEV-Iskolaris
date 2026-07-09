/* ==========================================================================
   ISKOLARIS FRONTEND CONTROLLER (ADMIN DESK MODULES)
   ========================================================================== */

async function launchAdminDashboard() {
  // Load Admin Layout frame
  const loaded = await loadView('/views/admin-dashboard.html', 'app');
  if (!loaded) return;

  // Set profile labels
  document.getElementById('admin-profile-name').textContent = currentUser.name;
  document.getElementById('admin-profile-role').textContent = currentUser.adminType + ' Workspace';

  const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('admin-avatar-initials').textContent = initials;

  // Sign out listener
  document.querySelector('.btn-logout').addEventListener('click', () => {
    localStorage.removeItem('iskolaris_user');
    currentUser = null;
    currentTab = '';
    showToast('Signed out successfully.');
    showAuth();
  });

  configureAdminRoleViews(currentUser.adminType);
}

function configureAdminRoleViews(role) {
  const navOnboard = document.getElementById('nav-a-onboarding');
  const navRenewals = document.getElementById('nav-a-renewals');
  const navAppeals = document.getElementById('nav-a-appeals');
  const navStipends = document.getElementById('nav-a-stipends');
  const badge = document.getElementById('admin-office-badge');

  if (role === 'AdSO') {
    badge.textContent = 'AdSO Office';
    badge.className = 'user-role-badge badge-admin';
    navStipends.classList.add('hidden');
    setupAdminNavigation('a-onboarding');
  } else if (role === 'FAO') {
    badge.textContent = 'Finance & Accounting';
    badge.className = 'user-role-badge badge-admin';
    navOnboard.classList.add('hidden');
    navRenewals.classList.add('hidden');
    navAppeals.classList.add('hidden');
    setupAdminNavigation('a-stipends');
  } else if (role === 'DOST') {
    badge.textContent = 'DOST Core Group';
    badge.className = 'user-role-badge bg-success-light text-success';
    navOnboard.classList.add('hidden');
    setupAdminNavigation('a-renewals');
  }
}

function setupAdminNavigation(defaultTab) {
  document.querySelectorAll('.admin-sidebar .sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = link.getAttribute('data-tab');
      switchAdminTab(tabName);
    });
  });

  switchAdminTab(defaultTab);
}

async function switchAdminTab(tabId) {
  currentTab = tabId;

  // Active status in side nav
  document.querySelectorAll('.admin-sidebar .sidebar-nav a').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Load appropriate header titles
  const titleMap = {
    'a-onboarding': 'Onboarding Inspection Workbench',
    'a-renewals': 'Termly Renewal Evaluation Queue',
    'a-appeals': 'Scholastic Reconsideration Appeals Desk',
    'a-stipends': 'Finance Stipend Ledgers',
    'a-reports': 'Scholastic Performance Analytics Reports'
  };
  document.getElementById('admin-tab-title').textContent = titleMap[tabId] || 'Workspace';

  // Fetch view components
  const viewName = tabId.replace('a-', '');
  const loaded = await loadView(`/views/admin-${viewName}.html`, 'admin-tab-content');
  if (!loaded) return;

  // Trigger data loaders
  loadActiveAdminTabData();
}

function loadActiveAdminTabData() {
  if (currentTab === 'a-onboarding') loadPendingOnboardings();
  else if (currentTab === 'a-renewals') loadRenewalsQueue();
  else if (currentTab === 'a-appeals') loadAppealsDesk();
  else if (currentTab === 'a-stipends') loadStipendLedger();
  else if (currentTab === 'a-reports') loadReportsData();
}

// ----------------------------------------------------
// 1. ONBOARDING DESK
// ----------------------------------------------------

async function loadPendingOnboardings() {
  const tableBody = document.getElementById('admin-onboarding-table');
  const msgEl = document.getElementById('no-onboarding-msg');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/pending');
    const data = await res.json();

    if (data.success && data.pending.length > 0) {
      tableBody.innerHTML = '';
      msgEl.classList.add('hidden');

      data.pending.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${user.id}</strong></td>
          <td>${user.name}</td>
          <td><span class="badge badge-success">${user.college}</span> / ${user.degree}</td>
          <td>${user.scholarshipType}</td>
          <td>
            <a href="/${user.awardLetter}" target="_blank" class="btn btn-outline btn-small">
              <i class="bx bx-show"></i> View Letter
            </a>
          </td>
          <td class="text-right">
            <div class="action-row">
              <button class="btn btn-success btn-small btn-approve" data-id="${user.id}"><i class="bx bx-check"></i> Approve</button>
              <button class="btn btn-danger btn-small btn-reject" data-id="${user.id}"><i class="bx bx-x"></i> Reject</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', () => handleOnboardingAction(btn.getAttribute('data-id'), 'approve'));
      });
      tableBody.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', () => handleOnboardingAction(btn.getAttribute('data-id'), 'reject'));
      });
    } else {
      tableBody.innerHTML = '';
      msgEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleOnboardingAction(studentId, action) {
  const url = action === 'approve' ? '/api/admin/approve-user' : '/api/admin/reject-user';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`User registration ${action === 'approve' ? 'APPROVED' : 'REJECTED'} successfully.`);
      loadPendingOnboardings();
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// 2. RENEWALS QUEUE
// ----------------------------------------------------

async function loadRenewalsQueue() {
  const tableBody = document.getElementById('admin-renewal-table');
  const msgEl = document.getElementById('no-renewals-msg');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/renewals');
    const data = await res.json();

    const pendingRenewals = data.success ? data.renewals.filter(r => r.status === 'Submitted' || r.status === 'Under Review') : [];

    if (pendingRenewals.length > 0) {
      tableBody.innerHTML = '';
      msgEl.classList.add('hidden');

      pendingRenewals.forEach(r => {
        let threshold = 2.0;
        if (r.scholarshipType.includes('Star')) threshold = 3.0;
        else if (r.scholarshipType.includes('DOST')) threshold = 2.5;

        const passesCGPA = r.cgpa >= threshold;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${r.studentName}</strong><br><small class="text-muted">${r.studentId}</small></td>
          <td>${r.scholarshipType}<br><small class="text-muted">${r.term}</small></td>
          <td>
            CGPA: <strong class="${passesCGPA ? 'text-success' : 'text-danger'}">${r.cgpa.toFixed(2)}</strong><br>
            TGPA: <strong>${r.tgpa.toFixed(2)}</strong>
          </td>
          <td>
            <a href="/${r.eafFile}" target="_blank" class="btn btn-outline btn-small margin-bottom block text-center"><i class="bx bx-file"></i> View EAF</a>
            <a href="/${r.gradesFile}" target="_blank" class="btn btn-outline btn-small block text-center"><i class="bx bx-bar-chart-alt"></i> View Grades</a>
          </td>
          <td>
            <div class="insight-badge ${passesCGPA ? 'good' : 'risk'}">
              <i class="bx bx-analyse"></i> ${passesCGPA ? 'Meets GPA Limits' : 'CGPA UNDER RETENTION LIMIT!'}<br>
              <small>Appeals Count: <strong>${r.appealCount}</strong></small>
            </div>
          </td>
          <td class="text-right">
            <div class="action-row margin-bottom">
              <button class="btn btn-success btn-small btn-renew" data-id="${r.id}"><i class="bx bx-check-double"></i> Renew</button>
              <button class="btn btn-outline btn-small text-warning btn-probation" data-id="${r.id}"><i class="bx bx-shield-x"></i> Probation</button>
            </div>
            <div class="action-row">
              <button class="btn btn-danger btn-small btn-terminate" data-id="${r.id}"><i class="bx bx-trash"></i> Terminate</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-renew').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Renewed'));
      });
      tableBody.querySelectorAll('.btn-probation').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Probation'));
      });
      tableBody.querySelectorAll('.btn-terminate').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Terminated'));
      });
    } else {
      tableBody.innerHTML = '';
      msgEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleRenewalAction(renewalId, action) {
  try {
    const res = await fetch('/api/admin/renewal-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renewalId, action })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Renewal action marked as ${action.toUpperCase()} successfully.`);
      loadRenewalsQueue();
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// 3. APPEALS DESK
// ----------------------------------------------------

async function loadAppealsDesk() {
  const tableBody = document.getElementById('admin-appeals-table');
  const msgEl = document.getElementById('no-appeals-msg');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/appeals');
    const data = await res.json();

    const pendingAppeals = data.success ? data.appeals.filter(a => a.status === 'Pending') : [];

    if (pendingAppeals.length > 0) {
      tableBody.innerHTML = '';
      msgEl.classList.add('hidden');

      pendingAppeals.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${a.studentName}</strong><br><small class="text-muted">${a.studentId}</small></td>
          <td>${a.scholarshipType}<br><small class="text-muted">${a.term}</small></td>
          <td>
            <div class="insight-badge" style="border-left-color: var(--warning)">
              <strong>Student Reason:</strong><br>
              "${a.reason}"
            </div>
          </td>
          <td>
            <a href="/${a.letterFile}" target="_blank" class="btn btn-outline btn-small margin-bottom block text-center"><i class="bx bx-file"></i> Appeal Letter</a>
            <a href="/${a.supportingFiles}" target="_blank" class="btn btn-outline btn-small block text-center"><i class="bx bx-paperclip"></i> Support Files</a>
          </td>
          <td class="text-right">
            <div class="action-row">
              <button class="btn btn-success btn-small btn-app-approve" data-id="${a.id}"><i class="bx bx-check"></i> Approve Appeal</button>
              <button class="btn btn-danger btn-small btn-app-reject" data-id="${a.id}"><i class="bx bx-x"></i> Reject Appeal</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-app-approve').forEach(btn => {
        btn.addEventListener('click', () => handleAppealAction(btn.getAttribute('data-id'), 'Approve'));
      });
      tableBody.querySelectorAll('.btn-app-reject').forEach(btn => {
        btn.addEventListener('click', () => handleAppealAction(btn.getAttribute('data-id'), 'Reject'));
      });
    } else {
      tableBody.innerHTML = '';
      msgEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleAppealAction(appealId, action) {
  try {
    const res = await fetch('/api/admin/appeal-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appealId, action })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Appeal has been ${action === 'Approve' ? 'APPROVED' : 'REJECTED'}.`);
      loadAppealsDesk();
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// 4. STIPEND LEDGER
// ----------------------------------------------------

async function loadStipendLedger() {
  const tableBody = document.getElementById('admin-stipend-table');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/stipends');
    const data = await res.json();

    if (data.success && data.stipends.length > 0) {
      tableBody.innerHTML = '';
      data.stipends.forEach(item => {
        const s = item.stipend;
        let timelineActionsHtml = '';

        if (s) {
          s.monthlyStatus.forEach(m => {
            const isDisbursed = m.status === 'Disbursed';
            timelineActionsHtml += `
              <button class="btn btn-small margin-bottom ${isDisbursed ? 'btn-success' : 'btn-outline text-warning btn-disburse'}" 
                data-stud-id="${item.studentId}" 
                data-term="${s.term}" 
                data-month="${m.month}" 
                data-amount="${m.amount}"
                ${isDisbursed ? 'disabled' : ''}>
                ${s.type === 'monthly' ? `Month ${m.month}` : 'Term Grant'}: 
                ${isDisbursed ? `₱${m.amount.toLocaleString()} (Sent)` : `₱${m.amount.toLocaleString()} (Disburse)`}
              </button>
            `;
          });
        } else {
          timelineActionsHtml = `<span class="text-muted">No active stipend record (Awaiting onboarding approval)</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${item.studentId}</strong></td>
          <td>${item.studentName}</td>
          <td>${item.scholarshipType}</td>
          <td><span class="badge ${item.renewalStatus === 'Processed' || item.renewalStatus === 'Renewed' ? 'badge-success' : (item.renewalStatus === 'Probation' ? 'badge-warning' : 'badge-danger')}">${item.renewalStatus}</span></td>
          <td>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${timelineActionsHtml}
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-disburse').forEach(btn => {
        btn.addEventListener('click', () => {
          const studentId = btn.getAttribute('data-stud-id');
          const term = btn.getAttribute('data-term');
          const monthIndex = btn.getAttribute('data-month');
          const amount = btn.getAttribute('data-amount');
          handleDisbursement(studentId, term, monthIndex, amount);
        });
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleDisbursement(studentId, term, monthIndex, amount) {
  try {
    const res = await fetch('/api/admin/disburse-stipend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, term, monthIndex, amount })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Stipend disbursed successfully.`);
      loadStipendLedger();
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// 5. REPORTS PANEL
// ----------------------------------------------------

async function loadReportsData() {
  if (!document.getElementById('rep-active-scholars')) return;

  try {
    const res = await fetch('/api/admin/stipends');
    const data = await res.json();
    if (data.success) {
      let activeCount = 0;
      let probationCount = 0;
      let totalDisbursed = 0;

      data.stipends.forEach(item => {
        if (item.renewalStatus === 'Processed' || item.renewalStatus === 'Renewed') activeCount++;
        else if (item.renewalStatus === 'Probation') probationCount++;

        if (item.stipend) {
          item.stipend.monthlyStatus.forEach(m => {
            if (m.status === 'Disbursed') totalDisbursed += m.amount;
          });
        }
      });

      document.getElementById('rep-active-scholars').textContent = activeCount;
      document.getElementById('rep-probation-scholars').textContent = probationCount;
      document.getElementById('rep-total-disbursed').textContent = `₱${totalDisbursed.toLocaleString()}`;
    }
  } catch (err) {
    console.error(err);
  }
}
