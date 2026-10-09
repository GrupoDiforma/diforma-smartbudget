function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const bgMap = { 'success': 'text-bg-success', 'danger': 'text-bg-danger', 'warning': 'text-bg-warning', 'info': 'text-bg-primary' };
    const iconMap = { 'success': 'bi-check-circle-fill', 'danger': 'bi-exclamation-octagon-fill', 'warning': 'bi-exclamation-triangle-fill', 'info': 'bi-info-circle-fill' };
    const toastId = 'toast_' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgMap[tipo]} border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex"><div class="toast-body d-flex align-items-center gap-2"><i class="bi ${iconMap[tipo]} fs-5"></i><div>${mensaje}</div></div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>
        </div>`;
    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function mostrarAlertaOdoo(mensaje, tipo, cargando = false) {
    const alertBox = document.getElementById('odooAlert');
    if (!alertBox) return;
    let icon = cargando ? '<span class="spinner-border spinner-border-sm me-2"></span>' : '';
    alertBox.className = `alert alert-${tipo} py-2 px-3 mt-2 mb-0 d-flex align-items-center justify-content-between`;
    alertBox.innerHTML = `<div>${icon} <span>${mensaje}</span></div>`;
    alertBox.classList.remove('d-none');
    if (!cargando && tipo !== 'danger') setTimeout(() => alertBox.classList.add('d-none'), 6000);
}

async function realizarPeticionBD(payload) {
    const url = CONFIG_GLOBAL?.gasUrl;
    if (!url) throw new Error("Falta URL del proxy backend.");
    payload.authKey = localStorage.getItem('smartbudget_token') || "";
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    if(data.mensaje && data.mensaje.includes("Acceso no autorizado")) { localStorage.removeItem('smartbudget_token'); location.reload(); }
    return data;
}

// === FUNCIONES DE NEGOCIO RESTAURADAS ===
async function buscarOportunidadOdoo() {
    const input = document.getElementById('inputCodigo');
    if (!input) return;
    const codigo = input.value.trim();
    if (!codigo) return mostrarNotificacion("Ingresa un código válido", "warning");

    const btn = document.querySelector('button[onclick="buscarOportunidadOdoo()"]') || input.nextElementSibling;
    const btnOriginalText = btn ? btn.innerText : 'Buscar';
    
    if(btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    mostrarAlertaOdoo("Buscando en Odoo...", "info", true);

    try {
        const data = await realizarPeticionBD({ action: 'odoo_buscar', codigo: codigo });
        if (data.exito && data.data) {
            const op = data.data;
            const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
            setVal('noProyecto', op.name); setVal('cliente', op.partner_id ? op.partner_id[1] : ''); setVal('comercial', op.user_id ? op.user_id[1] : '');
            if (op.create_date) setVal('fecha', op.create_date.split(' ')[0]);
            mostrarAlertaOdoo("Oportunidad cargada correctamente", "success");
        } else { mostrarAlertaOdoo(data.mensaje || "Oportunidad no encontrada", "warning"); }
    } catch(e) { mostrarAlertaOdoo("Error conectando con Odoo", "danger"); }

    if(btn) { btn.disabled = false; btn.innerText = btnOriginalText; }
}

async function guardarProyectoBD() {
    const codigo = document.getElementById('inputCodigo')?.value.trim();
    if (!codigo) return mostrarNotificacion("Ingresa un código de oportunidad (Paso 1).", "warning");
    const payload = {
        cabecera: { noProyecto: codigo, cliente: document.getElementById('cliente')?.value || '', nombreProyecto: document.getElementById('noProyecto')?.value || '', tipoPresupuesto: document.getElementById('badgeTipo')?.innerText || 'NACIONAL' },
        datosAdicionales: { fecha: document.getElementById('fecha')?.value || '', comercial: document.getElementById('comercial')?.value || '', disenador: document.getElementById('disenador')?.value || '', analista: document.getElementById('analista')?.value || '' },
        matrizItems: typeof itemsPresupuesto !== 'undefined' ? itemsPresupuesto : [], escalas: typeof lotesSimulacion !== 'undefined' ? lotesSimulacion : []
    };
    mostrarNotificacion("Guardando en la Nube...", "info");
    try { const data = await realizarPeticionBD({ action: 'guardar', payload: payload }); mostrarNotificacion(data.mensaje, data.exito ? "success" : "danger"); } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

async function abrirHistorial() {
    const tbody = document.getElementById('tbodyHistorial');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Cargando historial...</td></tr>';
    new bootstrap.Modal(document.getElementById('modalHistorial')).show();
    try {
        const data = await realizarPeticionBD({ action: 'listar' });
        if(data.exito && data.data.length > 0) {
            tbody.innerHTML = data.data.map(p => `<tr><td class="text-danger fw-bold">${p.noProyecto}</td><td>${p.cliente || 'S/N'}</td><td>${p.requerimiento || 'S/N'}</td><td><span class="badge ${p.tipo==='EXPORTACION'?'bg-primary':'bg-danger'}">${p.tipo}</span></td><td class="text-muted" style="font-size:0.75rem;">${p.fechaGuardado}</td><td class="text-center"><button class="btn btn-sm btn-primary py-0 px-2 me-1" onclick="cargarProyectoBD('${p.id}')"><i class="bi bi-cloud-download"></i></button><button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarProyectoBD('${p.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
        } else { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proyectos.</td></tr>'; }
    } catch(e) { tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${e.message}</td></tr>`; }
}

async function cargarProyectoBD(idProyecto) {
    try {
        const data = await realizarPeticionBD({ action: 'obtener', id: idProyecto });
        if (data.exito && data.data) {
            const p = data.data; const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('inputCodigo', p.cabecera?.noProyecto); setVal('noProyecto', p.cabecera?.nombreProyecto); setVal('cliente', p.cabecera?.cliente);
            if(p.datosAdicionales) { setVal('fecha', p.datosAdicionales.fecha); setVal('comercial', p.datosAdicionales.comercial); setVal('disenador', p.datosAdicionales.disenador); setVal('analista', p.datosAdicionales.analista); }
            if (typeof itemsPresupuesto !== 'undefined') itemsPresupuesto = p.matrizItems || [];
            if (typeof lotesSimulacion !== 'undefined') lotesSimulacion = p.escalas || [{ id: 'l1', q: 1 }];
            if (typeof renderizarTablaItems === "function") renderizarTablaItems();
            bootstrap.Modal.getInstance(document.getElementById('modalHistorial'))?.hide();
            mostrarNotificacion(`Proyecto cargado.`, "success");
        }
    } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

async function eliminarProyectoBD(idProyecto) {
    if(!confirm('¿Eliminar de la Nube?')) return;
    try { const data = await realizarPeticionBD({ action: 'eliminar', id: idProyecto }); if(data.exito) { mostrarNotificacion(data.mensaje, "success"); abrirHistorial(); } } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

// INICIALIZADOR PRINCIPAL
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar configuración maestra y roles
    if(typeof cargarConfiguracionGlobal === "function") await cargarConfiguracionGlobal();
    if(typeof poblarSelectComisiones === "function") poblarSelectComisiones();
    if(typeof verificarAccesoCorporativo === "function") verificarAccesoCorporativo();
    
    // 2. Ejecutar funciones externas (Si existen en otros archivos)
    if(typeof obtenerTRMOficial === "function") await obtenerTRMOficial();
    if(typeof renderizarTablaItems === "function") renderizarTablaItems();
    if(typeof inicializarDragAndDropArchivos === "function") inicializarDragAndDropArchivos();
    
    // 3. Listeners
    ['simTRM', 'simComision', 'simFee'].forEach(id => { const el = document.getElementById(id); if(el) el.onchange = () => typeof actualizarSimuladorFinanciero === "function" && actualizarSimuladorFinanciero(); });
});
