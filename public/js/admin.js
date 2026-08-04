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

        row.innerHTML = `
          <td><strong>${r.student_name || r.studentName}</strong><br><small class="text-muted">${r.student_id || r.studentId}</small></td>
          <td>${r.scholarship_name || r.scholarshipType || 'Scholarship'}<br><small class="text-muted">${r.term_label || r.term || 'Term'}</small></td>
          <td>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:12px;margin:0;">CGPA</label>
              <input type="text" class="input-cgpa" value="${sCgpa.toFixed(3)}" style="width:100px;padding:6px;border-radius:4px;border:1px solid #ddd;" />
              <label style="font-size:12px;margin:0;">TGPA</label>
              <input type="text" class="input-tgpa" value="${sTgpa.toFixed(3)}" style="width:80px;padding:4px;border-radius:4px;border:1px solid #ddd;font-size:12px;${isCurrentOrFuture ? 'background:#f0f0f0;color:#666;' : ''}" ${isCurrentOrFuture ? 'readonly' : ''} />
            </div>
          </td>
          <td>
            <a href="/${r.eaf_file || r.eafFile}" target="_blank" class="btn btn-outline btn-small margin-bottom block text-center"><i class="bx bx-file"></i> View EAF</a>
            <a href="/${r.grades_file || r.gradesFile}" target="_blank" class="btn btn-outline btn-small block text-center"><i class="bx bx-bar-chart-alt"></i> View Grades</a>
          </td>
          <td>
            <div class="insight-badge ${eafClass}" style="margin-bottom: 6px;">
              <i class="bx bx-file"></i> EAF: <strong>${r.eaf_status || 'NOT VERIFIED'}</strong>
            </div>
            <div class="insight-badge ${gradesClass}">
              <i class="bx bx-analyse"></i> Grades: <strong>${r.grades_status || 'NOT VERIFIED'}</strong>
            </div>
          </td>
          <td class="text-right">
            <div class="action-row margin-bottom">
              <button class="btn btn-outline btn-small btn-edit-grades" data-sid="${r.student_id || r.studentId}"><i class="bx bx-edit"></i> Edit Grades</button>
              <button class="btn btn-success btn-small btn-renew" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}"><i class="bx bx-check-double"></i> Verify & Renew</button>
              <button class="btn btn-outline btn-small text-warning btn-probation" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}"><i class="bx bx-shield-x"></i> Probation</button>
              <button class="btn btn-dark btn-small btn-invalid" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}"><i class="bx bx-x-circle"></i> Tag as Invalid</button>
            </div>
            <div class="action-row">
              <button class="btn btn-danger btn-small btn-terminate" data-id="${r.id}" data-sid="${r.student_id || r.studentId}" data-tidx="${r.term_index || r.termIndex}"><i class="bx bx-trash"></i> Terminate</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });

      tableBody.querySelectorAll('.btn-renew').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Renewed', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn));
      });
      
      tableBody.querySelectorAll('.btn-probation').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'In Probation', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn));
      });
      tableBody.querySelectorAll('.btn-invalid').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Invalid Submission', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn));
      });
      tableBody.querySelectorAll('.btn-terminate').forEach(btn => {
        btn.addEventListener('click', () => handleRenewalAction(btn.getAttribute('data-id'), 'Terminated', btn.getAttribute('data-sid'), btn.getAttribute('data-tidx'), btn));
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
          <td><strong>${a.student_name || a.studentName}</strong><br><small class="text-muted">${a.student_id || a.studentId}</small></td>
          <td>${a.scholarship_name || a.scholarshipType || 'Scholarship'}<br><small class="text-muted">${a.term_label || a.term || 'Term'}</small></td>
          <td>${historyCount} appeal${historyCount === 1 ? '' : 's'} in history</td>
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
              <button class="btn btn-danger btn-small btn-app-reject" data-id="${a.id}"><i class="bx bx-x"></i> Terminate Scholarship</button>
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
    const res = await fetch(`/api/admin/stipends?adminType=${currentUser ? currentUser.adminType : ''}`);
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
                ${s.type === 'monthly' ? getTermMonthName(s.term, m.month) : 'Term Grant'}: 
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
