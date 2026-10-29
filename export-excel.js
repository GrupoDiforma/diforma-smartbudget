var PLANTILLA_PRESUPUESTO_XLSX = "plantillas/presupuesto-diforma.xlsx";
/**
 * Masters de presupuesto: "EXP 17000-A-V1" / "NAL 17000-A-V1" (letra + espacio + código).
 * No confundir con COT01/QUOT01/NAL01 (cotización u hojas legacy sin espacio).
 */
function esHojaPresupuestoExp_(nombre) {
    return /^EXP\s+\S/i.test(String(nombre || "").trim());
}
function esHojaPresupuestoNal_(nombre) {
    return /^NAL\s+\S/i.test(String(nombre || "").trim());
}
function hojaPresupuestoPorNombre_(wb, preferred, esExp) {
    const ok = esExp ? esHojaPresupuestoExp_ : esHojaPresupuestoNal_;
    if (preferred) {
        const w = wb.getWorksheet(preferred);
        if (w && ok(w.name)) return w;
    }
    return wb.worksheets.find(function (s) { return ok(s.name); }) || null;
}

/** Asegura hojaExp/hojaNal de presupuesto; descarta NAL01/COT/QUOT si el workbook está disponible. */
function corregirMapaHojasPresupuesto_(mapa, wb) {
    const m = Object.assign({}, mapa || {});
    const notas = [];
    if (wb) {
        const exp = hojaPresupuestoPorNombre_(wb, m.hojaExp, true);
        const nal = hojaPresupuestoPorNombre_(wb, m.hojaNal, false);
        if (exp) {
            if (m.hojaExp && m.hojaExp !== exp.name) notas.push("hojaExp «" + m.hojaExp + "» → «" + exp.name + "»");
            m.hojaExp = exp.name;
            m.hojaExpPatron = MAPA_XLSX_DEFAULT.hojaExpPatron;
        } else if (m.hojaExp && !esHojaPresupuestoExp_(m.hojaExp)) {
            notas.push("Se quitó hojaExp inválida «" + m.hojaExp + "»");
            m.hojaExp = "";
        }
        if (nal) {
            if (m.hojaNal && m.hojaNal !== nal.name) notas.push("hojaNal «" + m.hojaNal + "» → «" + nal.name + "»");
            m.hojaNal = nal.name;
            m.hojaNalPatron = MAPA_XLSX_DEFAULT.hojaNalPatron;
        } else if (m.hojaNal && !esHojaPresupuestoNal_(m.hojaNal)) {
            notas.push("Se quitó hojaNal inválida «" + m.hojaNal + "»");
            m.hojaNal = "";
        }
    }
    return { mapa: sanitizarMapaXlsx(m), notas: notas };
}

var MAPA_XLSX_DEFAULT = {
    hojaExpPatron: "^EXP\\s+",
    hojaNalPatron: "^NAL\\s+",
    hojaExp: "",
    hojaNal: "",
    codigo: "A3",
    cliente: "C2",
    proyecto: "C3",
    analista: "C4",
    comercial: "K2",
    disenador: "K3",
    fecha: "K4",
    q: ["E7", "G7", "I7"],
    colDesc: "A",
    colCant: "D",
    colU: ["E", "G", "I"],
    fabInicio: 10,
    fabFin: 32,
    comInicio: 37,
    comFin: 39,
    fleteFila: 35,
    trm: "E53"
};
var XLSX_FILAS_FAB = { inicio: 10, fin: 32 };
var XLSX_FILAS_COM = { inicio: 37, fin: 39 };
var XLSX_FILA_FLETE = 35;
var XLSX_MAPA = Object.assign({}, MAPA_XLSX_DEFAULT);

function valCampo(id) {
    return (document.getElementById(id)?.value || "").trim();
}

function tresLotesExportacion(escalas, opts) {
    const src = escalas || (typeof lotesSimulacion !== "undefined" ? lotesSimulacion : [{ id: "l1", q: 1 }]);
    const lots = src.slice().sort(function (a, b) { return (a.q || 0) - (b.q || 0); });
    const avisos = [];
    const sinPad = !!(opts && opts.sinPad);
    if (lots.length > 3) avisos.push("El Excel solo tiene 3 rangos; se exportaron los tres de menor Q.");
    while (lots.length < 3) {
        const last = lots[lots.length - 1] || { id: "l1", q: 1 };
        lots.push({
            id: (last.id || "l") + "_pad" + lots.length,
            q: sinPad ? 0 : (last.q || 1),
            pad: true
        });
        if (!sinPad && lots.length === 3 && (lotesSimulacion || []).length < 3) {
            avisos.push("Se completó a 3 rangos copiando el último Q para la plantilla.");
        }
    }
    return { lots: lots.slice(0, 3), avisos: avisos };
}

function esFleteGlobal(item) {
    if (!item) return false;
    return /flete|transporte|transport/i.test(String(item.nombre || ""));
}

function unitarioLote(item, lote, escalas) {
    if (!item || !lote) return 0;
    if (item.costos && item.costos[lote.id] != null && !lote.pad) return Number(item.costos[lote.id]) || 0;
    if (lote.pad) {
        const real = (escalas || (typeof lotesSimulacion !== "undefined" ? lotesSimulacion : [])).slice().sort(function (a, b) { return a.q - b.q; });
        const last = real[real.length - 1];
        if (last && item.costos && item.costos[last.id] != null) return Number(item.costos[last.id]) || 0;
    }
    return Number(item.costoUnitario) || 0;
}

function montoGlobalLote(item, lote, escalas) {
    const u = unitarioLote(item, lote, escalas);
    const q = Number(lote.q) || 1;
    const cant = Number(item && item.cantidad) || 1;
    if (lote && lote.pad) return 0;
    if (item.es_global) return u * q * cant;
    return u * cant;
}

function escribirCelda(ws, addr, valor) {
    const cell = ws.getCell(addr);
    cell.value = valor;
}

function limpiarFilaItem(ws, row) {
    const m = XLSX_MAPA;
    const u = m.colU || ["E", "G", "I"];
    escribirCelda(ws, (m.colDesc || "A") + row, null);
    escribirCelda(ws, (m.colCant || "D") + row, 0);
    escribirCelda(ws, u[0] + row, 0);
    escribirCelda(ws, u[1] + row, 0);
    escribirCelda(ws, u[2] + row, 0);
}

function escribirFilaItem(ws, row, item, lots, escalas) {
    const m = XLSX_MAPA;
    const u = m.colU || ["E", "G", "I"];
    escribirCelda(ws, (m.colDesc || "A") + row, item.nombre || "");
    escribirCelda(ws, (m.colCant || "D") + row, Number(item.cantidad) || 1);
    lots.forEach(function (lt, i) {
        const val = (lt && lt.pad) ? 0 : unitarioLote(item, lt, escalas);
        escribirCelda(ws, u[i] + row, val);
    });
}

function aplicarMapaXlsx(mapa) {
    XLSX_MAPA = sanitizarMapaXlsx(mapa);
    XLSX_FILAS_FAB = { inicio: XLSX_MAPA.fabInicio, fin: XLSX_MAPA.fabFin };
    XLSX_FILAS_COM = { inicio: XLSX_MAPA.comInicio, fin: XLSX_MAPA.comFin };
    XLSX_FILA_FLETE = XLSX_MAPA.fleteFila;
    try { localStorage.setItem("smartbudget_plantilla_mapa", JSON.stringify(XLSX_MAPA)); } catch (e) {}
    return XLSX_MAPA;
}

function addrXlsxOk(s) {
    return /^[A-Z]{1,3}\d{1,4}$/.test(String(s || "").toUpperCase().trim());
}

function intXlsx(n, min, max, fb) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < min || n > max) return fb;
    return n;
}

function sanitizarMapaXlsx(mapa) {
    const d = MAPA_XLSX_DEFAULT;
    const m = Object.assign({}, d, mapa || {});
    ["codigo", "cliente", "proyecto", "analista", "comercial", "disenador", "fecha", "trm"].forEach(function (k) {
        m[k] = addrXlsxOk(m[k]) ? String(m[k]).toUpperCase() : d[k];
    });
    const q = Array.isArray(m.q) ? m.q : d.q;
    m.q = [0, 1, 2].map(function (i) { return addrXlsxOk(q[i]) ? String(q[i]).toUpperCase() : d.q[i]; });
    m.colDesc = /^[A-Z]{1,3}$/.test(String(m.colDesc || "").toUpperCase()) ? String(m.colDesc).toUpperCase() : d.colDesc;
    m.colCant = /^[A-Z]{1,3}$/.test(String(m.colCant || "").toUpperCase()) ? String(m.colCant).toUpperCase() : d.colCant;
    const u = Array.isArray(m.colU) ? m.colU : d.colU;
    m.colU = [0, 1, 2].map(function (i) {
        const c = String(u[i] || "").toUpperCase();
        return /^[A-Z]{1,3}$/.test(c) ? c : d.colU[i];
    });
    m.fabInicio = intXlsx(m.fabInicio, 2, 200, d.fabInicio);
    m.fabFin = intXlsx(m.fabFin, m.fabInicio, 220, d.fabFin);
    m.comInicio = intXlsx(m.comInicio, 2, 220, d.comInicio);
    m.comFin = intXlsx(m.comFin, m.comInicio, 240, d.comFin);
    m.fleteFila = intXlsx(m.fleteFila, 2, 240, d.fleteFila);
    m.hojaExpPatron = String(m.hojaExpPatron || d.hojaExpPatron);
    m.hojaNalPatron = String(m.hojaNalPatron || d.hojaNalPatron);
    /* Patrones viejos "^EXP"/"^NAL" también matcheaban NAL01/COT; forzar los de presupuesto. */
    if (/^\^EXP\$?$/i.test(m.hojaExpPatron) || m.hojaExpPatron === "^EXP") m.hojaExpPatron = d.hojaExpPatron;
    if (/^\^NAL\$?$/i.test(m.hojaNalPatron) || m.hojaNalPatron === "^NAL") m.hojaNalPatron = d.hojaNalPatron;
    m.hojaExp = String(m.hojaExp || "");
    m.hojaNal = String(m.hojaNal || "");
    if (m.hojaExp && !esHojaPresupuestoExp_(m.hojaExp)) m.hojaExp = "";
    if (m.hojaNal && !esHojaPresupuestoNal_(m.hojaNal)) m.hojaNal = "";
    return m;
}

function nombreHojaMercado() {
    const exp = typeof mercadoEsExportacion === "function" && mercadoEsExportacion();
    if (exp && XLSX_MAPA.hojaExp) return XLSX_MAPA.hojaExp;
    if (!exp && XLSX_MAPA.hojaNal) return XLSX_MAPA.hojaNal;
    return exp ? "EXP 17000-A-V1" : "NAL 17000-A-V1";
}

function hojaDestinoWorkbook(wb) {
    const nombre = nombreHojaMercado();
    let ws = wb.getWorksheet(nombre);
    if (ws) return ws;
    const exp = typeof mercadoEsExportacion === "function" && mercadoEsExportacion();
    return hojaPresupuestoPorNombre_(wb, "", !!exp);
}

function bufDesdeBase64(b64) {
    const raw = String(b64 || "").replace(/^data:[^;]+;base64,/, "");
    const bin = atob(raw);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

function bufABase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

async function workbookDesdeBuffer(buf) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    return wb;
}

async function cargarPlantillaExcel() {
    if (window._cachePlantillaXlsx && window._cachePlantillaXlsx.buf) {
        aplicarMapaXlsx(window._cachePlantillaXlsx.mapa);
        return workbookDesdeBuffer(window._cachePlantillaXlsx.buf);
    }
    if (typeof realizarPeticionBD === "function" && localStorage.getItem("smartbudget_token")) {
        try {
            const data = await realizarPeticionBD({ action: "plantilla_xlsx_obtener" }, { timeoutMs: 90000 });
            if (data && data.exito && data.data && data.data.base64) {
                const buf = bufDesdeBase64(data.data.base64);
                aplicarMapaXlsx(data.data.mapa);
                window._cachePlantillaXlsx = { buf: buf, mapa: XLSX_MAPA, nombre: data.data.nombre };
                return workbookDesdeBuffer(buf);
            }
            if (data && data.exito && data.data && data.data.mapa) aplicarMapaXlsx(data.data.mapa);
        } catch (e) {}
    }
    try {
        const local = JSON.parse(localStorage.getItem("smartbudget_plantilla_mapa") || "null");
        if (local) aplicarMapaXlsx(local);
    } catch (e2) {}
    const res = await fetch(PLANTILLA_PRESUPUESTO_XLSX + "?v=1.0.16");
    if (!res.ok) throw new Error("No se encontró la plantilla Excel.");
    const buf = await res.arrayBuffer();
    return workbookDesdeBuffer(buf);
}

function trmActualExcel() {
    const n = parseFloat(document.getElementById("simTRM") && document.getElementById("simTRM").value);
    if (n > 0) return n;
    if (typeof trmActualGlobal === "number" && trmActualGlobal > 0) return trmActualGlobal;
    return 0;
}

function celdaTrmEscribible_(ws, addr) {
    if (!ws || !addrXlsxOk(addr)) return false;
    const cell = ws.getCell(addr);
    const v = cell.value;
    if (v == null || v === "") return true;
    if (typeof v === "number") return true;
    const t = valorCeldaPlano(cell).trim();
    return !t || /^\d+([.,]\d+)?$/.test(t);
}

function detectarCeldaTrm_(ws) {
    const mapped = (XLSX_MAPA && XLSX_MAPA.trm) || MAPA_XLSX_DEFAULT.trm;
    if (!ws) return mapped;
    for (let r = 48; r <= 58; r++) {
        for (let c = 11; c <= 13; c++) {
            const v = ws.getCell(r, c).value;
            const f = v && typeof v === "object" ? String(v.formula || "") : "";
            const m = f.match(/\$E\$(\d+)/i);
            if (m) return "E" + m[1];
        }
    }
    const cand = [mapped, "E53", "E54"];
    for (let i = 0; i < cand.length; i++) {
        if (celdaTrmEscribible_(ws, cand[i]) && typeof ws.getCell(cand[i]).value === "number") return cand[i];
    }
    return mapped;
}

function aplicarTrmExcel(ws, trm) {
    trm = trm > 0 ? trm : trmActualExcel();
    if (!ws || !(trm > 0)) return;
    const dest = detectarCeldaTrm_(ws);
    const extras = [dest, "E53", "E54"];
    const vistos = {};
    extras.forEach(function (addr) {
        const key = String(addr || "").toUpperCase();
        if (vistos[key] || !celdaTrmEscribible_(ws, addr)) return;
        vistos[key] = true;
        escribirCelda(ws, addr, trm);
    });
}

function aplicarTrmHojasLogistica(wb, trm) {
    trm = trm > 0 ? trm : trmActualExcel();
    if (!wb || !(trm > 0)) return;
    wb.worksheets.forEach(function (ws) {
        if (/^(EXP|NAL|AUX|ADMIN)\b/i.test(ws.name)) return;
        const hit = buscarTextoHoja(ws, /^TRM$/i, 20, 8);
        if (!hit) return;
        const dest = ws.getCell(hit.r, hit.c + 1);
        const master = dest.master || dest;
        const prev = master.value;
        if (prev != null && typeof prev !== "number" && valorCeldaPlano(master).trim()) return;
        master.value = trm;
    });
}

function aplicarEncabezadoExcel(ws, ctx) {
    const m = XLSX_MAPA;
    ctx = ctx || {};
    const codigo = ctx.codigo || valCampo("inputCodigo") || valCampo("noProyecto") || "SIN-CODIGO";
    escribirCelda(ws, m.codigo, codigo);
    escribirCelda(ws, m.cliente, ctx.cliente != null ? ctx.cliente : valCampo("cliente"));
    escribirCelda(ws, m.proyecto, ctx.proyecto != null ? ctx.proyecto : valCampo("noProyecto"));
    const da = ctx.datosAdicionales || {};
    escribirCelda(ws, m.analista, da.analista || valCampo("analista"));
    escribirCelda(ws, m.comercial, da.comercial || valCampo("comercial"));
    escribirCelda(ws, m.disenador, da.disenador || valCampo("disenador"));
    const f = da.fecha || valCampo("fecha");
    if (f) {
        const d = new Date(f + "T12:00:00");
        if (!isNaN(d.getTime())) escribirCelda(ws, m.fecha, d);
    }
    aplicarTrmExcel(ws);
    return codigo;
}

function aplicarRangosExcel(ws, lots) {
    const q = XLSX_MAPA.q || MAPA_XLSX_DEFAULT.q;
    escribirCelda(ws, q[0], Number(lots[0].q) || 1);
    escribirCelda(ws, q[1], Number(lots[1].q) || 1);
    escribirCelda(ws, q[2], Number(lots[2].q) || 1);
}

/** No. Proyecto sin el código. El código ya va en su propia celda. */
function nombreProyectoSinCodigo_(texto, codigo) {
    let t = String(texto || "").replace(/\s+/g, " ").trim();
    const c = String(codigo || "").trim();
    if (!t) return "";
    if (c && t.toLowerCase().indexOf(c.toLowerCase()) === 0) {
        t = t.slice(c.length).replace(/^[\s\-–—:]+/, "").trim();
    }
    return t;
}

/** C3 de una pieza: SHOW ROOM-Nombre elemento. */
function nombreProyectoElemento_(texto, codigo, elemento) {
    const base = nombreProyectoSinCodigo_(texto, codigo);
    const el = String(elemento || "").replace(/\s+/g, " ").trim();
    if (base && el) return base + "-" + el;
    return base || el;
}

/**
 * Deja `bloque` como pestañas seguidas en el lugar de la primera.
 * El resto (NAL, cotizaciones, etc.) queda después de ese bloque.
 */
function ordenarBloqueHojas_(wb, bloque) {
    bloque = (bloque || []).filter(Boolean);
    if (!bloque.length) return;
    const ancla = bloque[0].orderNo || 1;
    const ids = {};
    bloque.forEach(function (w) { ids[w.id] = true; });
    const antes = [];
    const despues = [];
    wb.worksheets.forEach(function (w) {
        if (ids[w.id]) return;
        if ((w.orderNo || 0) < ancla) antes.push(w);
        else despues.push(w);
    });
    antes.sort(function (a, b) { return (a.orderNo || 0) - (b.orderNo || 0); });
    despues.sort(function (a, b) { return (a.orderNo || 0) - (b.orderNo || 0); });
    antes.concat(bloque).concat(despues).forEach(function (w, i) { w.orderNo = i + 1; });
}

function nombrePestanaElemento(nombre, idx) {
    let base = String(nombre || ("Pieza " + (idx + 1))).replace(/[\\/?*\[\]]/g, "-").trim();
    if (!base) base = "Pieza " + (idx + 1);
    if (base.length > 31) base = base.slice(0, 31);
    return base;
}

function elementosDeVersionExcel_(ver) {
    if (ver && Array.isArray(ver.elementos) && ver.elementos.length) {
        return ver.elementos.map(function (el, i) {
            return {
                nombre: el.nombre || ("Pieza " + (i + 1)),
                matrizItems: el.matrizItems || [],
                escalas: el.escalas && el.escalas.length ? el.escalas : (ver.escalas || [{ id: "l1", q: 1 }]),
                fichaComercial: el.fichaComercial || ver.fichaComercial || {},
                comentario: ver.comentario || ""
            };
        });
    }
    return [{
        nombre: "Pieza 1",
        matrizItems: (ver && ver.matrizItems) || [],
        escalas: (ver && ver.escalas) || [{ id: "l1", q: 1 }],
        fichaComercial: (ver && ver.fichaComercial) || {},
        comentario: (ver && ver.comentario) || ""
    }];
}

function nombrePestanaVersion(mkt, codigo, vid) {
    let base = String(codigo || "SIN").replace(/[\\/?*\[\]]/g, "-");
    let name = mkt + " " + base + "-" + vid;
    if (name.length > 31) {
        base = base.slice(0, Math.max(4, 31 - (mkt.length + String(vid).length + 3)));
        name = mkt + " " + base + "-" + vid;
    }
    return name;
}

function clonarEstiloExcel_(dest, srcStyle) {
    if (!dest || !srcStyle || typeof srcStyle !== "object") return;
    let st;
    try { st = JSON.parse(JSON.stringify(srcStyle)); } catch (e) { return; }
    if (st.font) dest.font = st.font;
    if (st.alignment) dest.alignment = st.alignment;
    if (st.border) dest.border = st.border;
    if (st.fill) dest.fill = st.fill;
    if (st.protection) dest.protection = st.protection;
    if (st.numFmt) dest.numFmt = st.numFmt;
}

function clonarHojaExcel(wb, src, nuevoNombre) {
    const existente = wb.getWorksheet(nuevoNombre);
    if (existente) wb.removeWorksheet(existente.id);
    const opts = {};
    try { opts.views = JSON.parse(JSON.stringify(src.views || [])); } catch (e) {}
    try { opts.pageSetup = JSON.parse(JSON.stringify(src.pageSetup || {})); } catch (e2) {}
    try { opts.headerFooter = JSON.parse(JSON.stringify(src.headerFooter || {})); } catch (e3) {}
    try { opts.properties = JSON.parse(JSON.stringify(src.properties || {})); } catch (e4) {}
    const copy = wb.addWorksheet(nuevoNombre, opts);
    if (src.properties && src.properties.defaultRowHeight != null) {
        copy.properties.defaultRowHeight = src.properties.defaultRowHeight;
    }
    const colCount = Math.max(Number(src.columnCount) || 16, 16);
    for (let c = 1; c <= colCount; c++) {
        const sc = src.getColumn(c);
        const dc = copy.getColumn(c);
        if (sc.width != null) dc.width = sc.width;
        dc.hidden = !!sc.hidden;
        // No copiar column.style: ExcelJS lo serializa como Calibri 11 y recorta
        // los números del AIU (filas de 9 pt pensadas para Arial 8).
    }
    src.eachRow({ includeEmpty: true }, function (row, n) {
        const dr = copy.getRow(n);
        if (row.height != null) dr.height = row.height;
        dr.hidden = !!row.hidden;
        clonarEstiloExcel_(dr, row.style);
        try {
            if (row.font) dr.font = JSON.parse(JSON.stringify(row.font));
        } catch (eFont) {}
        row.eachCell({ includeEmpty: true }, function (cell, col) {
            const t = dr.getCell(col);
            try { t.value = cell.value; } catch (eVal) {}
            clonarEstiloExcel_(t, cell.style);
            if (cell.numFmt) t.numFmt = cell.numFmt;
        });
        try { dr.commit(); } catch (eCommit) {}
    });
    const merges = (src.model && src.model.merges) ? src.model.merges.slice() : [];
    merges.forEach(function (ref) {
        try { copy.mergeCells(ref); } catch (e7) {}
    });
    if (src.autoFilter) copy.autoFilter = src.autoFilter;
    copy.orderNo = (src.orderNo || src.id || 1) + 0.5;
    copy.name = nuevoNombre;
    return copy;
}

function maestrosExpNal(wb) {
    const masterExp = hojaPresupuestoPorNombre_(wb, XLSX_MAPA.hojaExp, true);
    const masterNal = hojaPresupuestoPorNombre_(wb, XLSX_MAPA.hojaNal, false);
    /* Solo se descartan otros masters de presupuesto (EXP/NAL + espacio).
       COT/QUOT/NAL01 se conservan como extras (cotización). */
    wb.worksheets.slice().forEach(function (w) {
        if (esHojaPresupuestoExp_(w.name) && masterExp && w.id !== masterExp.id) wb.removeWorksheet(w.id);
        if (esHojaPresupuestoNal_(w.name) && masterNal && w.id !== masterNal.id) wb.removeWorksheet(w.id);
    });
    return {
        masterExp: masterExp ? (wb.getWorksheet(masterExp.name) || masterExp) : null,
        masterNal: masterNal ? (wb.getWorksheet(masterNal.name) || masterNal) : null
    };
}

function versionEsExportacion(ver) {
    return String(ver && ver.tipoPresupuesto || "").toUpperCase().includes("EXPORT");
}

function escribirObservacionVersion(ws, ver) {
    const comentario = String(ver && ver.comentario || "").trim();
    if (!comentario) return;
    const nota = String(ver.id || "V") + " — " + comentario;
    const hit = buscarTextoHoja(ws, /OBSERVACIONES/i, 90, 6);
    if (!hit) return;
    const below = ws.getCell(hit.r + 1, hit.c);
    const master = below.master || below;
    const prev = valorCeldaPlano(master);
    if (prev.indexOf(nota) >= 0) return;
    const font0 = Object.assign({ name: "Calibri", size: 9, bold: true }, master.font || {});
    const fontNota = { name: "Calibri", size: 9, italic: true, bold: false, color: { argb: "FF1565C8" } };
    master.value = {
        richText: [
            { font: font0, text: prev ? prev.replace(/\s+$/, "") + "\n\n" : "" },
            { font: fontNota, text: nota }
        ]
    };
    master.alignment = Object.assign({}, master.alignment || {}, { wrapText: true, vertical: "top" });
}

function itemExportCandado_(it) {
    if (typeof itemEstaCandado === "function") return itemEstaCandado(it);
    return !!(it && (it.candado === true || it.candado === "S" || it.candado === 1));
}

function rellenarHojaVersion(ws, ver, codigo, avisos, opts) {
    opts = opts || {};
    const incluirCandado = !!opts.incluirCandado;
    const items = ver.matrizItems || [];
    const escalas = ver.escalas || [{ id: "l1", q: 1 }];
    const { lots } = tresLotesExportacion(escalas, { sinPad: !!opts.esAux });
    const fab = [];
    const com = [];
    const fletes = [];
    items.forEach(function (it) {
        if (!incluirCandado && itemExportCandado_(it)) return;
        if (esFleteGlobal(it)) fletes.push(it);
        else if (it.categoria === "Comercialización") com.push(it);
        else fab.push(it);
    });
    const maxFab = XLSX_FILAS_FAB.fin - XLSX_FILAS_FAB.inicio + 1;
    const maxCom = XLSX_FILAS_COM.fin - XLSX_FILAS_COM.inicio + 1;
    if (fab.length > maxFab) avisos.push(ver.id + ": se recortó fabricación a " + maxFab + " filas.");
    if (com.length > maxCom) avisos.push(ver.id + ": se recortó comercialización a " + maxCom + " filas.");

    aplicarEncabezadoExcel(ws, {
        codigo: codigo,
        cliente: valCampo("cliente"),
        proyecto: opts.proyecto != null ? opts.proyecto : valCampo("noProyecto"),
        datosAdicionales: ver.datosAdicionales || {}
    });
    aplicarRangosExcel(ws, lots);

    let r = XLSX_FILAS_FAB.inicio;
    for (; r <= XLSX_FILAS_FAB.fin; r++) limpiarFilaItem(ws, r);
    fab.slice(0, maxFab).forEach(function (it, i) {
        escribirFilaItem(ws, XLSX_FILAS_FAB.inicio + i, it, lots, escalas);
    });
    for (r = XLSX_FILAS_COM.inicio; r <= XLSX_FILAS_COM.fin; r++) limpiarFilaItem(ws, r);
    com.slice(0, maxCom).forEach(function (it, i) {
        escribirFilaItem(ws, XLSX_FILAS_COM.inicio + i, it, lots, escalas);
    });
    limpiarFilaItem(ws, XLSX_FILA_FLETE);
    if (fletes.length) {
        const acc = [0, 0, 0];
        fletes.forEach(function (it) {
            acc[0] += montoGlobalLote(it, lots[0], escalas);
            acc[1] += montoGlobalLote(it, lots[1], escalas);
            acc[2] += montoGlobalLote(it, lots[2], escalas);
        });
        const m = XLSX_MAPA;
        const u = m.colU || ["E", "G", "I"];
        escribirCelda(ws, (m.colDesc || "A") + XLSX_FILA_FLETE, fletes[0].nombre || "Transporte local");
        escribirCelda(ws, (m.colCant || "D") + XLSX_FILA_FLETE, 1);
        escribirCelda(ws, u[0] + XLSX_FILA_FLETE, acc[0]);
        escribirCelda(ws, u[1] + XLSX_FILA_FLETE, acc[1]);
        escribirCelda(ws, u[2] + XLSX_FILA_FLETE, acc[2]);
    }
    escribirObservacionVersion(ws, ver);
    if (opts.esAux) escribirNotaAuxExcel(ws, ver, codigo);
    else escribirNotaCandadosExcel(ws, ver, codigo);
}

function escribirNotaAuxExcel(ws, ver, codigo) {
    const items = (ver && ver.matrizItems) || [];
    const n = items.filter(itemExportCandado_).length;
    const nota = "AUXILIAR · estudio de costos (incluye " + n + " línea(s) candada(s)). Mismo formato NAL/EXP. No usar esta pestaña como precio de venta.";
    const hit = buscarTextoHoja(ws, /OBSERVACIONES/i, 90, 6);
    if (!hit) return;
    const below = ws.getCell(hit.r + 1, hit.c);
    const master = below.master || below;
    const prev = valorCeldaPlano(master);
    if (prev.indexOf("AUXILIAR") >= 0) return;
    const font0 = Object.assign({ name: "Calibri", size: 9, bold: true }, master.font || {});
    const fontNota = { name: "Calibri", size: 9, italic: true, bold: false, color: { argb: "FFB42318" } };
    master.value = {
        richText: [
            { font: font0, text: prev ? prev.replace(/\s+$/, "") + "\n\n" : "" },
            { font: fontNota, text: nota }
        ]
    };
    master.alignment = Object.assign({}, master.alignment || {}, { wrapText: true, vertical: "top" });
}

function escribirNotaCandadosExcel(ws, ver, codigo) {
    const items = (ver && ver.matrizItems) || [];
    const n = items.filter(itemExportCandado_).length;
    if (!n) return;
    const vid = ver.id || "V1";
    const aux = nombrePestanaVersion("AUX", codigo, vid);
    const nota = n + " línea(s) candada(s): no suman aquí. Desglose con valores en " + aux + ".";
    const hit = buscarTextoHoja(ws, /OBSERVACIONES/i, 90, 6);
    if (!hit) return;
    const below = ws.getCell(hit.r + 1, hit.c);
    const master = below.master || below;
    const prev = valorCeldaPlano(master);
    if (prev.indexOf("candada") >= 0) return;
    const font0 = Object.assign({ name: "Calibri", size: 9, bold: true }, master.font || {});
    const fontNota = { name: "Calibri", size: 9, italic: true, bold: false, color: { argb: "FFB42318" } };
    master.value = {
        richText: [
            { font: font0, text: prev ? prev.replace(/\s+$/, "") + "\n\n" : "" },
            { font: fontNota, text: nota }
        ]
    };
    master.alignment = Object.assign({}, master.alignment || {}, { wrapText: true, vertical: "top" });
}

function rellenarHojaAux(ws, ver, codigo) {
    const items = ver.matrizItems || [];
    const escalas = ver.escalas || [{ id: "l1", q: 1 }];
    const { lots } = tresLotesExportacion(escalas);
    const vid = ver.id || "V1";
    const nCand = items.filter(itemExportCandado_).length;

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 62;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 10;
    ws.getColumn(6).width = 10;
    let col = 7;
    lots.forEach(function () {
        ws.getColumn(col).width = 14;
        ws.getColumn(col + 1).width = 14;
        col += 2;
    });
    ws.getColumn(col).width = 12;
    ws.getColumn(col + 1).width = 16;

    const lastCol = 6 + lots.length * 2 + 2;
    function mergeTitulo(row, texto, fill, color, size, italic) {
        try { ws.mergeCells(row, 1, row, lastCol); } catch (e) {}
        const cell = ws.getCell(row, 1);
        cell.value = texto;
        cell.font = { name: "Calibri", size: size || 12, bold: !italic, italic: !!italic, color: { argb: color || "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        cell.alignment = { vertical: "middle", wrapText: true };
        ws.getRow(row).height = italic ? 32 : 22;
    }

    mergeTitulo(1, "TABLA AUXILIAR · ESTUDIO DE COSTOS — no alimenta el AIU de NAL/EXP", "FFB42318", "FFFFFFFF", 13, false);
    mergeTitulo(2, (codigo || "") + " · " + vid + " · " + nCand + " línea(s) candada(s). Los unitarios reales se conservan aquí.", "FF1A1A1A", "FFFFFFFF", 10, false);
    mergeTitulo(3, "Candado = S: la línea no suma al precio de venta. Sirve para pronosticar un costo de proveedor y pasarlo a Comercialización.", "FFF7F7F7", "FF333333", 9, true);

    const headers = ["#", "Fuente", "Descripción", "Categoría", "Cant.", "U.M."];
    lots.forEach(function (lt) {
        headers.push("Q " + lt.q + " unit.");
        headers.push("Q " + lt.q + " total");
    });
    headers.push("Candado", "Suma al precio");
    const head = ws.getRow(5);
    headers.forEach(function (h, i) {
        const cell = head.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "middle", wrapText: true };
    });
    head.height = 22;

    let sumaFabEst = [0, 0, 0];
    let sumaFabEntra = [0, 0, 0];
    let sumaComEntra = [0, 0, 0];

    items.forEach(function (it, idx) {
        const row = ws.getRow(6 + idx);
        const cand = itemExportCandado_(it);
        const com = it.categoria === "Comercialización";
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = it.fuente || "";
        row.getCell(3).value = it.nombre || "";
        row.getCell(4).value = it.categoria || "";
        row.getCell(5).value = Number(it.cantidad) || 1;
        row.getCell(6).value = it.um || "UND";
        lots.forEach(function (lt, li) {
            const u = unitarioLote(it, lt, escalas);
            const tot = u * (Number(it.cantidad) || 1);
            row.getCell(7 + li * 2).value = u;
            row.getCell(8 + li * 2).value = tot;
            row.getCell(7 + li * 2).numFmt = "#,##0";
            row.getCell(8 + li * 2).numFmt = "#,##0";
            if (!com) sumaFabEst[li] += tot;
            if (!cand && !com) sumaFabEntra[li] += tot;
            if (!cand && com) sumaComEntra[li] += tot;
        });
        row.getCell(7 + lots.length * 2).value = cand ? "S" : "N";
        row.getCell(8 + lots.length * 2).value = cand ? "N" : "S";
        row.font = { name: "Calibri", size: 9 };
        row.alignment = { vertical: "middle", wrapText: true };
        if (cand) {
            for (let c = 1; c <= lastCol; c++) {
                row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F3F3" } };
            }
        }
    });

    const base = 7 + items.length;
    function filaResumen(r, label, vals, fill) {
        try { ws.mergeCells(r, 1, r, 6); } catch (e) {}
        const lab = ws.getCell(r, 1);
        lab.value = label;
        lab.font = { name: "Calibri", size: 9, bold: true };
        lab.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        lots.forEach(function (lt, li) {
            const cell = ws.getCell(r, 8 + li * 2);
            cell.value = vals[li] || 0;
            cell.numFmt = '"$"#,##0';
            cell.font = { name: "Calibri", size: 9, bold: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        });
        ws.getRow(r).height = 18;
    }
    filaResumen(base, "Subtotal fabricación ESTUDIO (incluye candadas)", sumaFabEst, "FFEEEEEE");
    filaResumen(base + 1, "Subtotal fabricación que ENTRA al precio", sumaFabEntra, "FFE8F5E9");
    filaResumen(base + 2, "Subtotal comercialización que ENTRA al precio", sumaComEntra, "FFFFF3E0");

    ws.views = [{ state: "frozen", ySplit: 5 }];
    ws.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: Math.max(5, 5 + items.length), column: lastCol }
    };
}

function valorCeldaPlano(cell) {
    if (!cell) return "";
    const v = cell.value;
    if (v == null) return "";
    if (typeof v === "object") {
        if (Array.isArray(v.richText)) return v.richText.map(function (x) { return x.text || ""; }).join("");
        if (v.text) return String(v.text);
        if (v.result != null) return String(v.result);
        if (v.formula) return "";
        if (Object.prototype.toString.call(v) === "[object Date]") return "";
    }
    return String(v);
}

function buscarTextoHoja(ws, re, maxR, maxC) {
    maxR = maxR || 60;
    maxC = maxC || 13;
    for (let r = 1; r <= maxR; r++) {
        for (let c = 1; c <= maxC; c++) {
            const t = valorCeldaPlano(ws.getCell(r, c));
            if (re.test(t)) return { r: r, c: c, t: t };
        }
    }
    return null;
}

function colLetterXlsx(n) {
    let s = "";
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

function hojaComoTexto(ws, maxR) {
    const lines = [];
    for (let r = 1; r <= maxR; r++) {
        const cells = [];
        for (let c = 1; c <= 13; c++) {
            const t = valorCeldaPlano(ws.getCell(r, c)).replace(/\s+/g, " ").slice(0, 90);
            if (t) cells.push(colLetterXlsx(c) + r + "=" + t);
        }
        if (cells.length) lines.push(cells.join(" | "));
    }
    return lines.join("\n");
}

/**
 * Valida que una pestaña COT01/QUOT01 tenga el layout que usa el Excel de Logística.
 * Filas fijas (sin ítems extra): ítems 3–5, log 7–18, gran 20, resumen 28–35, I2 = % comisión.
 */
function validarHojaCotizacion_(ws, esEn) {
    const errores = [];
    const avisos = [];
    if (!ws) {
        errores.push(esEn ? "Falta pestaña QUOT01." : "Falta pestaña COT01.");
        return { ok: false, errores: errores, avisos: avisos };
    }
    const nombre = ws.name || "";
    const req = function (ok, msg) { if (!ok) errores.push(msg); };
    const tip = function (ok, msg) { if (!ok) avisos.push(msg); };
    const txt = function (r, c) { return valorCeldaPlano(ws.getCell(r, c)).replace(/\s+/g, " ").trim(); };
    const filaTiene = function (r, re, maxC) {
        maxC = maxC || 9;
        for (let c = 1; c <= maxC; c++) {
            if (re.test(txt(r, c))) return true;
        }
        return false;
    };
    const celdaNumOPct = function (r, c) {
        const cell = ws.getCell(r, c);
        const v = cell && cell.value;
        if (typeof v === "number" && isFinite(v)) return true;
        const t = txt(r, c);
        if (/^\d+([.,]\d+)?%?$/.test(t)) return true;
        const fmt = String((cell && cell.numFmt) || "");
        return /%/.test(fmt);
    };

    req(txt(1, 1) !== "" || filaTiene(1, /titulo|header|applicable/i, 6),
        nombre + ": falta título en A1:F1.");
    req(filaTiene(1, /back[\s-]?office/i, 9), nombre + ": falta «BACK-OFFICE» en H1:I1.");

    if (esEn) {
        req(/code|project/i.test(txt(2, 2)), nombre + ": B2 debe ser código de proyecto (Project Code).");
        req(/desc/i.test(txt(2, 3)), nombre + ": C2 debe ser Description.");
        req(/quant/i.test(txt(2, 4)), nombre + ": D2 debe ser Quantity.");
        req(/unit|price/i.test(txt(2, 5)), nombre + ": E2 debe ser Unit Price.");
        req(/extend|sub/i.test(txt(2, 6)), nombre + ": F2 debe ser Extended Price.");
        req(/%/.test(txt(2, 8)) || /commission/i.test(txt(2, 8)), nombre + ": H2 debe etiquetar % Commission.");
    } else {
        req(/c[oó]digo|proyecto/i.test(txt(2, 2)), nombre + ": B2 debe ser código de proyecto.");
        req(/desc/i.test(txt(2, 3)), nombre + ": C2 debe ser Descripción.");
        req(/cant/i.test(txt(2, 4)), nombre + ": D2 debe ser Cantidad.");
        req(/precio|unit/i.test(txt(2, 5)), nombre + ": E2 debe ser Precio unitario.");
        req(/sub|extend|total/i.test(txt(2, 6)), nombre + ": F2 debe ser Precio subtotal.");
        req(/%/.test(txt(2, 8)) || /comisi/i.test(txt(2, 8)), nombre + ": H2 debe etiquetar % Comisión.");
    }
    tip(celdaNumOPct(2, 9), nombre + ": I2 conviene tener formato % (la app escribe la comisión ahí).");
    tip(/base|precio|price/i.test(txt(3, 8)), nombre + ": H3 debería decir Precio base / Base price.");
    req(filaTiene(6, /total\s*(productos|products)|exworks|ex\s*works/i, 6),
        nombre + ": fila 6 debe ser TOTAL PRODUCTOS / EXWORKS.");

    const logChecks = esEn
        ? [
            [7, /origin|costs?\s+at\s+origin/i, "fila 7 Costos en origen"],
            [8, /air|shipping|freight|detalle|logist/i, "fila 8 Flete aéreo"],
            [9, /land|terrestre|shipping|freight|detalle|logist/i, "fila 9 Flete terrestre"],
            [10, /sea|ocean|marit|shipping|freight|detalle|logist/i, "fila 10 Flete marítimo"],
            [11, /insur|seguro/i, "fila 11 Seguro"],
            [12, /destin/i, "fila 12 Costos en destino"],
            [13, /dut(y|ies)|arancel/i, "fila 13 Aranceles"],
            [14, /tax/i, "fila 14 Impuestos"],
            [15, /domestic|envio|env[ií]o|shipping/i, "fila 15 Envío nacional"],
            [16, /install|montaje|instal/i, "fila 16 Montaje"],
            [17, /warehous|bodega/i, "fila 17 Bodegaje"],
            [18, /other|otro/i, "fila 18 Otro (nacional)"]
        ]
        : [
            [7, /origen|costs?\s+at\s+origin/i, "fila 7 Costos en origen"],
            [8, /a[eé]reo|flete|detalle|logist|shipping/i, "fila 8 Flete aéreo"],
            [9, /terrestre|flete|detalle|logist|shipping|land/i, "fila 9 Flete terrestre"],
            [10, /mar[ií]timo|flete|detalle|logist|shipping|sea|ocean/i, "fila 10 Flete marítimo"],
            [11, /seguro|insur/i, "fila 11 Seguro"],
            [12, /destino|destin/i, "fila 12 Costos en destino"],
            [13, /arancel|dut/i, "fila 13 Aranceles"],
            [14, /impuest|tax/i, "fila 14 Impuestos"],
            [15, /env[ií]o|nacional|domestic/i, "fila 15 Envío nacional"],
            [16, /montaje|instal/i, "fila 16 Montaje"],
            [17, /bodega|warehous/i, "fila 17 Bodegaje"],
            [18, /otro|other/i, "fila 18 Otro (nacional)"]
        ];
    logChecks.forEach(function (pair) {
        req(filaTiene(pair[0], pair[1], 6), nombre + ": " + pair[2] + " no coincide con el layout de cotización.");
    });
    req(filaTiene(19, /total.*logist|logistics?\s*cost/i, 6),
        nombre + ": fila 19 debe ser TOTAL COSTO LOGÍSTICO.");
    req(filaTiene(20, /incoterm|gran\s*total|cif|grand\s*total|destination\s*price|precio\s*destino/i, 6),
        nombre + ": fila 20 debe ser gran total / INCOTERM.");
    req(filaTiene(25, /validaci[oó]n|quantity|cantidad|diferencia/i, 6) || !!buscarTextoHoja(ws, /validaci[oó]n|validation\s*diff/i, 30, 6),
        nombre + ": falta bloque de validación (fila ~25).");
    req(filaTiene(31, /best|mejor|shipping\s*cost|costo\s*log/i, 6) || !!buscarTextoHoja(ws, /best\s*shipping|mejor\s*costo/i, 40, 6),
        nombre + ": falta «Mejor costo / BEST SHIPPING» (fila ~31).");
    tip(filaTiene(32, /gran\s*total|grand\s*total/i, 6),
        nombre + ": fila 32 debería ser GRAN TOTAL del resumen inferior.");

    const merges = (ws.model && ws.model.merges) || [];
    const tieneBloqueFlete = merges.some(function (m) {
        return /A8:B10/i.test(String(m)) || /A8:B9/i.test(String(m));
    });
    tip(tieneBloqueFlete, nombre + ": se espera merge A8:B10 (DETALLE LOGÍSTICO); la app lo parte al exportar.");

    return { ok: errores.length === 0, errores: errores, avisos: avisos, hoja: nombre };
}

/** Exige COT01 + QUOT01 con el layout que rellena exportarLogisticaExcel. */
function validarPestanasCotizacion_(wb) {
    const cot = excelCotMasterQuote_(wb, false);
    const quot = excelCotMasterQuote_(wb, true);
    const out = { ok: true, errores: [], avisos: [], cot: null, quot: null };
    if (!cot) out.errores.push("Falta pestaña COT01 (cotización ES). La app la usa al exportar Logística en español.");
    if (!quot) out.errores.push("Falta pestaña QUOT01 (cotización EN). La app la usa al exportar Logística en inglés.");
    if (cot) {
        out.cot = validarHojaCotizacion_(cot, false);
        out.errores = out.errores.concat(out.cot.errores);
        out.avisos = out.avisos.concat(out.cot.avisos);
    }
    if (quot) {
        out.quot = validarHojaCotizacion_(quot, true);
        out.errores = out.errores.concat(out.quot.errores);
        out.avisos = out.avisos.concat(out.quot.avisos);
    }
    out.ok = out.errores.length === 0;
    return out;
}

function analizarPlantillaHeuristica(wb) {
    const hojas = wb.worksheets.map(function (w) { return w.name; });
    const mapa = Object.assign({}, MAPA_XLSX_DEFAULT);
    const extra = [];
    const notas = [];
    const exp = hojaPresupuestoPorNombre_(wb, "", true);
    const nal = hojaPresupuestoPorNombre_(wb, "", false);
    hojas.forEach(function (n) {
        if (!esHojaPresupuestoExp_(n) && !esHojaPresupuestoNal_(n) && !/^ADMIN$/i.test(n)) extra.push(n);
    });
    if (exp) {
        mapa.hojaExp = exp.name;
        mapa.hojaExpPatron = MAPA_XLSX_DEFAULT.hojaExpPatron;
    }
    if (nal) {
        mapa.hojaNal = nal.name;
        mapa.hojaNalPatron = MAPA_XLSX_DEFAULT.hojaNalPatron;
    }
    const ws = exp || nal || wb.worksheets[0];
    if (!exp && !nal) notas.push("No hay pestaña EXP/NAL de presupuesto (ej. «NAL 17000-A-V1»); el mapeo se hizo sobre «" + (ws && ws.name) + "».");
    if (hojas.some(function (n) { return /^NAL\d/i.test(n) || /^COT/i.test(n) || /^QUOT/i.test(n); })) {
        notas.push("COT/QUOT/NAL01 se conservan para cotización; no son destino de Costos.");
    }
    const cotVal = validarPestanasCotizacion_(wb);
    if (cotVal.ok) {
        notas.push("Cotización OK: «" + (cotVal.cot && cotVal.cot.hoja) + "» + «" + (cotVal.quot && cotVal.quot.hoja) + "» (cabecera, I2 %, ítems, logística 7–18, mejor costo).");
        (cotVal.avisos || []).forEach(function (a) { if (a) notas.push("Aviso cotización: " + a); });
    } else {
        (cotVal.errores || []).forEach(function (e) { if (e) notas.push("Error cotización: " + e); });
        (cotVal.avisos || []).forEach(function (a) { if (a) notas.push("Aviso cotización: " + a); });
    }
    if (ws) {
        const transp = buscarTextoHoja(ws, /transporte local/i, 80, 4);
        const prod = buscarTextoHoja(ws, /productos de comercial/i, 80, 4);
        const armado = buscarTextoHoja(ws, /armado general/i, 80, 4);
        const imp = buscarTextoHoja(ws, /^imprevistos$/i, 90, 4);
        if (transp) mapa.fleteFila = transp.r;
        if (armado) mapa.fabFin = Math.max(mapa.fabInicio, armado.r - 1);
        else if (transp) mapa.fabFin = Math.max(mapa.fabInicio, transp.r - 3);
        if (prod) {
            mapa.comInicio = prod.r + 1;
            mapa.comFin = imp ? Math.max(mapa.comInicio, imp.r - 2) : mapa.comInicio + 2;
        }
        for (let r = 5; r <= 9; r++) {
            const e = ws.getCell(r, 5).value;
            const g = ws.getCell(r, 7).value;
            if (typeof e === "number" && typeof g === "number") {
                mapa.q = ["E" + r, "G" + r, "I" + r];
                break;
            }
        }
    }
    if (!wb.worksheets.find(function (w) { return /^ADMIN$/i.test(w.name); })) {
        notas.push("No hay pestaña ADMIN; el AIU no se recalculará como en el formato Diforma.");
    }
    return {
        mapa: sanitizarMapaXlsx(mapa),
        hojas: hojas,
        extra: extra,
        notas: notas,
        cotizacion: cotVal
    };
}

function extraerJsonMapa(texto) {
    const s = String(texto || "");
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

async function refinarMapaConGemini(analisis, textoHoja) {
    if (typeof realizarPeticionBD !== "function") return analisis;
    const prompt = [
        "Analiza esta plantilla Excel de presupuesto Diforma.",
        "Devuelve SOLO un JSON con estas claves (sin markdown):",
        "hojaExp, hojaNal, codigo, cliente, proyecto, analista, comercial, disenador, fecha,",
        "q (array de 3 celdas de cantidades), colDesc, colCant, colU (3 columnas de unitarios),",
        "fabInicio, fabFin, comInicio, comFin, fleteFila, trm (celda numérica del TRM, normalmente E53), notas.",
        "Las celdas van en notación A1. No inventes pestañas.",
        "hojaExp debe ser una pestaña de presupuesto tipo «EXP 17000-A-V1» (EXP + espacio + código).",
        "hojaNal debe ser tipo «NAL 17000-A-V1» (NAL + espacio + código).",
        "NO uses COT01, QUOT01, NAL01, NAL02 ni Shipping Details como hojaExp/hojaNal (son cotización o extras).",
        "ADMIN, QUOT, COT, Metales y extras no se rellenan desde Costos.",
        "Hojas: " + analisis.hojas.join(" | "),
        "Mapa heurístico: " + JSON.stringify(analisis.mapa),
        "Celdas con texto (pestaña destino, filas 1-45):",
        textoHoja.slice(0, 7000)
    ].join("\n");
    try {
        const data = await realizarPeticionBD({
            action: "gemini_chat",
            modulo: "excel",
            forzarPro: false,
            promptText: prompt
        }, { timeoutMs: 60000 });
        if (typeof pintarUsoGemini === "function") pintarUsoGemini(data && data.uso);
        if (data && data.exito === false) {
            analisis.notas.push(data.mensaje || "Gemini no refinó el mapa.");
            analisis.origen = "heuristica";
            return analisis;
        }
        const raw = data?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extraerJsonMapa(raw);
        if (!parsed) return Object.assign({}, analisis, { origen: "heuristica" });
        const merge = Object.assign({}, analisis.mapa, parsed);
        /* Si la IA elige NAL01/COT, recuperar el master de presupuesto del análisis heurístico. */
        if (parsed.hojaNal && !esHojaPresupuestoNal_(parsed.hojaNal) && analisis.mapa.hojaNal) {
            merge.hojaNal = analisis.mapa.hojaNal;
            analisis.notas.push("Se ignoró hojaNal de la IA («" + parsed.hojaNal + "»); se mantuvo «" + analisis.mapa.hojaNal + "».");
        }
        if (parsed.hojaExp && !esHojaPresupuestoExp_(parsed.hojaExp) && analisis.mapa.hojaExp) {
            merge.hojaExp = analisis.mapa.hojaExp;
            analisis.notas.push("Se ignoró hojaExp de la IA («" + parsed.hojaExp + "»); se mantuvo «" + analisis.mapa.hojaExp + "».");
        }
        analisis.mapa = sanitizarMapaXlsx(merge);
        analisis.origen = "heuristica+ia";
        if (parsed.notas) analisis.notas.push(String(parsed.notas));
        return analisis;
    } catch (e) {
        analisis.notas.push("La IA no pudo refinar el mapa; se usó el análisis de celdas.");
        analisis.origen = "heuristica";
        return analisis;
    }
}

function textoAnalisisPlantilla(an) {
    const m = an.mapa;
    const cot = an.cotizacion;
    const lines = [
        "Origen: " + (an.origen || "heuristica"),
        "Pestañas: " + an.hojas.join(", "),
        "Destino EXP: " + (m.hojaExp || m.hojaExpPatron),
        "Destino NAL: " + (m.hojaNal || m.hojaNalPatron),
        "Cotización: " + (cot
            ? (cot.ok
                ? "OK («" + ((cot.cot && cot.cot.hoja) || "COT01") + "» + «" + ((cot.quot && cot.quot.hoja) || "QUOT01") + "»)"
                : "ERROR — " + (cot.errores && cot.errores.length ? cot.errores.length + " problema(s)" : "layout inválido"))
            : "no analizada"),
        "Extra (se conservan, no se rellenan): " + (an.extra.length ? an.extra.join(", ") : "ninguna"),
        "Código " + m.codigo + " · Cliente " + m.cliente + " · Proyecto " + m.proyecto,
        "Rangos Q: " + m.q.join(", "),
        "TRM: " + m.trm,
        "Fabricación filas " + m.fabInicio + "–" + m.fabFin,
        "Flete fila " + m.fleteFila,
        "Comercialización filas " + m.comInicio + "–" + m.comFin
    ];
    (an.notas || []).forEach(function (n) { if (n) lines.push("Nota: " + n); });
    return lines.join("\n");
}

window.refrescarEstadoPlantillaExcel = async function () {
    const box = document.getElementById("plantillaExcelEstado");
    if (!box) return;
    box.textContent = "Consultando plantilla publicada…";
    try {
        if (typeof realizarPeticionBD !== "function") throw new Error("Sin conexión");
        const data = await realizarPeticionBD({ action: "plantilla_xlsx_obtener", soloMeta: true });
        if (data && data.exito && data.data && data.data.hay) {
            const d = data.data;
            const raw = d.mapa || {};
            const fix = corregirMapaHojasPresupuesto_(raw, null);
            const mapa = fix.mapa;
            const notas = [];
            if (raw.hojaNal && !esHojaPresupuestoNal_(raw.hojaNal)) {
                notas.push("Drive tenía Destino NAL «" + raw.hojaNal + "» (no es presupuesto). Re-publica la plantilla con Ctrl+F5 para guardar «NAL 17000-A-V1».");
            }
            if (raw.hojaExp && !esHojaPresupuestoExp_(raw.hojaExp)) {
                notas.push("Drive tenía Destino EXP «" + raw.hojaExp + "» inválido.");
            }
            aplicarMapaXlsx(mapa);
            box.textContent = "En Drive: " + (d.nombre || "plantilla.xlsx") + (d.actualizado ? " · " + String(d.actualizado).replace("T", " ").slice(0, 16) : "");
            const pre = document.getElementById("plantillaExcelAnalisis");
            if (pre) {
                pre.textContent = textoAnalisisPlantilla({
                    mapa: mapa,
                    hojas: [mapa.hojaExp, mapa.hojaNal].filter(Boolean),
                    extra: [],
                    origen: "publicado",
                    notas: notas
                });
            }
        } else {
            box.textContent = "Usando la plantilla empaquetada en la app. Sube un .xlsx para reemplazarla en toda la empresa.";
        }
    } catch (e) {
        box.textContent = "No se pudo leer Drive. Se usará la plantilla local de la app.";
    }
};

window.analizarYPublicarPlantillaExcel = async function () {
    const input = document.getElementById("inputPlantillaExcel");
    const btn = document.getElementById("btnPublicarPlantillaExcel");
    const pre = document.getElementById("plantillaExcelAnalisis");
    const file = input && input.files && input.files[0];
    if (!file) {
        return typeof mostrarNotificacion === "function" && mostrarNotificacion("Elige un archivo .xlsx.", "warning");
    }
    if (!/\.xlsx$/i.test(file.name)) {
        return mostrarNotificacion("Solo se acepta .xlsx (el formato actual de Diforma).", "warning");
    }
    if (file.size > 4 * 1024 * 1024) {
        return mostrarNotificacion("La plantilla no debe superar 4 MB.", "warning");
    }
    const email = localStorage.getItem("smartbudget_email");
    if (!email) return mostrarNotificacion("Sesión inválida.", "danger");
    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Analizando…'; }
    try {
        const buf = await file.arrayBuffer();
        const wb = await workbookDesdeBuffer(buf);
        let analisis = analizarPlantillaHeuristica(wb);
        analisis.origen = "heuristica";
        let dest = wb.getWorksheet(analisis.mapa.hojaExp) || wb.getWorksheet(analisis.mapa.hojaNal) || wb.worksheets[0];
        if (pre) pre.textContent = "Revisando formato con IA…\n" + textoAnalisisPlantilla(analisis);
        analisis = await refinarMapaConGemini(analisis, dest ? hojaComoTexto(dest, 45) : "");
        const fix = corregirMapaHojasPresupuesto_(analisis.mapa, wb);
        analisis.mapa = fix.mapa;
        fix.notas.forEach(function (n) { analisis.notas.push(n); });
        if (!analisis.mapa.hojaNal) {
            throw new Error("No se encontró pestaña de presupuesto NAL (ej. «NAL 17000-A-V1»). NAL01/COT/QUOT no sirven como destino de Costos.");
        }
        if (!analisis.mapa.hojaExp) {
            analisis.notas.push("No hay pestaña EXP de presupuesto; solo se publicó destino NAL.");
        }
        const cotVal = analisis.cotizacion || validarPestanasCotizacion_(wb);
        analisis.cotizacion = cotVal;
        if (!cotVal.ok) {
            if (pre) pre.textContent = textoAnalisisPlantilla(analisis);
            const detalle = (cotVal.errores || []).slice(0, 6).join(" · ");
            throw new Error("La plantilla no pasa la validación de cotización (COT01/QUOT01). " + (detalle || "Revisa cabecera, I2 %, ítems y filas de logística."));
        }
        analisis.origen = (analisis.origen || "heuristica") + "+fix";
        aplicarMapaXlsx(analisis.mapa);
        if (pre) pre.textContent = textoAnalisisPlantilla(analisis);
        if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Publicando…';
        const data = await realizarPeticionBD({
            action: "plantilla_xlsx_guardar",
            email: email,
            nombre: file.name,
            mapa: analisis.mapa,
            base64: bufABase64(buf)
        }, { timeoutMs: 90000 });
        if (!data || !data.exito) throw new Error((data && data.mensaje) || "No se publicó en Drive.");
        window._cachePlantillaXlsx = { buf: buf, mapa: analisis.mapa, nombre: file.name };
        mostrarNotificacion(data.mensaje || "Plantilla publicada.", "success");
        /* No pises el análisis local con el meta viejo de Drive: muestra lo recién publicado. */
        const preOk = document.getElementById("plantillaExcelAnalisis");
        if (preOk) preOk.textContent = textoAnalisisPlantilla(Object.assign({}, analisis, { origen: "publicado" }));
        const boxOk = document.getElementById("plantillaExcelEstado");
        if (boxOk) boxOk.textContent = "En Drive: " + file.name + " · recién publicada";
    } catch (e) {
        mostrarNotificacion("No se pudo cargar la plantilla: " + (e.message || e), "danger");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
};

/* ===== Cotización (Logística) → hoja COT/QUOT ===== */

/** Filas de costo en COT01/QUOT01 (base, sin filas extra de ítem). */
var XLSX_COT_LOG_ROWS_BASE_ = {
    origen: 7,
    flete_aereo: 8,
    flete_terrestre: 9,
    flete_maritimo: 10,
    seguro: 11,
    destino: 12,
    duties: 13,
    taxes: 14,
    nal_envio: 15,
    nal_montaje: 16,
    nal_bodega: 17,
    nal_otro: 18
};
var XLSX_COT_ITEM_START_ = 3;
var XLSX_COT_ITEM_SLOTS_ = 3;

function excelCotCeldaTexto_(ws, row, col, texto) {
    const cell = ws.getCell(row, col);
    const master = cell.master || cell;
    master.value = texto == null ? "" : String(texto);
}

/** Título de fila en rango fusionado (spliceRows parte merges; hay que rearmar).
 *  opts: { bold, size, height, italic, align, fontName, clearFill, forceFont } */
function excelCotTituloFila_(ws, row, texto, fromCol, toCol, opts) {
    fromCol = fromCol || 1;
    toCol = toCol || 5;
    opts = opts || {};
    const txt = texto == null ? "" : String(texto);
    const first = ws.getCell(row, fromCol);
    let fillKeep = null;
    try {
        if (first.fill) fillKeep = JSON.parse(JSON.stringify(first.fill));
    } catch (eF) { fillKeep = first.fill || null; }
    const alignKeep = first.alignment ? Object.assign({}, first.alignment) : null;
    const fontKeep = first.font ? Object.assign({}, first.font) : null;
    try { ws.unMergeCells(row, fromCol, row, toCol); } catch (e1) {}
    for (let c = fromCol; c <= toCol; c++) {
        try { ws.getCell(row, c).value = null; } catch (e2) {}
    }
    ws.getCell(row, fromCol).value = txt;
    try { ws.mergeCells(row, fromCol, row, toCol); } catch (e3) {}
    try {
        const cell = ws.getCell(row, fromCol);
        const master = cell.master || cell;
        const bold = opts.bold !== false;
        /* forceFont: no heredar Calibri 8 itálica del bloque DETALLE LOGÍSTICO (A8:B10). */
        const forceFont = !!(opts.forceFont || opts.fontName || opts.size != null || opts.italic != null);
        const font = forceFont
            ? {
                bold: !!bold,
                italic: opts.italic != null ? !!opts.italic : false,
                name: opts.fontName || "Arial",
                size: opts.size || 10,
                color: { argb: "FF000000" }
            }
            : Object.assign({}, fontKeep || {}, {
                bold: !!bold,
                italic: opts.italic != null ? !!opts.italic : !!(fontKeep && fontKeep.italic),
                name: opts.fontName || (fontKeep && fontKeep.name) || "Arial",
                size: opts.size || (fontKeep && fontKeep.size) || 10
            });
        const align = opts.align
            ? {
                vertical: "middle",
                horizontal: opts.align,
                wrapText: true
            }
            : (alignKeep || { vertical: "middle", wrapText: true });
        master.font = font;
        master.alignment = align;
        try {
            master.style = Object.assign({}, master.style || {}, { font: font, alignment: align });
        } catch (eSt) {}
        if (opts.clearFill) {
            for (let c = fromCol; c <= toCol; c++) {
                try { ws.getCell(row, c).fill = undefined; } catch (eClr) {}
            }
        } else if (fillKeep) {
            for (let c = fromCol; c <= toCol; c++) {
                try { ws.getCell(row, c).fill = JSON.parse(JSON.stringify(fillKeep)); } catch (eFill) {}
            }
        }
    } catch (e4) {}
    if (opts.height != null) {
        try { ws.getRow(row).height = Number(opts.height) || opts.height; } catch (eH) {}
    }
}

/** Plantilla fusiona A8:B10 / C8:C10 / D8:D10 como «DETALLE LOGÍSTICO»; hay que partirlo. */
function excelCotRomperBloqueDetalleLog_(ws, rowFleteAereo) {
    const r0 = Number(rowFleteAereo) || 8;
    const tries = [
        [r0, 1, r0 + 2, 2],
        [r0, 3, r0 + 2, 3],
        [r0, 4, r0 + 2, 4],
        [r0, 1, r0 + 2, 5]
    ];
    tries.forEach(function (t) {
        try { ws.unMergeCells(t[0], t[1], t[2], t[3]); } catch (e) {}
    });
    for (let r = r0; r <= r0 + 2; r++) {
        try { ws.unMergeCells(r, 1, r, 5); } catch (e2) {}
    }
}

function excelCotOcultarFila_(ws, row, ocultar) {
    try { ws.getRow(row).hidden = !!ocultar; } catch (e) {}
}

/** Descripción a la izquierda con wrap. C4+ de la plantilla traen xf centrado compartido:
 *  asignar solo .alignment no siempre rompe el estilo; hay que tocar .style. */
function excelCotDescAlign_(ws, row) {
    try {
        const c = ws.getCell(row, 3);
        const master = c.master || c;
        const align = {
            horizontal: "left",
            vertical: "top",
            wrapText: true,
            indent: 1
        };
        master.alignment = align;
        try {
            master.style = Object.assign({}, master.style || {}, { alignment: align });
        } catch (eSt) {}
    } catch (e) {}
}

/** Códigos de proyecto centrados en la celda (o merge de rango). */
function excelCotCodAlign_(ws, row) {
    try {
        const cell = ws.getCell(row, 2);
        const master = cell.master || cell;
        master.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: false,
            shrinkToFit: false
        };
    } catch (e) {}
}

/** Etiqueta col H en cada fila de ítem (la plantilla solo trae 3; al insertar faltaba). */
function excelCotPrecioBaseLabel_(ws, row, esEn) {
    try {
        const cell = ws.getCell(row, 8);
        cell.value = esEn ? "Base price" : "Precio base";
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    } catch (e) {}
}

/** Col G sin relleno; conserva solo amarillo de % de entrada (p. ej. G31). */
function excelCotLimpiarFillColG_(ws) {
    if (!ws) return;
    const maxR = Math.min(Number(ws.rowCount) || 80, 90);
    for (let r = 1; r <= maxR; r++) {
        try {
            const cell = ws.getCell(r, 7);
            const fill = cell.fill;
            if (!fill) continue;
            const argb = String((fill.fgColor && fill.fgColor.argb) || "");
            if (/^FF?FFFF00$/i.test(argb)) continue;
            cell.fill = undefined;
        } catch (e) {}
    }
}

function excelCotQuitarFill_(ws, row, col) {
    try { ws.getCell(row, col).fill = undefined; } catch (e) {}
}

/** Inserta una fila vacía en atRow y copia alto/estilo de styleFromRow (1–9). */
function excelCotInsertarFilaModelo_(ws, atRow, styleFromRow) {
    ws.spliceRows(atRow, 0, []);
    const src = ws.getRow(styleFromRow);
    const dest = ws.getRow(atRow);
    if (src.height) dest.height = src.height;
    dest.hidden = false;
    for (let c = 1; c <= 9; c++) {
        const sc = src.getCell(c);
        const dc = dest.getCell(c);
        try {
            if (sc.style && typeof sc.style === "object") {
                dc.style = JSON.parse(JSON.stringify(sc.style));
            }
        } catch (eSt) {}
        if (sc.numFmt) dc.numFmt = sc.numFmt;
    }
}

/** Layout dinámico tras insertar filas de ítem arriba y en el resumen. */
function excelCotLayout_(extraTop, extraSum) {
    const o = extraTop || 0;
    const s = extraSum || 0;
    const log = {};
    Object.keys(XLSX_COT_LOG_ROWS_BASE_).forEach(function (k) {
        log[k] = XLSX_COT_LOG_ROWS_BASE_[k] + o;
    });
    return {
        itemStart: XLSX_COT_ITEM_START_,
        itemSlots: XLSX_COT_ITEM_SLOTS_,
        itemEnd: XLSX_COT_ITEM_START_ + XLSX_COT_ITEM_SLOTS_ - 1 + o,
        totalProd: 6 + o,
        log: log,
        logStart: 7 + o,
        logEnd: 18 + o,
        totalLog: 19 + o,
        granTop: 20 + o,
        pagoTop: [21 + o, 22 + o, 23 + o],
        valid: 25 + o,
        sumStart: 28 + o,
        sumSlotsEnd: 30 + o,
        best: 31 + o + s,
        granBot: 32 + o + s,
        pagoBot: [33 + o + s, 34 + o + s, 35 + o + s]
    };
}

function excelCotMasterQuote_(wb, esEn) {
    const prefer = esEn ? /^QUOT01\b/i : /^COT01\b/i;
    const fallback = esEn ? /^QUOT/i : /^COT(?!01\s+original)/i;
    return wb.worksheets.find(function (w) { return prefer.test(w.name); })
        || wb.worksheets.find(function (w) { return fallback.test(w.name) && !/original/i.test(w.name); })
        || null;
}

function excelCotLimpiarSobrantes_(wb, keepId) {
    wb.worksheets.slice().forEach(function (w) {
        if (w.id === keepId) return;
        const n = w.name || "";
        if (/^(COT|QUOT)\d/i.test(n) || /^COT01\s+original/i.test(n) || /^NAL\d/i.test(n)) {
            try { wb.removeWorksheet(w.id); } catch (e) {}
        }
    });
}

/** Descripción con título / Dimensiones / Empaque en negrita (como el PDF). */
function excelCotDescRich_(idioma, it) {
    const esEn = idioma === "en";
    const T = (typeof LOG_TEXTOS !== "undefined" && LOG_TEXTOS[idioma]) || {};
    const tx = typeof logTexto_ === "function" ? logTexto_() : { titulo: true, desc: "full", medidas: true };
    const bold = { bold: true, name: "Calibri", size: 10 };
    const normal = { bold: false, name: "Calibri", size: 9 };
    const parts = [];
    const pushNl = function () {
        if (parts.length) parts.push({ text: "\n", font: normal });
    };
    if (tx.titulo !== false && it.titulo) {
        parts.push({ text: String(it.titulo), font: bold });
    }
    if (tx.desc === "full" && it.descBody) {
        pushNl();
        parts.push({ text: String(it.descBody), font: normal });
    } else if (tx.desc === "lite" && it.descBody) {
        pushNl();
        const lite = typeof logDescLite_ === "function" ? logDescLite_(it.descBody) : String(it.descBody);
        parts.push({ text: lite, font: normal });
    }
    if (tx.medidas !== false && it.dimTxt) {
        pushNl();
        parts.push({ text: (T.dim || (esEn ? "Overall dimensions" : "Dimensiones generales")) + ": ", font: bold });
        parts.push({ text: String(it.dimTxt), font: normal });
    }
    if (tx.medidas !== false && it.empTxt) {
        pushNl();
        parts.push({ text: (T.emp || (esEn ? "Packaging" : "Empaque")) + ": ", font: bold });
        parts.push({ text: String(it.empTxt), font: normal });
    }
    if (!parts.length) return "";
    return { richText: parts };
}

/** Rótulo «Mejor: Envío Aéreo CIF Ciudad PN» según modalidad / destino. */
function excelCotTituloMejor_(esEn, escId) {
    const vista = typeof logEnvVistaEsc_ === "function" ? logEnvVistaEsc_(escId || "") : {};
    const mod = String(vista.modalidad || "").toLowerCase();
    let modo = "";
    if (mod === "aerea") modo = esEn ? "Air freight" : "Envío Aéreo";
    else if (mod === "fcl") modo = esEn ? "Ocean FCL" : "Envío Marítimo FCL";
    else if (mod === "lcl") modo = esEn ? "Ocean LCL" : "Envío Marítimo LCL";
    else if (mod === "terrestre") modo = esEn ? "Land freight" : "Envío Terrestre";
    else if (mod === "courier") modo = esEn ? "Courier" : "Courier";
    else if (typeof logEsCotizacionExterior_ !== "function" || !logEsCotizacionExterior_()) {
        modo = esEn ? "Domestic shipping" : "Envío nacional";
    } else {
        modo = esEn ? "Shipping" : "Envío";
    }
    let det = typeof logEnvDetalleFlete_ === "function" ? String(logEnvDetalleFlete_(esEn, escId) || "") : "";
    if (det) {
        det = det.replace(/^(FCL|LCL)\s+/i, "").replace(/×/g, "x").replace(/'/g, esEn ? "ft" : " pies");
    }
    const inc = String(vista.incoterm || "").toUpperCase();
    const ciudad = String(vista.destinoCiudad || "").trim();
    const cod = String(vista.destinoCodigo || "").trim()
        || (ciudad ? "" : String(vista.destinoPais || "").trim());
    const bits = [modo];
    if (det) bits.push(det);
    if (inc) bits.push(inc);
    if (ciudad) bits.push(ciudad);
    if (cod && cod.toUpperCase() !== ciudad.toUpperCase()) bits.push(cod);
    return (esEn ? "Best: " : "Mejor: ") + bits.join(" ");
}

/** Etiquetas de líneas logísticas (con tilde, como el PDF). */
function excelCotLabelLog_(key, esEn, escId) {
    if (typeof logEnvEtiquetaTipo_ === "function") {
        const mapTipo = {
            origen: "origen", flete_aereo: "flete_principal", flete_terrestre: "flete_interno",
            flete_maritimo: "flete_principal", seguro: "seguro", destino: "destino",
            duties: "duties", taxes: "taxes", nal_envio: "nal_envio", nal_montaje: "nal_montaje",
            nal_bodega: "nal_bodega", nal_otro: "nal_otro", courier: "courier"
        };
        const tipo = mapTipo[key];
        if (tipo) {
            const mod = key === "flete_aereo" ? "aerea"
                : (key === "flete_maritimo" ? "fcl" : (typeof logEnvModalidad_ === "function" ? logEnvModalidad_(escId) : "aerea"));
            let lab = logEnvEtiquetaTipo_(tipo, mod, esEn);
            if (key === "flete_aereo" || key === "flete_maritimo") {
                const det = typeof logEnvDetalleFlete_ === "function" ? logEnvDetalleFlete_(esEn, escId) : "";
                if (det && key === "flete_maritimo" && lab.toUpperCase().indexOf(det.toUpperCase()) < 0) {
                    lab += " (" + det + ")";
                }
            }
            if (lab) return lab;
        }
    }
    const fb = esEn ? {
        origen: "Costs at origin", flete_aereo: "Air freight", flete_terrestre: "Land freight",
        flete_maritimo: "Ocean freight", seguro: "Insurance", destino: "Costs at destination",
        duties: "Duties", taxes: "Taxes", nal_envio: "Domestic shipping",
        nal_montaje: "Installation", nal_bodega: "Warehousing", nal_otro: "Other (domestic)"
    } : {
        origen: "Costos en origen", flete_aereo: "Flete aéreo", flete_terrestre: "Flete terrestre",
        flete_maritimo: "Flete marítimo", seguro: "Seguro", destino: "Costos en destino",
        duties: "Aranceles", taxes: "Impuestos", nal_envio: "Envío nacional",
        nal_montaje: "Montaje e instalación", nal_bodega: "Bodegaje", nal_otro: "Otro (nacional)"
    };
    return fb[key] || key;
}

function excelCotItemsQuote_(idioma, escId) {
    if (typeof logQuote === "undefined" || !logQuote || !logQuote.filas) return [];
    const filas = (typeof logFilasDeEsc_ === "function")
        ? logFilasDeEsc_(escId || "")
        : (logQuote.filas || []);
    const out = [];
    filas.forEach(function (fila) {
        if (!fila || (fila.tipo !== "item" && fila.tipo !== "libre")) return;
        if (fila.tipo === "sim3d" || (typeof logEsTextoFila_ === "function" && logEsTextoFila_(fila))) return;
        if (!escId && fila.escId) return;
        const v = typeof logFilaValores_ === "function" ? logFilaValores_(fila, idioma, escId || "") : null;
        if (!v || v.excl) return;
        const sub = typeof logSub_ === "function" ? logSub_(v) : null;
        if (sub == null && !(typeof v.qty === "number" && typeof v.unit === "number")) return;
        const factor = typeof logComisionFactor_ === "function" ? (logComisionFactor_(fila) || 1) : 1;
        const unitShow = typeof v.unit === "number" ? v.unit : 0;
        const unitBase = factor > 0 ? unitShow / factor : unitShow;
        if (typeof logAsegurarImgRefFila_ === "function") logAsegurarImgRefFila_(fila);
        let img = "";
        if (v.img && /^data:image\//i.test(v.img)) img = v.img;
        else if (fila.img && /^data:image\//i.test(fila.img)) img = fila.img;
        const groupKey = (typeof logClaveAgrupacionZonaLibre_ === "function")
            ? (logClaveAgrupacionZonaLibre_(fila) || "")
            : "";
        out.push({
            cod: v.cod || fila.proy || "",
            titulo: v.titulo || "",
            descBody: v.desc || "",
            dimTxt: v.dimTxt || "",
            empTxt: v.empTxt || "",
            qty: typeof v.qty === "number" ? v.qty : 0,
            unit: unitShow,
            unitBase: unitBase,
            img: img,
            imgRef: fila.imgRef || fila.srcRef || "",
            groupKey: groupKey,
            span: 1
        });
    });
    /* Rangos: mismo proyecto + mismo render → imagen/código/desc compartidos (como PDF). */
    let i = 0;
    while (i < out.length) {
        const key = out[i].groupKey;
        let n = 1;
        if (key) {
            while (i + n < out.length && out[i + n].groupKey === key) n++;
        }
        out[i].span = n;
        for (let j = 1; j < n; j++) {
            out[i + j].span = 0;
            out[i + j].img = "";
        }
        i += n;
    }
    return out;
}

/** Baja data-URL de renders (cache IDB → Drive). */
async function excelCotHidatarItemsImgs_(items, avisos) {
    items = items || [];
    const pending = items.filter(function (it) {
        return it && it.imgRef && !(it.img && /^data:image\//i.test(it.img));
    });
    for (let i = 0; i < pending.length; i++) {
        const it = pending[i];
        if (typeof logIdbGetImg_ === "function") {
            try {
                const c = await logIdbGetImg_(it.imgRef);
                if (c && /^data:image\//i.test(c)) {
                    it.img = c;
                    continue;
                }
            } catch (e0) { /* noop */ }
        }
    }
    const still = pending.filter(function (it) {
        return !(it.img && /^data:image\//i.test(it.img));
    });
    if (still.length && typeof realizarPeticionBD === "function") {
        const ids = still.map(function (it) { return it.imgRef; });
        try {
            const r = await realizarPeticionBD({
                action: "cotizacion_imagenes",
                ids: ids,
                modo: "blob"
            }, { timeoutMs: 90000 });
            const data = r && r.exito && r.data ? r.data : null;
            if (data) {
                still.forEach(function (it) {
                    const u = data[it.imgRef];
                    if (u && /^data:image\//i.test(u)) {
                        it.img = u;
                        if (typeof logIdbPutImg_ === "function") logIdbPutImg_(it.imgRef, u);
                    }
                });
            }
        } catch (e1) { /* noop */ }
    }
    const conRef = items.filter(function (it) { return it && (it.imgRef || (it.img && /^data:image\//i.test(it.img))); });
    if (!conRef.length) return;
    const ok = conRef.filter(function (it) { return it.img && /^data:image\//i.test(it.img); }).length;
    if (ok === conRef.length) avisos.push(ok + " render(s) en columna Imagen.");
    else if (ok) avisos.push("Renders en Excel: " + ok + "/" + conRef.length + " (recarga imágenes si faltan).");
    else avisos.push("Sin renders para Excel (usa «Recargar imágenes» en Logística).");
}

/** Quita renders de la plantilla (si no, salen dobles y estirados). */
function excelCotLimpiarImagenes_(ws) {
    try {
        if (ws && Array.isArray(ws._media)) ws._media.length = 0;
    } catch (e) {}
}

/** Ancho/alto natural de PNG/JPEG en base64. */
function excelCotNatSize_(b64, ext) {
    try {
        const bin = atob(String(b64 || "").replace(/\s/g, ""));
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        if (ext === "png" && u8[0] === 0x89 && u8.length >= 24) {
            return {
                w: (u8[16] << 24) | (u8[17] << 16) | (u8[18] << 8) | u8[19],
                h: (u8[20] << 24) | (u8[21] << 16) | (u8[22] << 8) | u8[23]
            };
        }
        if ((ext === "jpg" || ext === "jpeg") && u8[0] === 0xff && u8[1] === 0xd8) {
            let i = 2;
            while (i + 8 < u8.length) {
                if (u8[i] !== 0xff) { i++; continue; }
                const marker = u8[i + 1];
                if (marker === 0xd9 || marker === 0xda) break;
                const len = (u8[i + 2] << 8) | u8[i + 3];
                if (marker >= 0xc0 && marker <= 0xc3 && len >= 7) {
                    return { h: (u8[i + 5] << 8) | u8[i + 6], w: (u8[i + 7] << 8) | u8[i + 8] };
                }
                i += 2 + (len > 0 ? len : 1);
            }
        }
    } catch (e) {}
    return null;
}

/** Miniatura col A sin deformar (ext fijo, nunca tl/br). */
function excelCotAddImg_(wb, ws, row1, dataUrl, cache, cacheKey, span) {
    if (!wb || !ws || !dataUrl || !/^data:image\//i.test(dataUrl)) return;
    cache = cache || {};
    span = Math.max(1, Number(span) || 1);
    const key = cacheKey || String(dataUrl).slice(0, 80);
    let imageId = cache[key];
    let ext = "png";
    let b64 = "";
    const m = String(dataUrl).match(/^data:image\/(png|jpe?g|gif);base64,([\s\S]+)$/i);
    if (!m) return;
    ext = m[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    b64 = m[2].replace(/\s/g, "");
    if (imageId == null) {
        try {
            imageId = wb.addImage({ base64: b64, extension: ext === "jpg" ? "jpeg" : ext });
            cache[key] = imageId;
        } catch (eAdd) { return; }
    }
    try { ws.getCell(row1, 1).value = null; } catch (eClr) {}
    const maxW = 76;
    const maxH = span > 1 ? Math.min(140, 52 * span) : 72;
    const nat = excelCotNatSize_(b64, ext);
    let w = maxW;
    let h = maxH;
    if (nat && nat.w > 0 && nat.h > 0) {
        const s = Math.min(maxW / nat.w, maxH / nat.h);
        w = Math.max(24, Math.round(nat.w * s));
        h = Math.max(24, Math.round(nat.h * s));
    }
    const rowPts = Math.max(36, Math.round(h * 0.75) + 10);
    try {
        if (span > 1) {
            const each = Math.max(28, Math.round(rowPts / span));
            for (let s = 0; s < span; s++) {
                const row = ws.getRow(row1 + s);
                row.height = Math.max(Number(row.height) || 0, each);
            }
        } else {
            ws.getRow(row1).height = Math.max(Number(ws.getRow(row1).height) || 0, rowPts);
        }
    } catch (eH) {}
    try {
        /* Centrar en col A / alto de fila (fracción 0–1). Nunca tl/br: deforma. */
        const colCh = Number(ws.getColumn(1).width) || 14;
        const colPx = Math.max(colCh * 7.5, w + 2);
        const colFrac = Math.max(0, Math.min(0.45, (colPx - w) / (2 * colPx)));
        const rowHpt = Number(ws.getRow(row1).height) || rowPts;
        const rowPx = Math.max(rowHpt * (96 / 72), h + 2);
        const rowFrac = Math.max(0, Math.min(0.4, (rowPx - h) / (2 * rowPx)));
        try {
            ws.getCell(row1, 1).alignment = { horizontal: "center", vertical: "middle" };
        } catch (eAl) {}
        ws.addImage(imageId, {
            tl: { col: colFrac, row: row1 - 1 + rowFrac },
            ext: { width: w, height: h },
            editAs: "oneCell"
        });
    } catch (eImg) { /* noop */ }
}

/** Fusiona imagen/código/desc en rangos compartidos (col A–C). */
function excelCotMergeRango_(ws, rowStart, span, cols) {
    if (!(span > 1)) return;
    (cols || [1, 2, 3]).forEach(function (c) {
        try { ws.unMergeCells(rowStart, c, rowStart + span - 1, c); } catch (e0) {}
        try { ws.mergeCells(rowStart, c, rowStart + span - 1, c); } catch (e1) {}
    });
}

/** QUOT 17652-C-V1 · con opciones: QUOT 17652-C-V1.1 … (máx. 31 chars Excel). */
function excelCotNombrePestana_(tipoDoc, codigoDoc, idx, total) {
    const cod = String(codigoDoc || "SIN").replace(/[\\/?*\[\]]/g, "-");
    const suf = total > 1 ? ("." + idx) : "";
    const pref = String(tipoDoc || "COT") + " ";
    let name = pref + cod + suf;
    if (name.length > 31) {
        const maxCod = Math.max(4, 31 - pref.length - suf.length);
        name = pref + cod.slice(0, maxCod) + suf;
    }
    return name;
}

function excelCotMontosLogistica_(idioma, escId) {
    const map = {
        origen: 0, flete_aereo: 0, flete_terrestre: 0, flete_maritimo: 0,
        seguro: 0, destino: 0, duties: 0, taxes: 0,
        nal_envio: 0, nal_montaje: 0, nal_bodega: 0, nal_otro: 0, courier: 0
    };
    const activo = {};
    Object.keys(map).forEach(function (k) { activo[k] = false; });
    if (typeof logEnvAsegurarLineas_ === "function") logEnvAsegurarLineas_(idioma === "en", false, escId);
    const lineas = (typeof logEnvLineasDeEsc_ === "function")
        ? logEnvLineasDeEsc_(escId, idioma === "en")
        : ((typeof logEnv_ === "function" && logEnv_().lineas) || []);
    const baseProd = (typeof logTotalesPartes_ === "function")
        ? (logTotalesPartes_(idioma).prod[escId || ""] || 0)
        : 0;
    const vista = typeof logEnvVistaEsc_ === "function" ? logEnvVistaEsc_(escId || "") : {};
    const mod = String(vista.modalidad || "").toLowerCase();
    lineas.forEach(function (ln) {
        if (!ln || ln.tipo === "libre") return;
        const val = typeof logEnvValorLinea_ === "function" ? logEnvValorLinea_(ln, baseProd, escId) : (Number(ln.valor) || 0);
        const v = Number(val) || 0;
        let key = ln.tipo;
        if (ln.tipo === "flete_principal") {
            key = mod === "aerea" ? "flete_aereo" : (mod === "terrestre" ? "flete_terrestre" : "flete_maritimo");
        } else if (ln.tipo === "flete_interno") {
            key = "flete_terrestre";
        } else if (ln.tipo === "courier") {
            key = "courier";
        }
        if (!Object.prototype.hasOwnProperty.call(map, key) && key === "courier") {
            map.origen += v;
            activo.origen = true;
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(map, key)) return;
        map[key] += v;
        activo[key] = true;
    });
    /* Líneas libres: sumar a nal_otro o origen según mercado */
    lineas.forEach(function (ln) {
        if (!ln || ln.tipo !== "libre") return;
        const val = typeof logEnvValorLinea_ === "function" ? logEnvValorLinea_(ln, baseProd, escId) : (Number(ln.valor) || 0);
        const v = Number(val) || 0;
        if (!(v > 0)) return;
        if (typeof logEsCotizacionExterior_ === "function" && logEsCotizacionExterior_()) {
            map.origen += v;
            activo.origen = true;
        } else {
            map.nal_otro += v;
            activo.nal_otro = true;
        }
    });
    return { map: map, activo: activo, mod: mod };
}

function excelCotPctLogisticaVisible_(idioma, escId) {
    const partes = typeof logTotalesPartes_ === "function" ? logTotalesPartes_(idioma) : null;
    const k = escId || "";
    const gran = partes ? (Number(partes.gran[k]) || 0) : 0;
    const L = partes ? (Number(partes.env[k]) || 0) : 0;
    if (!(gran > 0) || !(L > 0)) return 0;
    const e = typeof logEnv_ === "function" ? logEnv_() : {};
    const pct = e.modoCosto === "resumen" ? (Number(e.resumenPct) || 0) / 100 : 1;
    return (L * pct) / gran;
}

function excelCotRellenarUnaHoja_(wb, ws, ctx, escId, avisos, itemsPre) {
    const idioma = ctx.idioma;
    const esEn = ctx.esEn;
    const opts = ctx.opts;
    const codigoDoc = ctx.codigoDoc;
    const imgCache = ctx.imgCache || (ctx.imgCache = {});

    let items = itemsPre;
    if (!items) {
        items = excelCotItemsQuote_(idioma, escId);
        if (!items.length && escId) {
            items = excelCotItemsQuote_(idioma, "");
            if (items.length) avisos.push("Opción sin ítems propios; se usó zona base en una pestaña.");
        }
    }
    if (!items.length) return false;

    excelCotLimpiarImagenes_(ws);

    const slots = XLSX_COT_ITEM_SLOTS_;
    const extra = Math.max(0, items.length - slots);
    if (extra > 0) {
        for (let k = 0; k < extra; k++) {
            excelCotInsertarFilaModelo_(ws, 6, 5);
        }
        avisos.push("Se insertaron " + extra + " fila(s) de ítem en la cotización.");
    }

    /* Insertar también en el bloque resumen (antes de BEST SHIPPING). */
    const bestBase = 31 + extra;
    const sumStyleFrom = 30 + extra;
    if (extra > 0) {
        for (let k = 0; k < extra; k++) {
            excelCotInsertarFilaModelo_(ws, bestBase, sumStyleFrom);
        }
    }
    const R = excelCotLayout_(extra, extra);
    const granRef = "$F$" + R.granTop;
    const validRef = "$C$" + R.valid;

    const com = typeof logComisionDeEsc_ === "function"
        ? logComisionDeEsc_(escId)
        : (typeof logComisionAsegurar_ === "function" ? logComisionAsegurar_() : { pct: 0 });
    let pctCom = Math.min(100, Math.max(0, Number(com.pct) || 0));
    try {
        /* Misma fuente visible en el panel (evita desfase con plantilla / costos). */
        const pctEl = document.getElementById("logComisionPct");
        const escAct = typeof logOpcionUiAsegurar_ === "function" ? logOpcionUiAsegurar_() : "";
        const mismaOp = !escId || !escAct || escId === escAct
            || (typeof logEscList_ === "function" && !(logEscList_() || []).length);
        if (mismaOp && pctEl && String(pctEl.value).trim() !== "" && isFinite(Number(pctEl.value))) {
            pctCom = Math.min(100, Math.max(0, Number(pctEl.value)));
        }
    } catch (ePct) {}
    const feeCom = (typeof logDescuentoActivo_ === "function" && logDescuentoActivo_(escId))
        ? 0
        : Math.max(0, Number(com.fee) || 0);
    const denCom = 100 + pctCom + feeCom;
    try {
        const i2 = ws.getCell(2, 9);
        i2.value = pctCom / 100;
        i2.numFmt = "0%";
    } catch (eI2) {
        ws.getCell(2, 9).value = pctCom / 100;
    }

    let tituloCab = codigoDoc;
    try {
        if (typeof logCab !== "undefined" && logCab && logCab.over) {
            tituloCab = logCab.over.titulo || logCab.over.proyecto || logCab.over.codigo || tituloCab;
        }
        const edTit = document.querySelector('#logSheet [data-f="titulo"], #logPrintRoot [data-f="titulo"]');
        if (edTit && String(edTit.textContent || "").trim()) tituloCab = String(edTit.textContent).trim();
    } catch (e1) {}
    if (ctx.tipoDoc === "CONS") {
        const pref = esEn ? "CONSOLIDATED" : "CONSOLIDADO";
        const base = String(codigoDoc || tituloCab || "").trim();
        const ya = /^\s*(CONSOLIDATED|CONSOLIDADO)\b/i;
        tituloCab = ya.test(String(tituloCab || "")) ? String(tituloCab).trim() : (pref + " " + base);
    }
    /* Plantilla: título A1:F1; G1 vacío; H1:I1 BACK-OFFICE. */
    excelCotTituloFila_(ws, 1, String(tituloCab || codigoDoc), 1, 6, { bold: true, align: "center" });

    const nFill = Math.max(slots + extra, items.length);
    const mergesTop = [];
    for (let i = 0; i < nFill; i++) {
        const r = R.itemStart + i;
        const it = items[i];
        const qty = it ? it.qty : 0;
        const unitShow = it ? (Number(it.unit) || 0) : 0;
        /* Precio base (sin comisión de venta): al cambiar I2, E recalcula el precio de cotización. */
        const base = it && denCom > 0
            ? Math.round(unitShow * 100 / denCom * 100) / 100
            : unitShow;
        const esCont = it && it.span === 0;
        /* Continuación de rango: no vaciar B/C (si ya hay merge, ExcelJS borra también el maestro). */
        if (!esCont) {
            ws.getCell(r, 2).value = it ? it.cod : null;
            if (it) excelCotCodAlign_(ws, r);
            const rich = it ? excelCotDescRich_(idioma, it) : null;
            ws.getCell(r, 3).value = rich || null;
            if (it) excelCotDescAlign_(ws, r);
            try { ws.getCell(r, 1).value = null; } catch (eA) {}
        }
        ws.getCell(r, 4).value = qty;
        ws.getCell(r, 9).value = base;
        if (it) {
            excelCotPrecioBaseLabel_(ws, r, esEn);
            const feeBit = feeCom > 0 ? ("+" + (feeCom / 100)) : "";
            ws.getCell(r, 5).value = {
                formula: "IF(I" + r + "=0,0,ROUND(I" + r + "*(1+$I$2" + feeBit + "),2))"
            };
        } else {
            ws.getCell(r, 5).value = 0;
        }
        ws.getCell(r, 6).value = { formula: "E" + r + "*D" + r };
        ws.getCell(r, 7).value = { formula: "IF(" + granRef + "=0,0,F" + r + "/" + granRef + ")" };
        if (it && it.span > 1) mergesTop.push({ r: r, span: it.span, i: i, it: it });
        if (it && it.img && it.span !== 0) {
            excelCotAddImg_(wb, ws, r, it.img, imgCache, it.imgRef || ("i" + i), it.span || 1);
        }
        if (!it) excelCotOcultarFila_(ws, r, true);
    }
    /* Fusionar A/B/C de rangos DESPUÉS de escribir código y descripción. */
    mergesTop.forEach(function (m) {
        excelCotMergeRango_(ws, m.r, m.span, [1, 2, 3]);
        try {
            ws.getCell(m.r, 2).value = m.it.cod || null;
            excelCotCodAlign_(ws, m.r);
            ws.getCell(m.r, 3).value = excelCotDescRich_(idioma, m.it) || null;
            excelCotDescAlign_(ws, m.r);
        } catch (eRe) {}
    });
    /* Reaplicar justificación: filas modelo 4–5 de la plantilla quedan centradas si no. */
    for (let i = 0; i < nFill; i++) {
        if (items[i] && items[i].span !== 0) excelCotDescAlign_(ws, R.itemStart + i);
    }

    const mon = (logQuote.moneda || opts.moneda || "USD").toUpperCase();
    const titProd = typeof logEnvTitulo_ === "function"
        ? logEnvTitulo_("prod", null, mon, esEn, escId)
        : (esEn ? "TOTAL PRODUCTS / EXWORKS" : "TOTAL PRODUCTOS / EXWORKS");
    const titLog = typeof logEnvTitulo_ === "function" ? logEnvTitulo_("log", null, mon, esEn, escId) : (esEn ? "TOTAL LOGISTICS COST" : "TOTAL COSTO LOGÍSTICO");
    const titGran = typeof logEnvTitulo_ === "function" ? logEnvTitulo_("gran", null, mon, esEn, escId) : (esEn ? "GRAND TOTAL" : "GRAN TOTAL");

    excelCotTituloFila_(ws, R.totalProd, titProd);
    ws.getCell(R.totalProd, 6).value = { formula: "SUM(F" + R.itemStart + ":F" + R.itemEnd + ")" };
    ws.getCell(R.totalProd, 7).value = { formula: "IF(" + granRef + "=0,0,F" + R.totalProd + "/" + granRef + ")" };
    /* Comisión incluida en el precio: F × % / (100+%[+fee]), igual que Logística. */
    {
        const feeDen = feeCom > 0 ? ("+" + (feeCom / 100)) : "";
        ws.getCell(R.totalProd, 9).value = {
            formula: "IF(OR(F" + R.totalProd + "=0,1+$I$2" + feeDen + "=0),0,F" + R.totalProd + "*$I$2/(1+$I$2" + feeDen + "))"
        };
    }

    const logM = excelCotMontosLogistica_(idioma, escId);
    excelCotRomperBloqueDetalleLog_(ws, R.log.flete_aereo);
    const logLblOpts = {
        bold: false, size: 10, height: 15, align: "right",
        italic: false, fontName: "Arial", forceFont: true
    };
    Object.keys(R.log).forEach(function (key) {
        const row = R.log[key];
        const val = Number(logM.map[key]) || 0;
        excelCotTituloFila_(ws, row, excelCotLabelLog_(key, esEn, escId), 1, 5, logLblOpts);
        ws.getCell(row, 6).value = Math.round(val * 100) / 100;
        ws.getCell(row, 7).value = { formula: "IF(" + granRef + "=0,0,F" + row + "/" + granRef + ")" };
        excelCotOcultarFila_(ws, row, !(logM.activo[key] && val !== 0));
    });

    excelCotTituloFila_(ws, R.totalLog, titLog, 1, 5, {
        bold: true, size: 10, height: 15, align: "right",
        italic: false, fontName: "Arial", forceFont: true
    });
    ws.getCell(R.totalLog, 6).value = { formula: "SUM(F" + R.logStart + ":F" + R.logEnd + ")" };
    ws.getCell(R.totalLog, 7).value = { formula: "IF(" + granRef + "=0,0,F" + R.totalLog + "/" + granRef + ")" };
    try {
        const cTot = ws.getCell(R.totalLog, 6);
        cTot.font = Object.assign({}, cTot.font || {}, { bold: true });
    } catch (eTb) {}

    /* Fila gran total: A:E fusionada, negrita, derecha (sin INCOTERM aparte). */
    try { ws.unMergeCells(R.granTop, 1, R.granTop, 5); } catch (eInc) {}
    try { ws.unMergeCells(R.granTop, 3, R.granTop, 5); } catch (eInc2) {}
    excelCotTituloFila_(ws, R.granTop, titGran, 1, 5, {
        bold: true, size: 10, align: "right", italic: false, fontName: "Arial"
    });
    ws.getCell(R.granTop, 6).value = { formula: "SUM(F" + R.totalProd + ":F" + R.logEnd + ")" };
    ws.getCell(R.granTop, 7).value = { formula: "SUM(G" + R.totalProd + ":G" + R.logEnd + ")" };

    const pago = typeof logPagoDeEsc_ === "function" ? logPagoDeEsc_(escId) : (typeof logPagoAsegurar_ === "function" ? logPagoAsegurar_() : { iva: false, anticipo: false });
    const ivaOn = !!pago.iva;
    const antOn = !!pago.anticipo;
    const ivaPct = Math.min(100, Math.max(0, Number(pago.ivaPct) || 0)) / 100;
    const antPct = Math.min(100, Math.max(0, Number(pago.anticipoPct) || 0)) / 100;
    const labIva = typeof logPagoEtiqueta_ === "function" ? logPagoEtiqueta_("conIva", esEn, mon) : (esEn ? "TOTAL PRICE WITH VAT:" : "VALOR CON IVA:");
    const labAnt = typeof logPagoEtiqueta_ === "function" ? logPagoEtiqueta_("anticipo", esEn, mon) : (esEn ? "ADVANCE PAYMENT:" : "VALOR ANTICIPO:");
    const labSal = typeof logPagoEtiqueta_ === "function" ? logPagoEtiqueta_("saldo", esEn, mon) : (esEn ? "BALANCE DUE:" : "VALOR SALDO:");
    const ivaR = R.pagoTop[0];
    const antR = R.pagoTop[1];
    const salR = R.pagoTop[2];
    excelCotTituloFila_(ws, ivaR, labIva);
    excelCotTituloFila_(ws, antR, labAnt);
    excelCotTituloFila_(ws, salR, labSal);
    ws.getCell(ivaR, 7).value = ivaOn ? ivaPct : 0;
    ws.getCell(antR, 7).value = antOn ? antPct : 0;
    ws.getCell(ivaR, 6).value = { formula: "F" + R.granTop + "*(1+G" + ivaR + ")" };
    ws.getCell(antR, 6).value = { formula: "F" + ivaR + "*G" + antR };
    ws.getCell(salR, 6).value = { formula: "F" + ivaR + "-F" + antR };
    ws.getCell(salR, 7).value = { formula: "1-G" + antR };
    excelCotOcultarFila_(ws, ivaR, !ivaOn);
    excelCotOcultarFila_(ws, antR, !antOn);
    excelCotOcultarFila_(ws, salR, !antOn);

    /* Fila validación (prorrateo oculto → productos del resumen) */
    excelCotCeldaTexto_(ws, R.valid, 1, esEn ? "Quantity" : "Cantidad");
    ws.getCell(R.valid, 2).value = { formula: "+SUM(D" + R.itemStart + ":$D$" + R.itemEnd + ")" };
    ws.getCell(R.valid, 3).value = {
        formula: "+((F" + R.granTop + "-F" + R.best + ")-F" + R.totalProd + ")/B" + R.valid
    };
    excelCotCeldaTexto_(ws, R.valid, 4, esEn ? "VALIDATION DIFFERENCE" : "DIFERENCIA DE VALIDACION");
    ws.getCell(R.valid, 5).value = { formula: "+F" + R.granBot + "-F" + R.granTop };
    ws.getCell(R.valid, 6).value = { formula: "IF(F" + R.totalProd + "=0,0,E" + R.valid + "/F" + R.totalProd + ")" };
    excelCotQuitarFill_(ws, R.valid, 6);

    /* Título del bloque resumen = mismo encabezado */
    const sumTitleRow = R.valid + 1;
    excelCotTituloFila_(ws, sumTitleRow, String(tituloCab || codigoDoc), 1, 6, { bold: true, align: "center" });

    excelCotTituloFila_(ws, R.best, excelCotTituloMejor_(esEn, escId), 1, 3, { bold: true, size: 10 });
    ws.getCell(R.best, 4).value = 1;
    ws.getCell(R.best, 7).value = Math.round(excelCotPctLogisticaVisible_(idioma, escId) * 10000) / 10000;
    ws.getCell(R.best, 5).value = { formula: "ROUND(F" + R.granTop + "*G" + R.best + ",0)" };
    ws.getCell(R.best, 6).value = { formula: "E" + R.best + "*D" + R.best };

    excelCotTituloFila_(ws, R.granBot, titGran, 1, 5, {
        bold: true, size: 10, align: "right", italic: false, fontName: "Arial"
    });
    ws.getCell(R.granBot, 6).value = { formula: "SUM(F" + R.sumStart + ":F" + R.best + ")" };
    ws.getCell(R.granBot, 7).value = { formula: "IF(" + granRef + "=0,0,F" + R.granBot + "/" + granRef + ")" };

    const ivaB = R.pagoBot[0];
    const antB = R.pagoBot[1];
    const salB = R.pagoBot[2];
    excelCotTituloFila_(ws, ivaB, labIva);
    excelCotTituloFila_(ws, antB, labAnt);
    excelCotTituloFila_(ws, salB, labSal);
    ws.getCell(ivaB, 7).value = ivaOn ? ivaPct : 0;
    ws.getCell(antB, 7).value = antOn ? antPct : 0;
    ws.getCell(ivaB, 6).value = { formula: "F" + R.granBot + "*(1+G" + ivaB + ")" };
    ws.getCell(antB, 6).value = { formula: "F" + ivaB + "*G" + antB };
    ws.getCell(salB, 6).value = { formula: "F" + ivaB + "-F" + antB };
    ws.getCell(salB, 7).value = { formula: "1-G" + antB };
    excelCotOcultarFila_(ws, ivaB, !ivaOn);
    excelCotOcultarFila_(ws, antB, !antOn);
    excelCotOcultarFila_(ws, salB, !antOn);

    const mergesSum = [];
    for (let i = 0; i < nFill; i++) {
        const r = R.sumStart + i;
        const src = R.itemStart + i;
        const it = items[i];
        const esCont = it && it.span === 0;
        if (!esCont) {
            ws.getCell(r, 2).value = it ? it.cod : null;
            if (it) excelCotCodAlign_(ws, r);
            const rich = it ? excelCotDescRich_(idioma, it) : null;
            ws.getCell(r, 3).value = rich || null;
            if (it) excelCotDescAlign_(ws, r);
            try { ws.getCell(r, 1).value = null; } catch (eAs) {}
        }
        ws.getCell(r, 4).value = { formula: "+D" + src };
        ws.getCell(r, 5).value = { formula: "IF(D" + r + ">0,ROUND(E" + src + "+" + validRef + ",0),0)" };
        ws.getCell(r, 6).value = { formula: "E" + r + "*D" + r };
        ws.getCell(r, 7).value = { formula: "IF(" + granRef + "=0,0,F" + r + "/" + granRef + ")" };
        if (it && it.span > 1) mergesSum.push({ r: r, span: it.span, it: it });
        if (it && it.img && it.span !== 0) {
            excelCotAddImg_(wb, ws, r, it.img, imgCache, it.imgRef || ("i" + i), it.span || 1);
        }
        if (!it) excelCotOcultarFila_(ws, r, true);
    }
    mergesSum.forEach(function (m) {
        excelCotMergeRango_(ws, m.r, m.span, [1, 2, 3]);
        try {
            ws.getCell(m.r, 2).value = m.it.cod || null;
            excelCotCodAlign_(ws, m.r);
            ws.getCell(m.r, 3).value = excelCotDescRich_(idioma, m.it) || null;
            excelCotDescAlign_(ws, m.r);
        } catch (eRe2) {}
    });
    for (let i = 0; i < nFill; i++) {
        if (items[i] && items[i].span !== 0) excelCotDescAlign_(ws, R.sumStart + i);
    }

    /* La plantilla trae la nota en 2 filas fusionadas; al insertar ítems se ve duplicada. */
    excelCotLimpiarNotaDuplicada_(ws, esEn);
    excelCotLimpiarFillColG_(ws);
    return true;
}

/** Deja una sola fila de nota al pie (A:F). */
function excelCotLimpiarNotaDuplicada_(ws, esEn) {
    const re = /^(Nota:|Note:)/i;
    const notaTxt = esEn
        ? "Note: VAT shown above only applies when enabled in the quote. Final invoice may vary by delivery address."
        : "Nota: El IVA mostrado solo aplica si esta activo en la cotizacion. La factura final puede variar segun la direccion de entrega.";
    const hits = [];
    const maxR = Math.min(Number(ws.rowCount) || 60, 80);
    for (let r = 1; r <= maxR; r++) {
        let plain = "";
        try {
            const v = ws.getCell(r, 1).value;
            if (v && typeof v === "object" && v.richText) plain = v.richText.map(function (t) { return t.text; }).join("");
            else if (v && typeof v === "object" && v.text) plain = v.text;
            else if (v && typeof v === "object" && v.formula) plain = "";
            else plain = v == null ? "" : String(v);
        } catch (e) { plain = ""; }
        if (re.test(plain.trim())) hits.push(r);
    }
    if (!hits.length) return;
    const keep = hits[0];
    hits.slice(1).forEach(function (r) {
        try { ws.unMergeCells(r, 1, r, 6); } catch (e1) {}
        for (let c = 1; c <= 6; c++) {
            try { ws.getCell(r, c).value = null; } catch (e2) {}
        }
        excelCotOcultarFila_(ws, r, true);
    });
    excelCotTituloFila_(ws, keep, notaTxt, 1, 6);
    try {
        const cell = ws.getCell(keep, 1);
        cell.font = Object.assign({}, cell.font || {}, {
            bold: false, italic: true, size: 8, name: "Calibri", color: { argb: "FF666666" }
        });
    } catch (e3) {}
}

async function rellenarHojaCotizacionExcel_(wb, avisos) {
    if (typeof logisticaLeerOpciones_ !== "function" || typeof logQuote === "undefined") {
        throw new Error("Logística no está lista.");
    }
    const opts = logisticaLeerOpciones_();
    const idioma = opts.idioma === "en" ? "en" : "es";
    const esEn = idioma === "en";
    const tipoDoc = typeof logTipoDoc_ === "function" ? logTipoDoc_(idioma) : (esEn ? "QUOT" : "COT");
    const codigoDoc = (typeof logCodigoPrimeraFila_ === "function" && logCodigoPrimeraFila_())
        || valCampo("inputCodigo")
        || "SIN-CODIGO";
    const escs = typeof logEscList_ === "function" ? logEscList_() : [];
    const jobs = escs.length
        ? escs.map(function (e, i) {
            return {
                escId: e.id,
                idx: i + 1,
                label: typeof logEscNombre_ === "function" ? logEscNombre_(e, i, idioma) : ("#" + (i + 1))
            };
        })
        : [{ escId: "", idx: 1, label: "" }];

    const master = excelCotMasterQuote_(wb, esEn);
    if (!master) throw new Error("La plantilla no tiene pestaña " + (esEn ? "QUOT01" : "COT01") + ".");

    excelCotLimpiarSobrantes_(wb, master.id);

    const nombres = jobs.map(function (j) {
        return excelCotNombrePestana_(tipoDoc, codigoDoc, j.idx, jobs.length);
    });
    /* Clonar ANTES de rellenar, partiendo del master limpio. */
    const hojas = [];
    for (let i = 1; i < jobs.length; i++) {
        hojas.push(clonarHojaExcel(wb, master, nombres[i]));
    }
    master.name = nombres[0];
    hojas.unshift(wb.getWorksheet(nombres[0]) || master);

    if (typeof logisticaHidatarImgsCache_ === "function" && logQuote.filas) {
        try { await logisticaHidatarImgsCache_(logQuote.filas); } catch (eCache) { /* noop */ }
    }

    const ctx = {
        idioma: idioma, esEn: esEn, opts: opts, codigoDoc: codigoDoc, tipoDoc: tipoDoc, imgCache: {}
    };
    const hechas = [];
    let avisosImgHechos = false;
    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        let items = excelCotItemsQuote_(idioma, job.escId);
        if (!items.length && job.escId) {
            items = excelCotItemsQuote_(idioma, "");
            if (items.length) avisos.push("Opción sin ítems propios; se usó zona base en una pestaña.");
        }
        if (items.length) {
            const avisosImg = avisosImgHechos ? [] : avisos;
            await excelCotHidatarItemsImgs_(items, avisosImg);
            avisosImgHechos = true;
        }
        const ok = excelCotRellenarUnaHoja_(wb, hojas[i], ctx, job.escId, avisos, items);
        if (ok) {
            try { hojas[i].orderNo = i + 1; } catch (eOrd) {}
            hechas.push(nombres[i] + (job.label ? " (" + job.label + ")" : ""));
        } else {
            avisos.push("Sin datos para «" + nombres[i] + "»; pestaña omitida del relleno.");
        }
    }
    if (!hechas.length) throw new Error("La cotización no tiene ítems con precio para exportar.");
    avisos.push("Cotización → " + hechas.join(", ") + ".");
    return hojas[0];
}

window.exportarLogisticaExcel = function () {
    return window.exportarPresupuestoExcel({ incluirCotizacion: true, btnId: "btnLogExcel" });
};

window.exportarPresupuestoExcel = async function (opts) {
    opts = opts || {};
    const incluirCot = !!opts.incluirCotizacion;
    if (typeof ExcelJS === "undefined") {
        return mostrarNotificacion("No cargó la librería Excel. Recarga la página.", "danger");
    }
    if (incluirCot) {
        if (typeof logQuote === "undefined" || !logQuote || !logQuote.filas || !logQuote.filas.length) {
            return mostrarNotificacion("Arma la cotización en Logística antes de exportar Excel.", "warning");
        }
    }
    const versiones = typeof window.listarVersionesPresupuesto === "function"
        ? window.listarVersionesPresupuesto()
        : [];
    const hayItems = versiones.some(function (v) {
        if ((v.matrizItems || []).length) return true;
        return (v.elementos || []).some(function (e) { return (e.matrizItems || []).length; });
    }) || (typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length);
    if (!hayItems) {
        return mostrarNotificacion(incluirCot
            ? "Abre el presupuesto en Costos (con matriz) para llenar EXP/NAL junto con la cotización."
            : "No hay matriz para exportar.", "warning");
    }
    const lista = versiones.length ? versiones : [{
        id: "V1",
        comentario: "",
        tipoPresupuesto: typeof mercadoActual === "function" ? mercadoActual() : "NACIONAL",
        datosAdicionales: {},
        matrizItems: itemsPresupuesto,
        escalas: typeof lotesSimulacion !== "undefined" ? lotesSimulacion : [{ id: "l1", q: 1 }]
    }];
    const avisos = [];

    const btn = document.getElementById(opts.btnId || "btnExportarExcel");
    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Excel...'; }
    try {
        const wb = await cargarPlantillaExcel();
        const { masterExp, masterNal } = maestrosExpNal(wb);
        if (!masterExp && !masterNal) throw new Error("No está la pestaña EXP/NAL en la plantilla.");

        const codigo = valCampo("inputCodigo") || valCampo("noProyecto") || "SIN-CODIGO";
        const grupal = typeof esPresupuestoGrupal === "function" && esPresupuestoGrupal();
        let downloadName = "presupuesto No." + codigo + ".xlsx";
        if (grupal) {
            const vid = (typeof window.versionActivaId === "string" && window.versionActivaId) || (lista[lista.length - 1] && lista[lista.length - 1].id) || "V1";
            const ver = lista.find(function (v) { return v.id === vid; }) || lista[lista.length - 1];
            const piezas = elementosDeVersionExcel_(ver).filter(function (e) { return (e.matrizItems || []).length; });
            if (!piezas.length) throw new Error("No hay matriz en ninguna pieza.");
            const exp = versionEsExportacion(ver);
            const key = exp ? "EXP" : "NAL";
            const master = key === "EXP" ? masterExp : masterNal;
            if (!master) throw new Error("La plantilla no tiene pestaña " + key + ".");
            const vistos = {};
            const hojasPieza = [];
            const hojasAux = [];
            const proyectoBase = valCampo("noProyecto");
            piezas.forEach(function (el, i) {
                let nombre = nombrePestanaElemento(el.nombre, i);
                if (vistos[nombre.toLowerCase()]) nombre = nombrePestanaElemento(nombre + " " + (i + 1), i);
                vistos[nombre.toLowerCase()] = true;
                let ws;
                if (i === 0) {
                    master.name = nombre;
                    ws = master;
                } else {
                    ws = clonarHojaExcel(wb, master, nombre);
                }
                const verPieza = Object.assign({}, ver, {
                    matrizItems: el.matrizItems,
                    escalas: el.escalas,
                    fichaComercial: el.fichaComercial,
                    comentario: [ver.comentario, el.nombre].filter(Boolean).join(" · ")
                });
                const proyectoHoja = nombreProyectoElemento_(proyectoBase, codigo, el.nombre);
                const nCand = (el.matrizItems || []).filter(itemExportCandado_).length;
                rellenarHojaVersion(ws, verPieza, codigo, avisos, { proyecto: proyectoHoja });
                hojasPieza.push(ws);
                if (nCand) {
                    const aux = clonarHojaExcel(wb, ws, nombrePestanaElemento("AUX " + el.nombre, i));
                    rellenarHojaVersion(aux, verPieza, codigo, avisos, { incluirCandado: true, esAux: true, proyecto: proyectoHoja });
                    hojasAux.push(aux);
                }
            });
            ordenarBloqueHojas_(wb, hojasPieza.concat(hojasAux));
            downloadName = "presupuesto No." + codigo + "-" + vid + ".xlsx";
        } else {
            const usados = { EXP: 0, NAL: 0 };
            const ultimoOrden = { EXP: masterExp ? masterExp.orderNo : 0, NAL: masterNal ? masterNal.orderNo : 0 };
            const asignadas = [];
            lista.forEach(function (ver) {
                const exp = versionEsExportacion(ver);
                const key = exp ? "EXP" : "NAL";
                const master = key === "EXP" ? masterExp : masterNal;
                if (!master) throw new Error("La plantilla no tiene pestaña " + key + " para " + ver.id + ".");
                usados[key]++;
                const nombre = nombrePestanaVersion(key, codigo, ver.id);
                let ws;
                if (usados[key] === 1) {
                    master.name = nombre;
                    ws = master;
                    ultimoOrden[key] = ws.orderNo;
                } else {
                    ws = clonarHojaExcel(wb, master, nombre);
                    ws.orderNo = ultimoOrden[key] + 0.5;
                    ultimoOrden[key] = ws.orderNo;
                }
                asignadas.push({ ver: ver, ws: ws });
            });
            asignadas.forEach(function (a) {
                const nCand = (a.ver.matrizItems || []).filter(itemExportCandado_).length;
                let aux = null;
                if (nCand) {
                    const auxName = nombrePestanaVersion("AUX", codigo, a.ver.id);
                    aux = clonarHojaExcel(wb, a.ws, auxName);
                    aux.orderNo = (a.ws.orderNo || 0) + 0.25;
                }
                rellenarHojaVersion(a.ws, a.ver, codigo, avisos);
                if (aux) {
                    rellenarHojaVersion(aux, a.ver, codigo, avisos, { incluirCandado: true, esAux: true });
                    avisos.push(a.ver.id + ": pestaña " + aux.name + " (formato NAL/EXP, con " + nCand + " candada(s)).");
                }
            });
        }
        aplicarTrmHojasLogistica(wb);

        if (incluirCot) {
            if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Renders…';
            await rellenarHojaCotizacionExcel_(wb, avisos);
            if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Excel...';
        }

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        const okMsg = incluirCot
            ? (avisos.length ? ("Excel (presupuesto + cotización) descargado. " + avisos.join(" ")) : "Excel con presupuesto y cotización descargado.")
            : (avisos.length ? ("Excel descargado. " + avisos.join(" ")) : (grupal ? "Excel grupal descargado. Una pestaña por pieza." : "Excel descargado. Abre el archivo para que recalcule el AIU."));
        mostrarNotificacion(okMsg, "success");
    } catch (e) {
        mostrarNotificacion("No se pudo exportar Excel: " + (e.message || e), "danger");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
};
