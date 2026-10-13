var PLANTILLA_PRESUPUESTO_XLSX = "plantillas/presupuesto-diforma.xlsx";
var MAPA_XLSX_DEFAULT = {
    hojaExpPatron: "^EXP",
    hojaNalPatron: "^NAL",
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
    fleteFila: 35
};
var XLSX_FILAS_FAB = { inicio: 10, fin: 32 };
var XLSX_FILAS_COM = { inicio: 37, fin: 39 };
var XLSX_FILA_FLETE = 35;
var XLSX_MAPA = Object.assign({}, MAPA_XLSX_DEFAULT);

function valCampo(id) {
    return (document.getElementById(id)?.value || "").trim();
}

function tresLotesExportacion(escalas) {
    const src = escalas || (typeof lotesSimulacion !== "undefined" ? lotesSimulacion : [{ id: "l1", q: 1 }]);
    const lots = src.slice().sort(function (a, b) { return (a.q || 0) - (b.q || 0); });
    const avisos = [];
    if (lots.length > 3) avisos.push("El Excel solo tiene 3 rangos; se exportaron los tres de menor Q.");
    while (lots.length < 3) {
        const last = lots[lots.length - 1] || { id: "l1", q: 1 };
        lots.push({ id: last.id + "_pad" + lots.length, q: last.q || 1, pad: true });
        if (lots.length === 3 && (lotesSimulacion || []).length < 3) {
            avisos.push("Se completó a 3 rangos copiando el último Q para la plantilla.");
        }
    }
    return { lots: lots.slice(0, 3), avisos: avisos };
}

function esFleteGlobal(item) {
    if (!item) return false;
    const n = String(item.nombre || "");
    const cat = String(item.categoria || "");
    if (/flete|transporte|transport/i.test(n)) return true;
    if (item.es_global && /empaque|flete/i.test(cat)) return true;
    return false;
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
    if (item.es_global) return u * q;
    return u;
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
    escribirCelda(ws, u[0] + row, unitarioLote(item, lots[0], escalas));
    escribirCelda(ws, u[1] + row, unitarioLote(item, lots[1], escalas));
    escribirCelda(ws, u[2] + row, unitarioLote(item, lots[2], escalas));
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
    ["codigo", "cliente", "proyecto", "analista", "comercial", "disenador", "fecha"].forEach(function (k) {
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
    m.hojaExp = String(m.hojaExp || "");
    m.hojaNal = String(m.hojaNal || "");
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
    const re = new RegExp(exp ? (XLSX_MAPA.hojaExpPatron || "^EXP") : (XLSX_MAPA.hojaNalPatron || "^NAL"), "i");
    return wb.worksheets.find(function (w) { return re.test(w.name); });
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
    return codigo;
}

function aplicarRangosExcel(ws, lots) {
    const q = XLSX_MAPA.q || MAPA_XLSX_DEFAULT.q;
    escribirCelda(ws, q[0], Number(lots[0].q) || 1);
    escribirCelda(ws, q[1], Number(lots[1].q) || 1);
    escribirCelda(ws, q[2], Number(lots[2].q) || 1);
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

function clonarHojaExcel(wb, src, nuevoNombre) {
    const existente = wb.getWorksheet(nuevoNombre);
    if (existente) wb.removeWorksheet(existente.id);
    const opts = {};
    try { opts.views = JSON.parse(JSON.stringify(src.views || [])); } catch (e) {}
    try { opts.pageSetup = JSON.parse(JSON.stringify(src.pageSetup || {})); } catch (e2) {}
    try { opts.headerFooter = JSON.parse(JSON.stringify(src.headerFooter || {})); } catch (e3) {}
    try { opts.properties = JSON.parse(JSON.stringify(src.properties || {})); } catch (e4) {}
    const copy = wb.addWorksheet(nuevoNombre, opts);
    const colCount = Math.max(Number(src.columnCount) || 13, 13);
    for (let c = 1; c <= colCount; c++) {
        const sc = src.getColumn(c);
        const dc = copy.getColumn(c);
        if (sc.width != null) dc.width = sc.width;
        dc.hidden = !!sc.hidden;
        if (sc.style) {
            try { dc.style = JSON.parse(JSON.stringify(sc.style)); } catch (e5) {}
        }
    }
    src.eachRow({ includeEmpty: true }, function (row, n) {
        const dr = copy.getRow(n);
        if (row.height != null) dr.height = row.height;
        dr.hidden = !!row.hidden;
        row.eachCell({ includeEmpty: true }, function (cell, col) {
            const t = dr.getCell(col);
            t.value = cell.value;
            try { t.style = JSON.parse(JSON.stringify(cell.style || {})); } catch (e6) {}
            if (cell.numFmt) t.numFmt = cell.numFmt;
        });
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
    function pick(re, preferred) {
        if (preferred) {
            const w = wb.getWorksheet(preferred);
            if (w) return w;
        }
        return wb.worksheets.find(function (s) { return re.test(s.name); }) || null;
    }
    const masterExp = pick(/^EXP/i, XLSX_MAPA.hojaExp);
    const masterNal = pick(/^NAL/i, XLSX_MAPA.hojaNal);
    wb.worksheets.slice().forEach(function (w) {
        if (/^EXP/i.test(w.name) && masterExp && w.id !== masterExp.id) wb.removeWorksheet(w.id);
        if (/^NAL/i.test(w.name) && masterNal && w.id !== masterNal.id) wb.removeWorksheet(w.id);
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

function rellenarHojaVersion(ws, ver, codigo, avisos) {
    const items = ver.matrizItems || [];
    const escalas = ver.escalas || [{ id: "l1", q: 1 }];
    const { lots } = tresLotesExportacion(escalas);
    const fab = [];
    const com = [];
    const fletes = [];
    items.forEach(function (it) {
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
        proyecto: valCampo("noProyecto"),
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

function analizarPlantillaHeuristica(wb) {
    const hojas = wb.worksheets.map(function (w) { return w.name; });
    const mapa = Object.assign({}, MAPA_XLSX_DEFAULT);
    const extra = [];
    const notas = [];
    const exp = wb.worksheets.find(function (w) { return /^EXP/i.test(w.name); });
    const nal = wb.worksheets.find(function (w) { return /^NAL/i.test(w.name); });
    hojas.forEach(function (n) {
        if (!/^EXP/i.test(n) && !/^NAL/i.test(n) && !/^ADMIN$/i.test(n)) extra.push(n);
    });
    if (exp) {
        mapa.hojaExp = exp.name;
        mapa.hojaExpPatron = "^EXP";
    }
    if (nal) {
        mapa.hojaNal = nal.name;
        mapa.hojaNalPatron = "^NAL";
    }
    const ws = exp || nal || wb.worksheets[0];
    if (!exp && !nal) notas.push("No hay pestaña EXP/NAL; el mapeo se hizo sobre «" + (ws && ws.name) + "».");
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
    return { mapa: sanitizarMapaXlsx(mapa), hojas: hojas, extra: extra, notas: notas };
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
        "fabInicio, fabFin, comInicio, comFin, fleteFila, notas.",
        "Las celdas van en notación A1. No inventes pestañas. ADMIN, QUOT, COT, Metales y extras no se rellenan.",
        "Hojas: " + analisis.hojas.join(" | "),
        "Mapa heurístico: " + JSON.stringify(analisis.mapa),
        "Celdas con texto (pestaña destino, filas 1-45):",
        textoHoja.slice(0, 7000)
    ].join("\n");
    try {
        const data = await realizarPeticionBD({
            action: "gemini_chat",
            forzarPro: false,
            promptText: prompt
        }, { timeoutMs: 60000 });
        if (data && data.exito === false) {
            analisis.notas.push(data.mensaje || "Gemini no refinó el mapa.");
            analisis.origen = "heuristica";
            return analisis;
        }
        const raw = data?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extraerJsonMapa(raw);
        if (!parsed) return Object.assign({}, analisis, { origen: "heuristica" });
        analisis.mapa = sanitizarMapaXlsx(Object.assign({}, analisis.mapa, parsed));
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
    const lines = [
        "Origen: " + (an.origen || "heuristica"),
        "Pestañas: " + an.hojas.join(", "),
        "Destino EXP: " + (m.hojaExp || m.hojaExpPatron),
        "Destino NAL: " + (m.hojaNal || m.hojaNalPatron),
        "Extra (se conservan, no se rellenan): " + (an.extra.length ? an.extra.join(", ") : "ninguna"),
        "Código " + m.codigo + " · Cliente " + m.cliente + " · Proyecto " + m.proyecto,
        "Rangos Q: " + m.q.join(", "),
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
            if (d.mapa) aplicarMapaXlsx(d.mapa);
            box.textContent = "En Drive: " + (d.nombre || "plantilla.xlsx") + (d.actualizado ? " · " + String(d.actualizado).replace("T", " ").slice(0, 16) : "");
            const pre = document.getElementById("plantillaExcelAnalisis");
            if (pre && d.mapa) {
                pre.textContent = textoAnalisisPlantilla({
                    mapa: sanitizarMapaXlsx(d.mapa),
                    hojas: [d.mapa.hojaExp, d.mapa.hojaNal].filter(Boolean),
                    extra: [],
                    origen: "publicado",
                    notas: []
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
        const dest = wb.getWorksheet(analisis.mapa.hojaExp) || wb.getWorksheet(analisis.mapa.hojaNal) || wb.worksheets[0];
        if (pre) pre.textContent = "Revisando formato con IA…\n" + textoAnalisisPlantilla(analisis);
        analisis = await refinarMapaConGemini(analisis, dest ? hojaComoTexto(dest, 45) : "");
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
        if (typeof window.refrescarEstadoPlantillaExcel === "function") window.refrescarEstadoPlantillaExcel();
    } catch (e) {
        mostrarNotificacion("No se pudo cargar la plantilla: " + (e.message || e), "danger");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
};

window.exportarPresupuestoExcel = async function () {
    if (typeof ExcelJS === "undefined") {
        return mostrarNotificacion("No cargó la librería Excel. Recarga la página.", "danger");
    }
    const versiones = typeof window.listarVersionesPresupuesto === "function"
        ? window.listarVersionesPresupuesto()
        : [];
    const hayItems = versiones.some(function (v) { return (v.matrizItems || []).length; })
        || (typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length);
    if (!hayItems) {
        return mostrarNotificacion("No hay matriz para exportar.", "warning");
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

    const btn = document.getElementById("btnExportarExcel");
    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Excel...'; }
    try {
        const wb = await cargarPlantillaExcel();
        const { masterExp, masterNal } = maestrosExpNal(wb);
        if (!masterExp && !masterNal) throw new Error("No está la pestaña EXP/NAL en la plantilla.");

        const codigo = valCampo("inputCodigo") || valCampo("noProyecto") || "SIN-CODIGO";
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
        asignadas.forEach(function (a) { rellenarHojaVersion(a.ws, a.ver, codigo, avisos); });

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "presupuesto No." + codigo + ".xlsx";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        mostrarNotificacion(avisos.length ? ("Excel descargado. " + avisos.join(" ")) : "Excel descargado. Abre el archivo para que recalcule el AIU.", "success");
    } catch (e) {
        mostrarNotificacion("No se pudo exportar Excel: " + (e.message || e), "danger");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
};
