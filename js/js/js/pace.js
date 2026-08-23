/* PACE PICKING UPLOADER MODULE */
let paceGlobalBatchData = [];

function processBatch() {
  const fileInput = document.getElementById('fileInput');
  if (!fileInput || !fileInput.files.length) {
    alert("Please select a valid CSV or Excel file first.");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    paceGlobalBatchData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

    renderPaceTable(paceGlobalBatchData);
  };

  reader.readAsArrayBuffer(file);
}

function renderPaceTable(dataArr) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!dataArr || dataArr.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No batch data available.</td></tr>`;
    return;
  }

  dataArr.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.src_wh_code || row['Source WH'] || "-"}</strong></td>
      <td><strong>${row.dst_wh_code || row['Destination WH'] || "-"}</strong></td>
      <td>${row.target_ship_date || "-"}</td>
      <td>${row.target_ship_time || "-"}</td>
      <td>${row.id_partner || "-"}</td>
      <td><span class="badge-wh">${row.sku || row['SKU'] || "-"}</span></td>
      <td><strong style="color:var(--green-accent);">${row.quantity || row['QTY'] || 0}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  if (document.getElementById('statTotalQty')) {
    const totalQty = dataArr.reduce((acc, curr) => acc + (parseFloat(curr.quantity || curr['QTY']) || 0), 0);
    document.getElementById('statTotalQty').innerText = totalQty.toLocaleString();
  }
}

function clearData() {
  paceGlobalBatchData = [];
  renderPaceTable([]);
}
