/* AUTHENTICATION & CORE NAVIGATION MODULE */
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

    if (typeof renderAdminTelemetryTable === 'function') {
      const adminTab = document.getElementById('adminTabView');
      if (adminTab && adminTab.classList.contains('active')) {
        renderAdminTelemetryTable();
      }
    }
  }, 4000);
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

function validateLogin() {
  const emailInput = document.getElementById('authEmailInput');
  const passInput = document.getElementById('authPasscodeInput');
  const errorMsg = document.getElementById('authErrorMsg');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim().toLowerCase();
  const passcode = passInput.value.trim();

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

  if (user.role === 'ADMIN' && typeof renderAdminUserTable === 'function') {
    renderAdminUserTable();
    renderAdminTelemetryTable();
    renderResetRequestsTable();
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

  const buttons = document.querySelectorAll('.nav-tab-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(targetId)) {
      btn.classList.add('active');
    }
  });

  if (targetId === 'barcodeStudio' && typeof generateBatch === 'function') {
    generateBatch();
  } else if (targetId === 'dataEntry' && typeof fetchGoogleSheetData === 'function') {
    if (!globalDataEntryRaw.length) fetchGoogleSheetData();
  } else if ((targetId === 'adminTab' || activeViewId === 'adminTabView') && typeof renderAdminUserTable === 'function') {
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

window.onload = function() {
  initTheme();
  checkAuthSession();
  if (typeof generateBatch === 'function') generateBatch();
};
