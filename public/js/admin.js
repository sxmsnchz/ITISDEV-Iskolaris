// Iskolaris Frontend Controller (Admin Desk Modules)

// "Launch Admin Dashboard"
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

// "Configure Admin Role Views"
function configureAdminRoleViews(role) {
  const navOnboard = document.getElementById('nav-a-onboarding');
  const navRenewals = document.getElementById('nav-a-renewals');
  const navAppeals = document.getElementById('nav-a-appeals');
  const navStipends = document.getElementById('nav-a-stipends');
  const navReports = document.getElementById('nav-a-reports');
  const badge = document.getElementById('admin-office-badge');

  if (role === 'AdSO') {
    badge.textContent = 'AdSO Office (Onboarding, Renewals, Appeals)';
    badge.className = 'user-role-badge badge-admin';
    if (navStipends) navStipends.classList.add('hidden');
    if (navReports) navReports.classList.add('hidden');
    setupAdminNavigation('a-onboarding');
  } else if (role === 'DOST') {
    badge.textContent = 'DOST Core Group (Renewals, Appeals, Stipends)';
    badge.className = 'user-role-badge bg-success-light text-success';
    if (navOnboard) navOnboard.classList.add('hidden');
    if (navReports) navReports.classList.add('hidden');
    setupAdminNavigation('a-renewals');
  } else if (role === 'FAO') {
    badge.textContent = 'Finance & Accounting Office (Stipends & Reports)';
    badge.className = 'user-role-badge badge-admin';
    if (navOnboard) navOnboard.classList.add('hidden');
    if (navRenewals) navRenewals.classList.add('hidden');
    if (navAppeals) navAppeals.classList.add('hidden');
    setupAdminNavigation('a-stipends');
  }
}

// "Setup Admin Navigation"
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

// "Switch Admin Tab"
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

// "Load Active Admin Tab Data"
function loadActiveAdminTabData() {
  if (currentTab === 'a-onboarding') loadPendingOnboardings();
  else if (currentTab === 'a-renewals') loadRenewalsQueue();
  else if (currentTab === 'a-appeals') loadAppealsDesk();
  else if (currentTab === 'a-stipends') loadStipendLedger();
  else if (currentTab === 'a-reports') loadReportsData();
}

// "Load Pending Onboardings"
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

// "Handle Onboarding Action"
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

// "Load Renewals Queue"
async function loadRenewalsQueue() {
  const tableBody = document.getElementById('admin-renewal-table');
  const msgEl = document.getElementById('no-renewals-msg');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/renewals');
    const data = await res.json();

    const pendingRenewals = data.success ? data.renewals.filter(r => r.status === 'Processing' || r.status === 'Submitted' || r.status === 'Under Review') : [];

    if (pendingRenewals.length > 0) {
      tableBody.innerHTML = '';
      msgEl.classList.add('hidden');

      pendingRenewals.forEach(r => {
        let threshold = 2.0;
        if ((r.scholarship_name || r.scholarshipType || '').includes('Star')) threshold = 3.0;
        else if ((r.scholarship_name || r.scholarshipType || '').includes('DOST')) threshold = 2.5;

        const sCgpa = parseFloat(r.cgpa) || 0;
        const sTgpa = parseFloat(r.tgpa) || 0;
        const passesCGPA = sCgpa >= threshold;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${r.student_name || r.studentName}</strong><br><small class="text-muted">${r.student_id || r.studentId}</small></td>
          <td>${r.scholarship_name || r.scholarshipType || 'Scholarship'}<br><small class="text-muted">${r.term_label || r.term || 'Term'}</small></td>
          <td>
            CGPA: <strong class="${passesCGPA ? 'text-success' : 'text-danger'}">${sCgpa.toFixed(2)}</strong><br>
            TGPA: <strong>${sTgpa.toFixed(2)}</strong>
          </td>
          <td>
            <a href="/${r.eaf_file || r.eafFile}" target="_blank" class="btn btn-outline btn-small margin-bottom block text-center"><i class="bx bx-file"></i> View EAF</a>
            <a href="/${r.grades_file || r.gradesFile}" target="_blank" class="btn btn-outline btn-small block text-center"><i class="bx bx-bar-chart-alt"></i> View Grades</a>
          </td>
          <td>
            <div class="insight-badge ${passesCGPA ? 'good' : 'risk'}">
              <i class="bx bx-analyse"></i> ${passesCGPA ? 'Meets GPA Limits' : 'CGPA UNDER RETENTION LIMIT!'}
            </div>
          </td>
          <td class="text-right">
            <div class="action-row margin-bottom">
              <button class="btn btn-success btn-small btn-renew" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}"><i class="bx bx-check-double"></i> Verify & Renew</button>
              <button class="btn btn-outline btn-small text-warning btn-probation" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}"><i class="bx bx-shield-x"></i> Probation</button>
            </div>
            <div class="action-row">
              <button class="btn btn-danger btn-small btn-terminate" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}"><i class="bx bx-trash"></i> Terminate</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-renew').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Renewed', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx')));
      });
      tableBody.querySelectorAll('.btn-probation').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'In Probation', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx')));
      });
      tableBody.querySelectorAll('.btn-terminate').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Terminated', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx')));
      });
    } else {
      tableBody.innerHTML = '';
      msgEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

// "Handle Renewal Action"
async function handleRenewalAction(renewalId, action, studentId, termIndex) {
  try {
    const res = await fetch('/api/admin/renewal-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renewalId, action, studentId, termIndex: termIndex || 6 })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Term Status verified and updated to: ${action}`);
      loadRenewalsQueue();
    }
  } catch (err) {
    console.error(err);
  }
}

// "Load Appeals Desk"
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
          <td><strong>${a.student_name || a.studentName}</strong><br><small class="text-muted">${a.student_id || a.studentId}</small></td>
          <td>${a.scholarship_name || a.scholarshipType || 'Scholarship'}<br><small class="text-muted">${a.term_label || a.term || 'Term'}</small></td>
          <td>
            <div class="insight-badge" style="border-left-color: var(--warning)">
              <strong>Student Reason:</strong><br>
              "${a.reason}"
            </div>
          </td>
          <td>
            <a href="/${a.letter_file || a.letterFile}" target="_blank" class="btn btn-outline btn-small margin-bottom block text-center"><i class="bx bx-file"></i> Appeal Letter</a>
            <a href="/${a.supporting_files || a.supportingFiles}" target="_blank" class="btn btn-outline btn-small block text-center"><i class="bx bx-paperclip"></i> Support Files</a>
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

// "Handle Appeal Action"
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

// "Load Stipend Ledger"
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

        const sId = item.studentId || item.id || '--';
        const sName = item.studentName || item.name || '--';
        const sType = item.scholarshipType || 'Scholarship';
        const rStatus = item.renewalStatus || 'Active';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${sId}</strong></td>
          <td>${sName}</td>
          <td>${sType}</td>
          <td><span class="badge ${rStatus === 'Processed' || rStatus === 'Renewed' ? 'badge-success' : (rStatus === 'Probation' ? 'badge-warning' : 'badge-danger')}">${rStatus}</span></td>
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

// "Handle Disbursement Action"
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

// "Load Reports Data"
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
