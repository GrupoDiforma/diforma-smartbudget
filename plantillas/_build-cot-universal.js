/**
 * Genera plantilla de revisión: QUOT01 + COT01 universales (nacional/exportación).
 * Copia el resto de hojas del archivo fuente sin modificarlas (EXP/NAL/ADMIN/…).
 *
 * Uso:
 *   node plantillas/_build-cot-universal.js
 */
const path = require("path");
const fs = require("fs");
const ExcelJS = require(path.join(process.env.TEMP || process.env.TMP, "sb-exceljs-pkg", "node_modules", "exceljs"));

const SRC_CANDIDATES = [
    "G:\\Unidades compartidas\\GD-Compras y Presupuestos\\Formatos\\Formatos de presupuestos\\presupuesto No.10000-A.xlsx",
    path.join(__dirname, "presupuesto-diforma.xlsx")
];
const OUT = path.join(__dirname, "presupuesto-cotizacion-universal-REVISION.xlsx");

const YELLOW = "FFFFF2CC";
const HEADER_FILL = "FFD9E2F3";
const SECTION_FILL = "FFF2F2F2";
const TOTAL_FILL = "FFE2EFDA";
const MONEY = '"$"#,##0.00';
const PCT = "0.0%";
const THIN = { style: "thin", color: { argb: "FFB0B0B0" } };

function borderAll(cell) {
    cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
}

function fill(cell, argb) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function bold(cell) {
    cell.font = Object.assign({}, cell.font || {}, { bold: true, size: cell.font?.size || 10, name: "Calibri" });
}

function font(cell, opts) {
    cell.font = Object.assign({ name: "Calibri", size: 10 }, opts || {});
}

function money(cell, v) {
    cell.value = v;
    cell.numFmt = MONEY;
    cell.alignment = { horizontal: "right", vertical: "middle" };
}

function pct(cell, v) {
    cell.value = v;
    cell.numFmt = PCT;
    cell.alignment = { horizontal: "center", vertical: "middle" };
}

function label(cell, text, opts) {
    cell.value = text;
    font(cell, opts);
    cell.alignment = { vertical: "middle", wrapText: true };
}

/** Textos EN / ES */
const L = {
    en: {
        sheet: "QUOT01 A-V1",
        title: "HEADER IF APPLICABLE",
        backOffice: "BACK-OFFICE COMERCIAL",
        img: "Project image",
        code: "Project Code",
        desc: "Description",
        qty: "Quantity",
        unit: "Unit Price",
        ext: "Extended Price",
        pror: "Prorating",
        comPct: "% Commission",
        comBase: "Base price",
        comTotal: "Total commission",
        prodTotal: "TOTAL PRODUCTS (EXW / BEFORE LOGISTICS)",
        logTitle: "LOGISTICS DETAILS (national + export — unused rows stay at 0)",
        logRows: [
            { key: "nal_envio", label: "Domestic shipping" },
            { key: "nal_montaje", label: "Installation" },
            { key: "nal_bodega", label: "Warehousing" },
            { key: "nal_otro", label: "Other (domestic)" },
            { key: "origen", label: "Origin costs" },
            { key: "flete_interno", label: "Inland freight" },
            { key: "flete_principal", label: "Main freight (air / ocean / land)" },
            { key: "seguro", label: "Insurance" },
            { key: "destino", label: "Destination costs" },
            { key: "duties", label: "Duties" },
            { key: "taxes", label: "Taxes" },
            { key: "courier", label: "Consolidated shipping" },
            { key: "libre", label: "Additional logistics (extra — app may insert more)" }
        ],
        logTotal: "TOTAL LOGISTICS COST",
        incoterm: "INCOTERM:",
        destPrice: "DESTINATION / DELIVERY PRICE",
        grandTop: "GRAND TOTAL (BEFORE VAT)",
        payTitle: "PAYMENT BREAKDOWN (from quote)",
        conIva: "TOTAL PRICE WITH VAT",
        anticipo: "ADVANCE PAYMENT",
        saldo: "BALANCE DUE",
        payOptTitle: "OPTIONAL COMMERCIAL TERMS (template legacy)",
        payCash: "PAY UP TO DATE / PAY IN ADVANCE",
        pay30: "PAYMENT IN 30 DAYS",
        pay60: "PAYMENT IN 60 DAYS",
        summaryTitle: "QUOTATION SUMMARY (logistics as % of grand total)",
        bestShip: "BEST SHIPPING / LOGISTICS LINE",
        grandBottom: "GRAND TOTAL",
        note: "Note: Applicable taxes/VAT shown above only when enabled in the quote. Final invoice may vary by delivery address.",
        sampleCode: "17652-A",
        sampleDesc: "SAMPLE FLOOR DISPLAY — corrugated + digital print (review layout)."
    },
    es: {
        sheet: "COT01 A-V1",
        title: "TÍTULO SI APLICA",
        backOffice: "BACK-OFFICE COMERCIAL",
        img: "Imagen",
        code: "Código de proyecto",
        desc: "Descripción",
        qty: "Cantidad",
        unit: "Precio unitario",
        ext: "Precio subtotal",
        pror: "Prorrateo",
        comPct: "% Comisión",
        comBase: "Precio base",
        comTotal: "Total comisión",
        prodTotal: "TOTAL PRODUCTOS (EXW / SIN LOGÍSTICA)",
        logTitle: "DETALLE LOGÍSTICO (nacional + exportación — filas no usadas quedan en 0)",
        logRows: [
            { key: "nal_envio", label: "Envío nacional" },
            { key: "nal_montaje", label: "Montaje e instalación" },
            { key: "nal_bodega", label: "Bodegaje" },
            { key: "nal_otro", label: "Otro (nacional)" },
            { key: "origen", label: "Costos en origen" },
            { key: "flete_interno", label: "Flete terrestre" },
            { key: "flete_principal", label: "Flete principal (aéreo / marítimo / terrestre)" },
            { key: "seguro", label: "Seguro" },
            { key: "destino", label: "Costos en destino" },
            { key: "duties", label: "Duties / Aranceles" },
            { key: "taxes", label: "Taxes" },
            { key: "courier", label: "Costo logístico consolidado" },
            { key: "libre", label: "Logística adicional (extra — la app puede insertar más)" }
        ],
        logTotal: "TOTAL COSTO LOGÍSTICO",
        incoterm: "INCOTERM:",
        destPrice: "PRECIO DESTINO / ENTREGA",
        grandTop: "GRAN TOTAL (SIN IVA)",
        payTitle: "DESGLOSE DE PAGO (desde la cotización)",
        conIva: "VALOR CON IVA",
        anticipo: "VALOR ANTICIPO",
        saldo: "VALOR SALDO",
        payOptTitle: "TÉRMINOS COMERCIALES OPCIONALES (legado plantilla)",
        payCash: "PAGO DE CONTADO / ANTICIPADO",
        pay30: "PAGO A 30 DÍAS",
        pay60: "PAGO A 60 DÍAS",
        summaryTitle: "RESUMEN DE COTIZACIÓN (logística como % del gran total)",
        bestShip: "MEJOR COSTO / LÍNEA LOGÍSTICA",
        grandBottom: "GRAN TOTAL",
        note: "Nota: El IVA arriba solo aparece si está activo en la cotización. La factura final puede variar según la dirección de entrega.",
        sampleCode: "17652-A",
        sampleDesc: "EJEMPLO EXHIBIDOR DE PISO — corrugado + impresión digital (revisar formato)."
    }
};

/**
 * Sample numbers for visual review:
 * products 100 + logistics detail 100 = GT 200
 * visible logistics share of GT = 20% → line 40, products shown 160
 */
function buildUniversalSheet(wb, lang) {
    const t = L[lang];
    const name = t.sheet;
    const old = wb.getWorksheet(name);
    if (old) wb.removeWorksheet(old.id);

    const ws = wb.addWorksheet(name, {
        views: [{ showGridLines: false }],
        properties: { defaultRowHeight: 18 }
    });

    ws.columns = [
        { key: "A", width: 36 },
        { key: "B", width: 14 },
        { key: "C", width: 48 },
        { key: "D", width: 11 },
        { key: "E", width: 13 },
        { key: "F", width: 14 },
        { key: "G", width: 11 },
        { key: "H", width: 12 },
        { key: "I", width: 12 }
    ];

    let r = 1;

    // --- Title ---
    label(ws.getCell(r, 1), t.title, { bold: true, size: 12 });
    label(ws.getCell(r, 8), t.backOffice, { bold: true, size: 9 });
    r = 2;

    // --- Headers products ---
    const headers = [t.img, t.code, t.desc, t.qty, t.unit, t.ext, t.pror, t.comPct, ""];
    headers.forEach((h, i) => {
        const c = ws.getCell(r, i + 1);
        label(c, h, { bold: true, size: 9 });
        fill(c, HEADER_FILL);
        borderAll(c);
    });
    // I2 = commission % (decision cell)
    pct(ws.getCell(r, 9), 0);
    fill(ws.getCell(r, 9), YELLOW);
    borderAll(ws.getCell(r, 9));
    ws.getCell(r, 9).note = lang === "en"
        ? "INPUT: commercial commission % applied to lines (I column)."
        : "ENTRADA: % comisión comercial aplicado a las líneas (columna I).";
    const headerRow = r;
    r++;

    // --- Item model rows (3 slots; app inserts more by cloning row itemStart) ---
    const itemStart = r;
    const sampleItems = [
        { code: t.sampleCode, desc: t.sampleDesc, qty: 1, unit: 100, comBase: 100 },
        { code: "", desc: "", qty: 0, unit: 0, comBase: 0 },
        { code: "", desc: "", qty: 0, unit: 0, comBase: 0 }
    ];
    sampleItems.forEach((it, idx) => {
        label(ws.getCell(r, 1), idx === 0 ? "(image)" : "", { size: 9, italic: true, color: { argb: "FF888888" } });
        label(ws.getCell(r, 2), it.code);
        label(ws.getCell(r, 3), it.desc);
        ws.getCell(r, 4).value = it.qty;
        money(ws.getCell(r, 5), it.unit);
        ws.getCell(r, 6).value = { formula: `E${r}*D${r}` };
        ws.getCell(r, 6).numFmt = MONEY;
        // prorating vs grand total top (filled later when we know GT row)
        label(ws.getCell(r, 8), t.comBase, { size: 9 });
        money(ws.getCell(r, 9), it.comBase);
        for (let c = 1; c <= 9; c++) borderAll(ws.getCell(r, c));
        r++;
    });
    const itemEnd = r - 1;

    // --- Products total ---
    label(ws.getCell(r, 1), t.prodTotal, { bold: true });
    fill(ws.getCell(r, 1), TOTAL_FILL);
    ws.getCell(r, 6).value = { formula: `SUM(F${itemStart}:F${itemEnd})` };
    ws.getCell(r, 6).numFmt = MONEY;
    bold(ws.getCell(r, 6));
    fill(ws.getCell(r, 6), TOTAL_FILL);
    label(ws.getCell(r, 8), t.comTotal, { bold: true, size: 9 });
    ws.getCell(r, 9).value = { formula: `SUM(I${itemStart}:I${itemEnd})*I$${headerRow}` };
    ws.getCell(r, 9).numFmt = MONEY;
    const prodTotalRow = r;
    r++;

    // --- Logistics section ---
    label(ws.getCell(r, 1), t.logTitle, { bold: true, size: 10 });
    fill(ws.getCell(r, 1), SECTION_FILL);
    ws.mergeCells(r, 1, r, 6);
    r++;

    // Mode helper for main freight
    label(ws.getCell(r, 4), lang === "en" ? "Mode" : "Modo", { bold: true, size: 9 });
    label(ws.getCell(r, 5), lang === "en" ? "air / ocean / land" : "aéreo / marítimo / terrestre", { size: 9, italic: true });
    r++;

    const logStart = r;
    const sampleLog = {
        nal_envio: 0,
        nal_montaje: 0,
        nal_bodega: 0,
        nal_otro: 0,
        origen: 20,
        flete_interno: 0,
        flete_principal: 60,
        seguro: 5,
        destino: 15,
        duties: 0,
        taxes: 0,
        courier: 0,
        libre: 0
    };
    t.logRows.forEach((row) => {
        label(ws.getCell(r, 1), row.label);
        ws.getCell(r, 1).note = "anchor:" + row.key;
        money(ws.getCell(r, 6), sampleLog[row.key] || 0);
        // % of grand total (formula after GT known)
        for (let c = 1; c <= 7; c++) borderAll(ws.getCell(r, c));
        if (row.key === "libre") {
            font(ws.getCell(r, 1), { size: 9, italic: true, color: { argb: "FF666666" } });
        }
        r++;
    });
    const logEnd = r - 1;

    label(ws.getCell(r, 1), t.logTotal, { bold: true });
    fill(ws.getCell(r, 1), TOTAL_FILL);
    ws.getCell(r, 6).value = { formula: `SUM(F${logStart}:F${logEnd})` };
    ws.getCell(r, 6).numFmt = MONEY;
    bold(ws.getCell(r, 6));
    fill(ws.getCell(r, 6), TOTAL_FILL);
    const logTotalRow = r;
    r++;

    // Incoterm + grand total (before VAT)
    label(ws.getCell(r, 1), t.incoterm, { bold: true });
    label(ws.getCell(r, 2), "CIF"); // sample
    label(ws.getCell(r, 3), t.destPrice, { bold: true });
    r++;
    label(ws.getCell(r, 1), t.grandTop, { bold: true, size: 11 });
    fill(ws.getCell(r, 1), TOTAL_FILL);
    ws.getCell(r, 6).value = { formula: `F${prodTotalRow}+F${logTotalRow}` };
    ws.getCell(r, 6).numFmt = MONEY;
    bold(ws.getCell(r, 6));
    fill(ws.getCell(r, 6), TOTAL_FILL);
    const grandTopRow = r;
    // Prorating formulas for product lines vs this GT
    for (let i = itemStart; i <= itemEnd; i++) {
        ws.getCell(i, 7).value = { formula: `IF($F$${grandTopRow}=0,0,F${i}/$F$${grandTopRow})` };
        ws.getCell(i, 7).numFmt = PCT;
    }
    for (let i = logStart; i <= logEnd; i++) {
        ws.getCell(i, 7).value = { formula: `IF($F$${grandTopRow}=0,0,F${i}/$F$${grandTopRow})` };
        ws.getCell(i, 7).numFmt = PCT;
    }
    ws.getCell(logTotalRow, 7).value = { formula: `IF($F$${grandTopRow}=0,0,F${logTotalRow}/$F$${grandTopRow})` };
    ws.getCell(logTotalRow, 7).numFmt = PCT;
    r += 2;

    // --- Payment breakdown (app: IVA / anticipo / saldo) ---
    label(ws.getCell(r, 1), t.payTitle, { bold: true, size: 10 });
    fill(ws.getCell(r, 1), SECTION_FILL);
    ws.mergeCells(r, 1, r, 6);
    r++;

    // VAT % in E, amount in F
    label(ws.getCell(r, 1), t.conIva, { bold: true });
    pct(ws.getCell(r, 5), 0.19);
    fill(ws.getCell(r, 5), YELLOW);
    ws.getCell(r, 5).note = lang === "en" ? "INPUT: VAT %" : "ENTRADA: % IVA";
    ws.getCell(r, 6).value = { formula: `F${grandTopRow}*(1+E${r})` };
    ws.getCell(r, 6).numFmt = MONEY;
    const conIvaRow = r;
    for (let c = 1; c <= 6; c++) borderAll(ws.getCell(r, c));
    r++;

    label(ws.getCell(r, 1), t.anticipo, { bold: true });
    pct(ws.getCell(r, 5), 0.5);
    fill(ws.getCell(r, 5), YELLOW);
    ws.getCell(r, 5).note = lang === "en" ? "INPUT: advance %" : "ENTRADA: % anticipo";
    ws.getCell(r, 6).value = { formula: `F${conIvaRow}*E${r}` };
    ws.getCell(r, 6).numFmt = MONEY;
    const antRow = r;
    for (let c = 1; c <= 6; c++) borderAll(ws.getCell(r, c));
    r++;

    label(ws.getCell(r, 1), t.saldo, { bold: true });
    ws.getCell(r, 6).value = { formula: `F${conIvaRow}-F${antRow}` };
    ws.getCell(r, 6).numFmt = MONEY;
    for (let c = 1; c <= 6; c++) borderAll(ws.getCell(r, c));
    r += 2;

    // Optional legacy commercial terms (30/60)
    label(ws.getCell(r, 1), t.payOptTitle, { bold: true, size: 9, italic: true, color: { argb: "FF666666" } });
    r++;
    label(ws.getCell(r, 1), t.payCash, { size: 9 });
    pct(ws.getCell(r, 5), 0);
    ws.getCell(r, 6).value = { formula: `F${grandTopRow}*(1+E${r})` };
    ws.getCell(r, 6).numFmt = MONEY;
    r++;
    label(ws.getCell(r, 1), t.pay30, { size: 9 });
    pct(ws.getCell(r, 5), 0.03);
    ws.getCell(r, 6).value = { formula: `F${grandTopRow}*(1+E${r})` };
    ws.getCell(r, 6).numFmt = MONEY;
    r++;
    label(ws.getCell(r, 1), t.pay60, { size: 9 });
    pct(ws.getCell(r, 5), 0.06);
    ws.getCell(r, 6).value = { formula: `F${grandTopRow}*(1+E${r})` };
    ws.getCell(r, 6).numFmt = MONEY;
    r += 2;

    // --- Summary block (presentation) ---
    label(ws.getCell(r, 1), t.summaryTitle, { bold: true, size: 11 });
    fill(ws.getCell(r, 1), SECTION_FILL);
    ws.mergeCells(r, 1, r, 7);
    r++;

    [t.img, t.code, t.desc, t.qty, t.unit, t.ext, t.pror].forEach((h, i) => {
        const c = ws.getCell(r, i + 1);
        label(c, h, { bold: true, size: 9 });
        fill(c, HEADER_FILL);
        borderAll(c);
    });
    r++;

    const sumItemStart = r;
    // Presentation: products absorb hidden logistics; visible logistics % of GT in yellow
    // Sample: GT=200, visible log share 20% → products show 160
    sampleItems.forEach((it, idx) => {
        label(ws.getCell(r, 1), idx === 0 ? "(image)" : "", { size: 9, italic: true, color: { argb: "FF888888" } });
        label(ws.getCell(r, 2), it.code);
        label(ws.getCell(r, 3), it.desc);
        ws.getCell(r, 4).value = it.qty;
        // Unit will be derived after we know best-ship row; placeholder formulas use GT and log %
        money(ws.getCell(r, 5), idx === 0 ? 160 : 0);
        ws.getCell(r, 6).value = { formula: `E${r}*D${r}` };
        ws.getCell(r, 6).numFmt = MONEY;
        for (let c = 1; c <= 7; c++) borderAll(ws.getCell(r, c));
        r++;
    });
    const sumItemEnd = r - 1;

    // BEST SHIPPING line — G = % of grand total (decision)
    label(ws.getCell(r, 1), t.bestShip, { bold: true });
    ws.getCell(r, 4).value = 1;
    // E = GT * G% ; we'll set G yellow first then formula
    pct(ws.getCell(r, 7), 0.2);
    fill(ws.getCell(r, 7), YELLOW);
    ws.getCell(r, 7).note = lang === "en"
        ? "INPUT: what % of GRAND TOTAL the logistics line represents (visible share). Rest stays in product lines above."
        : "ENTRADA: qué % del GRAN TOTAL representa la línea logística (parte visible). El resto queda en las líneas de producto.";
    // Unit price of logistics line = grandTop * G%
    ws.getCell(r, 5).value = { formula: `F$${grandTopRow}*G${r}` };
    ws.getCell(r, 5).numFmt = MONEY;
    ws.getCell(r, 6).value = { formula: `E${r}*D${r}` };
    ws.getCell(r, 6).numFmt = MONEY;
    for (let c = 1; c <= 7; c++) borderAll(ws.getCell(r, c));
    const bestRow = r;
    r++;

    // Adjust sample product unit so products + best = GT: first item unit = (GT - best) when qty=1
    // Use formula on first summary item: (GT - logistics line) / qty
    ws.getCell(sumItemStart, 5).value = {
        formula: `IF(D${sumItemStart}=0,0,(F$${grandTopRow}-F$${bestRow})/D${sumItemStart})`
    };
    ws.getCell(sumItemStart, 5).numFmt = MONEY;

    label(ws.getCell(r, 1), t.grandBottom, { bold: true, size: 11 });
    fill(ws.getCell(r, 1), TOTAL_FILL);
    ws.getCell(r, 6).value = { formula: `SUM(F${sumItemStart}:F${bestRow})` };
    ws.getCell(r, 6).numFmt = MONEY;
    bold(ws.getCell(r, 6));
    fill(ws.getCell(r, 6), TOTAL_FILL);
    ws.getCell(r, 7).value = 1;
    ws.getCell(r, 7).numFmt = PCT;
    const grandBottomRow = r;

    // Prorating on summary items vs bottom GT
    for (let i = sumItemStart; i <= bestRow; i++) {
        ws.getCell(i, 7).value = i === bestRow
            ? ws.getCell(i, 7).value // keep yellow input
            : { formula: `IF($F$${grandBottomRow}=0,0,F${i}/$F$${grandBottomRow})` };
        if (i !== bestRow) ws.getCell(i, 7).numFmt = PCT;
    }
    // Re-apply yellow on best G after loop
    pct(ws.getCell(bestRow, 7), 0.2);
    fill(ws.getCell(bestRow, 7), YELLOW);

    r += 2;
    label(ws.getCell(r, 1), t.note, { size: 8, italic: true, color: { argb: "FF666666" } });
    ws.mergeCells(r, 1, r, 7);
    r += 2;

    // Legend for reviewers
    label(ws.getCell(r, 1), lang === "en" ? "REVIEW LEGEND" : "LEYENDA DE REVISIÓN", { bold: true, size: 10 });
    r++;
    fill(ws.getCell(r, 1), YELLOW);
    label(ws.getCell(r, 2), lang === "en"
        ? "Yellow = inputs (commission %, VAT %, advance %, logistics % of GT)"
        : "Amarillo = entradas (% comisión, % IVA, % anticipo, % logística del GT)");
    r++;
    label(ws.getCell(r, 1), lang === "en"
        ? "Anchors: each logistics label has a comment anchor:<tipo> for the app mapper."
        : "Anclas: cada etiqueta logística tiene comentario anchor:<tipo> para el mapeo de la app.");
    r++;
    label(ws.getCell(r, 1), lang === "en"
        ? `Item model rows: ${itemStart}–${itemEnd} (top) and ${sumItemStart}–${sumItemEnd} (summary). App clones these when more lines are needed.`
        : `Filas modelo de ítem: ${itemStart}–${itemEnd} (arriba) y ${sumItemStart}–${sumItemEnd} (resumen). La app las clona si hacen falta más líneas.`);
    r++;
    label(ws.getCell(r, 1), lang === "en"
        ? "EXP / NAL and other cost sheets were copied unchanged from the source template."
        : "EXP / NAL y demás hojas de costos se copiaron sin cambios desde la plantilla fuente.");

    // Freeze header
    ws.views = [{ state: "frozen", ySplit: 2, showGridLines: false }];

    return {
        name,
        itemStart,
        itemEnd,
        logStart,
        logEnd,
        grandTopRow,
        conIvaRow,
        antRow,
        bestRow,
        grandBottomRow
    };
}

async function copySheet(srcWb, destWb, sheetName) {
    const src = srcWb.getWorksheet(sheetName);
    if (!src) return;
    // ExcelJS: clone via model is fragile; re-read buffer approach:
    // Use worksheet model copy
    const model = JSON.parse(JSON.stringify(src.model));
    model.name = sheetName;
    // Ensure unique id
    delete model.id;
    destWb.addWorksheet(sheetName);
    const dest = destWb.getWorksheet(sheetName);
    dest.model = Object.assign(dest.model, model, { id: dest.id, name: sheetName });
}

async function main() {
    const srcPath = SRC_CANDIDATES.find((p) => fs.existsSync(p));
    if (!srcPath) throw new Error("No se encontró la plantilla fuente.");

    const srcWb = new ExcelJS.Workbook();
    await srcWb.xlsx.readFile(srcPath);

    // Build destination: start from a full copy of source, then replace QUOT01/COT01
    const outWb = new ExcelJS.Workbook();
    await outWb.xlsx.readFile(srcPath);

    const metaQuot = buildUniversalSheet(outWb, "en");
    const metaCot = buildUniversalSheet(outWb, "es");

    // Ensure QUOT01 / COT01 near front (after Shipping Details if present)
    // ExcelJS order: move by splicing _worksheets is unsupported; leave natural order.

    // README sheet
    const readmeName = "README revisión";
    const oldReadme = outWb.getWorksheet(readmeName);
    if (oldReadme) outWb.removeWorksheet(oldReadme.id);
    const readme = outWb.addWorksheet(readmeName);
    const lines = [
        ["SmartBudget — plantilla cotización UNIVERSAL (revisión)"],
        [""],
        ["Fuente", path.basename(srcPath)],
        ["Fecha", new Date().toISOString().slice(0, 10)],
        [""],
        ["Qué cambió"],
        ["· QUOT01 A-V1 y COT01 A-V1 se reconstruyeron como masters universales (nacional + exportación)."],
        ["· Misma estructura EN/ES; solo cambian los textos de encabezado."],
        ["· Bloque logístico previsto: envío/montaje/bodega/otro + origen/fletes/seguro/destino/duties/taxes/courier/extra."],
        ["· Pagos de cotización: VALOR CON IVA, VALOR ANTICIPO, VALOR SALDO (celdas amarillas = % IVA y % anticipo)."],
        ["· Resumen inferior: línea logística = % del GRAN TOTAL (celda amarilla). El resto se refleja en productos."],
        ["· Filas de ítem modelo arriba y abajo: la app podrá insertar más clonando esas filas."],
        [""],
        ["Qué NO se tocó"],
        ["· EXP / NAL y el resto de hojas de costos / materiales / ADMIN."],
        ["· QUOT02 / COT02 quedan como referencia del formato anterior (no usar para export automático)."],
        [""],
        ["Celdas de decisión (amarillas)"],
        ["· I2 — % comisión comercial"],
        ["· E (fila CON IVA) — % IVA"],
        ["· E (fila ANTICIPO) — % anticipo"],
        ["· G (BEST SHIPPING / MEJOR COSTO) — % logística del gran total"],
        [""],
        ["Mapa QUOT01", JSON.stringify(metaQuot)],
        ["Mapa COT01", JSON.stringify(metaCot)],
        [""],
        ["Siguiente paso"],
        ["Revisar visualmente QUOT01 y COT01. Si el layout te convence, se publica en Drive (Ajustes → Analizar y publicar) y se cablea el botón Excel en Logística."]
    ];
    lines.forEach((row, i) => {
        row.forEach((v, j) => {
            readme.getCell(i + 1, j + 1).value = v;
            if (i === 0) bold(readme.getCell(i + 1, j + 1));
        });
    });
    readme.getColumn(1).width = 100;
    readme.getColumn(2).width = 60;

    await outWb.xlsx.writeFile(OUT);
    console.log("OK →", OUT);
    console.log("QUOT01", metaQuot);
    console.log("COT01", metaCot);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
