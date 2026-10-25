/**
 * simulador3d.js — Puente SmartBudget ↔ motor SmartLoad (pestaña Simulador 3D).
 * Escenarios multi-opción, traer/aplicar Logística, captura opcional para PDF.
 */
(function () {
    "use strict";

    var SL_COLORS = ["#c5a968", "#b3aae8", "#dcdab1", "#ecc1da", "#bfeea9", "#afe8df", "#e6e4f9", "#eeecb3"];
    var slEscenarios = [];
    var slEscActivo = 0;
    var slInited = false;
    var slThreeReady = false;
    var slPdfCaptures = {}; /* escId -> dataURL */

    function toast_(msg) {
        if (typeof mostrarToast === "function") mostrarToast(msg);
        else if (typeof mostrarNotificacion === "function") mostrarNotificacion(msg, "info");
    }

    function loadScript_(src) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
            var s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = function () { reject(new Error("No cargó " + src)); };
            document.head.appendChild(s);
        });
    }

    async function ensureThree_() {
        if (window.THREE && THREE.OrbitControls && THREE.TransformControls) {
            slThreeReady = true;
            return;
        }
        await loadScript_("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
        await loadScript_("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");
        await loadScript_("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js");
        slThreeReady = true;
    }

    function snapshotEstado_() {
        return {
            listaEmpaque: JSON.parse(JSON.stringify(typeof listaEmpaque !== "undefined" ? listaEmpaque : [])),
            instanciasCajas: JSON.parse(JSON.stringify(typeof instanciasCajas !== "undefined" ? instanciasCajas : [])),
            contenedoresFisicos: JSON.parse(JSON.stringify(typeof contenedoresFisicos !== "undefined" ? contenedoresFisicos : [])),
            selectedGroupId: typeof selectedGroupId !== "undefined" ? selectedGroupId : null
        };
    }

    function restoreEstado_(st) {
        if (typeof listaEmpaque === "undefined") return;
        listaEmpaque = st.listaEmpaque || [];
        instanciasCajas = st.instanciasCajas || [];
        contenedoresFisicos = st.contenedoresFisicos || [];
        selectedGroupId = st.selectedGroupId || null;
        if (typeof selectedUUIDsSet !== "undefined") selectedUUIDsSet.clear();
        if (typeof actualizarTabla === "function") actualizarTabla();
        if (typeof actualizarUIContenedores === "function") actualizarUIContenedores();
        else if (typeof construirEscena3D === "function") construirEscena3D();
    }

    function guardarEscenarioActivo_() {
        if (!slEscenarios.length) return;
        var e = slEscenarios[slEscActivo];
        if (!e) return;
        var st = snapshotEstado_();
        e.listaEmpaque = st.listaEmpaque;
        e.instanciasCajas = st.instanciasCajas;
        e.contenedoresFisicos = st.contenedoresFisicos;
    }

    function pintarTabsEscenarios_() {
        var box = document.getElementById("slEscenariosTabs");
        var aviso = document.getElementById("slAvisoVacio");
        var hay = slEscenarios.some(function (e) { return (e.listaEmpaque || []).length; });
        if (aviso) aviso.classList.toggle("d-none", !!hay);
        if (!box) return;
        if (!slEscenarios.length) {
            box.innerHTML = "<li class=\"nav-item\"><span class=\"nav-link disabled small text-muted\">Sin escenario</span></li>";
            return;
        }
        box.innerHTML = slEscenarios.map(function (e, i) {
            var n = (e.listaEmpaque || []).length;
            return "<li class=\"nav-item\" role=\"presentation\">" +
                "<button type=\"button\" class=\"nav-link" + (i === slEscActivo ? " active" : "") + "\" data-sl-esc=\"" + i + "\">" +
                (e.nombre || ("Escenario " + (i + 1))) + (n ? " · " + n : "") + "</button></li>";
        }).join("");
    }

    function activarEscenario_(idx) {
        if (idx < 0 || idx >= slEscenarios.length) return;
        guardarEscenarioActivo_();
        slEscActivo = idx;
        var e = slEscenarios[idx];
        restoreEstado_({
            listaEmpaque: e.listaEmpaque || [],
            instanciasCajas: e.instanciasCajas || [],
            contenedoresFisicos: e.contenedoresFisicos || [],
            selectedGroupId: null
        });
        if ((!contenedoresFisicos || !contenedoresFisicos.length) && typeof crearContenedor === "function") {
            var key = (document.getElementById("ribbon-cont-type") || {}).value || "40ft";
            contenedoresFisicos = [crearContenedor(key)];
        }
        if (typeof sincronizarInstancias === "function") sincronizarInstancias();
        if (typeof actualizarTabla === "function") actualizarTabla();
        if (typeof actualizarUIContenedores === "function") actualizarUIContenedores();
        else if (typeof construirEscena3D === "function") construirEscena3D();
        pintarTabsEscenarios_();
        resizeViewer_();
    }

    function mapTipoCont_(mix) {
        mix = mix || {};
        if ((mix.c40hc || 0) > 0) return "40hc";
        if ((mix.c40 || 0) > 0) return "40ft";
        if ((mix.c20 || 0) > 0) return "20ft";
        return "40ft";
    }

    /** Medidas cm: empaque de la caja, o producto de la ficha si el empaque está vacío. */
    function medidasCajaCm_(caja, ficha) {
        var tipo = {
            ancho: (caja && caja.ancho) != null ? caja.ancho : ficha.empAncho,
            fondo: (caja && caja.fondo) != null ? caja.fondo : ficha.empFondo,
            alto: (caja && caja.alto) != null ? caja.alto : ficha.empAlto,
            peso: (caja && caja.peso) != null ? caja.peso : ficha.empPeso,
            empAncho: ficha.empAncho,
            empFondo: ficha.empFondo,
            empAlto: ficha.empAlto,
            um: ficha.um
        };
        var cm = typeof logCajaCm_ === "function" ? logCajaCm_(tipo) : null;
        if (cm) return { cm: cm, tipo: tipo };
        /* Fallback: medidas del producto (no empaque). */
        var w = Number(ficha.ancho), d = Number(ficha.fondo), h = Number(ficha.alto);
        if (!(w > 0 && d > 0 && h > 0)) return null;
        var f = ficha.um === "in" ? 2.54 : 1;
        return {
            cm: { w: w * f, d: d * f, h: h * f },
            tipo: { ancho: w, fondo: d, alto: h, peso: ficha.peso, um: ficha.um }
        };
    }

    function itemsDesdeFilas_(filas, idioma, escId) {
        var items = [];
        var colorIdx = 0;
        (filas || []).forEach(function (fila) {
            if (!fila || fila.tipo !== "item") return;
            var ficha = (fila.snap && fila.snap.ficha) || (typeof logFichaVersion_ === "function" ? logFichaVersion_(fila.ver, fila.elem) : {}) || {};
            var v = typeof logFilaValores_ === "function" ? logFilaValores_(fila, idioma, escId || "") : {};
            if (v.excl) return;
            var qtyProd = Number(v.qty) || 0;
            if (!(qtyProd > 0)) return;
            var tipos = typeof logEmpCajasDeFicha_ === "function" ? logEmpCajasDeFicha_(ficha) : [{}];
            if (!tipos.length) tipos = [{}];
            tipos.forEach(function (caja) {
                var med = medidasCajaCm_(caja || {}, ficha);
                if (!med) return;
                var und = Number(caja && caja.und);
                if (!(und > 0)) und = Number(ficha.empUnd) || 1;
                var porPieza = Number(caja && caja.porPieza);
                if (!(porPieza > 0)) porPieza = 1;
                var nCajas = Math.ceil(qtyProd / und) * porPieza;
                if (!(nCajas > 0)) nCajas = qtyProd;
                var peso = typeof logPesoCajaKg_ === "function" ? logPesoCajaKg_(med.tipo) : Number(med.tipo.peso) || 0;
                var desc = (caja && caja.nombre && String(caja.nombre).trim()) || (v.titulo || v.cod || "Caja");
                if (tipos.length > 1 && caja && caja.nombre) desc = (v.cod || v.titulo || "") + " · " + caja.nombre;
                items.push({
                    id: (typeof generateUUID === "function" ? generateUUID() : ("id_" + Date.now() + "_" + colorIdx)),
                    shape: "box",
                    qty: nCajas,
                    desc: String(desc).slice(0, 80),
                    w: Math.round(med.cm.w * 10) / 10,
                    d: Math.round(med.cm.d * 10) / 10,
                    h: Math.round(med.cm.h * 10) / 10,
                    weight: peso != null && isFinite(peso) ? Math.round(peso * 100) / 100 : 0,
                    color: SL_COLORS[colorIdx % SL_COLORS.length],
                    noTilt: false,
                    noTurn: false,
                    onFloor: false,
                    dangerous: false
                });
                colorIdx++;
            });
        });
        return items;
    }

    function escenarioDesdeLogistica_(nombre, escId, filas, idioma) {
        var env = typeof logEnv_ === "function" ? logEnv_() : {};
        var st = escId && typeof logEnvEscDe_ === "function" ? logEnvEscDe_(env, escId) : null;
        var mix = typeof logContenedoresNorm_ === "function"
            ? logContenedoresNorm_(st ? st.contenedores : env.contenedores)
            : { c20: 0, c40: 0, c40hc: 0 };
        var tipo = mapTipoCont_(mix);
        var items = itemsDesdeFilas_(filas, idioma, escId || "");
        var conts = [];
        if (typeof crearContenedor === "function") {
            var n = Math.max(1, (mix.c20 || 0) + (mix.c40 || 0) + (mix.c40hc || 0));
            var i;
            for (i = 0; i < n; i++) {
                var tk = "40ft";
                if (i < (mix.c20 || 0)) tk = "20ft";
                else if (i < (mix.c20 || 0) + (mix.c40 || 0)) tk = "40ft";
                else tk = "40hc";
                conts.push(crearContenedor(tk));
            }
            if (!conts.length) conts = [crearContenedor(tipo)];
        }
        return {
            id: escId || "base",
            nombre: nombre,
            logEscId: escId || "",
            listaEmpaque: items,
            instanciasCajas: [],
            contenedoresFisicos: conts,
            mixSugerido: mix
        };
    }

    function traerDesdeLogistica_(opts) {
        opts = opts || {};
        if (typeof logQuote === "undefined" || !logQuote || !Array.isArray(logQuote.filas)) {
            if (!opts.silencioso) toast_("No hay cotización en Logística. Puedes cargar CSV o .load.");
            return false;
        }
        var idioma = typeof logisticaLeerOpciones_ === "function" ? logisticaLeerOpciones_().idioma : "es";
        var escs = typeof logEscList_ === "function" ? logEscList_() : [];
        var nuevos = [];
        var itemsQuote = (logQuote.filas || []).filter(function (f) { return f.tipo === "item"; });
        if (!itemsQuote.length) {
            if (!opts.silencioso) toast_("La cotización no tiene proyectos. Agrega filas en Logística.");
            return false;
        }
        if (escs.length) {
            var baseFilas = itemsQuote.filter(function (f) { return !f.escId; });
            if (baseFilas.length) {
                nuevos.push(escenarioDesdeLogistica_(idioma === "en" ? "Ranges" : "Rangos", "", baseFilas, idioma));
            }
            escs.forEach(function (e, i) {
                var propias = itemsQuote.filter(function (f) { return f.escId === e.id; });
                var filas = itemsQuote.filter(function (f) { return f.escId === e.id || !f.escId; });
                var usar = propias.length ? propias.concat(baseFilas.filter(function (b) {
                    return !propias.some(function (p) { return p.uid === b.uid; });
                })) : filas;
                var nom = typeof logEscNombre_ === "function" ? logEscNombre_(e, i, idioma) : ("Opción " + (i + 1));
                nuevos.push(escenarioDesdeLogistica_(nom, e.id, usar, idioma));
            });
        } else {
            nuevos.push(escenarioDesdeLogistica_(idioma === "en" ? "Quote" : "Cotización", "", itemsQuote, idioma));
        }
        var conCarga = nuevos.filter(function (n) { return (n.listaEmpaque || []).length; });
        if (!conCarga.length) {
            if (!opts.silencioso) {
                toast_("No pude armar cajas: faltan medidas de empaque o de producto en la ficha (Ancho × Fondo × Alto).");
            }
            return false;
        }
        slEscenarios = conCarga.length === nuevos.length ? nuevos : conCarga;
        slEscActivo = 0;
        var ribbon = document.getElementById("ribbon-cont-type");
        if (ribbon && slEscenarios[0]) ribbon.value = mapTipoCont_(slEscenarios[0].mixSugerido);
        activarEscenario_(0);
        pintarTabsEscenarios_();
        var nItems = (slEscenarios[0].listaEmpaque || []).length;
        if (!opts.silencioso) {
            toast_("Carga traída: " + slEscenarios.length + " escenario(s), " + nItems + " tipo(s) de caja. Pulsa Optimizar.");
        }
        return true;
    }

    function mixDesdeContenedores_(conts) {
        var mix = { c20: 0, c40: 0, c40hc: 0 };
        (conts || []).forEach(function (c) {
            var k = String(c.tipoKey || "");
            if (k === "20ft") mix.c20++;
            else if (k === "40hc") mix.c40hc++;
            else if (k === "40ft" || k.indexOf("40") === 0) mix.c40++;
            else mix.c40++; /* custom u otros → cuenta como 40' para flete */
        });
        return mix;
    }

    function metricasDesdeContenedores_(conts) {
        var volAct = 0, volMax = 0, kgAct = 0, kgMax = 0;
        (conts || []).forEach(function (c) {
            volAct += Number(c.volActual) || 0;
            volMax += Number(c.maxVol) || 0;
            kgAct += Number(c.pesoActual) || 0;
            kgMax += Number(c.maxWeight) || 0;
        });
        var occ = volMax > 0 ? Math.round(volAct * 1000 / volMax) / 10 : 0;
        return { m3: Math.round(volAct * 1000) / 1000, m3Max: volMax, kg: Math.round(kgAct), kgMax: kgMax, ocupacionPct: occ, nCont: (conts || []).length };
    }

    function aplicarALogistica_() {
        guardarEscenarioActivo_();
        if (!slEscenarios.length) {
            toast_("No hay escenarios. Trae desde Logística u optimiza una carga.");
            return;
        }
        if (typeof logEnv_ !== "function" || typeof logQuote === "undefined") {
            toast_("Abre la pestaña Logística con una cotización.");
            return;
        }
        var resumen = [];
        slEscenarios.forEach(function (esc) {
            var mix = mixDesdeContenedores_(esc.contenedoresFisicos);
            var met = metricasDesdeContenedores_(esc.contenedoresFisicos);
            var txt = (esc.nombre || esc.id) + ": " +
                (mix.c20 ? mix.c20 + "×20' " : "") +
                (mix.c40 ? mix.c40 + "×40' " : "") +
                (mix.c40hc ? mix.c40hc + "×40HC " : "") +
                "(" + met.ocupacionPct + "% · " + met.m3 + " m³ · " + met.kg + " kg)";
            resumen.push(txt.trim());
        });
        if (!window.confirm("¿Aplicar este mix a Logística?\n\n" + resumen.join("\n"))) return;

        var env = logEnv_();
        if (!env.porEsc) env.porEsc = {};

        slEscenarios.forEach(function (esc) {
            var mix = mixDesdeContenedores_(esc.contenedoresFisicos);
            var met = metricasDesdeContenedores_(esc.contenedoresFisicos);
            var nota = "Simulador 3D: " + met.ocupacionPct + "% occ · " + met.m3 + " m³ · " + met.kg + " kg";
            if (esc.logEscId) {
                if (!env.porEsc[esc.logEscId]) env.porEsc[esc.logEscId] = {};
                var st = env.porEsc[esc.logEscId];
                st.contenedores = mix;
                st.contenedoresManual = true;
                st.sim3d = { m3: met.m3, kg: met.kg, ocupacionPct: met.ocupacionPct, nota: nota };
                if (typeof logEnvEscVista_ === "function") {
                    /* noop — estructura ya en porEsc */
                }
            } else {
                env.contenedores = mix;
                env.contenedoresManual = true;
                env.sim3d = { m3: met.m3, kg: met.kg, ocupacionPct: met.ocupacionPct, nota: nota };
            }
            if (document.getElementById("slIncluirPdf") && document.getElementById("slIncluirPdf").checked) {
                capturarVista_(esc);
            }
        });

        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        if (typeof logisticaPintarEnv_ === "function") logisticaPintarEnv_(true);
        if (typeof logisticaActualizarVista === "function") logisticaActualizarVista();
        toast_("Mix aplicado a Logística.");
    }

    function capturarVista_(esc) {
        try {
            if (!renderer || !renderer.domElement) return;
            var url = renderer.domElement.toDataURL("image/jpeg", 0.72);
            var key = esc.logEscId || esc.id || "base";
            slPdfCaptures[key] = url;
            window._slPdfCaptures = slPdfCaptures;
            if (esc.logEscId && typeof logEnv_ === "function") {
                var env = logEnv_();
                if (env.porEsc && env.porEsc[esc.logEscId]) env.porEsc[esc.logEscId].sim3dImg = url;
            } else if (typeof logEnv_ === "function") {
                logEnv_().sim3dImg = url;
            }
        } catch (e) { /* canvas tainted o sin GL */ }
    }

    window.slPdfCapturesParaHoja = function () {
        return Object.assign({}, window._slPdfCaptures || slPdfCaptures);
    };

    function resizeViewer_() {
        setTimeout(function () {
            var div = document.getElementById("canvas-container");
            if (!div || typeof renderer === "undefined" || !renderer || !camera) return;
            var w = div.clientWidth, h = div.clientHeight;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                if (typeof construirEscena3D === "function") construirEscena3D();
            }
        }, 80);
    }

    async function ensureInit_() {
        try {
            await ensureThree_();
            if (!slInited) {
                if (typeof initSmartLoadEngine === "function") initSmartLoadEngine();
                else if (typeof limpiarTodo === "function") {
                    if (typeof initColorMenu === "function") initColorMenu();
                    if (typeof updateAllContDropdowns === "function") updateAllContDropdowns();
                    limpiarTodo();
                }
                slInited = true;
            }
            /* Si hay cotización abierta, trae sola la carga (no hace falta pulsar el botón). */
            if (!slEscenarios.length || !(slEscenarios[0].listaEmpaque || []).length) {
                traerDesdeLogistica_({ silencioso: true });
            }
            resizeViewer_();
            pintarTabsEscenarios_();
        } catch (e) {
            console.error("Simulador 3D init:", e);
            toast_("No se pudo iniciar el Simulador 3D: " + ((e && e.message) || e));
        }
    }

    function onTabShown_(ev) {
        var t = ev && (ev.target || ev);
        var btn = t && t.closest ? t.closest("#tabBtnSimulador3d") : null;
        if (!btn && t && t.id === "tabBtnSimulador3d") btn = t;
        if (!btn && document.getElementById("tabSimulador3d") && document.getElementById("tabSimulador3d").classList.contains("active")) {
            btn = document.getElementById("tabBtnSimulador3d");
        }
        if (btn) ensureInit_();
    }

    function wire_() {
        var btnTraer = document.getElementById("slBtnTraerLog");
        var btnAplicar = document.getElementById("slBtnAplicarLog");
        if (btnTraer) btnTraer.addEventListener("click", function () { traerDesdeLogistica_({}); });
        if (btnAplicar) btnAplicar.addEventListener("click", aplicarALogistica_);
        var tabs = document.getElementById("slEscenariosTabs");
        if (tabs) {
            tabs.addEventListener("click", function (ev) {
                var b = ev.target.closest("[data-sl-esc]");
                if (!b) return;
                activarEscenario_(Number(b.getAttribute("data-sl-esc")));
            });
        }
        var mainTabs = document.getElementById("mainAppTabs");
        if (mainTabs) mainTabs.addEventListener("shown.bs.tab", onTabShown_);
        var tabBtn = document.getElementById("tabBtnSimulador3d");
        if (tabBtn) {
            tabBtn.addEventListener("shown.bs.tab", onTabShown_);
            tabBtn.addEventListener("click", function () {
                /* Fallback si Bootstrap no dispara shown (p. ej. ya activo). */
                setTimeout(function () {
                    var pane = document.getElementById("tabSimulador3d");
                    if (pane && pane.classList.contains("active")) ensureInit_();
                }, 100);
            });
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire_);
    else wire_();

    window.slTraerDesdeLogistica = traerDesdeLogistica_;
    window.slAplicarALogistica = aplicarALogistica_;
    window.slEnsureInit = ensureInit_;
})();
