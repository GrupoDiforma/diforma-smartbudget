/**
 * Documenta en COT01/QUOT01 las zonas que la app rellena al exportar Logística → Excel:
 *  - Observaciones del proyecto (antes de TOTAL PRODUCTOS / EXWORKS)
 *  - Servicios (entre EXWORKS y costos logísticos)
 *  - Observaciones (final) tras el GRAN TOTAL inferior
 *
 * No altera filas 1–35 del layout fijo (validación Ajustes).
 *
 * Uso: node plantillas/_patch-cot-zonas-app.js
 */
const path = require("path");
const ExcelJS = require("exceljs");

const ROOT = path.join(__dirname);
const FILES = [
    path.join(ROOT, "presupuesto-cotizacion-universal-REVISION.xlsx"),
    path.join(ROOT, "presupuesto-diforma.xlsx")
];

const GUIDE = {
    es: {
        sheets: [/^COT01\b/i],
        title: "GUÍA — Zonas que rellena SmartBudget (Logística → Excel)",
        lines: [
            "1) Ítems del proyecto: filas 3–5 (la app inserta más si hace falta).",
            "2) Observaciones del proyecto: la app inserta filas de texto justo ANTES de TOTAL PRODUCTOS / EXWORKS.",
            "3) TOTAL PRODUCTOS / EXWORKS: fila 6 (precio total productos).",
            "4) Servicios (instalación, etc.): la app inserta filas ENTRE EXWORKS y COSTOS EN ORIGEN (solo si hay monto).",
            "5) Costos logísticos de envío: filas 7–18 → TOTAL COSTO LOGÍSTICO → GRAN TOTAL.",
            "6) Observaciones (final): la app las escribe DESPUÉS del GRAN TOTAL del resumen (y del desglose IVA/anticipo).",
            "No dejes filas vacías fijas para servicios/obs: la plantilla base permanece compacta; la app abre huecos al exportar."
        ]
    },
    en: {
        sheets: [/^QUOT01\b/i],
        title: "GUIDE — Zones filled by SmartBudget (Logistics → Excel)",
        lines: [
            "1) Project items: rows 3–5 (app inserts more when needed).",
            "2) Project observations: app inserts text rows just BEFORE TOTAL PRODUCTS / EXWORKS.",
            "3) TOTAL PRODUCTS / EXWORKS: row 6.",
            "4) Services (installation, etc.): app inserts rows BETWEEN EXWORKS and COSTS AT ORIGIN (only when amount > 0).",
            "5) Shipping logistics: rows 7–18 → TOTAL LOGISTICS → GRAND TOTAL.",
            "6) Closing notes (obsFinal): written AFTER the summary GRAND TOTAL (and VAT/advance block).",
            "Do not leave blank fixed rows for services/notes: the base template stays compact; the app opens gaps on export."
        ]
    }
};

function matchLang(name) {
    if (GUIDE.es.sheets.some((re) => re.test(name))) return GUIDE.es;
    if (GUIDE.en.sheets.some((re) => re.test(name))) return GUIDE.en;
    return null;
}

async function patchFile(filePath) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    let touched = 0;
    wb.worksheets.forEach((ws) => {
        const g = matchLang(ws.name || "");
        if (!g) return;
        touched++;

        /* Notas en celdas clave (visibles al pasar el mouse). */
        try {
            const a6 = ws.getCell(6, 1);
            a6.note = g === GUIDE.es
                ? "App: debajo pueden insertarse SERVICIOS antes de la logística. Arriba, OBSERVACIONES del proyecto."
                : "App: SERVICES may be inserted below before logistics. Above: project OBSERVATIONS.";
        } catch (e) {}
        try {
            const a7 = ws.getCell(7, 1);
            a7.note = g === GUIDE.es
                ? "Primera fila de costos logísticos. Los servicios van en filas nuevas justo encima de esta."
                : "First logistics cost row. Services are inserted on new rows just above this.";
        } catch (e2) {}
        try {
            const a32 = ws.getCell(32, 1);
            a32.note = g === GUIDE.es
                ? "GRAN TOTAL del resumen. Debajo (tras IVA/anticipo) la app escribe Observaciones (final)."
                : "Summary GRAND TOTAL. Below (after VAT/advance) the app writes closing notes.";
        } catch (e3) {}

        /* Bloque guía al pie (no mueve el layout validado). */
        let start = Math.max(Number(ws.rowCount) || 40, 40) + 2;
        /* Si ya hay una guía previa, reescribir desde ahí. */
        for (let r = 36; r <= Math.min(ws.rowCount || 80, 80); r++) {
            const t = String(ws.getCell(r, 1).value || "");
            if (/GU[IÍ]A|GUIDE — Zones/i.test(t)) {
                start = r;
                break;
            }
        }
        ws.getCell(start, 1).value = g.title;
        ws.getCell(start, 1).font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF1A5276" } };
        try { ws.mergeCells(start, 1, start, 6); } catch (eM) {}
        g.lines.forEach((line, i) => {
            const r = start + 1 + i;
            ws.getCell(r, 1).value = line;
            ws.getCell(r, 1).font = { size: 8, name: "Calibri", italic: true, color: { argb: "FF555555" } };
            try { ws.mergeCells(r, 1, r, 6); } catch (eM2) {}
        });
    });
    if (!touched) throw new Error("No se encontraron COT01/QUOT01 en " + path.basename(filePath));
    await wb.xlsx.writeFile(filePath);
    return touched;
}

(async () => {
    for (const f of FILES) {
        try {
            const n = await patchFile(f);
            console.log("OK", path.basename(f), "hojas", n);
        } catch (e) {
            console.error("FAIL", path.basename(f), e.message || e);
            process.exitCode = 1;
        }
    }
})();
