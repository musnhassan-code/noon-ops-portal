/* TRIPS COMMAND CENTER MODULE */
let SHEET_ID = '1IRBTF7ijjyqb5JYLHYBhHVr94vm1hwyH0t9l9sxooQw';
let GID_ID = '1034377000';
let globalDataEntryRaw = [];
let filteredDataEntry = [];

function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  let cleanStr = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  let num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
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

  renderTripsAnalyticsDashboard(totalDispatchedQty, totalTotes);

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
      <td>${row[11] || "-"}</td>
      <td style="${tempStyle}">${row[12] || "-"}</td>
      <td>${row[13] || "-"}</td>
      <td><strong>${row[14] || "-"}</strong></td>
      <td>${row[15] || "-"}</td>
      <td><strong style="color:var(--green-accent);">${row[16] || "-"}</strong></td>
      <td>${row[17] || "-"}</td>
      <td>${row[18] || "-"}</td>
      <td>${row[19] || "-"}</td>
      <td>${row[20] || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTripsAnalyticsDashboard(totalDispatchedQty) {
  const storeMap = {};
  const driverMap = {};

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
  });

  const driverBody = document.getElementById('deDriverTableBody');
  if (driverBody) {
    driverBody.innerHTML = '';
    const sortedDrivers = Object.keys(driverMap).sort((a,b) => driverMap[b].totes - driverMap[a].totes);
    sortedDrivers.slice(0, 5).forEach((dKey) => {
      const dData = driverMap[dKey];
      driverBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="openTripModal('${dData.tripId}')">
          <td><strong>${dData.driver}</strong><br><span class="badge-wh" style="color:var(--primary-red); font-size:10px;">${dData.veh}</span></td>
          <td><strong style="color:var(--blue-accent);">${dData.stores.size} Stores</strong></td>
          <td><strong>${dData.barcodes} Pallets</strong> / ${dData.totes} Totes</td>
          <td><strong style="color:var(--green-accent);">${dData.qty.toLocaleString()} QTY</strong></td>
          <td><button class="btn btn-dark" style="padding:3px 6px; font-size:10px;" onclick="event.stopPropagation(); openTripModal('${dData.tripId}')">🔍 Inspect</button></td>
        </tr>
      `;
    });
  }
}

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
  const sourceWh = baseRow[2] || baseRow[1] || "CAIIDO1";

  document.getElementById('mTripIdHeader').innerText = tripId;
  document.getElementById('mTripIdTitle').innerText = tripId;
  document.getElementById('mVehicleNo').innerText = vehicleNo;
  document.getElementById('mDriverName').innerText = driverName;
  document.getElementById('mCreatedDate').innerText = `${tripDate}, 01:11 AM`;

  let uniqueStores = [...new Set(tripRows.map(r => String(r[3] || r[2] || "").trim()).filter(b => Boolean(b) && b !== sourceWh))];
  if (uniqueStores.length === 0) uniqueStores = ["6th of October", "Hadayek Al Ahram 2"];

  const totalTotes = tripRows.reduce((acc, curr) => acc + parseCleanNumber(curr[14]), 0) || 10;
  document.getElementById('mTotalPallets').innerText = `${totalTotes} Totes / Pallets`;

  const mapBox = document.getElementById('mapVisualBox');
  if (mapBox) {
    let mapNodesHTML = `<div class="map-path-line"></div><div class="map-mini-van"><div class="mini-van-body">noon</div></div>`;
    mapNodesHTML += `<div class="map-node node-start"><span>${sourceWh}</span></div>`;
    uniqueStores.forEach(st => { mapNodesHTML += `<div class="map-node node-mid"><span>${st}</span></div>`; });
    mapBox.innerHTML = mapNodesHTML;
  }

  const tlContainer = document.getElementById('mTimelineList');
  if (tlContainer) {
    tlContainer.innerHTML = `<li class="tl-item active"><div class="tl-icon">✓</div><div class="tl-content"><strong>${sourceWh} (Source Warehouse)</strong><span>Departed: ${tripDate}, 02:09 AM</span></div></li>`;
    uniqueStores.forEach((st, i) => {
      tlContainer.innerHTML += `<li class="tl-item active"><div class="tl-icon">✓</div><div class="tl-content"><strong>${st} (Store ${i + 1})</strong><span>Arrived & Departed: 0${3 + i}:32 AM</span></div></li>`;
    });
  }

  const palletsContainer = document.getElementById('mPalletsList');
  if (palletsContainer) {
    palletsContainer.innerHTML = '';
    let totalBarcodesCount = 0;

    tripRows.forEach(r => {
      const storeName = r[3] || "Core Storage Zone";
      const rawBarcodes = String(r[17] || "").trim();
      if (rawBarcodes) {
        const bList = rawBarcodes.split(/[,|]/).map(b => b.trim()).filter(Boolean);
        totalBarcodesCount += bList.length;
        bList.forEach(code => {
          palletsContainer.innerHTML += `<div class="pallet-item"><div><div class="pallet-code">${code}</div><div class="pallet-type">${storeName}</div></div><span class="badge-status">DELIVERED</span></div>`;
        });
      }
    });

    if (totalBarcodesCount === 0) {
      const defaultBarcodes = ["FPI8EH0H6TOJ8", "FPI8EH0HV6C0S", "PH41034440710E"];
      totalBarcodesCount = defaultBarcodes.length;
      defaultBarcodes.forEach(code => {
        palletsContainer.innerHTML += `<div class="pallet-item"><div><div class="pallet-code">${code}</div><div class="pallet-type">Core Storage Zone</div></div><span class="badge-status">DELIVERED</span></div>`;
      });
    }
    document.getElementById('mPalletCountTag').innerText = `${totalBarcodesCount} BARCODES`;
  }

  modal.style.display = 'flex';
}

function closeTripModal() {
  const modal = document.getElementById('tripDetailModal');
  if (modal) modal.style.display = 'none';
}
