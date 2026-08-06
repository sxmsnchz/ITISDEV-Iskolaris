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

// Grades modal: create if missing
function ensureGradesModal() {
  if (document.getElementById('grades-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'grades-modal';
  modal.style.position = 'fixed';
  modal.style.left = 0;
  modal.style.top = 0;
  modal.style.right = 0;
  modal.style.bottom = 0;
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'none';
  modal.style.zIndex = 9999;

  modal.innerHTML = `
    <div style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:800px;max-width:95%;background:#fff;border-radius:8px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="margin:0">Edit Grades</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <button id="grades-modal-debug-toggle" class="btn btn-outline btn-small">Show debug</button>
          <button id="grades-modal-close" class="btn btn-icon">✕</button>
        </div>
      </div>
      <div id="grades-modal-body" style="max-height:60vh;overflow:auto;padding:8px;border:1px solid #eee;border-radius:6px;">
        <!-- table inserted here -->
      </div>
      <pre id="grades-modal-debug" style="display:none;max-height:20vh;overflow:auto;background:#f7f7f7;border:1px solid #eee;padding:8px;border-radius:6px;margin-top:8px;font-size:12px;">{}</pre>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button id="grades-modal-cancel" class="btn btn-outline">Cancel</button>
        <button id="grades-modal-save" class="btn btn-primary">Save changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#grades-modal-close').addEventListener('click', closeGradesModal);
  modal.querySelector('#grades-modal-cancel').addEventListener('click', closeGradesModal);
  modal.querySelector('#grades-modal-debug-toggle').addEventListener('click', (e)=>{
    const dbg = modal.querySelector('#grades-modal-debug');
    if (!dbg) return;
    if (dbg.style.display === 'none') { dbg.style.display='block'; e.target.textContent='Hide debug'; }
    else { dbg.style.display='none'; e.target.textContent='Show debug'; }
  });
}

function openGradesModal(studentId) {
  ensureGradesModal();
  const modal = document.getElementById('grades-modal');
  const body = modal.querySelector('#grades-modal-body');
  body.innerHTML = '<p>Loading…</p>';
  modal.style.display = 'block';

  fetch(`/api/admin/term-grades/${studentId}`).then(r => r.json()).then(data => {
    console.log('term-grades response', data);
    const dbgEl = modal.querySelector('#grades-modal-debug');
    if (dbgEl) dbgEl.textContent = JSON.stringify(data, null, 2);
    if (!data.success) {
      body.innerHTML = '<p>Failed to load grades.</p>';
      return;
    }
    const terms = data.terms || [];
    // debug hint if parsed terms exist in server payload
    if (Array.isArray(data.terms) && data.terms.length > 0) {
      const anyFilled = data.terms.some(t => (t.tgpa || 0) > 0 || (t.cgpa || 0) > 0);
      if (!anyFilled) {
        console.info('No term TGPA/CGPA values present in returned terms; check parsed_terms in notes.');
      }
    }
    // store original values
    modal.__original = terms.reduce((m,t)=>{m[t.termIndex]=t;return m;},{ });

    let currentTermIdx = 0;
    if (data.currentTermIndex !== undefined) currentTermIdx = parseInt(data.currentTermIndex) || 0;
    else if (data.current_term_index !== undefined) currentTermIdx = parseInt(data.current_term_index) || 0;
    else if (typeof currentUser !== 'undefined' && currentUser) currentTermIdx = parseInt(currentUser.currentTermIndex || currentUser.current_term_index || 0) || 0;
    const previousTermIdx = Math.max(0, currentTermIdx - 1);
    const table = document.createElement('div');
    table.style.display = 'grid';
    table.style.gridTemplateColumns = '1fr 160px 160px';
    table.style.gap = '8px';
    table.innerHTML = `<div style="font-weight:700">Term</div><div style="font-weight:700">TGPA</div><div style="font-weight:700">CGPA</div>`;

    for (let i=1;i<=12;++i) {
      const t = terms.find(x=>parseInt(x.termIndex)===i) || { termIndex:i, tgpa:'', cgpa:'' };
      const termLabel = `Term ${i}`;
      const isCurrent = currentTermIdx > 0 && (i === currentTermIdx);
      const isFuture = currentTermIdx > 0 ? (i > currentTermIdx) : false;
      const isEditable = !isFuture && !isCurrent;

      // Prefill: treat empty/null/undefined or numeric zero as missing (show blank)
      const parseVal = (v) => {
        if (v === null || v === undefined || v === '') return '';
        const n = parseFloat(v);
        if (!Number.isFinite(n)) return '';
        if (n === 0) return '';
        return String(n.toFixed(3));
      };
      const tgVal = parseVal(t.tgpa);
      const cgVal = parseVal(t.cgpa);

      const termCell = document.createElement('div'); termCell.textContent = termLabel;
      const tgCell = document.createElement('div');
      const tgInput = document.createElement('input'); tgInput.type='text'; tgInput.value = tgVal; tgInput.dataset.termIndex = i; tgInput.className='modal-tgpa';
      tgInput.style.width='140px'; tgInput.style.padding='6px'; tgInput.style.border='1px solid #ddd'; tgInput.style.borderRadius='4px';
      if (!isEditable) { tgInput.readOnly = true; tgInput.placeholder = '--'; tgInput.style.background = '#f0f0f0'; tgInput.style.color = '#666'; }
      if (isCurrent) { tgInput.value = ''; tgInput.readOnly = true; tgInput.placeholder = '--'; tgInput.style.background = '#fafafa'; }
      if (isEditable) { tgInput.style.border = '2px solid #2aa05a'; tgInput.style.background = '#ffffff'; }
      tgCell.appendChild(tgInput);

      const cgCell = document.createElement('div');
      const cgInput = document.createElement('input'); cgInput.type='text'; cgInput.value = cgVal; cgInput.dataset.termIndex = i; cgInput.className='modal-cgpa';
      cgInput.style.width='140px'; cgInput.style.padding='6px'; cgInput.style.border='1px solid #ddd'; cgInput.style.borderRadius='4px';
      if (!isEditable) { cgInput.readOnly = true; cgInput.placeholder = '--'; cgInput.style.background = '#f0f0f0'; cgInput.style.color = '#666'; }
      if (isCurrent) { cgInput.value = ''; cgInput.readOnly = true; cgInput.placeholder = '--'; cgInput.style.background = '#fafafa'; }
      if (isEditable) { cgInput.style.border = '2px solid #2aa05a'; cgInput.style.background = '#ffffff'; }
      cgCell.appendChild(cgInput);

      table.appendChild(termCell);
      table.appendChild(tgCell);
      table.appendChild(cgCell);
    }

    body.innerHTML = '';
    body.appendChild(table);

    // attach save
    const saveBtn = modal.querySelector('#grades-modal-save');
    saveBtn.onclick = async () => {
      const inputsT = Array.from(modal.querySelectorAll('.modal-tgpa'));
      const inputsC = Array.from(modal.querySelectorAll('.modal-cgpa'));
      const payload = [];
      let invalid = false;
      inputsT.forEach(inp => {
        if (inp.readOnly) return;
        const idx = parseInt(inp.dataset.termIndex);
        const raw = inp.value.trim();
        if (raw === '') return;
        const n = parseFloat(raw);
        if (!Number.isFinite(n) || n < 0.0 || n > 4.5) { invalid = true; inp.style.border='1px solid #e74c3c'; inp.style.background='#fff5f5'; }
      });
      inputsC.forEach(inp => {
        if (inp.readOnly) return;
        const idx = parseInt(inp.dataset.termIndex);
        const raw = inp.value.trim();
        if (raw === '') return;
        const n = parseFloat(raw);
        if (!Number.isFinite(n) || n < 0.0 || n > 4.5) { invalid = true; inp.style.border='1px solid #e74c3c'; inp.style.background='#fff5f5'; }
      });
      if (invalid) return showToast('Please fix invalid TGPA/CGPA values (0.000 - 4.500)');

      for (let i=0;i<inputsT.length;i++){
        const tIn = inputsT[i]; const cIn = inputsC[i];
        if (tIn.readOnly && cIn.readOnly) continue;
        const idx = parseInt(tIn.dataset.termIndex);
        const orig = modal.__original && modal.__original[idx] ? modal.__original[idx] : { tgpa:'', cgpa:'' };
        const tgRaw = tIn.value.trim(); const cgRaw = cIn.value.trim();
        const obj = { termIndex: idx };
        let changed = false;
        if (!tIn.readOnly) {
          if (tgRaw !== '') { const tg = parseFloat(tgRaw); if (isFinite(tg)) { obj.tgpa = parseFloat(tg.toFixed(3)); if (String(obj.tgpa) !== String(orig.tgpa)) changed = true; } }
        }
        if (!cIn.readOnly) {
          if (cgRaw !== '') { const cg = parseFloat(cgRaw); if (isFinite(cg)) { obj.cgpa = parseFloat(cg.toFixed(3)); if (String(obj.cgpa) !== String(orig.cgpa)) changed = true; } }
        }
        if (changed) payload.push(obj);
      }

      if (payload.length === 0) return showToast('No edits to save');
      try {
        const res = await fetch('/api/admin/update-multiple-term-grades-full', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ studentId, grades: payload }) });
        const j = await res.json();
        if (j.success) {
          showToast('Grades saved');
          closeGradesModal();
          loadRenewalsQueue();
        } else {
          showToast('Failed to save grades');
        }
      } catch (e) { console.error(e); showToast('Failed to save grades'); }
    };
  }).catch((err)=>{ console.error(err); body.innerHTML='<p>Error loading grades.</p>'; });
}

function closeGradesModal() {
  const modal = document.getElementById('grades-modal');
  if (!modal) return;
  modal.style.display = 'none';
}

// delegated handler to open grades modal
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('button.btn-edit-grades');
  if (!btn) return;
  const sid = btn.getAttribute('data-sid');
  if (!sid) return showToast('Missing student id');
  openGradesModal(sid);
});

// "Configure Admin Role Views"
function configureAdminRoleViews(role) {
  const navHome = document.getElementById('nav-a-home');
  const navOnboard = document.getElementById('nav-a-onboarding');
  const navRenewals = document.getElementById('nav-a-renewals');
  const navAppeals = document.getElementById('nav-a-appeals');
  const navStipends = document.getElementById('nav-a-stipends');
  const navStipendRecords = document.getElementById('nav-a-stipend-records');
  const badge = document.getElementById('admin-office-badge');

  if (role === 'AdSO') {
    badge.textContent = 'AdSO Office (Onboarding, Renewals, Appeals)';
    badge.className = 'user-role-badge badge-admin';
    if (navStipends) navStipends.classList.add('hidden');
    if (navStipendRecords) navStipendRecords.classList.add('hidden');
    setupAdminNavigation('a-home');
  } else if (role === 'DOST') {
    badge.textContent = 'DOST Core Group (Renewals, Appeals, Stipends)';
    badge.className = 'user-role-badge bg-success-light text-success';
    if (navOnboard) navOnboard.classList.add('hidden');
    setupAdminNavigation('a-home');
  } else if (role === 'FAO') {
    badge.textContent = 'Finance & Accounting Office (Stipends)';
    badge.className = 'user-role-badge badge-admin';
    if (navOnboard) navOnboard.classList.add('hidden');
    if (navRenewals) navRenewals.classList.add('hidden');
    if (navAppeals) navAppeals.classList.add('hidden');
    setupAdminNavigation('a-home');
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
    'a-home': currentUser && currentUser.adminType === 'AdSO' ? 'Home Dashboard' : 'Finance & Stipends Executive Summary Dashboard',
    'a-onboarding': 'Onboarding Inspection Workbench',
    'a-renewals': 'Termly Renewal Evaluation Queue',
    'a-appeals': 'Scholastic Reconsideration Appeals Desk',
    'a-stipends': 'Finance Stipend Ledgers',
    'a-stipend-records': 'Disbursed Stipend Records History',
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
  if (currentTab === 'a-home') loadAdminHomeData();
  else if (currentTab === 'a-onboarding') loadPendingOnboardings();
  else if (currentTab === 'a-renewals') loadRenewalsQueue();
  else if (currentTab === 'a-appeals') loadAppealsDesk();
  else if (currentTab === 'a-stipends') loadStipendLedger();
  else if (currentTab === 'a-stipend-records') loadStipendRecords();
  else if (currentTab === 'a-reports') loadReportsData();
}

// "Load Pending Onboardings"
async function loadPendingOnboardings() {
  const tableBody = document.getElementById('admin-onboarding-table');
  const msgEl = document.getElementById('no-onboarding-msg');
  if (!tableBody) return;

  try {
    const res = await fetch(`/api/admin/pending?adminType=${currentUser ? currentUser.adminType : ''}`);
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
        // append collapsible TGPA editor placeholder
        const editorRow = document.createElement('tr');
        editorRow.className = 'tgpa-editor-row hidden';
        editorRow.innerHTML = `<td colspan="6" style="padding:10px 20px;">
            <div class="tgpa-editor" data-sid="${user.id || user.studentId || user.userId}" style="display:none;">
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <!-- inputs inserted dynamically -->
              </div>
              <div style="margin-top:8px;">
                <button class="btn btn-small btn-primary btn-save-tgpas">Save TGPA</button>
                <button class="btn btn-small btn-outline btn-cancel-tgpas">Cancel</button>
              </div>
            </div>
          </td>`;
        tableBody.appendChild(editorRow);
      });

      tableBody.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleOnboardingAction(btn.getAttribute('data-id'), 'approve');
        });
      });
      tableBody.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleOnboardingAction(btn.getAttribute('data-id'), 'reject');
        });
      });
    } else {
      tableBody.innerHTML = '';
      msgEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

// Delegated click handlers fallback — ensures action buttons work even if per-row listeners fail
document.addEventListener('click', (e) => {
  try {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-approve')) {
      const id = btn.getAttribute('data-id');
      if (id) handleOnboardingAction(id, 'approve');
      return;
    }
    if (btn.classList.contains('btn-reject')) {
      const id = btn.getAttribute('data-id');
      if (id) handleOnboardingAction(id, 'reject');
      return;
    }
    if (btn.classList.contains('btn-renew')) {
      const id = btn.getAttribute('data-id');
      const sid = btn.getAttribute('data-sid');
      const tidx = btn.getAttribute('data-tidx');
      handleRenewalAction(id, 'Renewed', sid, tidx, btn);
      return;
    }
    if (btn.classList.contains('btn-probation')) {
      const id = btn.getAttribute('data-id');
      const sid = btn.getAttribute('data-sid');
      const tidx = btn.getAttribute('data-tidx');
      handleRenewalAction(id, 'In Probation', sid, tidx, btn);
      return;
    }
    if (btn.classList.contains('btn-invalid')) {
      const id = btn.getAttribute('data-id');
      const sid = btn.getAttribute('data-sid');
      const tidx = btn.getAttribute('data-tidx');
      handleRenewalAction(id, 'Invalid Submission', sid, tidx, btn);
      return;
    }
    if (btn.classList.contains('btn-terminate')) {
      const id = btn.getAttribute('data-id');
      const sid = btn.getAttribute('data-sid');
      const tidx = btn.getAttribute('data-tidx');
      handleRenewalAction(id, 'Terminated', sid, tidx, btn);
      return;
    }
    if (btn.classList.contains('btn-app-approve')) {
      const id = btn.getAttribute('data-id');
      if (id) handleAppealAction(id, 'Approve');
      return;
    }
    if (btn.classList.contains('btn-app-reject')) {
      const id = btn.getAttribute('data-id');
      if (id) handleAppealAction(id, 'Reject');
      return;
    }
  } catch (err) {
    console.error('Delegated handler error:', err);
  }
});

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

// Dropdown menu manager
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('.dropdown-trigger-btn');
  if (trigger) {
    e.stopPropagation();
    const container = trigger.closest('.dropdown-menu-container');
    const wasActive = container.classList.contains('active');
    
    // Close any other active dropdowns
    document.querySelectorAll('.dropdown-menu-container.active').forEach(d => {
      d.classList.remove('active');
    });
    
    if (!wasActive) {
      container.classList.add('active');
    }
  } else {
    // Clicked outside, close all dropdowns
    document.querySelectorAll('.dropdown-menu-container.active').forEach(d => {
      d.classList.remove('active');
    });
  }
});

// "Load Renewals Queue"
async function loadRenewalsQueue() {
  const tableBody = document.getElementById('admin-renewal-table');
  const msgEl = document.getElementById('no-renewals-msg');
  if (!tableBody) return;

  try {
    const res = await fetch(`/api/admin/renewals?adminType=${currentUser ? currentUser.adminType : ''}`);
    const data = await res.json();

    const pendingRenewals = data.success ? data.renewals.filter(r => ['Processing', 'Submitted', 'Under Review'].includes(r.status)) : [];

    if (pendingRenewals.length > 0) {
      tableBody.innerHTML = '';
      msgEl.classList.add('hidden');

      pendingRenewals.forEach(r => {
        let threshold = 2.0;
        const sName = r.scholarship_name || r.scholarshipType || '';
        if (sName.includes('Star') || sName.includes('DOST') || sName.includes('Archer') || sName.includes('Animo')) {
          threshold = 2.5;
        } else if (sName.includes('La Salle')) {
          threshold = 2.0;
        }

        const sCgpa = parseFloat(r.cgpa) || 0;
        const sTgpa = parseFloat(r.tgpa) || 0;
        const passesCGPA = sCgpa >= threshold;

        const row = document.createElement('tr');
        const eafClass = r.eaf_status === 'VALID EAF' ? 'good' : (r.eaf_status === 'INVALID EAF' ? 'risk' : '');
        const gradesClass = (r.grades_status && r.grades_status.includes('Meets')) ? 'good' : ((r.grades_status && (r.grades_status.includes('Failed') || r.grades_status.includes('Invalid'))) ? 'risk' : '');

        // determine if this term is current or future based on logged-in admin's view
        const currentTermIdx = currentUser ? (currentUser.currentTermIndex || currentUser.current_term_index || 0) : 0;
        const termIdx = parseInt(r.term_index || r.termIndex || 0);
        const isCurrentOrFuture = termIdx >= parseInt(currentTermIdx || 0);

        const eafValid = r.eaf_status === 'VALID EAF';
        const gradesValid = r.grades_status && r.grades_status.includes('Meets');

        let primaryBtnHtml = '';
        let dropdownItemsHtml = '';

        // Define buttons components
        const renewBtn = `
          <button class="btn-renew primary-action-btn" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}">
            <i class="bx bx-check-double"></i> Verify & Renew
          </button>
        `;
        const renewDropdownItem = `
          <button class="dropdown-item btn-renew" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}">
            <i class="bx bx-check-double text-success"></i> Verify & Renew
          </button>
        `;

        const probationBtn = `
          <button class="btn-probation primary-action-btn" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}" style="background: linear-gradient(135deg, #ea580c, #c2410c); box-shadow: 0 2px 4px rgba(234, 88, 12, 0.15);">
            <i class="bx bx-shield-x"></i> Probation
          </button>
        `;
        const probationDropdownItem = `
          <button class="dropdown-item btn-probation" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}">
            <i class="bx bx-shield-x text-warning"></i> Flag as Probation
          </button>
        `;

        const invalidBtn = `
          <button class="btn-invalid primary-action-btn" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}" style="background: linear-gradient(135deg, #475569, #334155); box-shadow: 0 2px 4px rgba(71, 85, 105, 0.15);">
            <i class="bx bx-x-circle"></i> Tag as Invalid
          </button>
        `;
        const invalidDropdownItem = `
          <button class="dropdown-item btn-invalid" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}">
            <i class="bx bx-x-circle text-muted"></i> Tag as Invalid
          </button>
        `;

        const terminateDropdownItem = `
          <button class="dropdown-item text-danger btn-terminate" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}">
            <i class="bx bx-trash"></i> Terminate
          </button>
        `;

        const isEafInvalid = r.eaf_status === 'INVALID EAF';
        const isGradesInvalid = r.grades_status && (r.grades_status.includes('Failed') || r.grades_status.includes('Invalid'));

        if (isEafInvalid || isGradesInvalid) {
          // Rule 3: Either one is invalid -> Default: Tag as Invalid
          primaryBtnHtml = invalidBtn;
          dropdownItemsHtml = `
            ${renewDropdownItem}
            ${probationDropdownItem}
            <div class="dropdown-divider"></div>
            ${terminateDropdownItem}
          `;
        } else if (eafValid && !gradesValid) {
          // Rule 2: EAF valid but Grades fail requirements -> Default: Probation
          primaryBtnHtml = probationBtn;
          dropdownItemsHtml = `
            ${renewDropdownItem}
            ${invalidDropdownItem}
            <div class="dropdown-divider"></div>
            ${terminateDropdownItem}
          `;
        } else {
          // Rule 1: Both valid -> Default: Renew
          primaryBtnHtml = renewBtn;
          dropdownItemsHtml = `
            ${probationDropdownItem}
            ${invalidDropdownItem}
            <div class="dropdown-divider"></div>
            ${terminateDropdownItem}
          `;
        }

        row.innerHTML = `
          <td><strong>${r.student_name || r.studentName}</strong><br><small class="text-muted">${r.student_id || r.studentId}</small></td>
          <td>${r.scholarship_name || r.scholarshipType || 'Scholarship'}<br><small class="text-muted">${r.term_label || r.term || 'Term'}</small></td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 6px; font-family: 'Inter', sans-serif;">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; display: block; margin-bottom: 2px; letter-spacing: 0.5px;">CGPA</span>
                <strong style="font-size: 15px; color: #111;">${sCgpa.toFixed(3)}</strong>
              </div>
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; display: block; margin-bottom: 2px; letter-spacing: 0.5px;">TGPA</span>
                <strong style="font-size: 15px; color: #111;">${sTgpa.toFixed(3)}</strong>
              </div>
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <a href="/${r.eaf_file || r.eafFile}" target="_blank" class="btn btn-outline btn-small text-center" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; padding: 6px 12px;"><i class="bx bx-file"></i> View EAF</a>
              <a href="/${r.grades_file || r.gradesFile}" target="_blank" class="btn btn-outline btn-small text-center" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; padding: 6px 12px;"><i class="bx bx-bar-chart-alt"></i> View Grades</a>
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="insight-badge ${eafClass}" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 4px; font-size: 12px; margin: 0; font-weight: 500;">
                <i class="bx bx-file"></i> EAF: <strong>${r.eaf_status || 'NOT VERIFIED'}</strong>
              </div>
              <div class="insight-badge ${gradesClass}" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 4px; font-size: 12px; margin: 0; font-weight: 500;">
                <i class="bx bx-analyse"></i> Grades: <strong>${r.grades_status || 'NOT VERIFIED'}</strong>
              </div>
            </div>
          </td>
          <td class="text-right" style="vertical-align: middle;">
            <div class="actions-cell-container">
              <!-- Edit Grades Icon Button -->
              <button class="btn-edit-grades action-icon-btn" data-sid="${r.student_id || r.studentId}" title="Edit Grades">
                <i class="bx bx-edit-alt"></i>
              </button>

              <!-- Primary Action (Recommended based on system insights) -->
              ${primaryBtnHtml}

              <!-- More Actions Dropdown -->
              <div class="dropdown-menu-container">
                <button class="dropdown-trigger-btn" title="More Actions">
                  <i class="bx bx-dots-vertical-rounded"></i>
                </button>
                <div class="dropdown-content-menu">
                  ${dropdownItemsHtml}
                </div>
              </div>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-renew').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleRenewalAction(btn.getAttribute('data-id'), 'Renewed', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn);
        });
      });
      
      tableBody.querySelectorAll('.btn-probation').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleRenewalAction(btn.getAttribute('data-id'), 'In Probation', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn);
        });
      });
      tableBody.querySelectorAll('.btn-invalid').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleRenewalAction(btn.getAttribute('data-id'), 'Invalid Submission', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn);
        });
      });
      tableBody.querySelectorAll('.btn-terminate').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleRenewalAction(btn.getAttribute('data-id'), 'Terminated', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn);
        });
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
async function handleRenewalAction(renewalId, action, studentId, termIndex, triggerButton) {
  try {
    // Locate inputs in the same table row to collect possible edited CGPA/TGPA
    const btn = triggerButton || document.querySelector(`button.btn-renew[data-id="${renewalId}"]`) || document.querySelector(`button[data-id="${renewalId}"]`);
    let cgpaVal = null;
    let tgpaVal = null;
    if (btn) {
      const row = btn.closest('tr');
      if (row) {
        const cgInput = row.querySelector('.input-cgpa');
        const tgInput = row.querySelector('.input-tgpa');
        if (cgInput) cgpaVal = parseFloat(cgInput.value) || 0.0;
        if (tgInput) tgpaVal = parseFloat(tgInput.value) || 0.0;
      }
    }

    const row = btn ? btn.closest('tr') : null;
    if (row) {
      row.remove();
    }

    // If the admin edited numeric values, send them to server to persist before changing status
    if (cgpaVal !== null || tgpaVal !== null) {
      try {
        await fetch('/api/admin/update-term-grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, termIndex: termIndex || 6, tgpa: tgpaVal, cgpa: cgpaVal })
        });
      } catch (e) {
        console.error('Failed to persist edited grades before renewal action', e);
      }
    }

    const res = await fetch('/api/admin/renewal-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renewalId, action, studentId, termIndex: termIndex || 6 })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Term Status verified and updated to: ${action}`);
      loadRenewalsQueue();
    } else {
      if (row) row.style.display = '';
      showToast('Failed to update renewal status.');
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
    const res = await fetch(`/api/admin/appeals?adminType=${currentUser ? currentUser.adminType : ''}`);
    const data = await res.json();

    const pendingAppeals = data.success ? data.appeals.filter(a => a.status === 'Pending') : [];
      const appealCounts = data.success ? data.appeals.reduce((acc, a) => {
        const studentId = a.student_id || a.studentId;
        if (!studentId) return acc;
        acc[studentId] = (acc[studentId] || 0) + 1;
        return acc;
      }, {}) : {};

    if (pendingAppeals.length > 0) {
      tableBody.innerHTML = '';
      msgEl.classList.add('hidden');

      pendingAppeals.forEach(a => {
        const studentId = a.student_id || a.studentId;
        const historyCount = appealCounts[studentId] || 0;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="text-align: center; vertical-align: middle;"><strong>${a.student_name || a.studentName}</strong><br><small class="text-muted">${a.student_id || a.studentId}</small></td>
          <td style="text-align: center; vertical-align: middle;">${a.scholarship_name || a.scholarshipType || 'Scholarship'}<br><small class="text-muted">${a.term_label || a.term || 'Term'}</small></td>
          <td style="text-align: center; vertical-align: middle;">${historyCount} appeal${historyCount === 1 ? '' : 's'} in history</td>
          <td style="text-align: center; vertical-align: middle;">
            <button class="btn btn-outline btn-small btn-view-context" data-id="${a.id}">
              <i class="bx bx-message-detail"></i> View Explanation
            </button>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <div style="display: inline-flex; flex-direction: column; gap: 6px; align-items: center;">
              <a href="/${a.letter_file || a.letterFile}" target="_blank" class="btn btn-outline btn-small" style="width: 130px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0.35rem 0.6rem;"><i class="bx bx-file"></i> Appeal Letter</a>
              <a href="/${a.supporting_files || a.supportingFiles}" target="_blank" class="btn btn-outline btn-small" style="width: 130px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0.35rem 0.6rem;"><i class="bx bx-paperclip"></i> Support Files</a>
            </div>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <div class="action-row" style="justify-content: center; gap: 8px;">
              <button class="btn btn-success btn-small btn-app-approve" data-id="${a.id}" style="padding: 0.5rem 1rem;"><i class="bx bx-check"></i> Approve Appeal</button>
              <button class="btn btn-danger btn-small btn-app-reject" data-id="${a.id}" style="padding: 0.5rem 1rem;"><i class="bx bx-x"></i> Terminate Scholarship</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-view-context').forEach(btn => {
        btn.addEventListener('click', () => {
          const appealId = btn.getAttribute('data-id');
          const appeal = pendingAppeals.find(x => x.id.toString() === appealId.toString());
          if (appeal) {
            openAppealContextModal(
              appeal.student_name || appeal.studentName || 'Scholar',
              appeal.student_id || appeal.studentId || 'N/A',
              appeal.reason || 'No explanation provided.'
            );
          }
        });
      });

      tableBody.querySelectorAll('.btn-app-approve').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleAppealAction(btn.getAttribute('data-id'), 'Approve');
        });
      });
      tableBody.querySelectorAll('.btn-app-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleAppealAction(btn.getAttribute('data-id'), 'Reject');
        });
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

// "Open Appeal Context Modal"
function openAppealContextModal(studentName, studentId, reason) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'iskolaris-modal-overlay';
  modalOverlay.id = 'appeal-context-modal-overlay';

  modalOverlay.innerHTML = `
    <div class="iskolaris-modal" style="max-width: 600px;">
      <div class="iskolaris-modal-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0; display: flex; align-items: center; gap: 8px;"><i class="bx bx-message-detail" style="font-size: 1.5rem; color: var(--primary);"></i> Appeal Explanation</h4>
        <button id="btn-modal-close-x" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      </div>
      <div class="iskolaris-modal-body">
        <div style="margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Student Name</p>
          <p style="margin: 0.15rem 0 0.5rem 0; font-weight: 700; color: var(--text-main); font-size: 1.05rem;">${studentName}</p>
          <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Student ID</p>
          <p style="margin: 0.15rem 0 0 0; font-weight: 600; color: var(--text-main); font-size: 0.95rem;">${studentId}</p>
        </div>
        <p class="iskolaris-modal-question" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; color: var(--text-muted); font-weight: 700;">Reconsideration Reason:</p>
        <div style="background: var(--bg-light); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.95rem; line-height: 1.6; color: var(--text-main); white-space: pre-wrap; max-height: 300px; overflow-y: auto;">
          ${reason}
        </div>
      </div>
      <div class="iskolaris-modal-footer">
        <button id="btn-modal-close" class="btn btn-primary" style="background: var(--primary); color: white; min-width: 100px;">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => {
    modalOverlay.remove();
  };

  document.getElementById('btn-modal-close-x').addEventListener('click', closeModal);
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

// Global states for stipend ledger
function getDynamicTermLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate();    // 1-31
  const mmdd = month * 100 + day;

  let termNumber = 1;
  let startYear = year;
  let endYear = year + 1;

  if (mmdd >= 801 && mmdd <= 1131) { // Sept 1 to Dec 31
    termNumber = 1;
    startYear = year;
    endYear = year + 1;
  } else if (mmdd >= 0 && mmdd <= 4) { // Jan 1 to Jan 4
    termNumber = 1;
    startYear = year - 1;
    endYear = year;
  } else if (mmdd >= 5 && mmdd <= 403) { // Jan 5 to May 3
    termNumber = 2;
    startYear = year - 1;
    endYear = year;
  } else if (mmdd >= 404 && mmdd <= 731) { // May 4 to Aug 31
    termNumber = 3;
    startYear = year - 1;
    endYear = year;
  }

  return `A.Y. ${startYear} - ${endYear} Term ${termNumber}`;
}

const CURRENT_ACADEMIC_TERM_LABEL = getDynamicTermLabel();
let activeScholarshipTab = '';
let activeMonthTab = 1;
let stipendDataCache = null;
let stipendRecordsCache = null;

// "Load Stipend Ledger"
async function loadStipendLedger() {
  const tableBody = document.getElementById('admin-stipend-table');
  if (!tableBody) return;

  const schTabContainer = document.getElementById('scholarship-tabs-container');
  const monthTabContainer = document.getElementById('month-tabs-container');
  const searchInput = document.getElementById('ledger-search-input');
  const collegeFilter = document.getElementById('ledger-college-filter');
  const batchFilter = document.getElementById('ledger-batch-filter');
  const statusFilter = document.getElementById('ledger-status-filter');
  const sortSelect = document.getElementById('ledger-sort-select');
  const autoDisburseBtn = document.getElementById('btn-auto-disburse-all');

  try {
    const res = await fetch(`/api/admin/stipends?adminType=${currentUser ? currentUser.adminType : ''}`);
    const data = await res.json();
    if (!data.success) return;

    stipendDataCache = data.stipends;

    const adminType = currentUser ? currentUser.adminType : '';
    if (adminType === 'DOST') {
      activeScholarshipTab = 'DOST-SEI Undergraduate Scholarship';
      if (schTabContainer) schTabContainer.innerHTML = '';
    } else {
      const availableScholarships = [...new Set(stipendDataCache.map(s => s.scholarshipType).filter(Boolean))];
      if (availableScholarships.length === 0) {
        availableScholarships.push('Star Scholars Program');
        availableScholarships.push('Animo Grants Scholarship Program');
      }

      if (!activeScholarshipTab || !availableScholarships.includes(activeScholarshipTab)) {
        activeScholarshipTab = availableScholarships[0];
      }

      if (schTabContainer) {
        schTabContainer.innerHTML = availableScholarships.map(schName => `
          <div class="stipend-tab ${activeScholarshipTab === schName ? 'active' : ''}" data-sch="${schName}">
            ${schName}
          </div>
        `).join('');

        schTabContainer.querySelectorAll('.stipend-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            schTabContainer.querySelectorAll('.stipend-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeScholarshipTab = tab.getAttribute('data-sch');
            activeMonthTab = 1;
            renderStipendLedgerTable();
          });
        });
      }
    }

    const triggerRender = () => renderStipendLedgerTable();
    
    searchInput.replaceWith(searchInput.cloneNode(true));
    collegeFilter.replaceWith(collegeFilter.cloneNode(true));
    batchFilter.replaceWith(batchFilter.cloneNode(true));
    statusFilter.replaceWith(statusFilter.cloneNode(true));
    sortSelect.replaceWith(sortSelect.cloneNode(true));
    autoDisburseBtn.replaceWith(autoDisburseBtn.cloneNode(true));

    document.getElementById('ledger-search-input').addEventListener('input', triggerRender);
    document.getElementById('ledger-college-filter').addEventListener('change', triggerRender);
    document.getElementById('ledger-batch-filter').addEventListener('change', triggerRender);
    document.getElementById('ledger-status-filter').addEventListener('change', triggerRender);
    document.getElementById('ledger-sort-select').addEventListener('change', triggerRender);
    
    document.getElementById('btn-auto-disburse-all').addEventListener('click', () => {
      handleAutoDisburseBatch();
    });

    renderStipendLedgerTable();

  } catch (err) {
    console.error(err);
  }
}

function renderStipendLedgerTable() {
  const tableBody = document.getElementById('admin-stipend-table');
  const monthTabContainer = document.getElementById('month-tabs-container');
  if (!tableBody || !stipendDataCache) return;

  const searchVal = document.getElementById('ledger-search-input').value.toLowerCase().trim();
  const collegeVal = document.getElementById('ledger-college-filter').value;
  const batchVal = document.getElementById('ledger-batch-filter').value;
  const statusVal = document.getElementById('ledger-status-filter').value;
  const sortVal = document.getElementById('ledger-sort-select').value;
  const autoDisburseBtn = document.getElementById('btn-auto-disburse-all');

  let list = stipendDataCache.filter(item => {
    const isRenewed = item.renewalStatus === 'Renewed' || item.renewalStatus === 'Processed';
    if (!isRenewed) return false;

    if (activeScholarshipTab && item.scholarshipType !== activeScholarshipTab) return false;

    const isFullyDisbursed = item.stipend && item.stipend.monthlyStatus && item.stipend.monthlyStatus.every(m => m.status === 'Disbursed');
    if (isFullyDisbursed) return false;

    return true;
  });

  const firstItem = list[0];
  const isMonthly = firstItem ? (firstItem.stipend ? firstItem.stipend.type === 'monthly' : true) : true;

  if (isMonthly) {
    if (monthTabContainer) {
      monthTabContainer.classList.remove('hidden');
      const termLabel = firstItem && firstItem.stipend ? firstItem.stipend.term : 'Term 3';
      monthTabContainer.innerHTML = [1, 2, 3, 4].map(m => {
        const monthName = getTermMonthName(termLabel, m);
        return `
          <div class="stipend-month-tab ${activeMonthTab === m ? 'active' : ''}" data-month="${m}">
            Month ${m} (${monthName})
          </div>
        `;
      }).join('');

      monthTabContainer.querySelectorAll('.stipend-month-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          activeMonthTab = parseInt(tab.getAttribute('data-month'));
          renderStipendLedgerTable();
        });
      });
    }
    if (autoDisburseBtn) {
      const termLabel = firstItem && firstItem.stipend ? firstItem.stipend.term : 'Term 3';
      const monthName = getTermMonthName(termLabel, activeMonthTab);
      autoDisburseBtn.innerHTML = `<i class="bx bx-bolt-circle"></i> Auto-Disburse All (${monthName})`;
    }
  } else {
    if (monthTabContainer) {
      monthTabContainer.classList.add('hidden');
    }
    activeMonthTab = 1;
    if (autoDisburseBtn) {
      autoDisburseBtn.innerHTML = `<i class="bx bx-bolt-circle"></i> Auto-Disburse All (Term Grant)`;
    }
  }

  if (searchVal) {
    list = list.filter(item => {
      const sId = String(item.studentId || item.id || '').toLowerCase();
      const sName = String(item.studentName || item.name || '').toLowerCase();
      return sId.includes(searchVal) || sName.includes(searchVal);
    });
  }

  if (collegeVal !== 'ALL') {
    list = list.filter(item => {
      const col = (item.college || '').toUpperCase();
      return col === collegeVal;
    });
  }

  if (batchVal !== 'ALL') {
    list = list.filter(item => {
      const bid = String(item.studentId || item.id || '');
      const batchYear = item.batch_year || item.batchYear || (bid.length >= 3 ? bid.substring(0, 3) : '');
      return String(batchYear) === batchVal;
    });
  }

  if (statusVal !== 'ALL') {
    list = list.filter(item => {
      if (!item.stipend || !item.stipend.monthlyStatus) return false;
      const monthStip = item.stipend.monthlyStatus.find(m => m.month === activeMonthTab);
      const status = monthStip ? monthStip.status : 'Pending';
      if (statusVal === 'PENDING') return status === 'Pending';
      if (statusVal === 'DISBURSED') return status === 'Disbursed';
      return true;
    });
  }

  list.sort((a, b) => {
    const aId = String(a.studentId || a.id || '');
    const bId = String(b.studentId || b.id || '');
    const aName = String(a.studentName || a.name || '');
    const bName = String(b.studentName || b.name || '');

    if (sortVal === 'NEWEST') {
      return bId.localeCompare(aId);
    } else if (sortVal === 'OLDEST') {
      return aId.localeCompare(bId);
    } else if (sortVal === 'ALPHA_ASC') {
      return aName.localeCompare(bName);
    } else if (sortVal === 'ALPHA_DESC') {
      return bName.localeCompare(aName);
    }
    return 0;
  });

  tableBody.innerHTML = '';
  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 2rem;">
          No pending scholars match the selected filters and tab.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(item => {
    const sId = item.studentId || item.id || '--';
    const sName = item.studentName || item.name || '--';
    const sType = item.scholarshipType || 'Scholarship';
    const rStatus = item.renewalStatus || 'Active';

    let status = 'Pending';
    let amount = 8000;
    let refNum = null;
    let termLabel = CURRENT_ACADEMIC_TERM_LABEL;

    if (item.stipend) {
      termLabel = item.stipend.term || CURRENT_ACADEMIC_TERM_LABEL;
      if (item.stipend.monthlyStatus) {
        const monthStip = item.stipend.monthlyStatus.find(m => m.month === activeMonthTab);
        if (monthStip) {
          status = monthStip.status || 'Pending';
          amount = monthStip.amount || 8000;
          refNum = monthStip.reference_number || monthStip.referenceNumber || null;
        }
      }
    }

    const isDisbursed = status === 'Disbursed';

    let actionBtnHtml = '';
    if (isDisbursed) {
      actionBtnHtml = `
        <span class="badge badge-success" style="font-size: 0.85rem; padding: 0.4rem 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;">
          <i class="bx bx-check-circle"></i> Disbursed
        </span>
      `;
    } else {
      actionBtnHtml = `
        <button class="btn btn-outline text-warning btn-disburse-action" 
          data-stud-id="${sId}" 
          data-stud-name="${sName}"
          data-sch="${sType}"
          data-term="${termLabel}" 
          data-month="${activeMonthTab}" 
          data-amount="${amount}"
          style="padding: 0.4rem 1rem; font-size: 0.85rem; border-radius: 6px;">
          Disburse
        </button>
      `;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${sId}</strong></td>
      <td>${sName}</td>
      <td>${sType}</td>
      <td><span class="badge badge-success">${rStatus}</span></td>
      <td><code style="font-weight: 600; font-size: 0.85rem;">${refNum || '--'}</code></td>
      <td>${actionBtnHtml}</td>
    `;
    tableBody.appendChild(row);
  });

  tableBody.querySelectorAll('.btn-disburse-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const studentId = btn.getAttribute('data-stud-id');
      const studentName = btn.getAttribute('data-stud-name');
      const scholarship = btn.getAttribute('data-sch');
      const term = btn.getAttribute('data-term');
      const monthIndex = parseInt(btn.getAttribute('data-month'));
      const amount = parseFloat(btn.getAttribute('data-amount'));
      
      triggerConfirmationModal(studentId, studentName, scholarship, term, monthIndex, amount);
    });
  });
}

function triggerConfirmationModal(studentId, studentName, scholarship, term, monthIndex, amount) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomCode = '';
  for (let i = 0; i < 7; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const referenceNumber = `STP-${year}-${month}-${day}-${randomCode}`;

  const isMonthly = !scholarship.toLowerCase().includes('animo');
  const cycleLabel = isMonthly ? `Month ${monthIndex} (${getTermMonthName(term, monthIndex)})` : 'Term Grant';

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'iskolaris-modal-overlay';
  modalOverlay.id = 'confirmation-modal-overlay';

  modalOverlay.innerHTML = `
    <div class="iskolaris-modal">
      <div class="iskolaris-modal-header">
        <h4>Confirm Stipend Disbursement</h4>
      </div>
      <div class="iskolaris-modal-body">
        <p class="iskolaris-modal-question">Are you sure you want to proceed with disbursing the stipend for this scholar?</p>
        <div class="iskolaris-modal-details-grid">
          <div class="details-label">Scholar Name</div>
          <div class="details-val">${studentName}</div>
          
          <div class="details-label">Student ID</div>
          <div class="details-val">${studentId}</div>
          
          <div class="details-label">Scholarship</div>
          <div class="details-val">${scholarship}</div>
          
          <div class="details-label">Cycle/Month</div>
          <div class="details-val">${cycleLabel}</div>
          
          <div class="details-label">Disburse Amount</div>
          <div class="details-val" style="font-weight: 700; color: var(--accent);">₱${amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          
          <div class="details-label">Ref Number</div>
          <div class="details-val"><code style="font-weight: 700; color: var(--primary); font-size: 0.95rem;">${referenceNumber}</code></div>
        </div>
      </div>
      <div class="iskolaris-modal-footer">
        <button id="btn-modal-back" class="btn btn-outline" style="border: 1px solid var(--border-color); color: var(--text-muted);">Back</button>
        <button id="btn-modal-proceed" class="btn btn-primary" style="background-color: var(--primary); color: white;">Proceed</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  document.getElementById('btn-modal-back').addEventListener('click', () => {
    modalOverlay.remove();
  });

  document.getElementById('btn-modal-proceed').addEventListener('click', async () => {
    const proceedBtn = document.getElementById('btn-modal-proceed');
    proceedBtn.disabled = true;
    proceedBtn.textContent = 'Processing...';
    
    try {
      const res = await fetch('/api/admin/disburse-stipend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          term,
          monthIndex,
          amount,
          referenceNumber
        })
      });
      const resData = await res.json();
      if (resData.success) {
        showToast('Stipend disbursed successfully and notification sent to scholar!');
        modalOverlay.remove();
        loadStipendLedger();
      } else {
        showToast(resData.message || 'Failed to disburse stipend.', true);
        proceedBtn.disabled = false;
        proceedBtn.textContent = 'Proceed';
      }
    } catch (err) {
      console.error(err);
      showToast('Error during disbursement request.', true);
      proceedBtn.disabled = false;
      proceedBtn.textContent = 'Proceed';
    }
  });
}

async function handleAutoDisburseBatch() {
  let termLabel = CURRENT_ACADEMIC_TERM_LABEL;
  let amount = 8000;

  const firstItem = stipendDataCache.find(item => {
    const isRenewed = item.renewalStatus === 'Renewed' || item.renewalStatus === 'Processed';
    if (!isRenewed) return false;
    return !activeScholarshipTab || item.scholarshipType === activeScholarshipTab;
  });

  if (firstItem) {
    if (firstItem.stipend) {
      termLabel = firstItem.stipend.term || CURRENT_ACADEMIC_TERM_LABEL;
      if (firstItem.stipend.monthlyStatus) {
        const monthStip = firstItem.stipend.monthlyStatus.find(m => m.month === activeMonthTab);
        if (monthStip) amount = monthStip.amount || 8000;
      }
    }
  }

  const isMonthly = !activeScholarshipTab.toLowerCase().includes('animo');
  const cycleText = isMonthly ? `Month ${activeMonthTab} (${getTermMonthName(termLabel, activeMonthTab)})` : 'Termly Grant';

  if (!confirm(`Are you sure you want to auto-disburse all pending scholars for "${activeScholarshipTab}" for "${cycleText}"? This will batch disburse and notify all matching scholars.`)) {
    return;
  }

  const autoBtn = document.getElementById('btn-auto-disburse-all');
  const originalHtml = autoBtn.innerHTML;
  autoBtn.disabled = true;
  autoBtn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Processing...`;

  try {
    const res = await fetch('/api/admin/auto-disburse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scholarshipName: activeScholarshipTab,
        monthIndex: activeMonthTab,
        term: termLabel,
        amount
      })
    });
    const resData = await res.json();
    if (resData.success) {
      showToast(`Batch disbursement for ${cycleText} completed successfully!`);
      loadStipendLedger();
    } else {
      showToast(resData.message || 'Auto-disbursement failed.', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Error during auto-disbursement.', true);
  } finally {
    autoBtn.disabled = false;
    autoBtn.innerHTML = originalHtml;
  }
}

// "Load Stipend Records"
async function loadStipendRecords() {
  const tableBody = document.getElementById('admin-stipend-records-table');
  const searchInput = document.getElementById('records-search-input');
  if (!tableBody) return;

  try {
    const res = await fetch(`/api/admin/stipend-records?adminType=${currentUser ? currentUser.adminType : ''}`);
    const data = await res.json();
    if (!data.success) return;

    stipendRecordsCache = data.records;

    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById('records-search-input').addEventListener('input', () => renderStipendRecordsTable());
    
    renderStipendRecordsTable();
  } catch (err) {
    console.error(err);
  }
}

function renderStipendRecordsTable() {
  const tableBody = document.getElementById('admin-stipend-records-table');
  if (!tableBody || !stipendRecordsCache) return;

  const searchVal = document.getElementById('records-search-input').value.toLowerCase().trim();

  let list = stipendRecordsCache;

  if (searchVal) {
    list = list.filter(item => {
      const sId = String(item.studentId || '').toLowerCase();
      const sName = String(item.studentName || '').toLowerCase();
      const refNum = String(item.referenceNumber || '').toLowerCase();
      return sId.includes(searchVal) || sName.includes(searchVal) || refNum.includes(searchVal);
    });
  }

  tableBody.innerHTML = '';
  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
          No disbursed stipend records found.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(item => {
    const row = document.createElement('tr');
    
    const formattedAmount = parseFloat(item.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const formattedDate = item.dateDisbursed || '--';

    row.innerHTML = `
      <td><strong>${item.studentId}</strong></td>
      <td>${item.studentName}</td>
      <td>${item.scholarshipType}</td>
      <td>${item.termLabel}</td>
      <td>₱${formattedAmount}</td>
      <td>${formattedDate}</td>
      <td><code style="font-weight: 700; color: var(--primary); font-size: 0.85rem;">${item.referenceNumber}</code></td>
    `;
    tableBody.appendChild(row);
  });
}

// "Load Reports Data"
async function loadReportsData() {
  if (!document.getElementById('rep-active-scholars')) return;

  try {
    const res = await fetch(`/api/admin/stipends?adminType=${currentUser ? currentUser.adminType : ''}`);
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

// "Load Admin Home Data"
async function loadAdminHomeData() {
  const stipendsDash = document.getElementById('home-stipends-dashboard');
  const adsoDash = document.getElementById('home-adso-dashboard');
  const adminType = currentUser ? currentUser.adminType : '';

  if (adminType === 'AdSO') {
    if (stipendsDash) stipendsDash.classList.add('hidden');
    if (adsoDash) adsoDash.classList.remove('hidden');
    await loadAdsoDashboardData();
    return;
  } else {
    if (stipendsDash) stipendsDash.classList.remove('hidden');
    if (adsoDash) adsoDash.classList.add('hidden');
  }

  const totalScholarsEl = document.getElementById('home-stat-total-scholars');
  if (!totalScholarsEl) return;

  const disbursedTermEl = document.getElementById('home-stat-disbursed-term');
  if (disbursedTermEl) {
    disbursedTermEl.textContent = CURRENT_ACADEMIC_TERM_LABEL;
  }

  const totalDisbursedEl = document.getElementById('home-stat-total-disbursed');
  const totalPendingEl = document.getElementById('home-stat-total-pending');
  const pendingSubEl = document.getElementById('home-stat-total-pending-sub');
  const monthlyListEl = document.getElementById('home-monthly-breakdown');
  const scholarshipListEl = document.getElementById('home-scholarship-breakdown');

  try {
    const adminType = currentUser ? currentUser.adminType : '';
    const res = await fetch(`/api/admin/stipends?adminType=${adminType}`);
    const data = await res.json();
    if (!data.success) return;

    // Filter list for only active renewed scholars
    const list = data.stipends.filter(item => {
      return item.renewalStatus === 'Renewed' || item.renewalStatus === 'Processed';
    });

    if (pendingSubEl) {
      pendingSubEl.textContent = adminType === 'DOST' ? 'Awaiting DOST dispatch' : 'Awaiting FAO dispatch';
    }

    // 1. Calculate General Sums
    const totalActiveScholars = list.length;
    let totalDisbursed = 0;
    let totalPending = 0;

    list.forEach(item => {
      if (item.stipend && item.stipend.monthlyStatus) {
        item.stipend.monthlyStatus.forEach(m => {
          if (m.status === 'Disbursed') {
            totalDisbursed += m.amount;
          } else {
            totalPending += m.amount;
          }
        });
      }
    });

    totalScholarsEl.textContent = totalActiveScholars;
    totalDisbursedEl.textContent = `₱${totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalPendingEl.textContent = `₱${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 2. Count Needing Disbursement per Month (1 to 4)
    // Resolve the active term label
    const termLabel = list[0] && list[0].stipend ? list[0].stipend.term : CURRENT_ACADEMIC_TERM_LABEL;

    let monthlyPendingHtml = '';
    const maxMonths = 4;
    for (let m = 1; m <= maxMonths; m++) {
      let pendingForMonth = 0;
      let totalForMonth = 0;

      list.forEach(item => {
        const isMonthlyItem = item.stipend ? item.stipend.type === 'monthly' : true;
        if (!isMonthlyItem && m > 1) return; // skip for months 2-4 if termly

        totalForMonth++;
        if (item.stipend && item.stipend.monthlyStatus) {
          const monthStip = item.stipend.monthlyStatus.find(ms => ms.month === m);
          if (monthStip && monthStip.status === 'Pending') {
            pendingForMonth++;
          }
        }
      });

      if (totalForMonth === 0) continue;

      const monthName = getTermMonthName(termLabel, m);
      const label = maxMonths === 4 ? `Month ${m} (${monthName})` : 'Term Grant';
      const disbursedCount = totalForMonth - pendingForMonth;
      const progressPct = totalForMonth > 0 ? Math.round((disbursedCount / totalForMonth) * 100) : 100;

      monthlyPendingHtml += `
        <div class="monthly-breakdown-item">
          <div class="breakdown-header">
            <span class="breakdown-title"><i class="bx bx-calendar-event" style="color: var(--primary);"></i> ${label}</span>
            <span class="breakdown-count">${pendingForMonth} Pending</span>
          </div>
          <div class="breakdown-progress-container">
            <div class="breakdown-progress-bar" style="width: ${progressPct}%;"></div>
          </div>
          <div class="breakdown-header" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">
            <span>Disbursed: ${disbursedCount}/${totalForMonth} scholars</span>
            <span>${progressPct}% Complete</span>
          </div>
        </div>
      `;
    }
    if (monthlyListEl) {
      monthlyListEl.innerHTML = monthlyPendingHtml || '<p class="text-center text-muted">No pending disbursement data.</p>';
    }

    // 3. Scholarship Breakdown (Count active Renewed scholars per scholarship)
    const schCounts = {};
    list.forEach(item => {
      const schType = item.scholarshipType || 'Scholarship Program';
      schCounts[schType] = (schCounts[schType] || 0) + 1;
    });

    let scholarshipHtml = '';
    Object.entries(schCounts).forEach(([schName, count]) => {
      const schPct = totalActiveScholars > 0 ? Math.round((count / totalActiveScholars) * 100) : 100;
      scholarshipHtml += `
        <div class="scholarship-breakdown-item">
          <div class="breakdown-header">
            <span class="breakdown-title"><i class="bx bx-award" style="color: var(--accent);"></i> ${schName}</span>
            <span class="breakdown-count" style="color: var(--accent);">${count} Active</span>
          </div>
          <div class="breakdown-progress-container">
            <div class="breakdown-progress-bar" style="width: ${schPct}%; background: linear-gradient(90deg, var(--accent), #10b981);"></div>
          </div>
        </div>
      `;
    });
    if (scholarshipListEl) {
      scholarshipListEl.innerHTML = scholarshipHtml || '<p class="text-center text-muted">No scholarship counts.</p>';
    }

    // 4. Donut Chart - Disbursement Progress for the Resolved Current Month
    const currentMonthIndex = getCurrentTermMonthIndex(termLabel);
    const monthName = getTermMonthName(termLabel, currentMonthIndex);
    
    // Count disbursed vs pending for this current month index
    let disbursedCount = 0;
    let pendingCount = 0;

    list.forEach(item => {
      const isMonthlyItem = item.stipend ? item.stipend.type === 'monthly' : true;
      const targetMonthIndex = isMonthlyItem ? currentMonthIndex : 1;

      if (item.stipend && item.stipend.monthlyStatus) {
        const monthStip = item.stipend.monthlyStatus.find(ms => ms.month === targetMonthIndex);
        if (monthStip) {
          if (monthStip.status === 'Disbursed') disbursedCount++;
          else pendingCount++;
        }
      }
    });

    const chartTitleEl = document.getElementById('home-chart-title');
    if (chartTitleEl) {
      chartTitleEl.textContent = `Disbursement Progress (${monthName})`;
    }

    renderHomeDonutChart(disbursedCount, pendingCount, monthName);

  } catch (err) {
    console.error(err);
  }
}

let homeDonutChartInstance = null;
function renderHomeDonutChart(disbursedCount, pendingCount, labelName) {
  const canvas = document.getElementById('homeDisbursementDonutChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (homeDonutChartInstance) {
    homeDonutChartInstance.destroy();
  }

  const total = disbursedCount + pendingCount;
  if (total === 0) {
    homeDonutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Active Scholars'],
        datasets: [{
          data: [1],
          backgroundColor: ['#202D3E'],
          borderColor: 'transparent'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
    return;
  }

  const disbursedPct = Math.round((disbursedCount / total) * 100);
  const pendingPct = Math.round((pendingCount / total) * 100);

  const greenColor = '#00704e';
  const yellowColor = '#f59e0b';

  homeDonutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Disbursed', 'Pending'],
      datasets: [{
        data: [disbursedCount, pendingCount],
        backgroundColor: [greenColor, yellowColor],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = Math.round((val / total) * 100);
              return ` ${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });

  const legendEl = document.getElementById('home-chart-legend');
  if (legendEl) {
    legendEl.innerHTML = `
      <div class="legend-item">
        <div class="legend-color-label">
          <span class="legend-dot" style="background-color: ${greenColor};"></span>
          <span>Disbursed</span>
        </div>
        <span class="legend-value">${disbursedCount} (${disbursedPct}%)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color-label">
          <span class="legend-dot" style="background-color: ${yellowColor};"></span>
          <span>Pending</span>
        </div>
        <span class="legend-value">${pendingCount} (${pendingPct}%)</span>
      </div>
    `;
  }
}

function getCurrentTermMonthIndex(termLabel) {
  let termNum = 3;
  if (termLabel) {
    const match = termLabel.match(/Term\s*(\d)/i) || termLabel.match(/T\s*(\d)/i);
    if (match) termNum = parseInt(match[1]);
  }
  const currentRealMonth = new Date().getMonth();
  if (termNum === 1) {
    if (currentRealMonth >= 8 && currentRealMonth <= 11) return currentRealMonth - 8 + 1;
    return 4;
  } else if (termNum === 2) {
    if (currentRealMonth >= 0 && currentRealMonth <= 3) return currentRealMonth + 1;
    return 4;
  } else {
    if (currentRealMonth >= 4 && currentRealMonth <= 7) return currentRealMonth - 4 + 1;
    return 4;
  }
}

// "Load AdSO Dashboard Data"
async function loadAdsoDashboardData() {
  const onboardEl = document.getElementById('adso-stat-pending-onboarding');
  if (!onboardEl) return;

  const renewalsEl = document.getElementById('adso-stat-pending-renewals');
  const appealsEl = document.getElementById('adso-stat-pending-appeals');
  const breakdownListEl = document.getElementById('adso-scholarship-breakdown-list');

  try {
    const res = await fetch('/api/admin/adso-dashboard-stats');
    const data = await res.json();
    if (!data.success) return;

    // 1. Populate metric boxes
    onboardEl.textContent = data.pendingOnboarding;
    renewalsEl.textContent = data.pendingRenewals;
    appealsEl.textContent = data.pendingAppeals;

    // 2. Render Scholarship breakdown cards with sub-status counts
    let breakdownHtml = '';
    
    Object.entries(data.breakdown || {}).forEach(([schName, stats]) => {
      const totalCount = stats.unverified + stats.renewed + stats.probation + stats.appeal + stats.terminated;
      breakdownHtml += `
        <div class="adso-breakdown-card">
          <div class="adso-card-title-row">
            <span class="adso-card-title"><i class="bx bx-award" style="color: var(--primary);"></i> ${schName}</span>
            <span class="adso-card-total">Total: ${totalCount}</span>
          </div>
          <div class="adso-status-grid">
            <div class="adso-status-cell adso-cell-unverified">
              <span class="adso-cell-label">Unverified</span>
              <span class="adso-cell-val">${stats.unverified}</span>
            </div>
            <div class="adso-status-cell adso-cell-renewed">
              <span class="adso-cell-label">Renewed</span>
              <span class="adso-cell-val">${stats.renewed}</span>
            </div>
            <div class="adso-status-cell adso-cell-probation">
              <span class="adso-cell-label">Probation</span>
              <span class="adso-cell-val">${stats.probation}</span>
            </div>
            <div class="adso-status-cell adso-cell-appeal">
              <span class="adso-cell-label">Appeal</span>
              <span class="adso-cell-val">${stats.appeal}</span>
            </div>
            <div class="adso-status-cell adso-cell-terminated">
              <span class="adso-cell-label">Terminated</span>
              <span class="adso-cell-val">${stats.terminated}</span>
            </div>
          </div>
        </div>
      `;
    });

    if (breakdownListEl) {
      breakdownListEl.innerHTML = breakdownHtml || '<p class="text-center text-muted">No scholarship statistics available.</p>';
    }

    // 3. Render Donut Chart
    const decisions = data.decisions || { renewed: 0, probation: 0, terminated: 0, processing: 0 };
    renderAdsoDonutChart(decisions.renewed, decisions.probation, decisions.terminated, decisions.processing);

  } catch (err) {
    console.error(err);
  }
}

let adsoDonutChartInstance = null;
function renderAdsoDonutChart(renewed, probation, terminated, processing) {
  const canvas = document.getElementById('adsoRenewalDonutChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (adsoDonutChartInstance) {
    adsoDonutChartInstance.destroy();
  }

  const total = renewed + probation + terminated + processing;
  if (total === 0) {
    adsoDonutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Active Records'],
        datasets: [{
          data: [1],
          backgroundColor: ['#202D3E'],
          borderColor: 'transparent'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
    return;
  }

  const renewedPct = Math.round((renewed / total) * 100);
  const probationPct = Math.round((probation / total) * 100);
  const terminatedPct = Math.round((terminated / total) * 100);
  const processingPct = Math.round((processing / total) * 100);

  const greenColor = '#16a34a';
  const orangeColor = '#ea580c';
  const redColor = '#dc2626';
  const greyColor = '#94a3b8';

  adsoDonutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Renewed', 'Probation', 'Terminated', 'Processing'],
      datasets: [{
        data: [renewed, probation, terminated, processing],
        backgroundColor: [greenColor, orangeColor, redColor, greyColor],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = Math.round((val / total) * 100);
              return ` ${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });

  const legendEl = document.getElementById('adso-chart-legend');
  if (legendEl) {
    legendEl.innerHTML = `
      <div class="legend-item">
        <div class="legend-color-label">
          <span class="legend-dot" style="background-color: ${greenColor};"></span>
          <span>Renewed</span>
        </div>
        <span class="legend-value">${renewed} (${renewedPct}%)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color-label">
          <span class="legend-dot" style="background-color: ${orangeColor};"></span>
          <span>Probation</span>
        </div>
        <span class="legend-value">${probation} (${probationPct}%)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color-label">
          <span class="legend-dot" style="background-color: ${redColor};"></span>
          <span>Terminated</span>
        </div>
        <span class="legend-value">${terminated} (${terminatedPct}%)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color-label">
          <span class="legend-dot" style="background-color: ${greyColor};"></span>
          <span>Processing</span>
        </div>
        <span class="legend-value">${processing} (${processingPct}%)</span>
      </div>
    `;
  }
}
