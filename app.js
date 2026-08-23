/* DYNAMIC NAV TABS GENERATOR (FIXED) */
function buildDynamicNavTabs(user) {
  const navContainer = document.getElementById('navbarTabs');
  if (!navContainer) return;
  navContainer.innerHTML = '';

  // خريطة الربط الصحيحة بين المعرف والأسماء والشاشات
  const tabDefinitions = {
    barcode: { title: '🏷️ Pallet Barcode Studio', target: 'barcodeStudio' },
    pace: { title: '📦 Pace Picking Uploader', target: 'pacePicking' },
    trips: { title: '🗂️ Trips Command Center', target: 'dataEntry' },
    admin: { title: '👑 Admin Control', target: 'adminTab' }
  };

  let allowedKeys = user.tabs || [];
  
  // إذا كان أدمن ولم تكن التاب مضافة، يتم إضافتها تلقائياً
  if (user.role === 'ADMIN' && !allowedKeys.includes('admin')) {
    allowedKeys.push('admin');
  }

  // إنشاء الأزرار للتابات المسموح بها فقط
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

  // فتح أول تاب مسموحة للمستخدم فوراً
  if (allowedKeys.length > 0) {
    const firstTabTarget = tabDefinitions[allowedKeys[0]].target;
    switchMainTab(firstTabTarget);
  }
}

/* SWITCH TAB LOGIC (FIXED) */
function switchMainTab(targetId) {
  // إخفاء جميع التابات
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

  // ربط المعرفات بالشاشات المظبوطة
  const viewMap = {
    'barcodeStudio': 'barcodeStudioView',
    'pacePicking': 'pacePickingView',
    'dataEntry': 'dataEntryView',
    'adminTab': 'adminTabView'
  };

  const activeViewId = viewMap[targetId] || targetId;
  const targetView = document.getElementById(activeViewId);
  
  if (targetView) {
    targetView.classList.add('active');
  }

  // تفعيل الزرار النشط في الهيدر
  const buttons = document.querySelectorAll('.nav-tab-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(targetId)) {
      btn.classList.add('active');
    }
  });

  // تحميل داتا شيت جوجل أو الجداول في حال فتح التاب الخاصة بها
  if (targetId === 'dataEntry' && !globalDataEntryRaw.length) {
    fetchGoogleSheetData();
  } else if (targetId === 'adminTab') {
    renderAdminUserTable();
    renderAdminTelemetryTable();
    renderResetRequestsTable();
  }
}
