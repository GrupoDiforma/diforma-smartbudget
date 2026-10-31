/**
 * Genera plantillas/Impuestos-y-aranceles-listado.xlsx
 * Formato compatible con Ajustes → Sincronizar Drive y con Descargar/Cargar Excel.
 *
 * Uso: node plantillas/_build-aranceles-listado.js
 */
const path = require("path");
const ExcelJS = require("exceljs");

const OUT = path.join(__dirname, "Impuestos-y-aranceles-listado.xlsx");

/** Bases canónicas: EXW | CIF | CIF+DUTY */
const HEADERS = [
    "pais",
    "partida",
    "descripcion",
    "duties",
    "base duty",
    "taxes",
    "base tax",
    "nota",
    "revisar"
];

/**
 * Semilla alineada con lo implementado:
 * PR/USA → Duties y Taxes sobre EXW.
 * Otras filas de ejemplo muestran CIF y CIF+DUTY para documentar el catálogo.
 */
const ROWS = [
    ["Puerto Rico", "3926.90.90.90", "Displays plásticos", 17.8, "EXW", 11.5, "EXW", "Suma de 5.3%+12.5% (ejemplo). Ajustar según partida real.", "N"],
    ["Puerto Rico", "4911.10.00.00", "Impresos publicitarios", 0, "EXW", 11.5, "EXW", "IVU lo paga el importador (en DDP la cotización sí cobra Taxes).", "N"],
    ["Puerto Rico", "9403.20.00.00", "Exhibidores metálicos", 25, "EXW", 11.5, "EXW", "IVU lo paga el importador (en DDP la cotización sí cobra Taxes).", "N"],
    ["Puerto Rico", "9403.60.00.00", "Exhibidores madera", 0, "EXW", 11.5, "EXW", "IVU lo paga el importador (en DDP la cotización sí cobra Taxes).", "N"],
    ["Puerto Rico", "9403.70.00.00", "Exhibidores plástico", 12.5, "EXW", 11.5, "EXW", "IVU lo paga el importador (en DDP la cotización sí cobra Taxes).", "N"],
    ["Estados Unidos", "9403.20.00.00", "Exhibidores metálicos", 0, "EXW", 0, "EXW", "USA: bases EXW. Completar % según HTS real.", "S"],
    ["México", "9403.20.00.00", "Exhibidores metálicos", 15, "CIF", 16, "CIF+DUTY", "Ejemplo: Duties sobre CIF; Taxes (IVA) sobre CIF+Duties.", "N"],
    ["Colombia", "9403.20.00.00", "Exhibidores metálicos", 15, "CIF", 19, "CIF+DUTY", "Ejemplo ilustrativo. Revisar arancel vigente.", "S"],
    ["España", "9403.20.00.00", "Exhibidores metálicos", 0, "EXW", 21, "CIF+DUTY", "Ejemplo UE. Completar según TARIC.", "S"]
];

async function main() {
    const wb = new ExcelJS.Workbook();
    wb.creator = "SmartBudget";
    wb.created = new Date();
    const ws = wb.addWorksheet("Aranceles", {
        views: [{ state: "frozen", ySplit: 1 }]
    });
    ws.addRow(HEADERS);
    const head = ws.getRow(1);
    head.font = { bold: true };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF5" } };
    ROWS.forEach(function (r) { ws.addRow(r); });
    ws.getColumn(1).width = 16;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 12;
    ws.getColumn(6).width = 10;
    ws.getColumn(7).width = 12;
    ws.getColumn(8).width = 55;
    ws.getColumn(9).width = 10;

    const leyenda = wb.addWorksheet("Leyenda");
    leyenda.addRows([
        ["Campo", "Valores / significado"],
        ["pais", "Nombre del país de destino (como en Odoo / cotización)."],
        ["partida", "Código 0000.00.00.00 (10 dígitos)."],
        ["descripcion", "Texto libre (opcional)."],
        ["duties", "Porcentaje Duties (número, sin %)."],
        ["base duty", "EXW | CIF | CIF+DUTY"],
        ["taxes", "Porcentaje Taxes (número, sin %)."],
        ["base tax", "EXW | CIF | CIF+DUTY  (independiente de Duties)"],
        ["nota", "Observación. Si dice que lo paga el importador, en EXW/FOB no se suma; en DDP/DAP/DPU sí se cobra."],
        ["revisar", "S = marcar para revisar; N = ok."],
        ["", ""],
        ["EXW", "Valor mercancía (en cotización × % Base EXW)."],
        ["CIF", "EXW + costos en origen + flete + seguro."],
        ["CIF+DUTY", "CIF + Duties (CIF + gravamen)."],
        ["", ""],
        ["Cómo usar", "1) Edita esta hoja. 2) Ajustes → Aranceles → Cargar Excel (o súbela a Drive y Sincronizar). 3) Guardar Ajustes."]
    ]);
    leyenda.getColumn(1).width = 14;
    leyenda.getColumn(2).width = 90;
    leyenda.getRow(1).font = { bold: true };

    await wb.xlsx.writeFile(OUT);
    console.log("OK:", OUT);
}

main().catch(function (e) {
    console.error(e);
    process.exit(1);
});
