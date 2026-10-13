// Usamos var para que la variable sea accesible globalmente por los otros archivos
var CONFIG_GLOBAL = null;
var _umsDesdeMaestro = [];
var UMS_MATRIZ_MIN = ["UND", "m2", "Juego"];
var UMS_CATALOGO_BASE = ["Unidades", "UND", "Metros", "kg", "Hojas", "m2", "Litros", "Juego", "LAMINA", "ROLLO", "Rollox50mts", "—"];
var UMS_MATRIZ_DEFAULT = [
    { um: "UND", um_catalogo: "Unidades", factor: 1, regla: "1 UND = 1 pieza en Odoo (Unidades). Perfiles/tubos: 1 UND = tira de 6 m → cantidad = ceil(metros×1,10/6). Láminas: 1 UND = 1 placa, nunca Hojas." },
    { um: "Metros", um_catalogo: "Metros", factor: 1, regla: "1 = 1 metro lineal. cantidad = metros + merma." },
    { um: "kg", um_catalogo: "kg", factor: 1, regla: "1 = 1 kilogramo." },
    { um: "m2", um_catalogo: "m2", factor: 1, regla: "Precio por m² (pintura, impresión, área). Si el maestro vende la lámina en UND, no cambies la UM: calcula cuántas placas salen del m² requerido." },
    { um: "Juego", um_catalogo: "Unidades", factor: 1, regla: "1 Juego = 1 kit. Odoo lo compra en Unidades." },
    { um: "Cml", um_catalogo: "Metros", factor: 0.01, regla: "1 Cml = 1 cm lineal de corte (mesa/router). 100 Cml = 1 Metro." }
];

function registrarUmsMaestro(ums) {
    if (Array.isArray(ums) && ums.length) _umsDesdeMaestro = ums.slice();
}

function reglaDefaultUm(codigo) {
    const hit = UMS_MATRIZ_DEFAULT.find(function (u) { return u.um.toLowerCase() === String(codigo || "").toLowerCase(); });
    return hit ? Object.assign({}, hit) : null;
}

function normalizarUnidadMatriz(t) {
    if (!t) return null;
    const um = String(t.um || t.codigo || "").trim();
    if (!um) return null;
    const def = reglaDefaultUm(um);
    const factorN = t.factor != null && t.factor !== "" ? Number(t.factor) : (def ? def.factor : 1);
    return {
        um: um,
        um_catalogo: String(t.um_catalogo || t.equivale || (def && def.um_catalogo) || "—").trim() || "—",
        factor: isNaN(factorN) ? 1 : factorN,
        regla: String(t.regla || t.conversion || (def && def.regla) || "").trim()
    };
}

function parseUnidadesMatriz(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(normalizarUnidadMatriz).filter(Boolean);
    const s = String(raw).trim();
    if (!s) return [];
    if (s.charAt(0) === "[") {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) {
                if (parsed.length && typeof parsed[0] === "string") {
                    return parsed.map(function (u) { return normalizarUnidadMatriz({ um: u }); }).filter(Boolean);
                }
                return parsed.map(normalizarUnidadMatriz).filter(Boolean);
            }
        } catch (e) {}
    }
    return s.split(/\r?\n|\\n/).map(function (line) {
        return normalizarUnidadMatriz({ um: line.trim() });
    }).filter(Boolean);
}

function leerUnidadesMatrizUI() {
    const filas = [];
    document.querySelectorAll("#unidadesMatrizBody tr").forEach(function (tr) {
        const t = normalizarUnidadMatriz({
            um: tr.querySelector('[data-um="um"]')?.value,
            um_catalogo: tr.querySelector('[data-um="cat"]')?.value,
            factor: tr.querySelector('[data-um="factor"]')?.value,
            regla: tr.querySelector('[data-um="regla"]')?.value
        });
        if (t) filas.push(t);
    });
    return filas;
}

function listaUnidadesMatriz() {
    const live = document.getElementById("unidadesMatrizBody");
    if (live && live.querySelector("tr")) return leerUnidadesMatrizUI();
    const parsed = parseUnidadesMatriz((CONFIG_GLOBAL && CONFIG_GLOBAL.unidades) || "");
    return parsed.length ? parsed : UMS_MATRIZ_DEFAULT.slice();
}

function listaUnidadesUI() {
    const fromTabla = listaUnidadesMatriz().map(function (u) { return u.um; });
    const seen = {};
    const out = [];
    fromTabla.concat(_umsDesdeMaestro).concat(UMS_MATRIZ_MIN).forEach(function (u) {
        const k = String(u || "").trim();
        if (!k || seen[k.toLowerCase()]) return;
        seen[k.toLowerCase()] = true;
        out.push(k);
    });
    return out;
}

function opcionesUmCatalogoHtml(sel) {
    const list = [];
    const seen = {};
    UMS_CATALOGO_BASE.concat(_umsDesdeMaestro).forEach(function (u) {
        const k = String(u || "").trim();
        if (!k || seen[k.toLowerCase()]) return;
        seen[k.toLowerCase()] = true;
        list.push(k);
    });
    let cur = String(sel || "—").trim();
    if (cur && !list.some(function (u) { return u === cur; })) list.unshift(cur);
    return list.map(function (u) {
        return '<option value="' + escHtml(u) + '"' + (u === cur ? " selected" : "") + '>' + escHtml(u) + "</option>";
    }).join("");
}

function filaUnidadMatrizHtml(t) {
    t = t || { um: "", um_catalogo: "—", factor: 1, regla: "" };
    return '<tr>' +
        '<td><input class="form-control form-control-sm" data-um="um" spellcheck="false" value="' + escHtml(t.um) + '" onchange="refrescarSelectsUmTarifas()"></td>' +
        '<td><select class="form-select form-select-sm" data-um="cat">' + opcionesUmCatalogoHtml(t.um_catalogo) + '</select></td>' +
        '<td><input type="number" step="any" class="form-control form-control-sm" data-um="factor" value="' + escHtml(t.factor) + '" title="1 UM matriz = N UM catálogo"></td>' +
        '<td><input class="form-control form-control-sm" data-um="regla" value="' + escHtml(t.regla) + '"></td>' +
        '<td class="admin-row-actions"><button type="button" class="admin-icon-btn" title="Quitar" onclick="quitarUnidadMatrizUI(this)"><i class="bi bi-trash3"></i></button></td></tr>';
}

function pintarTablaUnidadesMatriz() {
    const tbody = document.getElementById("unidadesMatrizBody");
    if (!tbody) return;
    let rows = parseUnidadesMatriz(document.getElementById("cfgUnidades")?.value || (CONFIG_GLOBAL && CONFIG_GLOBAL.unidades));
    if (!rows.length) rows = UMS_MATRIZ_DEFAULT.slice();
    tbody.innerHTML = rows.map(filaUnidadMatrizHtml).join("");
}

function agregarUnidadMatrizUI() {
    const tbody = document.getElementById("unidadesMatrizBody");
    if (!tbody) return;
    tbody.insertAdjacentHTML("beforeend", filaUnidadMatrizHtml({ um: "", um_catalogo: "—", factor: 1, regla: "" }));
}

function quitarUnidadMatrizUI(btn) {
    btn.closest("tr")?.remove();
    refrescarSelectsUmTarifas();
}

function refrescarSelectsUmTarifas() {
    document.querySelectorAll('#tarifasFijasBody select[data-tf="um"]').forEach(function (sel) {
        const cur = sel.value;
        sel.innerHTML = opcionesUmHtml(cur);
        sel.value = cur;
    });
}

function unidadesParaPrompt() {
    return listaUnidadesMatriz().map(function (u) {
        return u.um + " = " + u.factor + " × " + u.um_catalogo + (u.regla ? ". " + u.regla : "");
    }).join("\n");
}

function opcionesUmHtml(sel) {
    const list = listaUnidadesUI().slice();
    let cur = String(sel || "UND").trim();
    if (cur && !list.some(function (u) { return u === cur; })) list.unshift(cur);
    return list.map(function (u) {
        return '<option value="' + escHtml(u) + '"' + (u === cur ? " selected" : "") + '>' + escHtml(u) + "</option>";
    }).join("");
}

function canonUmTarifa(raw) {
    const t = String(raw || "").trim();
    if (/^unidades?$/i.test(t) || /^und$/i.test(t)) return "UND";
    if (/^m2$|^m²$/i.test(t) || /metro\s*cuadrad/i.test(t)) return "m2";
    const list = listaUnidadesUI();
    const hit = list.find(function (u) { return u.toLowerCase() === t.toLowerCase(); });
    return hit || t || "UND";
}

function normalizarTarifaFija(t) {
    if (!t) return null;
    const nombre = String(t.nombre || t.concepto || "").trim();
    if (!nombre) return null;
    return {
        nombre: nombre,
        um: canonUmTarifa(t.um),
        costo: Number(t.costo != null ? t.costo : t.costo_cop) || 0,
        es_global: t.es_global === true || t.es_global === "S" || t.es_global === "true"
    };
}

function parseTarifasFijas(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(normalizarTarifaFija).filter(Boolean);
    const s = String(raw).trim();
    if (!s) return [];
    if (s.charAt(0) === "[") {
        try { return JSON.parse(s).map(normalizarTarifaFija).filter(Boolean); } catch (e) {}
    }
    return s.split(/\r?\n/).map(function (line) {
        const parts = line.split(":").map(function (x) { return x.trim(); }).filter(Boolean);
        if (parts.length >= 3) {
            return normalizarTarifaFija({ nombre: parts.slice(0, -2).join(": "), costo: parts[parts.length - 2], um: parts[parts.length - 1] });
        }
        if (parts.length === 2) {
            return normalizarTarifaFija({ nombre: parts[0], costo: parts[1], um: /m2/i.test(parts[0]) ? "m2" : "UND" });
        }
        return null;
    }).filter(Boolean);
}

function listaTarifasFijas() {
    return parseTarifasFijas(CONFIG_GLOBAL && CONFIG_GLOBAL.tarifasFijas);
}

function leerTarifasFijasUI() {
    const filas = [];
    document.querySelectorAll("#tarifasFijasBody tr").forEach(function (tr) {
        const t = normalizarTarifaFija({
            nombre: tr.querySelector('[data-tf="nombre"]')?.value,
            um: tr.querySelector('[data-tf="um"]')?.value,
            costo: tr.querySelector('[data-tf="costo"]')?.value,
            es_global: tr.querySelector('[data-tf="global"]')?.checked
        });
        if (t) filas.push(t);
    });
    return filas;
}

function pintarTablaTarifasFijas() {
    const tbody = document.getElementById("tarifasFijasBody");
    if (!tbody) return;
    let rows = parseTarifasFijas(document.getElementById("cfgTarifas")?.value || (CONFIG_GLOBAL && CONFIG_GLOBAL.tarifasFijas));
    if (!rows.length) {
        rows = [
            { nombre: "Impresión Digital Vinilo", um: "m2", costo: 25000, es_global: false },
            { nombre: "Servicio de Router CNC (Corte Poliestireno/Acrílico)", um: "UND", costo: 15000, es_global: false },
            { nombre: "Buje pivotante o herrajes pequeños de articulación", um: "UND", costo: 25000, es_global: false },
            { nombre: "Transporte Local / Entregas", um: "UND", costo: 15000, es_global: true },
            { nombre: "Pintura Electrostática (desarrollo)", um: "m2", costo: 18000, es_global: false }
        ];
    }
    tbody.innerHTML = rows.map(function (t, i) {
        return '<tr data-tf-i="' + i + '">' +
            '<td><input class="form-control form-control-sm" data-tf="nombre" value="' + escHtml(t.nombre) + '"></td>' +
            '<td><select class="form-select form-select-sm" data-tf="um">' + opcionesUmHtml(t.um) + '</select></td>' +
            '<td><input type="number" class="form-control form-control-sm" data-tf="costo" value="' + escHtml(t.costo) + '"></td>' +
            '<td class="text-center"><input type="checkbox" class="form-check-input" data-tf="global"' + (t.es_global ? " checked" : "") + '></td>' +
            '<td class="admin-row-actions"><button type="button" class="admin-icon-btn" title="Quitar" onclick="quitarTarifaFijaUI(this)"><i class="bi bi-trash3"></i></button></td></tr>';
    }).join("");
}

function agregarTarifaFijaUI() {
    const tbody = document.getElementById("tarifasFijasBody");
    if (!tbody) return;
    tbody.insertAdjacentHTML("beforeend",
        '<tr><td><input class="form-control form-control-sm" data-tf="nombre" placeholder="Concepto"></td>' +
        '<td><select class="form-select form-select-sm" data-tf="um">' + opcionesUmHtml("UND") + '</select></td>' +
        '<td><input type="number" class="form-control form-control-sm" data-tf="costo" value="0"></td>' +
        '<td class="text-center"><input type="checkbox" class="form-check-input" data-tf="global"></td>' +
        '<td class="admin-row-actions"><button type="button" class="admin-icon-btn" title="Quitar" onclick="quitarTarifaFijaUI(this)"><i class="bi bi-trash3"></i></button></td></tr>');
}

function quitarTarifaFijaUI(btn) {
    btn.closest("tr")?.remove();
}

function normalizarComision(t) {
    if (!t) return null;
    const nombre = String(t.nombre || "").trim();
    if (!nombre) return null;
    const pct = Number(t.pct != null ? t.pct : t.porcentaje);
    return { nombre: nombre, pct: isNaN(pct) ? 0 : pct };
}

function parseComisiones(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(normalizarComision).filter(Boolean);
    const s = String(raw).trim();
    if (!s) return [];
    if (s.charAt(0) === "[") {
        try { return JSON.parse(s).map(normalizarComision).filter(Boolean); } catch (e) {}
    }
    return s.split(/\r?\n/).map(function (line) {
        const i = line.lastIndexOf(":");
        if (i < 0) return null;
        return normalizarComision({ nombre: line.slice(0, i).trim(), pct: line.slice(i + 1).trim() });
    }).filter(Boolean);
}

function listaComisiones() {
    const live = document.getElementById("comisionesBody");
    if (live && live.querySelector("tr")) return leerComisionesUI();
    return parseComisiones(CONFIG_GLOBAL && CONFIG_GLOBAL.comisiones);
}

function leerComisionesUI() {
    const filas = [];
    document.querySelectorAll("#comisionesBody tr").forEach(function (tr) {
        const t = normalizarComision({
            nombre: tr.querySelector('[data-co="nombre"]')?.value,
            pct: tr.querySelector('[data-co="pct"]')?.value
        });
        if (t) filas.push(t);
    });
    return filas;
}

function filaComisionHtml(t) {
    t = t || { nombre: "", pct: 0 };
    return '<tr>' +
        '<td class="text-center"><i class="bi bi-grip-vertical drag-handle" title="Arrastrar para ordenar"></i></td>' +
        '<td><input class="form-control form-control-sm" data-co="nombre" value="' + escHtml(t.nombre) + '"></td>' +
        '<td><input type="number" step="0.1" class="form-control form-control-sm" data-co="pct" value="' + escHtml(t.pct) + '"></td>' +
        '<td class="admin-row-actions"><button type="button" class="admin-icon-btn" title="Quitar" onclick="quitarComisionUI(this)"><i class="bi bi-trash3"></i></button></td></tr>';
}

var _sortableComisiones = null;
function pintarTablaComisiones() {
    const tbody = document.getElementById("comisionesBody");
    if (!tbody) return;
    let rows = parseComisiones(document.getElementById("cfgComisiones")?.value || (CONFIG_GLOBAL && CONFIG_GLOBAL.comisiones));
    if (!rows.length) {
        rows = [
            { nombre: "Ejecutiva Estándar", pct: 3 },
            { nombre: "Ejecutiva Senior", pct: 5 },
            { nombre: "Sin Comisión", pct: 0 }
        ];
    }
    tbody.innerHTML = rows.map(filaComisionHtml).join("");
    if (typeof Sortable !== "undefined") {
        if (_sortableComisiones) _sortableComisiones.destroy();
        _sortableComisiones = Sortable.create(tbody, {
            handle: ".drag-handle",
            animation: 150,
            onEnd: function () { poblarSelectComisiones(leerComisionesUI()); }
        });
    }
}

function agregarComisionUI() {
    const tbody = document.getElementById("comisionesBody");
    if (!tbody) return;
    tbody.insertAdjacentHTML("beforeend", filaComisionHtml({ nombre: "", pct: 0 }));
}

function quitarComisionUI(btn) {
    btn.closest("tr")?.remove();
}

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
        const token = localStorage.getItem("smartbudget_token");
        if (token && CONFIG_GLOBAL.gasUrl && typeof realizarPeticionBD === "function") {
            try {
                const est = await realizarPeticionBD({ action: "catalogo_estado" });
                if (est && est.exito && est.data) registrarUmsMaestro(est.data.ums);
            } catch (eUms) {}
            if (typeof window.refrescarUsoGemini === "function") window.refrescarUsoGemini();
        }
        return CONFIG_GLOBAL;
    } catch (err) { console.error("Error cargando config:", err); }
}

function abrirModalAdmin() {
    if(!CONFIG_GLOBAL) return;
    const d = CONFIG_GLOBAL;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || (val===0?0:''); };
    
    setVal('cfgGasUrl', d.gasUrl);
    setVal('cfgTarifas', typeof d.tarifasFijas === 'string' ? d.tarifasFijas : JSON.stringify(d.tarifasFijas || []));
    setVal('cfgUnidades', typeof d.unidades === 'string' ? d.unidades : JSON.stringify(d.unidades || []));
    setVal('cfgDiasVigMat', (d.diasVigencia && d.diasVigencia.materiales) != null ? d.diasVigencia.materiales : 180);
    setVal('cfgDiasVigProc', (d.diasVigencia && d.diasVigencia.procesos) != null ? d.diasVigencia.procesos : 90);
    setVal('cfgPrompt', d.promptMaestro); setVal('cfgPromptLogistico', d.promptLogistico);
    setVal('cfgGeminiCupo', d.geminiCupoTokens != null ? d.geminiCupoTokens : 2000000);
    setVal('cfgGeminiCupoUsd', d.geminiCupoUsd != null ? d.geminiCupoUsd : 20);
    setVal('cfgGeminiUsdIn', d.geminiUsdPor1MIn != null ? d.geminiUsdPor1MIn : 1.25);
    setVal('cfgGeminiUsdOut', d.geminiUsdPor1MOut != null ? d.geminiUsdPor1MOut : 10);
    setVal('cfgComisiones', typeof d.comisiones === 'string' ? d.comisiones : JSON.stringify(d.comisiones || []));
    
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
    if (typeof pintarTablaUnidadesMatriz === "function") pintarTablaUnidadesMatriz();
    if (typeof pintarTablaTarifasFijas === "function") pintarTablaTarifasFijas();
    if (typeof pintarTablaComisiones === "function") pintarTablaComisiones();
    const selUm = document.getElementById("catNuevoUm");
    if (selUm) selUm.innerHTML = opcionesUmHtml("UND");
    if (typeof habilitarVentanasFlotantes === "function") habilitarVentanasFlotantes();
    new bootstrap.Modal(document.getElementById('modalAdmin')).show();
    if (typeof refrescarEstadoCatalogo === "function") refrescarEstadoCatalogo();
    if (typeof cargarTablaCatalogo === "function") cargarTablaCatalogo();
    if (typeof window.refrescarEstadoPlantillaExcel === "function") window.refrescarEstadoPlantillaExcel();
}

var _catPoll = null;
var _catBuscarT = null;
var _catOffset = 0;
var _catLimit = 25;
var _catTotal = 0;

function pintarEstadoCatalogo(d) {
    const box = document.getElementById('catalogoEstadoBox');
    const meta = document.getElementById('catalogoMetaLinea');
    const wrap = document.getElementById('catalogoProgressWrap');
    const bar = document.getElementById('catalogoProgressBar');
    const cronBtn = document.getElementById('btnCronCatalogo');
    if (!box) return;
    const running = String(d.estado || "") === "running";
    box.className = running ? "admin-banner is-info mb-3" : "admin-banner is-ok mb-3";
    box.innerText = running
        ? ((d.mensaje || "Sincronizando…") + (d.archivo ? " · " + d.archivo : ""))
        : ("Catalogo_Maestro: " + (d.total || 0) + " filas · vigentes: " + (d.vigentes || 0) + " · por revisar: " + (d.revisar || 0) + (d.mensaje && !running ? " · " + d.mensaje : ""));
    if (meta) {
        var odooOff = Number(d.odoo_offset) || 0;
        var odooTot = Number(d.odoo_total) || 0;
        var odooLote = Number(d.odoo_lote) || 80;
        var odooTxt = "";
        if (d.odoo_full) {
            odooTxt = " · Odoo: barrido inicial hecho · el próximo clic solo trae cambios" + (d.odoo_last ? " · cambios desde " + d.odoo_last : "");
        } else if (odooTot) {
            var lotes = Math.max(1, Math.ceil(odooTot / odooLote));
            var hecho = Math.min(lotes, Math.floor(odooOff / odooLote));
            var faltan = Math.max(0, lotes - Math.max(hecho, 1));
            odooTxt = " · Odoo inicial: " + odooOff + "/" + odooTot + " (faltan " + faltan + " clic" + (faltan === 1 ? "" : "s") + ")";
        }
        meta.innerText = "Última sync: " + (d.ultima_sync || "aún no hay registro") +
            (d.ultima_por ? " · " + d.ultima_por : "") +
            (d.cron7d ? " · auto cada 7 días: activa" : " · auto cada 7 días: no activada") +
            odooTxt +
            (d.errores ? " · errores: " + d.errores : "");
    }
    if (wrap && bar) {
        wrap.hidden = !running;
        const tot = Number(d.totalArchivos) || 0;
        const idx = Number(d.indice) || 0;
        bar.style.width = (running ? Math.max(8, tot ? Math.round(idx / tot * 100) : 15) : 0) + "%";
    }
    if (cronBtn) {
        cronBtn.disabled = false;
        if (d.cron7d) {
            cronBtn.className = "btn admin-btn";
            cronBtn.innerHTML = "Desactivar sync cada 7 días";
            cronBtn.onclick = desactivarCronCatalogoUI;
        } else {
            cronBtn.className = "btn admin-btn";
            cronBtn.innerHTML = "Activar sync cada 7 días";
            cronBtn.onclick = activarCronCatalogoUI;
        }
    }
    const ayu = document.getElementById("catalogoVigAyuda");
    if (ayu && d.dias_vigencia) {
        ayu.innerText = "Vig. S = precio de Odoo dentro de " + d.dias_vigencia.materiales + " días (materiales) o " + d.dias_vigencia.procesos + " días (procesos). Rev. S = costo 0 o fuera de esa ventana. Se recalcula al alimentar Odoo. Guarda configuración para cambiar los días.";
    }
}

async function refrescarEstadoCatalogo() {
    const box = document.getElementById('catalogoEstadoBox');
    if (!box || typeof realizarPeticionBD !== "function") return;
    try {
        const data = await realizarPeticionBD({ action: "catalogo_estado" });
        if (!data.exito) throw new Error(data.mensaje);
        pintarEstadoCatalogo(data.data || {});
        registrarUmsMaestro((data.data || {}).ums);
    } catch (e) {
        box.className = "admin-banner is-warn mb-3";
        box.innerText = "Aún no hay catálogo o falta pegar el backend.gs nuevo en Apps Script. " + e.message;
    }
}

function iniciarPollCatalogo() {
    detenerPollCatalogo();
    _catPoll = setInterval(refrescarEstadoCatalogo, 3000);
}

function detenerPollCatalogo() {
    if (_catPoll) { clearInterval(_catPoll); _catPoll = null; }
}

async function sincronizarCatalogoMaestroUI() {
    const email = localStorage.getItem("smartbudget_email");
    const btn = document.getElementById("btnSyncCatalogo");
    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sincronizando...'; }
    if (typeof mostrarNotificacion === "function") mostrarNotificacion("Recorriendo Drive y actualizando Catalogo_Maestro...", "info");
    iniciarPollCatalogo();
    try {
        const data = await realizarPeticionBD({ action: "catalogo_sincronizar", email: email });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        await refrescarEstadoCatalogo();
        await cargarTablaCatalogo();
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Error sincronizando catálogo: " + e.message, "danger");
    } finally {
        detenerPollCatalogo();
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

async function sincronizarCatalogoOdooUI() {
    const email = localStorage.getItem("smartbudget_email");
    const btn = document.getElementById("btnSyncOdooCatalogo");
    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Odoo...'; }
    if (typeof mostrarNotificacion === "function") mostrarNotificacion("Leyendo productos y compras de Odoo v19…", "info");
    iniciarPollCatalogo();
    try {
        const data = await realizarPeticionBD({ action: "catalogo_sincronizar_odoo", email: email });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        await refrescarEstadoCatalogo();
        await cargarTablaCatalogo();
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Error Odoo: " + e.message, "danger");
    } finally {
        detenerPollCatalogo();
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

async function activarCronCatalogoUI() {
    const email = localStorage.getItem("smartbudget_email");
    try {
        const data = await realizarPeticionBD({ action: "catalogo_activar_cron", email: email });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        await refrescarEstadoCatalogo();
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(e.message, "danger");
    }
}

async function desactivarCronCatalogoUI() {
    const email = localStorage.getItem("smartbudget_email");
    try {
        const data = await realizarPeticionBD({ action: "catalogo_desactivar_cron", email: email });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        await refrescarEstadoCatalogo();
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(e.message, "danger");
    }
}

function programarBusquedaCatalogo() {
    clearTimeout(_catBuscarT);
    _catBuscarT = setTimeout(function () { _catOffset = 0; cargarTablaCatalogo(); }, 400);
}

function aplicarFiltrosCatalogo() {
    _catOffset = 0;
    cargarTablaCatalogo();
}

function llenarSelectFiltroCatalogo(id, values, etiqueta) {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">' + etiqueta + '</option>' +
        (values || []).map(function (v) { return '<option value="' + escHtml(v) + '">' + escHtml(v) + '</option>'; }).join("");
    if (cur) el.value = cur;
}

function paginasVisiblesPager(pagina, totalPaginas) {
    if (totalPaginas < 1) return [1];
    const set = { 1: true };
    set[totalPaginas] = true;
    for (let p = pagina - 1; p <= pagina + 2; p++) {
        if (p >= 1 && p <= totalPaginas) set[p] = true;
    }
    const nums = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    const out = [];
    for (let i = 0; i < nums.length; i++) {
        if (i && nums[i] - nums[i - 1] > 1) out.push("…");
        out.push(nums[i]);
    }
    return out;
}

function pintarPagerCatalogo(cfg) {
    const total = cfg.total || 0;
    const limit = Math.max(1, cfg.limit || 25);
    const offset = cfg.offset || 0;
    const shown = cfg.shown || 0;
    const totalPaginas = Math.max(1, Math.ceil(total / limit) || 1);
    const pagina = total ? Math.min(totalPaginas, Math.floor(offset / limit) + 1) : 1;
    const desde = total ? offset + 1 : 0;
    const hasta = total ? Math.min(offset + shown, total) : 0;
    const info = document.getElementById(cfg.infoId);
    if (info) {
        info.innerText = total
            ? ("Mostrando " + desde.toLocaleString("es-CO") + "–" + hasta.toLocaleString("es-CO") + " de " + total.toLocaleString("es-CO") + " registros")
            : "Mostrando 0 de 0 registros";
    }
    const pageEl = document.getElementById(cfg.pageId);
    if (pageEl) pageEl.innerText = "Página " + pagina.toLocaleString("es-CO") + " de " + totalPaginas.toLocaleString("es-CO");
    const nav = document.getElementById(cfg.navId);
    if (!nav) return;
    const ir = cfg.irFn;
    const btn = function (label, target, extra, disabled) {
        return '<button type="button" class="catalogo-pager-btn' + (extra || "") + '"' +
            (disabled ? " disabled" : ' onclick="' + ir + "(" + target + ')"') + ">" + label + "</button>";
    };
    let html = btn("«", 1, "", pagina <= 1) + btn("&lt;", pagina - 1, "", pagina <= 1);
    paginasVisiblesPager(pagina, totalPaginas).forEach(function (item) {
        if (item === "…") html += '<span class="catalogo-pager-ellipsis">…</span>';
        else html += btn(String(item), item, item === pagina ? " is-current" : "", false);
    });
    html += btn("&gt;", pagina + 1, "", pagina >= totalPaginas) + btn("»", totalPaginas, "", pagina >= totalPaginas);
    nav.innerHTML = html;
}

function irAPaginaCatalogo(pagina) {
    const max = Math.max(1, Math.ceil(_catTotal / _catLimit) || 1);
    pagina = Math.min(max, Math.max(1, Number(pagina) || 1));
    _catOffset = (pagina - 1) * _catLimit;
    cargarTablaCatalogo();
}

function irAPaginaCatalogoConsulta(pagina) {
    const max = Math.max(1, Math.ceil(_catCTotal / _catCLimit) || 1);
    pagina = Math.min(max, Math.max(1, Number(pagina) || 1));
    _catCOffset = (pagina - 1) * _catCLimit;
    cargarTablaCatalogoConsulta();
}

function cambiarTamanoPaginaCatalogo(modo, val) {
    const n = Math.min(100, Math.max(10, Number(val) || 25));
    if (modo === "consulta") { _catCLimit = n; _catCOffset = 0; cargarTablaCatalogoConsulta(); }
    else { _catLimit = n; _catOffset = 0; cargarTablaCatalogo(); }
}

function paginarCatalogo(dir) {
    irAPaginaCatalogo(Math.floor(_catOffset / _catLimit) + 1 + dir);
}

function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
}

async function cargarTablaCatalogo() {
    const tbody = document.getElementById("catalogoTablaBody");
    if (!tbody || typeof realizarPeticionBD !== "function") return;
    const q = document.getElementById("catalogoBuscar")?.value || "";
    try {
        const data = await realizarPeticionBD({
            action: "catalogo_listar",
            q: q,
            categoria: document.getElementById("catFiltroCategoria")?.value || "",
            proveedor: document.getElementById("catFiltroProveedor")?.value || "",
            vigente: document.getElementById("catFiltroVig")?.value || "",
            revisar: document.getElementById("catFiltroRev")?.value || "",
            limit: _catLimit,
            offset: _catOffset
        });
        if (!data.exito) throw new Error(data.mensaje);
        const pack = data.data || {};
        const items = pack.items || [];
        _catTotal = pack.total || 0;
        registrarUmsMaestro(pack.ums);
        llenarSelectFiltroCatalogo("catFiltroCategoria", pack.categorias, "Categoría: todas");
        llenarSelectFiltroCatalogo("catFiltroProveedor", pack.proveedores, "Proveedor: todos");
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-muted">Sin filas. Sincroniza Drive o agrega un ítem.</td></tr>';
        } else {
            tbody.innerHTML = items.map(function (it) {
                const id = it.row;
                const tip = function (v) { return ' title="' + escHtml(v) + '" oninput="this.title=this.value"'; };
                return '<tr data-row="' + id + '">' +
                    '<td><input class="form-control form-control-sm" data-f="categoria"' + tip(it.categoria) + ' value="' + escHtml(it.categoria) + '"></td>' +
                    '<td><input class="form-control form-control-sm" data-f="proveedor"' + tip(it.proveedor) + ' value="' + escHtml(it.proveedor) + '"></td>' +
                    '<td><input class="form-control form-control-sm" data-f="nombre"' + tip(it.nombre) + ' value="' + escHtml(it.nombre) + '"></td>' +
                    '<td><select class="form-select form-select-sm" data-f="um">' + opcionesUmHtml(it.um) + '</select></td>' +
                    '<td><input type="number" class="form-control form-control-sm" data-f="costo_cop"' + tip(it.costo_cop) + ' value="' + escHtml(it.costo_cop) + '"></td>' +
                    '<td><select class="form-select form-select-sm" data-f="vigente"><option value="S"' + (it.vigente === "N" ? "" : " selected") + '>S</option><option value="N"' + (it.vigente === "N" ? " selected" : "") + '>N</option></select></td>' +
                    '<td><select class="form-select form-select-sm" data-f="revisar"><option value="N"' + (it.revisar === "S" ? "" : " selected") + '>N</option><option value="S"' + (it.revisar === "S" ? " selected" : "") + '>S</option></select></td>' +
                    '<td><button type="button" class="btn btn-sm btn-outline-primary" onclick="guardarFilaCatalogoUI(' + id + ')">Guardar</button></td></tr>';
            }).join("");
        }
        pintarPagerCatalogo({
            infoId: "catalogoPaginacionInfo", navId: "catalogoPagerNums", pageId: "catalogoPagerPagina",
            offset: _catOffset, limit: _catLimit, total: _catTotal, shown: items.length, irFn: "irAPaginaCatalogo"
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-muted">No se pudo listar. Pega el backend.gs nuevo en Apps Script. ' + escHtml(e.message) + '</td></tr>';
    }
}

function leerFilaCatalogoDom(row) {
    const tr = document.querySelector('#catalogoTablaBody tr[data-row="' + row + '"]');
    if (!tr) return null;
    const get = f => tr.querySelector('[data-f="' + f + '"]')?.value;
    return { row: row, categoria: get("categoria"), proveedor: get("proveedor"), nombre: get("nombre"), um: get("um"), costo_cop: get("costo_cop"), vigente: get("vigente"), revisar: get("revisar") };
}

async function guardarFilaCatalogoUI(row) {
    const email = localStorage.getItem("smartbudget_email");
    const fila = leerFilaCatalogoDom(row);
    if (!fila) return;
    try {
        const data = await realizarPeticionBD({ action: "catalogo_guardar_fila", email: email, fila: fila });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(e.message, "danger");
    }
}

async function crearFilaCatalogoUI() {
    const email = localStorage.getItem("smartbudget_email");
    const nombre = document.getElementById("catNuevoNombre")?.value.trim();
    if (!nombre) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("El nombre es obligatorio.", "warning");
        return;
    }
    try {
        const data = await realizarPeticionBD({
            action: "catalogo_crear_fila",
            email: email,
            fila: {
                categoria: document.getElementById("catNuevoCat")?.value || "General",
                proveedor: document.getElementById("catNuevoProv")?.value || "Manual",
                nombre: nombre,
                um: document.getElementById("catNuevoUm")?.value || "UND",
                costo_cop: document.getElementById("catNuevoCosto")?.value
            }
        });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        document.getElementById("catNuevoNombre").value = "";
        document.getElementById("catNuevoCosto").value = "";
        _catOffset = 0;
        await cargarTablaCatalogo();
        await refrescarEstadoCatalogo();
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(e.message, "danger");
    }
}

var _catCOffset = 0;
var _catCLimit = 25;
var _catCTotal = 0;
var _catCBuscarT = null;

function abrirCatalogoConsulta() {
    new bootstrap.Modal(document.getElementById("modalCatalogoConsulta")).show();
    _catCOffset = 0;
    cargarTablaCatalogoConsulta();
}

function programarBusquedaCatalogoConsulta() {
    clearTimeout(_catCBuscarT);
    _catCBuscarT = setTimeout(function () { _catCOffset = 0; cargarTablaCatalogoConsulta(); }, 400);
}

function aplicarFiltrosCatalogoConsulta() {
    _catCOffset = 0;
    cargarTablaCatalogoConsulta();
}

function paginarCatalogoConsulta(dir) {
    irAPaginaCatalogoConsulta(Math.floor(_catCOffset / _catCLimit) + 1 + dir);
}

async function cargarTablaCatalogoConsulta() {
    const tbody = document.getElementById("catalogoConsultaBody");
    if (!tbody || typeof realizarPeticionBD !== "function") return;
    try {
        const data = await realizarPeticionBD({
            action: "catalogo_listar",
            q: document.getElementById("catCBuscar")?.value || "",
            categoria: document.getElementById("catCFiltroCategoria")?.value || "",
            proveedor: document.getElementById("catCFiltroProveedor")?.value || "",
            vigente: document.getElementById("catCFiltroVig")?.value || "",
            revisar: document.getElementById("catCFiltroRev")?.value || "",
            limit: _catCLimit,
            offset: _catCOffset
        });
        if (!data.exito) throw new Error(data.mensaje);
        const pack = data.data || {};
        const items = pack.items || [];
        _catCTotal = pack.total || 0;
        registrarUmsMaestro(pack.ums);
        llenarSelectFiltroCatalogo("catCFiltroCategoria", pack.categorias, "Categoría: todas");
        llenarSelectFiltroCatalogo("catCFiltroProveedor", pack.proveedores, "Proveedor: todos");
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Sin filas vigentes o no hay coincidencias.</td></tr>';
        } else {
            tbody.innerHTML = items.map(function (it) {
                const cop = Number(it.costo_cop) || 0;
                return "<tr>" +
                    "<td title=\"" + escHtml(it.categoria) + "\">" + escHtml(it.categoria) + "</td>" +
                    "<td title=\"" + escHtml(it.proveedor) + "\">" + escHtml(it.proveedor) + "</td>" +
                    "<td title=\"" + escHtml(it.nombre) + "\">" + escHtml(it.nombre) + "</td>" +
                    "<td>" + escHtml(it.um) + "</td>" +
                    "<td class=\"text-end\">" + cop.toLocaleString("es-CO") + "</td>" +
                    "<td>" + escHtml(it.vigente) + "</td></tr>";
            }).join("");
        }
        pintarPagerCatalogo({
            infoId: "catalogoConsultaInfo", navId: "catalogoConsultaNums", pageId: "catalogoConsultaPagina",
            offset: _catCOffset, limit: _catCLimit, total: _catCTotal, shown: items.length, irFn: "irAPaginaCatalogoConsulta"
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No se pudo consultar el catálogo. ' + escHtml(e.message) + "</td></tr>";
    }
}

async function guardarConfiguracion() {
    const email = localStorage.getItem('smartbudget_email');
    const token = localStorage.getItem('smartbudget_token');
    if (!email || !token) return alert("Sesión inválida.");

    const getVal = id => { const el = document.getElementById(id); return el ? parseFloat(el.value) || 0 : 0; };
    const data = {
        gasUrl: document.getElementById('cfgGasUrl')?.value.trim() || CONFIG_GLOBAL.gasUrl,
        tarifasFijas: JSON.stringify((typeof leerTarifasFijasUI === "function") ? leerTarifasFijasUI() : []),
        unidades: JSON.stringify((typeof leerUnidadesMatrizUI === "function") ? leerUnidadesMatrizUI() : []),
        promptMaestro: document.getElementById('cfgPrompt')?.value || '',
        promptLogistico: document.getElementById('cfgPromptLogistico')?.value || '',
        geminiCupoTokens: Math.max(100000, getVal('cfgGeminiCupo') || 2000000),
        geminiCupoUsd: Math.max(1, getVal('cfgGeminiCupoUsd') || 20),
        geminiUsdPor1MIn: getVal('cfgGeminiUsdIn') || 1.25,
        geminiUsdPor1MOut: getVal('cfgGeminiUsdOut') || 10,
        comisiones: JSON.stringify((typeof leerComisionesUI === "function") ? leerComisionesUI() : []),
        diasVigencia: { materiales: getVal('cfgDiasVigMat') || 180, procesos: getVal('cfgDiasVigProc') || 90 },
        operativos: { topeFab: getVal('cfgTopeOpFab'), topeCom: getVal('cfgTopeOpCom'), impFab: { max: getVal('cfgImpFabMax'), min: getVal('cfgImpFabMin') }, indFab: { max: getVal('cfgIndFabMax'), min: getVal('cfgIndFabMin') }, indCom: { max: getVal('cfgIndComMax'), min: getVal('cfgIndComMin') } },
        utilidadNal: { fab: { tope: getVal('n_fabTope'), max: getVal('n_fabMax'), min: getVal('n_fabMin') }, com: { tope: getVal('n_comTope'), max: getVal('n_comMax'), min: getVal('n_comMin') } },
        utilidadExp: { fab: { tope: getVal('e_fabTope'), max: getVal('e_fabMax'), min: getVal('e_fabMin') }, com: { tope: getVal('e_comTope'), max: getVal('e_comMax'), min: getVal('e_comMin') } }
    };
    
    if(typeof mostrarNotificacion === "function") mostrarNotificacion("Sincronizando configuración...", "info");
    try {
        const res = await fetch(CONFIG_GLOBAL.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'guardar_config', payload: data, email: email, authKey: token }) });
        const resData = await res.json();
        if (resData.exito) {
            CONFIG_GLOBAL = Object.assign({}, CONFIG_GLOBAL || {}, data);
            poblarSelectComisiones();
            if(typeof mostrarNotificacion === "function") mostrarNotificacion(resData.mensaje, "success");
            bootstrap.Modal.getInstance(document.getElementById('modalAdmin'))?.hide();
            if(typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
            if (typeof window.refrescarUsoGemini === "function") window.refrescarUsoGemini();
        } else { if(typeof mostrarNotificacion === "function") mostrarNotificacion("Error: " + resData.mensaje, "danger"); }
    } catch(e) { if(typeof mostrarNotificacion === "function") mostrarNotificacion("Error de red guardando configuración.", "danger"); }
}

function poblarSelectComisiones(lista) {
    const sel = document.getElementById('simComision');
    if (!sel) return;
    const rows = lista || parseComisiones(CONFIG_GLOBAL && CONFIG_GLOBAL.comisiones);
    sel.innerHTML = rows.map(function (c) {
        return '<option value="' + escHtml(c.pct) + '">' + escHtml(c.nombre) + ' (' + escHtml(c.pct) + '%)</option>';
    }).join('');
}

function habilitarVentanasFlotantes() {
    document.querySelectorAll(".modal").forEach(function (modal) {
        const dialog = modal.querySelector(".modal-dialog");
        const handle = modal.querySelector(".sb-modal-header");
        if (!dialog || !handle || handle.dataset.dragBound) return;
        handle.dataset.dragBound = "1";
        modal.addEventListener("hidden.bs.modal", function () {
            dialog.style.position = "";
            dialog.style.left = "";
            dialog.style.top = "";
            dialog.style.margin = "";
            dialog.style.transform = "";
            if (modal.id === "modalAdmin" && typeof poblarSelectComisiones === "function") poblarSelectComisiones();
        });
        handle.addEventListener("mousedown", function (e) {
            if (e.button !== 0) return;
            if (e.target.closest("button, .btn-close, a, input, select, textarea")) return;
            e.preventDefault();
            const rect = dialog.getBoundingClientRect();
            const dx = e.clientX - rect.left;
            const dy = e.clientY - rect.top;
            dialog.style.margin = "0";
            dialog.style.position = "fixed";
            dialog.style.left = rect.left + "px";
            dialog.style.top = rect.top + "px";
            dialog.style.transform = "none";
            handle.classList.add("is-dragging");
            function move(ev) {
                const x = Math.max(8, Math.min(ev.clientX - dx, window.innerWidth - 96));
                const y = Math.max(8, Math.min(ev.clientY - dy, window.innerHeight - 56));
                dialog.style.left = x + "px";
                dialog.style.top = y + "px";
            }
            function up() {
                handle.classList.remove("is-dragging");
                document.removeEventListener("mousemove", move);
                document.removeEventListener("mouseup", up);
            }
            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", up);
        });
    });
}
