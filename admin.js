// Usamos var para que la variable sea accesible globalmente por los otros archivos
var CONFIG_GLOBAL = null;

async function cargarConfiguracionGlobal() {
    try {
        const resBase = await fetch('config.json');
        let baseConfig = resBase.ok ? await resBase.json() : {};
        let remotaConfig = null;
        if (baseConfig.gasUrl) {
            try {
                const resRemoto = await fetch(baseConfig.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'obtener_config' }) });
                const dataRemota = await resRemoto.json();
                if (dataRemota.exito && dataRemota.data) remotaConfig = dataRemota.data;
            } catch(e) { console.warn("Modo offline o error al traer config remota."); }
        }
        CONFIG_GLOBAL = remotaConfig ? { ...baseConfig, ...remotaConfig } : baseConfig;
        if (!CONFIG_GLOBAL.gasUrl) CONFIG_GLOBAL.gasUrl = baseConfig.gasUrl;
        
        if (typeof aplicarControlDeRoles === "function") aplicarControlDeRoles();
        return CONFIG_GLOBAL;
    } catch (err) { console.error("Error cargando config:", err); }
}

function abrirModalAdmin() {
    if(!CONFIG_GLOBAL) return;
    const d = CONFIG_GLOBAL;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || (val===0?0:''); };
    
    setVal('cfgGasUrl', d.gasUrl); setVal('cfgTarifas', d.tarifasFijas); setVal('cfgUnidades', d.unidades);
    setVal('cfgPrompt', d.promptMaestro); setVal('cfgPromptLogistico', d.promptLogistico); setVal('cfgComisiones', d.comisiones);
    
    if(d.operativos) {
        setVal('cfgTopeOpFab', d.operativos.topeFab); setVal('cfgTopeOpCom', d.operativos.topeCom);
        setVal('cfgImpFabMax', d.operativos.impFab?.max); setVal('cfgImpFabMin', d.operativos.impFab?.min);
        setVal('cfgIndFabMax', d.operativos.indFab?.max); setVal('cfgIndFabMin', d.operativos.indFab?.min);
        setVal('cfgIndComMax', d.operativos.indCom?.max); setVal('cfgIndComMin', d.operativos.indCom?.min);
    }
    if(d.utilidadNal) {
        setVal('n_fabTope', d.utilidadNal.fab?.tope); setVal('n_fabMax', d.utilidadNal.fab?.max); setVal('n_fabMin', d.utilidadNal.fab?.min);
        setVal('n_comTope', d.utilidadNal.com?.tope); setVal('n_comMax', d.utilidadNal.com?.max); setVal('n_comMin', d.utilidadNal.com?.min);
    }
    if(d.utilidadExp) {
        setVal('e_fabTope', d.utilidadExp.fab?.tope); setVal('e_fabMax', d.utilidadExp.fab?.max); setVal('e_fabMin', d.utilidadExp.fab?.min);
        setVal('e_comTope', d.utilidadExp.com?.tope); setVal('e_comMax', d.utilidadExp.com?.max); setVal('e_comMin', d.utilidadExp.com?.min);
    }
    new bootstrap.Modal(document.getElementById('modalAdmin')).show();
}

async function guardarConfiguracion() {
    const email = localStorage.getItem('smartbudget_email');
    const token = localStorage.getItem('smartbudget_token');
    if (!email || !token) return alert("Sesión inválida.");

    const getVal = id => { const el = document.getElementById(id); return el ? parseFloat(el.value) || 0 : 0; };
    const data = {
        gasUrl: document.getElementById('cfgGasUrl')?.value.trim() || CONFIG_GLOBAL.gasUrl,
        tarifasFijas: document.getElementById('cfgTarifas')?.value || '',
        unidades: document.getElementById('cfgUnidades')?.value || '',
        promptMaestro: document.getElementById('cfgPrompt')?.value || '',
        promptLogistico: document.getElementById('cfgPromptLogistico')?.value || '',
        comisiones: document.getElementById('cfgComisiones')?.value || '',
        operativos: { topeFab: getVal('cfgTopeOpFab'), topeCom: getVal('cfgTopeOpCom'), impFab: { max: getVal('cfgImpFabMax'), min: getVal('cfgImpFabMin') }, indFab: { max: getVal('cfgIndFabMax'), min: getVal('cfgIndFabMin') }, indCom: { max: getVal('cfgIndComMax'), min: getVal('cfgIndComMin') } },
        utilidadNal: { fab: { tope: getVal('n_fabTope'), max: getVal('n_fabMax'), min: getVal('n_fabMin') }, com: { tope: getVal('n_comTope'), max: getVal('n_comMax'), min: getVal('n_comMin') } },
        utilidadExp: { fab: { tope: getVal('e_fabTope'), max: getVal('e_fabMax'), min: getVal('e_fabMin') }, com: { tope: getVal('e_comTope'), max: getVal('e_comMax'), min: getVal('e_comMin') } }
    };
    
    if(typeof mostrarNotificacion === "function") mostrarNotificacion("Sincronizando configuración...", "info");
    try {
        const res = await fetch(CONFIG_GLOBAL.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'guardar_config', payload: data, email: email, authKey: token }) });
        const resData = await res.json();
        if (resData.exito) {
            CONFIG_GLOBAL = data;
            poblarSelectComisiones();
            if(typeof mostrarNotificacion === "function") mostrarNotificacion(resData.mensaje, "success");
            bootstrap.Modal.getInstance(document.getElementById('modalAdmin'))?.hide();
            if(typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
        } else { if(typeof mostrarNotificacion === "function") mostrarNotificacion("Error: " + resData.mensaje, "danger"); }
    } catch(e) { if(typeof mostrarNotificacion === "function") mostrarNotificacion("Error de red guardando configuración.", "danger"); }
}

function poblarSelectComisiones() {
    const sel = document.getElementById('simComision');
    if(!sel || !CONFIG_GLOBAL || !CONFIG_GLOBAL.comisiones) return;
    sel.innerHTML = CONFIG_GLOBAL.comisiones.split('\n').map(l => {
        let p = l.split(':'); return p.length === 2 ? `<option value="${p[1].trim()}">${p[0].trim()} (${p[1].trim()}%)</option>` : '';
    }).join('');
}
