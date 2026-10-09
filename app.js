let CONFIG_GLOBAL = null;

async function cargarConfiguracionGlobal() {
    try {
        const res = await fetch('config.json');
        let baseConfig = res.ok ? await res.json() : {};
        const localDataStr = localStorage.getItem('smartbudget_admin');
        if (localDataStr) {
            let localData = JSON.parse(localDataStr);
            if (!localData.gasUrl && baseConfig.gasUrl) localData.gasUrl = baseConfig.gasUrl;
            
            // Regla de autosanación: Si los prompts están vacíos en LocalStorage, restaurar desde config.json
            if (!localData.promptMaestro && baseConfig.promptMaestro) localData.promptMaestro = baseConfig.promptMaestro;
            if (!localData.promptLogistico && baseConfig.promptLogistico) localData.promptLogistico = baseConfig.promptLogistico;

            localData.operativos = { ...baseConfig.operativos, ...(localData.operativos || {}) };
            localData.utilidadNal = { ...baseConfig.utilidadNal, ...(localData.utilidadNal || {}) };
            localData.utilidadExp = { ...baseConfig.utilidadExp, ...(localData.utilidadExp || {}) };
            CONFIG_GLOBAL = { ...baseConfig, ...localData };
        } else {
            CONFIG_GLOBAL = baseConfig;
        }
        return CONFIG_GLOBAL;
    } catch (err) { console.error("Error cargando config:", err); }
}

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

function abrirModalAdmin() {
    if(!CONFIG_GLOBAL) return;
    const d = CONFIG_GLOBAL;
    
    if(document.getElementById('cfgGasUrl')) document.getElementById('cfgGasUrl').value = d.gasUrl || '';
    if(document.getElementById('cfgTarifas')) document.getElementById('cfgTarifas').value = d.tarifasFijas || '';
    if(document.getElementById('cfgUnidades')) document.getElementById('cfgUnidades').value = d.unidades || '';
    if(document.getElementById('cfgPrompt')) document.getElementById('cfgPrompt').value = d.promptMaestro || '';
    if(document.getElementById('cfgPromptLogistico')) document.getElementById('cfgPromptLogistico').value = d.promptLogistico || '';
    if(document.getElementById('cfgComisiones')) document.getElementById('cfgComisiones').value = d.comisiones || '';
    
    if(d.operativos) {
        if(document.getElementById('cfgTopeOpFab')) document.getElementById('cfgTopeOpFab').value = d.operativos.topeFab || 0;
        if(document.getElementById('cfgTopeOpCom')) document.getElementById('cfgTopeOpCom').value = d.operativos.topeCom || 0;
        if(document.getElementById('cfgImpFabMax')) document.getElementById('cfgImpFabMax').value = d.operativos.impFab?.max || 0;
        if(document.getElementById('cfgImpFabMin')) document.getElementById('cfgImpFabMin').value = d.operativos.impFab?.min || 0;
        if(document.getElementById('cfgIndFabMax')) document.getElementById('cfgIndFabMax').value = d.operativos.indFab?.max || 0;
        if(document.getElementById('cfgIndFabMin')) document.getElementById('cfgIndFabMin').value = d.operativos.indFab?.min || 0;
        if(document.getElementById('cfgIndComMax')) document.getElementById('cfgIndComMax').value = d.operativos.indCom?.max || 0;
        if(document.getElementById('cfgIndComMin')) document.getElementById('cfgIndComMin').value = d.operativos.indCom?.min || 0;
    }

    if(d.utilidadNal) {
        if(document.getElementById('n_fabTope')) document.getElementById('n_fabTope').value = d.utilidadNal.fab?.tope || 0;
        if(document.getElementById('n_fabMax')) document.getElementById('n_fabMax').value = d.utilidadNal.fab?.max || 0;
        if(document.getElementById('n_fabMin')) document.getElementById('n_fabMin').value = d.utilidadNal.fab?.min || 0;
        if(document.getElementById('n_comTope')) document.getElementById('n_comTope').value = d.utilidadNal.com?.tope || 0;
        if(document.getElementById('n_comMax')) document.getElementById('n_comMax').value = d.utilidadNal.com?.max || 0;
        if(document.getElementById('n_comMin')) document.getElementById('n_comMin').value = d.utilidadNal.com?.min || 0;
    }

    if(d.utilidadExp) {
        if(document.getElementById('e_fabTope')) document.getElementById('e_fabTope').value = d.utilidadExp.fab?.tope || 0;
        if(document.getElementById('e_fabMax')) document.getElementById('e_fabMax').value = d.utilidadExp.fab?.max || 0;
        if(document.getElementById('e_fabMin')) document.getElementById('e_fabMin').value = d.utilidadExp.fab?.min || 0;
        if(document.getElementById('e_comTope')) document.getElementById('e_comTope').value = d.utilidadExp.com?.tope || 0;
        if(document.getElementById('e_comMax')) document.getElementById('e_comMax').value = d.utilidadExp.com?.max || 0;
        if(document.getElementById('e_comMin')) document.getElementById('e_comMin').value = d.utilidadExp.com?.min || 0;
    }

    new bootstrap.Modal(document.getElementById('modalAdmin')).show();
}

function guardarConfiguracion() {
    const getVal = id => { const el = document.getElementById(id); return el ? parseFloat(el.value) || 0 : 0; };

    const data = {
        gasUrl: document.getElementById('cfgGasUrl')?.value.trim() || '',
        tarifasFijas: document.getElementById('cfgTarifas')?.value || '',
        unidades: document.getElementById('cfgUnidades')?.value || '',
        promptMaestro: document.getElementById('cfgPrompt')?.value || '',
        promptLogistico: document.getElementById('cfgPromptLogistico')?.value || '',
        comisiones: document.getElementById('cfgComisiones')?.value || '',
        operativos: {
            topeFab: getVal('cfgTopeOpFab'), topeCom: getVal('cfgTopeOpCom'),
            impFab: { max: getVal('cfgImpFabMax'), min: getVal('cfgImpFabMin') },
            indFab: { max: getVal('cfgIndFabMax'), min: getVal('cfgIndFabMin') },
            indCom: { max: getVal('cfgIndComMax'), min: getVal('cfgIndComMin') }
        },
        utilidadNal: {
            fab: { tope: getVal('n_fabTope'), max: getVal('n_fabMax'), min: getVal('n_fabMin') },
            com: { tope: getVal('n_comTope'), max: getVal('n_comMax'), min: getVal('n_comMin') }
        },
        utilidadExp: {
            fab: { tope: getVal('e_fabTope'), max: getVal('e_fabMax'), min: getVal('e_fabMin') },
            com: { tope: getVal('e_comTope'), max: getVal('e_comMax'), min: getVal('e_comMin') }
        }
    };
    
    localStorage.setItem('smartbudget_admin', JSON.stringify(data));
    CONFIG_GLOBAL = { ...CONFIG_GLOBAL, ...data };
    poblarSelectComisiones();
    mostrarNotificacion("Ajustes guardados exitosamente.", "success");
    bootstrap.Modal.getInstance(document.getElementById('modalAdmin'))?.hide();
    if(typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
}

function poblarSelectComisiones() {
    const sel = document.getElementById('simComision');
    if(!sel || !CONFIG_GLOBAL || !CONFIG_GLOBAL.comisiones) return;
    sel.innerHTML = CONFIG_GLOBAL.comisiones.split('\n').map(l => {
        let p = l.split(':');
        return p.length === 2 ? `<option value="${p[1].trim()}">${p[0].trim()} (${p[1].trim()}%)</option>` : '';
    }).join('');
}

// ----------------------------------------------------
// NÚCLEO DE SEGURIDAD Y PETICIONES AL BACKEND
// ----------------------------------------------------
async function realizarPeticionBD(payload) {
    const url = CONFIG_GLOBAL?.gasUrl;
    if (!url) throw new Error("Falta URL del proxy backend.");
    payload.authKey = localStorage.getItem('smartbudget_token') || "";

    const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    
    if(data.mensaje && data.mensaje.includes("Acceso no autorizado")) {
        localStorage.removeItem('smartbudget_token');
        location.reload();
    }
    return data;
}

// ----------------------------------------------------
// UI DE AUTENTICACIÓN OTP (BLOQUEO DE PANTALLA)
// ----------------------------------------------------
function verificarAccesoCorporativo() {
    if (localStorage.getItem('smartbudget_token')) return;
    
    document.body.insertAdjacentHTML('beforeend', `
        <div id="authOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(241, 245, 249, 0.98);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div class="card p-4 shadow-lg text-center" style="max-width:400px; width:90%; border-top: 5px solid #d32f2f;">
                <h3 class="mb-3 text-dark"><i class="bi bi-shield-lock-fill text-danger me-2"></i>Acceso Seguro</h3>
                <p class="text-muted small mb-4">Ingresa tu correo corporativo para recibir un código de acceso.</p>
                
                <div id="stepEmail">
                    <input type="email" id="authEmail" class="form-control mb-3 text-center" placeholder="usuario@grupodiforma.com">
                    <button class="btn btn-danger w-100 fw-bold" id="btnSolicitar" onclick="ui_solicitarOTP()">1. Recibir Código</button>
                </div>
                
                <div id="stepCode" class="d-none">
                    <div class="alert alert-success py-2 small mb-3">✔ Código enviado. Revisa tu bandeja de entrada.</div>
                    <input type="text" id="authCode" class="form-control mb-3 text-center fs-3 fw-bold" placeholder="• • • • • •" maxlength="6" style="letter-spacing: 5px;">
                    <button class="btn btn-success w-100 fw-bold" id="btnVerificar" onclick="ui_verificarOTP()">2. Validar y Entrar</button>
                    <button class="btn btn-link w-100 mt-2 text-muted small" onclick="document.getElementById('stepCode').classList.add('d-none');document.getElementById('stepEmail').classList.remove('d-none');">Usar otro correo</button>
                </div>
            </div>
        </div>
    `);
}

async function ui_solicitarOTP() {
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    if(!email.endsWith('@grupodiforma.com')) return alert("Por favor usa un correo válido de @grupodiforma.com");
    
    document.getElementById('btnSolicitar').innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    document.getElementById('btnSolicitar').disabled = true;
    
    try {
        const res = await fetch(CONFIG_GLOBAL.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'solicitar_otp', email: email }) });
        const data = await res.json();
        if(data.exito) {
            document.getElementById('stepEmail').classList.add('d-none');
            document.getElementById('stepCode').classList.remove('d-none');
        } else { alert(data.mensaje); }
    } catch(e) { alert("Error de red."); }
    
    document.getElementById('btnSolicitar').innerHTML = '1. Recibir Código';
    document.getElementById('btnSolicitar').disabled = false;
}

async function ui_verificarOTP() {
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    const code = document.getElementById('authCode').value.trim();
    if(code.length !== 6) return alert("Ingresa el código de 6 dígitos.");
    
    document.getElementById('btnVerificar').innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';
    document.getElementById('btnVerificar').disabled = true;
    
    try {
        const res = await fetch(CONFIG_GLOBAL.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'verificar_otp', email: email, otp: code }) });
        const data = await res.json();
        if(data.exito) {
            localStorage.setItem('smartbudget_token', data.token);
            document.getElementById('authOverlay').remove();
            mostrarNotificacion("Acceso corporativo concedido.", "success");
        } else { alert(data.mensaje); }
    } catch(e) { alert("Error validando el código."); }
    
    document.getElementById('btnVerificar').innerHTML = '2. Validar y Entrar';
    document.getElementById('btnVerificar').disabled = false;
}

// ----------------------------------------------------
// FUNCIONES DE NEGOCIO (HISTORIAL, GUARDAR)
// ----------------------------------------------------
async function guardarProyectoBD() {
    const codigo = document.getElementById('inputCodigo')?.value.trim();
    if (!codigo) return mostrarNotificacion("Ingresa un código de oportunidad (Paso 1).", "warning");
    const payload = {
        cabecera: { noProyecto: codigo, cliente: document.getElementById('cliente')?.value || '', nombreProyecto: document.getElementById('noProyecto')?.value || '', tipoPresupuesto: document.getElementById('badgeTipo')?.innerText || 'NACIONAL' },
        datosAdicionales: { fecha: document.getElementById('fecha')?.value || '', comercial: document.getElementById('comercial')?.value || '', disenador: document.getElementById('disenador')?.value || '', analista: document.getElementById('analista')?.value || '' },
        matrizItems: typeof itemsPresupuesto !== 'undefined' ? itemsPresupuesto : [],
        escalas: typeof lotesSimulacion !== 'undefined' ? lotesSimulacion : []
    };
    mostrarNotificacion("Guardando en la Nube...", "info");
    try {
        const data = await realizarPeticionBD({ action: 'guardar', payload: payload });
        mostrarNotificacion(data.mensaje, data.exito ? "success" : "danger");
    } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

async function abrirHistorial() {
    const tbody = document.getElementById('tbodyHistorial');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Cargando historial...</td></tr>';
    new bootstrap.Modal(document.getElementById('modalHistorial')).show();
    try {
        const data = await realizarPeticionBD({ action: 'listar' });
        if(data.exito && data.data.length > 0) {
            tbody.innerHTML = data.data.map(p => `<tr>
                <td class="text-danger fw-bold">${p.noProyecto}</td><td>${p.cliente || 'S/N'}</td><td>${p.requerimiento || 'S/N'}</td>
                <td><span class="badge ${p.tipo==='EXPORTACION'?'bg-primary':'bg-danger'}">${p.tipo}</span></td><td class="text-muted" style="font-size:0.75rem;">${p.fechaGuardado}</td>
                <td class="text-center"><button class="btn btn-sm btn-primary py-0 px-2 me-1" onclick="cargarProyectoBD('${p.id}')"><i class="bi bi-cloud-download"></i></button>
                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarProyectoBD('${p.id}')"><i class="bi bi-trash"></i></button></td>
            </tr>`).join('');
        } else { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proyectos.</td></tr>'; }
    } catch(e) { tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${e.message}</td></tr>`; }
}

async function cargarProyectoBD(idProyecto) {
    try {
        const data = await realizarPeticionBD({ action: 'obtener', id: idProyecto });
        if (data.exito && data.data) {
            const p = data.data;
            document.getElementById('inputCodigo').value = p.cabecera?.noProyecto || '';
            document.getElementById('noProyecto').value = p.cabecera?.nombreProyecto || '';
            document.getElementById('cliente').value = p.cabecera?.cliente || '';
            if(p.datosAdicionales) {
                document.getElementById('fecha').value = p.datosAdicionales.fecha || '';
                document.getElementById('comercial').value = p.datosAdicionales.comercial || '';
                document.getElementById('disenador').value = p.datosAdicionales.disenador || '';
                document.getElementById('analista').value = p.datosAdicionales.analista || '';
            }
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
    try {
        const data = await realizarPeticionBD({ action: 'eliminar', id: idProyecto });
        if(data.exito) { mostrarNotificacion(data.mensaje, "success"); abrirHistorial(); }
    } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracionGlobal();
    poblarSelectComisiones();
    if(typeof obtenerTRMOficial === "function") await obtenerTRMOficial();
    if(typeof renderizarTablaItems === "function") renderizarTablaItems();
    if(typeof inicializarDragAndDropArchivos === "function") inicializarDragAndDropArchivos();
    ['simTRM', 'simComision', 'simFee'].forEach(id => { const el = document.getElementById(id); if(el) el.onchange = () => typeof actualizarSimuladorFinanciero === "function" && actualizarSimuladorFinanciero(); });
    
    verificarAccesoCorporativo();
});
