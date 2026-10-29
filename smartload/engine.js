// ==========================================
// CONFIGURACIÓN DE VERSIÓN Y WEB WORKER LOCAL
// ==========================================
const APP_VERSION = "V15.1";

let solverWorker = null;

function getSolverWorker() {
    if (!solverWorker) {
        solverWorker = new Worker('smartload/solver-worker.js');
    }
    return solverWorker;
}

let currentFileHandle = null; 
let selectedGroupId = null; 
let listaEmpaque = []; 
let instanciasCajas = []; 
let contenedoresFisicos = []; 

function generateUUID() { 
    return 'uuid_' + Math.random().toString(36).substring(2) + Date.now().toString(36); 
}

let dbContenedores = {
  '20ft': { nombre: "20' Standard Container", w: 233, h: 235.6, d: 591.8, maxWeight: 21687, maxVol: 32.487, isSystem: true },
  '40ft': { nombre: "40' Standard Container", w: 233, h: 238.9, d: 1201.5, maxWeight: 26500, maxVol: 67.5, isSystem: true },
  '40hc': { nombre: "40' High Cube Container", w: 235, h: 269, d: 1201.3, maxWeight: 26500, maxVol: 76.0, isSystem: true },
  'custom': { nombre: "Custom Container", w: 235, h: 239, d: 1200, maxWeight: 26500, maxVol: 67.39, isSystem: true }
};

const colorPalette = [
    { hex: '#c5a968', name: 'Ocre Dorado', index: 0 }, { hex: '#b3aae8', name: 'Morado Suave', index: 1 },
    { hex: '#dcdab1', name: 'Beige Claro', index: 2 }, { hex: '#ecc1da', name: 'Rosa Pastel', index: 3 },
    { hex: '#bfeea9', name: 'Verde Menta', index: 4 }, { hex: '#afe8df', name: 'Cian Pastel', index: 5 },
    { hex: '#e6e4f9', name: 'Blanco Hueso', index: 6 }, { hex: '#eeecb3', name: 'Amarillo Pálido', index: 7 }
];

function mostrarToast(mensaje) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        if (typeof mostrarNotificacion === 'function') mostrarNotificacion(mensaje, 'info');
        return;
    }
    toast.innerText = mensaje;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3500);
}

// ==========================================
// IMPORTACIÓN Y EXPORTACIÓN DE PLANTILLA EXCEL/CSV
// ==========================================
function descargarPlantillaCSV() {
    const headers = "Descripcion;Cantidad;Ancho_cm;Largo_cm;Alto_cm;Peso_kg;Geometria;NoInclinable;NoGirar;ExclusivoPiso;Peligroso\n";
    const ejemplo1 = "Bandeja Poucher x 10U;100;56;89;40;12;box;SI;NO;NO;NO\n";
    const ejemplo2 = "Estiba Madera Estandar;10;120;100;165;250;pallet;SI;SI;SI;NO\n";
    const ejemplo3 = "Tambor Aceite Industrial;5;60;60;90;180;barrel;SI;NO;NO;NO\n";
    
    // UTF-8 BOM (\uFEFF) para forzar a Excel a abrirlo directamente en columnas separadas por ;
    const csvContent = "\uFEFF" + headers + ejemplo1 + ejemplo2 + ejemplo3;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Plantilla_Carga_Simulador3D_SmartBudget.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarToast("📥 Plantilla Excel/CSV descargada.");
}

function cargarExcelCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/);
            if (lines.length < 2) {
                alert("El archivo CSV no contiene suficientes datos.");
                return;
            }

            // Detección automática de delimitador (; o , o TAB)
            const headerLine = lines[0];
            let delimiter = ';';
            if (headerLine.includes(',')) delimiter = ',';
            if (headerLine.includes('\t')) delimiter = '\t';

            let itemsImportados = 0;
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(delimiter).map(c => c.trim().replace(/^"(.*)"$/, '$1'));
                if (cols.length < 6) continue;

                const desc = cols[0] || `Item Importado ${i}`;
                const qty = parseInt(cols[1]) || 1;
                const w = parseFloat(cols[2]) || 10;
                const d = parseFloat(cols[3]) || 10;
                const h = parseFloat(cols[4]) || 10;
                const weight = parseFloat(cols[5]) || 0;
                
                let shape = (cols[6] || 'box').toLowerCase();
                if (shape.includes('estiba') || shape.includes('pallet')) shape = 'pallet';
                else if (shape.includes('tambor') || shape.includes('cilindro') || shape.includes('barrel')) shape = 'barrel';
                else shape = 'box';

                const parseBool = (val) => {
                    if (!val) return false;
                    const v = val.toString().toUpperCase().trim();
                    return v === 'SI' || v === 'S' || v === '1' || v === 'TRUE' || v === 'X';
                };

                const noTilt = parseBool(cols[7]);
                const noTurn = parseBool(cols[8]);
                const onFloor = parseBool(cols[9]);
                const dangerous = parseBool(cols[10]);

                const colorObj = colorPalette[listaEmpaque.length % colorPalette.length];

                listaEmpaque.push({
                    id: generateUUID(),
                    shape: shape,
                    qty: qty,
                    desc: desc,
                    w: w,
                    d: d,
                    h: h,
                    weight: weight,
                    color: colorObj.hex,
                    noTilt: noTilt,
                    noTurn: noTurn,
                    onFloor: onFloor,
                    dangerous: dangerous
                });
                itemsImportados++;
            }

            if (itemsImportados > 0) {
                actualizarTabla();
                optimizarCarga();
                mostrarToast(`✅ ${itemsImportados} ítems cargados desde Excel.`);
            } else {
                alert("No se pudieron extraer ítems válidos del archivo.");
            }
        } catch (err) {
            console.error(err);
            alert("Error al procesar el archivo CSV/Excel. Verifica el formato.");
        }
        event.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
}

dragElement(document.getElementById("modal-box")); 
dragElement(document.getElementById("modal-containers"));

function dragElement(elmnt) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; 
  let header = document.getElementById(elmnt.id + "-header");
  if (header) header.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) { if(e.target.tagName === 'SPAN') return; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
  function elementDrag(e) { e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; }
  function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
}

function initColorMenu() {
    let menu = document.getElementById('color-menu-items');
    if (!menu) return;
    menu.innerHTML = '';
    colorPalette.forEach(c => {
        let div = document.createElement('div'); div.className = 'color-option';
        div.innerHTML = `<div class="color-swatch" style="background-color: ${c.hex};"></div>${c.name}`;
        div.onclick = () => selectColor(c.hex, c.name); menu.appendChild(div);
    });
    document.addEventListener('click', function(e) {
        let dp = document.getElementById('custom-color-dropdown');
        if (dp && !dp.contains(e.target)) {
            const m = document.getElementById('color-menu-items');
            if (m) m.style.display = 'none';
        }
    });
}

function toggleColorMenu() {
    const m = document.getElementById('color-menu-items');
    if (!m) return;
    m.style.display = (m.style.display === 'none' || !m.style.display) ? 'block' : 'none';
}
function selectColor(hex, name) {
    document.getElementById('m-color').value = hex;
    document.getElementById('selected-color-swatch').style.backgroundColor = hex;
    document.getElementById('selected-color-name').innerText = name;
    const m = document.getElementById('color-menu-items');
    if (m) m.style.display = 'none';
    updateMini3D();
}
function setColorById(hex) { let color = colorPalette.find(c => c.hex === hex) || colorPalette[0]; document.getElementById('m-color').value = color.hex; document.getElementById('selected-color-swatch').style.backgroundColor = color.hex; document.getElementById('selected-color-name').innerText = color.name; }

function updateAllContDropdowns() {
    let selects = ['ribbon-cont-type', 'individual-cont-type', 'm-fit-cont'];
    selects.forEach(id => {
        let el = document.getElementById(id); if(!el) return; let currentVal = el.value; el.innerHTML = '';
        for(let key in dbContenedores) { let opt = document.createElement('option'); opt.value = key; opt.text = dbContenedores[key].nombre; el.appendChild(opt); }
        if(dbContenedores[currentVal]) el.value = currentVal; if(!currentVal && id === 'ribbon-cont-type') el.value = '40hc';
    });
}

function actualizarCustomDimensions() {
    dbContenedores['custom'].w = parseFloat(document.getElementById('cc-w').value) || 235;
    dbContenedores['custom'].d = parseFloat(document.getElementById('cc-d').value) || 1200;
    dbContenedores['custom'].h = parseFloat(document.getElementById('cc-h').value) || 239;
    dbContenedores['custom'].maxWeight = parseFloat(document.getElementById('cc-kg').value) || 26500;
    dbContenedores['custom'].maxVol = (dbContenedores['custom'].w * dbContenedores['custom'].h * dbContenedores['custom'].d) / 1000000;
    
    if (contenedoresFisicos.length > 0 && contenedoresFisicos[0].tipoKey === 'custom') {
        contenedoresFisicos[0] = crearContenedor('custom');
    }
    optimizarCarga();
}

function cambiarTipoContenedorGlobal() { 
    let key = document.getElementById('ribbon-cont-type').value;
    let customDiv = document.getElementById('custom-cont-dims');
    if (key === 'custom') {
        if (customDiv) customDiv.style.display = 'flex';
        actualizarCustomDimensions();
    } else {
        if (customDiv) customDiv.style.display = 'none';
        contenedoresFisicos = [crearContenedor(key)];
        optimizarCarga();
    }
}

function abrirModalContainers() { let mb = document.getElementById('modal-containers'); mb.style.display = 'block'; if (!mb.style.top) { mb.style.top = '100px'; mb.style.left = '200px'; } showContLibrary(); }
function cerrarModalContainers() { document.getElementById('modal-containers').style.display = 'none'; }

function showContLibrary() {
    let html = '<h4 style="margin-top:0; color:var(--fluent-accent);">Librería de Contenedores</h4><table style="width:100%; text-align:left; border-collapse:collapse;"><tr><th style="border-bottom:1px solid #ccc; padding-bottom:5px;">Nombre</th><th style="border-bottom:1px solid #ccc;">W x H x D (cm)</th><th style="border-bottom:1px solid #ccc;">Peso Máx (kg)</th><th></th></tr>';
    for(let key in dbContenedores) { let c = dbContenedores[key]; html += `<tr><td style="padding:5px 0;">${c.nombre}</td><td>${c.w} x ${c.h} x ${c.d}</td><td>${c.maxWeight}</td><td>${!c.isSystem ? `<button onclick="borrarContTipo('${key}')" style="cursor:pointer; color:red; border:none; background:transparent;">❌</button>` : ''}</td></tr>`; }
    document.getElementById('cont-main-area').innerHTML = html + '</table>';
}

function showNewContForm() {
    let html = `<h4 style="margin-top:0; color:var(--fluent-accent);">Definir Nuevo Contenedor</h4><div class="form-group"><label style="width:120px;">Nombre:</label><input type="text" id="nc-name" value="Custom Reefer"></div><div class="form-group"><label style="width:120px;">Ancho (cm):</label><input type="number" id="nc-w" value="230"></div><div class="form-group"><label style="width:120px;">Largo (cm):</label><input type="number" id="nc-d" value="1150"></div><div class="form-group"><label style="width:120px;">Alto (cm):</label><input type="number" id="nc-h" value="235"></div><div class="form-group"><label style="width:120px;">Peso Máx (kg):</label><input type="number" id="nc-kg" value="25000"></div><div style="margin-top:20px; text-align:right;"><button class="btn-ok" onclick="guardarNuevoContenedor()">💾 Guardar Contenedor</button></div>`;
    document.getElementById('cont-main-area').innerHTML = html;
}

function guardarNuevoContenedor() { 
    let key = 'custom_' + Date.now(); 
    let w = parseFloat(document.getElementById('nc-w').value); 
    let d = parseFloat(document.getElementById('nc-d').value); 
    let h = parseFloat(document.getElementById('nc-h').value); 
    dbContenedores[key] = { nombre: document.getElementById('nc-name').value, w: w, h: h, d: d, maxWeight: parseFloat(document.getElementById('nc-kg').value), maxVol: (w*h*d)/1000000, isSystem: false }; 
    updateAllContDropdowns(); 
    showContLibrary();
    if (typeof window.slSim3dOnContenedorCustom_ === "function") {
        try { window.slSim3dOnContenedorCustom_(key, dbContenedores[key]); } catch (eReg) { /* noop */ }
    }
}

function borrarContTipo(key) { delete dbContenedores[key]; updateAllContDropdowns(); showContLibrary(); }

function escapeXML(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function determineDirection(item, caja) {
    let w = item.w, h = item.h, d = item.d;
    let dw = caja.drawW, dh = caja.drawH, dd = caja.drawD;
    const eq = (a, b) => Math.abs(a - b) < 0.5;

    if (eq(dw, w) && eq(dh, h) && eq(dd, d)) return 1;
    if (eq(dw, d) && eq(dh, h) && eq(dd, w)) return 2;
    if (eq(dw, w) && eq(dh, d) && eq(dd, h)) return 3;
    if (eq(dw, d) && eq(dh, w) && eq(dd, h)) return 4;
    if (eq(dw, h) && eq(dh, w) && eq(dd, d)) return 5;
    if (eq(dw, h) && eq(dh, d) && eq(dd, w)) return 6;
    return 1;
}

/** Shapes que Load! (daubnet) entiende; el resto se exporta como box. */
function loadShapeExport_(shape) {
    const s = String(shape || "box").toLowerCase();
    if (s === "pallet" || s === "box" || s === "barrel") return s;
    return "box";
}

/** Textos seguros para Load! (evita · y no-ASCII que rompen parsers viejos). */
function loadSafeText_(str) {
    return String(str == null ? "" : str)
        .replace(/[·•]/g, "-")
        .replace(/[–—]/g, "-")
        .replace(/[“”«»]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[^\x09\x0A\x0D\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ°]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Dimensiones canónicas Load! (mm) por tipo. Si no coinciden con la librería local
 * de Load!, el contenedor aparece como "(custom)" o no se reconoce.
 */
var LOAD_CONT_CANON_MM_ = {
    "20ft": { type: "20' Standard Container", w: 2330, h: 2356, d: 5918, maxload: 21687 },
    "40ft": { type: "40' Standard Container", w: 2330, h: 2389, d: 12015, maxload: 26500 },
    "40hc": { type: "40' High Cube Container", w: 2350, h: 2690, d: 12013, maxload: 26500 }
};

function loadContExportMm_(c) {
    const key = String((c && c.tipoKey) || "").toLowerCase();
    const canon = LOAD_CONT_CANON_MM_[key];
    if (canon) return canon;
    return {
        type: loadSafeText_((c && c.nombre) || "Custom Container") || "Custom Container",
        w: Math.round((c && c.w ? c.w : 235) * 10),
        h: Math.round((c && c.h ? c.h : 239) * 10),
        d: Math.round((c && c.d ? c.d : 1200) * 10),
        maxload: Math.round((c && c.maxWeight) || 26500)
    };
}

/** drawW/H/D (cm) según direction Load! 1..6 (misma tabla al importar). */
function loadDrawDims_(w, h, d, dir) {
    w = Number(w) || 0; h = Number(h) || 0; d = Number(d) || 0;
    switch (parseInt(dir, 10) || 1) {
        case 2: return { dw: d, dh: h, dd: w };
        case 3: return { dw: w, dh: d, dd: h };
        case 4: return { dw: d, dh: w, dd: h };
        case 5: return { dw: h, dh: w, dd: d };
        case 6: return { dw: h, dh: d, dd: w };
        default: return { dw: w, dh: h, dd: d };
    }
}

/**
 * XML .load compatible con Load! (archivos nativos daubnet).
 * - Sin JSON embebido.
 * - Contenedores con medidas/tipo de librería Load!.
 * - Restricciones solo las del ítem; orientación en <direction> (Optimizar puede girar).
 */
function generateLoadXML() {
    const NL = "\r\n";
    let xml = '<?xml version="1.0" encoding="UTF-8"?>' + NL;
    xml += '<load  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.daubnet.com/ftp/load1.xsd">' + NL;
    xml += '<!-- ' + NL;
    xml += 'This is a container load file, created by Load!' + NL;
    xml += 'For a free download of Load! go to http://www.daubnet.com/english/load.html' + NL;
    xml += 'You need version 1.20 or above to access this file' + NL;
    xml += '  -->' + NL;

    const conts = (contenedoresFisicos && contenedoresFisicos.length)
        ? contenedoresFisicos
        : [{ tipoKey: "20ft", nombre: "20' Standard Container", w: 233, h: 235.6, d: 591.8, maxWeight: 21687, cajas: [] }];

    conts.forEach((c, idx) => {
        const mm = loadContExportMm_(c);
        xml += '<container id="c' + (idx + 1) + '">' + NL;
        xml += '  <width>' + mm.w + '</width>' + NL;
        xml += '  <height>' + mm.h + '</height>' + NL;
        xml += '  <length>' + mm.d + '</length>' + NL;
        xml += '  <maxload>' + mm.maxload + '</maxload>' + NL;
        xml += '  <description>Container #' + (idx + 1) + '</description>' + NL;
        xml += '  <type>' + escapeXML(mm.type) + '</type>' + NL;
        xml += '</container>' + NL;
    });

    /*
     * Un packinglistitem por ítem del Simulador (medidas originales).
     * Restricciones = solo las del ítem (no forzar noturn/notilt por shape=pallet:
     * eso hacía que Load! → Optimizar rearmara distinto al Simulador).
     * Orientación en <direction>; así Optimizar puede girar como nuestro solver.
     */
    xml += '  <packinglist>' + NL;
    listaEmpaque.forEach(item => {
        const shape = loadShapeExport_(item.shape);
        const colorObj = colorPalette.find(cp => cp.hex === item.color);
        const colorIdx = colorObj ? colorObj.index : 0;
        const noTilt = !!item.noTilt;
        const noTurn = !!item.noTurn;
        const onFloor = !!item.onFloor;
        const desc = loadSafeText_(item.desc || "Item") || "Item";
        const weight = Number(item.weight) > 0 ? Number(item.weight) : 0;

        const pkgs = [];
        conts.forEach((cont, cIdx) => {
            (cont.cajas || []).forEach(c => {
                if (String(c.groupId) !== String(item.id)) return;
                pkgs.push({ contIdx: cIdx, caja: c });
            });
        });
        if (!pkgs.length && Array.isArray(instanciasCajas)) {
            instanciasCajas.forEach(c => {
                if (String(c.groupId) !== String(item.id)) return;
                pkgs.push({ contIdx: Math.max(0, parseInt(c.contIdx, 10) || 0), caja: c });
            });
        }

        xml += '    <packinglistitem>' + NL;
        xml += '      <description>' + escapeXML(desc) + '</description>' + NL;
        xml += '      <width>' + Math.round(item.w * 10) + '</width>' + NL;
        xml += '      <height>' + Math.round(item.h * 10) + '</height>' + NL;
        xml += '      <depth>' + Math.round(item.d * 10) + '</depth>' + NL;
        if (weight > 0) xml += '      <weight>' + (Math.round(weight * 1000) / 1000) + '</weight>' + NL;
        xml += '      <shape>' + shape + '</shape>' + NL;
        if (shape === "pallet") xml += '      <baseheight>150</baseheight>' + NL;
        xml += '      <colorindex>' + colorIdx + '</colorindex>' + NL;
        if (noTilt) xml += '      <notilt/>' + NL;
        if (noTurn) xml += '      <noturn/>' + NL;
        if (onFloor) xml += '      <bottommost/>' + NL;

        if (pkgs.length) {
            pkgs.forEach(p => {
                const c = p.caja;
                const dir = determineDirection(item, c);
                const ref = "c" + (Math.min(Math.max(0, p.contIdx), Math.max(0, conts.length - 1)) + 1);
                xml += '      <package>' + NL;
                xml += '        <container ref="' + ref + '" />' + NL;
                xml += '        <direction>' + dir + '</direction>' + NL;
                xml += '        <position-x>' + Math.round((c.x || 0) * 10) + '</position-x>' + NL;
                xml += '        <position-y>' + Math.round((c.y || 0) * 10) + '</position-y>' + NL;
                xml += '        <position-z>' + Math.round((c.z || 0) * 10) + '</position-z>' + NL;
                xml += '      </package>' + NL;
            });
        } else {
            const n = Math.max(1, Math.floor(Number(item.qty) || 1));
            for (let i = 0; i < n; i++) {
                xml += '      <package>' + NL;
                xml += '        <container ref="c1" />' + NL;
                xml += '        <direction>1</direction>' + NL;
                xml += '        <position-x>0</position-x>' + NL;
                xml += '        <position-y>0</position-y>' + NL;
                xml += '        <position-z>0</position-z>' + NL;
                xml += '      </package>' + NL;
            }
        }
        xml += '    </packinglistitem>' + NL;
    });
    xml += '  </packinglist>' + NL;
    xml += '</load>' + NL;
    return xml;
}

async function guardarArchivo(forceSaveAs = false) {
  if (listaEmpaque.length === 0) { alert("No hay datos para guardar."); return; }
  let fileName = document.getElementById('save-filename').value.trim();
  if (!fileName) fileName = "MiCargaLoad";
  if (!fileName.toLowerCase().endsWith(".load")) fileName += ".load";
  const xmlData = generateLoadXML();
  if (!xmlData || xmlData.length < 80 || xmlData.indexOf("<packinglist>") < 0) {
      alert("No se pudo armar el archivo .load. Revisa la lista de carga e intenta otra vez.");
      return;
  }

  const descargarBlob_ = function () {
      const blob = new Blob([xmlData], { type: "text/xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      mostrarToast("✅ Archivo .load descargado (compatible con Load!).");
  };

  if (window.showSaveFilePicker) {
      try {
          let handle = currentFileHandle;
          if (forceSaveAs || !handle) {
              handle = await window.showSaveFilePicker({
                  suggestedName: fileName,
                  types: [{ description: "Load! File", accept: { "text/xml": [".load"] } }]
              });
              currentFileHandle = handle;
          }
          /* createWritable trunca al abrir: solo escribir si ya tenemos XML válido. */
          const writable = await handle.createWritable();
          try {
              await writable.write(xmlData);
              await writable.close();
          } catch (wErr) {
              try { await writable.abort(); } catch (eA) { /* noop */ }
              throw wErr;
          }
          mostrarToast("✅ Archivo .load guardado (compatible con Load!).");
          return;
      } catch (err) {
          if (err && err.name === "AbortError") return;
          console.warn("guardarArchivo FS API:", err);
          descargarBlob_();
          return;
      }
  }

  descargarBlob_();
}

/** Abre .load: input file es más fiable en rutas UNC/red que showOpenFilePicker. */
async function abrirArchivo() {
    const inp = document.getElementById("file-input");
    if (inp) {
        try { inp.value = ""; } catch (eClr) { /* noop */ }
        inp.click();
        return;
    }
    if (window.showOpenFilePicker) {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                excludeAcceptAllOption: false,
                types: [{
                    description: "Archivos Load!",
                    accept: {
                        "text/xml": [".load", ".xml"],
                        "application/xml": [".load", ".xml"],
                        "application/json": [".json"],
                        "application/octet-stream": [".load"]
                    }
                }]
            });
            currentFileHandle = fileHandle;
            const file = await fileHandle.getFile();
            cargarContenidoArchivo(file);
        } catch (e) {
            if (e && e.name === "AbortError") return;
            console.error(e);
            mostrarToast("⚠️ No se pudo abrir el archivo. " + (e && e.message ? e.message : ""));
            alert("No se pudo abrir el archivo Load!.\n" + (e && e.message ? e.message : e));
        }
        return;
    }
    alert("Este navegador no permite seleccionar archivos.");
}

function cargarArchivoInput(event) {
    const file = event.target.files[0];
    if (!file) return;
    currentFileHandle = null;
    cargarContenidoArchivo(file);
}

function loadXmlTagName_(node) {
    const raw = (node && (node.localName || node.nodeName || node.tagName)) || "";
    return String(raw).replace(/^.*:/, "").toLowerCase();
}

/** Hijos elemento directos (XML: children a veces vacío → usar childNodes). */
function loadXmlDirectChildren_(parent, tagName) {
    const out = [];
    if (!parent) return out;
    const want = String(tagName || "").toLowerCase();
    const nodes = parent.childNodes || [];
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n || n.nodeType !== 1) continue;
        if (loadXmlTagName_(n) === want) out.push(n);
    }
    return out;
}

/** Contenedores reales de Load! (hijos de <load>), no los <container ref> de <package>. */
function loadXmlTopContainers_(xmlDoc) {
    const root = xmlDoc && xmlDoc.documentElement;
    if (!root) return [];
    let list = loadXmlDirectChildren_(root, "container").filter(function (n) {
        return !!(n.getAttribute("id") || n.getElementsByTagName("width").length);
    });
    if (list.length) return list;
    /* Fallback: cualquier container con width (por si el árbol viene raro). */
    return Array.from(xmlDoc.getElementsByTagName("container")).filter(function (n) {
        return n.getElementsByTagName("width").length > 0;
    });
}

function loadXmlTipoKey_(typeStr) {
    const str = String(typeStr || "").toLowerCase();
    if (str.includes("high cube") || str.includes("hc")) return "40hc";
    if (str.includes("20")) return "20ft";
    if (str.includes("40")) return "40ft";
    return "40ft";
}

function loadXmlChildText_(node, tag) {
    if (!node) return "";
    const want = String(tag || "").toLowerCase();
    const kids = node.childNodes || [];
    for (let i = 0; i < kids.length; i++) {
        const n = kids[i];
        if (!n || n.nodeType !== 1) continue;
        if (loadXmlTagName_(n) === want) {
            return n.textContent != null ? String(n.textContent).trim() : "";
        }
    }
    const el = node.getElementsByTagName(tag)[0];
    return el && el.textContent != null ? String(el.textContent).trim() : "";
}

function loadXmlHasFlag_(node, tag) {
    if (!node) return false;
    const want = String(tag || "").toLowerCase();
    const kids = node.childNodes || [];
    for (let i = 0; i < kids.length; i++) {
        const n = kids[i];
        if (n && n.nodeType === 1 && loadXmlTagName_(n) === want) return true;
    }
    return node.getElementsByTagName(tag).length > 0;
}

/** True si el archivo ya trae colocación útil (no solo qty clonada en 0,0,0). */
function loadTieneColocacion_(insts) {
    if (!insts || !insts.length) return false;
    const placed = insts.filter(function (inst) { return (Number(inst.drawW) || 0) > 0; });
    if (!placed.length) return false;
    const conts = {};
    placed.forEach(function (inst) { conts[inst.contIdx] = true; });
    if (Object.keys(conts).length > 1) return true;
    if (placed.some(function (inst) {
        return Math.abs(Number(inst.x) || 0) > 0.01
            || Math.abs(Number(inst.y) || 0) > 0.01
            || Math.abs(Number(inst.z) || 0) > 0.01;
    })) return true;
    return placed.length === 1;
}

function loadStripBom_(text) {
    let s = String(text == null ? "" : text);
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    return s;
}

function loadEsXmlLoad_(text) {
    const head = loadStripBom_(text).trim().slice(0, 400).toLowerCase();
    return head.indexOf("<load") >= 0 || (head.indexOf("<?xml") >= 0 && String(text).toLowerCase().indexOf("<load") >= 0);
}

function loadImportarContenedorNodo_(cNode, index, contIdMap) {
    const cId = cNode.getAttribute("id") || ("c" + (index + 1));
    const cTypeStr = loadXmlChildText_(cNode, "type");
    const tipoKey = loadXmlTipoKey_(cTypeStr);
    const xmlW = (parseInt(loadXmlChildText_(cNode, "width"), 10) || 0) / 10;
    const xmlH = (parseInt(loadXmlChildText_(cNode, "height"), 10) || 0) / 10;
    const xmlD = (parseInt(loadXmlChildText_(cNode, "length"), 10) || 0) / 10;
    const xmlMaxWgt = parseInt(loadXmlChildText_(cNode, "maxload"), 10) || 0;
    const cont = crearContenedor(tipoKey);
    cont.nombre = cTypeStr || cont.nombre;
    if (xmlW > 0) cont.w = xmlW;
    if (xmlH > 0) cont.h = xmlH;
    if (xmlD > 0) cont.d = xmlD;
    if (xmlMaxWgt > 0) cont.maxWeight = xmlMaxWgt;
    cont.maxVol = (cont.w * cont.h * cont.d) / 1000000;
    contenedoresFisicos.push(cont);
    contIdMap[cId] = index;
}

function loadImportarPackingItemNodo_(node, contIdMap) {
    const desc = loadXmlChildText_(node, "description") || "Item Load!";
    const w = (parseInt(loadXmlChildText_(node, "width"), 10) || 0) / 10;
    const h = (parseInt(loadXmlChildText_(node, "height"), 10) || 0) / 10;
    const d = (parseInt(loadXmlChildText_(node, "depth"), 10) || 0) / 10;
    const weight = parseFloat(loadXmlChildText_(node, "weight")) || 0;
    const shape = loadShapeExport_(loadXmlChildText_(node, "shape") || "box");
    const colorIdx = parseInt(loadXmlChildText_(node, "colorindex"), 10) || 0;
    const colorObj = colorPalette.find(function (c) { return c.index === colorIdx; }) || colorPalette[0];
    const noTilt = loadXmlHasFlag_(node, "notilt");
    const noTurn = loadXmlHasFlag_(node, "noturn");
    const floor = loadXmlHasFlag_(node, "floor") || loadXmlHasFlag_(node, "bottommost");
    const packages = node.getElementsByTagName("package");
    const qty = packages.length > 0 ? packages.length : 1;
    const itemId = generateUUID();
    listaEmpaque.push({
        id: itemId, shape: shape, qty: qty, desc: desc,
        w: w, d: d, h: h, weight: weight, color: colorObj.hex,
        noTilt: noTilt, noTurn: noTurn, onFloor: floor, dangerous: false
    });
    if (!packages.length) return;
    Array.from(packages).forEach(function (pkg) {
        const contEl = pkg.getElementsByTagName("container")[0];
        const cRef = contEl ? contEl.getAttribute("ref") : null;
        let dirRaw = loadXmlChildText_(pkg, "direction");
        let dir = parseInt(dirRaw, 10);
        if (!dir || dir < 1 || dir > 6) dir = 1;
        const posX = (parseInt(loadXmlChildText_(pkg, "position-x"), 10) || 0) / 10;
        const posY = (parseInt(loadXmlChildText_(pkg, "position-y"), 10) || 0) / 10;
        const posZ = (parseInt(loadXmlChildText_(pkg, "position-z"), 10) || 0) / 10;
        const dims = loadDrawDims_(w, h, d, dir);
        const contIdx = contIdMap[cRef] !== undefined ? contIdMap[cRef] : 0;
        const inst = {
            uuid: generateUUID(), groupId: itemId, shape: shape,
            w: w, h: h, d: d,
            drawW: dims.dw, drawH: dims.dh, drawD: dims.dd,
            x: posX, y: posY, z: posZ,
            weight: weight, color: colorObj.hex,
            noTilt: noTilt, noTurn: noTurn, onFloor: floor,
            locked: false, contIdx: contIdx
        };
        instanciasCajas.push(inst);
        const targetCont = contenedoresFisicos[contIdx];
        if (targetCont) {
            targetCont.cajas.push(inst);
            targetCont.pesoActual += inst.weight || 0;
            targetCont.volActual += (inst.drawW * inst.drawH * inst.drawD) / 1000000;
            if (inst.z + inst.drawD > targetCont.lenUsada) targetCont.lenUsada = inst.z + inst.drawD;
        }
    });
}

function loadParseXmlLoadDoc_(fileContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(loadStripBom_(fileContent), "text/xml");
    const parseErr = xmlDoc.getElementsByTagName("parsererror")[0];
    if (parseErr) throw new Error("XML Load! inválido");
    contenedoresFisicos = [];
    listaEmpaque = [];
    instanciasCajas = [];
    const contIdMap = {};
    const contNodes = loadXmlTopContainers_(xmlDoc);
    contNodes.forEach(function (cNode, index) {
        loadImportarContenedorNodo_(cNode, index, contIdMap);
    });
    let itemNodes = Array.from(xmlDoc.getElementsByTagName("packinglistitem"));
    if (!itemNodes.length && xmlDoc.getElementsByTagNameNS) {
        itemNodes = Array.from(xmlDoc.getElementsByTagNameNS("*", "packinglistitem"));
    }
    itemNodes.forEach(function (node) {
        loadImportarPackingItemNodo_(node, contIdMap);
    });
    if (!listaEmpaque.length) {
        throw new Error("El .load no trae packinglistitem (¿archivo vacío o de otra versión?)");
    }
}

function finalizarCargaArchivo_(fileName, preservarColocacion) {
    if (!Array.isArray(contenedoresFisicos)) contenedoresFisicos = [];
    if (contenedoresFisicos.length === 0) {
        const ribbon = document.getElementById("ribbon-cont-type");
        const defaultType = (ribbon && ribbon.value) || "40ft";
        contenedoresFisicos.push(crearContenedor(defaultType));
    }
    const fnEl = document.getElementById("save-filename");
    if (fnEl) {
        fnEl.value = String(fileName || "MiCargaLoad").replace(/\.[^/.]+$/, "");
        fnEl.dataset.slUserEdit = "1";
    }
    const fileInp = document.getElementById("file-input");
    if (fileInp) fileInp.value = "";
    const ribbonEl = document.getElementById("ribbon-cont-type");
    if (ribbonEl && contenedoresFisicos[0] && contenedoresFisicos[0].tipoKey) {
        try { ribbonEl.value = contenedoresFisicos[0].tipoKey; } catch (eR) { /* noop */ }
    }
    actualizarTabla();
    if (typeof window.slAfterAbrirLoad === "function") {
        try { window.slAfterAbrirLoad({ fileName: fileName }); } catch (eSl) { console.warn(eSl); }
    } else if (typeof window.slAfterOptimizar === "function") {
        try { window.slAfterOptimizar(); } catch (eAf) { /* noop */ }
    }
    if (preservarColocacion && loadTieneColocacion_(instanciasCajas)) {
        actualizarMetricasGlobales();
        actualizarUIContenedores();
        mostrarToast("✅ " + (listaEmpaque.length) + " ítem(s) Load! abiertos (posiciones preservadas).");
        return;
    }
    mostrarToast("📥 " + listaEmpaque.length + " ítem(s) cargados. Optimizando…");
    optimizarCarga();
}

function cargarContenidoArchivo(file) {
  if (!file) {
      mostrarToast("⚠️ No se recibió archivo.");
      return;
  }
  mostrarToast("📂 Leyendo " + (file.name || "archivo") + "…");
  const reader = new FileReader();
  reader.onerror = function () {
      console.error("FileReader error", reader.error);
      alert("No se pudo leer el archivo (¿ruta de red sin permiso?).\nPrueba copiarlo al escritorio y abrirlo de nuevo.");
      mostrarToast("⚠️ Error leyendo el archivo.");
  };
  reader.onload = function(e) {
    try {
      let fileContent = loadStripBom_(e.target.result);
      let preservar = false;
      if (fileContent.includes("<!-- DiformaSmartLoadData")) {
          let jsonStr = fileContent.split("<!-- DiformaSmartLoadData")[1].split("-->")[0].trim();
          let parsedData = JSON.parse(jsonStr);
          if (parsedData.dbContenedores) { dbContenedores = parsedData.dbContenedores; updateAllContDropdowns(); }
          listaEmpaque = parsedData.listaEmpaque || [];
          instanciasCajas = parsedData.instanciasCajas || [];
          contenedoresFisicos = [];
          if (parsedData.contenedoresFisicos) {
              parsedData.contenedoresFisicos.forEach(function (c) {
                  if (typeof c === "string") {
                      contenedoresFisicos.push(crearContenedor(c));
                  } else {
                      contenedoresFisicos.push({
                          tipoKey: c.tipoKey || "40ft",
                          nombre: c.nombre || "Container",
                          w: parseFloat(c.w || 233),
                          h: parseFloat(c.h || 239),
                          d: parseFloat(c.d || 1201),
                          maxWeight: parseFloat(c.maxWeight || 26500),
                          maxVol: parseFloat(c.maxVol || 67.5),
                          cajas: [], pesoActual: 0, volActual: 0, lenUsada: 0
                      });
                  }
              });
          }
          instanciasCajas.forEach(function (inst) {
              let tc = contenedoresFisicos[inst.contIdx];
              if (tc) {
                  tc.cajas.push(inst);
                  tc.pesoActual += inst.weight || 0;
                  tc.volActual += (inst.drawW * inst.drawH * inst.drawD) / 1000000;
                  if (inst.z + inst.drawD > tc.lenUsada) tc.lenUsada = inst.z + inst.drawD;
              }
          });
          preservar = true;
      } else if (loadEsXmlLoad_(fileContent)) {
          loadParseXmlLoadDoc_(fileContent);
          preservar = true;
      } else {
          throw new Error("Formato no reconocido (se espera .load XML de Load! o con datos SmartLoad)");
      }
      finalizarCargaArchivo_(file && file.name, preservar);
    } catch (err) {
        console.error(err);
        mostrarToast("⚠️ Error al abrir .load");
        alert("Error leyendo archivo Load!.\n" + (err && err.message ? err.message : err));
    }
  };
  reader.readAsText(file);
}

function obtenerRotaciones(caja) {
  let rots = []; let w = caja.w, h = caja.h, d = caja.d; rots.push({w: w, h: h, d: d}); 
  if (!caja.noTurn) rots.push({w: d, h: h, d: w}); 
  if (!caja.noTilt) { rots.push({w: w, h: d, d: h}); if (!caja.noTurn) rots.push({w: d, h: w, d: h}); rots.push({w: h, h: w, d: d}); if (!caja.noTurn) rots.push({w: h, h: d, d: w}); }
  let unicos = []; rots.forEach(r => { if(!unicos.some(u => u.w===r.w && u.h===r.h && u.d===r.d)) unicos.push(r); }); return unicos;
}

function updateFitCalc() {
    let w = parseFloat(document.getElementById('m-w').value) || 1; let d = parseFloat(document.getElementById('m-d').value) || 1; let h = parseFloat(document.getElementById('m-h').value) || 1; let weight = parseFloat(document.getElementById('m-weight').value) || 0; let qty = parseInt(document.getElementById('m-qty').value) || 1;
    let noTilt = document.getElementById('m-no-tilt').checked; let noTurn = document.getElementById('m-no-turn').checked; let contKey = document.getElementById('m-fit-cont').value; let cont = dbContenedores[contKey]; if(!cont) return;
    let rots = obtenerRotaciones({w:w, h:h, d:d, noTilt:noTilt, noTurn:noTurn}); let maxFit = 0;
    for(let rot of rots) {
        let nx = Math.floor(cont.w / rot.w); let ny = Math.floor(cont.h / rot.h); let nz = Math.floor(cont.d / rot.d); let fitUnits = nx * ny * nz;
        if(weight > 0) { let maxByWeight = Math.floor(cont.maxWeight / weight); if(fitUnits > maxByWeight) fitUnits = maxByWeight; }
        if(fitUnits > maxFit) maxFit = fitUnits;
    }
    document.getElementById('fit-text').innerText = maxFit + " ítems caben en"; document.getElementById('m-qty').className = (qty > maxFit) ? 'qty-input-red' : 'qty-input-normal';
}

function limpiarTodo() {
    listaEmpaque = []; instanciasCajas = []; contenedoresFisicos = []; selectedGroupId = null; if (typeof selectedUUIDsSet !== 'undefined') selectedUUIDsSet.clear(); currentFileHandle = null;
    document.getElementById('save-filename').value = 'MiCargaLoad';
    actualizarTabla(); const defaultType = document.getElementById('ribbon-cont-type').value || '40ft'; contenedoresFisicos = [crearContenedor(defaultType)]; actualizarUIContenedores();
}

function abrirModalCaja(esEdicion) {
  const mb = document.getElementById('modal-box'); mb.style.display = 'block'; if (!mb.style.top) { mb.style.top = '100px'; mb.style.left = '350px'; } 
  if(!esEdicion) { document.getElementById('m-id').value = ''; document.getElementById('m-shape').value = 'pallet'; document.getElementById('m-qty').value = 10; document.getElementById('m-desc').value = 'Item Nuevo'; document.getElementById('m-w').value = 129; document.getElementById('m-d').value = 129; document.getElementById('m-h').value = 165; document.getElementById('m-weight').value = 0; setColorById('#c5a968'); document.getElementById('m-no-tilt').checked = false; document.getElementById('m-no-turn').checked = false; document.getElementById('m-floor').checked = false; document.getElementById('m-danger').checked = false; }
  setTimeout(() => { updateMini3D(); updateFitCalc(); }, 50); 
}

function cerrarModalCaja() { document.getElementById('modal-box').style.display = 'none'; }

function guardarItem() {
  const id = document.getElementById('m-id').value; const item = { id: id ? String(id) : generateUUID(), shape: document.getElementById('m-shape').value, qty: parseInt(document.getElementById('m-qty').value), desc: document.getElementById('m-desc').value, w: parseFloat(document.getElementById('m-w').value), d: parseFloat(document.getElementById('m-d').value), h: parseFloat(document.getElementById('m-h').value), weight: parseFloat(document.getElementById('m-weight').value), color: document.getElementById('m-color').value, noTilt: document.getElementById('m-no-tilt').checked, noTurn: document.getElementById('m-no-turn').checked, onFloor: document.getElementById('m-floor').checked, dangerous: document.getElementById('m-danger').checked };
  if (id === '') { listaEmpaque.push(item); } else { const index = listaEmpaque.findIndex(i => String(i.id) === String(id)); if(index > -1) listaEmpaque[index] = item; }
  cerrarModalCaja(); actualizarTabla(); optimizarCarga();
}

function seleccionarFila(id) { 
    id = String(id); 
    if (typeof selectedUUIDsSet !== 'undefined') selectedUUIDsSet.clear();
    if (String(selectedGroupId) === id) { 
        selectedGroupId = null; 
    } else { 
        selectedGroupId = id; 
    } 
    actualizarTabla(); 
    actualizarRenderCajas(); 
}

function editarItemLista(idParaEditar = null) {
  const targetId = idParaEditar || selectedGroupId; if(!targetId) { alert("Selecciona un ítem de la lista."); return; }
  const item = listaEmpaque.find(i => String(i.id) === String(targetId)); if(!item) return;
  document.getElementById('m-id').value = item.id; document.getElementById('m-shape').value = item.shape || 'box'; document.getElementById('m-qty').value = item.qty; document.getElementById('m-desc').value = item.desc; document.getElementById('m-w').value = item.w; document.getElementById('m-d').value = item.d; document.getElementById('m-h').value = item.h; document.getElementById('m-weight').value = item.weight; setColorById(item.color); document.getElementById('m-no-tilt').checked = item.noTilt; document.getElementById('m-no-turn').checked = item.noTurn; document.getElementById('m-floor').checked = item.onFloor; document.getElementById('m-danger').checked = item.dangerous || false; abrirModalCaja(true);
}

function duplicarItemLista() {
    if(!selectedGroupId) { alert("Selecciona un ítem de la lista para duplicar."); return; }
    const itemOriginal = listaEmpaque.find(i => String(i.id) === String(selectedGroupId)); if(!itemOriginal) return;
    const itemCopia = { ...itemOriginal, id: generateUUID() }; listaEmpaque.push(itemCopia); selectedGroupId = itemCopia.id; actualizarTabla(); optimizarCarga();
}

function borrarItemLista() { if(!selectedGroupId) return; listaEmpaque = listaEmpaque.filter(i => String(i.id) !== String(selectedGroupId)); selectedGroupId = null; actualizarTabla(); optimizarCarga(); }

function actualizarTabla() {
  const tbody = document.getElementById('table-body'); if (!tbody) return; let html = '';
  listaEmpaque.forEach(item => {
    const idEsc = String(item.id).replace(/'/g, "\\'");
    const isSel = String(item.id) === String(selectedGroupId) ? 'selected' : ''; 
    let icono = item.shape === 'barrel' ? '🛢️' : (item.shape === 'pallet' ? '🪵' : (item.shape === 'huacal' ? '🏗️' : '📦')); 
    if(item.dangerous) icono = '☣️ ' + icono;
    
    let tieneBloqueados = instanciasCajas.some(inst => String(inst.groupId) === String(item.id) && inst.locked);
    if (tieneBloqueados) icono = '🔒 ' + icono;

    html += `<tr class="${isSel}" data-id="${item.id}" onclick="seleccionarFila('${idEsc}')" ondblclick="editarItemLista('${idEsc}')">` +
      `<td><div class="color-box" style="background-color: ${item.color};"></div></td>` +
      `<td style="text-align:right;">${item.qty}</td>` +
      `<td>${icono} ${item.desc}</td>` +
      `<td style="text-align:right;">${item.w}</td>` +
      `<td style="text-align:right;">${item.d}</td>` +
      `<td style="text-align:right;">${item.h}</td>` +
      `<td style="text-align:right;">${item.weight}</td>` +
      `<td class="sl-row-actions" onclick="event.stopPropagation()">` +
        `<button type="button" class="btn btn-link btn-sm p-0 px-1" title="Editar" onclick="editarItemLista('${idEsc}')"><i class="bi bi-pencil"></i></button>` +
        `<button type="button" class="btn btn-link btn-sm p-0 px-1" title="Duplicar" onclick="duplicarItemListaId('${idEsc}')"><i class="bi bi-files"></i></button>` +
        `<button type="button" class="btn btn-link btn-sm p-0 px-1 text-danger" title="Eliminar" onclick="borrarItemListaId('${idEsc}')"><i class="bi bi-trash"></i></button>` +
      `</td></tr>`;
  }); tbody.innerHTML = html;
  if (typeof window.slAfterListaCargaUpdate === 'function') window.slAfterListaCargaUpdate();
}

function duplicarItemListaId(id) {
  if (!id) return;
  selectedGroupId = String(id);
  duplicarItemLista();
}

function borrarItemListaId(id) {
  if (!id) return;
  selectedGroupId = String(id);
  borrarItemLista();
}

function sincronizarInstancias() {
  instanciasCajas = instanciasCajas.filter(inst => listaEmpaque.some(item => String(item.id) === String(inst.groupId)));
  listaEmpaque.forEach(item => {
     let insts = instanciasCajas.filter(i => String(i.groupId) === String(item.id)); let diff = item.qty - insts.length;
     if (diff > 0) { for(let i=0; i<diff; i++) instanciasCajas.push({ ...item, groupId: item.id, uuid: generateUUID(), locked: false }); } 
     else if (diff < 0) {
         let toRemove = -diff;
         for(let i=instanciasCajas.length-1; i>=0 && toRemove>0; i--) { if(String(instanciasCajas[i].groupId) === String(item.id) && !instanciasCajas[i].locked) { instanciasCajas.splice(i, 1); toRemove--; } }
         for(let i=instanciasCajas.length-1; i>=0 && toRemove>0; i--) { if(String(instanciasCajas[i].groupId) === String(item.id)) { instanciasCajas.splice(i, 1); toRemove--; } }
     }
     instanciasCajas.forEach(inst => { if(String(inst.groupId) === String(item.id)) { inst.shape = item.shape || 'box'; inst.w = item.w; inst.d = item.d; inst.h = item.h; inst.weight = item.weight; inst.color = item.color; inst.noTurn = item.noTurn; inst.noTilt = item.noTilt; inst.onFloor = item.onFloor; inst.slMeta = item.slMeta || null; } });
  });
}

function obtenerContenedorActivo() { let key = document.getElementById('ribbon-cont-type').value; return dbContenedores[key] || dbContenedores['40ft']; }

function crearContenedor(tipoKey) { 
    let db = dbContenedores[tipoKey] || obtenerContenedorActivo(); 
    let tk = dbContenedores[tipoKey] ? tipoKey : document.getElementById('ribbon-cont-type').value; 
    return { 
        tipoKey: tk, 
        nombre: db.nombre, 
        w: db.w, 
        h: db.h, 
        d: db.d, 
        maxWeight: db.maxWeight, 
        maxVol: db.maxVol, 
        cajas: [], 
        pesoActual: 0, 
        volActual: 0, 
        lenUsada: 0 
    }; 
}

function cambiarContenedorIndividual() { 
    const idx = parseInt(document.getElementById('view-cont-select').value); 
    if(!isNaN(idx) && contenedoresFisicos[idx]) { 
        let newType = document.getElementById('individual-cont-type').value;
        let nuevoCont = crearContenedor(newType);
        contenedoresFisicos[idx].tipoKey = nuevoCont.tipoKey;
        contenedoresFisicos[idx].nombre = nuevoCont.nombre;
        contenedoresFisicos[idx].w = nuevoCont.w;
        contenedoresFisicos[idx].h = nuevoCont.h;
        contenedoresFisicos[idx].d = nuevoCont.d;
        contenedoresFisicos[idx].maxWeight = nuevoCont.maxWeight;
        contenedoresFisicos[idx].maxVol = nuevoCont.maxVol;
        optimizarCarga(); 
    } 
}

function actualizarMetricasGlobales() {
    contenedoresFisicos.forEach(cont => {
        let pesoAcc = 0;
        let volAcc = 0;
        let lenMax = 0;
        cont.cajas.forEach(c => {
            pesoAcc += floatVal(c.weight);
            volAcc += (floatVal(c.drawW) * floatVal(c.drawH) * floatVal(c.drawD)) / 1000000.0;
            if (floatVal(c.z) + floatVal(c.drawD) > lenMax) {
                lenMax = floatVal(c.z) + floatVal(c.drawD);
            }
        });
        cont.pesoActual = pesoAcc;
        cont.volActual = volAcc;
        cont.lenUsada = lenMax;
    });
    actualizarPanelDerecho();
}

function floatVal(v) { return parseFloat(v) || 0; }

function optimizarCarga() {
    if (listaEmpaque.length === 0) {
        mostrarToast("⚠️️ Agrega o carga ítems antes de optimizar.");
        return;
    }

    let loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = 'flex';

    sincronizarInstancias(); 

    let defaultType = document.getElementById('ribbon-cont-type').value || '40ft';
    if (contenedoresFisicos.length === 0) {
        contenedoresFisicos.push(crearContenedor(defaultType));
    }

    let payload = {
        instanciasCajas: instanciasCajas,
        contenedoresFisicos: contenedoresFisicos.map(c => ({
            tipoKey: c.tipoKey,
            nombre: c.nombre,
            w: c.w, h: c.h, d: c.d,
            maxWeight: c.maxWeight,
            maxVol: c.maxVol
        }))
    };

    const worker = getSolverWorker();

    worker.onmessage = function (e) {
        if (loader) loader.style.display = 'none';
        const data = e.data;

        if (data.status === 'exito') {
            contenedoresFisicos = data.contenedoresFisicos;
            instanciasCajas = data.instanciasCajas;
            /* Reinyecta slMeta/shape desde lista (el worker puede no preservar todo). */
            if (typeof listaEmpaque !== 'undefined') {
                let byId = {};
                listaEmpaque.forEach(function (it) { byId[String(it.id)] = it; });
                instanciasCajas.forEach(function (inst) {
                    let src = byId[String(inst.groupId)];
                    if (!src) return;
                    if (src.shape) inst.shape = src.shape;
                    if (src.slMeta) inst.slMeta = src.slMeta;
                });
                contenedoresFisicos.forEach(function (c) {
                    (c.cajas || []).forEach(function (caja) {
                        let src = byId[String(caja.groupId)];
                        if (!src) return;
                        if (src.shape) caja.shape = src.shape;
                        if (src.slMeta) caja.slMeta = src.slMeta;
                    });
                });
            }
            actualizarUIContenedores();
            if (typeof window.slAfterOptimizar === "function") {
                try { window.slAfterOptimizar(); } catch (eAf) { /* noop */ }
            }
        } else {
            alert("Error en el algoritmo de optimización:\n" + data.mensaje);
        }
    };

    worker.onerror = function (err) {
        if (loader) loader.style.display = 'none';
        console.error("Error en Web Worker:", err);
        alert("Ocurrió un error ejecutando el worker de optimización local.");
    };

    worker.postMessage(payload);
}

function actualizarUIContenedores() {
  contenedoresFisicos = contenedoresFisicos.filter((c, idx) => idx === 0 || c.cajas.length > 0);
  const select = document.getElementById('view-cont-select'); select.innerHTML = '<option value="">-- Ver Todos (Info Global) --</option>'; 
  if(contenedoresFisicos.length === 0) { document.getElementById('change-type-div').style.display = 'none'; } else { contenedoresFisicos.forEach((c, idx) => { select.innerHTML += `<option value="${idx}">Contenedor #${idx+1} (${c.nombre})</option>`; }); document.getElementById('change-type-div').style.display = 'flex'; }
  actualizarPanelDerecho(); construirEscena3D(); 
}

function actualizarPanelDerecho() {
  const idx = document.getElementById('view-cont-select').value; let totalVolMax = 0, totalVolAct = 0, totalWgtMax = 0, totalWgtAct = 0, totalLenMax = 0, totalLenAct = 0;
  if(idx === "") {
      document.getElementById('cont-name').innerText = "Info Contenedores (Global)"; document.getElementById('change-type-div').style.display = 'none';
      if(contenedoresFisicos.length === 0) { let empty = dbContenedores[document.getElementById('ribbon-cont-type').value]; totalVolMax = empty ? empty.maxVol : 0; totalWgtMax = empty ? empty.maxWeight : 0; totalLenMax = empty ? empty.d : 0; } else { contenedoresFisicos.forEach(c => { totalVolMax += c.maxVol; totalVolAct += c.volActual; totalWgtMax += c.maxWeight; totalWgtAct += c.pesoActual; totalLenMax += c.d; totalLenAct += c.lenUsada; }); }
  } else {
      document.getElementById('change-type-div').style.display = 'flex'; const c = contenedoresFisicos[idx]; document.getElementById('individual-cont-type').value = c.tipoKey; document.getElementById('cont-name').innerText = `Contenedor #${parseInt(idx)+1} (${c.nombre})`;
      totalVolMax = c.maxVol; totalVolAct = c.volActual; totalWgtMax = c.maxWeight; totalWgtAct = c.pesoActual; totalLenMax = c.d; totalLenAct = c.lenUsada;
  }
  let pctVol = totalVolMax > 0 ? ((totalVolAct / totalVolMax) * 100).toFixed(1) : "0.0"; document.getElementById('vol-text').innerHTML = `${totalVolAct.toFixed(3)} m³<br>${totalVolMax.toFixed(3)} m³`; document.getElementById('bar-vol').style.width = `${pctVol}%`; document.getElementById('pct-vol').innerText = `${pctVol}%`;
  let pctWgt = totalWgtMax > 0 ? ((totalWgtAct / totalWgtMax) * 100).toFixed(1) : "0.0"; document.getElementById('wgt-text').innerHTML = `${totalWgtAct} kg<br>${totalWgtMax} kg`; document.getElementById('bar-wgt').style.width = `${pctWgt}%`; document.getElementById('pct-wgt').innerText = `${pctWgt}%`;
  let pctLen = totalLenMax > 0 ? ((totalLenAct / totalLenMax) * 100).toFixed(1) : "0.0"; let remLen = (totalLenMax - totalLenAct).toFixed(1); document.getElementById('len-text').innerHTML = `${totalLenAct.toFixed(1)} cm<br>${totalLenMax.toFixed(1)} cm<br>${remLen} cm`; document.getElementById('bar-len').style.width = `${pctLen}%`; document.getElementById('pct-len').innerText = `${pctLen}%`;
  if(is3DInitialized) actualizarRenderCajas(); 
}

function bloquearSeleccion(lockState) { 
    let changed = false; 
    if (typeof selectedUUIDsSet !== 'undefined' && selectedUUIDsSet.size > 0) {
        instanciasCajas.forEach(inst => {
            if (selectedUUIDsSet.has(inst.uuid)) {
                inst.locked = lockState;
                changed = true;
            }
        });
    } else if (selectedGroupId) { 
        instanciasCajas.forEach(inst => { 
            if (String(inst.groupId) === String(selectedGroupId)) { 
                inst.locked = lockState; 
                changed = true; 
            } 
        }); 
    } 
    if (changed) {
        actualizarTabla();
        actualizarRenderCajas();
    }
}

function initSmartLoadEngine() {
    if (typeof initColorMenu === 'function') initColorMenu();
    if (typeof updateAllContDropdowns === 'function') updateAllContDropdowns();
    if (typeof limpiarTodo === 'function') limpiarTodo();
}
window.initSmartLoadEngine = initSmartLoadEngine;

