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

function guardarOverride(tId, campo, valor) { 
    if(!overridesTarjetas[tId]) overridesTarjetas[tId] = {}; 
    overridesTarjetas[tId][campo] = parseFloat(valor) || 0; 
    actualizarSimuladorFinanciero(); 
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

    let htmlCartas = "";
    lotesSimulacion.forEach(lt => {
        let uFab = 0, uCom = 0;
        itemsPresupuesto.forEach(i => { 
            let c = (i.costos && i.costos[lt.id] !== undefined) ? i.costos[lt.id] : (i.costoUnitario || 0);
            let s = (i.cantidad || 1) * c; 
            i.categoria === 'Comercialización' ? uCom += s : uFab += s; 
        });
        
        let mF = uFab * lt.q, mC = uCom * lt.q;
        const o = overridesTarjetas[lt.id] || {};
        const op = CONFIG_GLOBAL.operativos;
        const ut = CONFIG_GLOBAL.utilidadNal;

        let pImpF = o.impFab !== undefined ? o.impFab : interp(mF, 0, op.topeFab, op.impFab.max, op.impFab.min);
        let pIndF = o.indFab !== undefined ? o.indFab : interp(mF, 0, op.topeFab, op.indFab.max, op.indFab.min);
        let pIndC = o.indCom !== undefined ? o.indCom : interp(mC, 0, op.topeCom, op.indCom.max, op.indCom.min);
        let pUtF = o.uFab !== undefined ? o.uFab : interp(mF, 0, ut.fab.tope, ut.fab.max, ut.fab.min);
        let pUtC = o.uCom !== undefined ? o.uCom : interp(mC, 0, ut.com.tope, ut.com.max, ut.com.min);

        let pVtaF = (pUtF < 100) ? ((uFab + (uFab * pImpF/100) + (uFab * pIndF/100)) / (1 - (pUtF/100))) : (uFab * 1.5);
        let pVtaC = (pUtC < 100) ? ((uCom + (uCom * pIndC/100)) / (1 - (pUtC/100))) : (uCom * 1.5);
        
        let pFinUnitario = (pVtaF + pVtaC); 
        pFinUnitario += (pFinUnitario * pctCom/100) + (pFinUnitario * feeExtra/100);
        
        let pTotalGlobal = pFinUnitario * lt.q;
        let pUnitUSD = pFinUnitario / trm;
        let pTotalUSD = pTotalGlobal / trm;

        htmlCartas += `
          <div class="col-md-6 col-lg-4">
            <div class="card card-escala h-100 shadow-sm border-secondary">
              <div class="card-header bg-secondary text-white py-2 fw-bold" style="font-size:0.8rem;">Lote ${lt.q} Unds</div>
              <div class="card-body p-2" style="font-size:0.8rem;">
                <div class="bg-fab p-2 rounded mb-2">
                  <div class="fw-bold text-primary mb-1">FABRICACIÓN: $${uFab.toLocaleString('es-CO',{maximumFractionDigits:0})}</div>
                  <div class="d-flex justify-content-between"><span>Imp (%) <input type="number" class="inline-override" value="${pImpF.toFixed(2)}" onchange="guardarOverride('${lt.id}','impFab',this.value)"></span></div>
                  <div class="d-flex justify-content-between mt-1 pt-1 border-top fw-bold text-success"><span>Margen (%) <input type="number" class="inline-override text-success" value="${pUtF.toFixed(2)}" onchange="guardarOverride('${lt.id}','uFab',this.value)"></span><span>$${pVtaF.toLocaleString('es-CO',{maximumFractionDigits:0})}</span></div>
                </div>
                <div class="bg-com p-2 rounded mb-2">
                  <div class="fw-bold text-warning-emphasis mb-1">COMERCIAL: $${uCom.toLocaleString('es-CO',{maximumFractionDigits:0})}</div>
                  <div class="d-flex justify-content-between mt-1 pt-1 border-top fw-bold text-success"><span>Margen (%) <input type="number" class="inline-override text-success" value="${pUtC.toFixed(2)}" onchange="guardarOverride('${lt.id}','uCom',this.value)"></span><span>$${pVtaC.toLocaleString('es-CO',{maximumFractionDigits:0})}</span></div>
                </div>
                <div class="text-center bg-light p-2 border rounded">
                  <div class="mb-2">
                    <span class="d-block text-secondary fw-bold" style="font-size:0.7rem;">PRECIO VENTA UNITARIO</span>
                    <div class="fw-bold text-dark" style="font-size:0.85rem;">$ ${pFinUnitario.toLocaleString('es-CO',{maximumFractionDigits:0})} COP</div>
                    <div class="fw-bold text-success" style="font-size:0.8rem;">US$ ${pUnitUSD.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2})} USD</div>
                  </div>
                  <div class="border-top pt-2" style="border-color:#cbd5e1 !important;">
                    <span class="d-block text-danger fw-bold" style="font-size:0.75rem;">VALOR TOTAL NEGOCIO (${lt.q} UNDS)</span>
                    <div class="fs-6 fw-bold text-danger">$ ${pTotalGlobal.toLocaleString('es-CO',{maximumFractionDigits:0})} COP</div>
                    <div class="fs-6 fw-bold text-success">US$ ${pTotalUSD.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2})} USD</div>
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

    let th = `<tr>
        <th rowspan="2" class="text-center" style="width:30px;">#</th>
        <th rowspan="2" style="width:110px;">FUENTE</th>
        <th rowspan="2" style="min-width:380px;">DESCRIPCIÓN</th>
        <th rowspan="2" style="width:130px;">CATEGORÍA</th>
        <th rowspan="2" style="width:60px;" class="text-center">CANT.</th>
        <th rowspan="2" style="width:90px;">U.M.</th>`;
    lotesSimulacion.forEach(lt => th += `<th colspan="2" class="text-center" style="background:#0f172a; color:#38bdf8;">Q: ${lt.q} <i class="bi bi-x-circle text-danger ms-1 cursor-pointer" onclick="eliminarLote('${lt.id}')"></i></th>`);
    th += `<th rowspan="2" class="text-center" style="width:35px;"><i class="bi bi-trash"></i></th></tr><tr>`;
    lotesSimulacion.forEach(lt => th += `<th class="text-center" style="background:#334155; color:white; font-size:0.7rem; width:90px;">$ UNIT.</th><th class="text-center" style="background:#475569; color:white; font-size:0.7rem; width:100px;">$ TOTAL</th>`);
    thead.innerHTML = th + `</tr>`;

    if (itemsPresupuesto.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${7+(lotesSimulacion.length*2)}" class="text-center text-muted py-4">Matriz vacía.</td></tr>`;
        return actualizarSimuladorFinanciero();
    }

    let umList = (CONFIG_GLOBAL && CONFIG_GLOBAL.unidades) ? CONFIG_GLOBAL.unidades.split('\n') : ["UND", "Metros", "kg"];
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
            <td><input type="text" class="form-control form-control-sm" value="${i.nombre}" onchange="actualizarCampo(${i.id},'nombre',this.value)"></td>
            <td><select class="form-select form-select-sm" onchange="actualizarCampo(${i.id},'categoria',this.value)">${CATEGORIAS.map(c=>`<option ${i.categoria===c?'selected':''}>${c}</option>`).join('')}</select></td>
            <td><input type="number" class="form-control form-control-sm text-center px-1" value="${i.cantidad}" onchange="actualizarCampo(${i.id},'cantidad',this.value)"></td>
            <td><select class="form-select form-select-sm px-1" onchange="actualizarCampo(${i.id},'um',this.value)">${umList.map(u=>`<option ${i.um===u.trim()?'selected':''}>${u.trim()}</option>`).join('')}</select></td>`;
        lotesSimulacion.forEach(lt => {
            let v = i.costos[lt.id] || 0;
            tb += `<td style="border-left:2px solid #cbd5e1;"><input type="number" class="form-control form-control-sm text-center fw-bold text-primary px-1" value="${v}" onchange="actualizarCostoItem(${i.id},'${lt.id}',this.value)"></td>
            <td class="text-end fw-bold align-middle" style="font-size:0.8rem;">$${(v*i.cantidad).toLocaleString('es-CO',{maximumFractionDigits:0})}</td>`;
        });
        tb += `<td class="text-center align-middle"><i class="bi bi-trash text-danger cursor-pointer fs-6" onclick="eliminarItem(${i.id})"></i></td></tr>`;
    });
    tbody.innerHTML = tb;
    inicializarDragAndDropMatrix();
    actualizarSimuladorFinanciero();
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

window.reemplazarMatrizDesdeIA = function(nuevaMatriz) {
    if (!Array.isArray(nuevaMatriz)) return;
    itemsPresupuesto = [];
    nuevaMatriz.forEach(m => {
        let nombreLimpio = (m.nombre || "Sin nombre").replace(/^\[.*?\]\s*-?\s*/, '').trim();
        let fuenteCorrecta = m.fuente || "[Estimado IA]";
        let n = { id: Date.now() + Math.random(), fuente: fuenteCorrecta, nombre: nombreLimpio, categoria: m.categoria || "Materias Primas", cantidad: parseFloat(m.cantidad) || 1, um: m.um || "UND", costos: {} };
        lotesSimulacion.forEach(l => n.costos[l.id] = parseFloat(m.costoUnitario) || 0);
        itemsPresupuesto.push(n);
    });
    renderizarTablaItems();
};
