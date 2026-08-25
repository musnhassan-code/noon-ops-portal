/* GOOGLE APPS SCRIPT WEB APP API URL */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyWABrOHbQKF9wMO4IR8eTOiICWrlEt7Jj-Os7nsJaDJF5VBcN38avKduY4msxSUonp/exec";

let globalAttendanceRaw = [];
let filteredAttendance = [];
let globalDataEntryRaw = [];
let filteredDataEntry = [];
let remoteUsersList = [];
let dailyChartInstance = null;
let dailyEfficiencyChartInstance = null;

/* WELCOME SPLASH DISMISSAL */
function checkWelcomeSplash() {
  const splashSeen = sessionStorage.getItem('noon_ops_splash_seen');
  const splash = document.getElementById('welcomeSplash');
  if (splash) {
    if (splashSeen === 'true') {
      splash.style.display = 'none';
    } else {
      splash.style.display = 'flex';
    }
  }
}

function dismissWelcomeSplash() {
  const splash = document.getElementById('welcomeSplash');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    sessionStorage.setItem('noon_ops_splash_seen', 'true');
    setTimeout(() => { splash.style.display = 'none'; }, 400);
  }
}

/* FORGOT PASSWORD MODAL TOGGLE */
function toggleForgetModal(show) {
  const modal = document.getElementById('forgetModal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function submitPasswordResetRequest() {
  const email = document.getElementById('forgetEmailInput').value.trim();
  if (!email) {
    alert("Please enter your registered work email.");
    return;
  }
  alert(`Reset request sent for ${email}. Master Admin has been notified.`);
  toggleForgetModal(false);
}

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

/* DATE RANGE PICKER DROPDOWN LOGIC */
function toggleDatePickerMenu(menuId) {
  document.querySelectorAll('.date-picker-menu').forEach(m => {
    if (m.id !== menuId) m.style.display = 'none';
  });

  const menu = document.getElementById(menuId);
  if (menu) {
    menu.style.display = (menu.style.display === 'flex' || menu.style.display === 'block') ? 'none' : 'flex';
  }
}

function toggleCustomRangeInput(prefix) {
  const box = document.getElementById(`${prefix}CustomRangeBox`);
  if (box) {
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
  }
}

function selectQuickDate(prefix, type) {
  const label = document.getElementById(`${prefix}DateLabel`);
  const fromInput = document.getElementById(`${prefix}FilterFrom`);
  const toInput = document.getElementById(`${prefix}FilterTo`);
  
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = String(today.getMonth() + 1).padStart(2, '0');
  let dd = String(today.getDate()).padStart(2, '0');
  let todayStr = `${yyyy}-${mm}-${dd}`;

  if (type === 'ALL') {
    if (fromInput) fromInput.value = "";
    if (toInput) toInput.value = "";
    if (label) label.innerText = "All Dates";
  } else if (type === 'TODAY') {
    if (fromInput) fromInput.value = todayStr;
    if (toInput) toInput.value = todayStr;
    if (label) label.innerText = "Today";
  } else if (type === 'YESTERDAY') {
    let yest = new Date();
    yest.setDate(yest.getDate() - 1);
    let yStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = yStr;
    if (toInput) toInput.value = yStr;
    if (label) label.innerText = "Yesterday";
  } else if (type === 'LAST7') {
    let past = new Date();
    past.setDate(past.getDate() - 7);
    let pStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = pStr;
    if (toInput) toInput.value = todayStr;
    if (label) label.innerText = "Last 7 Days";
  } else if (type === 'LAST30') {
    let past = new Date();
    past.setDate(past.getDate() - 30);
    let pStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = pStr;
    if (toInput) toInput.value = todayStr;
    if (label) label.innerText = "Last 30 Days";
  }

  toggleDatePickerMenu(`${prefix}DatePickerMenu`);

  if (prefix === 'att') applyAttendanceFilters();
  else if (prefix === 'de') applyDataEntryFilters();
  else if (prefix === 'drv') renderDriversDashboard();
  else if (prefix === 'rpt') renderDailyReportDashboard();
}

/* FETCH USERS FROM GOOGLE SHEET VIA API */
async function fetchUsersFromSheet() {
  try {
    let res = await fetch(APPS_SCRIPT_URL);
    if (res.ok) {
      remoteUsersList = await res.json();
      return remoteUsersList;
    }
  } catch (err) {
    console.error("Error fetching user directory:", err);
  }
  return [];
}

/* AUTHENTICATION UI & ACTIONS */
function toggleAuthMode(mode) {
  const loginCard = document.getElementById('loginCard');
  const registerCard = document.getElementById('registerCard');
  if (mode === 'register') {
    loginCard.style.display = 'none';
    registerCard.style.display = 'block';
  } else {
    loginCard.style.display = 'block';
    registerCard.style.display = 'none';
  }
}

async function submitRegistration() {
  const name = document.getElementById('regNameInput').value.trim();
  const email = document.getElementById('regEmailInput').value.trim().toLowerCase();
  const passcode = document.getElementById('regPasscodeInput').value.trim();
  const msgBox = document.getElementById('regErrorMsg');

  if (!name || !email || !passcode) {
    msgBox.style.display = 'block';
    msgBox.style.background = 'rgba(229, 46, 46, 0.1)';
    msgBox.style.color = '#f87171';
    msgBox.innerText = '⚠️ All input fields are required!';
    return;
  }

  msgBox.style.display = 'block';
  msgBox.style.background = 'rgba(59, 130, 246, 0.1)';
  msgBox.style.color = '#60a5fa';
  msgBox.innerText = '⏳ Submitting registration request...';

  try {
    let response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'REGISTER',
        name: name,
        email: email,
        passcode: passcode
      })
    });

    let resData = await response.json();

    if (resData.success) {
      msgBox.style.background = 'rgba(34, 197, 94, 0.1)';
      msgBox.style.color = '#4ade80';
      msgBox.innerText = '✅ Request submitted! Pending Master Admin authorization.';
      setTimeout(() => toggleAuthMode('login'), 2500);
    } else {
      msgBox.style.background = 'rgba(229, 46, 46, 0.1)';
      msgBox.style.color = '#f87171';
      msgBox.innerText = `⚠️ ${resData.message || 'Registration failed.'}`;
    }
  } catch (err) {
    msgBox.style.background = 'rgba(229, 46, 46, 0.1)';
    msgBox.style.color = '#f87171';
    msgBox.innerText = '⚠️ Unable to connect to authentication server.';
  }
}

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

async function validateLogin() {
  const emailInput = document.getElementById('authEmailInput');
  const passInput = document.getElementById('authPasscodeInput');
  const errorMsg = document.getElementById('authErrorMsg');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim().toLowerCase();
  const passcode = passInput.value.trim();

  errorMsg.innerText = "⏳ Verifying user credentials...";
  errorMsg.style.display = 'block';

  if (email === "admin@noon.com" && passcode === "admin123") {
    const adminUser = { name: "Master Admin", email: "admin@noon.com", role: "ADMIN", tabs: ["attendance", "trips", "drivers", "dailyReport", "admin"] };
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(adminUser));
    unlockPortal(adminUser);
    return;
  }

  const users = await fetchUsersFromSheet();
  const matchedUser = users.find(u => 
    String(u.email).trim().toLowerCase() === email && 
    String(u.passcode).trim() === passcode
  );

  if (matchedUser) {
    if (String(matchedUser.status).trim().toUpperCase() === "PENDING") {
      errorMsg.innerText = "⏳ Account pending Master Admin approval.";
      errorMsg.style.display = 'block';
      return;
    }
    if (String(matchedUser.status).trim().toUpperCase() === "REJECTED") {
      errorMsg.innerText = "❌ Registration request has been rejected.";
      errorMsg.style.display = 'block';
      return;
    }

    matchedUser.tabs = matchedUser.role === 'ADMIN' ? ["attendance", "trips", "drivers", "dailyReport", "admin"] : ["attendance", "trips", "drivers", "dailyReport"];
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(matchedUser));
    unlockPortal(matchedUser);
  } else {
    errorMsg.innerText = "⚠️ Invalid credentials or unregistered email address.";
    errorMsg.style.display = 'block';
    passInput.value = '';
  }
}

function unlockPortal(user) {
  const overlay = document.getElementById('authOverlay');
  const errorMsg = document.getElementById('authErrorMsg');
  if (overlay) overlay.style.display = 'none';
  if (errorMsg) errorMsg.style.display = 'none';

  setupUserInterface(user);
}

function setupUserInterface(user) {
  const pEmail = document.getElementById('userPillEmail');
  const pRole = document.getElementById('userPillRole');
  if (pEmail) pEmail.innerText = user.email;
  if (pRole) pRole.innerText = user.role;

  const btnAdmin = document.getElementById('btnTabAdmin');
  if (btnAdmin) {
    btnAdmin.style.display = (user.role === 'ADMIN') ? 'inline-block' : 'none';
  }

  if (user.role === 'ADMIN') {
    renderPendingUsersTable();
    renderAdminUserTable();
  }
}

function switchMainTab(targetId) {
  const currentUser = JSON.parse(sessionStorage.getItem('noon_ops_auth_user') || '{}');
  if (targetId === 'adminTabView' && currentUser.role !== 'ADMIN') {
    alert("⛔ Access Restricted: Master Admin Authorization Required.");
    return;
  }

  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

  const targetView = document.getElementById(targetId);
  if (targetView) targetView.classList.add('active');

  localStorage.setItem('noon_ops_active_tab', targetId);

  const buttons = document.querySelectorAll('.nav-tab-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(targetId)) {
      btn.classList.add('active');
    }
  });

  if (targetId === 'attendanceView' && !globalAttendanceRaw.length) {
    fetchAttendanceSheetData();
  } else if (targetId === 'dataEntryView' && !globalDataEntryRaw.length) {
    fetchGoogleSheetData();
  } else if (targetId === 'driversView') {
    renderDriversDashboard();
  } else if (targetId === 'dailyReportView') {
    renderDailyReportDashboard();
  } else if (targetId === 'adminTabView') {
    renderPendingUsersTable();
    renderAdminUserTable();
  }
}

function logoutSession() {
  sessionStorage.removeItem('noon_ops_auth_user');
  sessionStorage.removeItem('noon_ops_splash_seen');
  sessionStorage.removeItem('cached_trips_data');
  localStorage.removeItem('noon_ops_active_tab');
  location.reload();
}

function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  let cleanStr = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  let num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

/* ROBUST DATE PARSER FOR TIMESTAMPS COMPARISON */
function parseDateToTimestamp(val) {
  if (!val) return 0;
  let str = String(val).trim();
  
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    let [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getTime();
  }
  
  if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    let [d, m, y] = str.split('/').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getTime();
  }

  let dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  }
  return 0;
}

function formatExcelDate(val) {
  if (!val) return "";
  let strVal = String(val).trim();

  if (strVal.match(/^\d{4}-\d{2}-\d{2}$/)) return strVal;

  if (strVal.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    let parts = strVal.split('/');
    let d = parts[0].padStart(2, '0');
    let m = parts[1].padStart(2, '0');
    let y = parts[2];
    return `${y}-${m}-${d}`;
  }

  let num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    if (typeof XLSX !== 'undefined' && XLSX.SSF) {
      let dateObj = XLSX.SSF.parse_date_code(num);
      if (dateObj) {
        let y = dateObj.y;
        let m = String(dateObj.m).padStart(2, '0');
        let d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  let d = new Date(strVal);
  if (!isNaN(d.getTime())) {
    let year = d.getUTCFullYear();
    let month = String(d.getUTCMonth() + 1).padStart(2, '0');
    let day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return strVal;
}

/* ATTENDANCE DATA ENGINE */
async function fetchAttendanceSheetData() {
  const updatedTag = document.getElementById('attLastUpdatedTag');
  if (updatedTag) updatedTag.innerText = "⏳ Syncing Attendance Sheet...";

  try {
    let response = await fetch(`${APPS_SCRIPT_URL}?action=getAttendance`);
    if (!response.ok) throw new Error("Attendance Fetch Failure");

    let matrix = await response.json();

    if (matrix && matrix.length > 2) {
      parseAttendanceMatrix(matrix);
      if (updatedTag) updatedTag.innerText = `✅ Live Synced (${globalAttendanceRaw.length} Records) at ${new Date().toLocaleTimeString()}`;
    } else {
      if (updatedTag) updatedTag.innerText = `⚠️ Attendance Tab Empty.`;
    }
  } catch (err) {
    console.error("Attendance Fetch Error:", err);
    if (updatedTag) updatedTag.innerText = `⚠️ Connection Error via Apps Script API`;
  }
}

function parseAttendanceMatrix(matrix) {
  globalAttendanceRaw = [];
  const headerDatesRow = matrix[0];

  for (let r = 2; r < matrix.length; r++) {
    const row = matrix[r];
    const hub = String(row[0] || "").trim();
    const entity = String(row[1] || "").trim();
    const plate = String(row[2] || "").trim();
    const type = String(row[3] || "").trim();
    const vehicleStatus = String(row[4] || "").trim();

    if (!plate) continue;

    for (let c = 5; c < row.length; c += 2) {
      let rawDateStr = String(headerDatesRow[c] || "").trim();
      let statusVal = String(row[c] || "").trim();
      let tripsVal = parseCleanNumber(row[c+1]);

      if (!rawDateStr && c > 5) {
        rawDateStr = String(headerDatesRow[c-1] || "").trim();
      }

      let parsedDate = formatExcelDate(rawDateStr);

      if (parsedDate && statusVal) {
        globalAttendanceRaw.push({
          hub: hub,
          entity: entity,
          plate: plate,
          type: type,
          vehicleStatus: vehicleStatus,
          date: parsedDate,
          dateDisplay: rawDateStr,
          attendanceStatus: statusVal,
          tripsCount: tripsVal
        });
      }
    }
  }

  applyAttendanceFilters();
}

function applyAttendanceFilters() {
  const fromDate = document.getElementById('attFilterFrom') ? document.getElementById('attFilterFrom').value : '';
  const toDate = document.getElementById('attFilterTo') ? document.getElementById('attFilterTo').value : '';
  const statusFilter = document.getElementById('attFilterStatus') ? document.getElementById('attFilterStatus').value.toUpperCase() : 'ALL';
  const query = document.getElementById('attSearchInput') ? document.getElementById('attSearchInput').value.toLowerCase().trim() : '';

  const fromTime = fromDate ? parseDateToTimestamp(fromDate) : 0;
  const toTime = toDate ? parseDateToTimestamp(toDate) : 0;

  filteredAttendance = globalAttendanceRaw.filter(item => {
    let itemTime = parseDateToTimestamp(item.date);

    let matchFrom = !fromTime || itemTime >= fromTime;
    let matchTo = !toTime || itemTime <= toTime;
    let matchStatus = statusFilter === 'ALL' || item.attendanceStatus.toUpperCase().trim() === statusFilter;
    let matchQuery = !query || 
      item.plate.toLowerCase().includes(query) || 
      item.entity.toLowerCase().includes(query) || 
      item.type.toLowerCase().includes(query) ||
      item.hub.toLowerCase().includes(query);

    return matchFrom && matchTo && matchStatus && matchQuery;
  });

  renderAttendanceDashboard();
}

function renderAttendanceDashboard() {
  const tbody = document.getElementById('attTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const uniquePlates = new Set(filteredAttendance.map(i => i.plate)).size;
  const presentCount = filteredAttendance.filter(i => i.attendanceStatus.toLowerCase() === 'present').length;
  const absentCount = filteredAttendance.filter(i => i.attendanceStatus.toLowerCase() === 'absent').length;
  const totalTrips = filteredAttendance.reduce((acc, curr) => acc + curr.tripsCount, 0);

  if (document.getElementById('attStatTotalVehicles')) document.getElementById('attStatTotalVehicles').innerText = uniquePlates;
  if (document.getElementById('attStatPresent')) document.getElementById('attStatPresent').innerText = presentCount;
  if (document.getElementById('attStatAbsent')) document.getElementById('attStatAbsent').innerText = absentCount;
  if (document.getElementById('attStatTrips')) document.getElementById('attStatTrips').innerText = totalTrips;

  if (filteredAttendance.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">No attendance records found matching selected filters.</td></tr>`;
    return;
  }

  filteredAttendance.forEach((item) => {
    let isPresent = item.attendanceStatus.toLowerCase() === 'present';
    let badgeStyle = isPresent ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#991b1b;';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.hub}</strong></td>
      <td>${item.entity}</td>
      <td><strong style="color:var(--primary-red); font-size:13px;">${item.plate}</strong></td>
      <td>${item.type}</td>
      <td><span class="badge-wh">${item.vehicleStatus}</span></td>
      <td><strong>${item.date}</strong></td>
      <td><span class="badge-status" style="${badgeStyle}">${item.attendanceStatus}</span></td>
      <td><strong>${item.tripsCount}</strong> Trips</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportAttendanceExcel() {
  let ws = XLSX.utils.json_to_sheet(filteredAttendance);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance_Filter_Result");
  XLSX.writeFile(wb, `Fleet_Attendance_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* TRIPS GOOGLE SHEET ENGINE (WITH SESSION CACHING & FAST LOAD) */
async function fetchGoogleSheetData() {
  const updatedTag = document.getElementById('lastUpdatedTag');
  if (updatedTag) updatedTag.innerText = "⏳ Syncing Google Sheets API...";

  const cachedData = sessionStorage.getItem('cached_trips_data');
  if (cachedData) {
    try {
      globalDataEntryRaw = JSON.parse(cachedData);
      if (updatedTag) updatedTag.innerText = `✅ Fast Loaded (${globalDataEntryRaw.length} rows)`;
      populateFilterDropdowns();
      bindFilterEventListeners();
      selectQuickDate('de', 'ALL');
    } catch(e) {}
  }

  try {
    let response = await fetch(`${APPS_SCRIPT_URL}?action=getTrips`);
    if (!response.ok) throw new Error("Connection Failure");

    let matrix = await response.json();

    if (matrix && matrix.length > 1) {
      globalDataEntryRaw = matrix.slice(1).filter(r => r.some(c => String(c).trim() !== "")).map(r => {
        r[0] = formatExcelDate(r[0]); 
        return r;
      });
      sessionStorage.setItem('cached_trips_data', JSON.stringify(globalDataEntryRaw));
      if (updatedTag) updatedTag.innerText = `✅ Live Synced (${globalDataEntryRaw.length} rows) at ${new Date().toLocaleTimeString()}`;
    }
  } catch (err) {
    console.error("Fetch error:", err);
    if (updatedTag && !globalDataEntryRaw.length) updatedTag.innerText = `⚠️ Connection Error via Apps Script API`;
  }

  populateFilterDropdowns();
  bindFilterEventListeners();
  selectQuickDate('de', 'ALL');
}

function bindFilterEventListeners() {
  const deVehicle = document.getElementById('deVehicleFilter');
  const deTrip = document.getElementById('deTripFilter');
  const deTemp = document.getElementById('deTempFilter');
  const deSearch = document.getElementById('deSearchInput');

  if (deVehicle) deVehicle.onchange = applyDataEntryFilters;
  if (deTrip) deTrip.onchange = applyDataEntryFilters;
  if (deTemp) deTemp.onchange = applyDataEntryFilters;
  if (deSearch) deSearch.onkeyup = applyDataEntryFilters;
}

function populateFilterDropdowns() {
  const vSelect = document.getElementById('deVehicleFilter');
  const tSelect = document.getElementById('deTripFilter');

  if (!vSelect || !tSelect) return;

  const currentV = vSelect.value;
  const currentT = tSelect.value;

  vSelect.innerHTML = `<option value="ALL">All Vehicles</option>`;
  tSelect.innerHTML = `<option value="ALL">All Trips</option>`;

  const uniqueVehicles = [...new Set(globalDataEntryRaw.map(r => String(r[8] || "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
  const uniqueTrips = [...new Set(globalDataEntryRaw.map(r => String(r[7] || "").trim()).filter(Boolean))].sort();

  uniqueVehicles.forEach(v => { vSelect.innerHTML += `<option value="${v}">${v}</option>`; });
  uniqueTrips.forEach(t => { tSelect.innerHTML += `<option value="${t}">${t}</option>`; });

  vSelect.value = currentV;
  tSelect.value = currentT;
}

function applyDataEntryFilters() {
  const fromDate = document.getElementById('deFilterFrom') ? document.getElementById('deFilterFrom').value : '';
  const toDate = document.getElementById('deFilterTo') ? document.getElementById('deFilterTo').value : '';
  const selectedVehicle = document.getElementById('deVehicleFilter') ? document.getElementById('deVehicleFilter').value : 'ALL';
  const selectedTrip = document.getElementById('deTripFilter') ? document.getElementById('deTripFilter').value : 'ALL';
  const tempFilter = document.getElementById('deTempFilter') ? document.getElementById('deTempFilter').value : 'ALL';
  const query = document.getElementById('deSearchInput') ? document.getElementById('deSearchInput').value.toLowerCase().trim() : '';

  const fromTime = fromDate ? parseDateToTimestamp(fromDate) : 0;
  const toTime = toDate ? parseDateToTimestamp(toDate) : 0;

  filteredDataEntry = globalDataEntryRaw.filter(row => {
    const dateVal = formatExcelDate(row[0]);
    const rowTime = parseDateToTimestamp(dateVal);

    const tripVal = String(row[7] || "").trim(); 
    const vehVal  = String(row[8] || "").trim(); 
    const tempVal = parseCleanNumber(row[12]);

    const matchFrom = !fromTime || rowTime >= fromTime;
    const matchTo = !toTime || rowTime <= toTime;
    const matchVehicle = (selectedVehicle === "ALL" || vehVal === selectedVehicle);
    const matchTrip = (selectedTrip === "ALL" || tripVal === selectedTrip);
    
    let matchTemp = true;
    if (tempFilter === 'OK') matchTemp = (tempVal <= 5 && tempVal !== 0);
    else if (tempFilter === 'WARN') matchTemp = (tempVal > 5 && tempVal <= 8);
    else if (tempFilter === 'CRITICAL') matchTemp = (tempVal > 8);

    const matchQuery = query === "" || row.some(cell => String(cell).toLowerCase().includes(query));

    return matchFrom && matchTo && matchVehicle && matchTrip && matchTemp && matchQuery;
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

  filteredDataEntry.forEach((row, i) => {
    const tempVal = parseCleanNumber(row[12]);
    let tempStyle = "";
    if (tempVal > 8) tempStyle = "color: var(--primary-red); font-weight: 900;";
    else if (tempVal > 5) tempStyle = "color: var(--warning-yellow); font-weight: 800;";
    else if (tempVal > 0) tempStyle = "color: var(--green-accent); font-weight: 700;";

    const tr = document.createElement('tr');
    tr.style.cursor = "pointer";
    tr.setAttribute('onclick', `openTripModal(${i})`);
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

function exportDataEntryExcel() {
  let exportData = filteredDataEntry.map(r => ({
    Date: formatExcelDate(r[0]),
    Trip_ID: r[1],
    DS_Code: r[2],
    Store_Name: r[3],
    Cluster: r[4],
    Status: r[5],
    Shift: r[6],
    Task_Trip_NR: r[7],
    Vehicle_No: r[8],
    DA_Name: r[9],
    Dispatcher: r[10],
    Dock_No: r[11],
    Temp_C: r[12],
    Gate_Passes: r[13],
    Physical_Totes: r[14],
    Validation: r[15],
    Qty_Dispatched: r[16],
    Pallet_Barcodes: r[17],
    Not_Dispatched: r[18],
    KM: r[19],
    Travel_Time: r[20]
  }));

  let ws = XLSX.utils.json_to_sheet(exportData);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dispatch_Operations_Data");
  XLSX.writeFile(wb, `Dispatch_Operations_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ANALYTICS CARDS ENGINE WITH VISUAL PROGRESS BARS */
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
    const tripId = String(r[7] || r[1] || "").trim();
    const totes = parseCleanNumber(r[14]);
    const barcodeStr = String(r[17] || "");
    const barcodeCount = barcodeStr ? barcodeStr.split(/[,|]/).length : 1;

    const key = `${driver}___${veh}`;
    
    if (!driverMap[key]) {
      driverMap[key] = { totes: 0, qty: 0, stores: new Set(), barcodes: 0, driver: driver, veh: veh, tripId: tripId };
    }
    driverMap[key].totes += totes;
    driverMap[key].qty += qty;
    driverMap[key].barcodes += barcodeCount;
    if (store) driverMap[key].stores.add(store);

    const temp = parseCleanNumber(r[12]);
    if (temp > 0) {
      if (temp <= 5) okTemps++;
      else if (temp <= 8) warnTemps++;
      else criticalTemps++;
    }
  });

  const driverBody = document.getElementById('deDriverTableBody');
  if (driverBody) {
    driverBody.innerHTML = '';
    const sortedDrivers = Object.keys(driverMap).sort((a,b) => driverMap[b].qty - driverMap[a].qty);
    if(document.getElementById('deDriverCountLbl')) document.getElementById('deDriverCountLbl').innerText = `${sortedDrivers.length} Drivers`;

    sortedDrivers.forEach((dKey) => {
      const dData = driverMap[dKey];
      driverBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="openTripModal('${dData.tripId}')">
          <td><strong>${dData.driver} (${dData.veh})</strong></td>
          <td><strong style="color:var(--blue-accent);">${dData.stores.size} Stores</strong></td>
          <td><strong>${dData.barcodes} Pallets</strong> / ${dData.totes} Totes</td>
          <td><strong style="color:var(--green-accent);">${dData.qty.toLocaleString()} QTY</strong></td>
          <td><button class="btn btn-dark" style="padding:3px 6px; font-size:10px;" onclick="event.stopPropagation(); openTripModal('${dData.tripId}')">🔍 Inspect</button></td>
        </tr>
      `;
    });
  }

  const storeBody = document.getElementById('deStoreTableBody');
  if (storeBody) {
    storeBody.innerHTML = '';
    const sortedStores = Object.keys(storeMap).sort((a,b) => storeMap[b] - storeMap[a]);
    if(document.getElementById('deStoreCountLbl')) document.getElementById('deStoreCountLbl').innerText = `${sortedStores.length} Stores`;

    sortedStores.forEach(st => {
      const val = storeMap[st];
      const pct = totalDispatchedQty > 0 ? ((val / totalDispatchedQty) * 100).toFixed(1) : 0;
      storeBody.innerHTML += `
        <tr>
          <td><strong>${st}</strong></td>
          <td><strong>${val.toLocaleString()} QTY</strong></td>
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

/* DRIVERS ANALYTICS TAB ENGINE */
let driversSummaryList = [];

function renderDriversDashboard() {
  const tbody = document.getElementById('driversReportTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const fromDate = document.getElementById('drvFilterFrom') ? document.getElementById('drvFilterFrom').value : '';
  const toDate = document.getElementById('drvFilterTo') ? document.getElementById('drvFilterTo').value : '';
  const query = document.getElementById('drvSearchInput') ? document.getElementById('drvSearchInput').value.toLowerCase().trim() : '';

  const fromTime = fromDate ? parseDateToTimestamp(fromDate) : 0;
  const toTime = toDate ? parseDateToTimestamp(toDate) : 0;

  const driverMap = {};

  globalDataEntryRaw.forEach(r => {
    const dDate = formatExcelDate(r[0]);
    const rTime = parseDateToTimestamp(dDate);

    if (fromTime && rTime < fromTime) return;
    if (toTime && rTime > toTime) return;

    const driver = String(r[9] || "Unassigned").trim();
    const veh = String(r[8] || "Unassigned").trim();
    const qty = parseCleanNumber(r[16]);
    const totes = parseCleanNumber(r[14]);
    const temp = parseCleanNumber(r[12]);
    const store = String(r[3] || "").trim();
    const tripId = String(r[7] || r[1] || "").trim();

    const barcodeStr = String(r[17] || "");
    const barcodeCount = barcodeStr ? barcodeStr.split(/[,|]/).map(s=>s.trim()).filter(Boolean).length : 1;

    const key = `${driver}___${veh}`;

    if (!driverMap[key]) {
      driverMap[key] = {
        driver: driver,
        veh: veh,
        trips: new Set(),
        qty: 0,
        totes: 0,
        pallets: 0,
        stores: new Set(),
        temps: []
      };
    }

    driverMap[key].qty += qty;
    driverMap[key].totes += totes;
    driverMap[key].pallets += barcodeCount;
    if (store) driverMap[key].stores.add(store);
    if (tripId) driverMap[key].trips.add(tripId);
    if (temp > 0) driverMap[key].temps.push(temp);
  });

  let driverKeys = Object.keys(driverMap);

  if (query) {
    driverKeys = driverKeys.filter(k => 
      driverMap[k].driver.toLowerCase().includes(query) || 
      driverMap[k].veh.toLowerCase().includes(query)
    );
  }

  driversSummaryList = driverKeys.map(k => driverMap[k]);

  let totalDrivers = driversSummaryList.length;
  let totalTripsCount = driversSummaryList.reduce((acc, d) => acc + d.trips.size, 0);
  let totalUnitsCount = driversSummaryList.reduce((acc, d) => acc + d.qty, 0);
  let allTemps = [];
  driversSummaryList.forEach(d => allTemps.push(...d.temps));
  let avgFleetTemp = allTemps.length ? (allTemps.reduce((a,b)=>a+b,0)/allTemps.length).toFixed(1) : 0;

  if (document.getElementById('drvKpiTotalDrivers')) document.getElementById('drvKpiTotalDrivers').innerText = totalDrivers;
  if (document.getElementById('drvKpiTotalTrips')) document.getElementById('drvKpiTotalTrips').innerText = totalTripsCount;
  if (document.getElementById('drvKpiTotalUnits')) document.getElementById('drvKpiTotalUnits').innerText = totalUnitsCount.toLocaleString();
  if (document.getElementById('drvKpiAvgTemp')) document.getElementById('drvKpiAvgTemp').innerText = `${avgFleetTemp}°C`;

  if (driversSummaryList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No driver records found for selected criteria.</td></tr>`;
    return;
  }

  driversSummaryList.sort((a,b) => b.qty - a.qty).forEach(d => {
    let avgTemp = d.temps.length ? (d.temps.reduce((a,b)=>a+b,0)/d.temps.length).toFixed(1) : "-";
    let tempBadge = "background:#dcfce7; color:#166534;";
    let tempLabel = "Optimal";

    if (avgTemp > 8) {
      tempBadge = "background:#fee2e2; color:#991b1b;";
      tempLabel = "Critical Breach";
    } else if (avgTemp > 5) {
      tempBadge = "background:#fef3c7; color:#b45309;";
      tempLabel = "Warning Zone";
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.driver}</strong></td>
      <td><strong style="color:var(--primary-red); font-size:13px;">${d.veh}</strong></td>
      <td><strong>${d.trips.size} Trips</strong></td>
      <td><strong style="color:var(--green-accent); font-size:13px;">${d.qty.toLocaleString()} QTY</strong></td>
      <td><strong>${d.pallets.toLocaleString()} Pallets</strong></td>
      <td><strong>${d.totes.toLocaleString()} Totes</strong></td>
      <td><strong style="color:var(--blue-accent);">${d.stores.size} Stores</strong></td>
      <td><strong>${avgTemp !== "-" ? avgTemp + "°C" : "-"}</strong></td>
      <td><span class="badge-status" style="${tempBadge}">${tempLabel}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function exportDriversReportExcel() {
  const exportData = driversSummaryList.map(r => ({
    Driver_Name: r.driver,
    Vehicle_Plate: r.veh,
    Trips_Executed: r.trips.size,
    Dispatched_Qty: r.qty,
    Total_Pallets: r.pallets,
    Total_Totes: r.totes,
    Stores_Served: r.stores.size,
    Avg_Vehicle_Temp: r.temps.length ? (r.temps.reduce((a,b)=>a+b,0)/r.temps.length).toFixed(1) : "N/A"
  }));

  let ws = XLSX.utils.json_to_sheet(exportData);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Drivers_Performance");
  XLSX.writeFile(wb, `Drivers_Performance_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* DAILY REPORT PERFORMANCE DASHBOARD, HEATMAP & CHARTS */
let dailySummaryAggregated = [];

function renderDailyReportDashboard() {
  const tbody = document.getElementById('dailyReportTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const fromDate = document.getElementById('rptFilterFrom') ? document.getElementById('rptFilterFrom').value : '';
  const toDate = document.getElementById('rptFilterTo') ? document.getElementById('rptFilterTo').value : '';

  const fromTime = fromDate ? parseDateToTimestamp(fromDate) : 0;
  const toTime = toDate ? parseDateToTimestamp(toDate) : 0;

  const dailyMap = {};
  const heatmapShiftMap = {};

  globalDataEntryRaw.forEach(r => {
    const dDate = formatExcelDate(r[0]);
    if (!dDate) return;

    const rTime = parseDateToTimestamp(dDate);

    if (fromTime && rTime < fromTime) return;
    if (toTime && rTime > toTime) return;

    const qty = parseCleanNumber(r[16]);
    const totes = parseCleanNumber(r[14]);
    const store = String(r[3] || "").trim();
    const driver = String(r[9] || "").trim();
    const tripId = String(r[7] || r[1] || "").trim();
    const shift = String(r[6] || "Shift 1").trim();

    const barcodeStr = String(r[17] || "");
    const barcodeCount = barcodeStr ? barcodeStr.split(/[,|]/).map(s=>s.trim()).filter(Boolean).length : 1;

    if (!dailyMap[dDate]) {
      dailyMap[dDate] = {
        date: dDate,
        qty: 0,
        pallets: 0,
        totes: 0,
        stores: new Set(),
        drivers: new Set(),
        trips: new Set()
      };
    }

    dailyMap[dDate].qty += qty;
    dailyMap[dDate].totes += totes;
    dailyMap[dDate].pallets += barcodeCount;
    if (store) dailyMap[dDate].stores.add(store);
    if (driver) dailyMap[dDate].drivers.add(driver);
    if (tripId) dailyMap[dDate].trips.add(tripId);

    if (!heatmapShiftMap[dDate]) {
      heatmapShiftMap[dDate] = { "Shift 1": 0, "Shift 2": 0, "Shift 3": 0 };
    }
    let sKey = "Shift 1";
    if (shift.includes("2")) sKey = "Shift 2";
    else if (shift.includes("3")) sKey = "Shift 3";
    heatmapShiftMap[dDate][sKey] += qty;
  });

  const sortedDates = Object.keys(dailyMap).sort();
  dailySummaryAggregated = sortedDates.map(d => dailyMap[d]);

  let kpiQty = 0, kpiPallets = 0, kpiTotes = 0;
  let allStoresSet = new Set(), allDriversSet = new Set(), allTripsSet = new Set();

  dailySummaryAggregated.forEach(d => {
    kpiQty += d.qty;
    kpiPallets += d.pallets;
    kpiTotes += d.totes;
    d.stores.forEach(s => allStoresSet.add(s));
    d.drivers.forEach(dr => allDriversSet.add(dr));
    d.trips.forEach(t => allTripsSet.add(t));
  });

  if (document.getElementById('rptKpiQty')) document.getElementById('rptKpiQty').innerText = kpiQty.toLocaleString();
  if (document.getElementById('rptKpiPallets')) document.getElementById('rptKpiPallets').innerText = kpiPallets.toLocaleString();
  if (document.getElementById('rptKpiTotes')) document.getElementById('rptKpiTotes').innerText = kpiTotes.toLocaleString();
  if (document.getElementById('rptKpiItemsPerTote')) document.getElementById('rptKpiItemsPerTote').innerText = kpiTotes > 0 ? (kpiQty / kpiTotes).toFixed(1) : '0.0';
  if (document.getElementById('rptKpiItemsPerPallet')) document.getElementById('rptKpiItemsPerPallet').innerText = kpiPallets > 0 ? (kpiQty / kpiPallets).toFixed(1) : '0.0';
  if (document.getElementById('rptKpiStores')) document.getElementById('rptKpiStores').innerText = allStoresSet.size;
  if (document.getElementById('rptKpiDrivers')) document.getElementById('rptKpiDrivers').innerText = `${allDriversSet.size} Drivers / ${allTripsSet.size} Trips`;

  if (dailySummaryAggregated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No aggregated daily data available for selected criteria.</td></tr>`;
    renderHeatmapMatrix({});
    renderDailyChart([]);
    renderDailyEfficiencyChart([]);
    return;
  }

  dailySummaryAggregated.forEach(row => {
    const avgItemsPerTote = row.totes > 0 ? (row.qty / row.totes).toFixed(1) : 0;
    const avgItemsPerPallet = row.pallets > 0 ? (row.qty / row.pallets).toFixed(1) : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.date}</strong></td>
      <td><strong style="color:var(--green-accent); font-size:13px;">${row.qty.toLocaleString()} QTY</strong></td>
      <td><strong>${row.pallets.toLocaleString()} Pallets</strong></td>
      <td><strong>${row.totes.toLocaleString()} Totes</strong></td>
      <td><span class="badge-wh" style="background:#e0f2fe; color:#0369a1;">${avgItemsPerTote} Items / Tote</span></td>
      <td><span class="badge-wh" style="background:#fef3c7; color:#b45309;">${avgItemsPerPallet} Items / Pallet</span></td>
      <td><strong>${row.stores.size} Stores</strong></td>
      <td><strong>${row.drivers.size} Drivers</strong></td>
      <td><strong>${row.trips.size} Trips</strong></td>
    `;
    tbody.appendChild(tr);
  });

  renderHeatmapMatrix(heatmapShiftMap);
  renderDailyChart(dailySummaryAggregated);
  renderDailyEfficiencyChart(dailySummaryAggregated);
}

function renderHeatmapMatrix(shiftMap) {
  const tbody = document.getElementById('heatmapTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const dates = Object.keys(shiftMap).sort();
  if (dates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No heatmap matrix data available.</td></tr>`;
    return;
  }

  dates.forEach(d => {
    const s1 = shiftMap[d]["Shift 1"] || 0;
    const s2 = shiftMap[d]["Shift 2"] || 0;
    const s3 = shiftMap[d]["Shift 3"] || 0;
    const maxVal = Math.max(s1, s2, s3, 1);

    const getBg = (val) => {
      let ratio = val / maxVal;
      if (val === 0) return 'background:rgba(255,255,255,0.02); color:var(--text-muted);';
      if (ratio > 0.7) return 'background:rgba(229, 46, 46, 0.25); color:#f87171; font-weight:900;';
      if (ratio > 0.3) return 'background:rgba(245, 158, 11, 0.2); color:#fbbf24; font-weight:800;';
      return 'background:rgba(34, 197, 94, 0.15); color:#4ade80;';
    };

    let peak = "Shift 1";
    if (s2 > s1 && s2 >= s3) peak = "Shift 2";
    if (s3 > s1 && s3 > s2) peak = "Shift 3";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d}</strong></td>
      <td><span style="padding:4px 8px; border-radius:4px; ${getBg(s1)}">${s1.toLocaleString()} QTY</span></td>
      <td><span style="padding:4px 8px; border-radius:4px; ${getBg(s2)}">${s2.toLocaleString()} QTY</span></td>
      <td><span style="padding:4px 8px; border-radius:4px; ${getBg(s3)}">${s3.toLocaleString()} QTY</span></td>
      <td><span class="badge-wh" style="background:#e0f2fe; color:#0369a1;">🔥 ${peak} Peak</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDailyChart(data) {
  const ctx = document.getElementById('dailyVolumeChart');
  if (!ctx) return;

  if (dailyChartInstance) dailyChartInstance.destroy();

  const labels = data.map(d => d.date);
  const qtyData = data.map(d => d.qty);
  const totesData = data.map(d => d.totes);

  dailyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Dispatched Quantity',
          data: qtyData,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: '#22c55e',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Physical Totes Delivered',
          data: totesData,
          backgroundColor: 'rgba(168, 85, 247, 0.7)',
          borderColor: '#a855f7',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { type: 'linear', position: 'left', ticks: { color: '#22c55e' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y1: { type: 'linear', position: 'right', ticks: { color: '#a855f7' }, grid: { drawOnChartArea: false } }
      },
      plugins: { legend: { labels: { color: '#f8fafc' } } }
    }
  });
}

function renderDailyEfficiencyChart(data) {
  const ctx = document.getElementById('dailyEfficiencyChart');
  if (!ctx) return;

  if (dailyEfficiencyChartInstance) dailyEfficiencyChartInstance.destroy();

  const labels = data.map(d => d.date);
  const avgToteData = data.map(d => d.totes > 0 ? (d.qty / d.totes).toFixed(1) : 0);
  const storesData = data.map(d => d.stores.size);

  dailyEfficiencyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Avg Items / Tote',
          data: avgToteData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Stores Served',
          data: storesData,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          type: 'bar',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { type: 'linear', position: 'left', ticks: { color: '#f59e0b' }, grid: { color: 'rgba(245, 158, 11, 0.05)' } },
        y1: { type: 'linear', position: 'right', ticks: { color: '#3b82f6' }, grid: { drawOnChartArea: false } }
      },
      plugins: { legend: { labels: { color: '#f8fafc' } } }
    }
  });
}

function exportDailyReportExcel() {
  const exportData = dailySummaryAggregated.map(r => ({
    Date: r.date,
    Dispatched_Qty: r.qty,
    Total_Pallets: r.pallets,
    Total_Totes: r.totes,
    Avg_Items_Per_Tote: r.totes > 0 ? (r.qty / r.totes).toFixed(1) : 0,
    Avg_Items_Per_Pallet: r.pallets > 0 ? (r.qty / r.pallets).toFixed(1) : 0,
    Stores_Served: r.stores.size,
    Active_Drivers: r.drivers.size,
    Total_Trips: r.trips.size
  }));

  let ws = XLSX.utils.json_to_sheet(exportData);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daily_Dispatch_Summary");
  XLSX.writeFile(wb, `Daily_Dispatch_Summary_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* TRIP DETAILS MODAL & ANIMATED ROAD VISUALIZER */
function openTripModal(indexOrTripId) {
  let tripRows = [];
  let targetTripId = "";

  if (typeof indexOrTripId === 'number') {
    const selectedRow = filteredDataEntry[indexOrTripId] || filteredDataEntry[0];
    if (!selectedRow) return;
    targetTripId = String(selectedRow[7] || selectedRow[1] || "").trim();
  } else {
    targetTripId = String(indexOrTripId).trim();
  }

  tripRows = globalDataEntryRaw.filter(r => 
    String(r[7] || "").trim() === targetTripId || String(r[1] || "").trim() === targetTripId
  );

  if (tripRows.length === 0 && filteredDataEntry[indexOrTripId]) {
    tripRows = [filteredDataEntry[indexOrTripId]];
  }

  const baseRow = tripRows[0] || [];
  const modal = document.getElementById('tripDetailModal');
  if (!modal) return;

  const tripId = targetTripId || "TR-UNKNOWN";
  const vehicleNo = baseRow[8] || "-";
  const driverName = baseRow[9] || "-";
  const tripDate = formatExcelDate(baseRow[0]) || "-";
  const sourceWh = "CAIIDO1 (Main WH)";

  document.getElementById('mTripIdHeader').innerText = tripId;
  document.getElementById('mTripIdTitle').innerText = tripId;
  document.getElementById('mVehicleNo').innerText = vehicleNo;
  document.getElementById('mDriverName').innerText = driverName;
  document.getElementById('mCreatedDate').innerText = `${tripDate}, Dispatch Log`;

  let uniqueStores = [...new Set(tripRows.map(r => String(r[3] || "").trim()).filter(b => Boolean(b) && !b.includes("CAIIDO")))];
  const totalTotes = tripRows.reduce((acc, curr) => acc + parseCleanNumber(curr[14]), 0);
  document.getElementById('mTotalPallets').innerText = `${totalTotes} Totes / Pallets`;

  const mapBox = document.getElementById('mapVisualBox');
  if (mapBox) {
    let mapNodesHTML = `
      <div class="asphalt-road">
        <div class="road-line"></div>
        <div class="transit-jumbo-truck" style="top:-14px; animation: driveTruck 8s linear infinite;">
          <div class="truck-container-box">
            <div class="container-graphics">
              <div class="brand-line-1">EVERYTHING</div>
              <div class="brand-line-2">IN MINUTES</div>
            </div>
          </div>
          <div class="truck-cabin"></div>
          <div class="underglow-leds"></div>
          <div class="truck-wheel wheel-back-1"></div>
          <div class="truck-wheel wheel-back-2"></div>
          <div class="truck-wheel wheel-front"></div>
        </div>
      </div>
      <div class="road-nodes-wrapper">
        <div class="map-node node-start">
          <div class="node-icon">🏢</div>
          <div class="node-label">${sourceWh}</div>
        </div>
    `;

    uniqueStores.forEach((st, idx) => {
      mapNodesHTML += `
        <div class="map-node node-stop">
          <div class="node-icon">🏪</div>
          <div class="node-label">${st} (Store ${idx + 1})</div>
        </div>
      `;
    });

    mapNodesHTML += `</div>`;
    mapBox.innerHTML = mapNodesHTML;
  }

  const tlContainer = document.getElementById('mTimelineList');
  if (tlContainer) {
    tlContainer.innerHTML = '';
    tlContainer.innerHTML += `
      <li class="tl-item active">
        <div class="tl-icon">✓</div>
        <div class="tl-content">
          <strong>${sourceWh}</strong>
          <span>Warehouse Dispatch Clearance</span>
        </div>
      </li>
    `;

    uniqueStores.forEach((st, i) => {
      tlContainer.innerHTML += `
        <li class="tl-item active">
          <div class="tl-icon">✓</div>
          <div class="tl-content">
            <strong>Store Stop ${i + 1}: ${st}</strong>
            <span>Transit & Delivery Complete</span>
          </div>
        </li>
      `;
    });
  }

  const palletsContainer = document.getElementById('mPalletsList');
  if (palletsContainer) {
    palletsContainer.innerHTML = '';
    let totalBarcodesCount = 0;

    tripRows.forEach(r => {
      const storeName = r[3] || "Store";
      const rawBarcodes = String(r[17] || "").trim();
      
      if (rawBarcodes) {
        const bList = rawBarcodes.split(/[,|]/).map(b => b.trim()).filter(Boolean);
        totalBarcodesCount += bList.length;

        bList.forEach(code => {
          palletsContainer.innerHTML += `
            <div class="pallet-item">
              <div>
                <div class="pallet-code">${code}</div>
                <div class="pallet-type">${storeName}</div>
              </div>
              <span class="badge-status">DELIVERED</span>
            </div>
          `;
        });
      }
    });

    document.getElementById('mPalletCountTag').innerText = `${totalBarcodesCount} BARCODES`;
  }

  modal.style.display = 'flex';
}

function closeTripModal() {
  const modal = document.getElementById('tripDetailModal');
  if (modal) modal.style.display = 'none';
}

/* ADMIN CONTROL ENGINE */
async function renderPendingUsersTable() {
  const tbody = document.getElementById('pendingUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Fetching pending registration requests...</td></tr>';

  const users = await fetchUsersFromSheet();
  const pendingUsers = users.filter(u => u.status === 'PENDING');

  tbody.innerHTML = '';
  if (pendingUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No pending registration requests.</td></tr>`;
    return;
  }

  pendingUsers.forEach((u) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name || "N/A"}</strong></td>
      <td>${u.email}</td>
      <td><code>${u.passcode}</code></td>
      <td>
        <button class="btn" style="background:var(--green-accent); padding:4px 10px; font-size:11px;" onclick="updateUserApproval('${u.email}', 'ACTIVE')">✅ Approve & Grant Access</button>
        <button class="btn" style="background:var(--primary-red); font-size:11px;" onclick="updateUserApproval('${u.email}', 'REJECTED')">❌ Reject Request</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function renderAdminUserTable() {
  const tbody = document.getElementById('adminUserTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = await fetchUsersFromSheet();
  const activeUsers = users.filter(u => u.status === 'ACTIVE');

  activeUsers.forEach((u) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.email}</strong></td>
      <td><code>${u.passcode}</code></td>
      <td><span class="badge-wh">${u.role}</span></td>
      <td><span class="badge-status">${u.status}</span></td>
      <td><button class="btn btn-red" style="padding:3px 8px; font-size:10px;" onclick="updateUserApproval('${u.email}', 'REJECTED')">Revoke Access</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateUserApproval(email, status) {
  try {
    let response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'UPDATE_STATUS',
        email: email,
        status: status
      })
    });

    let resData = await response.json();
    if (resData.success) {
      alert(`✅ User status for (${email}) has been updated to ${status}`);
      renderPendingUsersTable();
      renderAdminUserTable();
    } else {
      alert(`⚠️ Error: ${resData.message}`);
    }
  } catch (err) {
    alert("⚠️ Unable to connect to server to update user status.");
  }
}

/* GLOBAL CLICK DISMISS FOR DROPDOWNS */
window.onclick = function(e) {
  if (!e.target.matches('.date-picker-btn') && !e.target.closest('.date-picker-dropdown')) {
    document.querySelectorAll('.date-picker-menu').forEach(m => m.style.display = 'none');
  }
};

/* INITIALIZATION ON LOAD WITH ALL DATES DEFAULT FOR ALL USERS */
window.onload = function() {
  initTheme();
  checkWelcomeSplash();
  checkAuthSession();

  if (document.getElementById('attDateLabel')) document.getElementById('attDateLabel').innerText = "All Dates";
  if (document.getElementById('attFilterFrom')) document.getElementById('attFilterFrom').value = "";
  if (document.getElementById('attFilterTo')) document.getElementById('attFilterTo').value = "";

  fetchAttendanceSheetData();
};
