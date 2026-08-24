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
  { name: "Master Admin", email: "admin@noon.com", passcode: "admin123", role: "ADMIN", tabs: ["barcode", "pace", "trips", "admin"], status: "ACTIVE" },
  { name: "Mustafa Hassan", email: "musnhassan@noon.com", passcode: "1234", role: "USER", tabs: ["barcode", "pace", "trips"], status: "ACTIVE" }
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

/* AUTH UI TOGGLES */
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
    msgBox.style.color = '#f87171';
    msgBox.innerText = '⚠️ All fields are required!';
    return;
  }

  let users = getStoredUsers();
  if (users.find(u => u.email === email)) {
    msgBox.style.display = 'block';
    msgBox.style.color = '#f87171';
    msgBox.innerText = '⚠️ Email already registered!';
    return;
  }

  users.push({
    name: name,
    email: email,
    passcode: passcode,
    role: "USER",
    tabs: ["barcode", "pace", "trips"],
    status: "PENDING"
  });

  saveStoredUsers(users);
  msgBox.style.display = 'block';
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
  if (overlay) overlay.style.display = 'none';

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

function buildDynamicNavTabs(user) {
  const navContainer = document.getElementById('navbarTabs');
  if (!navContainer) return;
  navContainer.innerHTML = '';

  const tabDefinitions = {
    barcode: { id: 'btnTabBarcode', title: '🏷️ Pallet Barcode Studio', target: 'barcodeStudio' },
    pace: { id: 'btnTabPace', title: '📦 Pace Picking Uploader', target: 'pacePicking' },
    trips: { id: 'btnTabTrips', title: '🗂️ Trips Command Center', target: 'dataEntry' },
    admin: { id: 'btnTabAdmin', title: '👑 Admin Control', target: 'adminTab' }
  };

  let allowedKeys = user.tabs || ['barcode', 'pace', 'trips'];
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

  const viewMap = {
    'barcodeStudio': 'barcodeStudioView',
    'pacePicking': 'pacePickingView',
    'dataEntry': 'dataEntryView',
    'adminTab': 'adminTabView'
  };

  const activeViewId = viewMap[targetId] || targetId;
  const targetView = document.getElementById(activeViewId);
  if (targetView) targetView.classList.add('active');

  if (targetId === 'dataEntry' && !globalDataEntryRaw.length) {
    fetchGoogleSheetData();
  } else if (targetId === 'adminTab') {
    renderPendingUsersTable();
    renderAdminUserTable();
  }
}

function logoutSession() {
  sessionStorage.removeItem('noon_ops_auth_user');
  location.reload();
}

/* ADMIN CONTROLS FOR REGISTRATION REQUESTS */
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
    alert(`✅ Account ${email} has been approved!`);
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
      <td><button class="btn btn-dark" style="padding:3px 8px; font-size:10px;" onclick="rejectUser('${u.email}')">Revoke</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/* GOOGLE SHEETS & DASHBOARD ENGINE */
let SHEET_ID = '1IRBTF7ijjyqb5JYLHYBhHVr94vm1hwyH0t9l9sxooQw';
let GID_ID = '1034377000';
let globalDataEntryRaw = [];
let filteredDataEntry = [];

function saveSheetConfig() {
  const sheetInput = document.getElementById('cfgSheetIdInput');
  const gidInput = document.getElementById('cfgGidInput');
  if (!sheetInput || !gidInput) return;

  SHEET_ID = sheetInput.value.trim();
  GID_ID = gidInput.value.trim();

  localStorage.setItem('noon_ops_sheet_id', SHEET_ID);
  localStorage.setItem('noon_ops_gid_id', GID_ID);

  alert("✅ Saved! Syncing sheet...");
  fetchGoogleSheetData();
}

function loadSheetConfig() {
  SHEET_ID = localStorage.getItem('noon_ops_sheet_id') || SHEET_ID;
  GID_ID = localStorage.getItem('noon_ops_gid_id') || GID_ID;

  if (document.getElementById('cfgSheetIdInput')) document.getElementById('cfgSheetIdInput').value = SHEET_ID;
  if (document.getElementById('cfgGidInput')) document.getElementById('cfgGidInput').value = GID_ID;
}

async function fetchGoogleSheetData() {
  const googleLiveCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_ID}&t=${Date.now()}`;
  try {
    let response = await fetch(googleLiveCsvUrl);
    let csvText = await response.text();
    let workbook = XLSX.read(csvText, { type: 'string' });
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (matrix && matrix.length > 1) {
      globalDataEntryRaw = matrix.slice(1);
    }
  } catch (err) { console.error(err); }

  applyDataEntryFilters();
}

function applyDataEntryFilters() {
  filteredDataEntry = globalDataEntryRaw;
  const tbody = document.getElementById('deTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  filteredDataEntry.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.style.cursor = "pointer";
    tr.setAttribute('onclick', `openTripModal(${i})`);
    tr.innerHTML = `
      <td>${row[0] || "-"}</td>
      <td><span class="badge-wh">${row[1] || "-"}</span></td>
      <td>${row[2] || "-"}</td>
      <td><strong>${row[3] || "-"}</strong></td>
      <td><span class="badge-status">${row[5] || "Dispatched"}</span></td>
      <td>${row[8] || "-"}</td>
      <td>${row[9] || "-"}</td>
      <td>${row[12] || "-"}</td>
      <td>${row[14] || "-"}</td>
      <td><strong style="color:var(--green-accent);">${row[16] || "-"}</strong></td>
      <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;">${row[17] || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function openTripModal(index) {
  const row = filteredDataEntry[index];
  if (!row) return;

  const sourceWh = "CAIIDO1"; 
  const targetStore = row[3] || "Store"; 

  document.getElementById('mTripIdHeader').innerText = row[1] || "TRIP";
  document.getElementById('mTripIdTitle').innerText = row[1] || "TRIP";
  document.getElementById('mVehicleNo').innerText = row[8] || "-";
  document.getElementById('mDriverName').innerText = row[9] || "-";
  document.getElementById('mCreatedDate').innerText = row[0] || "-";

  const mapBox = document.getElementById('mapVisualBox');
  mapBox.innerHTML = `
    <div class="map-path-line"></div>
    <div class="map-mini-van"><div class="mini-van-body">noon</div></div>
    <div class="map-node"><span>${sourceWh}</span></div>
    <div class="map-node"><span>${targetStore}</span></div>
  `;

  document.getElementById('tripDetailModal').style.display = 'flex';
}

function closeTripModal() {
  document.getElementById('tripDetailModal').style.display = 'none';
}

window.onload = function() {
  initTheme();
  loadSheetConfig();
  checkAuthSession();
};
