/* MASTER ADMIN MODULE */
function toggleForgetModal(show) {
  document.getElementById('forgetModal').style.display = show ? 'flex' : 'none';
}

function submitPasswordResetRequest() {
  const email = document.getElementById('forgetEmailInput').value.trim().toLowerCase();
  if (!email) return alert('Please enter a valid email address!');

  let reqs = JSON.parse(localStorage.getItem('noon_ops_reset_requests') || "[]");
  reqs.push({ email: email, requestTime: new Date().toLocaleTimeString() + ' (' + new Date().toLocaleDateString() + ')' });
  localStorage.setItem('noon_ops_reset_requests', JSON.stringify(reqs));

  alert('Password reset request submitted successfully!');
  toggleForgetModal(false);
}

function renderResetRequestsTable() {
  const reqs = JSON.parse(localStorage.getItem('noon_ops_reset_requests') || "[]");
  const tbody = document.getElementById('resetRequestsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (reqs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-msg">No pending password reset requests.</td></tr>`;
    return;
  }

  reqs.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${r.email}</strong></td>
      <td>${r.requestTime}</td>
      <td><button class="btn btn-green" style="padding:4px 8px; font-size:10px;" onclick="fulfillResetRequest('${r.email}', ${idx})">🔑 Reset Passcode</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function fulfillResetRequest(email, index) {
  const newPass = prompt(`Enter New Passcode for ${email}:`, "Pass" + Math.floor(1000 + Math.random() * 9000));
  if (!newPass) return;

  let users = getStoredUsers();
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
    user.passcode = newPass;
    saveStoredUsers(users);

    let reqs = JSON.parse(localStorage.getItem('noon_ops_reset_requests') || "[]");
    reqs.splice(index, 1);
    localStorage.setItem('noon_ops_reset_requests', JSON.stringify(reqs));

    renderAdminUserTable();
    renderResetRequestsTable();
    alert(`New Passcode generated for ${email}!`);
  }
}

function renderAdminTelemetryTable() {
  const tbody = document.getElementById('adminTelemetryTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const liveSessions = JSON.parse(localStorage.getItem('noon_ops_live_telemetry') || "[]");
  const now = Date.now();

  const activeCount = liveSessions.filter(s => (now - s.lastPingTimestamp) < 12000).length;
  if (document.getElementById('adminStatActiveSessions')) {
    document.getElementById('adminStatActiveSessions').innerText = activeCount;
  }

  if (liveSessions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No active session telemetry recorded yet.</td></tr>`;
    return;
  }

  liveSessions.forEach((session) => {
    const isLive = (now - session.lastPingTimestamp) < 12000;
    const statusBadge = isLive 
      ? `<span class="badge-status" style="background:#dcfce7; color:#15803d; font-weight:900;">🟢 LIVE ONLINE</span>`
      : `<span class="badge-alert" style="background:#f3f4f6; color:#64748b;">🔴 OFFLINE</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${session.email}</strong></td>
      <td>${statusBadge}</td>
      <td><strong style="color:var(--blue-accent);">${session.deviceType}</strong></td>
      <td><strong>${session.deviceModel}</strong></td>
      <td>${session.browser}</td>
      <td>${session.screen} (${session.orientation})</td>
      <td><strong style="color:var(--green-accent);">${session.lastActiveTime}</strong></td>
      <td><span class="badge-role">${session.role}</span></td>
      <td><button class="btn btn-red" style="padding:3px 6px; font-size:10px;" onclick="forceKickUser('${session.email}')">🚫 Kick</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function forceKickUser(email) {
  let logs = JSON.parse(localStorage.getItem('noon_ops_live_telemetry') || "[]");
  logs = logs.filter(l => l.email !== email);
  localStorage.setItem('noon_ops_live_telemetry', JSON.stringify(logs));
  renderAdminTelemetryTable();
  alert(`Session for ${email} terminated!`);
}

function renderAdminUserTable() {
  const users = getStoredUsers();
  const tbody = document.getElementById('adminUserTableBody');

  if (document.getElementById('adminStatUserCount')) document.getElementById('adminStatUserCount').innerText = users.length;
  if (document.getElementById('adminStatActiveAdmins')) document.getElementById('adminStatActiveAdmins').innerText = users.filter(u => u.role === 'ADMIN').length;

  if (!tbody) return;
  tbody.innerHTML = '';

  users.forEach((u, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.email}</strong></td>
      <td><code style="background:var(--border-color); padding:2px 6px; border-radius:4px;">${u.passcode}</code></td>
      <td><span class="badge-role" style="background:${u.role === 'ADMIN' ? 'var(--warning-yellow)' : 'var(--blue-accent)'};">${u.role}</span></td>
      <td><span class="telemetry-code">${(u.tabs || []).join(', ')}</span></td>
      <td><span class="${u.status === 'ACTIVE' ? 'badge-status' : 'badge-alert'}">${u.status}</span></td>
      <td><button class="btn btn-dark" style="padding:4px 8px; font-size:10px;" onclick="toggleUserStatus(${index})">${u.status === 'ACTIVE' ? '⏸️ Disable' : '▶️ Activate'}</button></td>
      <td><button class="btn btn-red" style="padding:4px 8px; font-size:10px;" onclick="deleteUser(${index})">🗑️ Revoke</button></td>
    `;
    tbody.appendChild(tr);
  });

  const cfgSheet = document.getElementById('cfgSheetIdInput');
  if (cfgSheet && typeof SHEET_ID !== 'undefined') cfgSheet.value = SHEET_ID;
  const cfgGid = document.getElementById('cfgGidInput');
  if (cfgGid && typeof GID_ID !== 'undefined') cfgGid.value = GID_ID;
}

function toggleUserStatus(index) {
  let users = getStoredUsers();
  users[index].status = (users[index].status === 'ACTIVE') ? 'DISABLED' : 'ACTIVE';
  saveStoredUsers(users);
  renderAdminUserTable();
}

function registerUserByAdmin() {
  const emailInput = document.getElementById('newAdminEmail');
  const passInput = document.getElementById('newAdminPasscode');
  const roleInput = document.getElementById('newAdminRole');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim();
  const passcode = passInput.value.trim();
  const role = roleInput ? roleInput.value : 'USER';

  let tabs = [];
  if (document.getElementById('accessBarcode')?.checked) tabs.push('barcode');
  if (document.getElementById('accessPace')?.checked) tabs.push('pace');
  if (document.getElementById('accessTrips')?.checked) tabs.push('trips');
  if (role === 'ADMIN') tabs.push('admin');

  if (!email || !passcode) return alert('Please enter valid email and passcode!');

  const users = getStoredUsers();
  users.push({ email: email, passcode: passcode, role: role, tabs: tabs, status: "ACTIVE" });
  saveStoredUsers(users);
  renderAdminUserTable();

  emailInput.value = '';
  passInput.value = '';
  alert(`User ${email} created successfully!`);
}

function deleteUser(index) {
  let users = getStoredUsers();
  if (users.length <= 1) return alert('Cannot delete the last remaining user account!');
  users.splice(index, 1);
  saveStoredUsers(users);
  renderAdminUserTable();
}

function saveSheetConfig() {
  const sheetInput = document.getElementById('cfgSheetIdInput')?.value.trim();
  const gidInput = document.getElementById('cfgGidInput')?.value.trim();

  if (typeof SHEET_ID !== 'undefined' && sheetInput) SHEET_ID = sheetInput;
  if (typeof GID_ID !== 'undefined' && gidInput) GID_ID = gidInput;

  if (typeof fetchGoogleSheetData === 'function') fetchGoogleSheetData();
  alert('Google Sheet Configuration Updated!');
}
