var _sbEspera = { n: 0, t0: 0, tick: null };

function _sbEsperaPintarTiempo_() {
    const el = document.getElementById("sbEsperaTiempo");
    if (!el || !_sbEspera.t0) return;
    const s = Math.floor((Date.now() - _sbEspera.t0) / 1000);
    el.textContent = s < 1 ? "Un momento…" : ("Lleva " + s + " s");
}

function mostrarEsperaNube(mensaje) {
    let el = document.getElementById("sbEspera");
    if (!el) {
        el = document.createElement("div");
        el.id = "sbEspera";
        el.className = "sb-espera";
        el.innerHTML = '<div class="sb-espera-card" role="status" aria-live="polite">' +
            '<div class="spinner-border text-danger" role="presentation"></div>' +
            '<p class="sb-espera-msg mb-1" id="sbEsperaMsg">Procesando…</p>' +
            '<p class="sb-espera-t mb-0" id="sbEsperaTiempo">Un momento…</p></div>';
        document.body.appendChild(el);
    }
    const msg = document.getElementById("sbEsperaMsg");
    if (msg) msg.textContent = mensaje || "Procesando…";
    el.hidden = false;
    el.classList.add("is-on");
    _sbEspera.n += 1;
    if (_sbEspera.n === 1) {
        _sbEspera.t0 = Date.now();
        _sbEsperaPintarTiempo_();
        clearInterval(_sbEspera.tick);
        _sbEspera.tick = setInterval(_sbEsperaPintarTiempo_, 250);
    }
}

function textoEsperaNube(mensaje) {
    const msg = document.getElementById("sbEsperaMsg");
    if (msg && mensaje) msg.textContent = mensaje;
}

function ocultarEsperaNube() {
    _sbEspera.n = Math.max(0, _sbEspera.n - 1);
    if (_sbEspera.n > 0) return;
    clearInterval(_sbEspera.tick);
    _sbEspera.tick = null;
    const el = document.getElementById("sbEspera");
    if (el) {
        el.classList.remove("is-on");
        el.hidden = true;
    }
}

window.mostrarEsperaNube = mostrarEsperaNube;
window.textoEsperaNube = textoEsperaNube;
window.ocultarEsperaNube = ocultarEsperaNube;

function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const iconMap = { 'success': 'bi-check-circle', 'danger': 'bi-exclamation-octagon', 'warning': 'bi-exclamation-triangle', 'info': 'bi-info-circle' };
    const toastId = 'toast_' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast sb-toast sb-toast-${tipo}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="sb-toast-bar"></div>
            <div class="toast-body"><i class="bi ${iconMap[tipo] || iconMap.info}"></i><div>${mensaje}</div></div>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Cerrar"></button>
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

var _colaCotGas = Promise.resolve();

function _esAccionCotizacion_(action) {
    return /^(listar_cotizaciones|obtener_cotizacion|guardar_cotizacion|cotizacion_)/.test(String(action || ""));
}

async function asegurarGasUrl_() {
    if (CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl) return CONFIG_GLOBAL.gasUrl;
    if (typeof cargarConfiguracionGlobal === "function") {
        try { await cargarConfiguracionGlobal(); } catch (e) { /* se intenta config.json abajo */ }
    }
    if (CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl) return CONFIG_GLOBAL.gasUrl;
    try {
        const res = await fetch("config.json");
        if (res.ok) {
            const j = await res.json();
            CONFIG_GLOBAL = Object.assign({}, CONFIG_GLOBAL || {}, j || {});
        }
    } catch (e) { /* sin archivo local */ }
    return (CONFIG_GLOBAL && CONFIG_GLOBAL.gasUrl) || "";
}

async function _fetchGas_(payload, opts) {
    const url = await asegurarGasUrl_();
    if (!url) throw new Error("Aún no cargó la conexión a la nube. Espera un momento y pulsa Reintentar.");
    payload.authKey = localStorage.getItem('smartbudget_token') || "";
    const ctrl = new AbortController();
    const ms = opts.timeoutMs || 45000;
    const timer = setTimeout(function () { ctrl.abort(); }, ms);
    try {
        const res = await fetch(url, { method: "POST", body: JSON.stringify(payload), signal: ctrl.signal });
        if (!res.ok) throw new Error("HTTP Error: " + res.status);
        const data = await res.json();
        if (data && data.mensaje && String(data.mensaje).indexOf("Acceso no autorizado") !== -1) {
            const enviado = payload.authKey || "";
            const actual = localStorage.getItem("smartbudget_token") || "";
            if (enviado && actual === enviado) {
                localStorage.removeItem("smartbudget_token");
                localStorage.removeItem("smartbudget_email");
                localStorage.removeItem("smartbudget_rol");
                if (!document.getElementById("authOverlay")) location.reload();
            }
        }
        return data;
    } catch (e) {
        if (e.name === "AbortError") throw new Error("El servidor tardó demasiado. Vuelve a intentar.");
        const m = String(e.message || e);
        if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
            throw new Error("No se pudo conectar con el historial. Reintenta; si sigue, pega el backend.gs actualizado.");
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

async function realizarPeticionBD(payload, opts) {
    opts = opts || {};
    if (opts.cola === false || !_esAccionCotizacion_(payload && payload.action)) {
        return _fetchGas_(payload, opts);
    }
    const p = _colaCotGas.then(function () { return _fetchGas_(payload, opts); }, function () { return _fetchGas_(payload, opts); });
    _colaCotGas = p.then(function () {}, function () {});
    return p;
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

function compactarChatNube(chat, n, maxLen) {
    return (chat || []).slice(-n).map(function (h) {
        return { role: h.role, text: String(h.text || "").slice(0, maxLen) };
    });
}

function compactarPayloadNube(payload) {
    const recortar = function (n, maxLen) {
        payload.historialChat = compactarChatNube(payload.historialChat, n, maxLen);
        (payload.versiones || []).forEach(function (v) {
            v.historialChat = compactarChatNube(v.historialChat, n, maxLen);
        });
    };
    let json = JSON.stringify(payload);
    if (json.length < 48000) return payload;
    recortar(16, 2500);
    json = JSON.stringify(payload);
    if (json.length < 48000) return payload;
    recortar(8, 1200);
    return payload;
}

function clonarJson_(o) {
    return JSON.parse(JSON.stringify(o == null ? null : o));
}

function versionVacia_(id, comentario) {
    return {
        id: id || "V1",
        comentario: comentario || "",
        creado: new Date().toISOString(),
        tipoPresupuesto: typeof mercadoActual === "function" ? mercadoActual() : "NACIONAL",
        datosAdicionales: {
            fecha: document.getElementById("fecha")?.value || "",
            comercial: document.getElementById("comercial")?.value || "",
            disenador: document.getElementById("disenador")?.value || "",
            analista: document.getElementById("analista")?.value || ""
        },
        matrizItems: [],
        escalas: [{ id: "l1", q: 1 }],
        historialChat: [],
        faseIA: "idle",
        fichaComercial: typeof fichaComercialVacia === "function" ? fichaComercialVacia() : {}
    };
}

function snapshotDesdeUI_(id, comentario) {
    const prev = (window.versionesPresupuesto || []).find(function (v) { return v.id === id; });
    return {
        id: id,
        comentario: comentario != null ? comentario : (prev ? prev.comentario : ""),
        creado: prev && prev.creado ? prev.creado : new Date().toISOString(),
        tipoPresupuesto: typeof mercadoActual === "function" ? mercadoActual() : "NACIONAL",
        datosAdicionales: {
            fecha: document.getElementById("fecha")?.value || "",
            comercial: document.getElementById("comercial")?.value || "",
            disenador: document.getElementById("disenador")?.value || "",
            analista: document.getElementById("analista")?.value || ""
        },
        matrizItems: clonarJson_(typeof itemsPresupuesto !== "undefined" ? itemsPresupuesto : []),
        escalas: clonarJson_(typeof lotesSimulacion !== "undefined" && lotesSimulacion.length ? lotesSimulacion : [{ id: "l1", q: 1 }]),
        historialChat: clonarJson_(window.historialChatIA || []),
        faseIA: window.faseIA || "idle",
        fichaComercial: clonarJson_(typeof leerFichaComercialUI === "function" ? leerFichaComercialUI() : (prev && prev.fichaComercial) || {})
    };
}

function asegurarV1_() {
    if (!Array.isArray(window.versionesPresupuesto) || !window.versionesPresupuesto.length) {
        window.versionesPresupuesto = [snapshotDesdeUI_("V1", "")];
        window.versionActivaId = "V1";
    }
    if (!window.versionActivaId) window.versionActivaId = window.versionesPresupuesto[0].id;
}

function snapshotVersionActual() {
    asegurarV1_();
    const id = window.versionActivaId || "V1";
    const snap = snapshotDesdeUI_(id);
    const i = window.versionesPresupuesto.findIndex(function (v) { return v.id === id; });
    if (i >= 0) window.versionesPresupuesto[i] = snap;
    else window.versionesPresupuesto.push(snap);
    return snap;
}

function siguienteIdVersion() {
    let n = 0;
    (window.versionesPresupuesto || []).forEach(function (v) {
        const m = String(v.id || "").match(/^V(\d+)$/i);
        if (m) n = Math.max(n, parseInt(m[1], 10));
    });
    return "V" + (n + 1);
}

function aplicarVersionEnUI(id, omitirSnapshot) {
    if (!omitirSnapshot) snapshotVersionActual();
    const ver = (window.versionesPresupuesto || []).find(function (v) { return v.id === id; });
    if (!ver) return;
    window.versionActivaId = id;
    if (typeof itemsPresupuesto !== "undefined") itemsPresupuesto = clonarJson_(ver.matrizItems || []);
    if (typeof lotesSimulacion !== "undefined") {
        lotesSimulacion = clonarJson_(ver.escalas && ver.escalas.length ? ver.escalas : [{ id: "l1", q: 1 }]);
    }
    if (ver.datosAdicionales) {
        ["fecha", "comercial", "disenador", "analista"].forEach(function (k) {
            const el = document.getElementById(k);
            if (el && ver.datosAdicionales[k] != null) el.value = ver.datosAdicionales[k];
        });
    }
    if (typeof aplicarMercado === "function") aplicarMercado(ver.tipoPresupuesto || "NACIONAL");
    if (typeof pintarFichaComercial === "function") pintarFichaComercial(ver.fichaComercial);
    if (typeof window.pintarHistorialChatIA === "function") {
        window.pintarHistorialChatIA(ver.historialChat || [], ver.faseIA);
    } else {
        window.historialChatIA = ver.historialChat || [];
        window.faseIA = ver.faseIA || "idle";
    }
    if (typeof renderizarTablaItems === "function") renderizarTablaItems();
    pintarSelectorVersiones();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function hidratarVersionesDesdePayload(p) {
    p = p || {};
    if (Array.isArray(p.versiones) && p.versiones.length) {
        window.versionesPresupuesto = clonarJson_(p.versiones);
        window.versionActivaId = p.cabecera && p.cabecera.versionActiva
            ? p.cabecera.versionActiva
            : (p.versionActivaId || window.versionesPresupuesto[window.versionesPresupuesto.length - 1].id);
    } else {
        window.versionesPresupuesto = [{
            id: "V1",
            comentario: "",
            creado: new Date().toISOString(),
            tipoPresupuesto: p.cabecera && p.cabecera.tipoPresupuesto,
            datosAdicionales: p.datosAdicionales || {},
            matrizItems: p.matrizItems || p.items || [],
            escalas: p.escalas || p.lotes || [{ id: "l1", q: 1 }],
            historialChat: p.historialChat || p.chat || [],
            faseIA: p.faseIA || p.fase || "idle",
            fichaComercial: p.fichaComercial || {}
        }];
        window.versionActivaId = "V1";
    }
    aplicarVersionEnUI(window.versionActivaId, true);
}

function resetearVersionesProyecto() {
    window.versionesPresupuesto = [versionVacia_("V1", "")];
    window.versionActivaId = "V1";
    pintarSelectorVersiones();
}

function pintarSelectorVersiones() {
    asegurarV1_();
    const box = document.getElementById("chipsVersiones");
    const nota = document.getElementById("comentarioVersionActiva");
    if (!box) return;
    const activa = window.versionActivaId;
    box.innerHTML = window.versionesPresupuesto.map(function (v) {
        const on = v.id === activa ? " is-on" : "";
        const title = (v.comentario || "Sin comentario").replace(/"/g, "&quot;");
        return '<button type="button" class="ver-chip' + on + '" title="' + title + '" onclick="aplicarVersionEnUI(\'' + v.id + '\')">' + v.id + "</button>";
    }).join("");
    const ver = window.versionesPresupuesto.find(function (v) { return v.id === activa; });
    if (nota) nota.textContent = ver && ver.comentario ? ver.comentario : "";
}

function abrirModalNuevaVersion() {
    snapshotVersionActual();
    const next = siguienteIdVersion();
    const tit = document.getElementById("tituloNuevaVersion");
    if (tit) tit.textContent = "Nueva versión " + next;
    const inp = document.getElementById("nuevaVersionComentario");
    if (inp) inp.value = "";
    const el = document.getElementById("modalNuevaVersion");
    if (el) new bootstrap.Modal(el).show();
}

function confirmarNuevaVersion() {
    snapshotVersionActual();
    const id = siguienteIdVersion();
    const comentario = (document.getElementById("nuevaVersionComentario")?.value || "").trim();
    const nueva = snapshotDesdeUI_(id, comentario);
    nueva.creado = new Date().toISOString();
    window.versionesPresupuesto.push(nueva);
    window.versionActivaId = id;
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalNuevaVersion"));
    if (modal) modal.hide();
    aplicarVersionEnUI(id, true);
    mostrarNotificacion(id + " creada. Sigues sobre una copia de la anterior.", "success");
}

window.listarVersionesPresupuesto = function () {
    snapshotVersionActual();
    return clonarJson_(window.versionesPresupuesto || []);
};

async function guardarProyectoBD() {
    const codigo = document.getElementById('inputCodigo')?.value.trim();
    if (!codigo) return mostrarNotificacion("Ingresa un código de oportunidad (Paso 1).", "warning");
    snapshotVersionActual();
    const activa = window.versionActivaId || "V1";
    const payload = compactarPayloadNube({
        cabecera: {
            noProyecto: codigo,
            cliente: document.getElementById('cliente')?.value || '',
            nombreProyecto: document.getElementById('noProyecto')?.value || '',
            tipoPresupuesto: (typeof mercadoActual === "function" ? mercadoActual() : (document.getElementById('badgeTipo')?.innerText || 'NACIONAL')),
            versionActiva: activa,
            locale: typeof localeProyectoActual === "function" ? localeProyectoActual() : (window.localeProyecto || {})
        },
        odooPistas: window.odooPistas || {},
        datosAdicionales: { fecha: document.getElementById('fecha')?.value || '', comercial: document.getElementById('comercial')?.value || '', disenador: document.getElementById('disenador')?.value || '', analista: document.getElementById('analista')?.value || '' },
        matrizItems: typeof itemsPresupuesto !== 'undefined' ? itemsPresupuesto : [],
        escalas: typeof lotesSimulacion !== 'undefined' ? lotesSimulacion : [],
        historialChat: window.historialChatIA || [],
        faseIA: window.faseIA || "idle",
        versiones: window.versionesPresupuesto || [],
        versionActivaId: activa
    });
    mostrarNotificacion("Guardando en la Nube...", "info");
    try { const data = await realizarPeticionBD({ action: 'guardar', payload: payload }); mostrarNotificacion(data.mensaje, data.exito ? "success" : "danger"); } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

async function abrirHistorial() {
    const tbody = document.getElementById('tbodyHistorial');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-danger mb-2"></div><div class="fw-semibold">Cargando historial de Costos…</div><div class="small text-muted">La nube puede tardar unos segundos.</div></td></tr>';
    new bootstrap.Modal(document.getElementById('modalHistorial')).show();
    mostrarEsperaNube("Cargando historial de Costos…");
    try {
        const data = await realizarPeticionBD({ action: 'listar' });
        if(data.exito && data.data.length > 0) {
            tbody.innerHTML = data.data.map(p => `<tr><td class="text-danger fw-bold">${p.noProyecto}</td><td>${p.cliente || 'S/N'}</td><td>${p.requerimiento || 'S/N'}</td><td><span class="badge ${p.tipo==='EXPORTACION'?'bg-dark':'bg-primary'}">${p.tipo}</span></td><td class="text-muted" style="font-size:0.75rem;">${p.fechaGuardado}</td><td class="text-center"><button class="btn btn-sm btn-primary py-0 px-2 me-1" onclick="cargarProyectoBD('${p.id}')"><i class="bi bi-cloud-download"></i></button><button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarProyectoBD('${p.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
        } else { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proyectos.</td></tr>'; }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="text-danger mb-2">${e.message}</div><button type="button" class="btn btn-sm btn-outline-secondary" onclick="abrirHistorial()">Reintentar</button></td></tr>`;
    } finally {
        ocultarEsperaNube();
    }
}

async function cargarProyectoBD(idProyecto) {
    mostrarEsperaNube("Abriendo el proyecto…");
    try {
        const data = await realizarPeticionBD({ action: 'obtener', id: idProyecto });
        if (data.exito && data.data) {
            textoEsperaNube("Preparando la matriz…");
            const p = data.data; const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('inputCodigo', p.cabecera?.noProyecto); setVal('noProyecto', p.cabecera?.nombreProyecto); setVal('cliente', p.cabecera?.cliente);
            window.odooPistas = p.odooPistas || {};
            /* los archivos del Paso 2 no se guardan en la nube: los del proyecto anterior no deben quedar */
            if (typeof window.vaciarArchivosIA === "function") window.vaciarArchivosIA();
            if (typeof aplicarLocaleProyecto === "function") {
                aplicarLocaleProyecto((p.cabecera && p.cabecera.locale) || {}, { silencio: true });
            }
            hidratarVersionesDesdePayload(p);
            bootstrap.Modal.getInstance(document.getElementById('modalHistorial'))?.hide();
            if (typeof window.cargarImagenOdooEnVisor === "function") window.cargarImagenOdooEnVisor();
            const nVer = (window.versionesPresupuesto || []).length;
            const nChat = (window.historialChatIA || []).length;
            mostrarNotificacion((nVer > 1 ? (nVer + " versiones. ") : "") + (nChat ? "Proyecto y chat cargados." : "Proyecto cargado."), "success");
        }
    } catch(e) { mostrarNotificacion(e.message, "danger"); }
    finally { ocultarEsperaNube(); }
}

var SESION_TRABAJO_KEY = "smartbudget_sesion_v1";
var _sesionGuardarT = null;

function idsCabeceraSesion() {
    return ["inputCodigo", "noProyecto", "cliente", "fecha", "comercial", "disenador", "analista", "simFee", "selMercado"];
}

function programarGuardarSesion() {
    clearTimeout(_sesionGuardarT);
    _sesionGuardarT = setTimeout(guardarSesionTrabajo, 450);
}

function guardarSesionTrabajo() {
    try {
        const cabecera = {};
        idsCabeceraSesion().forEach(function (id) {
            const el = document.getElementById(id);
            if (el) cabecera[id] = el.value || "";
        });
        snapshotVersionActual();
        const payload = {
            cabecera: cabecera,
            items: typeof itemsPresupuesto !== "undefined" ? itemsPresupuesto : [],
            lotes: typeof lotesSimulacion !== "undefined" ? lotesSimulacion : [],
            chat: window.historialChatIA || [],
            fase: window.faseIA || "idle",
            comision: document.getElementById("simComision")?.value || "",
            archivos: window.archivosGemaBase64 || [],
            versiones: window.versionesPresupuesto || [],
            versionActivaId: window.versionActivaId || "V1",
            locale: typeof localeProyectoActual === "function" ? localeProyectoActual() : (window.localeProyecto || {}),
            odooPistas: window.odooPistas || {}
        };
        let json = JSON.stringify(payload);
        if (json.length > 4500000) {
            payload.archivos = [];
            json = JSON.stringify(payload);
        }
        localStorage.setItem(SESION_TRABAJO_KEY, json);
    } catch (e) {
        try {
            const prev = JSON.parse(localStorage.getItem(SESION_TRABAJO_KEY) || "{}");
            prev.archivos = [];
            localStorage.setItem(SESION_TRABAJO_KEY, JSON.stringify(prev));
        } catch (e2) {}
    }
}

function restaurarSesionTrabajo() {
    let s;
    try { s = JSON.parse(localStorage.getItem(SESION_TRABAJO_KEY) || "null"); } catch (e) { return false; }
    if (!s) return false;
    const tiene =
        (s.items && s.items.length) ||
        (s.chat && s.chat.length) ||
        (s.cabecera && s.cabecera.inputCodigo) ||
        (s.cabecera && s.cabecera.noProyecto);
    if (!tiene) return false;
    idsCabeceraSesion().forEach(function (id) {
        const el = document.getElementById(id);
        if (el && s.cabecera && s.cabecera[id] != null) el.value = s.cabecera[id];
    });
    if (Array.isArray(s.archivos) && s.archivos.length) {
        window.archivosGemaBase64 = s.archivos;
        if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
    }
    if (s.comision) {
        const sel = document.getElementById("simComision");
        if (sel) sel.value = s.comision;
    }
    window.odooPistas = s.odooPistas || {};
    if (typeof aplicarLocaleProyecto === "function") {
        aplicarLocaleProyecto(s.locale || {}, { silencio: true });
    }
    hidratarVersionesDesdePayload({
        cabecera: { tipoPresupuesto: s.cabecera && s.cabecera.selMercado, versionActiva: s.versionActivaId },
        datosAdicionales: {
            fecha: s.cabecera && s.cabecera.fecha,
            comercial: s.cabecera && s.cabecera.comercial,
            disenador: s.cabecera && s.cabecera.disenador,
            analista: s.cabecera && s.cabecera.analista
        },
        matrizItems: s.items,
        escalas: s.lotes,
        historialChat: s.chat,
        faseIA: s.fase,
        versiones: s.versiones,
        versionActivaId: s.versionActivaId
    });
    if (typeof mostrarNotificacion === "function") mostrarNotificacion("Se restauró el trabajo de esta sesión.", "info");
    return true;
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
    if (localStorage.getItem("smartbudget_token") && typeof logisticaPrefetchHistorial_ === "function") logisticaPrefetchHistorial_();
    
    // 2. Ejecutar funciones externas (Si existen en otros archivos)
    if(typeof obtenerTRMOficial === "function") await obtenerTRMOficial();
    restaurarSesionTrabajo();
    asegurarV1_();
    pintarSelectorVersiones();
    if(typeof renderizarTablaItems === "function") renderizarTablaItems();
    if(typeof inicializarDragAndDropArchivos === "function") inicializarDragAndDropArchivos();
    if(typeof habilitarVentanasFlotantes === "function") habilitarVentanasFlotantes();
    
    // 3. Listeners
    ['simTRM', 'simComision', 'simFee'].forEach(id => { const el = document.getElementById(id); if(el) el.onchange = () => { if (typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero(); programarGuardarSesion(); }; });
    idsCabeceraSesion().forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", programarGuardarSesion);
        if (el) el.addEventListener("input", programarGuardarSesion);
    });
    ["fichaTitulo", "fichaDesc", "fichaDimAncho", "fichaDimFondo", "fichaDimAlto", "fichaEmpAncho", "fichaEmpFondo", "fichaEmpAlto", "fichaEmpUnd"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", programarGuardarSesion);
            el.addEventListener("input", programarGuardarSesion);
        }
    });
    if (typeof pintarLocaleProyecto === "function") pintarLocaleProyecto();
});
