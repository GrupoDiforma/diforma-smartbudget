/**
 * simulador3d.js — Puente SmartBudget ↔ motor SmartLoad (pestaña Simulador 3D).
 * Escenarios multi-opción, traer/aplicar Logística, catálogo master/pallet/huacal, captura PDF.
 */
(function () {
    "use strict";

    var SL_COLORS = ["#c5a968", "#b3aae8", "#dcdab1", "#ecc1da", "#bfeea9", "#afe8df", "#e6e4f9", "#eeecb3"];
    var SL_EU_ = { AT: 1, BE: 1, BG: 1, HR: 1, CY: 1, CZ: 1, DK: 1, EE: 1, FI: 1, FR: 1, DE: 1, GR: 1, HU: 1, IE: 1, IT: 1, LV: 1, LT: 1, LU: 1, MT: 1, NL: 1, PL: 1, PT: 1, RO: 1, SK: 1, SI: 1, ES: 1, SE: 1 };
    var SL_GMA_ = { US: 1, CA: 1, MX: 1, PR: 1 };

    /** Defaults internacionales; Ajustes los sobrescribe en CONFIG_GLOBAL.sim3d. */
    var SL_SIM3D_DEFAULTS = {
        umbrales: { maxLadoCm: 80, pesoKg: 40 },
        huacal: { holguraCm: 5, onFloor: true, noTilt: true },
        deckH: 14.4,
        mercadoPallet: { EU: "EUR", US: "GMA", default: "ISO1" },
        autoPaletizarFcl: true,
        autoPaletizarLcl: true,
        dejarCajaSueltaAereo: true,
        pallets: [
            { id: "EUR", nombre: "Euro pallet", w: 120, d: 80, hUtil: 180, pesoMax: 1500 },
            { id: "ISO1", nombre: "ISO 120×100", w: 120, d: 100, hUtil: 180, pesoMax: 1500 },
            { id: "GMA", nombre: "GMA 48×40", w: 121.9, d: 101.6, hUtil: 180, pesoMax: 1500 }
        ],
        masters: [
            { id: "M403030", nombre: "Master 40×30×30", w: 40, d: 30, h: 30, pesoMax: 25 },
            { id: "M604040", nombre: "Master 60×40×40", w: 60, d: 40, h: 40, pesoMax: 40 }
        ]
    };

    var slEscenarios = [];
    var slEscActivo = 0;
    var slInited = false;
    var slThreeReady = false;
    var slPdfCaptures = {}; /* escId -> dataURL */

    function toast_(msg) {
        if (typeof mostrarToast === "function") mostrarToast(msg);
        else if (typeof mostrarNotificacion === "function") mostrarNotificacion(msg, "info");
    }

    function num_(v, def) {
        var n = Number(v);
        return isFinite(n) ? n : (def != null ? def : 0);
    }

    function r1_(n) { return Math.round(num_(n) * 10) / 10; }
    function r2_(n) { return Math.round(num_(n) * 100) / 100; }

    function slSim3dCfg_() {
        var raw = (typeof CONFIG_GLOBAL !== "undefined" && CONFIG_GLOBAL && CONFIG_GLOBAL.sim3d) ? CONFIG_GLOBAL.sim3d : null;
        if (typeof raw === "string") {
            try { raw = JSON.parse(raw); } catch (e) { raw = null; }
        }
        var d = JSON.parse(JSON.stringify(SL_SIM3D_DEFAULTS));
        if (!raw || typeof raw !== "object") return d;
        if (raw.umbrales && typeof raw.umbrales === "object") {
            if (raw.umbrales.maxLadoCm != null) d.umbrales.maxLadoCm = num_(raw.umbrales.maxLadoCm, d.umbrales.maxLadoCm);
            if (raw.umbrales.pesoKg != null) d.umbrales.pesoKg = num_(raw.umbrales.pesoKg, d.umbrales.pesoKg);
        }
        if (raw.huacal && typeof raw.huacal === "object") {
            if (raw.huacal.holguraCm != null) d.huacal.holguraCm = num_(raw.huacal.holguraCm, d.huacal.holguraCm);
            if (raw.huacal.onFloor != null) d.huacal.onFloor = !!raw.huacal.onFloor;
            if (raw.huacal.noTilt != null) d.huacal.noTilt = !!raw.huacal.noTilt;
        }
        if (raw.deckH != null) d.deckH = num_(raw.deckH, d.deckH);
        if (raw.mercadoPallet && typeof raw.mercadoPallet === "object") {
            ["EU", "US", "default"].forEach(function (k) {
                if (raw.mercadoPallet[k]) d.mercadoPallet[k] = String(raw.mercadoPallet[k]);
            });
        }
        if (raw.autoPaletizarFcl != null) d.autoPaletizarFcl = !!raw.autoPaletizarFcl;
        if (raw.autoPaletizarLcl != null) d.autoPaletizarLcl = !!raw.autoPaletizarLcl;
        if (raw.dejarCajaSueltaAereo != null) d.dejarCajaSueltaAereo = !!raw.dejarCajaSueltaAereo;
        if (Array.isArray(raw.pallets) && raw.pallets.length) {
            d.pallets = raw.pallets.map(function (p) {
                return {
                    id: String(p.id || "").trim() || "P",
                    nombre: String(p.nombre || p.id || "Pallet").trim(),
                    w: num_(p.w, 120), d: num_(p.d, 100),
                    hUtil: num_(p.hUtil, 180), pesoMax: num_(p.pesoMax, 1500)
                };
            });
        }
        if (Array.isArray(raw.masters) && raw.masters.length) {
            d.masters = raw.masters.map(function (m) {
                return {
                    id: String(m.id || "").trim() || "M",
                    nombre: String(m.nombre || m.id || "Master").trim(),
                    w: num_(m.w, 40), d: num_(m.d, 30), h: num_(m.h, 30),
                    pesoMax: num_(m.pesoMax, 25)
                };
            });
        }
        return d;
    }

    function palletPorMercado_(cfg, codPais) {
        var cod = String(codPais || "").toUpperCase();
        var want = cfg.mercadoPallet.default || "ISO1";
        if (SL_EU_[cod]) want = cfg.mercadoPallet.EU || "EUR";
        else if (SL_GMA_[cod]) want = cfg.mercadoPallet.US || "GMA";
        var found = (cfg.pallets || []).find(function (p) { return p.id === want; });
        return found || (cfg.pallets && cfg.pallets[0]) || SL_SIM3D_DEFAULTS.pallets[1];
    }

    function oris_(w, d, h) {
        return [
            [w, d, h], [w, h, d], [d, w, h], [d, h, w], [h, w, d], [h, d, w]
        ];
    }

    function cajasEnHueco_(bw, bd, bh, mw, md, mh) {
        var best = 0;
        oris_(bw, bd, bh).forEach(function (o) {
            if (!(o[0] > 0 && o[1] > 0 && o[2] > 0)) return;
            var n = Math.floor(mw / o[0]) * Math.floor(md / o[1]) * Math.floor(mh / o[2]);
            if (n > best) best = n;
        });
        return best;
    }

    function mejorMaster_(box, masters, pesoCaja) {
        var best = null;
        (masters || []).forEach(function (m) {
            var n = cajasEnHueco_(box.w, box.d, box.h, m.w, m.d, m.h);
            if (n < 1) return;
            if (m.pesoMax > 0 && pesoCaja > 0) {
                var porPeso = Math.floor(m.pesoMax / pesoCaja);
                if (porPeso < 1) return;
                n = Math.min(n, porPeso);
            }
            var waste = (m.w * m.d * m.h) - n * (box.w * box.d * box.h);
            if (!best || n > best.n || (n === best.n && waste < best.waste)) {
                best = { master: m, n: n, waste: waste };
            }
        });
        return best;
    }

    /** Capas × huella de un sólido (caja o master) sobre un pallet. */
    function unidadesPorPallet_(uw, ud, uh, pesoU, pallet, deckH) {
        var hUtil = Math.max(1, num_(pallet.hUtil, 180));
        var best = { n: 0, loadH: uh, ori: [uw, ud, uh] };
        oris_(uw, ud, uh).forEach(function (o) {
            if (!(o[0] > 0 && o[1] > 0 && o[2] > 0)) return;
            if (o[0] > pallet.w + 0.01 || o[1] > pallet.d + 0.01) return;
            var porCapa = Math.floor(pallet.w / o[0]) * Math.floor(pallet.d / o[1]);
            if (porCapa < 1) return;
            var capas = Math.max(1, Math.floor(hUtil / o[2]));
            var n = porCapa * capas;
            if (pallet.pesoMax > 0 && pesoU > 0) {
                var porPeso = Math.floor(pallet.pesoMax / pesoU);
                if (porPeso < 1) return;
                n = Math.min(n, porPeso);
            }
            var capasUsadas = Math.min(capas, Math.ceil(n / porCapa));
            var loadH = capasUsadas * o[2];
            if (n > best.n) best = { n: n, loadH: loadH, ori: o, porCapa: porCapa, capas: capasUsadas };
        });
        return best.n > 0 ? best : null;
    }

    function esHuacal_(box, peso, cfg) {
        var maxL = Math.max(box.w, box.d, box.h);
        if (maxL >= num_(cfg.umbrales.maxLadoCm, 80)) return true;
        if (peso >= num_(cfg.umbrales.pesoKg, 40)) return true;
        return false;
    }

    function debePaletizar_(modalidad, cfg) {
        var mod = String(modalidad || "").toLowerCase();
        if (mod === "fcl") return !!cfg.autoPaletizarFcl;
        if (mod === "lcl") return !!cfg.autoPaletizarLcl;
        if (mod === "aerea" || mod === "aereo") return !cfg.dejarCajaSueltaAereo;
        return !!cfg.autoPaletizarFcl;
    }

    function itemBase_(desc, shape, qty, w, d, h, weight, color, flags) {
        flags = flags || {};
        return {
            id: (typeof generateUUID === "function" ? generateUUID() : ("id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7))),
            shape: shape,
            qty: Math.max(1, Math.ceil(num_(qty, 1))),
            desc: String(desc || "Carga").slice(0, 80),
            w: r1_(w), d: r1_(d), h: r1_(h),
            weight: r2_(weight),
            color: color,
            noTilt: !!flags.noTilt,
            noTurn: !!flags.noTurn,
            onFloor: !!flags.onFloor,
            dangerous: false,
            slMeta: flags.slMeta || null
        };
    }

    /**
     * Convierte cajas comerciales de Costos en unidades de carga (caja / master / pallet / huacal).
     */
    function unidadesDesdeCaja_(cajaCm, nCajas, pesoCaja, desc, color, cfg, modalidad, codPais) {
        var box = { w: cajaCm.w, d: cajaCm.d, h: cajaCm.h };
        var peso = num_(pesoCaja, 0);
        var out = [];

        if (!debePaletizar_(modalidad, cfg)) {
            out.push(itemBase_(desc, "box", nCajas, box.w, box.d, box.h, peso, color, {
                slMeta: { unidad: "caja", cajas: nCajas }
            }));
            return out;
        }

        if (esHuacal_(box, peso, cfg)) {
            var hol = num_(cfg.huacal.holguraCm, 5);
            out.push(itemBase_(
                "Huacal · " + desc,
                "box",
                nCajas,
                box.w + 2 * hol,
                box.d + 2 * hol,
                box.h + 2 * hol,
                peso + 2,
                color,
                {
                    noTilt: cfg.huacal.noTilt !== false,
                    onFloor: cfg.huacal.onFloor !== false,
                    slMeta: { unidad: "huacal", cajas: 1, holguraCm: hol }
                }
            ));
            return out;
        }

        var pallet = palletPorMercado_(cfg, codPais);
        var deckH = num_(cfg.deckH, 14.4);
        var pick = mejorMaster_(box, cfg.masters, peso);
        var uw, ud, uh, pesoU, nUnidades, etiqueta;

        if (pick && pick.n > 0) {
            nUnidades = Math.ceil(nCajas / pick.n);
            uw = pick.master.w; ud = pick.master.d; uh = pick.master.h;
            pesoU = peso * pick.n;
            etiqueta = pick.master.nombre || pick.master.id;
        } else {
            /* Master auto: apilar cajas directo; la unidad intermedia es la capa óptima sobre el pallet. */
            var fitBox = unidadesPorPallet_(box.w, box.d, box.h, peso, pallet, deckH);
            if (!fitBox) {
                /* No cabe en pallet estándar → solid custom = caja (o pallet a medida). */
                out.push(itemBase_(
                    "Custom · " + desc,
                    "pallet",
                    nCajas,
                    Math.max(box.w, 40),
                    Math.max(box.d, 40),
                    deckH + box.h,
                    peso,
                    color,
                    {
                        noTilt: true,
                        onFloor: true,
                        slMeta: { unidad: "pallet", estandar: "custom", cajas: 1 }
                    }
                ));
                return out;
            }
            var porPalletDirecto = fitBox.n;
            var nPallets = Math.ceil(nCajas / porPalletDirecto);
            var cajasEnUltimo = nCajas - (nPallets - 1) * porPalletDirecto;
            var loadH = fitBox.loadH;
            var pesoPallet = peso * porPalletDirecto;
            out.push(itemBase_(
                (pallet.id || "Pallet") + " · " + desc,
                "pallet",
                nPallets,
                pallet.w,
                pallet.d,
                deckH + loadH,
                pesoPallet,
                color,
                {
                    noTilt: true,
                    onFloor: true,
                    slMeta: {
                        unidad: "pallet",
                        estandar: pallet.id,
                        cajas: porPalletDirecto,
                        cajasUltimo: cajasEnUltimo,
                        modo: "directo"
                    }
                }
            ));
            return out;
        }

        var fit = unidadesPorPallet_(uw, ud, uh, pesoU, pallet, deckH);
        if (!fit) {
            /* Master no cabe en pallet → enviar masters sueltos. */
            out.push(itemBase_(
                etiqueta + " · " + desc,
                "box",
                nUnidades,
                uw, ud, uh,
                pesoU,
                color,
                { slMeta: { unidad: "master", estandar: pick.master.id, cajas: pick.n } }
            ));
            return out;
        }

        var nPalletsM = Math.ceil(nUnidades / fit.n);
        out.push(itemBase_(
            (pallet.id || "Pallet") + " · " + desc,
            "pallet",
            nPalletsM,
            pallet.w,
            pallet.d,
            deckH + fit.loadH,
            pesoU * fit.n,
            color,
            {
                noTilt: true,
                onFloor: true,
                slMeta: {
                    unidad: "pallet",
                    estandar: pallet.id,
                    master: pick.master.id,
                    mastersPorPallet: fit.n,
                    cajasPorMaster: pick.n,
                    cajas: pick.n * fit.n
                }
            }
        ));
        return out;
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
        var w = Number(ficha.ancho), d = Number(ficha.fondo), h = Number(ficha.alto);
        if (!(w > 0 && d > 0 && h > 0)) return null;
        var f = ficha.um === "in" ? 2.54 : 1;
        return {
            cm: { w: w * f, d: d * f, h: h * f },
            tipo: { ancho: w, fondo: d, alto: h, peso: ficha.peso, um: ficha.um }
        };
    }

    function contextoLogistica_(escId) {
        var env = typeof logEnv_ === "function" ? logEnv_() : {};
        var vista = (escId && typeof logEnvVistaEsc_ === "function") ? logEnvVistaEsc_(escId) : env;
        var modalidad = (vista && vista.modalidad) || env.modalidad || "aerea";
        var pais = (vista && vista.destinoPais) || env.destinoPais || "";
        var cod = (vista && vista.destinoCodigo) || env.destinoCodigo || "";
        if (!cod && pais && typeof logEnvCodigoDePais_ === "function") cod = logEnvCodigoDePais_(pais) || "";
        return { modalidad: modalidad, pais: pais, cod: cod };
    }

    function itemsDesdeFilas_(filas, idioma, escId) {
        var items = [];
        var colorIdx = 0;
        var cfg = slSim3dCfg_();
        var ctx = contextoLogistica_(escId || "");
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
                var color = SL_COLORS[colorIdx % SL_COLORS.length];
                var unidos = unidadesDesdeCaja_(med.cm, nCajas, peso, desc, color, cfg, ctx.modalidad, ctx.cod);
                unidos.forEach(function (it) { items.push(it); });
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

    function resumenUnidades_(items) {
        var c = { caja: 0, master: 0, pallet: 0, huacal: 0 };
        (items || []).forEach(function (it) {
            var u = (it.slMeta && it.slMeta.unidad) || (it.shape === "pallet" ? "pallet" : "caja");
            if (c[u] != null) c[u] += it.qty || 0;
            else c.caja += it.qty || 0;
        });
        var parts = [];
        if (c.pallet) parts.push(c.pallet + " pallet" + (c.pallet === 1 ? "" : "s"));
        if (c.huacal) parts.push(c.huacal + " huacal" + (c.huacal === 1 ? "" : "es"));
        if (c.master) parts.push(c.master + " master");
        if (c.caja) parts.push(c.caja + " caja" + (c.caja === 1 ? "" : "s"));
        return parts.join(" · ") || ((items || []).length + " tipo(s)");
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
        if (!opts.silencioso) {
            toast_("Carga traída: " + slEscenarios.length + " escenario(s) · " + resumenUnidades_(slEscenarios[0].listaEmpaque) + ". Pulsa Optimizar.");
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
            else mix.c40++;
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
            var nota = "Simulador 3D: " + met.ocupacionPct + "% occ · " + met.m3 + " m³ · " + met.kg + " kg · " + resumenUnidades_(esc.listaEmpaque);
            if (esc.logEscId) {
                if (!env.porEsc[esc.logEscId]) env.porEsc[esc.logEscId] = {};
                var st = env.porEsc[esc.logEscId];
                st.contenedores = mix;
                st.contenedoresManual = true;
                st.sim3d = { m3: met.m3, kg: met.kg, ocupacionPct: met.ocupacionPct, nota: nota };
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
                setTimeout(function () {
                    var pane = document.getElementById("tabSimulador3d");
                    if (pane && pane.classList.contains("active")) ensureInit_();
                }, 100);
            });
        }
    }

    /* ---------- Ajustes → Simulador 3D ---------- */

    function filaCatalogoHtml_(tipo, row) {
        var id = String(row.id || "");
        var nom = String(row.nombre || "");
        if (tipo === "pallet") {
            return "<tr data-sim3d=\"" + tipo + "\">" +
                "<td><input class=\"form-control form-control-sm\" data-k=\"id\" value=\"" + escAttr_(id) + "\"></td>" +
                "<td><input class=\"form-control form-control-sm\" data-k=\"nombre\" value=\"" + escAttr_(nom) + "\"></td>" +
                "<td><input type=\"number\" step=\"0.1\" class=\"form-control form-control-sm\" data-k=\"w\" value=\"" + num_(row.w) + "\" style=\"width:72px\"></td>" +
                "<td><input type=\"number\" step=\"0.1\" class=\"form-control form-control-sm\" data-k=\"d\" value=\"" + num_(row.d) + "\" style=\"width:72px\"></td>" +
                "<td><input type=\"number\" step=\"1\" class=\"form-control form-control-sm\" data-k=\"hUtil\" value=\"" + num_(row.hUtil) + "\" style=\"width:72px\"></td>" +
                "<td><input type=\"number\" step=\"1\" class=\"form-control form-control-sm\" data-k=\"pesoMax\" value=\"" + num_(row.pesoMax) + "\" style=\"width:80px\"></td>" +
                "<td><button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" onclick=\"this.closest('tr').remove();slSim3dRefrescarSelectsPallet_();\" title=\"Quitar\">×</button></td>" +
                "</tr>";
        }
        return "<tr data-sim3d=\"" + tipo + "\">" +
            "<td><input class=\"form-control form-control-sm\" data-k=\"id\" value=\"" + escAttr_(id) + "\"></td>" +
            "<td><input class=\"form-control form-control-sm\" data-k=\"nombre\" value=\"" + escAttr_(nom) + "\"></td>" +
            "<td><input type=\"number\" step=\"0.1\" class=\"form-control form-control-sm\" data-k=\"w\" value=\"" + num_(row.w) + "\" style=\"width:72px\"></td>" +
            "<td><input type=\"number\" step=\"0.1\" class=\"form-control form-control-sm\" data-k=\"d\" value=\"" + num_(row.d) + "\" style=\"width:72px\"></td>" +
            "<td><input type=\"number\" step=\"0.1\" class=\"form-control form-control-sm\" data-k=\"h\" value=\"" + num_(row.h) + "\" style=\"width:72px\"></td>" +
            "<td><input type=\"number\" step=\"0.1\" class=\"form-control form-control-sm\" data-k=\"pesoMax\" value=\"" + num_(row.pesoMax) + "\" style=\"width:80px\"></td>" +
            "<td><button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" onclick=\"this.closest('tr').remove();\" title=\"Quitar\">×</button></td>" +
            "</tr>";
    }

    function escAttr_(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    }

    function leerFilasCatalogo_(tbodyId, tipo) {
        var body = document.getElementById(tbodyId);
        if (!body) return [];
        var out = [];
        body.querySelectorAll("tr").forEach(function (tr) {
            var get = function (k) {
                var el = tr.querySelector("[data-k=\"" + k + "\"]");
                return el ? el.value : "";
            };
            var id = String(get("id") || "").trim();
            if (!id) return;
            if (tipo === "pallet") {
                out.push({
                    id: id,
                    nombre: String(get("nombre") || id).trim(),
                    w: num_(get("w"), 120),
                    d: num_(get("d"), 100),
                    hUtil: num_(get("hUtil"), 180),
                    pesoMax: num_(get("pesoMax"), 1500)
                });
            } else {
                out.push({
                    id: id,
                    nombre: String(get("nombre") || id).trim(),
                    w: num_(get("w"), 40),
                    d: num_(get("d"), 30),
                    h: num_(get("h"), 30),
                    pesoMax: num_(get("pesoMax"), 25)
                });
            }
        });
        return out;
    }

    function slSim3dRefrescarSelectsPallet_() {
        var pallets = leerFilasCatalogo_("sim3dPalletsBody", "pallet");
        if (!pallets.length) pallets = SL_SIM3D_DEFAULTS.pallets;
        ["sim3dPalletEU", "sim3dPalletUS", "sim3dPalletDef"].forEach(function (id) {
            var sel = document.getElementById(id);
            if (!sel) return;
            var cur = sel.value;
            sel.innerHTML = pallets.map(function (p) {
                return "<option value=\"" + escAttr_(p.id) + "\">" + escAttr_(p.id + " — " + p.nombre) + "</option>";
            }).join("");
            if (cur && pallets.some(function (p) { return p.id === cur; })) sel.value = cur;
        });
    }

    function pintarEditorSim3d_(cfg) {
        cfg = cfg || slSim3dCfg_();
        var setVal = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.value = v;
        };
        var setChk = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.checked = !!v;
        };
        setVal("sim3dUmbralCm", cfg.umbrales.maxLadoCm);
        setVal("sim3dUmbralKg", cfg.umbrales.pesoKg);
        setVal("sim3dHolgura", cfg.huacal.holguraCm);
        setVal("sim3dDeckH", cfg.deckH);
        setChk("sim3dAutoFcl", cfg.autoPaletizarFcl);
        setChk("sim3dAutoLcl", cfg.autoPaletizarLcl);
        setChk("sim3dCajaAereo", cfg.dejarCajaSueltaAereo);
        var pb = document.getElementById("sim3dPalletsBody");
        if (pb) pb.innerHTML = (cfg.pallets || []).map(function (p) { return filaCatalogoHtml_("pallet", p); }).join("");
        var mb = document.getElementById("sim3dMastersBody");
        if (mb) mb.innerHTML = (cfg.masters || []).map(function (m) { return filaCatalogoHtml_("master", m); }).join("");
        slSim3dRefrescarSelectsPallet_();
        setVal("sim3dPalletEU", cfg.mercadoPallet.EU || "EUR");
        setVal("sim3dPalletUS", cfg.mercadoPallet.US || "GMA");
        setVal("sim3dPalletDef", cfg.mercadoPallet.default || "ISO1");
    }

    function leerSim3dUI_() {
        var getN = function (id, def) {
            var el = document.getElementById(id);
            if (!el || String(el.value).trim() === "") return def;
            var n = parseFloat(el.value);
            return isFinite(n) ? n : def;
        };
        var getChk = function (id, def) {
            var el = document.getElementById(id);
            return el ? !!el.checked : def;
        };
        var getSel = function (id, def) {
            var el = document.getElementById(id);
            return el && el.value ? el.value : def;
        };
        var pallets = leerFilasCatalogo_("sim3dPalletsBody", "pallet");
        var masters = leerFilasCatalogo_("sim3dMastersBody", "master");
        if (!pallets.length) pallets = JSON.parse(JSON.stringify(SL_SIM3D_DEFAULTS.pallets));
        if (!masters.length) masters = JSON.parse(JSON.stringify(SL_SIM3D_DEFAULTS.masters));
        return {
            umbrales: {
                maxLadoCm: getN("sim3dUmbralCm", 80),
                pesoKg: getN("sim3dUmbralKg", 40)
            },
            huacal: {
                holguraCm: getN("sim3dHolgura", 5),
                onFloor: true,
                noTilt: true
            },
            deckH: getN("sim3dDeckH", 14.4),
            mercadoPallet: {
                EU: getSel("sim3dPalletEU", "EUR"),
                US: getSel("sim3dPalletUS", "GMA"),
                default: getSel("sim3dPalletDef", "ISO1")
            },
            autoPaletizarFcl: getChk("sim3dAutoFcl", true),
            autoPaletizarLcl: getChk("sim3dAutoLcl", true),
            dejarCajaSueltaAereo: getChk("sim3dCajaAereo", true),
            pallets: pallets,
            masters: masters
        };
    }

    window.pintarEditorSim3d = function () { pintarEditorSim3d_(slSim3dCfg_()); };
    window.leerSim3dUI = leerSim3dUI_;
    window.slSim3dCfg = slSim3dCfg_;
    window.slSim3dRefrescarSelectsPallet_ = slSim3dRefrescarSelectsPallet_;
    window.slSim3dAgregarPalletUI = function () {
        var body = document.getElementById("sim3dPalletsBody");
        if (!body) return;
        body.insertAdjacentHTML("beforeend", filaCatalogoHtml_("pallet", {
            id: "CUSTOM", nombre: "Pallet custom", w: 120, d: 100, hUtil: 180, pesoMax: 1500
        }));
        slSim3dRefrescarSelectsPallet_();
    };
    window.slSim3dAgregarMasterUI = function () {
        var body = document.getElementById("sim3dMastersBody");
        if (!body) return;
        body.insertAdjacentHTML("beforeend", filaCatalogoHtml_("master", {
            id: "MCUSTOM", nombre: "Master custom", w: 50, d: 40, h: 40, pesoMax: 30
        }));
    };
    window.slSim3dRestaurarDefaultsUI = function () {
        if (!window.confirm("¿Restaurar pallets, masters y umbrales a los defaults internacionales?")) return;
        pintarEditorSim3d_(JSON.parse(JSON.stringify(SL_SIM3D_DEFAULTS)));
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire_);
    else wire_();

    window.slTraerDesdeLogistica = traerDesdeLogistica_;
    window.slAplicarALogistica = aplicarALogistica_;
    window.slEnsureInit = ensureInit_;
})();
