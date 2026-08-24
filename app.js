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

/* USER DATABASE WITH REGISTRATION QUEUE */
let defaultUsers = [
  { name: "Master Admin", email: "admin@noon.com", passcode: "admin123", role: "ADMIN", tabs: ["attendance", "trips", "admin"], status: "ACTIVE" },
  { name: "Mustafa Hassan", email: "musnhassan@noon.com", passcode: "1234", role: "USER", tabs: ["attendance", "trips"], status: "ACTIVE" },
  { name: "Standard User", email: "user@noon.com", passcode: "1234", role: "USER", tabs: ["attendance", "trips"], status: "ACTIVE" }
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

/* AUTH UI TOGGLES & REGISTRATION */
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

function submitRegistration() {
  const name = document.getElementById('regNameInput').value.trim();
  const email = document.getElementById('regEmailInput').value.trim().toLowerCase();
  const passcode = document.getElementById('regPasscodeInput').value.trim();
  const msgBox = document.getElementById('regErrorMsg');

  if (!name || !email || !passcode) {
    msgBox.style.display = 'block';
    msgBox.style.background = 'rgba(229, 46, 46, 0.1)';
    msgBox.style.color = '#f87171';
    msgBox.innerText = '⚠️ All fields are required!';
    return;
  }

  let users = getStoredUsers();
  if (users.find(u => u.email === email)) {
    msgBox.style.display = 'block';
    msgBox.style.background = 'rgba(229, 46, 46, 0.1)';
    msgBox.style.color = '#f87171';
    msgBox.innerText = '⚠️ Email already registered!';
    return;
  }

  users.push({
    name: name,
    email: email,
    passcode: passcode,
    role: "USER",
    tabs: ["attendance", "trips"],
    status: "PENDING"
  });

  saveStoredUsers(users);
  msgBox.style.display = 'block';
  msgBox.style.background = 'rgba(34, 197, 94, 0.1)';
  msgBox.style.color = '#4ade80';
  msgBox.innerText = '✅ Request submitted! Wait for Admin Approval.';

  setTimeout(() => {
    toggleAuthMode('login');
  }, 2500);
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

  const userDb = getStoredUsers();
  const matchedUser = userDb.find(u => u.email.toLowerCase() === email && u.passcode === passcode);

  if (matchedUser) {
    if (matchedUser.status === "PENDING") {
      errorMsg.innerText = "⏳ Account pending admin approval.";
      errorMsg.style.display = 'block';
      return;
    }
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(matchedUser));
    unlockPortal(matchedUser);
  } else {
    errorMsg.innerText = "⚠️ Invalid credentials or account not found.";
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

  buildDynamicNavTabs(user);

  if (user.role === 'ADMIN') {
    renderPendingUsersTable();
    renderAdminUserTable();
  }
}

/* TAB NAVIGATION SYSTEM */
function buildDynamicNavTabs(user) {
  const navContainer = document.getElementById('navbarTabs');
  if (!navContainer) return;
  navContainer.innerHTML = '';

  const tabDefinitions = {
    attendance: { id: 'btnTabAttendance', title: '🚚 Fleet Attendance', target: 'attendanceView' },
    trips: { id: 'btnTabTrips', title: '🗂️ Middle Mile Command Center', target: 'dataEntryView' },
    admin: { id: 'btnTabAdmin', title: '👑 Admin Control', target: 'adminTabView' }
  };

  let allowedKeys = user.tabs || ['attendance', 'trips'];
  if (user.role === 'ADMIN' && !allowedKeys.includes('admin')) {
    allowedKeys.push('admin');
  }

  allowedKeys.forEach((key) => {
    if (tabDefinitions[key]) {
      const btn = document.createElement('button');
      btn.className = 'nav-tab-btn';
      btn.id = tabDefinitions[key].id;
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

  const targetView = document.getElementById(targetId);
  if (targetView) targetView.classList.add('active');

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
  } else if (targetId === 'adminTabView') {
    renderPendingUsersTable();
    renderAdminUserTable();
  }
}

function logoutSession() {
  sessionStorage.removeItem('noon_ops_auth_user');
  location.reload();
}

/* SAFE NUMBER PARSER */
function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  let cleanStr = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  let num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

/* GOOGLE SHEETS ENGINES */
let SHEET_ID = '1IRBTF7ijjyqb5JYLHYBhHVr94vm1hwyH0t9l9sxooQw';
let GID_TRIPS = '1034377000';
let GID_ATTENDANCE = '2092258043';

let globalAttendanceRaw = [];
let filteredAttendance = [];
let globalDataEntryRaw = [];
let filteredDataEntry = [];

/* ENHANCED FLEET ATTENDANCE LIVE GOOGLE SHEET PARSER */
async function fetchAttendanceSheetData() {
  const updatedTag = document.getElementById('attLastUpdatedTag');
  if (updatedTag) updatedTag.innerText = "⏳ Syncing Attendance Sheet...";

  const attendanceCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_ATTENDANCE}&t=${Date.now()}`;

  try {
    let response = await fetch(attendanceCsvUrl);
    if (!response.ok) throw new Error("Attendance Fetch Failure");
    
    let csvText = await response.text();
    let workbook = XLSX.read(csvText, { type: 'string' });
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (matrix && matrix.length > 2) {
      parseAttendanceMatrix(matrix);
      if (updatedTag) updatedTag.innerText = `✅ Live Synced (${globalAttendanceRaw.length} Records) at ${new Date().toLocaleTimeString()}`;
    }
  } catch (err) {
    console.error("Attendance Fetch Error:", err);
    if (updatedTag) updatedTag.innerText = `⚠️ Attendance Connection Error.`;
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

      let parsedDate = parseStandardDate(rawDateStr);

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

function parseStandardDate(dateStr) {
  if (!dateStr) return "";
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    let year = d.getFullYear();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(dateStr).trim();
}

function applyAttendanceFilters() {
  const fromDate = document.getElementById('attFilterFrom') ? document.getElementById('attFilterFrom').value : '';
  const toDate = document.getElementById('attFilterTo') ? document.getElementById('attFilterTo').value : '';
  const statusFilter = document.getElementById('attFilterStatus') ? document.getElementById('attFilterStatus').value : 'ALL';
  const query = document.getElementById('attSearchInput') ? document.getElementById('attSearchInput').value.toLowerCase() : '';

  filteredAttendance = globalAttendanceRaw.filter(item => {
    let matchFrom = !fromDate || item.date >= fromDate;
    let matchTo = !toDate || item.date <= toDate;
    let matchStatus = statusFilter === 'ALL' || item.attendanceStatus.toLowerCase() === statusFilter.toLowerCase();
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

/* TRIPS GOOGLE SHEET ENGINE */
async function fetchGoogleSheetData() {
  const updatedTag = document.getElementById('lastUpdatedTag');
  if (updatedTag) updatedTag.innerText = "⏳ Syncing Google Sheets API...";

  const googleLiveCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_TRIPS}&t=${Date.now()}`;

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

  // RENDER ALL DRIVERS FULL LIST
  const driverBody = document.getElementById('deDriverTableBody');
  if (driverBody) {
    driverBody.innerHTML = '';
    const sortedDrivers = Object.keys(driverMap).sort((a,b) => driverMap[b].qty - driverMap[a].qty);
    if(document.getElementById('deDriverCountLbl')) document.getElementById('deDriverCountLbl').innerText = `${sortedDrivers.length} Drivers`;

    sortedDrivers.forEach((dKey) => {
      const dData = driverMap[dKey];
      driverBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="openTripModal('${dData.tripId}')">
          <td><strong>${dData.driver}</strong></td>
          <td><strong style="color:var(--blue-accent);">${dData.stores.size} Stores</strong></td>
          <td><strong>${dData.barcodes} Pallets</strong> / ${dData.totes} Totes</td>
          <td><strong style="color:var(--green-accent);">${dData.qty.toLocaleString()} QTY</strong></td>
          <td><button class="btn btn-dark" style="padding:3px 6px; font-size:10px;" onclick="event.stopPropagation(); openTripModal('${dData.tripId}')">🔍 Inspect</button></td>
        </tr>
      `;
    });
  }

  // RENDER STORES
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

  // RENDER TEMPERATURE COMPLIANCE CARD (M)
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

/* DYNAMIC TRIP DETAILS MODAL & MAP ROUTE */
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

  const sourceWh = "CAIIDO1";

  document.getElementById('mTripIdHeader').innerText = tripId;
  document.getElementById('mTripIdTitle').innerText = tripId;
  document.getElementById('mVehicleNo').innerText = vehicleNo;
  document.getElementById('mDriverName').innerText = driverName;
  document.getElementById('mCreatedDate').innerText = `${tripDate}, 01:11 AM`;

  let uniqueStores = [...new Set(tripRows.map(r => String(r[3] || "").trim()).filter(b => Boolean(b) && b !== sourceWh))];

  const totalTotes = tripRows.reduce((acc, curr) => acc + parseCleanNumber(curr[14]), 0);
  const totalQty = tripRows.reduce((acc, curr) => acc + parseCleanNumber(curr[16]), 0);

  document.getElementById('mTotalPallets').innerText = `${totalTotes} Totes / Pallets`;

  const mapBox = document.getElementById('mapVisualBox');
  if (mapBox) {
    let mapNodesHTML = `<div class="map-path-line"></div><div class="map-mini-van"><div class="mini-van-body">noon</div></div>`;
    mapNodesHTML += `<div class="map-node node-start"><span>${sourceWh}</span></div>`;
    
    uniqueStores.forEach((st) => {
      mapNodesHTML += `<div class="map-node node-mid"><span>${st}</span></div>`;
    });

    mapBox.innerHTML = mapNodesHTML;
  }

  const tlContainer = document.getElementById('mTimelineList');
  if (tlContainer) {
    tlContainer.innerHTML = '';
    tlContainer.innerHTML += `
      <li class="tl-item active">
        <div class="tl-icon">✓</div>
        <div class="tl-content">
          <strong>${sourceWh} (Source Warehouse)</strong>
          <span>Departed: ${tripDate}, 02:09 AM</span>
        </div>
      </li>
    `;

    uniqueStores.forEach((st, i) => {
      tlContainer.innerHTML += `
        <li class="tl-item active">
          <div class="tl-icon">✓</div>
          <div class="tl-content">
            <strong>${st} (Store ${i + 1})</strong>
            <span>Arrived & Departed: 0${3 + i}:32 AM</span>
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

/* ADMIN APPROVAL CONTROL ENGINE */
function renderPendingUsersTable() {
  const tbody = document.getElementById('pendingUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = getStoredUsers();
  const pendingUsers = users.filter(u => u.status === 'PENDING');

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
        <button class="btn" style="background:var(--green-accent); padding:4px 10px; font-size:11px;" onclick="approveUser('${u.email}')">✅ Approve & Grant Access</button>
        <button class="btn" style="background:var(--primary-red); padding:4px 10px; font-size:11px;" onclick="rejectUser('${u.email}')">❌ Reject</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function approveUser(email) {
  let users = getStoredUsers();
  const user = users.find(u => u.email === email);
  if (user) {
    user.status = 'ACTIVE';
    saveStoredUsers(users);
    alert(`✅ Account ${email} approved successfully!`);
    renderPendingUsersTable();
    renderAdminUserTable();
  }
}

function rejectUser(email) {
  let users = getStoredUsers();
  users = users.filter(u => u.email !== email);
  saveStoredUsers(users);
  renderPendingUsersTable();
  renderAdminUserTable();
}

function renderAdminUserTable() {
  const tbody = document.getElementById('adminUserTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = getStoredUsers().filter(u => u.status === 'ACTIVE');
  users.forEach((u) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.email}</strong></td>
      <td><code>${u.passcode}</code></td>
      <td><span class="badge-wh">${u.role}</span></td>
      <td><span class="badge-status">${u.status}</span></td>
      <td><button class="btn btn-red" style="padding:3px 8px; font-size:10px;" onclick="rejectUser('${u.email}')">Revoke Access</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function registerUserByAdmin() {
  const email = document.getElementById('newAdminEmail').value.trim().toLowerCase();
  const passcode = document.getElementById('newAdminPasscode').value.trim();
  const role = document.getElementById('newAdminRole').value;

  if (!email || !passcode) {
    alert("⚠️ Email and passcode are required.");
    return;
  }

  let users = getStoredUsers();
  users.push({
    name: "Admin Added",
    email: email,
    passcode: passcode,
    role: role,
    tabs: ["attendance", "trips"],
    status: "ACTIVE"
  });

  saveStoredUsers(users);
  alert(`✅ User ${email} added!`);
  renderAdminUserTable();
}

function saveSheetConfig() {
  const sheetInput = document.getElementById('cfgSheetIdInput');
  const gidInput = document.getElementById('cfgGidInput');

  if (!sheetInput || !gidInput) return;

  const newSheetId = sheetInput.value.trim();
  const newGid = gidInput.value.trim();

  if (!newSheetId || !newGid) {
    alert("⚠️ Please fill in both Google Sheet ID and Tab GID Number!");
    return;
  }

  localStorage.setItem('noon_ops_sheet_id', newSheetId);
  localStorage.setItem('noon_ops_gid_id', newGid);

  SHEET_ID = newSheetId;
  GID_TRIPS = newGid;

  alert("✅ Parameters saved! Re-syncing...");
  fetchGoogleSheetData();
}

function loadSheetConfig() {
  const savedSheetId = localStorage.getItem('noon_ops_sheet_id');
  const savedGid = localStorage.getItem('noon_ops_gid_id');

  if (savedSheetId) SHEET_ID = savedSheetId;
  if (savedGid) GID_TRIPS = savedGid;

  const sheetInput = document.getElementById('cfgSheetIdInput');
  const gidInput = document.getElementById('cfgGidInput');

  if (sheetInput) sheetInput.value = SHEET_ID;
  if (gidInput) gidInput.value = GID_TRIPS;
}

/* INITIALIZATION ON LOAD */
window.onload = function() {
  initTheme();
  loadSheetConfig();
  checkAuthSession();
  fetchAttendanceSheetData();
};
