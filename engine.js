let itemsPresupuesto = [];
let lotesSimulacion = [ { id: 'l1', q: 1 } ];
let overridesTarjetas = {};
let trmActualGlobal = 4150;
const CATEGORIAS = ["Materias Primas", "Procesos Externos", "Procesos Internos", "Mano de Obra", "Empaque y Fletes", "Comercialización"];

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
    const exp = mercadoEsExportacion();
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

function actualizarSimuladorFinanciero() {
    const panel = document.getElementById('panelFinanciero');
    if (!panel) return;
    if (!CONFIG_GLOBAL || itemsPresupuesto.length === 0) { 
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
        let uFab = 0, uCom = 0;
        itemsPresupuesto.forEach(i => { 
            let c = (i.costos && i.costos[lt.id] !== undefined) ? i.costos[lt.id] : (i.costoUnitario || 0);
            let s = (Number(i.cantidad) || 1) * (Number(c) || 0);
            i.categoria === "Comercialización" ? uCom += s : uFab += s;
        });

        const totalFabLote = uFab * lt.q;
        const totalComLote = uCom * lt.q;
        const o = overridesTarjetas[lt.id] || {};

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

        const inp = (campo, val) => `<input type="number" step="0.01" class="inline-override" value="${Number(val).toFixed(2)}" onchange="guardarOverride('${lt.id}','${campo}',this.value)">`;

        htmlCartas += `
          <div class="col-md-6 col-lg-4">
            <div class="card card-escala h-100">
              <div class="card-header aiu-head">
                <span>Lote ${lt.q} unds</span>
                <span class="aiu-mer ${merCls}">${merLabel}</span>
              </div>
              <div class="card-body p-2" style="font-size:0.78rem;">
                <div class="bg-fab p-2 rounded mb-2">
                  <div class="aiu-title">FABRICACIÓN</div>
                  <div class="aiu-hint">Tope sobre costo total de manufactura (materiales y procesos) del lote: ${copFmt(totalFabLote)}</div>
                  ${filaAiu("Costo directo", null, uFab)}
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
                  <span class="d-block text-uppercase" style="font-size:0.68rem; letter-spacing:.04em; color:#6b6b6b;">Precio venta unitario</span>
                  <div class="fw-bold">${copFmt(pFinUnitario)} COP</div>
                  <div class="aiu-usd">US$ ${(pFinUnitario / trm).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div class="border-top pt-2 mt-2">
                    <span class="d-block text-uppercase fw-bold" style="font-size:0.68rem; color:var(--diforma-red);">Total negocio (${lt.q} unds)</span>
                    <div class="fw-bold" style="color:var(--diforma-red);">${copFmt(pTotalGlobal)} COP</div>
                    <div class="aiu-usd">US$ ${(pTotalGlobal / trm).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
    });
    panel.innerHTML = htmlCartas;
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

function renderizarTablaItems() {
    const thead = document.getElementById('theadItems');
    const tbody = document.getElementById('tbodyItems');
    if(!thead || !tbody) return;

    const w = anchosColumnasMatriz();
    const thStyle = (id, def) => { const x = w[id] || def; return `width:${x}px;min-width:${x}px;`; };
    let th = `<tr>
        <th rowspan="2" class="text-center mtx-th" data-col="num" style="${thStyle("num", 36)}">#<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="fuente" style="${thStyle("fuente", 110)}">FUENTE<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="desc" style="${thStyle("desc", 380)}">DESCRIPCIÓN<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="cat" style="${thStyle("cat", 130)}">CATEGORÍA<span class="col-resizer"></span></th>
        <th rowspan="2" class="text-center mtx-th" data-col="cant" style="${thStyle("cant", 70)}">CANT.<span class="col-resizer"></span></th>
        <th rowspan="2" class="mtx-th" data-col="um" style="${thStyle("um", 90)}">U.M.<span class="col-resizer"></span></th>`;
    const merHead = mercadoEsExportacion() ? "EXP" : "NAL";
    lotesSimulacion.forEach(lt => th += `<th colspan="2" class="text-center" style="background:#0f172a; color:#e5e5e5;">Q: ${lt.q} · ${merHead} <i class="bi bi-x-circle text-danger ms-1 cursor-pointer" onclick="eliminarLote('${lt.id}')"></i></th>`);
    th += `<th rowspan="2" class="text-center" style="width:35px;"><i class="bi bi-trash"></i></th></tr><tr>`;
    lotesSimulacion.forEach(lt => th += `<th class="text-center" style="background:#334155; color:white; font-size:0.7rem; width:90px;">$ UNIT.</th><th class="text-center" style="background:#475569; color:white; font-size:0.7rem; width:100px;">$ TOTAL</th>`);
    thead.innerHTML = th + `</tr>`;

    if (itemsPresupuesto.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${7+(lotesSimulacion.length*2)}" class="text-center text-muted py-4">Matriz vacía.</td></tr>`;
        return actualizarSimuladorFinanciero();
    }

    let umList = (typeof listaUnidadesUI === "function") ? listaUnidadesUI() : ((CONFIG_GLOBAL && CONFIG_GLOBAL.unidades) ? CONFIG_GLOBAL.unidades.split('\n') : ["UND", "Metros", "kg"]);
    let tb = "";
    itemsPresupuesto.forEach((i, idx) => {
        if(!i.costos) { i.costos = {}; lotesSimulacion.forEach(l => i.costos[l.id] = i.costoUnitario || 0); }
        
        let fTag = i.fuente || "[Manual]";
        let bc = "badge-manual";
        if (fTag.includes("Odoo")) bc = "badge-odoo";
        else if (fTag.includes("Tarifa")) bc = "badge-tarifa";
        else if (fTag.includes("Base")) bc = "badge-base";
        else if (fTag.includes("IA") || fTag.includes("Chat") || fTag.includes("Estimado")) bc = "badge-ia";
        
        tb += `<tr><td class="text-center align-middle"><i class="bi bi-grid-3x2-gap-fill drag-handle"></i> <small class="text-muted d-block">${idx+1}</small></td>
            <td class="align-middle"><span class="badge ${bc} w-100">${fTag}</span></td>
            <td class="mtx-desc" data-tip="${escAttrMatriz(i.nombre)}"><input type="text" class="form-control form-control-sm" value="${escAttrMatriz(i.nombre)}" onchange="actualizarCampo(${i.id},'nombre',this.value)"></td>
            <td><select class="form-select form-select-sm" onchange="actualizarCampo(${i.id},'categoria',this.value)">${CATEGORIAS.map(c=>`<option ${i.categoria===c?'selected':''}>${c}</option>`).join('')}</select></td>
            <td><input type="number" class="form-control form-control-sm text-center px-1" value="${i.cantidad}" onchange="actualizarCampo(${i.id},'cantidad',this.value)"></td>
            <td><select class="form-select form-select-sm px-1" onchange="actualizarCampo(${i.id},'um',this.value)">${(i.um && !umList.some(u=>u.trim()===i.um)?[i.um,...umList]:umList).map(u=>`<option ${i.um===u.trim()?'selected':''}>${u.trim()}</option>`).join('')}</select></td>`;
        lotesSimulacion.forEach(lt => {
            let v = i.costos[lt.id] || 0;
            tb += `<td style="border-left:2px solid #cbd5e1;"><input type="number" class="form-control form-control-sm text-center fw-bold text-primary px-1" value="${v}" onchange="actualizarCostoItem(${i.id},'${lt.id}',this.value)"></td>
            <td class="text-end fw-bold align-middle" style="font-size:0.8rem;">$${(v*i.cantidad).toLocaleString('es-CO',{maximumFractionDigits:0})}</td>`;
        });
        tb += `<td class="text-center align-middle"><i class="bi bi-trash text-danger cursor-pointer fs-6" onclick="eliminarItem(${i.id})"></i></td></tr>`;
    });
    tbody.innerHTML = tb;
    inicializarDragAndDropMatrix();
    activarResizeColumnasMatriz();
    activarRolloverDescripcion();
    actualizarSimuladorFinanciero();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function escAttrMatriz(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function anchosColumnasMatriz() {
    try { return JSON.parse(localStorage.getItem("smartbudget_mtx_cols") || "{}"); } catch (e) { return {}; }
}

function guardarAnchoColumnaMatriz(id, w) {
    if (!id) return;
    const o = anchosColumnasMatriz();
    o[id] = w;
    localStorage.setItem("smartbudget_mtx_cols", JSON.stringify(o));
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
    lotesSimulacion.push({id: nId, q: q}); 
    lotesSimulacion.sort((a,b)=>a.q-b.q);
    
    itemsPresupuesto.forEach(i => { i.costos[nId] = (closestId && i.costos[closestId] !== undefined) ? i.costos[closestId] : (i.costoUnitario || 0); });
    
    bootstrap.Modal.getInstance(document.getElementById('modalNuevoRango'))?.hide();
    renderizarTablaItems();
}

function eliminarLote(id) { if(lotesSimulacion.length<=1) return; lotesSimulacion = lotesSimulacion.filter(l=>l.id!==id); renderizarTablaItems(); }
function actualizarCostoItem(iId, lId, val) { let item = itemsPresupuesto.find(i=>i.id===iId); if(item) { item.costos[lId] = parseFloat(val)||0; renderizarTablaItems(); } }
function agregarItemTemporal() { let ni = {id:Date.now(), fuente:"[Manual]", nombre:"", categoria:"Materias Primas", cantidad:1, um:"UND", costoUnitario:0, costos:{}}; lotesSimulacion.forEach(l => ni.costos[l.id] = 0); itemsPresupuesto.push(ni); renderizarTablaItems(); }
function actualizarCampo(id, c, v) { let i = itemsPresupuesto.find(x=>x.id===id); if(i) { i[c] = (c==='cantidad')?parseFloat(v)||0:v; renderizarTablaItems(); } }
function eliminarItem(id) { itemsPresupuesto = itemsPresupuesto.filter(i=>i.id!==id); renderizarTablaItems(); }

window.aplicarRangosDesdeIA = function(rangos) {
    let qs = Array.isArray(rangos) ? rangos.map(Number).filter(q => q > 0) : [];
    if (!qs.length) qs = [1, 50, 100];
    qs = [...new Set(qs)].sort((a, b) => a - b);
    lotesSimulacion = qs.map(q => ({ id: 'l_' + q, q }));
};

window.reemplazarMatrizDesdeIA = function(nuevaMatriz) {
    if (!Array.isArray(nuevaMatriz)) return;
    const umAlias = { Unidades: "UND", unidades: "UND", UND: "UND", und: "UND", m: "Metros", mts: "Metros", metro: "Metros", Metros: "Metros", hoja: "Hojas", Hojas: "Hojas", lamina: "Hojas", kg: "kg", kilo: "kg", m2: "m2", litros: "Litros", Litros: "Litros", Cml: "Cml", cml: "Cml", cm: "Cml" };
    const umsOk = (typeof listaUnidadesUI === "function") ? listaUnidadesUI() : [];
    itemsPresupuesto = [];
    nuevaMatriz.forEach(m => {
        let nombreLimpio = (m.nombre || "Sin nombre").replace(/^\[.*?\]\s*-?\s*/, '').trim();
        let fuenteCorrecta = m.fuente || "[Estimado IA]";
        let um = umAlias[m.um] || m.um || "UND";
        if (umsOk.length && !umsOk.some(u => u === um)) {
            const hit = umsOk.find(u => u.toLowerCase() === String(um).toLowerCase());
            um = hit || "UND";
        }
        let costoBase = parseFloat(m.costoUnitario) || 0;
        let n = { id: Date.now() + Math.random(), fuente: fuenteCorrecta, nombre: nombreLimpio, categoria: m.categoria || "Materias Primas", cantidad: parseFloat(m.cantidad) || 1, um: um, es_global: !!m.es_global, costos: {} };
        lotesSimulacion.forEach(l => {
            if (m.costos && m.costos[l.id] != null) n.costos[l.id] = parseFloat(m.costos[l.id]) || 0;
            else if (m.costos && m.costos[String(l.q)] != null) n.costos[l.id] = parseFloat(m.costos[String(l.q)]) || 0;
            else n.costos[l.id] = n.es_global ? (costoBase / (l.q || 1)) : costoBase;
        });
        itemsPresupuesto.push(n);
    });
    renderizarTablaItems();
};
