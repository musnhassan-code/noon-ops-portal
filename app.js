/* THEME MODE MANAGEMENT (LIGHT / DARK) */
function initTheme() {
  const savedTheme = localStorage.getItem('noon_ops_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButtonText(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('noon_ops_theme', newTheme);
  updateThemeButtonText(newTheme);
}

function updateThemeButtonText(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  }
}

/* SECURITY & USER ACCESS DATABASE CONFIGURATION */
let defaultUsers = [
  { email: "admin@noon.com", passcode: "admin123", role: "ADMIN", tabs: ["barcode", "pace", "trips", "admin"], status: "ACTIVE" },
  { email: "user@noon.com", passcode: "1234", role: "USER", tabs: ["barcode", "trips"], status: "ACTIVE" }
];

function getStoredUsers() {
  let stored = localStorage.getItem('noon_ops_user_db');
  if (!stored) {
    localStorage.setItem('noon_ops_user_db', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(stored);
}

function saveStoredUsers(usersArr) {
  localStorage.setItem('noon_ops_user_db', JSON.stringify(usersArr));
}

/* TELEMETRY LOGS */
function captureDeviceTelemetry(user) {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (ua.indexOf("Win") !== -1) os = "Windows OS";
  if (ua.indexOf("Mac") !== -1) os = "macOS";
  if (ua.indexOf("Linux") !== -1) os = "Linux";
  if (ua.indexOf("Android") !== -1) os = "Android OS";
  if (ua.indexOf("like Mac") !== -1) os = "iOS (iPhone)";

  let browser = "Unknown Browser";
  if (ua.indexOf("Chrome") !== -1) browser = "Google Chrome";
  else if (ua.indexOf("Safari") !== -1) browser = "Apple Safari";
  else if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
  else if (ua.indexOf("Edg") !== -1) browser = "Microsoft Edge";

  const telemetryObj = {
    email: user.email,
    role: user.role,
    os: os,
    browser: browser,
    screen: `${window.screen.width}x${window.screen.height}`,
    loginTime: new Date().toLocaleTimeString(),
    lastActive: new Date().toLocaleTimeString(),
    ip: "Local Session / Client Device"
  };

  sessionStorage.setItem('noon_ops_current_telemetry', JSON.stringify(telemetryObj));
  
  let logs = JSON.parse(localStorage.getItem('noon_ops_telemetry_logs') || "[]");
  logs = logs.filter(l => l.email !== user.email);
  logs.unshift(telemetryObj);
  localStorage.setItem('noon_ops_telemetry_logs', JSON.stringify(logs));
}

function checkAuthSession() {
  const activeSession = sessionStorage.getItem('noon_ops_auth_user');
  if (activeSession) {
    const user = JSON.parse(activeSession);
    
    const userDb = getStoredUsers();
    const currentUserState = userDb.find(u => u.email.toLowerCase() === user.email.toLowerCase());

    if (!currentUserState || currentUserState.status !== "ACTIVE") {
      alert('⚠️ Your account has been disabled or revoked by Master Admin.');
      logoutSession();
      return;
    }

    document.getElementById('authOverlay').style.display = 'none';
    setupUserInterface(currentUserState);
    captureDeviceTelemetry(currentUserState);
  } else {
    document.getElementById('authOverlay').style.display = 'flex';
  }
}

function handleAuthKey(e) {
  if (e.key === 'Enter') validateLogin();
}

function validateLogin() {
  const email = document.getElementById('authEmailInput').value.trim().toLowerCase();
  const passcode = document.getElementById('authPasscodeInput').value.trim();
  const errorMsg = document.getElementById('authErrorMsg');

  const userDb = getStoredUsers();
  const matchedUser = userDb.find(u => u.email.toLowerCase() === email && u.passcode === passcode && u.status === "ACTIVE");

  if (matchedUser) {
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(matchedUser));
    document.getElementById('authOverlay').style.display = 'none';
    errorMsg.style.display = 'none';
    setupUserInterface(matchedUser);
    captureDeviceTelemetry(matchedUser);
  } else {
    errorMsg.style.display = 'block';
    document.getElementById('authPasscodeInput').value = '';
  }
}

function setupUserInterface(user) {
  document.getElementById('userPillEmail').innerText = user.email;
  document.getElementById('userPillRole').innerText = user.role;

  buildDynamicNavTabs(user);

  if (user.role === 'ADMIN') {
    renderAdminUserTable();
    renderAdminTelemetryTable();
    renderResetRequestsTable();
  }
}

function buildDynamicNavTabs(user) {
  const navContainer = document.getElementById('navbarTabs');
  navContainer.innerHTML = '';

  const tabDefinitions = {
    barcode: { title: '🏷️ Pallet Barcode Studio', target: 'barcodeStudio' },
    pace: { title: '📦 Pace Picking Uploader', target: 'pacePicking' },
    trips: { title: '🗂️ Trips Command Center', target: 'dataEntry' },
    admin: { title: '👑 Admin Control', target: 'adminTab' }
  };

  let allowedKeys = user.tabs || [];
  if (user.role === 'ADMIN' && !allowedKeys.includes('admin')) {
    allowedKeys.push('admin');
  }

  allowedKeys.forEach((key, index) => {
    if (tabDefinitions[key]) {
      const btn = document.createElement('button');
      btn.className = `nav-tab-btn ${index === 0 ? 'active' : ''}`;
      btn.innerText = tabDefinitions[key].title;
      btn.setAttribute('onclick', `switchMainTab('${tabDefinitions[key].target}')`);
      if (key === 'admin') btn.style.color = '#f59e0b';
      navContainer.appendChild(btn);
    }
  });

  if (allowedKeys.length > 0) {
    switchMainTab(tabDefinitions[allowedKeys[0]].target);
  }
}

function logoutSession() {
  sessionStorage.removeItem('noon_ops_auth_user');
  sessionStorage.removeItem('noon_ops_current_telemetry');
  location.reload();
}

/* FORGOT PASSWORD FLOW */
function toggleForgetModal(show) {
  document.getElementById('forgetModal').style.display = show ? 'flex' : 'none';
}

function submitPasswordResetRequest() {
  const email = document.getElementById('forgetEmailInput').value.trim().toLowerCase();
  if (!email) return alert('Please enter a valid email address!');

  const userDb = getStoredUsers();
  const user = userDb.find(u => u.email.toLowerCase() === email);

  if (!user) {
    return alert('This email is not registered in the system database.');
  }

  let reqs = JSON.parse(localStorage.getItem('noon_ops_reset_requests') || "[]");
  if (!reqs.find(r => r.email === email)) {
    reqs.push({ email: email, requestTime: new Date().toLocaleTimeString() + ' (' + new Date().toLocaleDateString() + ')' });
    localStorage.setItem('noon_ops_reset_requests', JSON.stringify(reqs));
  }

  alert('Password reset request submitted successfully! Master Admin will generate your new credentials.');
  toggleForgetModal(false);
  document.getElementById('forgetEmailInput').value = '';
}

function renderResetRequestsTable() {
  const reqs = JSON.parse(localStorage.getItem('noon_ops_reset_requests') || "[]");
  const tbody = document.getElementById('resetRequestsTableBody');
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
      <td>
        <button class="btn btn-green" style="padding:4px 8px; font-size:10px;" onclick="fulfillResetRequest('${r.email}', ${idx})">🔑 Generate & Dispatch New Passcode</button>
      </td>
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

    const subject = encodeURIComponent("Your noon MINUTES OPS Password Reset Credentials");
    const body = encodeURIComponent(`Hello,\n\nYour password reset request has been fulfilled by Master Admin.\n\nLogin URL: ${window.location.href}\nEmail: ${email}\nNew Personal Passcode: ${newPass}\n\nRegards,\nMaster Admin Control Center`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);

    renderAdminUserTable();
    renderResetRequestsTable();
    alert(`New Passcode generated and email notification opened for ${email}!`);
  }
}

/* ADMIN CONTROL PANEL FUNCTIONS */
function renderAdminTelemetryTable() {
  const telemetryLogs = JSON.parse(localStorage.getItem('noon_ops_telemetry_logs') || "[]");
  const tbody = document.getElementById('adminTelemetryTableBody');
  tbody.innerHTML = '';

  document.getElementById('adminStatActiveSessions').innerText = telemetryLogs.length;

  if (telemetryLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No active online user telemetry logs available.</td></tr>`;
    return;
  }

  telemetryLogs.forEach((log) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${log.email}</strong></td>
      <td><span class="badge-role" style="background:${log.role === 'ADMIN' ? 'var(--warning-yellow)' : 'var(--blue-accent)'};">${log.role}</span></td>
      <td><span class="telemetry-code">${log.ip}</span></td>
      <td><strong>${log.os}</strong></td>
      <td>${log.browser}</td>
      <td>${log.screen}</td>
      <td>${log.loginTime}</td>
      <td><strong style="color:var(--green-accent);">${log.lastActive}</strong></td>
      <td>
        <button class="btn btn-red" style="padding:3px 6px; font-size:10px;" onclick="forceKickUser('${log.email}')">🚫 Kick Session</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function forceKickUser(email) {
  let logs = JSON.parse(localStorage.getItem('noon_ops_telemetry_logs') || "[]");
  logs = logs.filter(l => l.email !== email);
  localStorage.setItem('noon_ops_telemetry_logs', JSON.stringify(logs));
  renderAdminTelemetryTable();
  alert(`Session for user ${email} forcibly terminated!`);
}

function renderAdminUserTable() {
  const users = getStoredUsers();
  const tbody = document.getElementById('adminUserTableBody');
  tbody.innerHTML = '';

  document.getElementById('adminStatUserCount').innerText = users.length;
  document.getElementById('adminStatActiveAdmins').innerText = users.filter(u => u.role === 'ADMIN').length;

  users.forEach((u, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.email}</strong></td>
      <td><code style="background:var(--border-color); padding:2px 6px; border-radius:4px;">${u.passcode}</code></td>
      <td><span class="badge-role" style="background:${u.role === 'ADMIN' ? 'var(--warning-yellow)' : 'var(--blue-accent)'};">${u.role}</span></td>
      <td><span class="telemetry-code">${(u.tabs || []).join(', ')}</span></td>
      <td><span class="${u.status === 'ACTIVE' ? 'badge-status' : 'badge-alert'}">${u.status}</span></td>
      <td>
        <button class="btn btn-dark" style="padding:4px 8px; font-size:10px;" onclick="toggleUserStatus(${index})">
          ${u.status === 'ACTIVE' ? '⏸️ Disable' : '▶️ Activate'}
        </button>
      </td>
      <td>
        <button class="btn btn-red" style="padding:4px 8px; font-size:10px;" onclick="deleteUser(${index})">🗑️ Revoke</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('cfgSheetIdInput').value = SHEET_ID;
  document.getElementById('cfgGidInput').value = GID_ID;
}

function toggleUserStatus(index) {
  let users = getStoredUsers();
  users[index].status = (users[index].status === 'ACTIVE') ? 'DISABLED' : 'ACTIVE';
  saveStoredUsers(users);
  renderAdminUserTable();
}

function registerUserByAdmin() {
  const email = document.getElementById('newAdminEmail').value.trim();
  const passcode = document.getElementById('newAdminPasscode').value.trim();
  const role = document.getElementById('newAdminRole').value;

  let tabs = [];
  if (document.getElementById('accessBarcode').checked) tabs.push('barcode');
  if (document.getElementById('accessPace').checked) tabs.push('pace');
  if (document.getElementById('accessTrips').checked) tabs.push('trips');
  if (role === 'ADMIN') tabs.push('admin');

  if (!email || !passcode) return alert('Please enter valid email and passcode!');

  const users = getStoredUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return alert('Email already registered!');
  }

  users.push({ email: email, passcode: passcode, role: role, tabs: tabs, status: "ACTIVE" });
  saveStoredUsers(users);
  renderAdminUserTable();

  const subject = encodeURIComponent("Your Access Credentials for noon MINUTES OPS Portal");
  const body = encodeURIComponent(`Hello,\n\nYou have been granted access to noon MINUTES OPS Portal.\n\nPortal URL: ${window.location.href}\nYour Registered Email: ${email}\nYour Personal Passcode: ${passcode}\nAllowed Access Tabs: ${tabs.join(', ')}\n\nRegards,\nMaster Admin Control Center`);
  window.open(`mailto:${email}?subject=${subject}&body=${body}`);

  document.getElementById('newAdminEmail').value = '';
  document.getElementById('newAdminPasscode').value = '';
  alert(`User ${email} granted access and email credentials dispatched! 🚀`);
}

function deleteUser(index) {
  let users = getStoredUsers();
  if (users.length <= 1) return alert('Cannot delete the last remaining user account!');
  users.splice(index, 1);
  saveStoredUsers(users);
  renderAdminUserTable();
}

function saveSheetConfig() {
  SHEET_ID = document.getElementById('cfgSheetIdInput').value.trim();
  GID_ID = document.getElementById('cfgGidInput').value.trim();
  fetchGoogleSheetData();
  alert('Google Sheet Parameter Configuration Updated! Re-synced successfully.');
}

let currentOrientation = 'landscape';
let globalBatchData = [];

let SHEET_ID = '1IRBTF7ijjyqb5JYLHYBhHVr94vm1hwyH0t9l9sxooQw';
let GID_ID = '1034377000';
let globalDataEntryRaw = [];
let filteredDataEntry = [];

function formatExcelDate(val) {
  if (!val) return "";
  let num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    let dateObj = XLSX.SSF.parse_date_code(num);
    if (dateObj) {
      let y = dateObj.y;
      let m = String(dateObj.m).padStart(2, '0');
      let d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return String(val).trim();
}

function switchMainTab(targetId) {
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

  const activeBtn = Array.from(document.querySelectorAll('.nav-tab-btn')).find(b => b.getAttribute('onclick').includes(targetId));
  if (activeBtn) activeBtn.classList.add('active');

  if (targetId === 'barcodeStudio') {
    document.getElementById('barcodeStudioView').classList.add('active');
  } else if (targetId === 'pacePicking') {
    document.getElementById('pacePickingView').classList.add('active');
  } else if (targetId === 'dataEntry') {
    document.getElementById('dataEntryView').classList.add('active');
    if(!globalDataEntryRaw.length) fetchGoogleSheetData();
  } else if (targetId === 'adminTab') {
    document.getElementById('adminTabView').classList.add('active');
    renderAdminUserTable();
    renderAdminTelemetryTable();
    renderResetRequestsTable();
  }
}

async function fetchGoogleSheetData() {
  const updatedTag = document.getElementById('lastUpdatedTag');
  updatedTag.innerText = "⏳ Connecting directly to Google Sheets API...";

  const googleLiveCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_ID}&t=${Date.now()}`;

  try {
    let response = await fetch(googleLiveCsvUrl);
    if (!response.ok) throw new Error("Could not connect to Google Sheets");
    
    let csvText = await response.text();
    let workbook = XLSX.read(csvText, { type: 'string' });
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (matrix && matrix.length > 1) {
      globalDataEntryRaw = matrix.slice(1).filter(r => r.some(c => String(c).trim() !== "")).map(r => {
        r[0] = formatExcelDate(r[0]); 
        return r;
      });
      updatedTag.innerText = `✅ Live Synced (${globalDataEntryRaw.length} rows) at ${new Date().toLocaleTimeString()}`;
    } else {
      throw new Error("No data returned from Google Sheets");
    }
  } catch (err) {
    console.error("Direct fetch error:", err);
    updatedTag.innerText = `⚠️ Google Connection Error. Please retry.`;
  }

  populateFilterDropdowns();
  applyDataEntryFilters();
}

function populateFilterDropdowns() {
  const dSelect = document.getElementById('deDateFilter');
  const vSelect = document.getElementById('deVehicleFilter');
  const tSelect = document.getElementById('deTripFilter');

  const currentD = dSelect.value;
  const currentV = vSelect.value;
  const currentT = tSelect.value;

  dSelect.innerHTML = `<option value="ALL">All Dates</option>`;
  vSelect.innerHTML = `<option value="ALL">All Vehicles</option>`;
  tSelect.innerHTML = `<option value="ALL">All Trips</option>`;

  const uniqueDates = [...new Set(globalDataEntryRaw.map(r => formatExcelDate(r[0])).filter(Boolean))].sort();
  const uniqueVehicles = [...new Set(globalDataEntryRaw.map(r => String(r[8] || "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
  const uniqueTrips = [...new Set(globalDataEntryRaw.map(r => String(r[7] || "").trim()).filter(Boolean))].sort();

  uniqueDates.forEach(d => { dSelect.innerHTML += `<option value="${d}">${d}</option>`; });
  uniqueVehicles.forEach(v => { vSelect.innerHTML += `<option value="${v}">${v}</option>`; });
  uniqueTrips.forEach(t => { tSelect.innerHTML += `<option value="${t}">${t}</option>`; });

  dSelect.value = currentD;
  vSelect.value = currentV;
  tSelect.value = currentT;
}

function applyDataEntryFilters() {
  const selectedDate = document.getElementById('deDateFilter').value;
  const selectedVehicle = document.getElementById('deVehicleFilter').value;
  const selectedTrip = document.getElementById('deTripFilter').value;
  const tempFilter = document.getElementById('deTempFilter').value;
  const query = document.getElementById('deSearchInput').value.toLowerCase();

  filteredDataEntry = globalDataEntryRaw.filter(row => {
    const dateVal = formatExcelDate(row[0]); 
    const tripVal = String(row[7] || "").trim(); 
    const vehVal  = String(row[8] || "").trim(); 
    const tempVal = parseFloat(row[12]);

    const matchDate = (selectedDate === "ALL" || dateVal === selectedDate);
    const matchVehicle = (selectedVehicle === "ALL" || vehVal === selectedVehicle);
    const matchTrip = (selectedTrip === "ALL" || tripVal === selectedTrip);
    
    let matchTemp = true;
    if (tempFilter === 'OK') matchTemp = (!isNaN(tempVal) && tempVal <= 5);
    else if (tempFilter === 'WARN') matchTemp = (!isNaN(tempVal) && tempVal > 5 && tempVal <= 8);
    else if (tempFilter === 'CRITICAL') matchTemp = (!isNaN(tempVal) && tempVal > 8);

    const matchQuery = query === "" || row.some(cell => String(cell).toLowerCase().includes(query));

    return matchDate && matchVehicle && matchTrip && matchTemp && matchQuery;
  });

  renderDataEntryDashboard();
}

function renderDataEntryDashboard() {
  const tbody = document.getElementById('deTableBody');
  tbody.innerHTML = '';

  const totalTrips = filteredDataEntry.length;
  document.getElementById('deStatTrips').innerText = totalTrips;
  document.getElementById('deStatTripsSub').innerText = `${globalDataEntryRaw.length} Total Master Rows`;

  const driversSet = new Set(filteredDataEntry.map(r => String(r[9] || "").trim()).filter(Boolean));
  const activeVehicles = new Set(filteredDataEntry.map(r => String(r[8] || "").trim()).filter(Boolean)).size;
  document.getElementById('deStatVehicles').innerText = activeVehicles;
  document.getElementById('deStatVehiclesSub').innerText = `${driversSet.size} Active Drivers`;

  const totalTotes = filteredDataEntry.reduce((acc, curr) => acc + (parseFloat(curr[14]) || 0), 0);
  document.getElementById('deStatTotes').innerText = totalTotes;
  const avgTotesPerTrip = totalTrips > 0 ? (totalTotes / totalTrips).toFixed(1) : 0;
  document.getElementById('deStatTotesSub').innerText = `${avgTotesPerTrip} Avg Totes / Trip`;

  const totalDispatchedQty = filteredDataEntry.reduce((acc, curr) => acc + (parseFloat(curr[16]) || 0), 0);
  document.getElementById('deStatDispatchedQty').innerText = totalDispatchedQty;
  
  const notDispatchedQty = filteredDataEntry.reduce((acc, curr) => acc + (parseFloat(curr[18]) || 0), 0);
  const totalAttempted = totalDispatchedQty + notDispatchedQty;
  const dispatchRate = totalAttempted > 0 ? ((totalDispatchedQty / totalAttempted) * 100).toFixed(1) : 100;
  document.getElementById('deStatDispRatioSub').innerText = `${dispatchRate}% Fulfillment Ratio`;

  const totalValidation = filteredDataEntry.reduce((acc, curr) => acc + (parseFloat(curr[15]) || 0), 0);
  const valRatio = totalDispatchedQty > 0 ? ((totalValidation / totalDispatchedQty) * 100).toFixed(1) : 100;
  document.getElementById('deStatValidRatio').innerText = `${valRatio}%`;

  const temps = filteredDataEntry.map(r => parseFloat(r[12])).filter(n => !isNaN(n));
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '0';
  document.getElementById('deStatAvgTemp').innerText = `${avgTemp}°C`;

  const criticalBreaches = temps.filter(t => t > 8).length;
  document.getElementById('deStatTempBreachSub').innerText = `${criticalBreaches} Critical Breaches (>8°C)`;

  renderTripsAnalyticsDashboard(totalDispatchedQty, totalTotes, temps);

  if (filteredDataEntry.length === 0) {
    tbody.innerHTML = `<tr><td colspan="21" class="empty-msg">No matching records found for the selected filter.</td></tr>`;
    return;
  }

  filteredDataEntry.forEach(row => {
    const tempVal = parseFloat(row[12]);
    let tempStyle = "";
    if (!isNaN(tempVal)) {
      if (tempVal > 8) tempStyle = "color: var(--primary-red); font-weight: 900;";
      else if (tempVal > 5) tempStyle = "color: var(--warning-yellow); font-weight: 800;";
      else tempStyle = "color: var(--green-accent); font-weight: 700;";
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${formatExcelDate(row[0]) || "-"}</strong></td>
      <td><span class="badge-wh" style="background:#e0f2fe; color:#0369a1;">${row[1] || "-"}</span></td>
      <td><strong>${row[2] || "-"}</strong></td>
      <td><strong style="color:var(--text-main);">${row[3] || "-"}</strong></td>
      <td>${row[4] || "-"}</td>
      <td><span class="${String(row[5]).toLowerCase().includes('fail') ? 'badge-alert' : 'badge-status'}">${row[5] || "Dispatched"}</span></td>
      <td>${row[6] || "-"}</td>
      <td><span class="badge-wh">${row[7] || "-"}</span></td>
      <td><strong style="color:var(--primary-red); font-size:13px;">${row[8] || "-"}</strong></td>
      <td><strong>${row[9] || "-"}</strong></td>
      <td>${row[10] || "-"}</td>
      <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;">${row[11] || "-"}</td>
      <td style="${tempStyle}">${row[12] || "-"}</td>
      <td>${row[13] || "-"}</td>
      <td><strong>${row[14] || "-"}</strong></td>
      <td>${row[15] || "-"}</td>
      <td><strong style="color:var(--green-accent);">${row[16] || "-"}</strong></td>
      <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;">${row[17] || "-"}</td>
      <td>${row[18] || "-"}</td>
      <td>${row[19] || "-"}</td>
      <td>${row[20] || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTripsAnalyticsDashboard(totalDispatchedQty, totalTotes, temps) {
  const storeMap = {};
  const driverMap = {};

  let okTemps = 0, warnTemps = 0, criticalTemps = 0;

  filteredDataEntry.forEach(r => {
    const store = String(r[3] || "Unknown").trim();
    const qty = parseFloat(r[16]) || 0;
    storeMap[store] = (storeMap[store] || 0) + qty;

    const driver = String(r[9] || "Unassigned").trim();
    const veh = String(r[8] || "-").trim();
    const totes = parseFloat(r[14]) || 0;
    const key = `${driver}___${veh}`;
    
    if (!driverMap[key]) driverMap[key] = { totes: 0, trips: 0 };
    driverMap[key].totes += totes;
    driverMap[key].trips += 1;

    const temp = parseFloat(r[12]);
    if (!isNaN(temp)) {
      if (temp <= 5) okTemps++;
      else if (temp <= 8) warnTemps++;
      else criticalTemps++;
    }
  });

  const storeBody = document.getElementById('deStoreTableBody');
  storeBody.innerHTML = '';
  const sortedStores = Object.keys(storeMap).sort((a,b) => storeMap[b] - storeMap[a]);
  document.getElementById('deStoreCountLbl').innerText = `${sortedStores.length} Active Stores`;

  sortedStores.slice(0, 5).forEach(st => {
    const val = storeMap[st];
    const pct = totalDispatchedQty > 0 ? ((val / totalDispatchedQty) * 100).toFixed(1) : 0;
    storeBody.innerHTML += `
      <tr>
        <td><strong>${st}</strong></td>
        <td><strong>${val}</strong> QTY</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
            <span>${pct}%</span>
          </div>
        </td>
      </tr>
    `;
  });

  const driverBody = document.getElementById('deDriverTableBody');
  driverBody.innerHTML = '';
  const sortedDrivers = Object.keys(driverMap).sort((a,b) => driverMap[b].totes - driverMap[a].totes);
  document.getElementById('deDriverCountLbl').innerText = `${sortedDrivers.length} Active Drivers`;

  sortedDrivers.slice(0, 5).forEach(dKey => {
    const [driver, veh] = dKey.split('___');
    const dData = driverMap[dKey];
    const avgTotes = (dData.totes / dData.trips).toFixed(1);

    driverBody.innerHTML += `
      <tr>
        <td><strong>${driver}</strong></td>
        <td><span class="badge-wh" style="color:var(--primary-red);">${veh}</span></td>
        <td><strong>${dData.totes}</strong> Totes (${avgTotes}/trip)</td>
      </tr>
    `;
  });

  const tempBody = document.getElementById('deTempTableBody');
  tempBody.innerHTML = '';
  const totalTemps = temps.length || 1;
  document.getElementById('deTempCountLbl').innerText = `${temps.length} Temperature Logs`;

  const tempCategories = [
    { name: 'Optimal (≤ 5°C)', count: okTemps, color: 'var(--green-accent)' },
    { name: 'Warning (5.1°C - 8°C)', count: warnTemps, color: 'var(--warning-yellow)' },
    { name: 'Critical Breach (> 8°C)', count: criticalTemps, color: 'var(--primary-red)' }
  ];

  tempCategories.forEach(c => {
    const pct = ((c.count / totalTemps) * 100).toFixed(1);
    tempBody.innerHTML += `
      <tr>
        <td><strong style="color:${c.color};">${c.name}</strong></td>
        <td><strong>${c.count}</strong> Trips</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%; background:${c.color};"></div></div>
            <span>${pct}%</span>
          </div>
        </td>
      </tr>
    `;
  });
}

function exportFilteredDataEntryExcel() {
  if (!filteredDataEntry.length) return alert('No filtered data to export!');
  const headers = ["Date", "TRIP ID", "DS CODE", "STORE NAME", "CLUSTER", "STATUS", "SHIFT", "TASK / TRIP NR", "VEHICLE NO", "DA NAME", "DISPATCHER", "DOCK NO", "TEMP (°C)", "Gate Passes", "PHYSICAL TOTES", "Validation", "QTY DISPATCHED", "PALLET BARCODES", "NOT DISPATCH", "KM (WH→Store)", "TRAVEL TIME"];
  const exportData = [headers, ...filteredDataEntry.map(r => {
    let copy = [...r];
    copy[0] = formatExcelDate(copy[0]);
    return copy;
  })];
  const worksheet = XLSX.utils.aoa_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered_Trips");
  XLSX.writeFile(workbook, `Data_Entry_Trips_${getTodayFormattedDate()}.xlsx`);
}

function exportFilteredDataEntryCSV() {
  if (!filteredDataEntry.length) return alert('No filtered data to export!');
  const headers = ["Date", "TRIP ID", "DS CODE", "STORE NAME", "CLUSTER", "STATUS", "SHIFT", "TASK / TRIP NR", "VEHICLE NO", "DA NAME", "DISPATCHER", "DOCK NO", "TEMP (°C)", "Gate Passes", "PHYSICAL TOTES", "Validation", "QTY DISPATCHED", "PALLET BARCODES", "NOT DISPATCH", "KM (WH→Store)", "TRAVEL TIME"];
  const exportData = [headers, ...filteredDataEntry.map(r => {
    let copy = [...r];
    copy[0] = formatExcelDate(copy[0]);
    return copy;
  })];
  const worksheet = XLSX.utils.aoa_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(["\ufeff" + csvOutput], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `Data_Entry_Trips_${getTodayFormattedDate()}.csv`);
}

function toggleSidebar() {
  const sidebar = document.getElementById('studioSidebar');
  const icon = document.getElementById('toggleIcon');
  sidebar.classList.toggle('collapsed');
  icon.innerText = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

function detectAlgorithmType(code) {
  if (code.startsWith('FPI')) return 'PALLET';
  if (code.startsWith('TGI') && code.charAt(7) === 'G') return 'GLOBAL TOTE';
  if (code.startsWith('TGI') && code.charAt(7) === 'H') return 'GLOBAL TOTE MINS';
  return 'STAGING';
}

function runAutoGeneration() {
  const algoType = document.getElementById('algoTypeSelect').value;
  if (algoType === 'PALLET') generateFpiPatternCodes();
  else if (algoType === 'GLOBAL_TOTES') generateGlobalTotesCodes("TGI83K1G");
  else if (algoType === 'GLOBAL_TOTES_MINUTES') generateGlobalTotesCodes("TGI83K1H");
}

function generateFpiPatternCodes() {
  const count = parseInt(document.getElementById('autoGenerateCount').value || 10);
  const prefix = "FPI83H1D";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = [];
  for (let i = 0; i < count; i++) {
    let suf = "";
    for (let j = 0; j < 6; j++) suf += chars.charAt(Math.floor(Math.random() * chars.length));
    res.push(prefix + suf);
  }
  document.getElementById('codeListInput').value = res.join('\n');
  generateBatch();
}

function generateGlobalTotesCodes(prefixCode) {
  const count = parseInt(document.getElementById('autoGenerateCount').value || 10);
  const prefix = prefixCode || "TGI83K1H";
  const suffix = "EG";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = [];
  for (let i = 0; i < count; i++) {
    let mid = "";
    for (let j = 0; j < 4; j++) mid += chars.charAt(Math.floor(Math.random() * chars.length));
    res.push(prefix + mid + suffix);
  }
  document.getElementById('codeListInput').value = res.join('\n');
  generateBatch();
}

function updateZoom(val) {
  document.documentElement.style.setProperty('--zoom-scale', val);
  document.getElementById('zoomValText').innerText = `${Math.round(val * 100)}%`;
}

function setOrientation(mode) {
  currentOrientation = mode;
  document.getElementById('btnLandscape').classList.toggle('active', mode === 'landscape');
  document.getElementById('btnPortrait').classList.toggle('active', mode === 'portrait');
  handleSizePresetChange();
}

function handleWarehouseChange() {
  const select = document.getElementById('warehouseSelect');
  document.getElementById('customWhField').style.display = (select.value === 'CUSTOM') ? 'flex' : 'none';
}

function getActiveWarehouse() {
  const select = document.getElementById('warehouseSelect');
  return (select.value === 'CUSTOM') ? (document.getElementById('customWhInput').value.trim().toUpperCase() || 'CAIIDO1') : select.value;
}

function handleSizePresetChange() {
  const preset = document.getElementById('sizePresetSelect').value;
  const customRow = document.getElementById('customSizeRow');

  if (preset === 'CUSTOM') {
    customRow.style.display = 'flex';
    applyCustomDimensions();
  } else {
    customRow.style.display = 'none';
    let [w, h] = preset.split('x').map(Number);
    if (currentOrientation === 'portrait' && w > h) [w, h] = [h, w];
    else if (currentOrientation === 'landscape' && h > w) [w, h] = [h, w];
    setLabelDimensions(w, h);
  }
}

function applyCustomDimensions() {
  let w = Number(document.getElementById('customWidthInput').value) || 50;
  let h = Number(document.getElementById('customHeightInput').value) || 30;
  if (currentOrientation === 'portrait' && w > h) [w, h] = [h, w];
  if (currentOrientation === 'landscape' && h > w) [w, h] = [h, w];
  setLabelDimensions(w, h);
}

function setLabelDimensions(widthMm, heightMm) {
  document.documentElement.style.setProperty('--label-width', `${widthMm}mm`);
  document.documentElement.style.setProperty('--label-height', `${heightMm}mm`);
  const minDimension = Math.min(widthMm, heightMm);
  const fontScale = Math.max(0.6, Math.min(1.4, minDimension / 38));
  document.documentElement.style.setProperty('--font-scale', fontScale);
}

function syncAndGenerateZone() {
  const zoneSelect = document.getElementById('zoneSelectTop');
  let val = zoneSelect.value;
  if (val === 'CUSTOM') {
    let customVal = prompt('Enter Custom Storage Zone Name:', 'FRESH');
    document.getElementById('statZoneText').innerText = customVal ? customVal.toUpperCase() : 'AMB';
  } else {
    document.getElementById('statZoneText').innerText = val;
  }
  generateBatch();
}

function getActiveZone() { return document.getElementById('statZoneText').innerText || 'AMB'; }

function updateSymbologyCardStat() {
  document.getElementById('statSymbologyText').innerText = document.getElementById('symbologySelect').value;
}

function filterLabels() {
  const query = document.getElementById('filterInput').value.toLowerCase();
  document.querySelectorAll('.label-card').forEach(card => {
    card.style.display = card.getAttribute('data-code').toLowerCase().includes(query) ? 'flex' : 'none';
  });
}

function generateBatch() {
  const grid = document.getElementById('labelsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const zoneText = getActiveZone();
  const warehouseText = getActiveWarehouse();
  const format = document.getElementById('symbologySelect').value;
  const rawInput = document.getElementById('codeListInput').value;
  
  const codes = rawInput.split('\n').map(c => c.trim().toUpperCase()).filter(c => c.length > 0);
  document.getElementById('labelCount').innerText = codes.length;
  updateSymbologyCardStat();

  if (codes.length === 0) return;

  codes.forEach((code, i) => {
    const elemId = `render-target-${i}`;
    const labelAlgoTag = detectAlgorithmType(code);
    let renderTag = ['CODE128', 'CODE39', 'EAN13'].includes(format) ? `<svg id="${elemId}"></svg>` : `<canvas id="${elemId}"></canvas>`;

    const cardHTML = `
      <div class="label-card" data-code="${code}" style="animation-delay: ${i * 0.03}s">
        <div class="label-header">
          <div class="brand-mini">
            <div class="noon-txt">noon</div>
            <div class="min-tag">MINUTES</div>
          </div>
          <div class="header-center"><span class="wh-badge">${warehouseText}</span></div>
          <div class="label-info">
            <span class="algo-type-tag">${labelAlgoTag}</span>
            <div class="zone-lbl">${zoneText}</div>
          </div>
        </div>
        <div class="code-container">${renderTag}</div>
        <div class="code-footer-wrap">
          <span class="tech-hash">#${(i+1).toString().padStart(3, '0')}</span>
          <span class="code-text-footer">${code}</span>
          <span class="tech-hash">EG</span>
        </div>
      </div>
    `;

    grid.insertAdjacentHTML('beforeend', cardHTML);

    try {
      if (['CODE128', 'CODE39', 'EAN13'].includes(format)) {
        JsBarcode(`#${elemId}`, code, { format: format, displayValue: false, margin: 0, height: 45, width: 1.6 });
      } else if (format === 'QR') {
        bwipjs.toCanvas(elemId, { bcid: 'qrcode', text: code, scale: 3 });
      } else if (format === 'DATAMATRIX') {
        bwipjs.toCanvas(elemId, { bcid: 'datamatrix', text: code, scale: 2 });
      } else if (format === 'PDF417') {
        bwipjs.toCanvas(elemId, { bcid: 'pdf417', text: code, scale: 2 });
      }
    } catch (e) { console.error(e); }
  });
}

/* INITIALIZE ON PAGE LOAD */
window.onload = function() {
  initTheme();
  checkAuthSession();
  
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');

  if (dropZone) {
    ['dragenter', 'dragover'].forEach(n => {
      dropZone.addEventListener(n, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(n => {
      dropZone.addEventListener(n, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });
  }

  generateBatch();
};