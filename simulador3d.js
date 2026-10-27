/**
 * simulador3d.js — Pestaña Simulador 3D nativa de SmartBudget.
 * Motor en smartload/ (código embebido del producto). Traer / Optimizar / Aplicar a Logística.
 * Sin captura de foto hacia el PDF (desconectada a propósito).
 */
(function () {
    "use strict";

    var SL_COLORS = ["#c5a968", "#b3aae8", "#dcdab1", "#ecc1da", "#bfeea9", "#afe8df", "#e6e4f9", "#eeecb3"];
    var SL_EU_ = { AT: 1, BE: 1, BG: 1, HR: 1, CY: 1, CZ: 1, DK: 1, EE: 1, FI: 1, FR: 1, DE: 1, GR: 1, HU: 1, IE: 1, IT: 1, LV: 1, LT: 1, LU: 1, MT: 1, NL: 1, PL: 1, PT: 1, RO: 1, SK: 1, SI: 1, ES: 1, SE: 1 };
    var SL_GMA_ = { US: 1, CA: 1, MX: 1, PR: 1 };

    /** Defaults internacionales; Ajustes los sobrescribe en CONFIG_GLOBAL.sim3d. */
    var SL_SIM3D_DEFAULTS = {
        umbrales: { maxLadoCm: 200, pesoKg: 120 },
        huacal: { holguraCm: 5, onFloor: true, noTilt: true },
        deckH: 14.4,
        maxCapasPallet: 3,
        maxLadoPalletCustom: 160,
        mercadoPallet: { EU: "EUR", US: "GMA", default: "ISO1" },
        autoPaletizarFcl: false,
        autoPaletizarLcl: false,
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
        if (raw.maxCapasPallet != null) d.maxCapasPallet = Math.max(1, Math.floor(num_(raw.maxCapasPallet, d.maxCapasPallet)));
        if (raw.maxLadoPalletCustom != null) d.maxLadoPalletCustom = Math.max(40, num_(raw.maxLadoPalletCustom, d.maxLadoPalletCustom));
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
    function unidadesPorPallet_(uw, ud, uh, pesoU, pallet, deckH, maxCapas) {
        var hUtil = Math.max(1, num_(pallet.hUtil, 180));
        var topeCapas = Math.max(1, Math.floor(num_(maxCapas, 99)));
        var best = { n: 0, loadH: uh, ori: [uw, ud, uh] };
        oris_(uw, ud, uh).forEach(function (o) {
            if (!(o[0] > 0 && o[1] > 0 && o[2] > 0)) return;
            if (o[0] > pallet.w + 0.01 || o[1] > pallet.d + 0.01) return;
            var porCapa = Math.floor(pallet.w / o[0]) * Math.floor(pallet.d / o[1]);
            if (porCapa < 1) return;
            var capas = Math.min(topeCapas, Math.max(1, Math.floor(hUtil / o[2])));
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

    /** Medidas internas de contenedores (mismo criterio que SmartLoad). */
    function contsFcl_() {
        return [
            { id: "20ft", et: "20'", w: 233, h: 235.6, d: 591.8, maxWeight: 21687 },
            { id: "40ft", et: "40'", w: 233, h: 238.9, d: 1201.5, maxWeight: 26500 },
            { id: "40hc", et: "40HC", w: 235, h: 269, d: 1201.3, maxWeight: 26500 }
        ];
    }

    /** Cuántas cajas caben en el hueco superior (varias capas si el gálibo alcanza). */
    function mejorOriCajaEnHueco_(box, maxL, maxW, maxH) {
        var best = null;
        oris_(box.w, box.d, box.h).forEach(function (o) {
            if (o[2] > maxH + 0.01) return;
            var capas = Math.floor((maxH + 0.01) / o[2]);
            if (capas < 1) return;
            var porCapa1 = Math.floor(maxL / o[0]) * Math.floor(maxW / o[1]);
            var porCapa2 = Math.floor(maxL / o[1]) * Math.floor(maxW / o[0]);
            var n1 = capas * porCapa1;
            var n2 = capas * porCapa2;
            if (n1 < 1 && n2 < 1) return;
            if (n1 >= n2) {
                if (!best || n1 > best.n) best = { n: n1, ori: [o[0], o[1], o[2]], h: o[2], capas: capas, porCapa: porCapa1 };
            } else if (!best || n2 > best.n) {
                best = { n: n2, ori: [o[1], o[0], o[2]], h: o[2], capas: capas, porCapa: porCapa2 };
            }
        });
        return best;
    }

    /**
     * Pallet a medida: rejilla nx×ny×nz de cajas (p. ej. 1×3×1 → 129×96×165, 3 lado a lado).
     * Elige la que más und. mete en el contenedor (piso + 2.º piso de sueltas).
     */
    /**
     * Prioridad logística Diforma: maximizar cajas en pallet de N≥2 (manipulación),
     * minimizar sueltas; el llenado total desempata. N=1 (cajón suelto) solo como fallback.
     */
    function mejorCandPallet_(a, b) {
        if (!a) return b;
        if (!b) return a;
        var score = function (c) {
            var agrupado = c.n >= 2 ? 1 : 0;
            var nOk = c.n >= 2 && c.n <= 6 ? 3 : c.n > 6 ? 1 : 0;
            var tieneTecho = c.topU > 0 ? 1 : 0;
            /* N≥2 (manipulación) → máx. capacidad piso+techo (40HC) → más en pallet → menos depender de 2.º piso vacío. */
            return agrupado * 1e12 + c.total * 1e8 + tieneTecho * 1e7 + c.floorU * 1e4 + c.n * 500 + nOk * 100 + c.nPal * 5 + (c.across >= 2 ? 50 : 0);
        };
        return score(b) > score(a) ? b : a;
    }

    function palletCustomRejilla_(box, peso, cfg, cont) {
        var deckH = num_(cfg.deckH, 14.4);
        var topeCapas = Math.max(1, Math.floor(num_(cfg.maxCapasPallet, 3)));
        var pesoMax = num_(cfg.pesoMaxPalletCustom, 1500);
        var maxLado = num_(cfg.maxLadoPalletCustom, 160);
        var contW = num_(cont && cont.w, 235);
        var contD = num_(cont && cont.d, 1200);
        var contH = num_(cont && cont.h, 269);
        var best = null;
        var bestRelaxed = null;

        function considerar_(nx, ny, nz, o, strictLado) {
            var n = nx * ny * nz;
            if (n < 1) return;
            if (pesoMax > 0 && peso > 0 && n * peso > pesoMax + 0.01) return;
            var pw = nx * o[0];
            var pd = ny * o[1];
            var ph = nz * o[2] + deckH;
            if (ph > contH + 0.01) return;
            if (strictLado && Math.max(pw, pd) > maxLado + 0.01) return;
            var cabe = (pw <= contW + 0.01 && pd <= contD + 0.01) ||
                (pd <= contW + 0.01 && pw <= contD + 0.01);
            if (!cabe) return;
            var nPal = Math.max(
                Math.floor(contD / pw) * Math.floor(contW / pd),
                Math.floor(contD / pd) * Math.floor(contW / pw)
            );
            if (nPal < 1) return;
            if (strictLado && nPal < 2 && Math.min(contD, contW) > maxLado) return;
            var floorU = nPal * n;
            var remH = contH - ph;
            var top = mejorOriCajaEnHueco_(box, contD, contW, remH);
            var topU = top ? top.n : 0;
            var cand = {
                n: n, w: pw, d: pd, h: ph, loadH: nz * o[2],
                nx: nx, ny: ny, nz: nz, ori: o,
                nPal: nPal, floorU: floorU, topU: topU, total: floorU + topU,
                across: Math.max(
                    Math.floor(contW / Math.min(pw, pd)),
                    Math.floor(contW / Math.max(pw, pd))
                ),
                topOri: top && top.ori
            };
            if (strictLado) best = mejorCandPallet_(best, cand);
            else bestRelaxed = mejorCandPallet_(bestRelaxed, cand);
        }

        oris_(box.w, box.d, box.h).forEach(function (o) {
            var maxNx = Math.min(8, Math.max(1, Math.floor(Math.max(contW, contD) / o[0])));
            var maxNy = Math.min(8, Math.max(1, Math.floor(Math.max(contW, contD) / o[1])));
            for (var nz = 1; nz <= topeCapas; nz++) {
                for (var nx = 1; nx <= maxNx; nx++) {
                    for (var ny = 1; ny <= maxNy; ny++) {
                        considerar_(nx, ny, nz, o, true);
                        considerar_(nx, ny, nz, o, false);
                    }
                }
            }
        });
        return best || bestRelaxed;
    }

    /** Capacidad und/contenedor con pallet custom + 2.º piso de cajas sueltas. */
    function capacidadDosPisos_(box, peso, cfg, cont) {
        var custom = palletCustomRejilla_(box, peso, cfg, cont);
        if (!custom) return null;
        return {
            cont: cont.id,
            et: cont.et,
            total: custom.total,
            nPal: custom.nPal,
            floorU: custom.floorU,
            topU: custom.topU,
            pallet: custom
        };
    }

    function mejorCapacidadFcl_(box, peso, cfg) {
        var best = null;
        contsFcl_().forEach(function (c) {
            var cap = capacidadDosPisos_(box, peso, cfg, c);
            if (!cap) return;
            if (!best || cap.total > best.total) best = cap;
        });
        return best;
    }

    /**
     * Parte Q priorizando manipulación: máximo de pallets llenos.
     * Reserva sueltas del 2.º piso según topU del patrón (p. ej. 40HC).
     */
    function repartirPalletsYSueltas_(nCajas, porPallet, floorU, topU) {
        porPallet = Math.max(1, Math.floor(porPallet));
        nCajas = Math.max(0, Math.ceil(nCajas));
        var looseMin = nCajas % porPallet;
        var nLoose = looseMin;
        var pattern = Math.floor(num_(floorU, 0)) + Math.floor(num_(topU, 0));
        if (pattern > 0 && topU > 0 && floorU > 0) {
            nLoose = Math.max(looseMin, Math.min(nCajas, Math.round(nCajas * (topU / pattern))));
        }
        var enPallet = nCajas - nLoose;
        var nPal = Math.floor(enPallet / porPallet);
        nLoose += enPallet - nPal * porPallet;
        return { nPal: nPal, nLoose: nLoose, porPallet: porPallet };
    }

    /** Total de cajas comerciales en la lista (pallets × cajas/pallet + sueltas). */
    function totalCajasLista_(items) {
        var n = 0;
        (items || []).forEach(function (it) {
            if (!it) return;
            var m = it.slMeta || {};
            var por = Math.max(1, Math.floor(num_(m.cajas, it.shape === "pallet" ? 1 : 1)));
            if (m.unidad === "pallet" || it.shape === "pallet") n += Math.floor(num_(it.qty, 0)) * Math.max(1, Math.floor(num_(m.cajas, 1)));
            else n += Math.floor(num_(it.qty, 0)) * Math.max(1, Math.floor(num_(m.cajas, 1)));
        });
        return n;
    }

    /**
     * Rompe las estibas necesarias para llenar el gálibo superior (top-load) de N×40HC.
     * maxEstibas null/≤0 = automático según capacidad de techo × contenedores estimados.
     */
    function desconsolidarParaTecho_(items, contKey, maxEstibas) {
        items = (items || []).slice();
        if (!items.length) return items;
        var cont = null;
        contsFcl_().forEach(function (c) {
            if (c.id === (contKey || "40hc")) cont = c;
        });
        if (!cont) cont = contsFcl_()[2];
        var palIdx = -1;
        var looseIdx = -1;
        items.forEach(function (it, i) {
            var m = it.slMeta || {};
            if (palIdx < 0 && m.unidad === "pallet" && num_(m.cajas, 0) >= 2 && it.qty > 0) palIdx = i;
            if (looseIdx < 0 && (m.rol === "suelta" || (m.unidad === "caja" && !m.cruda)) && it.shape !== "pallet") looseIdx = i;
        });
        if (palIdx < 0) return items;
        var pal = items[palIdx];
        var nCajasPal = Math.max(2, Math.floor(num_(pal.slMeta.cajas, 3)));
        var remH = num_(cont.h) - num_(pal.h);
        if (!(remH >= 15)) return items;
        var ori = pal.slMeta.ori;
        var box = ori && ori.length >= 3
            ? { w: num_(ori[0]), d: num_(ori[1]), h: num_(ori[2]) }
            : { w: num_(pal.w), d: num_(pal.d), h: Math.max(1, num_(pal.h) - num_(pal.slMeta.deckH, 15)) };
        var top = mejorOriCajaEnHueco_(box, cont.d, cont.w, remH);
        var topPorCont = top ? top.n : 0;
        if (topPorCont < 1) return items;
        var floorPorCont = Math.max(1, Math.floor(num_(pal.slMeta.cap && pal.slMeta.cap.floorU, 0)) ||
            Math.max(
                Math.floor(cont.d / Math.max(pal.w, 1)) * Math.floor(cont.w / Math.max(pal.d, 1)),
                Math.floor(cont.d / Math.max(pal.d, 1)) * Math.floor(cont.w / Math.max(pal.w, 1))
            ) * nCajasPal);
        var capPorCont = floorPorCont + topPorCont;
        var totalCajas = totalCajasLista_(items);
        var nCont = Math.max(1, Math.ceil(totalCajas / Math.max(1, capPorCont)));
        var needLoose = Math.min(totalCajas, topPorCont * nCont);
        var have = looseIdx >= 0 ? Math.max(0, Math.floor(num_(items[looseIdx].qty, 0))) : 0;
        var short = Math.max(0, needLoose - have);
        var autoMax = Math.ceil(short / nCajasPal);
        var lim = (maxEstibas == null || maxEstibas <= 0)
            ? autoMax
            : Math.min(Math.floor(num_(maxEstibas, autoMax)), autoMax);
        var palsBreak = Math.min(lim, Math.ceil(short / nCajasPal), Math.floor(num_(pal.qty, 0)));
        if (palsBreak < 1) return items;
        var addLoose = palsBreak * nCajasPal;
        var pesoCaja = nCajasPal > 0 ? num_(pal.weight, 0) / nCajasPal : 0;
        pal.qty = Math.floor(num_(pal.qty, 0)) - palsBreak;
        var looseOri = (top && top.ori) ? top.ori : [box.w, box.d, box.h];
        if (pal.qty < 1) {
            items.splice(palIdx, 1);
            if (looseIdx > palIdx) looseIdx--;
            palIdx = -1;
        }
        if (looseIdx >= 0) {
            items[looseIdx].qty = Math.floor(num_(items[looseIdx].qty, 0)) + addLoose;
            items[looseIdx].w = r1_(looseOri[0]);
            items[looseIdx].d = r1_(looseOri[1]);
            items[looseIdx].h = r1_(looseOri[2]);
            items[looseIdx].slMeta = items[looseIdx].slMeta || { unidad: "caja", cajas: 1, rol: "suelta" };
            items[looseIdx].slMeta.desconsolidado = true;
            items[looseIdx].onFloor = false;
        } else {
            var descLoose = String(pal.desc || "Caja").replace(/^Pallet\s*[·\-]\s*/i, "").replace(/^Pallet\s+/i, "");
            items.push(itemBase_(descLoose, "box", addLoose, looseOri[0], looseOri[1], looseOri[2], pesoCaja, pal.color, {
                onFloor: false,
                slMeta: { unidad: "caja", cajas: 1, rol: "suelta", desconsolidado: true }
            }));
        }
        return items.filter(function (it) { return Math.floor(num_(it.qty, 0)) > 0; });
    }

    /** Cuántos 40HC hacen falta según capacidad piso+techo del patrón modular. */
    function estimarNCont40hc_(items) {
        items = items || [];
        var total = totalCajasLista_(items);
        if (total < 1) return 1;
        var cap = 0;
        items.forEach(function (it) {
            var m = it && it.slMeta;
            if (m && m.cap && num_(m.cap.total, 0) > cap) cap = num_(m.cap.total, 0);
            if (m && m.capRef && num_(m.capRef.total, 0) > cap) cap = num_(m.capRef.total, 0);
        });
        if (cap < 1) {
            var pal = null;
            items.forEach(function (it) {
                if (!pal && it && (it.shape === "pallet" || (it.slMeta && it.slMeta.unidad === "pallet"))) pal = it;
            });
            if (pal) {
                var cont = contsFcl_().filter(function (c) { return c.id === "40hc"; })[0] || contsFcl_()[2];
                var nCajasPal = Math.max(1, Math.floor(num_(pal.slMeta && pal.slMeta.cajas, 1)));
                var nPal = Math.max(
                    Math.floor(cont.d / Math.max(pal.w, 1)) * Math.floor(cont.w / Math.max(pal.d, 1)),
                    Math.floor(cont.d / Math.max(pal.d, 1)) * Math.floor(cont.w / Math.max(pal.w, 1))
                );
                var floorU = nPal * nCajasPal;
                var ori = pal.slMeta && pal.slMeta.ori;
                var box = ori && ori.length >= 3
                    ? { w: ori[0], d: ori[1], h: ori[2] }
                    : { w: pal.w, d: pal.d, h: Math.max(1, pal.h - 15) };
                var top = mejorOriCajaEnHueco_(box, cont.d, cont.w, Math.max(0, cont.h - pal.h));
                cap = floorU + (top ? top.n : 0);
            }
        }
        if (cap < 1) cap = 90;
        return Math.max(1, Math.ceil(total / cap));
    }

    function sembrar40hc_(n) {
        n = Math.max(1, Math.floor(num_(n, 1)));
        if (typeof crearContenedor !== "function") return;
        var ribbon = document.getElementById("ribbon-cont-type");
        if (ribbon) ribbon.value = "40hc";
        contenedoresFisicos = [];
        for (var i = 0; i < n; i++) contenedoresFisicos.push(crearContenedor("40hc"));
        if (typeof actualizarUIContenedores === "function") actualizarUIContenedores();
    }

    function esHuacal_(box, peso, cfg) {
        var maxL = Math.max(box.w, box.d, box.h);
        if (maxL >= num_(cfg.umbrales.maxLadoCm, 200)) return true;
        if (peso >= num_(cfg.umbrales.pesoKg, 120)) return true;
        return false;
    }

    /** Pallets llenos de N + resto como cajas sueltas (van encima / rellenan). */
    function pushPalletsYSueltas_(out, desc, color, nCajas, porPallet, pal, caja, metaPal) {
        porPallet = Math.max(1, Math.floor(num_(porPallet, 1)));
        nCajas = Math.max(0, Math.ceil(num_(nCajas, 0)));
        if (nCajas < 1) return;
        var nFull = Math.floor(nCajas / porPallet);
        var rem = nCajas - nFull * porPallet;
        if (nFull > 0) {
            out.push(itemBase_(
                pal.etiqueta || ("Pallet · " + desc),
                "pallet",
                nFull,
                pal.w, pal.d, pal.h,
                pal.weight,
                color,
                {
                    noTilt: true,
                    onFloor: true,
                    slMeta: Object.assign({ unidad: "pallet", cajas: porPallet }, metaPal || {})
                }
            ));
        }
        if (rem > 0) {
            out.push(itemBase_(
                desc,
                "box",
                rem,
                caja.w, caja.d, caja.h,
                caja.weight,
                color,
                {
                    slMeta: { unidad: "caja", cajas: 1, rol: "suelta" }
                }
            ));
        }
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
     * Orden: master→pallet estándar → stack custom (N + sueltas) → huacal solo si umbral y no apila.
     */
    function unidadesDesdeCaja_(cajaCm, nCajas, pesoCaja, desc, color, cfg, modalidad, codPais) {
        var box = { w: cajaCm.w, d: cajaCm.d, h: cajaCm.h };
        var peso = num_(pesoCaja, 0);
        var out = [];
        nCajas = Math.max(1, Math.ceil(num_(nCajas, 1)));

        if (!debePaletizar_(modalidad, cfg)) {
            out.push(itemBase_(desc, "box", nCajas, box.w, box.d, box.h, peso, color, {
                slMeta: { unidad: "caja", cajas: 1 }
            }));
            return out;
        }

        var pallet = palletPorMercado_(cfg, codPais);
        var deckH = num_(cfg.deckH, 14.4);
        var maxCapas = Math.max(1, Math.floor(num_(cfg.maxCapasPallet, 3)));
        var cajaLoose = { w: box.w, d: box.d, h: box.h, weight: peso };

        /* 1) Master plantilla → pallet (masters/cajas sobrantes sueltos). */
        var pick = mejorMaster_(box, cfg.masters, peso);
        if (pick && pick.n > 0) {
            var nMastersFull = Math.floor(nCajas / pick.n);
            var remCajas = nCajas - nMastersFull * pick.n;
            var uw = pick.master.w, ud = pick.master.d, uh = pick.master.h;
            var pesoU = peso * pick.n;
            var etiqueta = pick.master.nombre || pick.master.id;
            if (nMastersFull > 0) {
                var fit = unidadesPorPallet_(uw, ud, uh, pesoU, pallet, deckH, maxCapas);
                if (fit && fit.n > 0) {
                    var mastersEnPallet = fit.n;
                    var nPalFull = Math.floor(nMastersFull / mastersEnPallet);
                    var remMasters = nMastersFull - nPalFull * mastersEnPallet;
                    if (nPalFull > 0) {
                        out.push(itemBase_(
                            (pallet.id || "Pallet") + " · " + desc,
                            "pallet",
                            nPalFull,
                            pallet.w, pallet.d, deckH + fit.loadH,
                            pesoU * mastersEnPallet,
                            color,
                            {
                                noTilt: true,
                                onFloor: true,
                                slMeta: {
                                    unidad: "pallet",
                                    estandar: pallet.id,
                                    master: pick.master.id,
                                    mastersPorPallet: mastersEnPallet,
                                    cajasPorMaster: pick.n,
                                    cajas: pick.n * mastersEnPallet,
                                    modo: "master"
                                }
                            }
                        ));
                    }
                    if (remMasters > 0) {
                        out.push(itemBase_(
                            etiqueta + " · " + desc,
                            "box",
                            remMasters,
                            uw, ud, uh,
                            pesoU,
                            color,
                            { slMeta: { unidad: "master", estandar: pick.master.id, cajas: pick.n, rol: "suelta" } }
                        ));
                    }
                } else {
                    out.push(itemBase_(
                        etiqueta + " · " + desc,
                        "box",
                        nMastersFull,
                        uw, ud, uh,
                        pesoU,
                        color,
                        { slMeta: { unidad: "master", estandar: pick.master.id, cajas: pick.n } }
                    ));
                }
            }
            if (remCajas > 0) {
                out.push(itemBase_(desc, "box", remCajas, box.w, box.d, box.h, peso, color, {
                    slMeta: { unidad: "caja", cajas: 1, rol: "suelta" }
                }));
            }
            if (out.length) return out;
        }

        /* 2) Apilado directo sobre pallet de mercado (caja cabe en EUR/GMA/ISO). */
        var fitBox = unidadesPorPallet_(box.w, box.d, box.h, peso, pallet, deckH, maxCapas);
        if (fitBox && fitBox.n >= 1) {
            var capStd = null;
            contsFcl_().forEach(function (c) {
                var nPal = Math.max(
                    Math.floor(c.d / pallet.w) * Math.floor(c.w / pallet.d),
                    Math.floor(c.d / pallet.d) * Math.floor(c.w / pallet.w)
                );
                if (nPal < 1) return;
                var floorU = nPal * fitBox.n;
                var remH = c.h - (deckH + fitBox.loadH);
                var top = mejorOriCajaEnHueco_(box, c.d, c.w, remH);
                var total = floorU + (top ? top.n : 0);
                if (!capStd || total > capStd.total) {
                    capStd = { total: total, floorU: floorU, topU: top ? top.n : 0 };
                }
            });
            var repStd = repartirPalletsYSueltas_(
                nCajas, fitBox.n,
                capStd ? capStd.floorU : fitBox.n,
                capStd ? capStd.topU : 0
            );
            if (repStd.nPal > 0) {
                out.push(itemBase_(
                    (pallet.id || "Pallet") + " · " + desc,
                    "pallet",
                    repStd.nPal,
                    pallet.w, pallet.d, deckH + fitBox.loadH,
                    peso * fitBox.n,
                    color,
                    {
                        noTilt: true,
                        onFloor: true,
                        slMeta: {
                            unidad: "pallet",
                            estandar: pallet.id,
                            cajas: fitBox.n,
                            modo: "directo",
                            deckH: deckH,
                            nx: fitBox.porCapa ? Math.floor(pallet.w / fitBox.ori[0]) : 1,
                            ny: fitBox.porCapa ? Math.floor(pallet.d / fitBox.ori[1]) : 1,
                            nz: fitBox.capas || 1,
                            ori: fitBox.ori || [box.w, box.d, box.h],
                            capRef: capStd
                        }
                    }
                ));
            }
            if (repStd.nLoose > 0) {
                out.push(itemBase_(desc, "box", repStd.nLoose, box.w, box.d, box.h, peso, color, {
                    slMeta: { unidad: "caja", cajas: 1, rol: "suelta" }
                }));
            }
            return out;
        }

        /* 3) Medidas custom: pallet a medida (rejilla) + sueltas para 2.º piso.
         * Capacidad de referencia = 40HC (más gálibo) para dimensionar sueltas de techo. */
        var cap = null;
        contsFcl_().forEach(function (c) {
            if (c.id === "40hc") cap = capacidadDosPisos_(box, peso, cfg, c);
        });
        if (!cap) cap = mejorCapacidadFcl_(box, peso, cfg);
        var custom = cap && cap.pallet;
        if (custom && custom.n >= 1 && (custom.n >= 2 || !esHuacal_(box, peso, cfg))) {
            var rep = repartirPalletsYSueltas_(nCajas, custom.n, custom.floorU, custom.topU);
            if (rep.nPal > 0) {
                out.push(itemBase_(
                    "Pallet · " + desc,
                    "pallet",
                    rep.nPal,
                    Math.max(custom.w, 40),
                    Math.max(custom.d, 40),
                    custom.h,
                    peso * custom.n,
                    color,
                    {
                        noTilt: true,
                        onFloor: true,
                        slMeta: {
                            unidad: "pallet",
                            estandar: "custom",
                            modo: "rejilla",
                            cajas: custom.n,
                            nx: custom.nx, ny: custom.ny, nz: custom.nz,
                            ori: custom.ori || [box.w, box.d, box.h],
                            deckH: deckH,
                            cap: { cont: cap.cont, total: cap.total, floorU: cap.floorU, topU: cap.topU }
                        }
                    }
                ));
            }
            if (rep.nLoose > 0) {
                var oriTop = custom.topOri || [box.w, box.d, box.h];
                out.push(itemBase_(desc, "box", rep.nLoose, oriTop[0], oriTop[1], oriTop[2], peso, color, {
                    onFloor: false,
                    slMeta: { unidad: "caja", cajas: 1, rol: "suelta" }
                }));
            }
            if (out.length) return out;
        }

        /* 4) Huacal: umbral extremo y no hubo rejilla útil. */
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
                    slMeta: {
                        unidad: "huacal",
                        cajas: 1,
                        holguraCm: hol,
                        ori: [box.w, box.d, box.h],
                        cajaInner: { w: box.w, d: box.d, h: box.h }
                    }
                }
            ));
            return out;
        }

        /* 5) Fallback: cajas sueltas. */
        out.push(itemBase_(desc, "box", nCajas, box.w, box.d, box.h, peso, color, {
            slMeta: { unidad: "caja", cajas: 1 }
        }));
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

    /** Contenedores sin arrays .cajas (se reconstruyen desde instanciasCajas). */
    function slimContenedores_(conts) {
        return (conts || []).map(function (c) {
            return {
                tipoKey: c.tipoKey || "40ft",
                nombre: c.nombre || "",
                w: c.w, h: c.h, d: c.d,
                maxWeight: c.maxWeight, maxVol: c.maxVol,
                pesoActual: c.pesoActual || 0,
                volActual: c.volActual || 0,
                lenUsada: c.lenUsada || 0
            };
        });
    }

    function slimInstancia_(inst) {
        if (!inst || typeof inst !== "object") return inst;
        return {
            uuid: inst.uuid,
            groupId: inst.groupId,
            shape: inst.shape,
            w: inst.w, h: inst.h, d: inst.d,
            drawW: inst.drawW, drawH: inst.drawH, drawD: inst.drawD,
            x: inst.x, y: inst.y, z: inst.z,
            weight: inst.weight || 0,
            color: inst.color,
            locked: !!inst.locked,
            contIdx: inst.contIdx,
            noTurn: !!inst.noTurn,
            noTilt: !!inst.noTilt,
            onFloor: !!inst.onFloor,
            slMeta: inst.slMeta || null
        };
    }

    function reinyectarCajasEnContenedores_(conts, insts) {
        (conts || []).forEach(function (c) {
            c.cajas = [];
            c.pesoActual = 0;
            c.volActual = 0;
            c.lenUsada = 0;
        });
        (insts || []).forEach(function (inst) {
            var tc = conts && conts[inst.contIdx];
            if (!tc) return;
            tc.cajas.push(inst);
            tc.pesoActual += inst.weight || 0;
            var dw = Number(inst.drawW) || 0, dh = Number(inst.drawH) || 0, dd = Number(inst.drawD) || 0;
            tc.volActual += (dw * dh * dd) / 1000000;
            if (Number(inst.z) + dd > tc.lenUsada) tc.lenUsada = Number(inst.z) + dd;
        });
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
        reinyectarCajasEnContenedores_(contenedoresFisicos, instanciasCajas);
        selectedGroupId = st.selectedGroupId || null;
        if (typeof selectedUUIDsSet !== "undefined") selectedUUIDsSet.clear();
        if (typeof actualizarTabla === "function") actualizarTabla();
        if (typeof actualizarUIContenedores === "function") actualizarUIContenedores();
        else if (typeof construirEscena3D === "function") construirEscena3D();
    }

    /** Estado liviano para JSON de cotización / Drive (sin duplicar cajas en contenedores). */
    window.slCompactarEstadoParaGuardar = function (st) {
        if (!st || typeof st !== "object") return null;
        return {
            v: st.v || 1,
            activo: st.activo || 0,
            escenarios: (st.escenarios || []).map(function (e) {
                return {
                    id: e.id,
                    nombre: e.nombre,
                    logEscId: e.logEscId,
                    cajasCrudas: e.cajasCrudas || [],
                    listaEmpaque: e.listaEmpaque || [],
                    instanciasCajas: (e.instanciasCajas || []).map(slimInstancia_),
                    contenedoresFisicos: slimContenedores_(e.contenedoresFisicos),
                    mixSugerido: e.mixSugerido || { c20: 0, c40: 0, c40hc: 0 },
                    modularizado: !!e.modularizado,
                    agrupaciones: e.agrupaciones || [],
                    loadLetra: e.loadLetra || "C",
                    loadVer: e.loadVer || "V1"
                };
            }),
            captures: {}
        };
    };

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
            var mix = e.mixSugerido || mixDesdeContenedores_(e.contenedoresFisicos);
            var mixTxt = (typeof logContenedoresTexto_ === "function")
                ? logContenedoresTexto_(mix)
                : ((e.contenedoresFisicos || []).length + " cont.");
            return "<li class=\"nav-item\" role=\"presentation\">" +
                "<div class=\"sl-esc-tab" + (i === slEscActivo ? " active" : "") + "\">" +
                "<button type=\"button\" class=\"nav-link" + (i === slEscActivo ? " active" : "") + "\" data-sl-esc=\"" + i + "\">" +
                (e.nombre || ("Opción " + (i + 1))) +
                "<span class=\"sl-esc-meta\">" + (mixTxt || "") + (n ? " · " + n + " ítems" : "") + "</span></button></div></li>";
        }).join("");
    }

    function activarEscenario_(idx, opts) {
        opts = opts || {};
        if (idx < 0 || idx >= slEscenarios.length) return;
        /* Solo persistir el escenario actual si cambiamos a otro; si no, un Traer
         * con listaEmpaque global vacía pisaba la opción 1 recién armada. */
        if (idx !== slEscActivo && slEscActivo >= 0 && slEscActivo < slEscenarios.length) {
            guardarEscenarioActivo_();
        }
        slEscActivo = idx;
        var e = slEscenarios[idx];
        /* Restaurar mix de Envío si aún no hay contenedores físicos. */
        if ((!e.contenedoresFisicos || !e.contenedoresFisicos.length) && e.mixSugerido) {
            e.contenedoresFisicos = contenedoresDesdeMix_(e.mixSugerido);
        }
        restoreEstado_({
            listaEmpaque: e.listaEmpaque || [],
            instanciasCajas: e.instanciasCajas || [],
            contenedoresFisicos: e.contenedoresFisicos || [],
            selectedGroupId: null
        });
        if ((!contenedoresFisicos || !contenedoresFisicos.length) && typeof crearContenedor === "function") {
            contenedoresFisicos = contenedoresDesdeMix_(e.mixSugerido || {});
            if (!contenedoresFisicos.length) {
                var key = (document.getElementById("ribbon-cont-type") || {}).value || mapTipoCont_(e.mixSugerido);
                contenedoresFisicos = [crearContenedor(key)];
            }
            e.contenedoresFisicos = contenedoresFisicos;
        }
        var ribbon = document.getElementById("ribbon-cont-type");
        if (ribbon && contenedoresFisicos[0]) ribbon.value = contenedoresFisicos[0].tipoKey || ribbon.value;
        if (typeof sincronizarInstancias === "function") sincronizarInstancias();
        if (typeof actualizarTabla === "function") actualizarTabla();
        if (typeof actualizarUIContenedores === "function") actualizarUIContenedores();
        else if (typeof construirEscena3D === "function") construirEscena3D();
        asegurarAgrupaciones_(e);
        pintarTabsEscenarios_();
        pintarListaModulos_();
        actualizarNombreLoadUI_();
        resizeViewer_();
        /* Si hay lista pero el contenedor está vacío, optimizar esta opción. */
        if (!opts.sinAutoOpt) {
            var hayLista = (listaEmpaque || []).length > 0;
            var vacio = !(contenedoresFisicos || []).some(function (c) { return c.cajas && c.cajas.length; });
            if (hayLista && vacio && typeof window.optimizarCarga === "function") {
                try { window.optimizarCarga(); } catch (eOpt) { /* noop */ }
            }
        }
    }

    /** Optimiza todas las opciones en secuencia (worker async). */
    function optimizarTodosEscenarios_(done) {
        if (!slEscenarios.length || typeof window.optimizarCarga !== "function") {
            if (typeof done === "function") done();
            return;
        }
        var i = 0;
        var prevAfter = window.slAfterOptimizar;
        function step() {
            if (i >= slEscenarios.length) {
                window.slAfterOptimizar = prevAfter;
                activarEscenario_(0, { sinAutoOpt: true });
                if (typeof done === "function") done();
                return;
            }
            activarEscenario_(i, { sinAutoOpt: true });
            window.slAfterOptimizar = function () {
                guardarEscenarioActivo_();
                i++;
                setTimeout(step, 40);
            };
            try { window.optimizarCarga(); } catch (eO) {
                i++;
                setTimeout(step, 40);
            }
        }
        step();
    }

    /** Tipo de ribbon según mix de Envío (respeta 40' vs 40HC; no fuerza HC en Traer). */
    function mapTipoCont_(mix) {
        mix = mix || {};
        if ((mix.c40hc || 0) > 0) return "40hc";
        if ((mix.c40 || 0) > 0) return "40ft";
        if ((mix.c20 || 0) > 0) return "20ft";
        return "40ft";
    }

    /** Contenedores físicos exactos según ficha Envío (c20 / c40 / c40hc). */
    function contenedoresDesdeMix_(mix) {
        mix = (typeof logContenedoresNorm_ === "function")
            ? logContenedoresNorm_(mix)
            : (mix || { c20: 0, c40: 0, c40hc: 0 });
        var out = [];
        if (typeof crearContenedor !== "function") return out;
        var i;
        for (i = 0; i < (mix.c20 || 0); i++) out.push(crearContenedor("20ft"));
        for (i = 0; i < (mix.c40 || 0); i++) out.push(crearContenedor("40ft"));
        for (i = 0; i < (mix.c40hc || 0); i++) out.push(crearContenedor("40hc"));
        if (!out.length) out.push(crearContenedor(mapTipoCont_(mix)));
        return out;
    }

    /** Nombre .load editable: Modulacion {opción}-C-V1 */
    function nombreLoadSugerido_(esc) {
        esc = esc || slEscenarios[slEscActivo] || {};
        var nom = String(esc.nombre || "Opcion")
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\s+/g, " ")
            .trim() || "Opcion";
        var letra = String(esc.loadLetra || "C").replace(/[^A-Za-z]/g, "").toUpperCase() || "C";
        var ver = String(esc.loadVer || "V1").replace(/^v/i, "V");
        if (!/^V\d+/i.test(ver)) ver = "V1";
        return "Modulacion " + nom + "-" + letra + "-" + ver;
    }

    function actualizarNombreLoadUI_() {
        var inp = document.getElementById("save-filename");
        if (!inp) return;
        if (inp.dataset.slUserEdit === "1") return;
        inp.value = nombreLoadSugerido_(slEscenarios[slEscActivo]);
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

    /** Cajas comerciales crudas (sin master/pallet). Paso Traer. */
    function itemsCajasCrudas_(filas, idioma, escId) {
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
                var color = SL_COLORS[colorIdx % SL_COLORS.length];
                items.push(itemBase_(desc, "box", nCajas, med.cm.w, med.cm.d, med.cm.h, peso, color, {
                    slMeta: { unidad: "caja", cajas: 1, cruda: true }
                }));
                colorIdx++;
            });
        });
        return items;
    }

    /** Aplica master / pallet / huacal a una lista de cajas crudas. */
    function modularizarItems_(crudas, escId) {
        var cfg = slSim3dCfg_();
        var ctx = contextoLogistica_(escId || "");
        /* El botón Modular siempre arma unidades de carga (como FCL), aunque el envío sea aéreo. */
        var modalidad = debePaletizar_(ctx.modalidad, cfg) ? ctx.modalidad : "fcl";
        var out = [];
        (crudas || []).forEach(function (caja) {
            if (!caja) return;
            var n = Math.max(1, Math.ceil(num_(caja.qty, 1)));
            var unidos = unidadesDesdeCaja_(
                { w: caja.w, d: caja.d, h: caja.h },
                n,
                caja.weight,
                caja.desc,
                caja.color,
                cfg,
                modalidad,
                ctx.cod
            );
            unidos.forEach(function (it) { out.push(it); });
        });
        return out.length ? out : (crudas || []).slice();
    }

    function escenarioDesdeLogistica_(nombre, escId, filas, idioma) {
        var env = typeof logEnv_ === "function" ? logEnv_() : {};
        var st = escId && typeof logEnvEscDe_ === "function" ? logEnvEscDe_(env, escId) : null;
        /* Preferir estado 3D ya guardado en la cotización (historial). */
        if (st && st.sim3dState && (st.sim3dState.listaEmpaque || []).length) {
            var saved = st.sim3dState;
            return {
                id: escId || "base",
                nombre: nombre,
                logEscId: escId || "",
                cajasCrudas: JSON.parse(JSON.stringify(saved.cajasCrudas || saved.listaEmpaque || [])),
                listaEmpaque: JSON.parse(JSON.stringify(saved.listaEmpaque || [])),
                instanciasCajas: JSON.parse(JSON.stringify(saved.instanciasCajas || [])),
                contenedoresFisicos: (saved.contenedoresFisicos && saved.contenedoresFisicos.length)
                    ? JSON.parse(JSON.stringify(saved.contenedoresFisicos))
                    : contenedoresDesdeMix_(st.contenedores || env.contenedores),
                mixSugerido: typeof logContenedoresNorm_ === "function"
                    ? logContenedoresNorm_(st.contenedores || env.contenedores)
                    : { c20: 0, c40: 0, c40hc: 0 },
                modularizado: !!saved.modularizado,
                agrupaciones: saved.agrupaciones || [],
                loadLetra: saved.loadLetra || "C",
                loadVer: saved.loadVer || "V1"
            };
        }
        var mix = typeof logContenedoresNorm_ === "function"
            ? logContenedoresNorm_((st && st.contenedores) || null)
            : { c20: 0, c40: 0, c40hc: 0 };
        /* Si la opción no tiene mix propio, usa el de Envío global. */
        if (!(mix.c20 || mix.c40 || mix.c40hc) && typeof logContenedoresNorm_ === "function") {
            mix = logContenedoresNorm_(env.contenedores);
        }
        var crudas = itemsCajasCrudas_(filas, idioma, escId || "");
        var conts = contenedoresDesdeMix_(mix);
        return {
            id: escId || "base",
            nombre: nombre,
            logEscId: escId || "",
            cajasCrudas: JSON.parse(JSON.stringify(crudas)),
            listaEmpaque: JSON.parse(JSON.stringify(crudas)),
            instanciasCajas: [],
            contenedoresFisicos: conts,
            mixSugerido: mix,
            modularizado: false,
            agrupaciones: [],
            loadLetra: "C",
            loadVer: "V1"
        };
    }

    function idiomaCotizacion_() {
        try {
            if (typeof logisticaLeerOpciones_ === "function") return logisticaLeerOpciones_().idioma === "en" ? "en" : "es";
        } catch (e) { /* noop */ }
        return "es";
    }

    function resumenUnidades_(items, idioma) {
        idioma = idioma || idiomaCotizacion_();
        var en = idioma === "en";
        var c = { caja: 0, master: 0, pallet: 0, huacal: 0 };
        (items || []).forEach(function (it) {
            var u = (it.slMeta && it.slMeta.unidad) || (it.shape === "pallet" ? "pallet" : "caja");
            if (c[u] != null) c[u] += it.qty || 0;
            else c.caja += it.qty || 0;
        });
        var parts = [];
        if (c.pallet) parts.push(c.pallet + (en ? (" pallet" + (c.pallet === 1 ? "" : "s")) : (" estiba" + (c.pallet === 1 ? "" : "s"))));
        if (c.huacal) parts.push(c.huacal + (en ? (" crate" + (c.huacal === 1 ? "" : "s")) : (" huacal" + (c.huacal === 1 ? "" : "es"))));
        if (c.master) parts.push(c.master + (en ? (" master" + (c.master === 1 ? "" : "s")) : (" master")));
        if (c.caja) parts.push(c.caja + (en ? (" loose box" + (c.caja === 1 ? "" : "es")) : (" caja" + (c.caja === 1 ? "" : "s") + " suelta" + (c.caja === 1 ? "" : "s"))));
        return parts.join(en ? ", " : " · ") || (en ? "No load" : "Sin carga");
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
        /* -1 evita que activarEscenario_(0) guarde una listaEmpaque global vacía sobre la opción 1. */
        slEscActivo = -1;
        var ribbon = document.getElementById("ribbon-cont-type");
        if (ribbon && slEscenarios[0]) ribbon.value = mapTipoCont_(slEscenarios[0].mixSugerido);
        slEscenarios.forEach(function (esc) { asegurarAgrupaciones_(esc); });
        setModoVista_("contenedor");
        pintarTabsEscenarios_();
        actualizarNombreLoadUI_();
        /* Optimiza TODAS las opciones con el mix de Envío de cada una. */
        if (!opts.sinOptimizar) {
            if (!opts.silencioso) toast_("Empacando " + slEscenarios.length + " opción(es)…");
            optimizarTodosEscenarios_(function () {
                pintarListaModulos_();
                if (!opts.silencioso) {
                    toast_("Carga traída: " + slEscenarios.length + " opción(es) con mix de Envío. Edita Agrupación si hace falta.");
                }
            });
        } else {
            activarEscenario_(0, { sinAutoOpt: true });
            pintarListaModulos_();
            if (!opts.silencioso) toast_("Carga traída: " + slEscenarios.length + " opción(es).");
        }
        return true;
    }

    /**
     * Prototipos para Vista Módulo/Pallet.
     * Incluye pallets/huacales/masters; si aún no se modularizó, muestra cajas crudas/sueltas.
     */
    function modulosDesdeLista_(items) {
        var seen = {};
        var out = [];
        var hayModulo = false;
        (items || []).forEach(function (it) {
            if (!it) return;
            var meta = it.slMeta || {};
            var unidad = meta.unidad || (it.shape === "pallet" ? "pallet" : "caja");
            if (unidad === "pallet" || unidad === "huacal" || unidad === "master") hayModulo = true;
        });
        (items || []).forEach(function (it) {
            if (!it) return;
            var meta = it.slMeta || {};
            var unidad = meta.unidad || (it.shape === "pallet" ? "pallet" : "caja");
            if (hayModulo) {
                if (unidad === "caja" && (meta.rol === "suelta" || meta.cruda)) return;
                if (unidad !== "pallet" && unidad !== "huacal" && unidad !== "master") return;
            } else {
                /* Antes de Modular: mostrar la caja unitaria para que la vista no quede vacía. */
                if (unidad !== "caja" && unidad !== "pallet" && unidad !== "huacal" && unidad !== "master") return;
            }
            var key = [unidad, r1_(it.w), r1_(it.d), r1_(it.h), meta.nx || 0, meta.ny || 0, meta.nz || 0, meta.estandar || ""].join("|");
            if (seen[key]) {
                seen[key].qty += Math.max(1, it.qty || 1);
                if (it.id) seen[key].itemIds.push(String(it.id));
                return;
            }
            var deckH = meta.deckH != null ? num_(meta.deckH, 15) : (unidad === "pallet" ? 15 : 0);
            var mod = {
                tipo: unidad === "caja" ? "caja" : unidad,
                w: num_(it.w),
                d: num_(it.d),
                h: num_(it.h),
                deckH: deckH,
                color: it.color || "#c5a968",
                desc: it.desc || "",
                qty: Math.max(1, it.qty || 1),
                nx: meta.nx || 1,
                ny: meta.ny || 1,
                nz: meta.nz || 1,
                ori: meta.ori || null,
                cajaInner: meta.cajaInner || null,
                itemIds: it.id ? [String(it.id)] : [],
                primaryId: it.id ? String(it.id) : null
            };
            seen[key] = mod;
            out.push(mod);
        });
        return out;
    }

    var slAgrupSelId = null;
    var slAgrupEditId = null;

    function claveCaja_(it) {
        return [String(it.desc || ""), r1_(it.w), r1_(it.d), r1_(it.h)].join("|");
    }

    function nuevaAgrupacionDeCaja_(caja) {
        var ori = [num_(caja.w), num_(caja.d), num_(caja.h)];
        return {
            id: (typeof generateUUID === "function" ? generateUUID() : ("ag_" + Date.now() + Math.random().toString(36).slice(2, 6))),
            clave: claveCaja_(caja),
            desc: caja.desc || "Caja",
            color: caja.color || "#c5a968",
            boxW: num_(caja.w), boxD: num_(caja.d), boxH: num_(caja.h),
            weight: num_(caja.weight, 0),
            total: Math.max(1, Math.floor(num_(caja.qty, 1))),
            modo: "ninguna",
            nx: 1, ny: 1, nz: 1,
            ori: ori,
            masterW: 0, masterD: 0, masterH: 0,
            noTilt: !!caja.noTilt, noTurn: !!caja.noTurn, onFloor: !!caja.onFloor
        };
    }

    function asegurarAgrupaciones_(esc) {
        if (!esc) return [];
        if (!Array.isArray(esc.agrupaciones)) esc.agrupaciones = [];
        var fuentes = (esc.cajasCrudas && esc.cajasCrudas.length)
            ? esc.cajasCrudas
            : (esc.listaEmpaque || []).filter(function (it) {
                return !it.slMeta || it.slMeta.cruda || it.slMeta.unidad === "caja";
            });
        if (!fuentes.length && (esc.listaEmpaque || []).length) fuentes = esc.listaEmpaque;
        var byClave = {};
        esc.agrupaciones.forEach(function (a) { if (a && a.clave) byClave[a.clave] = a; });
        var next = [];
        fuentes.forEach(function (caja) {
            if (!caja) return;
            var k = claveCaja_(caja);
            if (byClave[k]) {
                byClave[k].total = Math.max(1, Math.floor(num_(caja.qty, byClave[k].total)));
                byClave[k].boxW = num_(caja.w); byClave[k].boxD = num_(caja.d); byClave[k].boxH = num_(caja.h);
                byClave[k].weight = num_(caja.weight, 0);
                byClave[k].desc = caja.desc || byClave[k].desc;
                byClave[k].color = caja.color || byClave[k].color;
                next.push(byClave[k]);
                delete byClave[k];
            } else {
                next.push(nuevaAgrupacionDeCaja_(caja));
            }
        });
        esc.agrupaciones = next;
        return next;
    }

    /** Exterior huacal: base 15 + contenido + tapa 2; huella +2 cm (parales). */
    function dimsHuacal_(cw, cd, ch) {
        return { w: r1_(cw + 2), d: r1_(cd + 2), h: r1_(15 + ch + 2), deckH: 15, tapaH: 2 };
    }

    function contenidoRejilla_(ag) {
        var ori = ag.ori && ag.ori.length >= 3 ? ag.ori : [ag.boxW, ag.boxD, ag.boxH];
        var nx = Math.max(1, Math.floor(num_(ag.nx, 1)));
        var ny = Math.max(1, Math.floor(num_(ag.ny, 1)));
        var nz = Math.max(1, Math.floor(num_(ag.nz, 1)));
        return {
            ori: [num_(ori[0]), num_(ori[1]), num_(ori[2])],
            nx: nx, ny: ny, nz: nz,
            n: nx * ny * nz,
            cw: nx * num_(ori[0]),
            cd: ny * num_(ori[1]),
            ch: nz * num_(ori[2])
        };
    }

    function dimsUnidadAgrup_(ag) {
        var c = contenidoRejilla_(ag);
        if (ag.modo === "master") {
            var mw = num_(ag.masterW) > 0 ? num_(ag.masterW) : c.cw + 2;
            var md = num_(ag.masterD) > 0 ? num_(ag.masterD) : c.cd + 2;
            var mh = num_(ag.masterH) > 0 ? num_(ag.masterH) : c.ch + 2;
            return { w: r1_(mw), d: r1_(md), h: r1_(mh), deckH: 0, tipo: "master", cajas: c.n, content: c };
        }
        if (ag.modo === "huacal") {
            var hu = dimsHuacal_(c.cw, c.cd, c.ch);
            return { w: hu.w, d: hu.d, h: hu.h, deckH: hu.deckH, tipo: "huacal", cajas: c.n, content: c };
        }
        if (ag.modo === "pallet") {
            return { w: r1_(c.cw), d: r1_(c.cd), h: r1_(15 + c.ch), deckH: 15, tipo: "pallet", cajas: c.n, content: c };
        }
        return { w: r1_(ag.boxW), d: r1_(ag.boxD), h: r1_(ag.boxH), deckH: 0, tipo: "caja", cajas: 1, content: c };
    }

    function sugerirMasterExterior_(ag) {
        var c = contenidoRejilla_(ag);
        return { w: r1_(c.cw + 2), d: r1_(c.cd + 2), h: r1_(c.ch + 2) };
    }

    function resumenAgrup_(ag) {
        var c = contenidoRejilla_(ag);
        var tot = Math.max(1, Math.floor(num_(ag.total, 1)));
        var maxGrupos = ag.modo === "ninguna" ? 0 : Math.floor(tot / Math.max(1, c.n));
        var nGrupos = maxGrupos;
        if (ag.modo !== "ninguna") {
            if (ag.nGrupos != null && ag.nGrupos !== "") {
                nGrupos = Math.max(0, Math.min(maxGrupos, Math.floor(num_(ag.nGrupos, maxGrupos))));
            }
        } else {
            nGrupos = 0;
        }
        var sueltas = ag.modo === "ninguna" ? tot : (tot - nGrupos * c.n);
        return { nPorGrupo: c.n, nGrupos: nGrupos, maxGrupos: maxGrupos, sueltas: sueltas, c: c };
    }

    function listaDesdeAgrupaciones_(agrupaciones) {
        var out = [];
        (agrupaciones || []).forEach(function (ag) {
            if (!ag) return;
            var u = dimsUnidadAgrup_(ag);
            var r = resumenAgrup_(ag);
            var pesoCaja = num_(ag.weight, 0);
            if (ag.modo !== "ninguna" && r.nGrupos > 0) {
                var shape = ag.modo === "pallet" ? "pallet" : (ag.modo === "huacal" ? "huacal" : "box");
                var etiqueta = (ag.modo === "pallet" ? "Estiba · " : ag.modo === "huacal" ? "Huacal · " : "Master · ") + ag.desc;
                out.push(itemBase_(etiqueta, shape, r.nGrupos, u.w, u.d, u.h, pesoCaja * r.nPorGrupo, ag.color, {
                    noTilt: true,
                    onFloor: true,
                    slMeta: {
                        unidad: u.tipo,
                        cajas: r.nPorGrupo,
                        nx: r.c.nx, ny: r.c.ny, nz: r.c.nz,
                        ori: r.c.ori,
                        deckH: u.deckH,
                        agrupId: ag.id,
                        cajaInner: ag.modo === "huacal" || ag.modo === "master"
                            ? { w: r.c.cw, d: r.c.cd, h: r.c.ch } : null
                    }
                }));
            }
            if (r.sueltas > 0 || ag.modo === "ninguna") {
                var nLoose = ag.modo === "ninguna" ? Math.max(1, Math.floor(num_(ag.total, 1))) : r.sueltas;
                if (nLoose > 0) {
                    out.push(itemBase_(ag.desc, "box", nLoose, ag.boxW, ag.boxD, ag.boxH, pesoCaja, ag.color, {
                        noTilt: !!ag.noTilt,
                        noTurn: !!ag.noTurn,
                        onFloor: !!ag.onFloor,
                        slMeta: { unidad: "caja", cajas: 1, rol: "suelta", agrupId: ag.id }
                    }));
                }
            }
        });
        return out;
    }

    function aplicarAgrupacionesAlEscenario_(esc) {
        if (!esc) return;
        asegurarAgrupaciones_(esc);
        esc.listaEmpaque = listaDesdeAgrupaciones_(esc.agrupaciones);
        esc.instanciasCajas = [];
        esc.modularizado = (esc.agrupaciones || []).some(function (a) { return a.modo && a.modo !== "ninguna"; });
    }

    function resumenAgrupacionesTexto_(ags) {
        var nPal = 0, nMas = 0, nHua = 0, nSue = 0;
        (ags || []).forEach(function (ag) {
            var r = resumenAgrup_(ag);
            if (ag.modo === "pallet") nPal += r.nGrupos;
            else if (ag.modo === "master") nMas += r.nGrupos;
            else if (ag.modo === "huacal") nHua += r.nGrupos;
            nSue += (ag.modo === "ninguna" ? ag.total : r.sueltas);
        });
        var parts = [];
        if (nPal) parts.push(nPal + " estiba" + (nPal === 1 ? "" : "s"));
        if (nMas) parts.push(nMas + " master");
        if (nHua) parts.push(nHua + " huacal" + (nHua === 1 ? "" : "es"));
        if (nSue) parts.push(nSue + " caja" + (nSue === 1 ? "" : "s") + " suelta" + (nSue === 1 ? "" : "s"));
        return parts.join(" · ") || "Sin agrupación";
    }

    function pintarContTipoAgrupacion_(esc) {
        var sel = document.getElementById("slAgrupContTipo");
        if (!sel || typeof dbContenedores === "undefined") return;
        var cur = (esc && esc.contenedoresFisicos && esc.contenedoresFisicos[0] && esc.contenedoresFisicos[0].tipoKey)
            || (document.getElementById("ribbon-cont-type") || {}).value
            || "40ft";
        var html = "";
        Object.keys(dbContenedores).forEach(function (k) {
            html += '<option value="' + k + '"' + (k === cur ? " selected" : "") + ">" + (dbContenedores[k].nombre || k) + "</option>";
        });
        sel.innerHTML = html;
        sel.value = cur;
        if (!sel._slWired) {
            sel._slWired = true;
            sel.addEventListener("change", function () {
                var escA = slEscenarios[slEscActivo];
                if (!escA || typeof crearContenedor !== "function") return;
                var n = Math.max(1, (escA.contenedoresFisicos || []).length || 1);
                escA.contenedoresFisicos = [];
                for (var i = 0; i < n; i++) escA.contenedoresFisicos.push(crearContenedor(sel.value));
                var ribbon = document.getElementById("ribbon-cont-type");
                if (ribbon) ribbon.value = sel.value;
                contenedoresFisicos = escA.contenedoresFisicos.map(function (c) { return crearContenedor(c.tipoKey); });
                guardarEscenarioActivo_();
                refrescarSimulacion3dDebounced_();
            });
        }
    }

    var _slOptDebounce = null;
    function refrescarSimulacion3dDebounced_() {
        if (_slOptDebounce) clearTimeout(_slOptDebounce);
        _slOptDebounce = setTimeout(function () {
            setModoVista_("contenedor");
            if (typeof window.optimizarCarga === "function") {
                try { window.optimizarCarga(); } catch (e) { /* noop */ }
            } else if (typeof construirEscena3D === "function") {
                construirEscena3D();
            }
            actualizarResumenAgrupLive_();
        }, 350);
    }

    function actualizarResumenAgrupLive_() {
        var esc = slEscenarios[slEscActivo];
        var ags = asegurarAgrupaciones_(esc);
        var el = document.getElementById("slAgrupStats");
        if (el) {
            var mixTxt = "";
            if (esc && esc.contenedoresFisicos && esc.contenedoresFisicos.length) {
                mixTxt = (typeof logContenedoresTexto_ === "function"
                    ? logContenedoresTexto_(mixDesdeContenedores_(esc.contenedoresFisicos))
                    : (esc.contenedoresFisicos.length + " cont.")) + " · ";
            }
            el.textContent = mixTxt + resumenAgrupacionesTexto_(ags);
        }
        pintarContTipoAgrupacion_(esc);
    }

    function pintarListaModulos_() {
        var tbody = document.getElementById("sl-modulos-body");
        if (!tbody) return;
        var esc = slEscenarios[slEscActivo];
        var ags = asegurarAgrupaciones_(esc);
        var html = "";
        if (!ags.length) {
            html = '<tr><td colspan="7" class="text-muted small py-3 text-center">Sin cajas. Trae desde Logística.</td></tr>';
        } else {
            ags.forEach(function (ag) {
                var idEsc = String(ag.id).replace(/'/g, "\\'");
                var isSel = String(slAgrupSelId) === String(ag.id);
                var r = resumenAgrup_(ag);
                var modoLbl = ag.modo === "pallet" ? "Estiba" : ag.modo === "master" ? "Master" : ag.modo === "huacal" ? "Huacal" : "Suelta";
                var det = ag.modo === "ninguna"
                    ? (ag.total + " caja(s)")
                    : (r.nGrupos + "×" + modoLbl + " (" + r.c.nx + "×" + r.c.ny + "×" + r.c.nz + ")" + (r.sueltas ? " + " + r.sueltas + " sueltas" : ""));
                html += '<tr class="' + (isSel ? "selected" : "") + '" data-ag-id="' + idEsc + '"' +
                    ' onclick="slSeleccionarAgrupacion(\'' + idEsc + '\')" ondblclick="slEditarAgrupacion(\'' + idEsc + '\')">' +
                    '<td><div class="color-box" style="background-color:' + (ag.color || "#ccc") + ';"></div></td>' +
                    '<td style="text-align:right;">' + ag.total + "</td>" +
                    "<td><strong>" + modoLbl + "</strong><div class=\"small text-muted\">" + String(ag.desc || "").slice(0, 40) +
                    "</div><div class=\"small\">" + det + "</div></td>" +
                    '<td style="text-align:right;">' + r1_(ag.boxW) + "</td>" +
                    '<td style="text-align:right;">' + r1_(ag.boxD) + "</td>" +
                    '<td style="text-align:right;">' + r1_(ag.boxH) + "</td>" +
                    '<td class="sl-row-actions" onclick="event.stopPropagation()">' +
                    '<button type="button" class="btn btn-link btn-sm p-0 px-1" title="Editar agrupación" onclick="slEditarAgrupacion(\'' + idEsc + '\')"><i class="bi bi-pencil"></i></button>' +
                    "</td></tr>";
            });
        }
        tbody.innerHTML = html;
        actualizarResumenAgrupLive_();
    }

    function refrescarTrasEdicionLista_() {
        guardarEscenarioActivo_();
        pintarListaModulos_();
        setModoVista_("contenedor");
        refrescarSimulacion3dDebounced_();
    }

    function agPorId_(id) {
        var esc = slEscenarios[slEscActivo];
        if (!esc) return null;
        asegurarAgrupaciones_(esc);
        id = String(id || "");
        for (var i = 0; i < esc.agrupaciones.length; i++) {
            if (String(esc.agrupaciones[i].id) === id) return esc.agrupaciones[i];
        }
        return null;
    }

    function llenarOriSelect_(ag) {
        var sel = document.getElementById("ag-ori");
        if (!sel) return;
        var opts = oris_(ag.boxW, ag.boxD, ag.boxH);
        var cur = (ag.ori || []).join("x");
        sel.innerHTML = opts.map(function (o) {
            var v = o.join(",");
            var lab = o[0] + " × " + o[1] + " × " + o[2] + " cm";
            return '<option value="' + v + '"' + (o.join("x") === cur || v === (ag.ori || []).join(",") ? " selected" : "") + ">" + lab + "</option>";
        }).join("");
    }

    function etiquetaModoAgrup_(modo) {
        if (modo === "pallet") return "estibas";
        if (modo === "master") return "masters";
        if (modo === "huacal") return "huacales";
        return "grupos";
    }

    function actualizarMini3dAgrupacion_(ag, u, r) {
        if (typeof updateAgrupacionMini3D !== "function" || !ag) return;
        var c = (r && r.c) || contenidoRejilla_(ag);
        var tipo = (u && u.tipo) || (ag.modo === "ninguna" ? "caja" : ag.modo);
        updateAgrupacionMini3D({
            tipo: tipo,
            w: u.w, d: u.d, h: u.h,
            deckH: u.deckH || 0,
            color: ag.color || "#c5a968",
            ori: c.ori,
            nx: c.nx, ny: c.ny, nz: c.nz,
            cajaInner: (tipo === "huacal" || tipo === "master")
                ? { w: c.cw, d: c.cd, h: c.ch } : null
        });
    }

    function actualizarPreviewAgrupacionUI_() {
        var ag = agPorId_(slAgrupEditId);
        if (!ag) return;
        ag.total = Math.max(1, Math.floor(num_((document.getElementById("ag-total") || {}).value, ag.total)));
        ag.modo = (document.getElementById("ag-modo") || {}).value || "ninguna";
        ag.nx = Math.max(1, Math.floor(num_((document.getElementById("ag-nx") || {}).value, 1)));
        ag.ny = Math.max(1, Math.floor(num_((document.getElementById("ag-ny") || {}).value, 1)));
        ag.nz = Math.max(1, Math.floor(num_((document.getElementById("ag-nz") || {}).value, 1)));
        var oriVal = ((document.getElementById("ag-ori") || {}).value || "").split(",");
        if (oriVal.length === 3) ag.ori = [num_(oriVal[0]), num_(oriVal[1]), num_(oriVal[2])];
        ag.noTilt = !!(document.getElementById("ag-no-tilt") || {}).checked;
        ag.noTurn = !!(document.getElementById("ag-no-turn") || {}).checked;
        ag.onFloor = !!(document.getElementById("ag-floor") || {}).checked;

        var cTmp = contenidoRejilla_(ag);
        var maxG = ag.modo === "ninguna" ? 0 : Math.floor(ag.total / Math.max(1, cTmp.n));
        var nGruposEl = document.getElementById("ag-n-grupos");
        var gruposRow = document.getElementById("ag-grupos-row");
        if (gruposRow) gruposRow.classList.toggle("d-none", ag.modo === "ninguna");
        if (nGruposEl) {
            nGruposEl.max = String(maxG);
            if (nGruposEl.dataset.userSet === "1") {
                ag.nGrupos = Math.max(0, Math.min(maxG, Math.floor(num_(nGruposEl.value, maxG))));
            } else {
                /* Automático: siempre el máximo según cajas ÷ rejilla. */
                ag.nGrupos = maxG;
            }
            nGruposEl.value = ag.nGrupos;
        }
        var lblG = document.getElementById("ag-n-grupos-lbl");
        if (lblG) lblG.textContent = "Cant. " + etiquetaModoAgrup_(ag.modo);
        var hintG = document.getElementById("ag-grupos-hint");
        if (hintG) {
            hintG.textContent = ag.modo === "ninguna"
                ? "—"
                : ("Máx. " + maxG + " · al bajar → más cajas sueltas");
        }

        var masterBlk = document.getElementById("ag-master-block");
        if (masterBlk) masterBlk.classList.toggle("d-none", ag.modo !== "master");
        if (ag.modo === "master") {
            var sug = sugerirMasterExterior_(ag);
            var mw = document.getElementById("ag-mw");
            var md = document.getElementById("ag-md");
            var mh = document.getElementById("ag-mh");
            if (mw && (!mw.dataset.touched || mw.dataset.touched === "0")) { mw.value = sug.w; ag.masterW = sug.w; }
            else if (mw) ag.masterW = num_(mw.value, sug.w);
            if (md && (!md.dataset.touched || md.dataset.touched === "0")) { md.value = sug.d; ag.masterD = sug.d; }
            else if (md) ag.masterD = num_(md.value, sug.d);
            if (mh && (!mh.dataset.touched || mh.dataset.touched === "0")) { mh.value = sug.h; ag.masterH = sug.h; }
            else if (mh) ag.masterH = num_(mh.value, sug.h);
            var hint = document.getElementById("ag-master-hint");
            if (hint) hint.textContent = "Sugerido (+1 cm/lado): " + sug.w + " × " + sug.d + " × " + sug.h + " cm";
        }
        var r = resumenAgrup_(ag);
        var u = dimsUnidadAgrup_(ag);
        var info = document.getElementById("ag-grid-info");
        if (info) {
            info.textContent = "Por grupo: " + r.nPorGrupo + " · " + etiquetaModoAgrup_(ag.modo) + ": " + r.nGrupos +
                " (máx " + r.maxGrupos + ") · Sueltas: " + r.sueltas;
        }
        var prev = document.getElementById("ag-unit-preview");
        if (prev) {
            prev.textContent = ag.modo === "ninguna"
                ? ("Caja individual: " + r1_(ag.boxW) + " × " + r1_(ag.boxD) + " × " + r1_(ag.boxH) + " cm")
                : ("Unidad " + u.tipo + ": " + u.w + " × " + u.d + " × " + u.h + " cm · " + r.nPorGrupo + " caja(s)");
        }
        actualizarMini3dAgrupacion_(ag, u, r);
        /* Resumen global en vivo (incluye el borrador del modal). */
        var esc = slEscenarios[slEscActivo];
        if (esc) actualizarResumenAgrupLive_();
        /* Vista previa 3D del contenedor en vivo (debounced). */
        if (slAgrupEditId) {
            aplicarAgrupacionesAlEscenario_(esc);
            listaEmpaque = JSON.parse(JSON.stringify(esc.listaEmpaque || []));
            if (typeof actualizarTabla === "function") actualizarTabla();
            refrescarSimulacion3dDebounced_();
        }
    }

    window.slSeleccionarAgrupacion = function (id) {
        slAgrupSelId = id;
        pintarListaModulos_();
    };

    window.slEditarAgrupacion = function (id) {
        var ag = agPorId_(id);
        if (!ag) return;
        slAgrupEditId = ag.id;
        slAgrupSelId = ag.id;
        var modal = document.getElementById("modal-agrupacion");
        if (!modal) return;
        document.getElementById("ag-id").value = ag.id;
        document.getElementById("ag-desc").textContent = ag.desc || "Caja";
        document.getElementById("ag-dims").textContent = r1_(ag.boxW) + " × " + r1_(ag.boxD) + " × " + r1_(ag.boxH) + " cm · " + r2_(ag.weight) + " kg";
        document.getElementById("ag-total").value = ag.total;
        document.getElementById("ag-modo").value = ag.modo || "ninguna";
        document.getElementById("ag-nx").value = ag.nx || 1;
        document.getElementById("ag-ny").value = ag.ny || 1;
        document.getElementById("ag-nz").value = ag.nz || 1;
        document.getElementById("ag-no-tilt").checked = !!ag.noTilt;
        document.getElementById("ag-no-turn").checked = !!ag.noTurn;
        document.getElementById("ag-floor").checked = !!ag.onFloor;
        var nGruposEl = document.getElementById("ag-n-grupos");
        if (nGruposEl) {
            nGruposEl.dataset.userSet = ag.nGrupos != null && ag.nGrupos !== "" ? "1" : "0";
            if (ag.nGrupos != null && ag.nGrupos !== "") nGruposEl.value = ag.nGrupos;
        }
        ["ag-mw", "ag-md", "ag-mh"].forEach(function (idEl) {
            var el = document.getElementById(idEl);
            if (el) { el.dataset.touched = "0"; }
        });
        llenarOriSelect_(ag);
        if (ag.modo === "master") {
            var sug = sugerirMasterExterior_(ag);
            document.getElementById("ag-mw").value = ag.masterW || sug.w;
            document.getElementById("ag-md").value = ag.masterD || sug.d;
            document.getElementById("ag-mh").value = ag.masterH || sug.h;
        }
        modal.style.display = "block";
        modal.style.transform = "none";
        /* Centrar dentro del viewport (evita que se salga al abrir la 1.ª vez). */
        var mw = modal.offsetWidth || Math.min(720, window.innerWidth * 0.96);
        var mh = modal.offsetHeight || 520;
        var left = Math.max(12, Math.round((window.innerWidth - mw) / 2));
        var top = Math.max(12, Math.min(64, Math.round((window.innerHeight - mh) / 2)));
        if (left + mw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mw - 8);
        if (top + mh > window.innerHeight - 8) top = Math.max(8, window.innerHeight - mh - 8);
        modal.style.left = left + "px";
        modal.style.top = top + "px";
        if (typeof dragElement === "function") dragElement(modal);
        actualizarPreviewAgrupacionUI_();
    };

    window.slEditarAgrupacionSel = function () {
        if (slAgrupSelId) window.slEditarAgrupacion(slAgrupSelId);
        else toast_("Selecciona una caja en Lista de Agrupación.");
    };

    window.slCerrarAgrupacion = function () {
        var modal = document.getElementById("modal-agrupacion");
        if (modal) modal.style.display = "none";
        slAgrupEditId = null;
    };

    window.slGuardarAgrupacion = function () {
        actualizarPreviewAgrupacionUI_();
        var esc = slEscenarios[slEscActivo];
        if (!esc) return;
        aplicarAgrupacionesAlEscenario_(esc);
        listaEmpaque = JSON.parse(JSON.stringify(esc.listaEmpaque));
        if (typeof sincronizarInstancias === "function") sincronizarInstancias();
        if (typeof actualizarTabla === "function") actualizarTabla();
        guardarEscenarioActivo_();
        window.slCerrarAgrupacion();
        pintarListaModulos_();
        setModoVista_("contenedor");
        if (typeof window.optimizarCarga === "function") window.optimizarCarga();
        toast_("Agrupación aplicada. Simulación 3D actualizada.");
    };

    window.slDuplicarAgrupacionOpciones = function () {
        var esc = slEscenarios[slEscActivo];
        if (!esc || slEscenarios.length < 2) {
            toast_("No hay otras opciones a las que copiar.");
            return;
        }
        if (!confirm("¿Copiar la Lista de Agrupación de «" + (esc.nombre || "esta opción") + "» a las demás?")) return;
        var snap = JSON.parse(JSON.stringify(esc.agrupaciones || []));
        slEscenarios.forEach(function (e, i) {
            if (i === slEscActivo) return;
            e.agrupaciones = JSON.parse(JSON.stringify(snap)).map(function (a) {
                a.id = (typeof generateUUID === "function" ? generateUUID() : ("ag_" + Date.now() + Math.random().toString(36).slice(2, 6)));
                return a;
            });
            /* Ajustar totales si la otra opción tiene distinta Q de cajas crudas. */
            asegurarAgrupaciones_(e);
            e.agrupaciones.forEach(function (a, j) {
                if (snap[j]) {
                    a.modo = snap[j].modo;
                    a.nx = snap[j].nx; a.ny = snap[j].ny; a.nz = snap[j].nz;
                    a.ori = snap[j].ori;
                    a.nGrupos = snap[j].nGrupos;
                    a.masterW = snap[j].masterW; a.masterD = snap[j].masterD; a.masterH = snap[j].masterH;
                    a.noTilt = snap[j].noTilt; a.noTurn = snap[j].noTurn; a.onFloor = snap[j].onFloor;
                }
            });
            aplicarAgrupacionesAlEscenario_(e);
        });
        toast_("Agrupación duplicada a " + (slEscenarios.length - 1) + " opción(es).");
    };

    window.slAfterListaCargaUpdate = function () {
        pintarListaModulos_();
        try { guardarEscenarioActivo_(); } catch (e) { /* noop */ }
    };
    window.pintarListaModulos_ = pintarListaModulos_;

    function wireAgrupacionModal_() {
        ["ag-total", "ag-modo", "ag-nx", "ag-ny", "ag-nz", "ag-ori", "ag-no-tilt", "ag-no-turn", "ag-floor"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || el._slAgWired) return;
            el._slAgWired = true;
            el.addEventListener("input", function () {
                /* Al cambiar rejilla/total/modo, permitir reclacular máx. si el usuario no fijó cant. */
                if (id === "ag-modo" || id === "ag-total" || id === "ag-nx" || id === "ag-ny" || id === "ag-nz") {
                    var ng = document.getElementById("ag-n-grupos");
                    /* Si aún no ha tocado la cant. de grupos, seguir en automático (máx). */
                    if (ng && ng.dataset.userSet !== "1") { /* keep auto */ }
                }
                actualizarPreviewAgrupacionUI_();
            });
            el.addEventListener("change", actualizarPreviewAgrupacionUI_);
        });
        var nGruposEl = document.getElementById("ag-n-grupos");
        if (nGruposEl && !nGruposEl._slAgWired) {
            nGruposEl._slAgWired = true;
            nGruposEl.addEventListener("input", function () {
                nGruposEl.dataset.userSet = "1";
                var ag = agPorId_(slAgrupEditId);
                if (ag) ag.nGrupos = Math.floor(num_(nGruposEl.value, 0));
                actualizarPreviewAgrupacionUI_();
            });
            nGruposEl.addEventListener("change", function () {
                nGruposEl.dataset.userSet = "1";
                actualizarPreviewAgrupacionUI_();
            });
        }
        ["ag-mw", "ag-md", "ag-mh"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || el._slAgWired) return;
            el._slAgWired = true;
            el.addEventListener("input", function () {
                el.dataset.touched = "1";
                actualizarPreviewAgrupacionUI_();
            });
        });
    }

    function setModoVista_(modo) {
        if (typeof setSlVista3dMode === "function") setSlVista3dMode(modo);
        else if (typeof slVista3dMode !== "undefined") slVista3dMode = modo;
    }

    function getModoVista_() {
        if (typeof getSlVista3dMode === "function") return getSlVista3dMode();
        return (typeof slVista3dMode !== "undefined" ? slVista3dMode : "contenedor");
    }

    function mostrarVistaModulo_() {
        var esc = slEscenarios[slEscActivo];
        var items = (esc && esc.listaEmpaque) || (typeof listaEmpaque !== "undefined" ? listaEmpaque : []) || [];
        var mods = modulosDesdeLista_(items);
        setModoVista_("modulo");
        if (typeof slModulosPreview !== "undefined") slModulosPreview = mods;
        if (!mods.length) {
            pintarListaModulos_();
            actualizarSwitchVistaUI_();
            toast_("No hay piezas para mostrar. Trae desde Logística o agrega ítems.");
            return false;
        }
        if (typeof construirEscenaModulo3D === "function") construirEscenaModulo3D(mods);
        else if (typeof setVista3dModo === "function") setVista3dModo("modulo");
        pintarListaModulos_();
        actualizarSwitchVistaUI_();
        return true;
    }

    function mostrarVistaContenedor_() {
        setModoVista_("contenedor");
        if (typeof ocultarCotasModulo_ === "function") ocultarCotasModulo_();
        if (typeof construirEscena3D === "function") construirEscena3D();
        pintarListaModulos_();
        actualizarSwitchVistaUI_();
    }

    function actualizarSwitchVistaUI_() {
        var modo = getModoVista_() || "contenedor";
        var btnM = document.getElementById("slVistaModulo");
        var btnC = document.getElementById("slVistaContenedor");
        if (btnM) btnM.classList.toggle("active", modo === "modulo");
        if (btnC) btnC.classList.toggle("active", modo === "contenedor");
        var panel = document.getElementById("slPanelListaModulos");
        if (panel) panel.classList.toggle("is-vista-modulo", modo === "modulo");
    }
    window.actualizarSwitchVistaUI = actualizarSwitchVistaUI_;

    /** Paso intermedio: cajas → master / pallet custom / huacal (prioridad manipulación). */
    function modularizarCarga_(opts) {
        opts = opts || {};
        if (!slEscenarios.length) {
            if (!opts.silencioso) toast_("No hay escenarios. Trae primero desde Logística.");
            return false;
        }
        guardarEscenarioActivo_();
        var n = 0;
        slEscenarios.forEach(function (esc) {
            var crudas = esc.cajasCrudas;
            if (!crudas || !crudas.length) {
                crudas = (esc.listaEmpaque || []).filter(function (it) {
                    return !it.slMeta || it.slMeta.cruda || it.slMeta.unidad === "caja";
                });
            }
            if (!crudas.length) return;
            esc.cajasCrudas = JSON.parse(JSON.stringify(crudas));
            esc.listaEmpaque = desconsolidarParaTecho_(
                modularizarItems_(crudas, esc.logEscId),
                "40hc",
                0
            );
            esc.instanciasCajas = [];
            var nHc = estimarNCont40hc_(esc.listaEmpaque);
            esc.contenedoresFisicos = [];
            if (typeof crearContenedor === "function") {
                for (var hi = 0; hi < nHc; hi++) esc.contenedoresFisicos.push(crearContenedor("40hc"));
            }
            esc.modularizado = true;
            n++;
        });
        if (!n) {
            if (!opts.silencioso) toast_("No hay cajas para modular. Trae de nuevo desde Logística.");
            return false;
        }
        var ribbonM = document.getElementById("ribbon-cont-type");
        if (ribbonM) ribbonM.value = "40hc";
        activarEscenario_(slEscActivo);
        pintarTabsEscenarios_();
        actualizarNombreLoadUI_();
        pintarListaModulos_();
        setModoVista_("contenedor");
        if (typeof window.optimizarCarga === "function") {
            try { window.optimizarCarga(); } catch (eM) { /* noop */ }
        }
        if (!opts.silencioso) {
            var escA = slEscenarios[slEscActivo];
            var nSug = (escA.contenedoresFisicos || []).length || estimarNCont40hc_(escA.listaEmpaque);
            toast_("Carga modularizada → " + nSug + "×40HC. Simulación 3D actualizada.");
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
                delete st.sim3dImg;
            } else {
                env.contenedores = mix;
                env.contenedoresManual = true;
                env.sim3d = { m3: met.m3, kg: met.kg, ocupacionPct: met.ocupacionPct, nota: nota };
                delete env.sim3dImg;
            }
        });

        if (typeof window.slPersistirEnEnv === "function") window.slPersistirEnEnv();
        if (typeof logMarcarSucio_ === "function") logMarcarSucio_();
        if (typeof logisticaPintarEnv_ === "function") logisticaPintarEnv_(true);
        if (typeof logisticaPintarFilas_ === "function") logisticaPintarFilas_();
        if (typeof logisticaActualizarVista === "function") logisticaActualizarVista();
        toast_("Envío actualizado con el mix del Simulador 3D (ocupación / m³ / kg).");
    }

    /**
     * Captura la vista ACTUAL del simulador (cámara/zoom del usuario) + faja legible.
     * Idioma = cotización; omite kg si es 0; sin ejes de transform.
     */
    function capturarVistaDiagramatica_(esc) {
        esc = esc || slEscenarios[slEscActivo] || {};
        if (!renderer || !renderer.domElement) return "";
        try {
            setModoVista_("contenedor");
            if (typeof ocultarCotasModulo_ === "function") ocultarCotasModulo_();
            var tcAttached = null;
            if (typeof transformControls !== "undefined" && transformControls) {
                try {
                    tcAttached = transformControls.object || null;
                    transformControls.detach();
                    if (transformControls.visible != null) transformControls.visible = false;
                } catch (eTc) { /* noop */ }
            }
            if (typeof renderer.render === "function" && scene && camera) renderer.render(scene, camera);
            var gl = renderer.domElement;
            /* Captura liviana; franja negra con tipografía grande (legible en PDF). */
            var w = 960;
            var bandH = 110;
            var drawH = 520;
            var h = drawH + bandH;
            var c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            var ctx = c.getContext("2d");
            ctx.fillStyle = "#e8edf4";
            ctx.fillRect(0, 0, w, h);
            var pad = 6;
            ctx.drawImage(gl, 0, 0, gl.width || 800, gl.height || 500, pad, pad, w - pad * 2, drawH - pad * 2);
            if (tcAttached && transformControls) {
                try { transformControls.attach(tcAttached); transformControls.visible = true; } catch (eRe) { /* noop */ }
            }
            var idioma = idiomaCotizacion_();
            var en = idioma === "en";
            var mix = mixDesdeContenedores_(esc.contenedoresFisicos || contenedoresFisicos);
            var mixTxt = (typeof logContenedoresTexto_ === "function") ? logContenedoresTexto_(mix) : "";
            var met = metricasDesdeContenedores_(esc.contenedoresFisicos || contenedoresFisicos);
            var units = resumenUnidades_(esc.listaEmpaque || listaEmpaque, idioma);
            var tit = String(esc.nombre || (en ? "3D load simulation" : "Simulación 3D")).slice(0, 56);
            ctx.fillStyle = "#0b1220";
            ctx.fillRect(0, drawH, w, bandH);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 28px Segoe UI, Arial, sans-serif";
            ctx.fillText(tit, 20, drawH + 36);
            ctx.font = "bold 20px Segoe UI, Arial, sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText([mixTxt, units].filter(Boolean).join(en ? "  ·  " : "   ·   ").slice(0, 88), 20, drawH + 66);
            var metParts = [
                (en ? "Occupancy " : "Ocupación ") + met.ocupacionPct + "% vol",
                met.m3 + " m³"
            ];
            if (met.kg > 0) metParts.push(met.kg + " kg");
            ctx.font = "bold 18px Segoe UI, Arial, sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(metParts.join(en ? "  ·  " : "   ·   "), 20, drawH + 94);
            ctx.fillStyle = "#dbe7f6";
            ctx.font = "bold 14px Segoe UI, Arial, sans-serif";
            var brand = "GRUPO DIFORMA — SmartBudget";
            ctx.fillText(brand, w - ctx.measureText(brand).width - 20, drawH + 94);
            var url = c.toDataURL("image/jpeg", 0.55);
            if (url.length > 140000) {
                try { url = c.toDataURL("image/jpeg", 0.42); } catch (eQ) { /* keep 0.55 */ }
            }
            return url;
        } catch (e) {
            try { return renderer.domElement.toDataURL("image/jpeg", 0.5); } catch (e2) { return ""; }
        }
    }

    function capturarVista_(esc) {
        esc = esc || slEscenarios[slEscActivo] || {};
        var url = capturarVistaDiagramatica_(esc);
        if (!url) return;
        var key = esc.logEscId || esc.id || "base";
        slPdfCaptures[key] = url;
        window._slPdfCaptures = slPdfCaptures;
        var idioma = idiomaCotizacion_();
        var en = idioma === "en";
        var met = metricasDesdeContenedores_(esc.contenedoresFisicos || []);
        var units = resumenUnidades_(esc.listaEmpaque || listaEmpaque, idioma);
        var notaParts = [
            (en ? "3D simulator" : "Simulador 3D") + ": " + met.ocupacionPct + "%",
            met.m3 + " m³",
            units
        ];
        if (met.kg > 0) notaParts.splice(2, 0, met.kg + " kg");
        var nota = notaParts.join(" · ");
        if (typeof logEnv_ === "function") {
            var env = logEnv_();
            if (esc.logEscId) {
                if (!env.porEsc) env.porEsc = {};
                if (!env.porEsc[esc.logEscId]) env.porEsc[esc.logEscId] = {};
                env.porEsc[esc.logEscId].sim3dImg = url;
                env.porEsc[esc.logEscId].sim3d = {
                    m3: met.m3, kg: met.kg, ocupacionPct: met.ocupacionPct, nota: nota
                };
            } else {
                env.sim3dImg = url;
                env.sim3d = { m3: met.m3, kg: met.kg, ocupacionPct: met.ocupacionPct, nota: nota };
            }
        }
    }

    /** Foto → PDF desconectada: el Simulador no escribe capturas en la cotización. */
    function agregarVista3dPdf_(idx) {
        void idx;
        toast_("El Simulador 3D no envía fotos al PDF. Usa Traer → Optimizar → Aplicar a Logística.");
    }

    window.slPdfCapturesParaHoja = function () {
        return Object.assign({}, window._slPdfCaptures || slPdfCaptures);
    };

    /** Tras subir a Drive: quita el data URL de memoria para no re-embeberlo. */
    window.slLimpiarCaptura = function (key) {
        if (!key) return;
        delete slPdfCaptures[key];
        if (window._slPdfCaptures) delete window._slPdfCaptures[key];
    };

    window.slExportarEstado = function () {
        guardarEscenarioActivo_();
        return {
            v: 1,
            activo: slEscActivo,
            escenarios: slEscenarios.map(function (e) {
                return {
                    id: e.id,
                    nombre: e.nombre,
                    logEscId: e.logEscId,
                    cajasCrudas: e.cajasCrudas,
                    listaEmpaque: e.listaEmpaque,
                    instanciasCajas: e.instanciasCajas,
                    contenedoresFisicos: e.contenedoresFisicos,
                    mixSugerido: e.mixSugerido,
                    modularizado: !!e.modularizado,
                    agrupaciones: e.agrupaciones || [],
                    loadLetra: e.loadLetra || "C",
                    loadVer: e.loadVer || "V1"
                };
            }),
            captures: Object.assign({}, slPdfCaptures)
        };
    };

    window.slImportarEstado = function (st) {
        if (!st || !Array.isArray(st.escenarios) || !st.escenarios.length) return false;
        slEscenarios = st.escenarios.map(function (e) {
            var conts = e.contenedoresFisicos || [];
            var insts = e.instanciasCajas || [];
            reinyectarCajasEnContenedores_(conts, insts);
            return {
                id: e.id || e.logEscId || "base",
                nombre: e.nombre || "Opción",
                logEscId: e.logEscId || "",
                cajasCrudas: e.cajasCrudas || [],
                listaEmpaque: e.listaEmpaque || [],
                instanciasCajas: insts,
                contenedoresFisicos: conts,
                mixSugerido: e.mixSugerido || { c20: 0, c40: 0, c40hc: 0 },
                modularizado: !!e.modularizado,
                agrupaciones: e.agrupaciones || [],
                loadLetra: e.loadLetra || "C",
                loadVer: e.loadVer || "V1"
            };
        });
        slPdfCaptures = Object.assign({}, st.captures || {});
        window._slPdfCaptures = slPdfCaptures;
        if (slInited) {
            slEscActivo = -1;
            var ix = Math.max(0, Math.min(st.activo || 0, slEscenarios.length - 1));
            activarEscenario_(ix);
            pintarTabsEscenarios_();
            actualizarNombreLoadUI_();
        } else {
            slEscActivo = Math.max(0, Math.min(st.activo || 0, slEscenarios.length - 1));
        }
        return true;
    };

    window.slPersistirEnEnv = function () {
        guardarEscenarioActivo_();
        if (typeof logEnv_ !== "function") return;
        var env = logEnv_();
        if (!env.porEsc) env.porEsc = {};
        /* Bundle único en memoria; al guardar se compacta y (si es grande) va a Drive. */
        env.sim3dBundle = typeof window.slExportarEstado === "function" ? window.slExportarEstado() : null;
        delete env.sim3dState;
        Object.keys(env.porEsc).forEach(function (k) {
            if (env.porEsc[k]) delete env.porEsc[k].sim3dState;
        });
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
            var env0 = typeof logEnv_ === "function" ? logEnv_() : null;
            var restored = false;
            if (env0 && env0.sim3dBundle && typeof window.slImportarEstado === "function") {
                restored = !!window.slImportarEstado(env0.sim3dBundle);
            }
            if (!restored && (!slEscenarios.length || !(slEscenarios[0].listaEmpaque || []).length)) {
                traerDesdeLogistica_({ silencioso: true });
            }
            resizeViewer_();
            pintarTabsEscenarios_();
            actualizarNombreLoadUI_();
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
        var inpFn = document.getElementById("save-filename");
        if (inpFn) {
            inpFn.addEventListener("input", function () { inpFn.dataset.slUserEdit = "1"; });
        }
        wireAgrupacionModal_();
        if (typeof window.optimizarCarga === "function" && !window._slOptWrapped) {
            var _optOrig = window.optimizarCarga;
            window.optimizarCarga = function () {
                setModoVista_("contenedor");
                if (typeof ocultarCotasModulo_ === "function") ocultarCotasModulo_();
                /* Respeta contenedores de la opción (Envío): no fuerza 40HC. */
                var escAct = slEscenarios[slEscActivo];
                if (escAct && escAct.contenedoresFisicos && escAct.contenedoresFisicos.length && typeof crearContenedor === "function") {
                    contenedoresFisicos = escAct.contenedoresFisicos.map(function (c) {
                        var nuevo = crearContenedor(c.tipoKey || "40ft");
                        if (c.w) {
                            nuevo.w = c.w; nuevo.h = c.h; nuevo.d = c.d;
                            nuevo.maxWeight = c.maxWeight; nuevo.maxVol = c.maxVol; nuevo.nombre = c.nombre;
                        }
                        return nuevo;
                    });
                    var ribbon = document.getElementById("ribbon-cont-type");
                    if (ribbon && contenedoresFisicos[0]) ribbon.value = contenedoresFisicos[0].tipoKey || ribbon.value;
                }
                pintarListaModulos_();
                var ret = _optOrig.apply(this, arguments);
                return ret;
            };
            window._slOptWrapped = true;
        }
        window.slAfterOptimizar = function () {
            guardarEscenarioActivo_();
            actualizarResumenAgrupLive_();
        };
        window.slRebuildModulosPreview = function () {
            setModoVista_("contenedor");
            if (typeof construirEscena3D === "function") construirEscena3D();
            actualizarResumenAgrupLive_();
        };
        if (btnAplicar) btnAplicar.addEventListener("click", aplicarALogistica_);
        var tabs = document.getElementById("slEscenariosTabs");
        if (tabs) {
            tabs.addEventListener("click", function (ev) {
                var b = ev.target.closest("[data-sl-esc]");
                if (!b) return;
                activarEscenario_(Number(b.getAttribute("data-sl-esc")));
                actualizarNombreLoadUI_();
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
        setVal("sim3dMaxCapas", cfg.maxCapasPallet != null ? cfg.maxCapasPallet : 3);
        setVal("sim3dMaxLadoPal", cfg.maxLadoPalletCustom != null ? cfg.maxLadoPalletCustom : 160);
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
                maxLadoCm: getN("sim3dUmbralCm", 200),
                pesoKg: getN("sim3dUmbralKg", 120)
            },
            huacal: {
                holguraCm: getN("sim3dHolgura", 5),
                onFloor: true,
                noTilt: true
            },
            deckH: getN("sim3dDeckH", 14.4),
            maxCapasPallet: Math.max(1, Math.floor(getN("sim3dMaxCapas", 3))),
            maxLadoPalletCustom: Math.max(40, getN("sim3dMaxLadoPal", 160)),
            mercadoPallet: {
                EU: getSel("sim3dPalletEU", "EUR"),
                US: getSel("sim3dPalletUS", "GMA"),
                default: getSel("sim3dPalletDef", "ISO1")
            },
            autoPaletizarFcl: getChk("sim3dAutoFcl", false),
            autoPaletizarLcl: getChk("sim3dAutoLcl", false),
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
    window.slModularizarCarga = modularizarCarga_;
    window.slAplicarALogistica = aplicarALogistica_;
    window.slEnsureInit = ensureInit_;
    window.slCapacidadFcl = function (cajaCm, pesoKg) {
        var cfg = slSim3dCfg_();
        var box = { w: num_(cajaCm.w), d: num_(cajaCm.d), h: num_(cajaCm.h) };
        return contsFcl_().map(function (c) {
            return capacidadDosPisos_(box, num_(pesoKg, 0), cfg, c);
        }).filter(Boolean);
    };
})();
