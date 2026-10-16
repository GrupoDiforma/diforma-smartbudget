window.archivosGemaBase64 = [];
window._visorIdx = 0;
window._pdfDoc = null;
window._pdfPage = 1;
window._pdfIdx = -1;

function bytesArchivoGema_(f) {
    const bin = atob(f.data || "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function asegurarPdfJs_() {
    if (typeof pdfjsLib === "undefined") return false;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    return true;
}

function mimeEsImagen_(m) { return /^image\//i.test(String(m || "")); }
function mimeEsPdf_(m, name) { return /pdf/i.test(String(m || "")) || /\.pdf$/i.test(String(name || "")); }

function urlArchivoGema_(f) {
    if (!f) return "";
    if (f._url) return f._url;
    try {
        const bin = atob(f.data || "");
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        f._url = URL.createObjectURL(new Blob([bytes], { type: f.mimeType || "application/octet-stream" }));
    } catch (e) {
        f._url = "data:" + (f.mimeType || "application/octet-stream") + ";base64," + (f.data || "");
    }
    return f._url;
}

function revocarUrlArchivo_(f) {
    if (f && f._url && String(f._url).indexOf("blob:") === 0) {
        try { URL.revokeObjectURL(f._url); } catch (e) {}
    }
    if (f) f._url = null;
}

window.procesarArchivosNativos = function(files) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(function (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            if (!e.target.result) return;
            window.archivosGemaBase64.push({ name: file.name, mimeType: file.type || "image/jpeg", data: e.target.result.split(",")[1] });
            window._visorIdx = window.archivosGemaBase64.length - 1;
            window.actualizarListaUI();
        };
        reader.readAsDataURL(file);
    });
};

window.seleccionarVisor = function (idx) {
    window._visorIdx = idx;
    window.actualizarListaUI();
};

window.visorPantallaCompleta = function () {
    const el = document.getElementById("visorLienzo");
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
};

/* ------------------------------------------------------------------ */
/* Imagen del proyecto en Odoo: una sola descarga, la usan el Paso 2    */
/* (visor) y la Cotización (Logística).                                 */
/* ------------------------------------------------------------------ */

/** Reduce una imagen (data URL) a JPG con el lado mayor <= maxPx. */
window.reducirImagenJpeg = function (src, maxPx, calidad) {
    return new Promise(function (resolve, reject) {
        const im = new Image();
        im.onload = function () {
            const esc = Math.min(1, maxPx / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
            const w = Math.max(1, Math.round(im.naturalWidth * esc));
            const h = Math.max(1, Math.round(im.naturalHeight * esc));
            const cv = document.createElement("canvas");
            cv.width = w;
            cv.height = h;
            const cx = cv.getContext("2d");
            cx.fillStyle = "#fff";
            cx.fillRect(0, 0, w, h);
            cx.drawImage(im, 0, 0, w, h);
            resolve(cv.toDataURL("image/jpeg", calidad || 0.88));
        };
        im.onerror = function () { reject(new Error("No se pudo leer la imagen.")); };
        im.src = src;
    });
};

window.imgOdooCache = {};

/**
 * Trae (una vez por código) la imagen del proyecto desde Odoo.
 * Devuelve { estado: "ok" | "sin" | "error", orig (1600 px), url (1000 px), campo, mime, mensaje }.
 */
window.traerImagenOdoo = function (codigo, force) {
    codigo = String(codigo || "").trim();
    if (!codigo) return Promise.resolve({ estado: "sin", mensaje: "Sin código de proyecto." });
    const prev = window.imgOdooCache[codigo];
    if (prev && !force) return prev;
    const prom = (async function () {
        try {
            if (typeof realizarPeticionBD !== "function") throw new Error("Servicio no disponible.");
            const resp = await realizarPeticionBD({ action: "odoo_imagen_proyecto", codigo: codigo });
            if (resp && resp.exito && resp.data && resp.data.base64) {
                const d = resp.data;
                const src = "data:" + (d.mime || "image/jpeg") + ";base64," + d.base64;
                const esSvg = /svg/i.test(d.mime || "");
                const orig = esSvg ? src : await window.reducirImagenJpeg(src, 1600, 0.9);
                const url = esSvg ? src : await window.reducirImagenJpeg(orig, 1000);
                return { estado: "ok", orig: orig, url: url, campo: d.etiqueta || d.campo || "", mime: esSvg ? d.mime : "image/jpeg", mensaje: "" };
            }
            const m = String((resp && resp.mensaje) || "Sin respuesta.");
            return { estado: /no tiene imagen|no tiene campos de imagen/i.test(m) ? "sin" : "error", mensaje: m };
        } catch (e) {
            const m = String((e && e.message) || e);
            return { estado: "error", mensaje: /Acción no válida/i.test(m) ? "falta pegar el backend.gs actualizado en Apps Script." : m };
        }
    })();
    window.imgOdooCache[codigo] = prom;
    prom.then(function (r) {
        if (r.estado === "error" && window.imgOdooCache[codigo] === prom) delete window.imgOdooCache[codigo];
        const claves = Object.keys(window.imgOdooCache);
        if (claves.length > 6) delete window.imgOdooCache[claves[0]];
    });
    return prom;
};

/** Pone la imagen de Odoo del proyecto como único archivo del visor del Paso 2 (sin duplicar la descarga). */
window.cargarImagenOdooEnVisor = async function () {
    /* mismo código que usa Logística (primera palabra del nombre del proyecto), para compartir la descarga */
    const codigoActual = function () {
        const nombre = String(document.getElementById("noProyecto")?.value || "").trim();
        return (nombre.split(/\s+/)[0] || String(document.getElementById("inputCodigo")?.value || "")).trim();
    };
    const codigo = codigoActual();
    if (!codigo) return;
    const r = await window.traerImagenOdoo(codigo, false);
    if (r.estado !== "ok" || /svg/i.test(r.mime || "")) return;
    if (codigoActual() !== codigo) return; /* mientras llegaba, abrieron otro proyecto */
    const m = String(r.url).match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return;
    const lista = (window.archivosGemaBase64 || []).filter(function (f) { return !f._odoo; });
    (window.archivosGemaBase64 || []).filter(function (f) { return f._odoo; }).forEach(revocarUrlArchivo_);
    lista.unshift({ name: "Imagen Odoo · " + codigo + ".jpg", mimeType: m[1], data: m[2], _odoo: true });
    window.archivosGemaBase64 = lista;
    window._visorIdx = 0;
    window._pdfDoc = null;
    window._pdfIdx = -1;
    window.actualizarListaUI();
};

/** Quita todos los archivos del Paso 2 (visor, miniaturas y adjuntos de la IA). */
window.vaciarArchivosIA = function () {
    (window.archivosGemaBase64 || []).forEach(revocarUrlArchivo_);
    window.archivosGemaBase64 = [];
    window._visorIdx = 0;
    window.actualizarListaUI();
};

window.actualizarListaUI = function() {
    const files = window.archivosGemaBase64 || [];
    const n = files.length;
    if (n === 0) {
        /* sin archivos: el visor no debe conservar el PDF/imagen anterior */
        window._pdfDoc = null;
        window._pdfPage = 1;
        window._pdfIdx = -1;
        const lz = document.getElementById("visorLienzo");
        if (lz) { lz.classList.remove("is-pdf"); lz.innerHTML = ""; }
        const th = document.getElementById("visorThumbs");
        if (th) th.innerHTML = "";
    }
    const box = document.getElementById("dropzoneBox");
    const activo = document.getElementById("visorActivo");
    const s = document.getElementById("dropzoneStatusText");
    if (s) s.innerText = n > 0 ? "+ agregar más (" + n + ")" : "Renders, planos, fichas, PDF, JPG o PNG";
    if (box) {
        box.classList.toggle("d-none", n > 0);
        box.classList.remove("is-compact");
    }
    if (activo) {
        activo.classList.toggle("d-none", n === 0);
        activo.classList.toggle("d-flex", n > 0);
    }
    if (n > 0) pintarVisorArchivos_(files);
    const bar = document.getElementById("chatAdjuntosBar");
    if (bar) bar.innerHTML = n ? '<small class="text-muted"><i class="bi bi-paperclip"></i> ' + n + " archivo(s) irán con el próximo mensaje a la IA</small>" : "";
    if (typeof actualizarBotonGenerar === "function") actualizarBotonGenerar();
};

function pintarVisorArchivos_(files) {
    let idx = Number(window._visorIdx) || 0;
    if (idx < 0 || idx >= files.length) idx = 0;
    window._visorIdx = idx;
    const f = files[idx];
    const nom = document.getElementById("visorNombre");
    if (nom) nom.textContent = (f && f.name ? f.name : "Archivo") + (files.length > 1 ? "  ·  " + (idx + 1) + "/" + files.length : "");
    const lienzo = document.getElementById("visorLienzo");
    if (lienzo && f) {
        if (mimeEsPdf_(f.mimeType, f.name)) {
            if (window._pdfIdx === idx && window._pdfDoc && document.getElementById("visorPdfCanvas")) {
                /* mismo PDF, no recargar */
            } else {
                cargarPdfVisor_(f, idx);
            }
        } else {
            window._pdfDoc = null;
            window._pdfIdx = -1;
            lienzo.classList.remove("is-pdf");
            lienzo.innerHTML = '<img alt="" src="' + urlArchivoGema_(f) + '">';
        }
    }
    const thumbs = document.getElementById("visorThumbs");
    if (!thumbs) return;
    thumbs.innerHTML = files.map(function (file, i) {
        const on = i === idx ? " is-on" : "";
        let inner;
        if (mimeEsImagen_(file.mimeType)) inner = '<img alt="" src="' + urlArchivoGema_(file) + '">';
        else inner = '<span class="visor-thumb-pdf"><i class="bi bi-file-earmark-pdf"></i></span>';
        return '<button type="button" class="visor-thumb' + on + '" title="' + String(file.name || "").replace(/"/g, "") + '" onclick="seleccionarVisor(' + i + ')">' +
            inner + '<span class="visor-thumb-x" onclick="event.stopPropagation();eliminarGemaArchivo(' + i + ')">&times;</span></button>';
    }).join("");
}

window.visorPdfPagina = function (delta) {
    if (!window._pdfDoc) return;
    const n = window._pdfPage + delta;
    if (n < 1 || n > window._pdfDoc.numPages) return;
    window._pdfPage = n;
    renderPdfPaginaVisor_();
};

function cargarPdfVisor_(f, idx) {
    const lienzo = document.getElementById("visorLienzo");
    if (!lienzo) return;
    window._pdfDoc = null;
    window._pdfPage = 1;
    window._pdfIdx = idx;
    lienzo.classList.add("is-pdf");
    if (!asegurarPdfJs_()) {
        lienzo.innerHTML = '<p class="text-white-50 small p-3 mb-0">No cargó el visor PDF. Recarga la página.</p>';
        return;
    }
    lienzo.innerHTML = '<div class="visor-pdf"><div class="visor-pdf-bar">' +
        '<button type="button" class="btn btn-sm btn-light" onclick="visorPdfPagina(-1)" title="Anterior">‹</button>' +
        '<span id="visorPdfPaginaTxt" class="small">Cargando…</span>' +
        '<button type="button" class="btn btn-sm btn-light" onclick="visorPdfPagina(1)" title="Siguiente">›</button>' +
        '</div><div class="visor-pdf-canvas-wrap"><canvas id="visorPdfCanvas"></canvas></div></div>';
    pdfjsLib.getDocument({ data: bytesArchivoGema_(f) }).promise.then(function (pdf) {
        if (window._pdfIdx !== idx) return;
        window._pdfDoc = pdf;
        window._pdfPage = 1;
        renderPdfPaginaVisor_();
    }).catch(function (err) {
        if (window._pdfIdx !== idx) return;
        lienzo.innerHTML = '<p class="text-white-50 small p-3 mb-0">No se pudo leer el PDF. ' + (err && err.message ? err.message : "") + "</p>";
    });
}

function renderPdfPaginaVisor_() {
    const pdf = window._pdfDoc;
    const canvas = document.getElementById("visorPdfCanvas");
    const txt = document.getElementById("visorPdfPaginaTxt");
    if (!pdf || !canvas) return;
    pdf.getPage(window._pdfPage).then(function (page) {
        const wrap = canvas.parentElement;
        const base = page.getViewport({ scale: 1 });
        const w = Math.max(280, (wrap && wrap.clientWidth) || canvas.parentElement.clientWidth || 480);
        const scale = w / base.width;
        const viewport = page.getViewport({ scale: scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }).then(function () {
        if (txt) txt.textContent = window._pdfPage + " / " + pdf.numPages;
    }).catch(function () {});
}

window.eliminarGemaArchivo = function(idx) {
    const f = (window.archivosGemaBase64 || [])[idx];
    revocarUrlArchivo_(f);
    window.archivosGemaBase64.splice(idx, 1);
    window._pdfDoc = null; /* los índices cambiaron: el visor debe volver a cargar el archivo que toque */
    window._pdfIdx = -1;
    if (window._visorIdx >= window.archivosGemaBase64.length) window._visorIdx = Math.max(0, window.archivosGemaBase64.length - 1);
    window.actualizarListaUI();
};

function habilitarDropEn(el) {
    if (!el) return;
    ["dragover", "dragenter"].forEach(function (e) {
        el.addEventListener(e, function (ev) { ev.preventDefault(); el.classList.add("dragover"); });
    });
    ["dragleave", "drop"].forEach(function (e) {
        el.addEventListener(e, function (ev) { ev.preventDefault(); el.classList.remove("dragover"); });
    });
    el.addEventListener("drop", function (ev) {
        ev.preventDefault();
        if (ev.dataTransfer.files.length > 0) window.procesarArchivosNativos(ev.dataTransfer.files);
    });
}
function inicializarDragAndDropArchivos() {
    habilitarDropEn(document.getElementById("dropzoneBox"));
    habilitarDropEn(document.getElementById("panelVisor"));
    habilitarDropEn(document.getElementById("visorLienzo"));
    habilitarDropEn(document.getElementById("chatBox"));
    window.addEventListener("resize", function () {
        if (window._pdfDoc) renderPdfPaginaVisor_();
    });
    document.addEventListener("keydown", function (e) {
        if (!window._pdfDoc) return;
        const t = e.target && e.target.tagName;
        if (t === "TEXTAREA" || t === "INPUT" || t === "SELECT") return;
        if (e.key === "ArrowLeft") window.visorPdfPagina(-1);
        if (e.key === "ArrowRight") window.visorPdfPagina(1);
    });
}

function mercadoActual() {
    const sel = document.getElementById("selMercado");
    if (sel && sel.value) return sel.value;
    return (document.getElementById("badgeTipo")?.innerText || "NACIONAL").trim();
}

function etiquetaOdoo_(v) {
    if (Array.isArray(v) && v.length > 1) return String(v[1] || "");
    if (v && typeof v === "object" && v.name) return String(v.name);
    if (v === false || v == null) return "";
    return String(v);
}

function textoPlanoOdoo_(html) {
    return String(html || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function paisEsImperial_(pais) {
    const p = String(pais || "").toLowerCase();
    return /estados unidos|united states|\busa\b|u\.s\.a|puerto rico/.test(p);
}

function mapearLocaleOdoo(rec) {
    rec = rec || {};
    const lang = String(rec.lang_code || rec.idioma || "").toLowerCase();
    const idioma = lang.indexOf("en") === 0 ? "en" : "es";
    const tipo = String(rec.tipo_medida == null ? "" : rec.tipo_medida);
    const pais = etiquetaOdoo_(rec.country_id);
    let sistema = "metrico";
    if (tipo === "2") sistema = "imperial";
    else if (tipo === "1") sistema = "metrico";
    else if (paisEsImperial_(pais)) sistema = "imperial";
    return {
        idioma: idioma,
        sistema: sistema,
        pais: pais,
        langOdoo: rec.lang_code || rec.idioma || "",
        medidaOdoo: tipo,
        etiquetaIdioma: etiquetaOdoo_(rec.lang_id),
        etiquetaMedida: tipo === "2" ? "Sistema Ingles" : "Sistema Internacional"
    };
}

function pistasBriefOdoo(rec) {
    rec = rec || {};
    return {
        funcionales: textoPlanoOdoo_(rec.funcionales),
        dimDiseno: textoPlanoOdoo_(rec.dim_diseno),
        obsPresupuesto: textoPlanoOdoo_(rec.obs_presupuesto)
    };
}

function localeProyectoActual() {
    const loc = window.localeProyecto || {};
    return {
        idioma: loc.idioma === "en" ? "en" : "es",
        sistema: loc.sistema === "imperial" ? "imperial" : "metrico",
        pais: loc.pais || "",
        langOdoo: loc.langOdoo || "",
        medidaOdoo: loc.medidaOdoo || "",
        etiquetaIdioma: loc.etiquetaIdioma || "",
        etiquetaMedida: loc.etiquetaMedida || ""
    };
}

function umFichaActual() {
    return localeProyectoActual().sistema === "imperial" ? "in" : "cm";
}

function fichaComercialVacia() {
    return {
        titulo: "",
        descripcion: "",
        dimAncho: "",
        dimFondo: "",
        dimAlto: "",
        empAncho: "",
        empFondo: "",
        empAlto: "",
        empUnd: "",
        um: umFichaActual()
    };
}

function leerFichaComercialUI() {
    const n = function (id) {
        const el = document.getElementById(id);
        if (!el) return "";
        const v = el.value;
        return v === "" || v == null ? "" : v;
    };
    return {
        titulo: n("fichaTitulo"),
        descripcion: n("fichaDesc"),
        dimAncho: n("fichaDimAncho"),
        dimFondo: n("fichaDimFondo"),
        dimAlto: n("fichaDimAlto"),
        empAncho: n("fichaEmpAncho"),
        empFondo: n("fichaEmpFondo"),
        empAlto: n("fichaEmpAlto"),
        empUnd: n("fichaEmpUnd"),
        um: umFichaActual()
    };
}

function pintarLocaleProyecto() {
    const loc = localeProyectoActual();
    const selI = document.getElementById("selIdiomaFicha");
    const selS = document.getElementById("selSistemaFicha");
    const pais = document.getElementById("fichaPaisTxt");
    if (selI) selI.value = loc.idioma;
    if (selS) selS.value = loc.sistema;
    if (pais) pais.textContent = loc.pais ? ("País " + loc.pais) : "País —";
    const um = umFichaActual();
    document.querySelectorAll(".ficha-um").forEach(function (el) { el.textContent = um; });
}

function pintarFichaComercial(ficha) {
    ficha = ficha || fichaComercialVacia();
    const set = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val == null || val === "" ? "" : val;
    };
    set("fichaTitulo", ficha.titulo);
    set("fichaDesc", ficha.descripcion);
    set("fichaDimAncho", ficha.dimAncho);
    set("fichaDimFondo", ficha.dimFondo);
    set("fichaDimAlto", ficha.dimAlto);
    set("fichaEmpAncho", ficha.empAncho);
    set("fichaEmpFondo", ficha.empFondo);
    set("fichaEmpAlto", ficha.empAlto);
    set("fichaEmpUnd", ficha.empUnd);
    pintarLocaleProyecto();
}

function aplicarLocaleProyecto(loc, opts) {
    opts = opts || {};
    const prev = localeProyectoActual();
    window.localeProyecto = Object.assign({}, prev, loc || {});
    if (window.localeProyecto.idioma !== "en") window.localeProyecto.idioma = "es";
    if (window.localeProyecto.sistema !== "imperial") window.localeProyecto.sistema = "metrico";
    pintarLocaleProyecto();
    if (!opts.silencio && typeof programarGuardarSesion === "function") programarGuardarSesion();
}

function cambiarLocaleProyecto(parcial) {
    aplicarLocaleProyecto(parcial);
}

function aplicarFichaComercial(ficha, opts) {
    opts = opts || {};
    const cur = leerFichaComercialUI();
    const src = ficha || {};
    const dims = src.dimensiones || src.dims || {};
    const emp = src.empaque || src.pack || {};
    const pick = function () {
        for (let i = 0; i < arguments.length; i++) {
            const a = arguments[i];
            if (a !== undefined && a !== null && a !== "") return a;
        }
        return "";
    };
    pintarFichaComercial({
        titulo: pick(src.titulo, src.title, cur.titulo),
        descripcion: pick(src.descripcion, src.description, cur.descripcion),
        dimAncho: pick(dims.ancho, src.dimAncho, cur.dimAncho),
        dimFondo: pick(dims.fondo, dims.largo, src.dimFondo, cur.dimFondo),
        dimAlto: pick(dims.alto, src.dimAlto, cur.dimAlto),
        empAncho: pick(emp.ancho, src.empAncho, cur.empAncho),
        empFondo: pick(emp.fondo, emp.largo, src.empFondo, cur.empFondo),
        empAlto: pick(emp.alto, src.empAlto, cur.empAlto),
        empUnd: pick(emp.unidades, emp.und, src.empUnd, cur.empUnd),
        um: umFichaActual()
    });
    if (!opts.silencio && typeof programarGuardarSesion === "function") programarGuardarSesion();
}

window.localeProyectoActual = localeProyectoActual;
window.leerFichaComercialUI = leerFichaComercialUI;
window.pintarFichaComercial = pintarFichaComercial;
window.aplicarLocaleProyecto = aplicarLocaleProyecto;
window.cambiarLocaleProyecto = cambiarLocaleProyecto;
window.aplicarFichaComercial = aplicarFichaComercial;
window.fichaComercialVacia = fichaComercialVacia;
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
        window.odooPistas = pistasBriefOdoo(rec);
        aplicarLocaleProyecto(mapearLocaleOdoo(rec), { silencio: true });
        pintarFichaComercial(fichaComercialVacia());
        window.cargarImagenOdooEnVisor(); /* la imagen del proyecto queda en el visor y se reutiliza en la cotización */
        const loc = localeProyectoActual();
        const um = loc.sistema === "imperial" ? "in" : "cm";
        const idiomaTxt = loc.idioma === "en" ? "English" : "Español";
        mostrarAlertaOdoo("¡Proyecto importado! " + idiomaTxt + " · " + (loc.etiquetaMedida || um) + (loc.pais ? " · " + loc.pais : ""), "success");
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
