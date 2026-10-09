let CONFIG_GLOBAL = null;

async function cargarConfiguracionGlobal() {
    try {
        const res = await fetch('config.json');
        let baseConfig = res.ok ? await res.json() : {};
        const localDataStr = localStorage.getItem('smartbudget_admin');
        if (localDataStr) {
            let localData = JSON.parse(localDataStr);
            if (!localData.gasUrl && baseConfig.gasUrl) {
                localData.gasUrl = baseConfig.gasUrl;
            }
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

function mostrarAlertaOdoo(mensaje, tipo, cargando = false) {
    const alertBox = document.getElementById('odooAlert');
    if (!alertBox) return;
    let icon = cargando ? '<span class="spinner-border spinner-border-sm me-2"></span>' : '';
    alertBox.className = `alert alert-${tipo} py-2 px-3 mt-2 mb-0 d-flex align-items-center justify-content-between`;
    alertBox.innerHTML = `<div>${icon} <span>${mensaje}</span></div>`;
    alertBox.classList.remove('d-none');
    if (!cargando && tipo !== 'danger') setTimeout(() => alertBox.classList.add('d-none'), 6000);
}

function mostrarAlertaOdooLogin(gasUrl) {
    const alertBox = document.getElementById('odooAlert');
    if (!alertBox) return;
    alertBox.className = `alert alert-warning py-2 px-3 mt-2 mb-0 d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm border-warning`;
    alertBox.innerHTML = `
        <div>
            <i class="bi bi-shield-lock-fill me-2 fs-5 text-warning"></i>
            <strong>Sesión de Google no detectada (@grupodiforma.com)</strong>
            <div class="small text-muted mt-1">Si estás en modo incógnito o no has iniciado sesión en Google con tu correo corporativo, la conexión se bloquea.</div>
        </div>
        <a href="${gasUrl}" target="_blank" class="btn btn-sm btn-primary fw-bold px-3">
            <i class="bi bi-box-arrow-up-right me-1"></i> Iniciar Sesión en Google
        </a>`;
    alertBox.classList.remove('d-none');
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
    CONFIG_GLOBAL = data;
    
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

async function realizarPeticionBD(payload) {
    const url = CONFIG_GLOBAL?.gasUrl;
    if (!url) {
        mostrarNotificacion("Configura la URL de Google Script en Ajustes.", "danger");
        throw new Error("URL_MISSING");
    }
    try {
        const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return await res.json();
    } catch (err) {
        if (err.name === 'TypeError' || (err.message && (err.message.includes('fetch') || err.message.includes('Failed')))) {
            mostrarAlertaOdooLogin(url);
            throw new Error("Sesión no detectada en Google. Inicia sesión con tu correo @grupodiforma.com.");
        }
        throw err;
    }
}

async function guardarProyectoBD() {
    const codigo = document.getElementById('inputCodigo')?.value.trim() || document.getElementById('noProyecto')?.value.trim();
    if (!codigo) return mostrarNotificacion("Ingresa un código de oportunidad (Paso 1).", "warning");

    const payloadProyecto = {
        cabecera: {
            noProyecto: codigo, 
            cliente: document.getElementById('cliente')?.value || '', 
            nombreProyecto: document.getElementById('noProyecto')?.value || '', 
            tipoPresupuesto: document.getElementById('badgeTipo')?.innerText || 'NACIONAL'
        },
        datosAdicionales: {
            fecha: document.getElementById('fecha')?.value || '', 
            comercial: document.getElementById('comercial')?.value || '', 
            disenador: document.getElementById('disenador')?.value || '', 
            analista: document.getElementById('analista')?.value || ''
        },
        matrizItems: typeof itemsPresupuesto !== 'undefined' ? itemsPresupuesto : [],
        escalas: typeof lotesSimulacion !== 'undefined' ? lotesSimulacion : []
    };

    mostrarNotificacion("Guardando en la Nube...", "info");
    try {
        const data = await realizarPeticionBD({ action: 'guardar', payload: payloadProyecto });
        if(data.exito) mostrarNotificacion(data.mensaje, "success");
        else mostrarNotificacion("Error BD: " + data.mensaje, "danger");
    } catch(e) { if(e.message !== "URL_MISSING") mostrarNotificacion(e.message, "danger"); }
}

async function abrirHistorial() {
    if (!CONFIG_GLOBAL?.gasUrl) return mostrarNotificacion("Configura la URL de Google Script en Ajustes.", "danger");
    const tbody = document.getElementById('tbodyHistorial');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Cargando historial de la nube...</td></tr>';
    new bootstrap.Modal(document.getElementById('modalHistorial')).show();

    try {
        const data = await realizarPeticionBD({ action: 'listar' });
        if(data.exito && data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(p => `
            <tr>
                <td class="text-danger fw-bold">${p.noProyecto}</td>
                <td>${p.cliente || 'S/N'}</td>
                <td>${p.requerimiento || 'S/N'}</td>
                <td><span class="badge ${p.tipo==='EXPORTACION'?'bg-primary':'bg-danger'}">${p.tipo}</span></td>
                <td class="text-muted" style="font-size:0.75rem;">${p.fechaGuardado}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary py-0 px-2 me-1" onclick="cargarProyectoBD('${p.id || p.noProyecto}')"><i class="bi bi-cloud-download"></i></button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarProyectoBD('${p.id || p.noProyecto}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proyectos en la base de datos.</td></tr>';
        }
    } catch(e) { tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${e.message}</td></tr>`; }
}

async function cargarProyectoBD(idProyecto) {
    mostrarNotificacion("Descargando proyecto...", "info");
    try {
        const data = await realizarPeticionBD({ action: 'obtener', id: idProyecto });
        if (data.exito && data.data) {
            const p = data.data;
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

            setVal('inputCodigo', p.cabecera?.noProyecto);
            setVal('noProyecto', p.cabecera?.nombreProyecto);
            setVal('cliente', p.cabecera?.cliente);
            
            const badge = document.getElementById('badgeTipo');
            if(badge) {
                badge.innerText = p.cabecera?.tipoPresupuesto || 'NACIONAL';
                badge.className = p.cabecera?.tipoPresupuesto === "EXPORTACION" ? "badge bg-primary px-2 py-1" : "badge badge-nacional px-2 py-1";
            }
            if(p.datosAdicionales) {
                setVal('fecha', p.datosAdicionales.fecha);
                setVal('comercial', p.datosAdicionales.comercial || p.datosAdicionales.ejecutiva);
                setVal('disenador', p.datosAdicionales.disenador);
                setVal('analista', p.datosAdicionales.analista);
            }
            if (typeof itemsPresupuesto !== 'undefined') itemsPresupuesto = p.matrizItems || [];
            if (typeof lotesSimulacion !== 'undefined') lotesSimulacion = p.escalas || [{ id: 'l1', q: 1 }];
            if (typeof renderizarTablaItems === "function") renderizarTablaItems();
            bootstrap.Modal.getInstance(document.getElementById('modalHistorial'))?.hide();
            mostrarNotificacion(`Proyecto ${idProyecto} cargado con éxito.`, "success");
        } else { mostrarNotificacion("Error al descargar: " + data.mensaje, "danger"); }
    } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

async function eliminarProyectoBD(idProyecto) {
    if(!confirm(`¿Seguro que deseas eliminar el proyecto ${idProyecto} de la Nube?`)) return;
    try {
        const data = await realizarPeticionBD({ action: 'eliminar', id: idProyecto });
        if(data.exito) { mostrarNotificacion(data.mensaje, "success"); abrirHistorial(); } 
        else { mostrarNotificacion("Error: " + data.mensaje, "danger"); }
    } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracionGlobal();
    poblarSelectComisiones();
    if(typeof obtenerTRMOficial === "function") await obtenerTRMOficial();
    if(typeof renderizarTablaItems === "function") renderizarTablaItems();
    if(typeof inicializarDragAndDropArchivos === "function") inicializarDragAndDropArchivos();
    ['simTRM', 'simComision', 'simFee'].forEach(id => { const el = document.getElementById(id); if(el) el.onchange = () => typeof actualizarSimuladorFinanciero === "function" && actualizarSimuladorFinanciero(); });
});
