let itemsPresupuesto = [];
let lotesSimulacion = [ { id: 'l1', q: 1, econPct: 0 } ];
let overridesTarjetas = {};
let trmActualGlobal = 4150;
const CATEGORIAS = ["Materias Primas", "Procesos Externos", "Procesos Internos", "Mano de Obra", "Empaque y Fletes", "Comercialización"];

/** % de economía de escala de un lote (0–100). Por defecto 0. */
function loteEconPct_(lt) {
    const n = Number(lt && lt.econPct);
    if (!isFinite(n) || n <= 0) return 0;
    return Math.min(100, n);
}

/** Factor sobre el costo unitario: 1 = sin descuento, 0.9 = −10%. */
function loteEconFactor_(lt) {
    return 1 - loteEconPct_(lt) / 100;
}

function costoBaseItemLote_(item, ltId) {
    if (item && item.costos && item.costos[ltId] !== undefined && item.costos[ltId] !== "") {
        return Number(item.costos[ltId]) || 0;
    }
    return Number(item && item.costoUnitario) || 0;
}

/** Costo unitario ya con economía de escala de la columna Q. */
function costoEfectivoItemLote_(item, lt) {
    return costoBaseItemLote_(item, lt && lt.id) * loteEconFactor_(lt);
}

async function obtenerTRMOficial() {
    try {
        const res = await fetch("https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1");
        if (res.ok) {
            const data = await res.json();
            if (data && data[0] && data[0].valor) trmActualGlobal = parseFloat(data[0].valor);
        }
    } catch (e) { console.warn("TRM base utilizada."); }
    const inputTRM = document.getElementById('simTRM');
    if (inputTRM) inputTRM.value = trmActualGlobal;
}

function interp(monto, min, max, pMax, pMin) { 
    if (monto <= min) return pMax; 
    if (monto >= max) return pMin; 
    return pMax - ((monto - min) / (max - min)) * (pMax - pMin); 
}

function interpTope(monto, tope, pMax, pMin) {
    tope = Number(tope);
    if (!(tope > 0)) return Number(pMax) || 0;
    return interp(Number(monto) || 0, 0, tope, Number(pMax) || 0, Number(pMin) || 0);
}

function copFmt(n) {
    return "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");
}

function mercadoEsExportacion() {
    const t = typeof mercadoActual === "function" ? mercadoActual() : "NACIONAL";
    return String(t).toUpperCase().indexOf("EXPORT") !== -1;
}

function tablasUtilidadAIU() {
    return tablasUtilidadAIUPara_(mercadoEsExportacion());
}

function tablasUtilidadAIUPara_(exp) {
    const ut = exp
        ? (CONFIG_GLOBAL.utilidadExp || CONFIG_GLOBAL.utilidadNal)
        : (CONFIG_GLOBAL.utilidadNal || CONFIG_GLOBAL.utilidadExp);
    return { ut: ut || { fab: { tope: 0, max: 0, min: 0 }, com: { tope: 0, max: 0, min: 0 } }, exp: exp };
}

function guardarOverride(tId, campo, valor) { 
    if(!overridesTarjetas[tId]) overridesTarjetas[tId] = {}; 
    overridesTarjetas[tId][campo] = parseFloat(valor) || 0; 
    actualizarSimuladorFinanciero(); 
}

function filaAiu(label, pct, cop, inputHtml, extraClass) {
    return `<div class="aiu-row ${extraClass || ""}">
      <span class="aiu-lab">${label}${inputHtml || ""}</span>
      <span class="aiu-cop">${copFmt(cop)}</span>
    </div>`;
}

/**
 * Motor AIU puro (sin DOM): precio de venta unitario y total de UN lote (escala).
 * Lo usan el simulador y la cotización, así los números siempre coinciden.
 * ctx = { op, ut, pctCom, feeExtra, overrides }
 */
function itemEstaCandado(it) {
    return !!(it && (it.candado === true || it.candado === "S" || it.candado === 1));
}

function calcularPrecioLote_(items, lt, ctx, opts) {
    const op = ctx.op || {};
    const ut = ctx.ut || {};
    const pctCom = Number(ctx.pctCom) || 0;
    const feeExtra = Number(ctx.feeExtra) || 0;
    const incluirCandado = !!(opts && opts.incluirCandado);
    let uFab = 0, uCom = 0, nCandado = 0;
    (items || []).forEach(i => {
        if (itemEstaCandado(i)) nCandado++;
        if (!incluirCandado && itemEstaCandado(i)) return;
        let c = costoEfectivoItemLote_(i, lt);
        let s = (Number(i.cantidad) || 1) * (Number(c) || 0);
        i.categoria === "Comercialización" ? uCom += s : uFab += s;
    });

    const totalFabLote = uFab * lt.q;
    const totalComLote = uCom * lt.q;
    const o = ctx.overrides || {};

    let pImpF = o.impFab !== undefined ? o.impFab : interpTope(totalFabLote, op.topeFab, op.impFab?.max, op.impFab?.min);
    let pIndF = o.indFab !== undefined ? o.indFab : interpTope(totalFabLote, op.topeFab, op.indFab?.max, op.indFab?.min);
    let pIndC = o.indCom !== undefined ? o.indCom : interpTope(totalComLote, op.topeCom, op.indCom?.max, op.indCom?.min);
    let pUtF = o.uFab !== undefined ? o.uFab : interpTope(totalFabLote, ut.fab?.tope, ut.fab?.max, ut.fab?.min);
    let pUtC = o.uCom !== undefined ? o.uCom : interpTope(totalComLote, ut.com?.tope, ut.com?.max, ut.com?.min);

    const vImpF = uFab * pImpF / 100;
    const vIndF = uFab * pIndF / 100;
    const subFab = uFab + vImpF + vIndF;
    let pVtaF = (pUtF < 100) ? (subFab / (1 - pUtF / 100)) : (subFab * 1.5);

    let vIndC = 0, subCom = 0, pVtaC = 0;
    if (uCom > 0) {
        vIndC = uCom * pIndC / 100;
        subCom = uCom + vIndC;
        pVtaC = (pUtC < 100) ? (subCom / (1 - pUtC / 100)) : (subCom * 1.5);
    } else {
        pIndC = 0;
        pUtC = 0;
    }

    let pFinUnitario = pVtaF + pVtaC;
    pFinUnitario += (pFinUnitario * pctCom / 100) + (pFinUnitario * feeExtra / 100);
    const pTotalGlobal = pFinUnitario * lt.q;
    return { uFab, uCom, totalFabLote, totalComLote, pImpF, pIndF, pIndC, pUtF, pUtC, vImpF, vIndF, subFab, pVtaF, vIndC, subCom, pVtaC, pFinUnitario, pTotalGlobal, nCandado };
}

/**
 * Precios de venta (COP) de todas las escalas de una versión guardada.
 * Devuelve { exportacion, trm, escalas: [{ id, q, puCop, totalCop }] }.
 * Los overrides manuales de las tarjetas solo aplican a la versión abierta.
 */
function calcularPreciosVersion_(ver) {
    if (!ver || typeof CONFIG_GLOBAL === "undefined" || !CONFIG_GLOBAL) return null;
    const exp = String(ver.tipoPresupuesto || "").toUpperCase().indexOf("EXPORT") !== -1;
    const ut = tablasUtilidadAIUPara_(exp).ut;
    const activa = String(ver.id) === String(window.versionActivaId);
    const items = activa ? itemsPresupuesto : (ver.matrizItems || []);
    const lotes = activa ? lotesSimulacion : ((ver.escalas && ver.escalas.length) ? ver.escalas : [{ id: "l1", q: 1 }]);
    const trm = parseFloat(document.getElementById('simTRM')?.value) || trmActualGlobal;
    const ctx = {
        op: CONFIG_GLOBAL.operativos || {},
        ut: ut,
        pctCom: parseFloat(document.getElementById('simComision')?.value) || 0,
        feeExtra: parseFloat(document.getElementById('simFee')?.value) || 0
    };
    return {
        exportacion: exp,
        trm: trm,
        escalas: (items && items.length) ? lotes.map(lt => {
            const r = calcularPrecioLote_(items, lt, Object.assign({ overrides: activa ? overridesTarjetas[lt.id] : null }, ctx));
            return { id: lt.id, q: Number(lt.q) || 1, puCop: r.pFinUnitario, totalCop: r.pTotalGlobal };
        }) : []
    };
}

function actualizarSimuladorFinanciero() {
    const panel = document.getElementById('panelFinanciero');
    if (!panel) return;
    /* La matriz se restaura antes de que llegue CONFIG; no borrar la ficha con el mensaje equivocado. */
    if (!CONFIG_GLOBAL) {
        if (!itemsPresupuesto.length) {
            panel.innerHTML = '<div class="col-12 text-center text-muted py-4 border rounded bg-white" style="font-size:0.85rem;">Agrega materiales a la matriz.</div>';
        } else if (!panel.dataset.aiuEsperaCfg) {
            panel.dataset.aiuEsperaCfg = "1";
            panel.innerHTML = '<div class="col-12 text-center text-muted py-4 border rounded bg-white" style="font-size:0.85rem;">Cargando parámetros AIU…</div>';
        }
        return;
    }
    delete panel.dataset.aiuEsperaCfg;
    if (itemsPresupuesto.length === 0) {
        panel.innerHTML = '<div class="col-12 text-center text-muted py-4 border rounded bg-white" style="font-size:0.85rem;">Agrega materiales a la matriz.</div>';
        return;
    }

    const trm = parseFloat(document.getElementById('simTRM')?.value) || trmActualGlobal;
    const feeExtra = parseFloat(document.getElementById('simFee')?.value) || 0;
    const pctCom = parseFloat(document.getElementById('simComision')?.value) || 0;
    const op = CONFIG_GLOBAL.operativos || {};
    const { ut, exp } = tablasUtilidadAIU();
    const merLabel = exp ? "Exportación" : "Nacional";
    const merCls = exp ? "aiu-mer-exp" : "aiu-mer-nal";

    let htmlCartas = "";
    lotesSimulacion.forEach(lt => {
        const r = calcularPrecioLote_(itemsPresupuesto, lt, { op: op, ut: ut, pctCom: pctCom, feeExtra: feeExtra, overrides: overridesTarjetas[lt.id] });
        const { uFab, uCom, totalFabLote, totalComLote, pImpF, pIndF, pIndC, pUtF, pUtC, vImpF, vIndF, subFab, pVtaF, vIndC, subCom, pVtaC, pFinUnitario, pTotalGlobal, nCandado } = r;
        const rEst = nCandado ? calcularPrecioLote_(itemsPresupuesto, lt, { op: op, ut: ut, pctCom: pctCom, feeExtra: feeExtra }, { incluirCandado: true }) : null;

        const inp = (campo, val) => `<input type="number" step="0.01" class="inline-override" value="${Number(val).toFixed(2)}" onchange="guardarOverride('${lt.id}','${campo}',this.value)">`;
        const avisoEstudio = rEst ? `<div class="aiu-estudio">Estudio (no entra al precio): ${copFmt(rEst.subFab)} · ${nCandado} línea(s) candada(s)</div>` : "";

        htmlCartas += `
          <div class="col-md-6 col-lg-4">
            <div class="card card-escala h-100">
              <div class="card-header aiu-head">
                <span>Lote ${lt.q} unds</span>
                <span class="aiu-mer ${merCls}">${merLabel}</span>
              </div>
              <div class="card-body p-2" style="font-size:0.78rem;">
                ${avisoEstudio}
                <div class="bg-fab p-2 rounded mb-2">
                  <div class="aiu-title">FABRICACIÓN</div>
                  <div class="aiu-hint">Tope sobre costo total de manufactura (materiales y procesos) del lote: ${copFmt(totalFabLote)}</div>
                  ${filaAiu("Costo directo", null, uFab, "", "aiu-directo")}
                  ${filaAiu("+ Imprevistos", pImpF, vImpF, inp("impFab", pImpF) + "<small>%</small>")}
                  ${filaAiu("+ Costos indirectos", pIndF, vIndF, inp("indFab", pIndF) + "<small>%</small>")}
                  ${filaAiu("Subtotal costo", null, subFab, "", "aiu-sub")}
                  ${filaAiu("Margen real", pUtF, pVtaF, inp("uFab", pUtF) + "<small>%</small>", "aiu-margen")}
                </div>
                <div class="bg-com p-2 rounded mb-2">
                  <div class="aiu-title">COMERCIALIZACIÓN</div>
                  <div class="aiu-hint">Tope sobre la suma de ítems de Comercialización del lote: ${copFmt(totalComLote)}</div>
                  ${filaAiu("Costo directo", null, uCom)}
                  ${filaAiu("+ Costos indirectos", pIndC, vIndC, uCom > 0 ? inp("indCom", pIndC) + "<small>%</small>" : "")}
                  ${filaAiu("Subtotal costo", null, subCom, "", "aiu-sub")}
                  ${filaAiu("Margen real", pUtC, pVtaC, uCom > 0 ? inp("uCom", pUtC) + "<small>%</small>" : "", "aiu-margen")}
                </div>
                <div class="aiu-total p-2 rounded">
                  <span class="aiu-total-lab">Precio venta unitario</span>
                  <div class="aiu-total-val">${copFmt(pFinUnitario)} COP</div>
                  <div class="aiu-usd">US$ ${(pFinUnitario / trm).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div class="aiu-total-neg border-top pt-2 mt-2">
                    <span class="aiu-total-lab">Total negocio (${lt.q} unds)</span>
                    <div class="aiu-total-val">${copFmt(pTotalGlobal)} COP</div>
                    <div class="aiu-usd">US$ ${(pTotalGlobal / trm).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
    });
    panel.innerHTML = htmlCartas;
    pintarResumenStand_(trm);
    if (typeof logisticaTrasPresupuesto_ === "function") logisticaTrasPresupuesto_();
}

function pintarResumenStand_(trm) {
    const box = document.getElementById("resumenStand");
    if (!box) return;
    if (typeof esPresupuestoGrupal !== "function" || !esPresupuestoGrupal()) {
        box.classList.add("d-none");
        box.innerHTML = "";
        return;
    }
    if (typeof snapshotVersionActual === "function") snapshotVersionActual();
    const ver = (window.versionesPresupuesto || []).find(function (v) { return v.id === window.versionActivaId; });
    const elems = (ver && ver.elementos) || [];
    if (elems.length < 2) {
        box.classList.add("d-none");
        box.innerHTML = "";
        return;
    }
    const filas = elems.map(function (el) {
        const copia = Object.assign({}, ver, {
            id: String(ver.id) + "::" + el.id,
            matrizItems: el.matrizItems || [],
            escalas: el.escalas && el.escalas.length ? el.escalas : ver.escalas
        });
        const pr = calcularPreciosVersion_(copia);
        const puPorQ = {};
        ((pr && pr.escalas) || []).forEach(function (esc) { puPorQ[Number(esc.q) || 1] = Number(esc.puCop) || 0; });
        const cant = Number(el.cantidad);
        return {
            id: el.id,
            nombre: el.nombre || "Pieza",
            cantidad: isFinite(cant) && cant >= 0 ? cant : 1,
            puPorQ: puPorQ
        };
    });
    /* Rangos: unión de todos los Q que existen en el presupuesto, de menor a mayor. */
    const qs = [];
    filas.forEach(function (f) {
        Object.keys(f.puPorQ).forEach(function (q) { if (qs.indexOf(Number(q)) < 0) qs.push(Number(q)); });
    });
    qs.sort(function (a, b) { return a - b; });
    if (!qs.length) {
        box.classList.add("d-none");
        box.innerHTML = "";
        return;
    }
    const usdFmt = function (cop) {
        return "US$ " + (trm ? (cop / trm) : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const totales = {};
    qs.forEach(function (q) {
        totales[q] = filas.reduce(function (s, f) {
            return s + (f.puPorQ[q] != null ? f.cantidad * f.puPorQ[q] : 0);
        }, 0);
    });
    box.classList.remove("d-none");
    box.className = "stand-resumen mt-3";
    box.innerHTML = "<div class=\"fw-semibold\">Total Grupal · simulación por rango</div>" +
        "<div class=\"stand-nota\">Cantidad de cada elemento en el conjunto (stand, exhibición…), por defecto 1. Cambiarla solo mueve esta simulación: no toca la matriz, el Excel ni la cotización. Si un elemento no tiene un rango, sale «—» y no suma en esa columna.</div>" +
        "<div class=\"table-responsive\"><table class=\"table table-sm mb-0 stand-tabla\"><thead><tr><th>Elemento</th><th class=\"text-center\">Cant.</th>" +
        qs.map(function (q) { return "<th class=\"text-end\">Rango Q " + q + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        filas.map(function (f) {
            const celdas = qs.map(function (q) {
                if (f.puPorQ[q] == null) return "<td class=\"text-end text-muted\" title=\"Este elemento no tiene este rango\">—</td>";
                return "<td class=\"text-end\">" + copFmt(f.cantidad * f.puPorQ[q]) +
                    "<div class=\"stand-pu\">" + f.cantidad + " × " + copFmt(f.puPorQ[q]) + "</div></td>";
            }).join("");
            return "<tr><td>" + String(f.nombre).replace(/</g, "&lt;") + "</td>" +
                "<td class=\"text-center\"><input type=\"number\" class=\"form-control form-control-sm text-center stand-cant\" min=\"0\" step=\"1\" value=\"" + f.cantidad + "\" title=\"Cantidad de este elemento en el conjunto\" onchange=\"actualizarCantidadElementoStand_('" + f.id + "',this.value)\"></td>" +
                celdas + "</tr>";
        }).join("") +
        "<tr class=\"stand-total\"><th>Total Grupal</th><th></th>" +
        qs.map(function (q) {
            return "<th class=\"text-end\">" + copFmt(totales[q]) + "<div class=\"stand-pu\">" + usdFmt(totales[q]) + "</div></th>";
        }).join("") +
        "</tr></tbody></table></div>";
}

/** Cantidad de un elemento en la simulación del Total Grupal. Vive en el elemento, así se guarda con la versión. */
function actualizarCantidadElementoStand_(elemId, val) {
    if (typeof snapshotVersionActual !== "function") return;
    const snap = snapshotVersionActual();
    const elems = (snap && snap.elementos) || [];
    const el = elems.find(function (e) { return String(e.id) === String(elemId); });
    if (!el) return;
    let n = parseFloat(String(val == null ? "" : val).replace(",", "."));
    if (!isFinite(n) || n < 0) n = 1;
    el.cantidad = Math.floor(n);
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
    if (typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
}

function inicializarDragAndDropMatrix() {
    const el = document.getElementById('tbodyItems');
    if (typeof Sortable !== 'undefined' && el) {
        new Sortable(el, { handle: '.drag-handle', animation: 150, onEnd: function(evt) {
            const item = itemsPresupuesto.splice(evt.oldIndex, 1)[0];
            itemsPresupuesto.splice(evt.newIndex, 0, item); renderizarTablaItems();
        }});
    }
}

var MTX_TOPE_ = {
    num: [36, 56], fuente: [88, 170], desc: [160, 640],
    cat: [108, 200], cant: [56, 88], um: [70, 120], glob: [100, 160],
    unit: [112, 220], tot: [116, 240]
};

function topeColMatriz_(id) {
    if (/^unit_/.test(id)) return MTX_TOPE_.unit;
    if (/^tot_/.test(id)) return MTX_TOPE_.tot;
    return MTX_TOPE_[id] || [36, 400];
}

function esProcesoPorPieza_(n) {
    n = String(n || "");
    if (/troquelado/i.test(n) && !/elaboraci[oó]n|litogr[aá]fico|dado|molde/i.test(n)) return true;
    return false;
}

/** Flag explícito false/N/0 desde JSON o UI (no pisar con heurística de nombre). */
function esGlobalExplicitoFalse_(v) {
    return v === false || v === "N" || v === "n" || v === 0 || v === "0" || v === "false" || v === "FALSE";
}

function esGlobalExplicitoTrue_(v) {
    return v === true || v === "S" || v === "s" || v === 1 || v === "1" || v === "true" || v === "TRUE";
}

/** Empaque / packaging en el nombre del ítem. */
function conceptoEsEmpaque_(n) {
    n = String(n || "");
    return /caja|m[aá]ster|master|corrugado|embalaje|packag|cart[oó]n\s*(doble|m[aá]ster)|huacal|estiba\s*de\s*env[ií]o/i.test(n);
}

/** La entrevista/nombre ya dice que el costo es por mueble/unidad/pieza. */
function nombreSugierePorPieza_(n) {
    n = String(n || "");
    if (/por\s*(mueble|unidad|pieza|producto|expositor|display)|1\s*(caja|und|unidad)\s*por\s*(mueble|unidad|pieza|producto)/i.test(n)) return true;
    if (/=\s*1\s*und\b|cantidad\s*1\s*und\s*por|unitario\s*por\s*(mueble|pieza)/i.test(n)) return true;
    return false;
}

/** Lee ficha: und=1 → 1 producto/caja (costo por pieza). und>1 → varias piezas comparten caja (lote). */
function empaqueFichaResumen_() {
    let cajas = [];
    try {
        if (typeof leerFichaComercialUI === "function") {
            const f = leerFichaComercialUI();
            cajas = (typeof fichaEmpCajasDe_ === "function") ? fichaEmpCajasDe_(f) : (f && f.empCajas) || [];
        } else if (typeof fichaEmpCajasDe_ === "function") {
            cajas = fichaEmpCajasDe_({});
        }
    } catch (e) { cajas = []; }
    let porPieza = false;
    let compartido = false;
    let hayDato = false;
    (cajas || []).forEach(function (c) {
        if (!c) return;
        const und = Number(c.und);
        const pp = Number(c.porPieza);
        if (!(und > 0) && !(pp > 0)) return;
        hayDato = true;
        if (und === 1 || (pp >= 1 && !(und > 1))) porPieza = true;
        if (und > 1) compartido = true;
    });
    return { hayDato: hayDato, porPieza: porPieza, compartido: compartido };
}

function nombreSugiereGlobal_(n) {
    n = String(n || "");
    if (esProcesoPorPieza_(n)) return false;
    if (nombreSugierePorPieza_(n)) return false;
    if (/transporte|flete|fletes|transport/i.test(n)) return true;
    if (/elaboraci[oó]n de troquel|troquel litogr[aá]fico|molde de|setup\s*cnc|preparaci[oó]n (cnc|de m[aá]quina)/i.test(n)) return true;
    /* Caja/máster: solo sugiere global si la ficha dice varias piezas por caja.
       Si es 1 caja por mueble (o no hay dato de empaque), no forzar global. */
    if (conceptoEsEmpaque_(n)) {
        const emp = empaqueFichaResumen_();
        if (emp.porPieza) return false;
        if (emp.compartido) return true;
        return false;
    }
    return false;
}

function inferirEsGlobal_(m) {
    if (!m) return false;
    const n = String(m.nombre || "");
    if (esProcesoPorPieza_(n)) return false;
    /* Respetar decisión explícita de la IA / analista. */
    if (esGlobalExplicitoFalse_(m.es_global)) return false;
    if (nombreSugierePorPieza_(n)) return false;
    if (conceptoEsEmpaque_(n)) {
        const emp = empaqueFichaResumen_();
        if (emp.porPieza) return false;
        if (emp.compartido) return true;
    }
    if (esGlobalExplicitoTrue_(m.es_global)) return true;
    if (nombreSugiereGlobal_(n)) return true;
    if (typeof listaTarifasFijas === "function" && typeof mejorTarifaParaItem === "function" && typeof scoreCatalogo === "function") {
        const t = mejorTarifaParaItem(n, listaTarifasFijas());
        if (t && t.es_global && scoreCatalogo(n, t.nombre) >= 0.72) return true;
    }
    return false;
}

function diluirCostosGlobales_(item) {
    if (!item) return;
    const base = Number(item.costoUnitario) || 0;
    item.es_global = true;
    lotesSimulacion.forEach(function (l) {
        item.costos = item.costos || {};
        item.costos[l.id] = (l.q ? base / l.q : base);
    });
}

function asegurarCostosGlobales_(item) {
    if (!item || !item.es_global) return;
    const lt = lotesSimulacion[0];
    const q = (lt && lt.q) || 1;
    const visto = lt && item.costos ? Number(item.costos[lt.id]) || 0 : 0;
    let base = Number(item.costoUnitario) || 0;
    if (!(base > 0) && visto > 0) {
        item.costoUnitario = (q > 1 && visto < 200) ? visto * q : visto;
    }
    diluirCostosGlobales_(item);
}

function anchoColMatriz_(w, id, def) {
    const t = topeColMatriz_(id);
    const x = parseInt(w && w[id], 10);
    if (!x) return def;
    return Math.max(t[0], Math.min(t[1], x));
}

function medirTextoMatriz_(s) {
    try {
        if (!window._mtxMeasureCtx) {
            const c = document.createElement("canvas");
            window._mtxMeasureCtx = c.getContext("2d");
        }
        window._mtxMeasureCtx.font = "700 13px system-ui, Segoe UI, sans-serif";
        return Math.ceil(window._mtxMeasureCtx.measureText(String(s || "")).width + 32);
    } catch (e) {
        return Math.ceil(String(s || "").length * 8.4 + 32);
    }
}

function anchosUnitTotalMatriz_() {
    let unit = 120;
    let tot = 128;
    (typeof itemsPresupuesto !== "undefined" ? itemsPresupuesto : []).forEach(function (i) {
        lotesSimulacion.forEach(function (lt) {
            const v = (i.costos && i.costos[lt.id] != null) ? Number(i.costos[lt.id]) : (Number(i.costoUnitario) || 0);
            const unitVal = i.es_global ? (Math.round(v * 100) / 100) : v;
            const totVal = (v * (Number(i.cantidad) || 0)) || 0;
            const totTxt = "$" + totVal.toLocaleString("es-CO", { maximumFractionDigits: (Math.abs(totVal) < 100 ? 2 : 0) });
            unit = Math.max(unit, medirTextoMatriz_(String(unitVal)) + 36);
            tot = Math.max(tot, medirTextoMatriz_(totTxt) + 8);
        });
    });
    return {
        unit: Math.max(MTX_TOPE_.unit[0], Math.min(MTX_TOPE_.unit[1], unit)),
        tot: Math.max(MTX_TOPE_.tot[0], Math.min(MTX_TOPE_.tot[1], tot))
    };
}

function idsUnitTotalLote_(lt, i) {
    return { uid: "unit_" + (lt.id || i), tid: "tot_" + (lt.id || i) };
}

function colgroupMatriz_(w) {
    const defs = [["num", 40], ["fuente", 110], ["desc", 220], ["cat", 128], ["cant", 62], ["um", 84], ["glob", 118]];
    const ut = anchosUnitTotalMatriz_();
    const box = document.querySelector(".matriz-scroll");
    const avail = box ? box.clientWidth : 0;
    const anchos = {};
    let fijo = 76;
    lotesSimulacion.forEach(function (lt, i) {
        const ids = idsUnitTotalLote_(lt, i);
        fijo += anchoColMatriz_(w, ids.uid, ut.unit) + anchoColMatriz_(w, ids.tid, ut.tot);
    });
    defs.forEach(function (d) {
        if (d[0] === "desc") return;
        anchos[d[0]] = anchoColMatriz_(w, d[0], d[1]);
        fijo += anchos[d[0]];
    });
    let desc = anchoColMatriz_(w, "desc", 240);
    if (avail > fijo) desc = Math.max(desc, avail - fijo);
    anchos.desc = Math.max(MTX_TOPE_.desc[0], desc);
    let html = "";
    let total = 0;
    defs.forEach(function (d) {
        const x = anchos[d[0]];
        html += '<col data-col="' + d[0] + '" style="width:' + x + 'px">';
        total += x;
        const th = document.querySelector('#theadItems th[data-col="' + d[0] + '"]');
        if (th) { th.style.width = x + "px"; th.style.minWidth = x + "px"; }
    });
    lotesSimulacion.forEach(function (lt, i) {
        const ids = idsUnitTotalLote_(lt, i);
        const uw = anchoColMatriz_(w, ids.uid, ut.unit);
        const tw = anchoColMatriz_(w, ids.tid, ut.tot);
        html += '<col data-col="' + ids.uid + '" style="width:' + uw + 'px">';
        html += '<col data-col="' + ids.tid + '" style="width:' + tw + 'px">';
        total += uw + tw;
        const thu = document.querySelector('#theadItems th[data-col="' + ids.uid + '"]');
        const tht = document.querySelector('#theadItems th[data-col="' + ids.tid + '"]');
        if (thu) { thu.style.width = uw + "px"; thu.style.minWidth = uw + "px"; }
        if (tht) { tht.style.width = tw + "px"; tht.style.minWidth = tw + "px"; }
    });
    html += '<col style="width:36px"><col style="width:40px">';
    total += 76;
    const cg = document.getElementById("colgroupItems");
    if (cg) cg.innerHTML = html;
    const tabla = document.getElementById("tablaMatriz");
    if (tabla) {
        tabla.style.width = total + "px";
        tabla.style.minWidth = total + "px";
        tabla.style.maxWidth = total + "px";
    }
}

function fijarAltoCabezaMatriz_() {
    const thead = document.getElementById("theadItems");
    if (!thead) return;
    const r1 = thead.querySelector("tr");
    if (!r1) return;
    thead.style.setProperty("--mtx-th2", Math.ceil(r1.getBoundingClientRect().height) + "px");
}
window.addEventListener("resize", function () {
    colgroupMatriz_(anchosColumnasMatriz());
    fijarAltoCabezaMatriz_();
});

function renderizarTablaItems() {
    const thead = document.getElementById('theadItems');
    const tbody = document.getElementById('tbodyItems');
    if(!thead || !tbody) return;

    const w = anchosColumnasMatriz();
    const ut = anchosUnitTotalMatriz_();
    const thStyle = (id, def) => { const x = anchoColMatriz_(w, id, def); return `width:${x}px;min-width:${x}px;`; };
    let th = `<tr>
        <th rowspan="2" class="text-center mtx-th" data-col="num" style="${thStyle("num", 36)}">#<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="fuente" style="${thStyle("fuente", 110)}">FUENTE<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="desc" style="${thStyle("desc", 320)}">DESCRIPCIÓN<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="cat" style="${thStyle("cat", 130)}">CATEGORÍA<span class="col-resizer"></span></th>
        <th rowspan="2" class="text-center mtx-th" data-col="cant" style="${thStyle("cant", 70)}">CANT.<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="um" style="${thStyle("um", 90)}">U.M.<span class="col-resizer"></span></th>
        <th rowspan="2" class="text-center mtx-th" data-col="glob" title="Costo global del lote (Ajustes). Se divide entre Q." style="${thStyle("glob", 118)}">$ LOTE<span class="col-resizer"></span></th>`;
    const merHead = mercadoEsExportacion() ? "EXP" : "NAL";
    const nCand = itemsPresupuesto.filter(itemEstaCandado).length;
    const todosCand = itemsPresupuesto.length > 0 && nCand === itemsPresupuesto.length;
    lotesSimulacion.forEach(lt => {
        const ep = loteEconPct_(lt);
        const epAttr = ep ? String(ep) : "0";
        th += `<th colspan="2" class="text-center mtx-q-th" style="background:#1a1a1a; color:#e5e5e5;">` +
            `<div class="mtx-q-head">` +
            `<div class="mtx-q-top">` +
            `<span class="mtx-q-lab">Q: ${lt.q} · ${merHead}</span>` +
            `<i class="bi bi-x-circle text-danger cursor-pointer" title="Quitar este rango" onclick="eliminarLote('${lt.id}')"></i>` +
            `</div>` +
            `<label class="mtx-econ" title="Economía de escala (−% sobre todos los $ UNIT. de esta Q). 0 = sin descuento." onclick="event.stopPropagation()">` +
            `<span class="mtx-econ-menos">−</span>` +
            `<input type="number" min="0" max="100" step="0.1" value="${epAttr}" onchange="actualizarEconLote('${lt.id}',this.value)" onclick="event.stopPropagation()">` +
            `<span>%</span></label>` +
            `</div></th>`;
    });
    th += `<th rowspan="2" class="text-center mtx-lock-th" title="${todosCand ? "Clic: liberar toda la matriz" : "Clic: candar toda la matriz (no suman; se conservan los valores)"}" style="width:36px;" onclick="alternarCandadosMasivo()"><i class="bi ${todosCand ? "bi-lock-fill" : "bi-unlock"} mtx-lock-head${todosCand ? " mtx-lock-on" : ""}"></i></th><th rowspan="2" class="text-center" style="width:35px;"><i class="bi bi-trash"></i></th></tr><tr>`;
    lotesSimulacion.forEach((lt, i) => {
        const ids = idsUnitTotalLote_(lt, i);
        th += `<th class="text-center mtx-th" data-col="${ids.uid}" style="background:#333333; color:white; font-size:0.7rem; ${thStyle(ids.uid, ut.unit)}">$ UNIT.<span class="col-resizer"></span></th><th class="text-center mtx-th" data-col="${ids.tid}" style="background:#4a4a4a; color:white; font-size:0.7rem; ${thStyle(ids.tid, ut.tot)}">$ TOTAL<span class="col-resizer"></span></th>`;
    });
    thead.innerHTML = th + `</tr>`;
    colgroupMatriz_(w);

    if (itemsPresupuesto.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${9+(lotesSimulacion.length*2)}" class="text-center text-muted py-4">Matriz vacía.</td></tr>`;
        fijarAltoCabezaMatriz_();
        return actualizarSimuladorFinanciero();
    }

    let umList = (typeof listaUnidadesUI === "function") ? listaUnidadesUI() : ((CONFIG_GLOBAL && CONFIG_GLOBAL.unidades) ? CONFIG_GLOBAL.unidades.split('\n') : ["UND", "Metros", "kg"]);
    let tb = "";
    itemsPresupuesto.forEach((i, idx) => {
        if(!i.costos) { i.costos = {}; lotesSimulacion.forEach(l => i.costos[l.id] = i.costoUnitario || 0); }
        asegurarCostosGlobales_(i);
        
        let fTag = i.fuente || "[Manual]";
        let bc = "badge-manual";
        if (fTag.includes("Odoo")) bc = "badge-odoo";
        else if (fTag.includes("Tarifa")) bc = "badge-tarifa";
        else if (fTag.includes("Base")) bc = "badge-base";
        else if (fTag.includes("IA") || fTag.includes("Chat") || fTag.includes("Estimado")) bc = "badge-ia";
        
        tb += `<tr class="${itemEstaCandado(i) ? "mtx-candado" : ""}${i.es_global ? " mtx-es-global" : ""}"><td class="text-center align-middle"><i class="bi bi-grid-3x2-gap-fill drag-handle"></i> <small class="text-muted d-block">${idx+1}</small></td>
            <td class="align-middle"><span class="badge ${bc} w-100">${fTag}</span></td>
            <td class="mtx-desc" data-tip="${escAttrMatriz(i.nombre)}"><input type="text" class="form-control form-control-sm" value="${escAttrMatriz(i.nombre)}" onchange="actualizarCampo(${i.id},'nombre',this.value)"></td>
            <td><select class="form-select form-select-sm" onchange="actualizarCampo(${i.id},'categoria',this.value)">${CATEGORIAS.map(c=>`<option ${i.categoria===c?'selected':''}>${c}</option>`).join('')}</select></td>
            <td><input type="number" class="form-control form-control-sm text-center px-1" value="${i.cantidad}" onchange="actualizarCampo(${i.id},'cantidad',this.value)"></td>
            <td><select class="form-select form-select-sm px-1" onchange="actualizarCampo(${i.id},'um',this.value)">${(i.um && !umList.some(u=>u.trim()===i.um)?[i.um,...umList]:umList).map(u=>`<option ${i.um===u.trim()?'selected':''}>${u.trim()}</option>`).join('')}</select></td>
            <td class="mtx-glob">${celdaCostoLote_(i)}</td>`;
        lotesSimulacion.forEach(lt => {
            const base = costoBaseItemLote_(i, lt.id);
            const v = costoEfectivoItemLote_(i, lt);
            const unitVal = i.es_global ? (Math.round(v * 100) / 100) : (Math.round(v * 100) / 100);
            const unitAttr = i.es_global ? "disabled" : "";
            const tot = (v * (Number(i.cantidad) || 0)) || 0;
            tb += `<td class="mtx-unit" style="border-left:2px solid #cbd5e1;"><input type="number" step="0.01" class="form-control form-control-sm text-center fw-bold text-primary px-1" value="${unitVal}" ${unitAttr} title="${loteEconPct_(lt) ? ("Base " + (Math.round(base * 100) / 100) + " · −" + loteEconPct_(lt) + "%") : "Costo unitario"}" onchange="actualizarCostoItem(${i.id},'${lt.id}',this.value)"></td>
            <td class="mtx-tot text-end fw-bold align-middle">$${tot.toLocaleString('es-CO',{maximumFractionDigits: (Math.abs(tot) < 100 ? 2 : 0)})}</td>`;
        });
        tb += `<td class="text-center align-middle"><i class="bi ${itemEstaCandado(i) ? "bi-lock-fill" : "bi-unlock"} mtx-lock" title="${itemEstaCandado(i) ? "Liberar: vuelve a sumar" : "Candar: no suma; conserva el valor"}" onclick="alternarCandado(${i.id})"></i></td><td class="text-center align-middle"><i class="bi bi-trash text-danger cursor-pointer fs-6" onclick="eliminarItem(${i.id})"></i></td></tr>`;
    });
    tbody.innerHTML = tb;
    inicializarDragAndDropMatrix();
    activarResizeColumnasMatriz();
    activarRolloverDescripcion();
    colgroupMatriz_(w);
    fijarAltoCabezaMatriz_();
    requestAnimationFrame(function () {
        colgroupMatriz_(anchosColumnasMatriz());
        fijarAltoCabezaMatriz_();
    });
    actualizarSimuladorFinanciero();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
    if (typeof logisticaTrasPresupuesto_ === "function") logisticaTrasPresupuesto_();
}

function escAttrMatriz(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

var _anchosMatrizSesion = null;
var _timerAnchosMatriz = null;

function anchosColumnasMatriz() {
    const remoto = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.anchosMatriz && typeof CONFIG_GLOBAL.anchosMatriz === "object")
        ? CONFIG_GLOBAL.anchosMatriz : {};
    if (_anchosMatrizSesion) return Object.assign({}, remoto, _anchosMatrizSesion);
    if (Object.keys(remoto).length) return Object.assign({}, remoto);
    try { return JSON.parse(localStorage.getItem("smartbudget_mtx_cols") || "{}"); } catch (e) { return {}; }
}

function guardarAnchoColumnaMatriz(id, w) {
    if (!id) return;
    const o = anchosColumnasMatriz();
    o[id] = anchoColMatriz_({ [id]: w }, id, w);
    _anchosMatrizSesion = o;
    if (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL) CONFIG_GLOBAL.anchosMatriz = o;
    try { localStorage.setItem("smartbudget_mtx_cols", JSON.stringify(o)); } catch (e) {}
    programarGuardarAnchosMatriz_();
}

function programarGuardarAnchosMatriz_() {
    if (_timerAnchosMatriz) clearTimeout(_timerAnchosMatriz);
    _timerAnchosMatriz = setTimeout(function () {
        _timerAnchosMatriz = null;
        persistirAnchosMatrizNube_();
    }, 1400);
}

function persistirAnchosMatrizNube_() {
    if (localStorage.getItem("smartbudget_rol") !== "ADMIN") return;
    const anchos = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.anchosMatriz) || _anchosMatrizSesion;
    if (!anchos || typeof realizarPeticionBD !== "function") return;
    realizarPeticionBD({
        action: "guardar_anchos_matriz",
        anchos: anchos,
        email: localStorage.getItem("smartbudget_email") || ""
    }).then(function (res) {
        if (res && res.exito && typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Anchos de matriz guardados para toda la empresa.", "success");
        }
    }).catch(function () {});
}

function activarResizeColumnasMatriz() {
    document.querySelectorAll("#theadItems .col-resizer").forEach(function (rz) {
        rz.onmousedown = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const th = rz.parentElement;
            const startX = e.clientX;
            const startW = th.getBoundingClientRect().width;
            function move(ev) {
                const w = Math.max(48, startW + ev.clientX - startX);
                th.style.width = w + "px";
                th.style.minWidth = w + "px";
                const col = document.querySelector('#colgroupItems col[data-col="' + th.getAttribute("data-col") + '"]');
                if (col) col.style.width = w + "px";
            }
            function up() {
                document.removeEventListener("mousemove", move);
                document.removeEventListener("mouseup", up);
                guardarAnchoColumnaMatriz(th.getAttribute("data-col"), parseInt(th.style.width, 10));
            }
            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", up);
        };
    });
}

function activarRolloverDescripcion() {
    let tip = document.getElementById("mtxFloatTip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "mtxFloatTip";
        tip.className = "mtx-float-tip";
        document.body.appendChild(tip);
    }
    document.querySelectorAll("#tbodyItems .mtx-desc").forEach(function (td) {
        td.onmouseenter = function (e) {
            const txt = td.getAttribute("data-tip") || "";
            if (!txt) return;
            tip.textContent = txt;
            tip.style.display = "block";
            tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 360) + "px";
            tip.style.top = (e.clientY + 16) + "px";
        };
        td.onmousemove = function (e) {
            if (tip.style.display !== "block") return;
            tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 360) + "px";
            tip.style.top = (e.clientY + 16) + "px";
        };
        td.onmouseleave = function () { tip.style.display = "none"; };
    });
}

function agregarLote() {
    document.getElementById('inputModalCantidadRango').value = '';
    new bootstrap.Modal(document.getElementById('modalNuevoRango')).show();
}

function confirmarNuevoRango() {
    const q = parseInt(document.getElementById('inputModalCantidadRango').value, 10);
    if(isNaN(q) || q<=0) return mostrarNotificacion("Cantidad inválida", "warning");
    if(lotesSimulacion.find(l=>l.q===q)) return mostrarNotificacion("El rango ya existe", "warning");
    
    let closestId = null;
    let closestQ = -1;
    lotesSimulacion.forEach(l => { if (l.q < q && l.q > closestQ) { closestQ = l.q; closestId = l.id; } });
    
    let nId = 'l_'+Date.now();
    lotesSimulacion.push({ id: nId, q: q, econPct: 0 });
    lotesSimulacion.sort((a,b)=>a.q-b.q);
    
    itemsPresupuesto.forEach(i => {
        if (i.es_global) i.costos[nId] = (Number(i.costoUnitario) || 0) / q;
        else i.costos[nId] = (closestId && i.costos[closestId] !== undefined) ? i.costos[closestId] : (i.costoUnitario || 0);
    });
    
    bootstrap.Modal.getInstance(document.getElementById('modalNuevoRango'))?.hide();
    renderizarTablaItems();
}

function eliminarLote(id) { if(lotesSimulacion.length<=1) return; lotesSimulacion = lotesSimulacion.filter(l=>l.id!==id); renderizarTablaItems(); }

/** Economía de escala de la columna Q: rebaja masiva sobre el costo unitario (factor vivo). */
function actualizarEconLote(id, val) {
    const lt = lotesSimulacion.find(function (l) { return l.id === id; });
    if (!lt) return;
    const n = parseFloat(String(val).replace(",", "."));
    lt.econPct = (!isFinite(n) || n <= 0) ? 0 : Math.min(100, n);
    renderizarTablaItems();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function actualizarCostoItem(iId, lId, val) {
    const item = itemsPresupuesto.find(function (i) { return i.id === iId; });
    if (!item) return;
    const lt = lotesSimulacion.find(function (l) { return l.id === lId; });
    const f = loteEconFactor_(lt);
    const entered = parseFloat(val) || 0;
    /* La celda muestra el efectivo; al editar se guarda la base sin el % de economía. */
    item.costos = item.costos || {};
    item.costos[lId] = f > 0 ? (entered / f) : entered;
    renderizarTablaItems();
}
function celdaCostoLote_(i) {
    const glob = !!i.es_global;
    return '<div class="mtx-glob-wrap">' +
        '<input type="checkbox" class="form-check-input mtx-glob-chk" title="Marcar como costo global (se divide entre Q)" ' + (glob ? "checked " : "") + 'onchange="alternarEsGlobal(' + i.id + ',this.checked)">' +
        '<input type="number" step="1" class="form-control form-control-sm text-end mtx-glob-inp" title="Costo global del lote (COP)" ' + (glob ? "" : "disabled ") + 'placeholder="—" value="' + (glob ? Math.round(Number(i.costoUnitario) || 0) : "") + '" onchange="actualizarCostoGlobal(' + i.id + ',this.value)">' +
        "</div>";
}
function actualizarCostoGlobal(id, val) {
    const i = itemsPresupuesto.find(function (x) { return x.id === id; });
    if (!i) return;
    i.es_global = true;
    i.costoUnitario = parseFloat(val) || 0;
    diluirCostosGlobales_(i);
    renderizarTablaItems();
}
function alternarEsGlobal(id, on) {
    const i = itemsPresupuesto.find(function (x) { return x.id === id; });
    if (!i) return;
    if (on) {
        const lt = lotesSimulacion[0];
        const q = (lt && lt.q) || 1;
        const visto = lt && i.costos ? Number(i.costos[lt.id]) || 0 : 0;
        const prev = Number(i.costoUnitario) || 0;
        if (!(prev > 0 && q > 1 && prev >= visto * Math.max(2, q * 0.4))) {
            i.costoUnitario = visto || prev;
        }
        diluirCostosGlobales_(i);
    } else {
        /* Al pasar a unitario: usar el valor de lote (costoUnitario) en cada Q, no el diluido. */
        i.es_global = false;
        const base = Number(i.costoUnitario) || 0;
        i.costos = i.costos || {};
        lotesSimulacion.forEach(function (l) {
            i.costos[l.id] = base;
        });
    }
    renderizarTablaItems();
}
function agregarItemTemporal() { let ni = {id:Date.now(), fuente:"[Manual]", nombre:"", categoria:"Materias Primas", cantidad:1, um:"UND", costoUnitario:0, es_global:false, costos:{}}; lotesSimulacion.forEach(l => ni.costos[l.id] = 0); itemsPresupuesto.push(ni); renderizarTablaItems(); }
function actualizarCampo(id, c, v) { let i = itemsPresupuesto.find(x=>x.id===id); if(i) { i[c] = (c==='cantidad')?parseFloat(v)||0:v; renderizarTablaItems(); } }
function eliminarItem(id) { itemsPresupuesto = itemsPresupuesto.filter(i=>i.id!==id); renderizarTablaItems(); }

function alternarCandado(id) {
    const i = itemsPresupuesto.find(function (x) { return x.id === id; });
    if (!i) return;
    i.candado = !itemEstaCandado(i);
    renderizarTablaItems();
}

function alternarCandadosMasivo() {
    if (!itemsPresupuesto.length) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("La matriz está vacía.", "info");
        return;
    }
    const todos = itemsPresupuesto.every(itemEstaCandado);
    if (todos) return liberarCandados();
    let n = 0;
    itemsPresupuesto.forEach(function (i) {
        if (!itemEstaCandado(i)) {
            i.candado = true;
            n++;
        }
    });
    renderizarTablaItems();
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion(n + " línea(s) candada(s). No suman al precio; los valores se conservan.", "success");
    }
}

function candarFabricacion() {
    alternarCandadosMasivo();
}

function liberarCandados() {
    let n = 0;
    itemsPresupuesto.forEach(function (i) {
        if (itemEstaCandado(i)) {
            i.candado = false;
            n++;
        }
    });
    renderizarTablaItems();
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion(n ? (n + " líneas liberadas. Vuelven a sumar.") : "No había candados.", n ? "success" : "info");
    }
}

window.aplicarRangosDesdeIA = function(rangos) {
    let qs = Array.isArray(rangos) ? rangos.map(Number).filter(q => q > 0) : [];
    if (!qs.length) qs = [1, 50, 100];
    qs = [...new Set(qs)].sort((a, b) => a - b);
    lotesSimulacion = qs.map(q => ({ id: 'l_' + q, q: q, econPct: 0 }));
};

window.reemplazarMatrizDesdeIA = function(nuevaMatriz) {
    if (!Array.isArray(nuevaMatriz)) return;
    const umAlias = { Unidades: "UND", unidades: "UND", UND: "UND", und: "UND", m: "Metros", mts: "Metros", metro: "Metros", Metros: "Metros", hoja: "Hojas", Hojas: "Hojas", lamina: "Hojas", kg: "kg", kilo: "kg", m2: "m2", litros: "Litros", Litros: "Litros", Cml: "Cml", cml: "Cml", cm: "Cml" };
    const umsOk = (typeof listaUnidadesUI === "function") ? listaUnidadesUI() : [];
    itemsPresupuesto = [];
    nuevaMatriz.forEach(m => {
        let nombreLimpio = (m.nombre || "Sin nombre").replace(/^\[.*?\]\s*-?\s*/, '').trim();
        /* [Matriz Drive] solo lo confirma enriquecerItemsConCatalogo; si viene de la IA, es provisional. */
        let fuenteCorrecta = m.fuente || "[Estimado IA]";
        if (/matriz\s*drive|cat[aá]logo/i.test(fuenteCorrecta)) fuenteCorrecta = "[Estimado IA]";
        let um = umAlias[m.um] || m.um || "UND";
        if (umsOk.length && !umsOk.some(u => u === um)) {
            const hit = umsOk.find(u => u.toLowerCase() === String(um).toLowerCase());
            um = hit || "UND";
        }
        let costoBase = parseFloat(m.costoUnitario) || 0;
        const esGlob = inferirEsGlobal_({ nombre: nombreLimpio, categoria: m.categoria, es_global: m.es_global });
        if (esGlob && !costoBase && m.costos) {
            const keys = Object.keys(m.costos);
            if (keys.length) costoBase = parseFloat(m.costos[keys[0]]) || 0;
        }
        let n = { id: Date.now() + Math.random(), fuente: fuenteCorrecta, nombre: nombreLimpio, categoria: m.categoria || "Materias Primas", cantidad: parseFloat(m.cantidad) || 1, um: um, es_global: esGlob, candado: !!m.candado, costoUnitario: costoBase, costos: {} };
        lotesSimulacion.forEach(l => {
            if (n.es_global) {
                n.costos[l.id] = (l.q ? costoBase / l.q : costoBase);
            } else if (m.costos && m.costos[l.id] != null) {
                n.costos[l.id] = parseFloat(m.costos[l.id]) || 0;
            } else if (m.costos && m.costos[String(l.q)] != null) {
                n.costos[l.id] = parseFloat(m.costos[String(l.q)]) || 0;
            } else {
                n.costos[l.id] = costoBase;
            }
        });
        itemsPresupuesto.push(n);
    });
    renderizarTablaItems();
};
