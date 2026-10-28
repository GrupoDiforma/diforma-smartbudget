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

/**
 * Confirmación con identidad SmartBudget (reemplazo de window.confirm).
 * @returns {Promise<boolean>}
 */
window.mostrarConfirmacionApp = function (opts) {
    opts = opts || {};
    const el = document.getElementById("modalConfirmacionApp");
    if (!el || typeof bootstrap === "undefined") {
        return Promise.resolve(!!window.confirm(String(opts.mensaje || opts.message || "¿Continuar?")));
    }
    return new Promise(function (resolve) {
        const tit = document.getElementById("confirmAppTitulo");
        const sub = document.getElementById("confirmAppSub");
        const msg = document.getElementById("confirmAppMensaje");
        const btnOk = document.getElementById("confirmAppOk");
        const btnNo = document.getElementById("confirmAppCancelar");
        if (tit) tit.textContent = opts.titulo || opts.title || "Confirmar";
        if (sub) {
            const s = String(opts.subtitulo || opts.sub || "").trim();
            sub.textContent = s;
            sub.classList.toggle("d-none", !s);
        }
        if (msg) msg.textContent = opts.mensaje || opts.message || "¿Continuar?";
        if (btnOk) {
            btnOk.textContent = opts.okTexto || opts.okText || "Aceptar";
            btnOk.className = "btn " + (opts.peligro || opts.danger
                ? "btn-outline-danger"
                : "btn-diforma-blue");
        }
        if (btnNo) btnNo.textContent = opts.cancelarTexto || opts.cancelText || "Cancelar";
        let decidido = false;
        const cerrar = function (ok) {
            if (decidido) return;
            decidido = true;
            btnOk && btnOk.removeEventListener("click", onOk);
            btnNo && btnNo.removeEventListener("click", onNo);
            el.removeEventListener("hidden.bs.modal", onHide);
            resolve(!!ok);
            const inst = bootstrap.Modal.getInstance(el);
            if (inst) inst.hide();
        };
        const onOk = function () { cerrar(true); };
        const onNo = function () { cerrar(false); };
        const onHide = function () { cerrar(false); };
        if (btnOk) btnOk.addEventListener("click", onOk);
        if (btnNo) btnNo.addEventListener("click", onNo);
        el.addEventListener("hidden.bs.modal", onHide);
        /* Encima de otros modales (p. ej. historial de cotizaciones). */
        el.style.zIndex = "1085";
        const modal = bootstrap.Modal.getOrCreateInstance(el, { backdrop: "static", keyboard: true });
        modal.show();
        const backdrops = document.querySelectorAll(".modal-backdrop");
        const last = backdrops[backdrops.length - 1];
        if (last) last.style.zIndex = "1080";
    });
};

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
                throw new Error("Gemini tardó más de lo esperado. Espera un minuto (el servidor de Google puede seguir ocupado) y reintenta una sola vez.");
            }
            throw new Error("El servidor tardó demasiado. Vuelve a intentar.");
        }
        const m = String(e.message || e);
        if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
            var act = String((payload && payload.action) || "");
            if (/^gemini_/.test(act)) {
                throw new Error("Se cortó la conexión con Gemini. Espera un minuto (el servidor de Google puede seguir ocupado) y reintenta.");
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
            if (typeof setNombreProyectoUI_ === "function") setNombreProyectoUI_(codigo, op.name);
            else setVal("noProyecto", op.name);
            setVal('cliente', op.partner_id ? op.partner_id[1] : ''); setVal('comercial', op.user_id ? op.user_id[1] : '');
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

var PIN_INDIV_ID_ = "_indiv";

function elementoActivoObj_() {
    const ver = versionActualObj_();
    if (!ver || !ver.elementos) return null;
    const id = ver.elementoActivoId || window.elementoActivoId;
    return ver.elementos.find(function (e) { return e.id === id; }) || ver.elementos[0] || null;
}

/** Donde vive el pin: pieza activa (grupal) o la versión (individual). */
function hostPinCotizacion_() {
    const ver = versionActualObj_();
    if (!ver) return null;
    if (esPresupuestoGrupal()) return elementoActivoObj_();
    return ver;
}

function idPinCotizacion_(host) {
    if (!host) return "";
    if (esPresupuestoGrupal() && host.id) return String(host.id);
    return PIN_INDIV_ID_;
}

function hostTienePin_(host) {
    return !!(host && (host.imgCotizacion || host.imgRef || host.imgCotizacionFileId || host.imgCotizacionNombre));
}

window.imagenCotizacionElemento = function (elemId) {
    const ver = versionActualObj_();
    if (!ver) return "";
    if (!esPresupuestoGrupal() || String(elemId) === PIN_INDIV_ID_) {
        return ver.imgCotizacion || "";
    }
    if (!ver.elementos) return "";
    const el = ver.elementos.find(function (e) { return String(e.id) === String(elemId); });
    return (el && el.imgCotizacion) || "";
};

window.imgRefCotizacionElemento = function (elemId, verId) {
    const vers = window.versionesPresupuesto || [];
    const ver = verId
        ? vers.find(function (v) { return String(v.id) === String(verId); })
        : versionActualObj_();
    if (!ver) return "";
    if (!ver.elementos || !ver.elementos.length || String(elemId) === PIN_INDIV_ID_) {
        return ver.imgRef || "";
    }
    const el = ver.elementos.find(function (e) { return String(e.id) === String(elemId); });
    return (el && el.imgRef) || "";
};

window.archivoEsPinCotizacion = function (file) {
    if (!file || !/^image\//i.test(file.mimeType || "")) return false;
    const host = hostPinCotizacion_();
    const pinId = idPinCotizacion_(host);
    if (!host || !hostTienePin_(host)) return false;
    if (host.imgCotizacionFileId && file.id && file.id === host.imgCotizacionFileId) return true;
    if (file._pinCotizacion && file._pinCotizacion === pinId) return true;
    if (host.imgCotizacionNombre && file.name && file.name === host.imgCotizacionNombre) return true;
    return false;
};

function huellaImgCotizacion_(data) {
    const s = String(data || "");
    if (!s) return "";
    return s.length + ":" + s.slice(24, 40) + ":" + s.slice(-20);
}

window.asignarRenderCotizacionElemento = async function (idx) {
    const files = window.archivosGemaBase64 || [];
    const i = idx != null ? idx : (window._visorIdx || 0);
    const f = files[i];
    if (!f || !/^image\//i.test(f.mimeType || "")) {
        return typeof mostrarNotificacion === "function" && mostrarNotificacion("Elige una imagen (no PDF) para la cotización.", "warning");
    }
    snapshotVersionActual();
    const host = hostPinCotizacion_();
    if (!host) return;
    const pinId = idPinCotizacion_(host);
    const grupal = esPresupuestoGrupal();
    try {
        const fileId = idArchivoVisor_(f);
        f._pinCotizacion = pinId;
        (window.archivosGemaBase64 || []).forEach(function (otro) {
            if (otro !== f && otro._pinCotizacion === pinId) delete otro._pinCotizacion;
        });
        if (grupal) f.elemId = pinId;
        if (host.imgCotizacionFileId === fileId && host.imgRef) {
            host.imgCotizacionNombre = f.name || host.imgCotizacionNombre || "";
            if (grupal) sincronizarArchivosGrupoEnVersion_(versionActualObj_());
            if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
            if (typeof mostrarNotificacion === "function") {
                mostrarNotificacion(grupal
                    ? ("Ese render ya está en la cotización de «" + (host.nombre || "pieza") + "».")
                    : "Ese render ya está en la cotización.", "success");
            }
            return;
        }
        const src = "data:" + (f.mimeType || "image/jpeg") + ";base64," + (f.data || "");
        const thumb = typeof window.reducirImagenJpeg === "function"
            ? await window.reducirImagenJpeg(src, 1000, 0.88)
            : src;
        if (host.imgRef) host.imgRefAnterior = host.imgRef;
        host.imgCotizacion = thumb;
        host.imgCotizacionNombre = f.name || "";
        host.imgCotizacionFileId = fileId;
        host.imgCotizacionHuella = huellaImgCotizacion_(thumb);
        delete host.imgRef;
        if (grupal) sincronizarArchivosGrupoEnVersion_(versionActualObj_());
        if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion(grupal
                ? ("Este render queda en la cotización de «" + (host.nombre || "pieza") + "». Las demás piezas no lo heredan.")
                : "Este render queda en la cotización del proyecto.", "success");
        }
        if (typeof programarGuardarSesion === "function") programarGuardarSesion();
        if (typeof logisticaRefrescarTabla_ === "function") logisticaRefrescarTabla_();
    } catch (err) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se pudo asignar el render.", "danger");
    }
};

/** Si Individual no tiene pin, usa el render de Odoo del visor. */
window.asegurarPinOdooIndividual_ = async function () {
    if (esPresupuestoGrupal()) return false;
    const host = hostPinCotizacion_();
    if (!host || hostTienePin_(host)) return false;
    const files = window.archivosGemaBase64 || [];
    const ix = files.findIndex(function (f) { return f && f._odoo && /^image\//i.test(f.mimeType || ""); });
    if (ix < 0) return false;
    await window.asignarRenderCotizacionElemento(ix);
    return true;
};

function extraerPinHost_(host, k, imagenes) {
    if (!host) return;
    const data = host.imgCotizacion;
    const huella = huellaImgCotizacion_(data);
    const yaEnDrive = !!(host.imgRef && (!huella || !host.imgCotizacionHuella || host.imgCotizacionHuella === huella));
    if (data && /^data:image\//.test(data) && !yaEnDrive) {
        imagenes.push({
            k: k,
            data: data,
            reemplaza: host.imgRef || host.imgRefAnterior || ""
        });
        host.imgCotizacionHuella = huella;
        delete host.imgRef;
    }
    delete host.imgCotizacion;
    delete host.imgRefAnterior;
}

function extraerImagenesPresupuesto_(payload) {
    const imagenes = [];
    (payload.versiones || []).forEach(function (v) {
        delete v.archivosGrupo;
        const elems = v.elementos || [];
        if (elems.length) {
            elems.forEach(function (el) {
                extraerPinHost_(el, String(v.id || "V1") + ":" + String(el.id || ""), imagenes);
            });
            delete v.imgCotizacion;
            delete v.imgRefAnterior;
        } else {
            extraerPinHost_(v, String(v.id || "V1") + ":" + PIN_INDIV_ID_, imagenes);
        }
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
        const kInd = String(v.id || "V1") + ":" + PIN_INDIV_ID_;
        if (refs[kInd]) {
            v.imgRef = refs[kInd];
            delete v.imgRefAnterior;
            if (v.imgCotizacion) v.imgCotizacionHuella = huellaImgCotizacion_(v.imgCotizacion);
        }
    });
}

async function hidratarRendersCotizacionNube_() {
    const dest = [];
    (window.versionesPresupuesto || []).forEach(function (v) {
        (v.elementos || []).forEach(function (el) {
            if (el.imgRef && !el.imgCotizacion) dest.push(el);
        });
        if ((!v.elementos || !v.elementos.length) && v.imgRef && !v.imgCotizacion) dest.push(v);
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
            if (!(el.imgRef || el.imgCotizacionNombre || el.imgCotizacionHuella || el.imgCotizacionFileId)) return;
            pend.push(el);
        });
        if (v.elementos && v.elementos.length) return;
        if (v.imgCotizacion && /^data:image\//.test(v.imgCotizacion)) return;
        if (!(v.imgRef || v.imgCotizacionNombre || v.imgCotizacionHuella || v.imgCotizacionFileId)) return;
        pend.push(v);
    });
    if (!pend.length || typeof realizarPeticionBD !== "function") return 0;
    const codigo = (typeof codigoOportunidadActual_ === "function" ? codigoOportunidadActual_() : "")
        || String(document.getElementById("inputCodigo")?.value || "").trim();
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
        const faltan = pend.filter(function (el) { return !(el.imgCotizacion && /^data:image\//.test(el.imgCotizacion)); });
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
    if (!ver) return;
    const pushPin_ = function (host, pinId, nombre) {
        if (!host || !host.imgCotizacion || !/^data:image\//.test(host.imgCotizacion)) return;
        const ya = files.some(function (f) { return f && f._pinCotizacion === pinId; });
        if (ya) return;
        const m = String(host.imgCotizacion).match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return;
        files.push({
            id: host.imgCotizacionFileId || ("pin-" + pinId),
            name: host.imgCotizacionNombre || nombre || "Cotización.jpg",
            mimeType: m[1],
            data: m[2],
            elemId: pinId === PIN_INDIV_ID_ ? "" : pinId,
            alcance: pinId === PIN_INDIV_ID_ ? "grupo" : "pieza",
            _pinCotizacion: pinId
        });
    };
    if (ver.elementos && ver.elementos.length) {
        ver.elementos.forEach(function (el) {
            pushPin_(el, el.id, (el.nombre || "Pieza") + ".jpg");
        });
    } else {
        pushPin_(ver, PIN_INDIV_ID_, "Cotización.jpg");
    }
    window.archivosGemaBase64 = files;
    const activa = esPresupuestoGrupal()
        ? (window.elementoActivoId || ver.elementoActivoId)
        : PIN_INDIV_ID_;
    const pin = files.findIndex(function (f) { return f && f._pinCotizacion && f._pinCotizacion === activa; });
    if (pin >= 0) window._visorIdx = pin;
    if (typeof window.actualizarListaUI === "function") window.actualizarListaUI();
}

let _cargaRendersP = null;

/** Imagen de Odoo (Grupo) y el render con pin de cotización de cada pieza. */
window.cargarRendersVisor = function (opts) {
    opts = opts || {};
    if (_cargaRendersP) return _cargaRendersP;
    _cargaRendersP = (async function () {
        const btn = document.getElementById("btnCargarRenders");
        if (btn) btn.disabled = true;
        if (!opts.silencio && typeof mostrarEsperaNube === "function") mostrarEsperaNube("Cargando renders…");
        let odooOk = false;
        let nPins = 0;
        try {
            if (typeof window.cargarImagenOdooEnVisor === "function") {
                await window.cargarImagenOdooEnVisor({ force: true });
                odooOk = (window.archivosGemaBase64 || []).some(function (f) { return f && f._odoo; });
            }
            await hidratarRendersCotizacionNube_();
            nPins = await recuperarRendersDesdeCotizaciones_();
            ponerRendersCotizacionEnVisor_();
            if (typeof window.asegurarPinOdooIndividual_ === "function") {
                await window.asegurarPinOdooIndividual_();
            }
            nPins = (window.archivosGemaBase64 || []).filter(function (f) { return f && f._pinCotizacion; }).length || nPins;
        } finally {
            if (btn) btn.disabled = false;
            if (!opts.silencio && typeof ocultarEsperaNube === "function") ocultarEsperaNube();
        }
        if (!opts.silencio && typeof mostrarNotificacion === "function") {
            const partes = [];
            if (odooOk) partes.push("La imagen de Odoo quedó como Grupo.");
            else partes.push("Odoo no trajo imagen para este código.");
            if (nPins) partes.push(nPins + " render" + (nPins === 1 ? "" : "s") + " con pin de cotización.");
            else partes.push("No hay renders con pin de cotización para recuperar.");
            mostrarNotificacion(partes.join(" "), odooOk || nPins ? "success" : "warning");
        }
        return nPins;
    })().finally(function () { _cargaRendersP = null; });
    return _cargaRendersP;
};

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
        const primero = Object.assign(elementoVacio_(nombre), {
            matrizItems: clonarJson_(ver.matrizItems || []),
            escalas: clonarJson_(ver.escalas && ver.escalas.length ? ver.escalas : [{ id: "l1", q: 1 }]),
            historialChat: clonarJson_(ver.historialChat || []),
            faseIA: ver.faseIA || "idle",
            fichaComercial: clonarJson_(ver.fichaComercial || {})
        });
        if (ver.imgCotizacion) primero.imgCotizacion = ver.imgCotizacion;
        if (ver.imgRef) primero.imgRef = ver.imgRef;
        if (ver.imgCotizacionNombre) primero.imgCotizacionNombre = ver.imgCotizacionNombre;
        if (ver.imgCotizacionFileId) primero.imgCotizacionFileId = ver.imgCotizacionFileId;
        if (ver.imgCotizacionHuella) primero.imgCotizacionHuella = ver.imgCotizacionHuella;
        delete ver.imgCotizacion;
        delete ver.imgRef;
        delete ver.imgCotizacionNombre;
        delete ver.imgCotizacionFileId;
        delete ver.imgCotizacionHuella;
        delete ver.imgRefAnterior;
        ver.elementos = [primero];
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
        if (el.imgCotizacion) ver.imgCotizacion = el.imgCotizacion;
        if (el.imgRef) ver.imgRef = el.imgRef;
        if (el.imgCotizacionNombre) ver.imgCotizacionNombre = el.imgCotizacionNombre;
        if (el.imgCotizacionFileId) ver.imgCotizacionFileId = el.imgCotizacionFileId;
        if (el.imgCotizacionHuella) ver.imgCotizacionHuella = el.imgCotizacionHuella;
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
        pintarEtiquetaVersion_();
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
    pintarEtiquetaVersion_();
}

function htmlChipsElementos_() {
    const ver = versionActualObj_();
    const elems = (ver && ver.elementos) || [];
    const activa = (ver && ver.elementoActivoId) || window.elementoActivoId;
    return elems.map(function (e) {
        const isOn = e.id === activa ? " is-on" : "";
        const nom = String(e.nombre || "Pieza").replace(/</g, "&lt;").replace(/"/g, "&quot;");
        return '<button type="button" class="elem-chip' + isOn + '" onclick="aplicarElementoEnUI(\'' + e.id + '\')">' + nom + "</button>";
    }).join("");
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
    /* En grupal, cada título de sección cambia de elemento (como las versiones en individual). */
    const html = on ? htmlChipsElementos_() : "";
    ["badgeElemento1", "badgePrearmadoElemento", "badgeMatrizElemento", "badgeSimuladorElemento"].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        if (on && html) {
            el.innerHTML = html;
            el.classList.remove("d-none");
        } else {
            el.innerHTML = "";
            el.classList.add("d-none");
        }
    });
    const btn = document.getElementById("btnRenderCotizacion");
    /* Pin disponible en Individual y Grupal. */
    if (btn) btn.classList.remove("d-none");
}

function htmlChipsVersion_() {
    const activa = window.versionActivaId || "V1";
    return (window.versionesPresupuesto || []).map(function (v) {
        const on = v.id === activa ? " is-on" : "";
        const title = String(v.comentario || "Ver " + v.id).replace(/"/g, "&quot;");
        return '<button type="button" class="ver-chip' + on + '" title="' + title + '" onclick="aplicarVersionEnUI(\'' + v.id + '\')">' + v.id + "</button>";
    }).join("");
}

function pintarEtiquetaVersion_() {
    const individual = typeof esPresupuestoGrupal !== "function" || !esPresupuestoGrupal();
    const varias = (window.versionesPresupuesto || []).length > 1;
    const html = htmlChipsVersion_();
    ["badgeVersion2", "badgeVersion3", "badgeVersion4"].forEach(function (bid) {
        const el = document.getElementById(bid);
        if (!el) return;
        if (individual && varias) {
            el.innerHTML = html;
            el.classList.remove("d-none");
        } else {
            el.innerHTML = "";
            el.classList.add("d-none");
        }
    });
}

function marcarSaltoVersion_(id) {
    document.querySelectorAll(".sec-titulo, .matriz-scroll, #chatBox").forEach(function (el) {
        el.classList.remove("elem-flash");
        void el.offsetWidth;
        el.classList.add("elem-flash");
    });
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("Cambiaste a " + (id || "esta versión") + ". Ficha, chat y matriz son de esta versión.", "info");
    }
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

function idVersionCanon_(id) {
    const m = String(id || "").trim().match(/^v(\d+)$/i);
    if (m) return "V" + String(parseInt(m[1], 10));
    return String(id || "").trim() || "V1";
}

function versionTieneTrabajo_(v) {
    if (!v) return false;
    if ((v.matrizItems || []).length || (v.historialChat || []).length) return true;
    if ((v.elementos || []).some(function (e) { return (e.matrizItems || []).length || (e.historialChat || []).length; })) return true;
    const f = v.fichaComercial || {};
    return !!(f.titulo || f.descripcion);
}

/** V1 y v1 son la misma versión. No se crea otra por la mayúscula. */
function canonizarVersiones_() {
    const lista = window.versionesPresupuesto;
    if (!Array.isArray(lista) || !lista.length) return;
    const grupos = {};
    const orden = [];
    lista.forEach(function (v) {
        const id = idVersionCanon_(v.id);
        if (!grupos[id]) {
            grupos[id] = [];
            orden.push(id);
        }
        grupos[id].push(v);
    });
    const activa = idVersionCanon_(window.versionActivaId);
    const out = orden.map(function (id) {
        const g = grupos[id];
        let keep = g[g.length - 1];
        if (g.length > 1) {
            const conTrabajo = g.filter(versionTieneTrabajo_);
            const marcada = g.find(function (v) { return String(v.id) === String(window.versionActivaId); })
                || g.find(function (v) { return idVersionCanon_(v.id) === activa; });
            keep = (marcada && (versionTieneTrabajo_(marcada) || !conTrabajo.length)) ? marcada : (conTrabajo[conTrabajo.length - 1] || marcada || keep);
        }
        keep.id = id;
        return keep;
    });
    window.versionesPresupuesto = out;
    window.versionActivaId = out.some(function (v) { return v.id === activa; }) ? activa : out[0].id;
}

function asegurarV1_() {
    if (!Array.isArray(window.versionesPresupuesto) || !window.versionesPresupuesto.length) {
        window.versionesPresupuesto = [snapshotDesdeUI_("V1", "")];
        window.versionActivaId = "V1";
    }
    if (!window.versionActivaId) window.versionActivaId = window.versionesPresupuesto[0].id;
    canonizarVersiones_();
}

function snapshotVersionActual() {
    asegurarV1_();
    const id = idVersionCanon_(window.versionActivaId || "V1");
    window.versionActivaId = id;
    const snap = snapshotDesdeUI_(id);
    const i = window.versionesPresupuesto.findIndex(function (v) { return idVersionCanon_(v.id) === id; });
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
    id = idVersionCanon_(id);
    const previa = window.versionActivaId || "";
    if (!omitirSnapshot) snapshotVersionActual();
    const ver = (window.versionesPresupuesto || []).find(function (v) { return idVersionCanon_(v.id) === id; });
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
    if (previa && previa !== id && !esPresupuestoGrupal()) marcarSaltoVersion_(id);
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
    canonizarVersiones_();
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
    /* Nueva mesa = Individual. Si el select queda en Grupal, pintarBarraElementos recrea Pieza 1. */
    window.tipoEstructura = "INDIVIDUAL";
    const selT = document.getElementById("selTipoEstructura");
    if (selT) selT.value = "INDIVIDUAL";
    pintarSelectorVersiones();
    pintarBarraElementos();
}

function pintarSelectorVersiones() {
    asegurarV1_();
    const box = document.getElementById("chipsVersiones");
    const nota = document.getElementById("comentarioVersionActiva");
    if (!box) return;
    const activa = window.versionActivaId;
    box.innerHTML = htmlChipsVersion_();
    const ver = window.versionesPresupuesto.find(function (v) { return v.id === activa; });
    let extra = ver && ver.comentario ? ver.comentario : "";
    if (esPresupuestoGrupal()) {
        const cod = (document.getElementById("inputCodigo")?.value || "").trim();
        const etiqueta = (cod || "proyecto") + "-" + (activa || "V1");
        extra = extra ? etiqueta + " · " + extra : etiqueta;
    }
    if (nota) nota.textContent = extra;
    pintarEtiquetaVersion_();
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
    const fichaTitulo = String((document.getElementById("fichaTitulo") || {}).value || "").trim();
    let nombreProyecto = String(document.getElementById("noProyecto")?.value || "").trim();
    if (!nombreProyecto || nombreProyecto === "$") nombreProyecto = fichaTitulo || "";
    if (typeof nombreProyectoFormato_ === "function") {
        nombreProyecto = nombreProyectoFormato_(codigo, nombreProyecto || fichaTitulo);
    } else if (nombreProyecto && nombreProyecto.indexOf(codigo) !== 0) {
        nombreProyecto = codigo + " " + nombreProyecto;
    } else if (!nombreProyecto) {
        nombreProyecto = codigo;
    }
    const nomEl = document.getElementById("noProyecto");
    if (nomEl && nomEl.value !== nombreProyecto) nomEl.value = nombreProyecto;
    const empaquetado = compactarPayloadNube({
        cabecera: {
            noProyecto: codigo,
            cliente: document.getElementById('cliente')?.value || '',
            nombreProyecto: nombreProyecto,
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
            payload: empaquetado.payload,
            imagenes: empaquetado.imagenes || []
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
var _histCostosFilas = [];
var _histCostosFiltro = "";

function escHtmlHist_(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normCodigoProyecto_(s) {
    return String(s || "").trim().toUpperCase().replace(/\s+/g, "");
}

function normBusquedaHist_(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function proyectoGuardadoPorCodigo_(filas, codigo) {
    const n = normCodigoProyecto_(codigo);
    if (!n) return null;
    return (filas || []).find(function (p) {
        return normCodigoProyecto_(p.noProyecto) === n || normCodigoProyecto_(p.id) === n;
    }) || null;
}

async function listaHistorialCostos_() {
    try {
        const data = await realizarPeticionBD({ action: "listar" });
        if (data && data.exito && Array.isArray(data.data)) {
            guardarListaLocal_(HIST_COSTOS_LOCAL_, data.data);
            return { filas: data.data, origen: "nube" };
        }
    } catch (e) {}
    const local = leerListaLocal_(HIST_COSTOS_LOCAL_);
    if (local) return { filas: local, origen: "local" };
    return { filas: [], origen: "desconocido" };
}

function ocultarAvisoCodigoGuardado() {
    const el = document.getElementById("avisoCodigoGuardado");
    if (!el) return;
    el.classList.add("d-none");
    el.innerHTML = "";
}

function cerrarAvisoCodigoGuardado() {
    const p = window._importOdooPendiente;
    const restaurar = p && p.codigoRestaurar != null ? String(p.codigoRestaurar) : "";
    const input = document.getElementById("inputCodigo");
    if (input && restaurar) input.value = restaurar;
    window._importOdooPendiente = null;
    ocultarAvisoCodigoGuardado();
    if (typeof mostrarAlertaOdoo === "function") {
        mostrarAlertaOdoo("No se modificó el presupuesto en pantalla.", "info");
    }
}

function mostrarAvisoProyectoGuardado(guardado, codigo, inseguro) {
    const el = document.getElementById("avisoCodigoGuardado");
    if (!el) return;
    const cod = escHtmlHist_(codigo);
    let texto;
    let acciones;
    if (guardado) {
        const quien = escHtmlHist_(guardado.cliente || "sin cliente");
        const cuando = escHtmlHist_(guardado.fechaGuardado || "");
        texto = "<strong>" + cod + "</strong> ya tiene un presupuesto guardado (" + quien + (cuando ? " · " + cuando : "") + "). Ábrelo para seguir donde quedó. Empezar de cero borra la matriz de esta pantalla.";
        acciones = '<button type="button" class="btn btn-sm btn-primary" onclick="abrirProyectoGuardadoDesdeBusqueda()">Abrir guardado</button>'
            + '<button type="button" class="btn btn-sm btn-outline-danger" onclick="confirmarImportOdooDesdeCero()">Empezar de cero</button>';
    } else {
        texto = "No pude confirmar en la nube si <strong>" + cod + "</strong> ya está guardado. Revísalo en Historial antes de seguir. Empezar de cero borra la matriz de esta pantalla.";
        acciones = '<button type="button" class="btn btn-sm btn-primary" onclick="abrirHistorial()">Abrir historial</button>'
            + '<button type="button" class="btn btn-sm btn-outline-danger" onclick="confirmarImportOdooDesdeCero()">Empezar de cero</button>';
    }
    if (inseguro && guardado) {
        texto += " Este aviso sale de la copia guardada en este equipo.";
    }
    el.innerHTML = '<div class="alert alert-warning py-2 px-3 mb-0 d-flex flex-wrap align-items-center justify-content-between gap-2">'
        + '<div><i class="bi bi-exclamation-triangle me-1"></i> ' + texto + "</div>"
        + '<div class="d-flex flex-wrap gap-2">' + acciones
        + '<button type="button" class="btn btn-sm btn-outline-secondary" onclick="cerrarAvisoCodigoGuardado()">Cerrar</button></div></div>';
    el.classList.remove("d-none");
    const box = document.getElementById("odooAlert");
    if (box) box.classList.add("d-none");
}

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

function filasHistorialVisibles_() {
    const q = normBusquedaHist_(_histCostosFiltro).trim();
    if (!q) return _histCostosFilas;
    return _histCostosFilas.filter(function (p) {
        const texto = [p.noProyecto, p.cliente, p.requerimiento, p.tipo, p.fechaGuardado].join(" ");
        return normBusquedaHist_(texto).indexOf(q) !== -1;
    });
}

function filtrarHistorialCostos(valor) {
    _histCostosFiltro = valor || "";
    dibujarFilasHistorial_();
}

function pintarHistorialCostos_(filas) {
    _histCostosFilas = filas || [];
    dibujarFilasHistorial_();
}

function dibujarFilasHistorial_() {
    const tbody = document.getElementById("tbodyHistorial");
    if (!tbody) return;
    const filas = filasHistorialVisibles_();
    if (!_histCostosFilas.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proyectos.</td></tr>';
        return;
    }
    if (!filas.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Ningún proyecto coincide con «' + escHtmlHist_(_histCostosFiltro) + '».</td></tr>';
        return;
    }
    tbody.innerHTML = filas.map(function (p) {
        const id = String(p.id || "").replace(/'/g, "");
        return '<tr><td class="text-danger fw-bold">' + escHtmlHist_(p.noProyecto || "") + '</td><td>' + escHtmlHist_(p.cliente || "S/N") + '</td><td>' + escHtmlHist_(p.requerimiento || "S/N") + '</td><td><span class="badge ' + (p.tipo === "EXPORTACION" ? "bg-dark" : "bg-primary") + '">' + escHtmlHist_(p.tipo || "") + '</span></td><td class="text-muted" style="font-size:0.75rem;">' + escHtmlHist_(p.fechaGuardado || "") + '</td><td class="text-center"><button class="btn btn-sm btn-primary py-0 px-2 me-1" onclick="cargarProyectoBD(\'' + id + '\')"><i class="bi bi-cloud-download"></i></button><button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarProyectoBD(\'' + id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }).join("");
}

async function abrirHistorial() {
    const tbody = document.getElementById('tbodyHistorial');
    if (!tbody) return;
    const previa = leerListaLocal_(HIST_COSTOS_LOCAL_);
    const filtro = document.getElementById("filtroHistorial");
    if (filtro && document.activeElement !== filtro) {
        filtro.value = "";
        _histCostosFiltro = "";
    }
    new bootstrap.Modal(document.getElementById('modalHistorial')).show();
    if (filtro) setTimeout(function () { filtro.focus(); }, 200);
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
            const codigoCab = String((p.cabecera && p.cabecera.noProyecto) || idProyecto || "").trim();
            let nombreCab = String((p.cabecera && p.cabecera.nombreProyecto) || "").trim();
            if (typeof nombreProyectoFormato_ === "function") nombreCab = nombreProyectoFormato_(codigoCab, nombreCab);
            else if (!nombreCab || nombreCab === "$") nombreCab = codigoCab;
            setVal("inputCodigo", codigoCab);
            setVal("noProyecto", nombreCab);
            setVal("cliente", p.cabecera?.cliente);
            window._codigoProyectoActivo = codigoCab;
            window.odooPistas = p.odooPistas || {};
            /* En Drive solo vive el render con pin de cotización. Planos y fotos del análisis no se recuperan. */
            (p.versiones || []).forEach(function (v) { delete v.archivosGrupo; });
            if (typeof window.vaciarArchivosIA === "function") window.vaciarArchivosIA();
            if (typeof aplicarLocaleProyecto === "function") {
                aplicarLocaleProyecto((p.cabecera && p.cabecera.locale) || {}, { silencio: true });
            }
            hidratarVersionesDesdePayload(p);
            bootstrap.Modal.getInstance(document.getElementById('modalHistorial'))?.hide();
            const nRenders = typeof window.cargarRendersVisor === "function"
                ? await window.cargarRendersVisor({ silencio: true })
                : 0;
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
var _flushPinsDriveP = null;
var _restauroNecesitaRenders = false;

function idsCabeceraSesion() {
    return ["inputCodigo", "noProyecto", "cliente", "fecha", "comercial", "disenador", "analista", "simFee", "selMercado", "selTipoEstructura"];
}

/** Versiones sin blobs: en localStorage solo refs Drive + meta del pin. */
function aligerarVersionesSesion_(versiones) {
    const v = clonarJson_(versiones || []);
    v.forEach(function (ver) {
        delete ver.archivosGrupo;
        delete ver.imgCotizacion;
        (ver.elementos || []).forEach(function (el) {
            delete el.imgCotizacion;
        });
    });
    return v;
}

function pinsPendientesDrive_() {
    const imagenes = [];
    (window.versionesPresupuesto || []).forEach(function (ver) {
        (ver.elementos || []).forEach(function (el) {
            const data = el && el.imgCotizacion;
            if (!data || !/^data:image\//.test(data) || el.imgRef) return;
            imagenes.push({
                k: String(ver.id || "V1") + ":" + String(el.id || ""),
                data: data,
                reemplaza: el.imgRefAnterior || ""
            });
        });
        if (ver.elementos && ver.elementos.length) return;
        const dataV = ver.imgCotizacion;
        if (!dataV || !/^data:image\//.test(dataV) || ver.imgRef) return;
        imagenes.push({
            k: String(ver.id || "V1") + ":" + PIN_INDIV_ID_,
            data: dataV,
            reemplaza: ver.imgRefAnterior || ""
        });
    });
    return imagenes;
}

/** Sube a Drive pins que aún no tienen imgRef (si el presupuesto ya existe en la nube). */
function programarFlushPinsDrive_() {
    if (_flushPinsDriveP) return;
    const codigo = String(document.getElementById("inputCodigo")?.value || window._codigoProyectoActivo || "").trim();
    const imagenes = pinsPendientesDrive_();
    if (!codigo || !imagenes.length || typeof realizarPeticionBD !== "function") return;
    _flushPinsDriveP = realizarPeticionBD({
        action: "presupuesto_imagenes",
        codigo: codigo,
        imagenes: imagenes
    }, { timeoutMs: 120000 }).then(function (r) {
        if (!r || !r.exito) return;
        const refs = r.refs || (r.data && r.data.refs) || {};
        if (Object.keys(refs).length) {
            aplicarRefsImagenesVivas_(refs);
            programarGuardarSesion();
        }
    }).catch(function () { /* sin nube aún: el pin vive en memoria hasta Guardar en Nube */ })
    .finally(function () { _flushPinsDriveP = null; });
}

function cancelarGuardarSesionPendiente() {
    clearTimeout(_sesionGuardarT);
    _sesionGuardarT = null;
}
window.cancelarGuardarSesionPendiente = cancelarGuardarSesionPendiente;

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
            /* Renders viven en Drive/Odoo; la sesión no guarda base64. */
            archivos: [],
            versiones: aligerarVersionesSesion_(window.versionesPresupuesto || []),
            versionActivaId: window.versionActivaId || "V1",
            locale: typeof localeProyectoActual === "function" ? localeProyectoActual() : (window.localeProyecto || {}),
            odooPistas: window.odooPistas || {}
        };
        localStorage.setItem(SESION_TRABAJO_KEY, JSON.stringify(payload));
        programarFlushPinsDrive_();
    } catch (e) {
        try {
            const prev = JSON.parse(localStorage.getItem(SESION_TRABAJO_KEY) || "{}");
            prev.archivos = [];
            if (Array.isArray(prev.versiones)) prev.versiones = aligerarVersionesSesion_(prev.versiones);
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
        (s.cabecera && s.cabecera.noProyecto) ||
        (s.versiones && s.versiones.length);
    if (!tiene) return false;
    idsCabeceraSesion().forEach(function (id) {
        const el = document.getElementById(id);
        if (el && s.cabecera && s.cabecera[id] != null) el.value = s.cabecera[id];
    });
    /* No rehidratar base64 de sesiones viejas: el visor se llena en segundo plano desde Drive/Odoo. */
    window.archivosGemaBase64 = [];
    if (s.comision) {
        const sel = document.getElementById("simComision");
        if (sel) sel.value = s.comision;
    }
    window.odooPistas = s.odooPistas || {};
    if (typeof aplicarLocaleProyecto === "function") {
        aplicarLocaleProyecto(s.locale || {}, { silencio: true });
    }
    const versionesLivianas = aligerarVersionesSesion_(s.versiones || []);
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
        versiones: versionesLivianas,
        versionActivaId: s.versionActivaId
    });
    _restauroNecesitaRenders = true;
    /* Reescribe sesión liviana para que el próximo F5 no parsee megas de base64 viejos. */
    try {
        s.archivos = [];
        s.versiones = versionesLivianas;
        localStorage.setItem(SESION_TRABAJO_KEY, JSON.stringify(s));
    } catch (eLite) { /* noop */ }
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("Sesión restaurada. Cargando renders en segundo plano…", "info");
    }
    return true;
}

function programarCargaRendersTrasSesion_() {
    if (!_restauroNecesitaRenders && !(document.getElementById("inputCodigo")?.value || "").trim()) return;
    _restauroNecesitaRenders = false;
    const run = function () {
        if (typeof window.cargarRendersVisor === "function") {
            window.cargarRendersVisor({ silencio: true }).catch(function () {});
        } else if (typeof window.cargarImagenOdooEnVisor === "function") {
            window.cargarImagenOdooEnVisor();
        }
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 1200 });
    else setTimeout(run, 80);
}

async function eliminarProyectoBD(idProyecto) {
    if(!confirm('¿Eliminar de la Nube?')) return;
    try { const data = await realizarPeticionBD({ action: 'eliminar', id: idProyecto }); if(data.exito) { mostrarNotificacion(data.mensaje, "success"); abrirHistorial(); } } catch(e) { mostrarNotificacion(e.message, "danger"); }
}

// INICIALIZADOR PRINCIPAL
document.addEventListener('DOMContentLoaded', async () => {
    /* Red en paralelo: no bloquear la mesa de trabajo. */
    const pConfig = typeof cargarConfiguracionGlobal === "function"
        ? cargarConfiguracionGlobal().catch(function () {})
        : Promise.resolve();
    const pTrm = typeof obtenerTRMOficial === "function"
        ? obtenerTRMOficial().catch(function () {})
        : Promise.resolve();

    restaurarSesionTrabajo();
    window._codigoProyectoActivo = String(document.getElementById("inputCodigo")?.value || "").trim();
    /* Normaliza Nombre Proyecto a «código + nombre» y limpia basura (“$”). */
    (function () {
        const cod = String(document.getElementById("inputCodigo")?.value || window._codigoProyectoActivo || "").trim();
        const nomEl = document.getElementById("noProyecto");
        if (!nomEl || !cod) return;
        const cur = String(nomEl.value || "").trim();
        const fmt = typeof nombreProyectoFormato_ === "function"
            ? nombreProyectoFormato_(cod, cur === "$" ? "" : cur)
            : (cur && cur !== "$" ? cur : cod);
        if (fmt && fmt !== cur) {
            nomEl.value = fmt;
            if (typeof programarGuardarSesion === "function") programarGuardarSesion();
        }
    })();
    asegurarV1_();
    pintarSelectorVersiones();
    pintarBarraElementos();
    if (typeof renderizarTablaItems === "function") renderizarTablaItems();
    if (typeof inicializarDragAndDropArchivos === "function") inicializarDragAndDropArchivos();
    if (typeof habilitarVentanasFlotantes === "function") habilitarVentanasFlotantes();

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

    programarCargaRendersTrasSesion_();

    await pConfig;
    if (typeof poblarSelectComisiones === "function") poblarSelectComisiones();
    if (typeof verificarAccesoCorporativo === "function") verificarAccesoCorporativo();
    if (localStorage.getItem("smartbudget_token") && typeof logisticaPrefetchHistorial_ === "function") {
        logisticaPrefetchHistorial_();
    }
    await pTrm;
});
