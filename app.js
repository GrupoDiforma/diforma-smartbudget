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
var _colaImgGas = Promise.resolve();

function _esAccionCotizacion_(action) {
    return /^(listar_cotizaciones|obtener_cotizacion|guardar_cotizacion)$/.test(String(action || ""));
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
        if (e.name === "AbortError") {
            var actAbort = payload && payload.action;
            if (/^gemini_/.test(String(actAbort || ""))) {
                throw new Error("Gemini tardó más de lo esperado. En la entrevista deja PRO apagado; si acabas de cancelar, espera un minuto (el servidor puede seguir ocupado) y reintenta una sola vez.");
            }
            throw new Error("El servidor tardó demasiado. Vuelve a intentar.");
        }
        const m = String(e.message || e);
        if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
            var act = String((payload && payload.action) || "");
            if (/^gemini_/.test(act)) {
                throw new Error("Se cortó la conexión con Gemini. Espera un minuto (el servidor puede seguir ocupado) y pulsa Generar matriz otra vez.");
            }
            if (/^catalogo_/.test(act)) {
                throw new Error("No se pudo leer el catálogo maestro. Reintenta; si sigue, revisa la conexión a Apps Script.");
            }
            if (/^odoo_/.test(act)) {
                throw new Error("No hubo respuesta de Apps Script al consultar Odoo. Reintenta; si sigue, en Script pulsa Implementar → Nueva implementación (aplicación web).");
            }
            if (/^(listar|obtener|guardar|eliminar|listar_cotizaciones|obtener_cotizacion|guardar_cotizacion)/.test(act)) {
                throw new Error("No se pudo conectar con el historial. Reintenta; si sigue, pega el backend.gs actualizado.");
            }
            throw new Error("No se pudo conectar con Apps Script. Reintenta en un momento.");
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

async function realizarPeticionBD(payload, opts) {
    opts = opts || {};
    const act = payload && payload.action;
    if (opts.cola === false) return _fetchGas_(payload, opts);
    if (String(act || "") === "cotizacion_imagenes") {
        const pImg = _colaImgGas.then(function () { return _fetchGas_(payload, opts); }, function () { return _fetchGas_(payload, opts); });
        _colaImgGas = pImg.then(function () {}, function () {});
        return pImg;
    }
    if (!_esAccionCotizacion_(act)) return _fetchGas_(payload, opts);
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

function idArchivoVisor_(f) {
    if (!f) return "";
    if (f.id) return f.id;
    f.id = f._odoo
        ? ("odoo-" + String(f.name || "img").replace(/[^\w\-]+/g, "").slice(0, 24))
        : ("a" + Date.now().toString(36) + Math.floor(Math.random() * 10000));
    return f.id;
}

function clonarArchivosLigeros_(files) {
    return (files || []).map(function (f) {
        return {
            id: f.id || "",
            name: f.name,
            mimeType: f.mimeType,
            data: f.data,
            _odoo: !!f._odoo,
            elemId: f.elemId || "",
            alcance: f.alcance || "",
            _pinCotizacion: f._pinCotizacion || ""
        };
    }).filter(function (f) { return f.data; });
}

function sincronizarArchivosGrupoEnVersion_(ver) {
    if (!ver || !esPresupuestoGrupal()) return;
    if (window.archivosGemaBase64 && window.archivosGemaBase64.length) {
        ver.archivosGrupo = clonarArchivosLigeros_(window.archivosGemaBase64);
    }
}

function asegurarArchivosGrupoEnUI_(ver) {
    if (ver && esPresupuestoGrupal() && (!window.archivosGemaBase64 || !window.archivosGemaBase64.length) && ver.archivosGrupo && ver.archivosGrupo.length) {
        window.archivosGemaBase64 = clonarArchivosLigeros_(ver.archivosGrupo);
    }
    if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
}

function elementoActivoObj_() {
    const ver = versionActualObj_();
    if (!ver || !ver.elementos) return null;
    const id = ver.elementoActivoId || window.elementoActivoId;
    return ver.elementos.find(function (e) { return e.id === id; }) || ver.elementos[0] || null;
}

window.imagenCotizacionElemento = function (elemId) {
    const ver = versionActualObj_();
    if (!ver || !ver.elementos) return "";
    const el = ver.elementos.find(function (e) { return String(e.id) === String(elemId); });
    return (el && el.imgCotizacion) || "";
};

window.imgRefCotizacionElemento = function (elemId, verId) {
    const vers = window.versionesPresupuesto || [];
    const ver = verId
        ? vers.find(function (v) { return String(v.id) === String(verId); })
        : versionActualObj_();
    if (!ver || !ver.elementos) return "";
    const el = ver.elementos.find(function (e) { return String(e.id) === String(elemId); });
    return (el && el.imgRef) || "";
};

window.archivoEsPinCotizacion = function (file) {
    if (!file || !/^image\//i.test(file.mimeType || "")) return false;
    const el = elementoActivoObj_();
    if (!el || (!el.imgCotizacion && !el.imgCotizacionFileId && !el.imgCotizacionNombre)) return false;
    if (el.imgCotizacionFileId && file.id && file.id === el.imgCotizacionFileId) return true;
    if (file._pinCotizacion && file._pinCotizacion === el.id) return true;
    if (el.imgCotizacionNombre && file.name && file.name === el.imgCotizacionNombre) return true;
    return false;
};

function huellaImgCotizacion_(data) {
    const s = String(data || "");
    if (!s) return "";
    return s.length + ":" + s.slice(24, 40) + ":" + s.slice(-20);
}

window.asignarRenderCotizacionElemento = async function (idx) {
    if (!esPresupuestoGrupal()) return;
    const files = window.archivosGemaBase64 || [];
    const i = idx != null ? idx : (window._visorIdx || 0);
    const f = files[i];
    if (!f || !/^image\//i.test(f.mimeType || "")) {
        return typeof mostrarNotificacion === "function" && mostrarNotificacion("Elige una imagen (no PDF) para la cotización de esta pieza.", "warning");
    }
    snapshotVersionActual();
    const el = elementoActivoObj_();
    if (!el) return;
    try {
        const fileId = idArchivoVisor_(f);
        f._pinCotizacion = el.id;
        (window.archivosGemaBase64 || []).forEach(function (otro) {
            if (otro !== f && otro._pinCotizacion === el.id) delete otro._pinCotizacion;
        });
        f.elemId = el.id;
        if (el.imgCotizacionFileId === fileId && el.imgRef) {
            el.imgCotizacionNombre = f.name || el.imgCotizacionNombre || "";
            sincronizarArchivosGrupoEnVersion_(versionActualObj_());
            if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
            if (typeof mostrarNotificacion === "function") {
                mostrarNotificacion("Ese render ya está en la cotización de «" + (el.nombre || "pieza") + "».", "success");
            }
            return;
        }
        const src = "data:" + (f.mimeType || "image/jpeg") + ";base64," + (f.data || "");
        const thumb = typeof window.reducirImagenJpeg === "function"
            ? await window.reducirImagenJpeg(src, 1000, 0.88)
            : src;
        if (el.imgRef) el.imgRefAnterior = el.imgRef;
        el.imgCotizacion = thumb;
        el.imgCotizacionNombre = f.name || "";
        el.imgCotizacionFileId = fileId;
        el.imgCotizacionHuella = huellaImgCotizacion_(thumb);
        delete el.imgRef;
        sincronizarArchivosGrupoEnVersion_(versionActualObj_());
        if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Este render queda en la cotización de «" + (el.nombre || "pieza") + "». Las demás piezas no lo heredan.", "success");
        }
        if (typeof programarGuardarSesion === "function") programarGuardarSesion();
        if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
    } catch (err) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo asignar el render.", "danger");
    }
};

function extraerImagenesPresupuesto_(payload) {
    const imagenes = [];
    (payload.versiones || []).forEach(function (v) {
        delete v.archivosGrupo;
        (v.elementos || []).forEach(function (el) {
            const data = el.imgCotizacion;
            const huella = huellaImgCotizacion_(data);
            const yaEnDrive = !!(el.imgRef && (!huella || !el.imgCotizacionHuella || el.imgCotizacionHuella === huella));
            if (data && /^data:image\//.test(data) && !yaEnDrive) {
                imagenes.push({
                    k: String(v.id || "V1") + ":" + String(el.id || ""),
                    data: data,
                    reemplaza: el.imgRef || el.imgRefAnterior || ""
                });
                el.imgCotizacionHuella = huella;
                delete el.imgRef;
            }
            delete el.imgCotizacion;
            delete el.imgRefAnterior;
        });
    });
    return imagenes;
}

function compactarPayloadNube(payload) {
    payload = clonarJson_(payload);
    const imagenes = extraerImagenesPresupuesto_(payload);
    if (payload.versiones && payload.versiones.length) {
        delete payload.matrizItems;
        delete payload.escalas;
        delete payload.historialChat;
        (payload.versiones || []).forEach(function (v) {
            if (v.elementos && v.elementos.length) {
                delete v.matrizItems;
                delete v.escalas;
                delete v.historialChat;
                delete v.fichaComercial;
            }
        });
    }
    const recortar = function (n, maxLen) {
        payload.historialChat = compactarChatNube(payload.historialChat, n, maxLen);
        (payload.versiones || []).forEach(function (v) {
            delete v.archivosGrupo;
            v.historialChat = compactarChatNube(v.historialChat, n, maxLen);
            (v.elementos || []).forEach(function (el) {
                el.historialChat = compactarChatNube(el.historialChat, n, maxLen);
            });
        });
    };
    let json = JSON.stringify(payload);
    if (json.length > 160000) recortar(16, 2500);
    json = JSON.stringify(payload);
    if (json.length > 160000) recortar(8, 1200);
    return { payload: payload, imagenes: imagenes };
}

function aplicarRefsImagenesVivas_(refs) {
    if (!refs) return;
    (window.versionesPresupuesto || []).forEach(function (v) {
        (v.elementos || []).forEach(function (el) {
            const k = String(v.id || "V1") + ":" + String(el.id || "");
            if (refs[k]) {
                el.imgRef = refs[k];
                delete el.imgRefAnterior;
                if (el.imgCotizacion) el.imgCotizacionHuella = huellaImgCotizacion_(el.imgCotizacion);
            }
        });
    });
}

async function hidratarRendersCotizacionNube_() {
    const dest = [];
    (window.versionesPresupuesto || []).forEach(function (v) {
        (v.elementos || []).forEach(function (el) {
            if (el.imgRef && !el.imgCotizacion) dest.push(el);
        });
    });
    if (!dest.length || typeof realizarPeticionBD !== "function") return;
    try {
        const ids = dest.map(function (el) { return el.imgRef; });
        const r = await realizarPeticionBD({ action: "cotizacion_imagenes", ids: ids, modo: "blob" }, { timeoutMs: 60000 });
        const map = (r && r.data) || {};
        dest.forEach(function (el) {
            if (map[el.imgRef] && /^data:image\//.test(map[el.imgRef])) {
                el.imgCotizacion = map[el.imgRef];
                el.imgCotizacionHuella = huellaImgCotizacion_(el.imgCotizacion);
            }
        });
        if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
    } catch (e) { /* el pin se reintenta al abrir la cotización */ }
}

function tituloRenderCubre_(nombre, titulo) {
    const n = String(nombre || "").toLowerCase().replace(/\s+/g, " ").trim();
    const t = String(titulo || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!n || !t) return false;
    return t === n || t.indexOf(n) === 0 || n.indexOf(t) === 0;
}

/** El guardado en la nube se quedó sin el archivo (el servidor viejo no sube PRE-img). La cotización sí tiene el render en Drive. */
async function recuperarRendersDesdeCotizaciones_() {
    const pend = [];
    (window.versionesPresupuesto || []).forEach(function (v) {
        (v.elementos || []).forEach(function (el) {
            if (el.imgCotizacion && /^data:image\//.test(el.imgCotizacion)) return;
            if (el.imgRef) return;
            if (!(el.imgCotizacionNombre || el.imgCotizacionHuella || el.imgCotizacionFileId)) return;
            pend.push(el);
        });
    });
    if (!pend.length || typeof realizarPeticionBD !== "function") return 0;
    const codigo = String(document.getElementById("inputCodigo")?.value || "").trim();
    if (!codigo) return 0;
    let lista = [];
    try {
        const r = await realizarPeticionBD({ action: "listar_cotizaciones" });
        lista = (r && r.data) || [];
    } catch (e) { return 0; }
    const cots = lista.filter(function (c) {
        const p = String(c.proyecto || "");
        const ps = String(c.proyectos || "");
        return p.indexOf(codigo) === 0 || ps.indexOf(codigo) >= 0;
    }).sort(function (a, b) {
        const ia = String(a.id || "");
        const ib = String(b.id || "");
        if (ia !== ib) return ia < ib ? 1 : -1;
        return (Number(b.rev) || 0) - (Number(a.rev) || 0);
    });
    const vistos = {};
    for (let i = 0; i < cots.length && i < 4; i++) {
        const c = cots[i];
        const clave = String(c.id) + ":" + String(c.rev || "");
        if (vistos[clave]) continue;
        vistos[clave] = true;
        const faltan = pend.filter(function (el) { return !el.imgRef; });
        if (!faltan.length) break;
        let filas = [];
        try {
            const r = await realizarPeticionBD({ action: "obtener_cotizacion", id: c.id, rev: c.rev });
            filas = (r && r.data && r.data.datos && r.data.datos.filas) || [];
        } catch (e2) { continue; }
        const libres = filas.filter(function (f) { return f && f.imgRef; });
        faltan.sort(function (a, b) { return String(b.nombre || "").length - String(a.nombre || "").length; });
        faltan.forEach(function (el) {
            const ix = libres.findIndex(function (f) {
                if (f.elem && String(f.elem) === String(el.id)) return true;
                const titulo = (f.snap && f.snap.ficha && f.snap.ficha.titulo) || "";
                return tituloRenderCubre_(el.nombre, titulo);
            });
            if (ix < 0) return;
            el.imgRef = libres[ix].imgRef;
            libres.splice(ix, 1);
        });
    }
    await hidratarRendersCotizacionNube_();
    return pend.filter(function (el) { return el.imgCotizacion && /^data:image\//.test(el.imgCotizacion); }).length;
}

function enfocarRenderPieza_() {
    const id = window.elementoActivoId;
    if (!id) return;
    const files = window.archivosGemaBase64 || [];
    const ix = files.findIndex(function (f) { return f && f._pinCotizacion === id; });
    if (ix < 0) return;
    window._visorIdx = ix;
    window._pdfDoc = null;
    window._pdfIdx = -1;
    if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
}

function ponerRendersCotizacionEnVisor_() {
    const files = window.archivosGemaBase64 || [];
    const ver = versionActualObj_();
    if (!ver || !ver.elementos) return;
    ver.elementos.forEach(function (el) {
        if (!el.imgCotizacion || !/^data:image\//.test(el.imgCotizacion)) return;
        const ya = files.some(function (f) { return f && f._pinCotizacion === el.id; });
        if (ya) return;
        const m = String(el.imgCotizacion).match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return;
        files.push({
            id: "pin-" + el.id,
            name: el.imgCotizacionNombre || ((el.nombre || "Pieza") + ".jpg"),
            mimeType: m[1],
            data: m[2],
            elemId: el.id,
            alcance: "pieza",
            _pinCotizacion: el.id
        });
    });
    window.archivosGemaBase64 = files;
    const activa = window.elementoActivoId || ver.elementoActivoId;
    const pin = files.findIndex(function (f) { return f && f._pinCotizacion && f._pinCotizacion === activa; });
    if (pin >= 0) window._visorIdx = pin;
    if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
}

function mensajeGuardarNube_(m) {
    m = String(m || "");
    if (/50000 characters|maximum of 50000|too large/i.test(m)) {
        return "Este presupuesto no cabe en la hoja. Pega el backend.gs actualizado en Apps Script y vuelve a Guardar en Nube.";
    }
    return m;
}

function clonarJson_(o) {
    return JSON.parse(JSON.stringify(o == null ? null : o));
}

function tipoEstructuraActual() {
    const el = document.getElementById("selTipoEstructura");
    const v = el ? String(el.value || "").toUpperCase() : String(window.tipoEstructura || "");
    return v === "GRUPAL" ? "GRUPAL" : "INDIVIDUAL";
}

function esPresupuestoGrupal() {
    return tipoEstructuraActual() === "GRUPAL";
}

function nuevoIdElemento_() {
    return "e" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
}

function elementoVacio_(nombre) {
    return {
        id: nuevoIdElemento_(),
        nombre: String(nombre || "Pieza 1").trim() || "Pieza 1",
        cantidad: 1,
        matrizItems: [],
        escalas: [{ id: "l1", q: 1 }],
        historialChat: [],
        faseIA: "idle",
        fichaComercial: typeof fichaComercialVacia === "function" ? fichaComercialVacia() : {}
    };
}

function versionActualObj_() {
    const id = window.versionActivaId || "V1";
    return (window.versionesPresupuesto || []).find(function (v) { return v.id === id; }) || null;
}

function sincronizarElementoActivoEnVersion_(ver) {
    if (!ver || !esPresupuestoGrupal()) return ver;
    if (!Array.isArray(ver.elementos) || !ver.elementos.length) {
        const nombre = (ver.fichaComercial && ver.fichaComercial.titulo) || "Pieza 1";
        ver.elementos = [Object.assign(elementoVacio_(nombre), {
            matrizItems: clonarJson_(ver.matrizItems || []),
            escalas: clonarJson_(ver.escalas && ver.escalas.length ? ver.escalas : [{ id: "l1", q: 1 }]),
            historialChat: clonarJson_(ver.historialChat || []),
            faseIA: ver.faseIA || "idle",
            fichaComercial: clonarJson_(ver.fichaComercial || {})
        })];
        ver.elementoActivoId = ver.elementos[0].id;
    }
    const id = ver.elementoActivoId || window.elementoActivoId || ver.elementos[0].id;
    const el = ver.elementos.find(function (e) { return e.id === id; }) || ver.elementos[0];
    ver.elementoActivoId = el.id;
    window.elementoActivoId = el.id;
    el.matrizItems = clonarJson_(ver.matrizItems || []);
    el.escalas = clonarJson_(ver.escalas && ver.escalas.length ? ver.escalas : [{ id: "l1", q: 1 }]);
    el.historialChat = clonarJson_(ver.historialChat || []);
    el.faseIA = ver.faseIA || "idle";
    el.fichaComercial = clonarJson_(ver.fichaComercial || {});
    return ver;
}

function cargarElementoEnUI_(el, ver) {
    if (!el) return;
    window.elementoActivoId = el.id;
    if (ver) ver.elementoActivoId = el.id;
    if (typeof itemsPresupuesto !== "undefined") itemsPresupuesto = clonarJson_(el.matrizItems || []);
    if (typeof lotesSimulacion !== "undefined") {
        lotesSimulacion = clonarJson_(el.escalas && el.escalas.length ? el.escalas : (ver && ver.escalas) || [{ id: "l1", q: 1 }]);
    }
    if (typeof pintarFichaComercial === "function") pintarFichaComercial(el.fichaComercial);
    if (typeof window.pintarHistorialChatIA === "function") {
        window.pintarHistorialChatIA(el.historialChat || [], el.faseIA);
    } else {
        window.historialChatIA = el.historialChat || [];
        window.faseIA = el.faseIA || "idle";
    }
    const nom = document.getElementById("nombreElementoActivo");
    if (nom) nom.value = el.nombre || "";
    asegurarArchivosGrupoEnUI_(ver);
}

function aplanarVersionesAIndividual_() {
    (window.versionesPresupuesto || []).forEach(function (ver) {
        if (!ver.elementos || !ver.elementos.length) {
            delete ver.elementos;
            delete ver.elementoActivoId;
            delete ver.briefGrupal;
            return;
        }
        const el = ver.elementos.find(function (e) { return e.id === ver.elementoActivoId; }) || ver.elementos[0];
        ver.matrizItems = clonarJson_(el.matrizItems || ver.matrizItems || []);
        ver.escalas = clonarJson_(el.escalas && el.escalas.length ? el.escalas : ver.escalas);
        ver.historialChat = clonarJson_(el.historialChat || ver.historialChat || []);
        ver.faseIA = el.faseIA || ver.faseIA;
        ver.fichaComercial = clonarJson_(el.fichaComercial || ver.fichaComercial || {});
        delete ver.elementos;
        delete ver.elementoActivoId;
        delete ver.briefGrupal;
    });
    window.elementoActivoId = "";
}

function pintarBarraElementos() {
    const bar = document.getElementById("barraElementos");
    const box = document.getElementById("chipsElementos");
    if (!bar) return;
    const on = esPresupuestoGrupal();
    bar.classList.toggle("d-none", !on);
    if (!on) {
        const rs = document.getElementById("resumenStand");
        if (rs) { rs.classList.add("d-none"); rs.innerHTML = ""; }
        pintarEtiquetasElemento_("", false);
        return;
    }
    const ver = versionActualObj_();
    if (ver) sincronizarElementoActivoEnVersion_(ver);
    const elems = (ver && ver.elementos) || [];
    const activa = (ver && ver.elementoActivoId) || window.elementoActivoId;
    if (box) {
        box.innerHTML = elems.map(function (e) {
            const isOn = e.id === activa ? " is-on" : "";
            const nom = String(e.nombre || "Pieza").replace(/</g, "&lt;").replace(/"/g, "&quot;");
            return '<button type="button" class="elem-chip' + isOn + '" onclick="aplicarElementoEnUI(\'' + e.id + '\')">' + nom + "</button>";
        }).join("");
    }
    const inp = document.getElementById("nombreElementoActivo");
    const cur = elems.find(function (e) { return e.id === activa; });
    if (inp) inp.value = cur ? (cur.nombre || "") : "";
    pintarEtiquetasElemento_(cur ? (cur.nombre || "Pieza") : "", true);
}

function pintarEtiquetasElemento_(nombre, on) {
    const aviso = document.getElementById("avisoElementoActivo");
    if (aviso) {
        if (on && nombre) {
            aviso.textContent = "Ahora: " + nombre;
            aviso.classList.remove("d-none");
        } else {
            aviso.classList.add("d-none");
        }
    }
    ["badgePrearmadoElemento", "badgeMatrizElemento", "badgeSimuladorElemento"].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        if (on && nombre) {
            el.textContent = nombre;
            el.classList.remove("d-none");
        } else {
            el.classList.add("d-none");
        }
    });
    const btn = document.getElementById("btnRenderCotizacion");
    if (btn) btn.classList.toggle("d-none", !on);
}

function compactarChatParaBrief_(chat) {
    return (chat || []).filter(function (h) { return h && h.text; }).map(function (h) {
        return (h.role === "user" ? "ANALISTA" : "IA") + ": " + String(h.text).replace(/\s+/g, " ").trim();
    }).join("\n").slice(0, 4500);
}

function marcarSaltoElemento_(nombre, opts) {
    opts = opts || {};
    const bar = document.getElementById("barraElementos");
    const mtx = document.querySelector(".matriz-scroll");
    const chat = document.getElementById("chatBox");
    [bar, mtx, chat].forEach(function (el) {
        if (!el) return;
        el.classList.remove("elem-flash");
        void el.offsetWidth;
        el.classList.add("elem-flash");
    });
    if (!opts.silencio && typeof mostrarNotificacion === "function") {
        mostrarNotificacion("Cambiaste a «" + (nombre || "pieza") + "». Chat y matriz son de este elemento.", "info");
    }
}

function aplicarTipoEstructura(val, opts) {
    opts = opts || {};
    val = val === "GRUPAL" ? "GRUPAL" : "INDIVIDUAL";
    const prev = window.tipoEstructura || tipoEstructuraActual();
    const sel = document.getElementById("selTipoEstructura");
    if (sel) sel.value = val;
    if (val === "INDIVIDUAL" && prev === "GRUPAL" && !opts.hidratar) {
        snapshotVersionActual();
        const ver = versionActualObj_();
        if (ver && ver.elementos && ver.elementos.length > 1) {
            if (sel) sel.value = "GRUPAL";
            window.tipoEstructura = "GRUPAL";
            pintarBarraElementos();
            return typeof mostrarNotificacion === "function" && mostrarNotificacion("Deja una sola pieza para volver a Individual.", "warning");
        }
        aplanarVersionesAIndividual_();
    }
    window.tipoEstructura = val;
    if (val === "GRUPAL" && !opts.hidratar) {
        snapshotVersionActual();
        const ver = versionActualObj_();
        if (ver) sincronizarElementoActivoEnVersion_(ver);
    }
    pintarBarraElementos();
    if (typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function aplicarElementoEnUI(id) {
    if (!esPresupuestoGrupal()) return;
    const prev = window.elementoActivoId;
    snapshotVersionActual();
    const ver = versionActualObj_();
    if (!ver || !ver.elementos) return;
    const el = ver.elementos.find(function (e) { return e.id === id; });
    if (!el) return;
    cargarElementoEnUI_(el, ver);
    enfocarRenderPieza_();
    if (typeof renderizarTablaItems === "function") renderizarTablaItems();
    pintarBarraElementos();
    if (prev && prev !== el.id) marcarSaltoElemento_(el.nombre || "pieza");
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function abrirModalNuevoElemento() {
    if (!esPresupuestoGrupal()) return;
    snapshotVersionActual();
    const inp = document.getElementById("nuevoElementoNombre");
    if (inp) inp.value = "";
    const el = document.getElementById("modalNuevoElemento");
    if (el) new bootstrap.Modal(el).show();
}

function confirmarNuevoElemento() {
    snapshotVersionActual();
    const ver = versionActualObj_();
    if (!ver) return;
    sincronizarElementoActivoEnVersion_(ver);
    const nombre = (document.getElementById("nuevoElementoNombre")?.value || "").trim() || ("Pieza " + (ver.elementos.length + 1));
    const nuevo = elementoVacio_(nombre);
    nuevo.escalas = clonarJson_(ver.escalas && ver.escalas.length ? ver.escalas : [{ id: "l1", q: 1 }]);
    ver.elementos.push(nuevo);
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalNuevoElemento"));
    if (modal) modal.hide();
    cargarElementoEnUI_(nuevo, ver);
    if (typeof renderizarTablaItems === "function") renderizarTablaItems();
    pintarBarraElementos();
    marcarSaltoElemento_(nombre, { silencio: true });
    if (typeof mostrarNotificacion === "function") mostrarNotificacion(nombre + " agregada. Matriz vacía; el brief del grupo se reutiliza en el chat.", "success");
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function renombrarElementoActivo(nombre) {
    if (!esPresupuestoGrupal()) return;
    snapshotVersionActual();
    const ver = versionActualObj_();
    const el = ver && ver.elementos ? ver.elementos.find(function (e) { return e.id === ver.elementoActivoId; }) : null;
    if (!el) return;
    el.nombre = String(nombre || "").trim() || el.nombre;
    pintarBarraElementos();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function eliminarElementoActivo() {
    if (!esPresupuestoGrupal()) return;
    snapshotVersionActual();
    const ver = versionActualObj_();
    if (!ver || !ver.elementos || ver.elementos.length < 2) {
        return typeof mostrarNotificacion === "function" && mostrarNotificacion("El grupal necesita al menos una pieza. Cambia a Individual si ya no es grupal.", "warning");
    }
    const id = ver.elementoActivoId;
    ver.elementos = ver.elementos.filter(function (e) { return e.id !== id; });
    const sig = ver.elementos[0];
    cargarElementoEnUI_(sig, ver);
    if (typeof renderizarTablaItems === "function") renderizarTablaItems();
    pintarBarraElementos();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
}

window.esPresupuestoGrupal = esPresupuestoGrupal;
window.aplicarTipoEstructura = aplicarTipoEstructura;
window.aplicarElementoEnUI = aplicarElementoEnUI;
window.abrirModalNuevoElemento = abrirModalNuevoElemento;
window.confirmarNuevoElemento = confirmarNuevoElemento;
window.renombrarElementoActivo = renombrarElementoActivo;
window.eliminarElementoActivo = eliminarElementoActivo;

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
    const fuente = prev || versionActualObj_();
    const snap = {
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
        fichaComercial: clonarJson_(typeof leerFichaComercialUI === "function" ? leerFichaComercialUI() : (fuente && fuente.fichaComercial) || {})
    };
    if (esPresupuestoGrupal()) {
        snap.elementos = clonarJson_((fuente && fuente.elementos) || []);
        snap.elementoActivoId = (fuente && fuente.elementoActivoId) || window.elementoActivoId || "";
        snap.briefGrupal = (fuente && fuente.briefGrupal) || "";
        if (!snap.briefGrupal && (window.historialChatIA || []).length >= 2) {
            snap.briefGrupal = compactarChatParaBrief_(window.historialChatIA);
        }
        sincronizarElementoActivoEnVersion_(snap);
    }
    return snap;
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
    if (esPresupuestoGrupal() && ver.elementos && ver.elementos.length) {
        const el = ver.elementos.find(function (e) { return e.id === ver.elementoActivoId; }) || ver.elementos[0];
        cargarElementoEnUI_(el, ver);
    } else {
        if (typeof pintarFichaComercial === "function") pintarFichaComercial(ver.fichaComercial);
        if (typeof window.pintarHistorialChatIA === "function") {
            window.pintarHistorialChatIA(ver.historialChat || [], ver.faseIA);
        } else {
            window.historialChatIA = ver.historialChat || [];
            window.faseIA = ver.faseIA || "idle";
        }
    }
    if (typeof renderizarTablaItems === "function") renderizarTablaItems();
    pintarSelectorVersiones();
    pintarBarraElementos();
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
    (window.versionesPresupuesto || []).forEach(function (ver) {
        if (!ver.elementos || !ver.elementos.length) return;
        const el = ver.elementos.find(function (e) { return e.id === ver.elementoActivoId; }) || ver.elementos[0];
        if (!el) return;
        if (!ver.matrizItems || !ver.matrizItems.length) ver.matrizItems = clonarJson_(el.matrizItems || []);
        if (!ver.escalas || !ver.escalas.length) ver.escalas = clonarJson_(el.escalas && el.escalas.length ? el.escalas : [{ id: "l1", q: 1 }]);
        if (!ver.historialChat || !ver.historialChat.length) ver.historialChat = clonarJson_(el.historialChat || []);
        if (!ver.fichaComercial || !Object.keys(ver.fichaComercial).length) ver.fichaComercial = clonarJson_(el.fichaComercial || {});
        if (!ver.faseIA) ver.faseIA = el.faseIA || "idle";
    });
    const tipo = (p.cabecera && p.cabecera.tipoEstructura) ||
        ((window.versionesPresupuesto || []).some(function (v) { return v.elementos && v.elementos.length > 1; }) ? "GRUPAL" : "INDIVIDUAL");
    window.tipoEstructura = tipo === "GRUPAL" ? "GRUPAL" : "INDIVIDUAL";
    const selT = document.getElementById("selTipoEstructura");
    if (selT) selT.value = window.tipoEstructura;
    aplicarVersionEnUI(window.versionActivaId, true);
    pintarBarraElementos();
}

function resetearVersionesProyecto() {
    window.versionesPresupuesto = [versionVacia_("V1", "")];
    window.versionActivaId = "V1";
    window.elementoActivoId = "";
    pintarSelectorVersiones();
    pintarBarraElementos();
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
    let extra = ver && ver.comentario ? ver.comentario : "";
    if (esPresupuestoGrupal()) {
        const cod = (document.getElementById("inputCodigo")?.value || "").trim();
        const etiqueta = (cod || "proyecto") + "-" + (activa || "V1");
        extra = extra ? etiqueta + " · " + extra : etiqueta;
    }
    if (nota) nota.textContent = extra;
}

function abrirModalNuevaVersion() {
    snapshotVersionActual();
    const next = siguienteIdVersion();
    const tit = document.getElementById("tituloNuevaVersion");
    if (tit) tit.textContent = "Nueva versión " + next;
    const sub = document.querySelector("#modalNuevaVersion .sb-modal-sub");
    if (sub) {
        sub.textContent = esPresupuestoGrupal()
            ? "Se copian todas las piezas del grupal. El comentario es opcional y va al Excel."
            : "Se copia la versión actual. El comentario es opcional y va al Excel en Observaciones.";
    }
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
    const empaquetado = compactarPayloadNube({
        cabecera: {
            noProyecto: codigo,
            cliente: document.getElementById('cliente')?.value || '',
            nombreProyecto: document.getElementById('noProyecto')?.value || '',
            tipoPresupuesto: (typeof mercadoActual === "function" ? mercadoActual() : (document.getElementById('badgeTipo')?.innerText || 'NACIONAL')),
            tipoEstructura: tipoEstructuraActual(),
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
    mostrarEsperaNube("Guardando en la nube…");
    try {
        const data = await realizarPeticionBD({
            action: "guardar",
            payload: empaquetado.payload
        }, { timeoutMs: 180000 });
        if (!data || !data.exito) {
            mostrarNotificacion(mensajeGuardarNube_((data && data.mensaje) || "No se pudo guardar."), "danger");
            return;
        }
        let refs = data.refs || (data.data && data.data.refs) || {};
        const pendientes = empaquetado.imagenes || [];
        if (pendientes.length && !Object.keys(refs).length) {
            try {
                const img = await realizarPeticionBD({
                    action: "presupuesto_imagenes",
                    codigo: codigo,
                    imagenes: pendientes
                }, { timeoutMs: 180000 });
                if (img && img.exito) refs = img.refs || (img.data && img.data.refs) || refs;
                else if (typeof mostrarNotificacion === "function") {
                    mostrarNotificacion("La matriz quedó guardada. Los renders no: el servidor aún no tiene la acción que los sube a Drive.", "warning");
                }
            } catch (eImg) {
                if (typeof mostrarNotificacion === "function") {
                    mostrarNotificacion("La matriz quedó guardada. Los renders no se subieron: " + (eImg.message || "sin respuesta."), "warning");
                }
            }
        }
        aplicarRefsImagenesVivas_(refs);
        if (typeof programarGuardarSesion === "function") programarGuardarSesion();
        mostrarNotificacion(data.mensaje || "Guardado.", "success");
    } catch (e) {
        mostrarNotificacion(mensajeGuardarNube_(e.message), "danger");
    } finally {
        ocultarEsperaNube();
    }
}

var HIST_COSTOS_LOCAL_ = "smartbudget_hist_costos";

function leerListaLocal_(clave) {
    try {
        const o = JSON.parse(localStorage.getItem(clave) || "null");
        if (o && Array.isArray(o.data)) return o.data;
    } catch (e) {}
    return null;
}

function guardarListaLocal_(clave, data) {
    try { localStorage.setItem(clave, JSON.stringify({ t: Date.now(), data: data || [] })); } catch (e) {}
}

function pintarHistorialCostos_(filas) {
    const tbody = document.getElementById("tbodyHistorial");
    if (!tbody) return;
    if (!filas || !filas.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proyectos.</td></tr>';
        return;
    }
    tbody.innerHTML = filas.map(function (p) {
        const id = String(p.id || "").replace(/'/g, "");
        return '<tr><td class="text-danger fw-bold">' + (p.noProyecto || "") + '</td><td>' + (p.cliente || "S/N") + '</td><td>' + (p.requerimiento || "S/N") + '</td><td><span class="badge ' + (p.tipo === "EXPORTACION" ? "bg-dark" : "bg-primary") + '">' + (p.tipo || "") + '</span></td><td class="text-muted" style="font-size:0.75rem;">' + (p.fechaGuardado || "") + '</td><td class="text-center"><button class="btn btn-sm btn-primary py-0 px-2 me-1" onclick="cargarProyectoBD(\'' + id + '\')"><i class="bi bi-cloud-download"></i></button><button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarProyectoBD(\'' + id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }).join("");
}

async function abrirHistorial() {
    const tbody = document.getElementById('tbodyHistorial');
    if (!tbody) return;
    const previa = leerListaLocal_(HIST_COSTOS_LOCAL_);
    new bootstrap.Modal(document.getElementById('modalHistorial')).show();
    if (previa && previa.length) {
        pintarHistorialCostos_(previa);
    } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-danger mb-2"></div><div class="fw-semibold">Cargando historial de Costos…</div><div class="small text-muted">La nube puede tardar unos segundos.</div></td></tr>';
        mostrarEsperaNube("Cargando historial de Costos…");
    }
    try {
        const data = await realizarPeticionBD({ action: 'listar' });
        if (data.exito) {
            guardarListaLocal_(HIST_COSTOS_LOCAL_, data.data || []);
            pintarHistorialCostos_(data.data || []);
        } else if (!(previa && previa.length)) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proyectos.</td></tr>';
        }
    } catch (e) {
        if (previa && previa.length) {
            pintarHistorialCostos_(previa);
            if (typeof mostrarNotificacion === "function") mostrarNotificacion("Mostrando el historial guardado en este teléfono. " + e.message, "warning");
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="text-danger mb-2">' + e.message + '</div><button type="button" class="btn btn-sm btn-outline-secondary" onclick="abrirHistorial()">Reintentar</button></td></tr>';
        }
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
            /* En Drive solo vive el render con pin de cotización. Planos y fotos del análisis no se recuperan. */
            (p.versiones || []).forEach(function (v) { delete v.archivosGrupo; });
            if (typeof window.vaciarArchivosIA === "function") window.vaciarArchivosIA();
            if (typeof aplicarLocaleProyecto === "function") {
                aplicarLocaleProyecto((p.cabecera && p.cabecera.locale) || {}, { silencio: true });
            }
            hidratarVersionesDesdePayload(p);
            bootstrap.Modal.getInstance(document.getElementById('modalHistorial'))?.hide();
            await hidratarRendersCotizacionNube_();
            const nRenders = await recuperarRendersDesdeCotizaciones_();
            if (typeof window.cargarImagenOdooEnVisor === "function") await window.cargarImagenOdooEnVisor({ force: true });
            ponerRendersCotizacionEnVisor_();
            const nVer = (window.versionesPresupuesto || []).length;
            const nChat = (window.historialChatIA || []).length;
            const avisoRenders = nRenders ? (" Se recuperaron " + nRenders + " render" + (nRenders === 1 ? "" : "s") + " de la cotización guardada.") : "";
            mostrarNotificacion((nVer > 1 ? (nVer + " versiones. ") : "") + (nChat ? "Proyecto y chat cargados." : "Proyecto cargado.") + avisoRenders, "success");
        }
    } catch(e) { mostrarNotificacion(e.message, "danger"); }
    finally { ocultarEsperaNube(); }
}

var SESION_TRABAJO_KEY = "smartbudget_sesion_v1";
var _sesionGuardarT = null;

function idsCabeceraSesion() {
    return ["inputCodigo", "noProyecto", "cliente", "fecha", "comercial", "disenador", "analista", "simFee", "selMercado", "selTipoEstructura"];
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
        cabecera: { tipoPresupuesto: s.cabecera && s.cabecera.selMercado, tipoEstructura: s.cabecera && s.cabecera.selTipoEstructura, versionActiva: s.versionActivaId },
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
    if (typeof window.cargarImagenOdooEnVisor === "function") {
        const hayOdoo = (window.archivosGemaBase64 || []).some(function (f) { return f && f._odoo; });
        if (!hayOdoo) window.cargarImagenOdooEnVisor();
    }
    asegurarV1_();
    pintarSelectorVersiones();
    pintarBarraElementos();
    if(typeof renderizarTablaItems === "function") renderizarTablaItems();
    if(typeof inicializarDragAndDropArchivos === "function") inicializarDragAndDropArchivos();
    if(typeof habilitarVentanasFlotantes === "function") habilitarVentanasFlotantes();
    
    // 3. Listeners
    ['simTRM', 'simComision', 'simFee'].forEach(id => { const el = document.getElementById(id); if(el) el.onchange = () => { if (typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero(); if (id === "simFee" && typeof logisticaFeeLibreCambio_ === "function") logisticaFeeLibreCambio_(); programarGuardarSesion(); }; });
    idsCabeceraSesion().forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", programarGuardarSesion);
        if (el) el.addEventListener("input", programarGuardarSesion);
    });
    ["fichaTitulo", "fichaDesc", "fichaDimAncho", "fichaDimFondo", "fichaDimAlto", "fichaEmpAncho", "fichaEmpFondo", "fichaEmpAlto", "fichaEmpUnd", "fichaEmpPeso"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", programarGuardarSesion);
            el.addEventListener("input", programarGuardarSesion);
        }
    });
    if (typeof pintarLocaleProyecto === "function") pintarLocaleProyecto();
});
