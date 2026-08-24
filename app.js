/* GOOGLE APPS SCRIPT WEB APP API URL */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQIrKh10aXyRTfuHnw6PvO7l7oCWhgK3Ek5nrf-gXKwV0AFtTRhhgft7kNo2VvnuIX/exec";

/* DEFAULT SYSTEM PARAMETERS */
let SHEET_ID = '1Mr_5nNopFFvu1mEPeqA33QJz2dS65aApJfGQEu91C9w';
let GID_TRIPS = '0';
let GID_ATTENDANCE = '2092258043';

let globalAttendanceRaw = [];
let filteredAttendance = [];
let globalDataEntryRaw = [];
let filteredDataEntry = [];
let remoteUsersList = [];

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

/* FETCH USERS FROM GOOGLE SHEET */
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

  // Master Admin Fallback
  if (email === "admin@noon.com" && passcode === "admin123") {
    const adminUser = { name: "Master Admin", email: "admin@noon.com", role: "ADMIN", tabs: ["attendance", "trips", "admin"] };
    sessionStorage.setItem('noon_ops_auth_user', JSON.stringify(adminUser));
    unlockPortal(adminUser);
    return;
  }

  const users = await fetchUsersFromSheet();
  const matchedUser = users.find(u => u.email === email && u.passcode === passcode);

  if (matchedUser) {
    if (matchedUser.status === "PENDING") {
      errorMsg.innerText = "⏳ Account pending Master Admin approval.";
      errorMsg.style.display = 'block';
      return;
    }
    if (matchedUser.status === "REJECTED") {
      errorMsg.innerText = "❌ Registration request has been rejected.";
      errorMsg.style.display = 'block';
      return;
    }

    matchedUser.tabs = matchedUser.role === 'ADMIN' ? ["attendance", "trips", "admin"] : ["attendance", "trips"];
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

  buildDynamicNavTabs(user);

  if (user.role === 'ADMIN') {
    renderPendingUsersTable();
    renderAdminUserTable();
  }
}

/* NAVIGATION TABS */
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

function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  let cleanStr = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  let num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

/* ATTENDANCE DATA ENGINE */
async function fetchAttendanceSheetData() {
  const updatedTag = document.getElementById('attLastUpdatedTag');
  if (updatedTag) updatedTag.innerText = "⏳ Syncing Attendance Sheet...";

  const attendanceCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_ATTENDANCE}&t=${Date.now()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response = await fetch(attendanceCsvUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Attendance Fetch Failure");

    let csvText = await response.text();
    let workbook = XLSX.read(csvText, { type: 'string' });
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (matrix && matrix.length > 2) {
      parseAttendanceMatrix(matrix);
      if (updatedTag) updatedTag.innerText = `✅ Live Synced (${globalAttendanceRaw.length} Records) at ${new Date().toLocaleTimeString()}`;
    } else {
      if (updatedTag) updatedTag.innerText = `⚠️ Attendance Tab Empty or Invalid.`;
    }
  } catch (err) {
    console.error("Attendance Fetch Error:", err);
    if (updatedTag) updatedTag.innerText = `⚠️ Connection Error (Check Sheet Permissions)`;
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response = await fetch(googleLiveCsvUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

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
    if (updatedTag) updatedTag.innerText = `⚠️ Connection Error (Check Sheet Access)`;
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

  if (filteredDataEntry.length === 0) {
    tbody.innerHTML = `<tr><td colspan="21" class="empty-msg">No matching records found for the selected filter.</td></tr>`;
    return;
  }

  filteredDataEntry.forEach((row, i) => {
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
      <td>${row[12] || "-"}</td>
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
        <button class="btn" style="background:var(--primary-red); padding:4px 10px; font-size:11px;" onclick="updateUserApproval('${u.email}', 'REJECTED')">❌ Reject Request</button>
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

  if (savedSheetId && savedSheetId.trim() !== "") SHEET_ID = savedSheetId;
  if (savedGid && savedGid.trim() !== "") GID_TRIPS = savedGid;

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
