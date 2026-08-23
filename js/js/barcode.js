/* BARCODE STUDIO MODULE */
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
