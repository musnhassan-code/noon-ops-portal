/* THEME MANAGEMENT */
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
  if (btn) btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

/* USER DATABASE */
let defaultUsers = [
  { email: "admin@noon.com", passcode: "admin123", role: "ADMIN", tabs: ["barcode", "pace", "trips", "admin"], status: "ACTIVE" },
  { email: "musnhassan@noon.com", passcode: "1234", role: "USER", tabs: ["barcode", "pace", "trips"], status: "ACTIVE" },
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

/* REAL-TIME DEVICE DETECTION */
function getDeviceDetails() {
  const ua = navigator.userAgent;
  let deviceType = "💻 Laptop / PC";
  let deviceModel = "Windows / Mac PC";

  if (/Android/i.test(ua)) {
    deviceType = "📱 Phone";
    deviceModel = "Android Device";
    if (/Samsung/i.test(ua)) deviceModel = "Samsung Phone";
    else if (/Xiaomi|Redmi/i.test(ua)) deviceModel = "Xiaomi / Redmi";
  } else if (/iPhone/i.test(ua)) {
    deviceType = "📱 Phone";
    deviceModel = "Apple iPhone";
  } else if (/iPad/i.test(ua)) {
    deviceType = "📱 Tablet";
    deviceModel = "Apple iPad";
  }

  let browser = "Chrome Engine";
  if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari Engine";
  if (ua.indexOf("Firefox") !== -1) browser = "Firefox Engine";

  return {
    type: deviceType,
    model: deviceModel,
    browser: browser,
    screen: `${window.screen.width}x${window.screen.height} px`,
    orientation: window.screen.width < 768 ? "Portrait" : "Landscape"
  };
}

/* HEARTBEAT TELEMETRY PING */
function startLiveHeartbeat(user) {
  setInterval(() => {
    if (!sessionStorage.getItem('noon_ops_auth_user')) return;

    const deviceInfo = getDeviceDetails();
    const liveSessionObj = {
      email: user.email,
      role: user.role,
      deviceType: deviceInfo.type,
      deviceModel: deviceInfo.model,
      browser: deviceInfo.browser,
      screen: deviceInfo.screen,
      orientation: deviceInfo.orientation,
      lastPingTimestamp: Date.now(),
      lastActiveTime: new Date().toLocaleTimeString()
    };

    let activeSessions = JSON.parse(localStorage.getItem('noon_ops_live_telemetry') || "[]");
    activeSessions = activeSessions.filter(s => s.email !== user.email);
    activeSessions.unshift(liveSessionObj);
    localStorage.setItem('noon_ops_live_telemetry', JSON.stringify(activeSessions));

    const adminTab = document.getElementById('adminTabView');
    if (adminTab && adminTab.classList.contains('active')) {
      renderAdminTelemetryTable();
    }
  }, 4000);
}

/* AUTHENTICATION CONTROL */
function checkAuthSession() {
  const activeSession = sessionStorage.getItem('noon_ops_auth_user');
  if (activeSession) {
    const user = JSON.parse(activeSession);
    unlockPortal(user);
  } else {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'flex';
  }
}

function handleAuthKey(e) {
  if (e.key === 'Enter') validateLogin();
}

function validateLogin() {
  const emailInput = document.getElementById('authEmailInput');
  const passInput = document.getElementById('authPasscodeInput');
  const errorMsg = document.getElementById('authErrorMsg');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim().toLowerCase();
  const passcode = passInput.value.trim();

  // DIRECT ACCELERATED LOGIN
  if (email === "admin@noon.com" && passcode === "admin123") {
    const adminUser = { email: "admin@noon.com", role: "ADMIN", tabs: ["barcode", "pace", "trips", "admin"], status: "ACTIVE" };
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(adminUser));
    unlockPortal(adminUser);
    return;
  } 
  
  if ((email === "musnhassan@noon.com" || email === "user@noon.com") && passcode === "1234") {
    const stdUser = { email: email, role: "USER", tabs: ["barcode", "pace", "trips"], status: "ACTIVE" };
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(stdUser));
    unlockPortal(stdUser);
    return;
  }

  const userDb = getStoredUsers();
  const matchedUser = userDb.find(u => u.email.toLowerCase() === email && u.passcode === passcode && u.status === "ACTIVE");

  if (matchedUser) {
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(matchedUser));
    unlockPortal(matchedUser);
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
    passInput.value = '';
  }
}

function unlockPortal(user) {
  const overlay = document.getElementById('authOverlay');
  const errorMsg = document.getElementById('authErrorMsg');
  if (overlay) overlay.style.display = 'none';
  if (errorMsg) errorMsg.style.display = 'none';

  setupUserInterface(user);
  startLiveHeartbeat(user);
}

function setupUserInterface(user) {
  const pEmail = document.getElementById('userPillEmail');
  const pRole = document.getElementById('userPillRole');
  if (pEmail) pEmail.innerText = user.email;
  if (pRole) pRole.innerText = user.role;

  buildDynamicNavTabs(user);

  if (user.role === 'ADMIN') {
    renderAdminUserTable();
    renderAdminTelemetryTable();
    renderResetRequestsTable();
  }
}

/* TAB NAVIGATION SYSTEM (PREVENTS WHITE SCREEN & ENABLES BARCODE STUDIO) */
function buildDynamicNavTabs(user) {
  const navContainer = document.getElementById('navbarTabs');
  if (!navContainer) return;
  navContainer.innerHTML = '';

  const tabDefinitions = {
    barcode: { title: '🏷️ Pallet Barcode Studio', target: 'barcodeStudio' },
    pace: { title: '📦 Pace Picking Uploader', target: 'pacePicking' },
    trips: { title: '🗂️ Trips Command Center', target: 'dataEntry' },
    admin: { title: '👑 Admin Control', target: 'adminTab' }
  };

  let allowedKeys = user.tabs || ['barcode', 'pace', 'trips'];
  if (user.role === 'ADMIN' && !allowedKeys.includes('admin')) {
    allowedKeys.push('admin');
  }

  allowedKeys.forEach((key) => {
    if (tabDefinitions[key]) {
      const btn = document.createElement('button');
      btn.className = 'nav-tab-btn';
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

function switchMainTab(targetId) {
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

  const viewMap = {
    'barcodeStudio': 'barcodeStudioView',
    'pacePicking': 'pacePickingView',
    'dataEntry': 'dataEntryView',
    'adminTab': 'adminTabView'
  };

  const activeViewId = viewMap[targetId] || targetId;
  const targetView = document.getElementById(activeViewId);
  
  if (targetView) targetView.classList.add('active');

  const buttons = document.querySelectorAll('.nav-tab-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(targetId)) {
      btn.classList.add('active');
    }
  });

  if (targetId === 'barcodeStudio') {
    generateBatch();
  } else if (targetId === 'dataEntry' && !globalDataEntryRaw.length) {
    fetchGoogleSheetData();
  } else if (targetId === 'adminTab') {
    renderAdminUserTable();
    renderAdminTelemetryTable();
    renderResetRequestsTable();
  }
}

function logoutSession() {
  sessionStorage.removeItem('noon_ops_auth_user');
  sessionStorage.removeItem('noon_ops_current_telemetry');
  location.reload();
}

/* FORGOT PASSWORD MODAL FLOW */
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
  if(!tbody) return;
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

    const subject = encodeURIComponent("Your Password Reset Credentials");
    const body = encodeURIComponent(`Hello,\n\nYour password reset request has been fulfilled.\n\nURL: ${window.location.href}\nEmail: ${email}\nNew Passcode: ${newPass}`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);

    renderAdminUserTable();
    renderResetRequestsTable();
    alert(`New Passcode generated for ${email}!`);
  }
}

/* ADMIN PANEL TELEMETRY LOGS */
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
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No session telemetry recorded yet.</td></tr>`;
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
  if (!tbody) return;
  tbody.innerHTML = '';

  if (document.getElementById('adminStatUserCount')) document.getElementById('adminStatUserCount').innerText = users.length;
  if (document.getElementById('adminStatActiveAdmins')) document.getElementById('adminStatActiveAdmins').innerText = users.filter(u => u.role === 'ADMIN').length;

  users.forEach((u, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.email}</strong></td>
      <td><code style="background:var(--border-color); padding:2px 6px; border-radius:4px;">${u.passcode}</code></td>
      <td><span class="badge-role">${u.role}</span></td>
      <td><span class="telemetry-code">${(u.tabs || []).join(', ')}</span></td>
      <td><span class="${u.status === 'ACTIVE' ? 'badge-status' : 'badge-alert'}">${u.status}</span></td>
      <td><button class="btn btn-dark" style="padding:4px 8px; font-size:10px;" onclick="toggleUserStatus(${index})">${u.status === 'ACTIVE' ? '⏸️ Disable' : '▶️ Activate'}</button></td>
      <td><button class="btn btn-red" style="padding:4px 8px; font-size:10px;" onclick="deleteUser(${index})">🗑️ Revoke</button></td>
    `;
    tbody.appendChild(tr);
  });

  const cfgSheet = document.getElementById('cfgSheetIdInput');
  if(cfgSheet) cfgSheet.value = SHEET_ID;
  const cfgGid = document.getElementById('cfgGidInput');
  if(cfgGid) cfgGid.value = GID_ID;
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
  users.push({ email: email, passcode: passcode, role: role, tabs: tabs, status: "ACTIVE" });
  saveStoredUsers(users);
  renderAdminUserTable();

  const subject = encodeURIComponent("Your Access Credentials for noon MINUTES OPS Portal");
  const body = encodeURIComponent(`Hello,\n\nYou have been granted access to noon MINUTES OPS Portal.\n\nPortal URL: ${window.location.href}\nYour Registered Email: ${email}\nYour Personal Passcode: ${passcode}\nAllowed Access Tabs: ${tabs.join(', ')}\n\nRegards,\nMaster Admin Control Center`);
  window.open(`mailto:${email}?subject=${subject}&body=${body}`);

  document.getElementById('newAdminEmail').value = '';
  document.getElementById('newAdminPasscode').value = '';
  alert(`User ${email} granted access! 🚀`);
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
  alert('Google Sheet Configuration Updated!');
}

/* SAFE NUMBER PARSER */
function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  let cleanStr = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  let num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

/* GOOGLE SHEETS ENGINE */
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

async function fetchGoogleSheetData() {
  const updatedTag = document.getElementById('lastUpdatedTag');
  if (updatedTag) updatedTag.innerText = "⏳ Syncing Google Sheets API...";

  const googleLiveCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_ID}&t=${Date.now()}`;

  try {
    let response = await fetch(googleLiveCsvUrl);
    if (!response.ok) throw new Error("Connection Failure");
    
    let csvText = await response.text();
    let workbook = XLSX.read(csvText, { type: 'string' });
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (matrix && matrix.length > 1) {
      globalDataEntryRaw = matrix.slice(1).filter(r => r.some(c => String(c).trim() !== "")).map(r => {
        r[0] = formatExcelDate(r[0]); 
        return r;
      });
      if (updatedTag) updatedTag.innerText = `✅ Live Synced (${globalDataEntryRaw.length} rows) at ${new Date().toLocaleTimeString()}`;
    }
  } catch (err) {
    console.error("Fetch error:", err);
    if (updatedTag) updatedTag.innerText = `⚠️ Google Connection Error.`;
  }

  populateFilterDropdowns();
  applyDataEntryFilters();
}

function populateFilterDropdowns() {
  const dSelect = document.getElementById('deDateFilter');
  const vSelect = document.getElementById('deVehicleFilter');
  const tSelect = document.getElementById('deTripFilter');

  if (!dSelect || !vSelect || !tSelect) return;

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
  const selectedDate = document.getElementById('deDateFilter') ? document.getElementById('deDateFilter').value : 'ALL';
  const selectedVehicle = document.getElementById('deVehicleFilter') ? document.getElementById('deVehicleFilter').value : 'ALL';
  const selectedTrip = document.getElementById('deTripFilter') ? document.getElementById('deTripFilter').value : 'ALL';
  const tempFilter = document.getElementById('deTempFilter') ? document.getElementById('deTempFilter').value : 'ALL';
  const query = document.getElementById('deSearchInput') ? document.getElementById('deSearchInput').value.toLowerCase() : '';

  filteredDataEntry = globalDataEntryRaw.filter(row => {
    const dateVal = formatExcelDate(row[0]); 
    const tripVal = String(row[7] || "").trim(); 
    const vehVal  = String(row[8] || "").trim(); 
    const tempVal = parseCleanNumber(row[12]);

    const matchDate = (selectedDate === "ALL" || dateVal === selectedDate);
    const matchVehicle = (selectedVehicle === "ALL" || vehVal === selectedVehicle);
    const matchTrip = (selectedTrip === "ALL" || tripVal === selectedTrip);
    
    let matchTemp = true;
    if (tempFilter === 'OK') matchTemp = (tempVal <= 5 && tempVal !== 0);
    else if (tempFilter === 'WARN') matchTemp = (tempVal > 5 && tempVal <= 8);
    else if (tempFilter === 'CRITICAL') matchTemp = (tempVal > 8);

    const matchQuery = query === "" || row.some(cell => String(cell).toLowerCase().includes(query));

    return matchDate && matchVehicle && matchTrip && matchTemp && matchQuery;
  });

  renderDataEntryDashboard();
}

function renderDataEntryDashboard() {
  const tbody = document.getElementById('deTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const totalTrips = filteredDataEntry.length;
  if (document.getElementById('deStatTrips')) document.getElementById('deStatTrips').innerText = totalTrips;
  if (document.getElementById('deStatTripsSub')) document.getElementById('deStatTripsSub').innerText = `${globalDataEntryRaw.length} Total Master Rows`;

  const driversSet = new Set(filteredDataEntry.map(r => String(r[9] || "").trim()).filter(Boolean));
  const activeVehicles = new Set(filteredDataEntry.map(r => String(r[8] || "").trim()).filter(Boolean)).size;
  if (document.getElementById('deStatVehicles')) document.getElementById('deStatVehicles').innerText = activeVehicles;
  if (document.getElementById('deStatVehiclesSub')) document.getElementById('deStatVehiclesSub').innerText = `${driversSet.size} Assigned Drivers`;

  const totalTotes = filteredDataEntry.reduce((acc, curr) => acc + parseCleanNumber(curr[14]), 0);
  if (document.getElementById('deStatTotes')) document.getElementById('deStatTotes').innerText = totalTotes.toLocaleString();
  const avgTotes = totalTrips > 0 ? (totalTotes / totalTrips).toFixed(1) : '0';
  if (document.getElementById('deStatTotesSub')) document.getElementById('deStatTotesSub').innerText = `${avgTotes} Avg / Trip`;

  const totalDispatchedQty = filteredDataEntry.reduce((acc, curr) => acc + parseCleanNumber(curr[16]), 0);
  if (document.getElementById('deStatDispatchedQty')) document.getElementById('deStatDispatchedQty').innerText = totalDispatchedQty.toLocaleString();
  
  const notDispatchedQty = filteredDataEntry.reduce((acc, curr) => acc + parseCleanNumber(curr[18]), 0);
  const totalAttempted = totalDispatchedQty + notDispatchedQty;
  const dispatchRate = totalAttempted > 0 ? ((totalDispatchedQty / totalAttempted) * 100).toFixed(1) : '100';
  if (document.getElementById('deStatDispRatioSub')) document.getElementById('deStatDispRatioSub').innerText = `${dispatchRate}% Fulfilled Rate`;

  const totalValidation = filteredDataEntry.reduce((acc, curr) => acc + parseCleanNumber(curr[15]), 0);
  const valRatio = totalDispatchedQty > 0 ? ((totalValidation / totalDispatchedQty) * 100).toFixed(1) : '0';
  if (document.getElementById('deStatValidRatio')) document.getElementById('deStatValidRatio').innerText = `${valRatio}%`;

  const temps = filteredDataEntry.map(r => parseCleanNumber(r[12])).filter(n => n !== 0);
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '0';
  if (document.getElementById('deStatAvgTemp')) document.getElementById('deStatAvgTemp').innerText = `${avgTemp}°C`;

  const criticalBreaches = temps.filter(t => t > 8).length;
  if (document.getElementById('deStatTempBreachSub')) document.getElementById('deStatTempBreachSub').innerText = `${criticalBreaches} Critical Breaches`;

  renderTripsAnalyticsDashboard(totalDispatchedQty, totalTotes, temps);

  if (filteredDataEntry.length === 0) {
    tbody.innerHTML = `<tr><td colspan="21" class="empty-msg">No matching records found for the selected filter.</td></tr>`;
    return;
  }

  filteredDataEntry.forEach(row => {
    const tempVal = parseCleanNumber(row[12]);
    let tempStyle = "";
    if (tempVal > 8) tempStyle = "color: var(--primary-red); font-weight: 900;";
    else if (tempVal > 5) tempStyle = "color: var(--warning-yellow); font-weight: 800;";
    else if (tempVal > 0) tempStyle = "color: var(--green-accent); font-weight: 700;";

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
    const qty = parseCleanNumber(r[16]);
    storeMap[store] = (storeMap[store] || 0) + qty;

    const driver = String(r[9] || "Unassigned").trim();
    const veh = String(r[8] || "-").trim();
    const totes = parseCleanNumber(r[14]);
    const key = `${driver}___${veh}`;
    
    if (!driverMap[key]) driverMap[key] = { totes: 0, trips: 0, driver: driver, veh: veh };
    driverMap[key].totes += totes;
    driverMap[key].trips += 1;

    const temp = parseCleanNumber(r[12]);
    if (temp > 0) {
      if (temp <= 5) okTemps++;
      else if (temp <= 8) warnTemps++;
      else criticalTemps++;
    }
  });

  const storeBody = document.getElementById('deStoreTableBody');
  if (storeBody) {
    storeBody.innerHTML = '';
    const sortedStores = Object.keys(storeMap).sort((a,b) => storeMap[b] - storeMap[a]);
    if(document.getElementById('deStoreCountLbl')) document.getElementById('deStoreCountLbl').innerText = `${sortedStores.length} Stores`;

    sortedStores.slice(0, 5).forEach(st => {
      const val = storeMap[st];
      const pct = totalDispatchedQty > 0 ? ((val / totalDispatchedQty) * 100).toFixed(1) : 0;
      storeBody.innerHTML += `
        <tr>
          <td><strong>${st}</strong></td>
          <td><strong>${val.toLocaleString()}</strong> QTY</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
              <span>${pct}%</span>
            </div>
          </td>
        </tr>
      `;
    });
  }

  const driverBody = document.getElementById('deDriverTableBody');
  if (driverBody) {
    driverBody.innerHTML = '';
    const sortedDrivers = Object.keys(driverMap).sort((a,b) => driverMap[b].totes - driverMap[a].totes);
    if(document.getElementById('deDriverCountLbl')) document.getElementById('deDriverCountLbl').innerText = `${sortedDrivers.length} Drivers`;

    sortedDrivers.slice(0, 5).forEach(dKey => {
      const dData = driverMap[dKey];
      const avgTotes = (dData.totes / dData.trips).toFixed(1);
      driverBody.innerHTML += `
        <tr>
          <td><strong>${dData.driver}</strong></td>
          <td><span class="badge-wh" style="color:var(--primary-red);">${dData.veh}</span></td>
          <td><strong>${dData.totes.toLocaleString()}</strong> Totes (${avgTotes}/trip)</td>
        </tr>
      `;
    });
  }

  const tempBody = document.getElementById('deTempTableBody');
  if (tempBody) {
    tempBody.innerHTML = '';
    const totalTemps = temps.length || 1;
    if(document.getElementById('deTempCountLbl')) document.getElementById('deTempCountLbl').innerText = `${temps.length} Audited`;

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
}

/* BARCODE GENERATOR FUNCTIONS */
function toggleSidebar() {
  const sidebar = document.getElementById('studioSidebar');
  const icon = document.getElementById('toggleIcon');
  if(sidebar) sidebar.classList.toggle('collapsed');
  if(icon) icon.innerText = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

function detectAlgorithmType(code) {
  if (code.startsWith('FPI')) return 'PALLET';
  if (code.startsWith('TGI') && code.charAt(7) === 'G') return 'GLOBAL TOTE';
  if (code.startsWith('TGI') && code.charAt(7) === 'H') return 'GLOBAL TOTE MINS';
  return 'STAGING';
}

function generateBatch() {
  const grid = document.getElementById('labelsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const zoneText = document.getElementById('statZoneText') ? document.getElementById('statZoneText').innerText : 'AMB';
  const warehouseSelect = document.getElementById('warehouseSelect');
  const warehouseText = warehouseSelect ? warehouseSelect.value : 'CAIIDO1';
  const symbologySelect = document.getElementById('symbologySelect');
  const format = symbologySelect ? symbologySelect.value : 'CODE128';
  const codeListInput = document.getElementById('codeListInput');
  const rawInput = codeListInput ? codeListInput.value : '';
  
  const codes = rawInput.split('\n').map(c => c.trim().toUpperCase()).filter(c => c.length > 0);
  if(document.getElementById('labelCount')) document.getElementById('labelCount').innerText = codes.length;

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

/* INITIALIZATION ON LOAD */
window.onload = function() {
  initTheme();
  checkAuthSession();
  generateBatch();
};
