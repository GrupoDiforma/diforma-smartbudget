window.archivosGemaBase64 = [];
window.procesarArchivosNativos = function(files) { if(!files || files.length===0) return; Array.from(files).forEach(file => { const reader = new FileReader(); reader.onload = e => { if(e.target.result) { window.archivosGemaBase64.push({ name: file.name, mimeType: file.type || 'image/jpeg', data: e.target.result.split(',')[1] }); window.actualizarListaUI(); } }; reader.readAsDataURL(file); }); };
window.actualizarListaUI = function() {
    const c = document.getElementById('listaArchivosContainer');
    const s = document.getElementById('dropzoneStatusText');
    const box = document.getElementById('dropzoneBox');
    const n = (window.archivosGemaBase64 || []).length;
    if (box) box.classList.toggle('is-compact', n > 0);
    if (s) s.innerText = n > 0 ? `+ agregar más (${n})` : "Renders, planos, fichas, PDF, JPG o PNG";
    if (c) c.innerHTML = (window.archivosGemaBase64 || []).map((f, i) => `<div class="d-flex justify-content-between align-items-center bg-white border p-1 rounded mb-1" style="font-size:0.75rem;"><span class="text-truncate"><i class="bi bi-file-earmark me-1"></i>${f.name}</span><i class="bi bi-x text-danger cursor-pointer fs-5" onclick="window.eliminarGemaArchivo(${i})"></i></div>`).join('');
    const bar = document.getElementById('chatAdjuntosBar');
    if (bar) bar.innerHTML = n ? `<small class="text-muted"><i class="bi bi-paperclip"></i> ${n} archivo(s) irán con el próximo mensaje a la IA</small>` : '';
    if (typeof actualizarBotonGenerar === "function") actualizarBotonGenerar();
};
window.eliminarGemaArchivo = function(idx) { window.archivosGemaBase64.splice(idx, 1); window.actualizarListaUI(); };
function habilitarDropEn(el) {
    if (!el) return;
    ['dragover','dragenter'].forEach(e => el.addEventListener(e, ev => { ev.preventDefault(); el.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(e => el.addEventListener(e, ev => { ev.preventDefault(); el.classList.remove('dragover'); }));
    el.addEventListener('drop', ev => { ev.preventDefault(); if (ev.dataTransfer.files.length > 0) window.procesarArchivosNativos(ev.dataTransfer.files); });
}
function inicializarDragAndDropArchivos() {
    habilitarDropEn(document.getElementById('dropzoneBox'));
    habilitarDropEn(document.getElementById('chatBox'));
}

function mercadoActual() {
    const sel = document.getElementById("selMercado");
    if (sel && sel.value) return sel.value;
    return (document.getElementById("badgeTipo")?.innerText || "NACIONAL").trim();
}
function aplicarMercado(tipo) {
    const t = String(tipo || "NACIONAL").toUpperCase().includes("EXPORT") ? "EXPORTACION" : "NACIONAL";
    const sel = document.getElementById("selMercado");
    if (sel) sel.value = t;
    const badge = document.getElementById("badgeTipo");
    if (badge) badge.innerText = t;
    if (typeof renderizarTablaItems === "function") renderizarTablaItems();
    else if (typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
}

function abrirModalOdooMateriales() { new bootstrap.Modal(document.getElementById('modalOdooMateriales')).show(); }

async function buscarProyectoOdooServerless() {
    const cod = document.getElementById('inputCodigo')?.value.trim();
    if(!cod) return mostrarAlertaOdoo("Ingresa código.", "warning");
    mostrarAlertaOdoo("Conectando con Servidor...", "info", true);
    try {
        const data = await realizarPeticionBD({ action: 'odoo_buscar', codigo: cod });
        if(!data.exito) throw new Error(data.mensaje);
        const rec = data.data;
        let tipo = (rec.pricelist_id && rec.pricelist_id[1] && rec.pricelist_id[1].toLowerCase().includes("usd")) ? "EXPORTACION" : "NACIONAL";
        
        // Asignación segura en el DOM
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        
        setVal('noProyecto', rec.name || cod);
        setVal('cliente', rec.partner_id ? rec.partner_id[1] : '');
        setVal('fecha', rec.create_date ? rec.create_date.substring(0, 10) : '');
        setVal('comercial', rec.id_vendedor ? rec.id_vendedor[1] : (rec.user_id ? rec.user_id[1] : ''));
        setVal('disenador', rec.id_disenador ? rec.id_disenador[1] : '');
        setVal('analista', rec.id_presupuestador ? rec.id_presupuestador[1] : '');

        if (typeof aplicarMercado === "function") aplicarMercado(tipo);
        if (typeof window.limpiarMesaDeTrabajo === "function") window.limpiarMesaDeTrabajo();
        mostrarAlertaOdoo("¡Proyecto importado!", "success");
    } catch(e) { mostrarAlertaOdoo("Error: " + e.message, "danger"); }
}

async function buscarProductosOdooServerless() {
    const q = document.getElementById('inputBusquedaMat')?.value.trim();
    const tb = document.getElementById('tbodyResultadosOdoo');
    if(!q) return;
    tb.innerHTML = '<tr><td colspan="5" class="text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Buscando en Servidor...</td></tr>';
    try {
        const data = await realizarPeticionBD({ action: 'odoo_productos', query: q });
        if(!data.exito) throw new Error(data.mensaje);
        if(!data.data || data.data.length === 0) return tb.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin resultados.</td></tr>';
        tb.innerHTML = data.data.map(p => `<tr><td><code>${p.default_code||''}</code></td><td>${p.name}</td><td><small>${p.categ_id?p.categ_id[1]:''}</small></td><td class="text-end fw-bold text-danger">$${(p.standard_price||0).toLocaleString('es-CO')}</td><td class="text-center"><button class="btn btn-sm btn-success py-0 px-2" onclick='agregarMaterialOdoo(${JSON.stringify({nombre:p.name, categoria:p.categ_id?p.categ_id[1]:'Materias Primas', um:p.uom_id?p.uom_id[1]:'UND', costoUnitario:p.standard_price||0}).replace(/'/g, "&apos;")})'><i class="bi bi-plus-lg"></i></button></td></tr>`).join('');
    } catch(e) { tb.innerHTML = `<tr><td colspan="5" class="text-danger">Error: ${e.message}</td></tr>`; }
}

function agregarMaterialOdoo(p) {
    let um = p.um || "UND";
    if (/^unidades$/i.test(um)) um = "UND";
    itemsPresupuesto.push({ id: Date.now()+Math.random(), fuente: "[Odoo ERP]", nombre: p.nombre, categoria: p.categoria, cantidad: 1, um: um, costoUnitario: p.costoUnitario, costos:{} });
    lotesSimulacion.forEach(l => itemsPresupuesto[itemsPresupuesto.length-1].costos[l.id]=p.costoUnitario);
    renderizarTablaItems();
    mostrarNotificacion("Agregado a matriz", "success");
    bootstrap.Modal.getInstance(document.getElementById('modalOdooMateriales'))?.hide();
}
