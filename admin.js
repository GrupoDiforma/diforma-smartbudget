// Usamos var para que la variable sea accesible globalmente por los otros archivos
var CONFIG_GLOBAL = null;
var _configHojaOk = false;
var _configHojaFallo = false;
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

function htmlFilaPartida_(p) {
    const f = p || { codigo: "", nombre: "" };
    return "<tr>" +
        "<td><input data-k=\"codigo\" class=\"form-control form-control-sm\" value=\"" + escHtml(f.codigo || "") + "\" placeholder=\"9403.20.00.00\"></td>" +
        "<td><input data-k=\"nombre\" class=\"form-control form-control-sm\" value=\"" + escHtml(f.nombre || "") + "\"></td>" +
        "<td><button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-pq=\"quitar\" title=\"Quitar\">Quitar</button></td></tr>";
}

function leerPartidasUI() {
    const tbody = document.getElementById("partidasBody");
    if (!tbody || !tbody.querySelector("[data-k=\"codigo\"]")) {
        return typeof window.logListaPartidas === "function" ? window.logListaPartidas() : [];
    }
    const fmt = typeof window.logPartidaFmt === "function" ? window.logPartidaFmt : function (s) { return String(s || "").trim(); };
    const vistos = {};
    const out = [];
    tbody.querySelectorAll("tr").forEach(function (tr) {
        const codigo = fmt((tr.querySelector("[data-k=\"codigo\"]") || {}).value || "");
        const nombre = String((tr.querySelector("[data-k=\"nombre\"]") || {}).value || "").trim();
        const dig = codigo.replace(/\D/g, "");
        if (dig.length < 6 || !nombre || vistos[codigo]) return;
        vistos[codigo] = true;
        out.push({ codigo: codigo, nombre: nombre.slice(0, 80) });
    });
    return out;
}

function partidasParaGuardar_() {
    return leerPartidasUI().map(function (p) { return { codigo: p.codigo, nombre: p.nombre }; });
}

function pintarTablaPartidas() {
    const tbody = document.getElementById("partidasBody");
    if (!tbody || typeof window.logListaPartidas !== "function") return;
    if (tbody.querySelector("[data-k=\"codigo\"]") && document.activeElement && tbody.contains(document.activeElement)) return;
    const rows = window.logListaPartidas();
    tbody.innerHTML = rows.length ? rows.map(htmlFilaPartida_).join("") : "<tr><td colspan=\"3\">Sin partidas. Agrega una o sincroniza el Excel.</td></tr>";
    if (!tbody._pq) {
        tbody._pq = true;
        tbody.addEventListener("click", function (ev) {
            const btn = ev.target.closest("[data-pq=\"quitar\"]");
            if (!btn) return;
            const tr = btn.closest("tr");
            if (tr) tr.remove();
            if (!tbody.querySelector("tr")) tbody.innerHTML = "<tr><td colspan=\"3\">Sin partidas. Agrega una o sincroniza el Excel.</td></tr>";
        });
    }
}

function agregarPartidaUI() {
    const tbody = document.getElementById("partidasBody");
    if (!tbody) return;
    const vacio = tbody.querySelector("td[colspan]");
    if (vacio) tbody.innerHTML = "";
    tbody.insertAdjacentHTML("beforeend", htmlFilaPartida_({ codigo: "", nombre: "" }));
    const inp = tbody.querySelector("tr:last-child [data-k=\"codigo\"]");
    if (inp) inp.focus();
}

function fusionarPartidasDesdeArancel_() {
    const tbody = document.getElementById("partidasBody");
    if (!tbody || typeof window.logPartidasDesdeArancel !== "function") return;
    const tienen = {};
    tbody.querySelectorAll("[data-k=\"codigo\"]").forEach(function (el) {
        const fmt = typeof window.logPartidaFmt === "function" ? window.logPartidaFmt(el.value) : el.value;
        if (fmt) tienen[fmt] = true;
    });
    const nuevas = window.logPartidasDesdeArancel().filter(function (p) { return p.codigo && !tienen[p.codigo]; });
    if (!nuevas.length) return;
    const vacio = tbody.querySelector("td[colspan]");
    if (vacio) tbody.innerHTML = "";
    tbody.insertAdjacentHTML("beforeend", nuevas.map(htmlFilaPartida_).join(""));
}

async function cargarConfiguracionGlobal() {
    _configHojaOk = false;
    _configHojaFallo = false;
    try {
        const resBase = await fetch('config.json');
        let baseConfig = resBase.ok ? await resBase.json() : {};
        let remotaConfig = null;
        if (baseConfig.gasUrl) {
            try {
                const resRemoto = await fetch(baseConfig.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'obtener_config' }) });
                const dataRemota = await resRemoto.json();
                if (dataRemota.exito && dataRemota.data) {
                    remotaConfig = dataRemota.data;
                    _configHojaOk = true;
                } else if (!(dataRemota && /Sin configuración remota/i.test(String(dataRemota.mensaje || "")))) {
                    _configHojaFallo = true;
                }
            } catch(e) {
                _configHojaFallo = true;
                console.warn("Modo offline o error al traer config remota.");
            }
        } else {
            _configHojaFallo = true;
        }
        if (remotaConfig) {
            CONFIG_GLOBAL = Object.assign({}, remotaConfig);
            if (!CONFIG_GLOBAL.gasUrl) CONFIG_GLOBAL.gasUrl = baseConfig.gasUrl;
        } else {
            CONFIG_GLOBAL = baseConfig;
        }
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
        pintarAvisoConfigRemota_();
        return CONFIG_GLOBAL;
    } catch (err) {
        _configHojaFallo = true;
        console.error("Error cargando config:", err);
    }
}

function pintarAvisoConfigRemota_() {
    const aviso = document.getElementById("avisoConfigRemota");
    const btn = document.getElementById("btnGuardarAjustes");
    const nota = document.getElementById("notaAjustesGlobal");
    if (!_configHojaFallo) {
        if (aviso) { aviso.classList.add("d-none"); aviso.innerHTML = ""; }
        if (btn) { btn.disabled = false; btn.title = "Guarda estos ajustes para toda la empresa."; }
        if (nota) nota.textContent = "Los cambios aplican a toda la empresa.";
        return;
    }
    if (aviso) {
        aviso.classList.remove("d-none");
        aviso.innerHTML = "No se pudo leer la configuración de la empresa. Lo que aparece aquí puede ser la copia del sitio, no la hoja global. Guardar está apagado para no reemplazarla. " +
            "<button type=\"button\" class=\"btn admin-btn btn-sm ms-1\" onclick=\"reintentarConfigAjustes()\">Reintentar</button>";
    }
    if (btn) { btn.disabled = true; btn.title = "Se activa cuando la hoja responda."; }
    if (nota) nota.textContent = "Sin lectura de la hoja no se puede guardar.";
}

async function reintentarConfigAjustes() {
    const aviso = document.getElementById("avisoConfigRemota");
    const btn = document.getElementById("btnGuardarAjustes");
    if (aviso) aviso.textContent = "Leyendo la configuración de la empresa…";
    if (btn) btn.disabled = true;
    await cargarConfiguracionGlobal();
    pintarFormularioAjustes_();
    pintarAvisoConfigRemota_();
    if (!_configHojaFallo && typeof mostrarNotificacion === "function") {
        mostrarNotificacion("Configuración de la empresa cargada.", "success");
    }
}

function abrirModalAdmin() {
    if(!CONFIG_GLOBAL) return;
    pintarFormularioAjustes_();
    pintarAvisoConfigRemota_();
    if (typeof habilitarVentanasFlotantes === "function") habilitarVentanasFlotantes();
    new bootstrap.Modal(document.getElementById('modalAdmin')).show();
    if (typeof refrescarEstadoCatalogo === "function") refrescarEstadoCatalogo();
    if (typeof refrescarEstadoAranceles === "function") refrescarEstadoAranceles();
    let vistaLog = "origen";
    try { vistaLog = sessionStorage.getItem("logAjustesVista") || "origen"; } catch (eV) {}
    if (vistaLog === "aduana") vistaLog = "aranceles";
    if (vistaLog === "costos") vistaLog = "origen";
    logAjustesVista(vistaLog);
    if (typeof cargarTablaCatalogo === "function") cargarTablaCatalogo();
    if (typeof window.refrescarEstadoPlantillaExcel === "function") window.refrescarEstadoPlantillaExcel();
}

function pintarFormularioAjustes_() {
    if(!CONFIG_GLOBAL) return;
    const d = CONFIG_GLOBAL;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || (val===0?0:''); };
    
    setVal('cfgGasUrl', d.gasUrl);
    setVal('cfgTarifas', typeof d.tarifasFijas === 'string' ? d.tarifasFijas : JSON.stringify(d.tarifasFijas || []));
    setVal('cfgUnidades', typeof d.unidades === 'string' ? d.unidades : JSON.stringify(d.unidades || []));
    setVal('cfgDiasVigMat', (d.diasVigencia && d.diasVigencia.materiales) != null ? d.diasVigencia.materiales : 180);
    setVal('cfgDiasVigProc', (d.diasVigencia && d.diasVigencia.procesos) != null ? d.diasVigencia.procesos : 90);
    setVal('cfgLogTrm', d.logTrm != null ? d.logTrm : "");
    setVal('cfgLogMeses', d.logMeses != null ? d.logMeses : 6);
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
    if (typeof pintarTablaPartidas === "function") pintarTablaPartidas();
    if (typeof logTarCargar_ === "function") logTarCargar_(d.logTarifas);
    if (typeof pintarEditorTyc === "function") pintarEditorTyc();
    if (typeof pintarEditorMembrete === "function") pintarEditorMembrete();
    const selUm = document.getElementById("catNuevoUm");
    if (selUm) selUm.innerHTML = opcionesUmHtml("UND");
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

async function refrescarEstadoAranceles() {
    const box = document.getElementById("arancelesEstadoBox");
    if (!box || typeof realizarPeticionBD !== "function") return;
    try {
        const data = await realizarPeticionBD({ action: "aranceles_estado" });
        if (!data.exito) throw new Error(data.mensaje || "Sin respuesta");
        const d = data.data || {};
        box.className = "admin-banner is-ok mb-3";
        box.innerText = "Aranceles: " + (d.total || 0) + " filas" + (d.mensaje ? " · " + d.mensaje : "");
        const cron = document.getElementById("btnCronAranceles");
        if (cron) {
            cron.innerHTML = d.cron7d ? "Desactivar sync cada 7 días" : "Activar sync cada 7 días";
            cron.onclick = d.cron7d ? desactivarCronArancelesUI : activarCronArancelesUI;
        }
        await pintarTablaAranceles();
    } catch (e) {
        box.className = "admin-banner is-warn mb-3";
        box.innerText = /Acci[oó]n no v[aá]lida/i.test(e.message || "")
            ? "El web app publicado todavía no tiene esta sync. Pega backend.gs y publica una versión nueva."
            : ("No se pudo leer aranceles. " + (e.message || ""));
    }
}

function selBaseArancel_(val) {
    const opts = [["", "—"], ["EXW", "EXW"], ["CIF", "CIF"], ["CIF+DUTY", "CIF + gravamen"]];
    return opts.map(function (o) {
        return "<option value=\"" + o[0] + "\"" + (val === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
}

function htmlFilaArancel_(f) {
    const pct = function (n) { return n == null || n === "" ? "" : n; };
    return "<tr data-desc=\"" + escHtml(f.descripcion || "") + "\">" +
        "<td><input data-k=\"pais\" class=\"form-control form-control-sm\" value=\"" + escHtml(f.pais || "") + "\"></td>" +
        "<td><input data-k=\"partida\" class=\"form-control form-control-sm\" value=\"" + escHtml(f.partida || "") + "\"></td>" +
        "<td><input data-k=\"dutiesPct\" type=\"number\" step=\"0.001\" class=\"form-control form-control-sm\" value=\"" + pct(f.dutiesPct) + "\"></td>" +
        "<td><select data-k=\"dutiesBase\" class=\"form-select form-select-sm\">" + selBaseArancel_(f.dutiesBase || "") + "</select></td>" +
        "<td><input data-k=\"taxesPct\" type=\"number\" step=\"0.001\" class=\"form-control form-control-sm\" value=\"" + pct(f.taxesPct) + "\"></td>" +
        "<td><select data-k=\"taxesBase\" class=\"form-select form-select-sm\">" + selBaseArancel_(f.taxesBase || "") + "</select></td>" +
        "<td><input data-k=\"nota\" class=\"form-control form-control-sm\" maxlength=\"400\" placeholder=\"Observación\" value=\"" + escHtml(f.nota || "") + "\"></td>" +
        "<td><button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-ar=\"quitar\" title=\"Quitar\">Quitar</button></td></tr>";
}

function leerFilaArancelUi_(tr) {
    const g = function (k) {
        const el = tr.querySelector("[data-k=\"" + k + "\"]");
        return el ? el.value : "";
    };
    return {
        pais: g("pais"), partida: g("partida"),
        dutiesPct: g("dutiesPct"), dutiesBase: g("dutiesBase"),
        taxesPct: g("taxesPct"), taxesBase: g("taxesBase"),
        nota: g("nota"),
        descripcion: tr.getAttribute("data-desc") || ""
    };
}

function leerArancelesUI() {
    const body = document.getElementById("arancelesBody");
    if (!body || body.getAttribute("data-cargada") !== "1") return null;
    const filas = [];
    body.querySelectorAll("tr").forEach(function (tr) {
        if (!tr.querySelector("[data-k=\"pais\"]")) return;
        const f = leerFilaArancelUi_(tr);
        if (!String(f.pais || "").trim() && !String(f.partida || "").trim()) return;
        filas.push(f);
    });
    return filas;
}

function arancelesMemoriaDesdeUi_() {
    const filas = leerArancelesUI();
    if (!filas || typeof logAranceles === "undefined") return;
    logAranceles.filas = filas;
    logAranceles.pedido = true;
}

function pintarTablaAranceles() {
    const body = document.getElementById("arancelesBody");
    if (!body || typeof realizarPeticionBD !== "function") return;
    if (body.getAttribute("data-cargada") === "1" && document.activeElement && body.contains(document.activeElement)) return;
    if (!body._arClick) {
        body._arClick = true;
        body.addEventListener("click", function (ev) {
            const btn = ev.target.closest("[data-ar=\"quitar\"]");
            if (!btn) return;
            const tr = btn.closest("tr");
            if (tr) tr.remove();
            if (!body.querySelector("[data-k=\"pais\"]")) {
                body.innerHTML = "<tr><td colspan=\"8\">Sin filas. Agrega una o sincroniza desde Drive.</td></tr>";
            }
            arancelesMemoriaDesdeUi_();
        });
        body.addEventListener("change", arancelesMemoriaDesdeUi_);
    }
    return realizarPeticionBD({ action: "aranceles_consultar" }).then(function (data) {
        const filas = (data && data.exito && data.data && data.data.filas) || [];
        body.setAttribute("data-cargada", "1");
        body.innerHTML = filas.length
            ? filas.map(htmlFilaArancel_).join("")
            : "<tr><td colspan=\"8\">Sin filas. Agrega una o sincroniza desde Drive.</td></tr>";
        if (typeof logAranceles !== "undefined") {
            logAranceles.filas = filas;
            logAranceles.pedido = true;
        }
        if (typeof pintarTablaPartidas === "function") pintarTablaPartidas();
    }).catch(function () {
        body.innerHTML = "<tr><td colspan=\"8\">No se pudo leer la hoja Aranceles.</td></tr>";
    });
}

function agregarFilaArancelUI() {
    const body = document.getElementById("arancelesBody");
    if (!body) return;
    body.setAttribute("data-cargada", "1");
    const vacio = body.querySelector("td[colspan]");
    if (vacio) body.innerHTML = "";
    body.insertAdjacentHTML("beforeend", htmlFilaArancel_({}));
    const inp = body.querySelector("tr:last-child [data-k=\"pais\"]");
    if (inp) inp.focus();
}

async function guardarArancelesConAjustes_() {
    const filas = leerArancelesUI();
    if (!filas) return true;
    const email = localStorage.getItem("smartbudget_email");
    const data = await realizarPeticionBD({ action: "aranceles_reemplazar", email: email, filas: filas }, { timeoutMs: 60000 });
    if (!data || !data.exito) throw new Error((data && data.mensaje) || "No se guardaron los aranceles.");
    if (typeof logAranceles !== "undefined") {
        logAranceles.filas = filas;
        logAranceles.pedido = true;
    }
    return true;
}

async function activarCronArancelesUI() {
    const email = localStorage.getItem("smartbudget_email");
    try {
        const data = await realizarPeticionBD({ action: "aranceles_activar_cron", email: email });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        await refrescarEstadoAranceles();
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(e.message, "danger");
    }
}

async function desactivarCronArancelesUI() {
    const email = localStorage.getItem("smartbudget_email");
    try {
        const data = await realizarPeticionBD({ action: "aranceles_desactivar_cron", email: email });
        if (!data.exito) throw new Error(data.mensaje);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        await refrescarEstadoAranceles();
    } catch (e) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(e.message, "danger");
    }
}

var LOG_TAR_TABS = [
    ["origen", "Origen"],
    ["interno", "Flete interno"],
    ["aereo", "Aéreo"],
    ["fcl", "Marítimo FCL"],
    ["lcl", "Marítimo LCL"],
    ["seguro", "Seguro"],
    ["destino", "Destino"],
    ["aranceles", "Aranceles"]
];

var LOG_TAR_DESC = {
    origen: "Cargos que salen de Bogotá. Puedes cambiar la ciudad y agregar conceptos. Si el cargo es variable sobre el valor, el precio es un porcentaje. Entra la fila preferida.",
    interno: "De Bogotá al puerto o al aeropuerto. En FCL el precio es por contenedor. Si hay varios puertos, entra la preferida.",
    aereo: "Una fila por ruta. Se usa el rango que cubre el peso (+45, +100, +300, +500) y, si el combustible no va incluido, se suma aparte.",
    fcl: "Una fila por puerto y tipo de contenedor. Los otros cargos se suman cuando no van dentro del flete. Entra la preferida.",
    lcl: "Una fila por puerto. Se cobra el precio por el mayor entre toneladas y m³, y después el mínimo.",
    seguro: "Un porcentaje del valor de la mercancía, según la modalidad, con mínimo.",
    destino: "Un cargo por país y ciudad. Marca varias filas y duplícalas a otra ciudad del mismo país; después corriges solo lo que cambie. Si es variable sobre el valor, el precio es un porcentaje."
};

var LOG_TAR_COLS = {
    origen: [["preferida", "Pref"], ["origen", "Origen"], ["modalidad", "Modalidad"], ["concepto", "Concepto"], ["forma", "Forma"], ["baseVar", "Sobre"], ["aplica", "Aplica"], ["precio", "Precio"], ["moneda", "Moneda"], ["minimo", "Mínimo"], ["proveedor", "Proveedor"], ["fecha", "Fecha"]],
    interno: [["preferida", "Pref"], ["origen", "Origen"], ["salida", "Puerto"], ["modalidad", "Modalidad"], ["equipo", "Contenedor"], ["precio", "Precio"], ["moneda", "Moneda"], ["proveedor", "Proveedor"], ["fecha", "Fecha"]],
    aereo: [["preferida", "Pref"], ["origen", "Origen"], ["pais", "País"], ["ciudad", "Ciudad"], ["r45", "+45"], ["r100", "+100"], ["r300", "+300"], ["r500", "+500"], ["minimo", "Mínimo"], ["moneda", "Moneda"], ["fsIncluido", "FS incl."], ["fsKg", "FS / kg"], ["aerolinea", "Aerolínea"], ["transito", "Tránsito"], ["proveedor", "Proveedor"], ["fecha", "Fecha"]],
    fcl: [["preferida", "Pref"], ["origen", "Origen"], ["pais", "País"], ["puerto", "Puerto"], ["equipo", "Contenedor"], ["precio", "Flete"], ["moneda", "Moneda"], ["otros", "Otros no incluidos"], ["naviera", "Naviera"], ["transito", "Tránsito"], ["proveedor", "Proveedor"], ["fecha", "Fecha"]],
    lcl: [["preferida", "Pref"], ["origen", "Origen"], ["pais", "País"], ["puerto", "Puerto"], ["precio", "Por ton / m³"], ["minimo", "Mínimo"], ["moneda", "Moneda"], ["naviera", "Naviera"], ["transito", "Tránsito"], ["proveedor", "Proveedor"], ["fecha", "Fecha"]],
    seguro: [["preferida", "Pref"], ["modalidad", "Modalidad"], ["precio", "%"], ["minimo", "Mínimo"], ["moneda", "Moneda"], ["proveedor", "Proveedor"], ["fecha", "Fecha"]],
    destino: [["preferida", "Pref"], ["pais", "País"], ["ciudad", "Ciudad"], ["modalidad", "Modalidad"], ["concepto", "Concepto"], ["forma", "Forma"], ["baseVar", "Sobre"], ["aplica", "Aplica"], ["precio", "Precio"], ["moneda", "Moneda"], ["minimo", "Mínimo"], ["proveedor", "Proveedor"], ["fecha", "Fecha"]]
};

var LOG_TAR_SUG_ORIGEN = ["Agenciamiento", "SAE", "Planilla", "Document fee", "AMS", "Aeropuerto", "Due agent", "Due carrier", "Maniobras", "SOLAS", "Handling", "Camión urbano", "Emisión BL", "Gastos operativos"];
var LOG_TAR_SUG_DESTINO = ["Delivery", "Customs entry", "ISF", "Bond", "Doc fee", "Warehouse transfer", "DTHC"];

function escLogTar_(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function logTarHoy_() {
    const d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

function logTarId_() {
    return "lt" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function logTarNueva_(tab) {
    const base = { id: logTarId_(), preferida: "S", proveedor: "", fecha: logTarHoy_(), moneda: "USD", origen: "Bogotá" };
    if (tab === "origen") return Object.assign(base, { modalidad: "fcl", concepto: "", forma: "fijo", baseVar: "valor", aplica: "embarque", precio: "", minimo: "" });
    if (tab === "interno") return Object.assign(base, { salida: "", modalidad: "fcl", equipo: "40", precio: "" });
    if (tab === "aereo") return Object.assign(base, { pais: "", ciudad: "", r45: "", r100: "", r300: "", r500: "", minimo: "", fsIncluido: "N", fsKg: "", aerolinea: "", transito: "" });
    if (tab === "fcl") return Object.assign(base, { pais: "", puerto: "", equipo: "40", precio: "", otros: [], naviera: "", transito: "" });
    if (tab === "lcl") return Object.assign(base, { pais: "", puerto: "", precio: "", minimo: "", naviera: "", transito: "" });
    if (tab === "seguro") return { id: base.id, preferida: "S", modalidad: "aerea", precio: "", minimo: "", moneda: "USD", proveedor: "", fecha: base.fecha };
    return Object.assign(base, { pais: "", ciudad: "", modalidad: "fcl", concepto: "", forma: "fijo", baseVar: "valor", aplica: "embarque", precio: "", minimo: "" });
}

function logTarCargar_(raw) {
    logTarInit_();
    if (typeof logTarAsegurar_ === "function") logTarAsegurar_();
    if (raw != null) {
        let o = raw;
        if (typeof raw === "string") {
            try { o = JSON.parse(raw); } catch (e) { o = null; }
        }
        const base = typeof logTarVacio_ === "function" ? logTarVacio_() : { origen: [], interno: [], aereo: [], fcl: [], lcl: [], seguro: [], destino: [] };
        if (o && typeof o === "object") {
            Object.keys(base).forEach(function (k) { base[k] = Array.isArray(o[k]) ? o[k] : []; });
        }
        window.logTarifas = base;
        window.logTarConceptos = (o && o.conceptos && typeof o.conceptos === "object") ? o.conceptos : { origen: [], destino: [] };
        window.logTarifas.conceptos = window.logTarConceptos;
        if (typeof logTarSemillaSiVacio_ === "function") logTarSemillaSiVacio_();
    }
    if (!window.logTarPagina) window.logTarPagina = {};
    if (!window.logTarGrupo) window.logTarGrupo = { destino: "pais" };
    logTarPintar_();
}

function logTarParaGuardar_() {
    logTarFlush_();
    if (typeof logTarAsegurar_ === "function") logTarAsegurar_();
    if (window.logTarifas) window.logTarifas.conceptos = window.logTarConceptos || window.logTarifas.conceptos || { origen: [], destino: [] };
    return window.logTarifas;
}

function logTarFlush_() {
    const body = document.getElementById("logTarBody");
    const tab = window.logTarTab;
    if (!body || !tab || !window.logTarifas || !window.logTarifas[tab]) return;
    const lista = window.logTarifas[tab];
    body.querySelectorAll("tr[data-id]").forEach(function (tr) {
        const row = lista.find(function (r) { return r.id === tr.getAttribute("data-id"); });
        if (!row) return;
        tr.querySelectorAll("[data-k]").forEach(function (el) {
            const k = el.getAttribute("data-k");
            if (!k || k === "otros") return;
            row[k] = el.type === "checkbox" ? (el.checked ? "S" : "N") : el.value;
        });
        if (tr.querySelector(".lt-otros")) {
            const otros = [];
            tr.querySelectorAll(".lt-otro").forEach(function (box) {
                const nombre = (box.querySelector("[data-ok='nombre']") || {}).value || "";
                const precio = (box.querySelector("[data-ok='precio']") || {}).value || "";
                const moneda = (box.querySelector("[data-ok='moneda']") || {}).value || "USD";
                if (nombre || precio !== "") otros.push({ nombre: nombre, precio: precio, moneda: moneda });
            });
            row.otros = otros;
        }
    });
}

function logTarMods_(tab) {
    if (tab === "origen" || tab === "destino") return [["aerea", "Aérea"], ["fcl", "FCL"], ["lcl", "LCL"], ["todas", "Todas"]];
    if (tab === "seguro") return [["aerea", "Aérea"], ["fcl", "FCL"], ["lcl", "LCL"]];
    return [["aerea", "Aérea"], ["fcl", "FCL"], ["lcl", "LCL"]];
}

function logTarSelect_(opciones, valor, k, cls) {
    return "<select data-k=\"" + k + "\" class=\"form-select form-select-sm " + (cls || "") + "\">" + opciones.map(function (o) {
        return "<option value=\"" + escLogTar_(o[0]) + "\"" + (String(valor || "") === String(o[0]) ? " selected" : "") + ">" + escLogTar_(o[1]) + "</option>";
    }).join("") + "</select>";
}

function logTarInput_(k, val, tipo, cls) {
    const t = tipo || "text";
    return "<input data-k=\"" + k + "\" type=\"" + t + "\"" + (t === "number" ? " step=\"0.01\"" : "") + " class=\"form-control form-control-sm " + (cls || "") + "\" value=\"" + escLogTar_(val == null ? "" : val) + "\">";
}

function logTarCelda_(tab, f, col) {
    const k = col[0];
    if (k === "preferida" || k === "fsIncluido") {
        return "<input data-k=\"" + k + "\" type=\"checkbox\"" + (f[k] === "S" ? " checked" : "") + ">";
    }
    if (k === "modalidad") return logTarSelect_(logTarMods_(tab), f.modalidad, "modalidad");
    if (k === "forma") return logTarSelect_([["fijo", "Fijo"], ["variable", "Variable"]], f.forma || "fijo", "forma");
    if (k === "baseVar") return logTarSelect_([["peso", "Peso"], ["volumen", "Volumen"], ["wm", "Ton / m³"], ["valor", "Valor"]], f.baseVar || "valor", "baseVar", f.forma === "variable" ? "" : "lt-off");
    if (k === "aplica") return logTarSelect_([["embarque", "Embarque"], ["contenedor", "Contenedor"]], f.aplica || "embarque", "aplica", f.forma === "variable" ? "lt-off" : "");
    if (k === "moneda") return logTarSelect_([["USD", "USD"], ["COP", "COP"]], f.moneda || "USD", "moneda", "lt-mon");
    if (k === "equipo") {
        const ops = tab === "fcl" ? [["20", "20"], ["40", "40"], ["40hc", "40HC"]] : [["", "—"], ["20", "20"], ["40", "40"], ["40hc", "40HC"]];
        return logTarSelect_(ops, f.equipo || (tab === "fcl" ? "40" : ""), "equipo");
    }
    if (k === "pais") return logTarPaisSelect_(f.pais);
    if (k === "concepto") {
        return "<input data-k=\"concepto\" class=\"form-control form-control-sm lt-concepto\" autocomplete=\"off\" value=\"" + escLogTar_(f.concepto || "") + "\">";
    }
    if (k === "fecha") return logTarInput_("fecha", f.fecha, "date", "lt-fecha");
    if (k === "precio" || k === "minimo" || k === "r45" || k === "r100" || k === "r300" || k === "r500" || k === "fsKg") {
        return logTarInput_(k, f[k], "number", "text-end lt-num");
    }
    if (k === "otros") return logTarOtrosHtml_(f);
    const ancho = { ciudad: 1, origen: 1, puerto: 1, salida: 1, aerolinea: 1, naviera: 1 };
    return logTarInput_(k, f[k], "text", ancho[k] ? "lt-lugar" : "");
}

function logTarPaisSelect_(valor) {
    const lista = typeof logPaisesFuente_ === "function" ? logPaisesFuente_() : [];
    const ops = [["", "País"]];
    lista.forEach(function (x) { if (x && x.nombre) ops.push([x.nombre, x.nombre]); });
    if (valor && !ops.some(function (o) { return o[0] === valor; })) ops.splice(1, 0, [valor, valor]);
    return logTarSelect_(ops, valor, "pais", "lt-lugar");
}

function logTarConceptosDe_(tab) {
    const base = tab === "origen" ? LOG_TAR_SUG_ORIGEN : (tab === "destino" ? LOG_TAR_SUG_DESTINO : []);
    const extra = (window.logTarConceptos && window.logTarConceptos[tab]) || [];
    const deFilas = ((window.logTarifas && window.logTarifas[tab]) || []).map(function (f) { return f.concepto; });
    const all = [];
    base.concat(extra, deFilas).forEach(function (s) {
        const t = String(s || "").trim();
        if (t && all.indexOf(t) < 0) all.push(t);
    });
    return all;
}

function logTarOtrosHtml_(f) {
    const rows = (f.otros && f.otros.length ? f.otros : [{ nombre: "", precio: "", moneda: "USD" }]).map(function (o) {
        return "<div class=\"lt-otro\">" +
            "<input data-ok=\"nombre\" class=\"form-control form-control-sm\" placeholder=\"BAF\" value=\"" + escLogTar_(o.nombre || "") + "\">" +
            "<input data-ok=\"precio\" type=\"number\" step=\"0.01\" class=\"form-control form-control-sm text-end lt-num\" value=\"" + escLogTar_(o.precio == null ? "" : o.precio) + "\">" +
            logTarSelect_([["USD", "USD"], ["COP", "COP"]], o.moneda || "USD", "", "lt-mon").replace("data-k=\"\"", "data-ok=\"moneda\"") +
            "</div>";
    }).join("");
    return "<div class=\"lt-otros\">" + rows + "<button type=\"button\" class=\"btn btn-sm btn-link px-0\" data-lt=\"otro\">Agregar cargo</button></div>";
}

function logTarTexto_(f) {
    return Object.keys(f).map(function (k) {
        const v = f[k];
        return typeof v === "object" ? JSON.stringify(v) : String(v || "");
    }).join(" ").toLowerCase();
}

function logTarFiltradas_(tab) {
    const q = String((document.getElementById("logTarBuscar") || {}).value || "").toLowerCase().trim();
        const filtroMod = document.getElementById("logTarFiltroMod");
        const mod = filtroMod && !filtroMod.hidden ? (filtroMod.value || "") : "";
    const solo = !!((document.getElementById("logTarSoloPref") || {}).checked);
    return (window.logTarifas[tab] || []).filter(function (f) {
        if (mod && f.modalidad && f.modalidad !== mod && f.modalidad !== "todas") return false;
        if (solo && f.preferida !== "S") return false;
        if (q && logTarTexto_(f).indexOf(q) < 0) return false;
        return true;
    });
}

function logTarOrdenar_(filas) {
    const orden = window.logTarOrden || "desc";
    return filas.slice().sort(function (a, b) {
        const da = String(a.fecha || "");
        const db = String(b.fecha || "");
        if (da !== db) return orden === "asc" ? (da < db ? -1 : 1) : (da > db ? -1 : 1);
        return String(a.concepto || a.ciudad || a.puerto || "").localeCompare(String(b.concepto || b.ciudad || b.puerto || ""), "es");
    });
}

function logTarPintarNav_() {
    const nav = document.getElementById("logTarNav");
    if (!nav || nav.getAttribute("data-listo")) return;
    nav.innerHTML = LOG_TAR_TABS.map(function (t) {
        return "<button type=\"button\" class=\"log-ajustes-sub-btn\" data-log-vista=\"" + t[0] + "\">" + t[1] + "</button>";
    }).join("");
    nav.setAttribute("data-listo", "1");
    const sug = function (id, items) {
        const el = document.getElementById(id);
        if (!el || el.children.length) return;
        el.innerHTML = items.map(function (s) { return "<option value=\"" + escLogTar_(s) + "\">"; }).join("");
    };
    sug("logTarSugOrigen", LOG_TAR_SUG_ORIGEN);
    sug("logTarSugDestino", LOG_TAR_SUG_DESTINO);
    nav.addEventListener("click", function (ev) {
        const btn = ev.target.closest("[data-log-vista]");
        if (btn) logAjustesVista(btn.getAttribute("data-log-vista"));
    });
}

function logTarPintar_() {
    logTarPintarNav_();
    const tab = window.logTarTab || "origen";
    if (tab === "aranceles") return;
    const head = document.getElementById("logTarHead");
    const body = document.getElementById("logTarBody");
    if (!head || !body || !window.logTarifas) return;
    const cols = LOG_TAR_COLS[tab] || [];
    const desc = document.getElementById("logTarDesc");
    if (desc) desc.textContent = LOG_TAR_DESC[tab] || "";
    const filtro = document.getElementById("logTarFiltroMod");
    if (filtro) filtro.hidden = !(tab === "origen" || tab === "interno" || tab === "destino" || tab === "seguro");
    const sim = document.getElementById("logTarSim");
    if (sim) sim.hidden = tab !== "destino";
    const agr = document.getElementById("logTarAgrupar");
    if (agr) {
        const ops = tab === "destino" ? [["pais", "Agrupar por país"], ["ciudad", "Agrupar por ciudad"], ["", "Sin agrupar"]]
            : tab === "aereo" || tab === "fcl" || tab === "lcl" ? [["", "Sin agrupar"], ["pais", "Agrupar por país"]]
            : tab === "interno" ? [["salida", "Agrupar por puerto"], ["", "Sin agrupar"]]
            : tab === "origen" ? [["modalidad", "Agrupar por modalidad"], ["", "Sin agrupar"]]
            : [["", "Sin agrupar"]];
        const actual = (window.logTarGrupo && window.logTarGrupo[tab]) || ops[0][0];
        agr.innerHTML = ops.map(function (o) {
            return "<option value=\"" + o[0] + "\"" + (actual === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("");
        agr.hidden = ops.length < 2;
    }
    const extra = tab === "destino" ? 1 : 0;
    head.innerHTML = "<tr>" + (extra ? "<th class=\"lt-sel\"><input type=\"checkbox\" id=\"logTarSelTodo\" title=\"Marcar esta página\"></th>" : "") + cols.map(function (c) {
        if (c[0] === "fecha") return "<th><button type=\"button\" class=\"cl-sort\" id=\"logTarOrdenFecha\">Fecha " + ((window.logTarOrden || "desc") === "asc" ? "↑" : "↓") + "</button></th>";
        return "<th>" + c[1] + "</th>";
    }).join("") + "<th></th></tr>";
    const ordenadas = logTarOrdenar_(logTarFiltradas_(tab));
    const tam = Number(window.logTarTam) || 25;
    const pag = window.logTarPagina[tab] || 0;
    const maxPag = Math.max(0, Math.ceil(ordenadas.length / tam) - 1);
    const pagOk = Math.min(pag, maxPag);
    window.logTarPagina[tab] = pagOk;
    const slice = ordenadas.slice(pagOk * tam, pagOk * tam + tam);
    const grupo = (window.logTarGrupo && window.logTarGrupo[tab]) || "";
    let prev = null;
    const html = [];
    slice.forEach(function (f) {
        if (grupo) {
            const g = String(f[grupo] || "Sin grupo");
            if (g !== prev) {
                html.push("<tr class=\"log-tar-grupo\"><td colspan=\"" + (cols.length + 1 + extra) + "\">" + escLogTar_(g) + "</td></tr>");
                prev = g;
            }
        }
        const vieja = typeof logTarVieja_ === "function" && logTarVieja_(f);
        const marca = extra ? "<td class=\"lt-sel\"><input type=\"checkbox\" data-sel=\"1\"" + (window.logTarSel && window.logTarSel[f.id] ? " checked" : "") + "></td>" : "";
        html.push("<tr data-id=\"" + escLogTar_(f.id) + "\" class=\"" + (f.preferida === "S" ? "lt-pref" : "") + (vieja ? " lt-vieja" : "") + "\">" + marca +
            cols.map(function (c) { return "<td>" + logTarCelda_(tab, f, c) + "</td>"; }).join("") +
            "<td class=\"text-nowrap\"><button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-lt=\"dup\" title=\"Duplicar\">Duplicar</button> <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-lt=\"del\" title=\"Quitar\">×</button></td></tr>");
    });
    const vacioTxt = (window.logTarifas[tab] || []).length ? "Ninguna tarifa coincide con la búsqueda." : "Todavía no hay tarifas. Agrega la primera.";
    body.innerHTML = html.length ? html.join("") : "<tr><td colspan=\"" + (cols.length + 1 + extra) + "\" class=\"text-muted\">" + vacioTxt + "</td></tr>";
    if (tab === "destino") {
        logTarLlenarSelectPais_(document.getElementById("logTarSimPais"));
        logTarLlenarSelectPais_(document.getElementById("logTarCopiaPais"));
        const todo = document.getElementById("logTarSelTodo");
        const boxes = document.querySelectorAll("#logTarBody [data-sel]");
        if (todo) todo.checked = boxes.length > 0 && Array.prototype.every.call(boxes, function (b) { return b.checked; });
    }
    logTarAplicarOff_();
    logTarPintarPager_(ordenadas.length, pagOk, tam);
    const btnOrden = document.getElementById("logTarOrdenFecha");
    if (btnOrden && !btnOrden.getAttribute("data-on")) {
        btnOrden.setAttribute("data-on", "1");
    }
}

function logTarAplicarOff_() {
    document.querySelectorAll("#logTarBody .lt-off").forEach(function (el) { el.disabled = true; });
}

function logTarPintarPager_(total, pag, tam) {
    const info = document.getElementById("logTarInfo");
    const nums = document.getElementById("logTarPager");
    const pie = document.getElementById("logTarPie");
    const desde = total ? pag * tam + 1 : 0;
    const hasta = Math.min(total, (pag + 1) * tam);
    if (info) info.textContent = "Mostrando " + desde + "–" + hasta + " de " + total;
    const pages = Math.max(1, Math.ceil(total / tam));
    if (pie) pie.textContent = "Página " + (pag + 1) + " de " + pages;
    if (!nums) return;
    let start = Math.max(0, Math.min(pag - 3, pages - 7));
    const end = Math.min(pages, start + 7);
    start = Math.max(0, end - 7);
    let html = "<button type=\"button\" class=\"catalogo-pager-btn\" data-pg=\"prev\"" + (pag <= 0 ? " disabled" : "") + ">‹</button>";
    for (let i = start; i < end; i++) {
        html += "<button type=\"button\" class=\"catalogo-pager-btn" + (i === pag ? " is-current" : "") + "\" data-pg=\"" + i + "\">" + (i + 1) + "</button>";
    }
    html += "<button type=\"button\" class=\"catalogo-pager-btn\" data-pg=\"next\"" + (pag >= pages - 1 ? " disabled" : "") + ">›</button>";
    nums.innerHTML = html;
}

function logAjustesVista(vista) {
    logTarPintarNav_();
    const id = LOG_TAR_TABS.some(function (t) { return t[0] === vista; }) ? vista : "origen";
    if (window.logTarTab && window.logTarTab !== "aranceles") logTarFlush_();
    window.logTarTab = id;
    const panel = document.getElementById("logTarPanel");
    const ar = document.getElementById("logVistaAranceles");
    if (panel) panel.hidden = id === "aranceles";
    if (ar) ar.hidden = id !== "aranceles";
    document.querySelectorAll("#logTarNav [data-log-vista]").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-log-vista") === id);
    });
    try { sessionStorage.setItem("logAjustesVista", id); } catch (e) {}
    if (id !== "aranceles") logTarPintar_();
}

function logTarAgregar_() {
    logTarFlush_();
    const tab = window.logTarTab || "origen";
    if (!window.logTarifas[tab]) return;
    const row = logTarNueva_(tab);
    window.logTarifas[tab].push(row);
    logTarDejarUnaPreferida_(tab, row);
    const tam = Number(window.logTarTam) || 25;
    window.logTarPagina[tab] = Math.floor((window.logTarifas[tab].length - 1) / tam);
    const buscar = document.getElementById("logTarBuscar");
    if (buscar) buscar.value = "";
    logTarPintar_();
}

function logTarDejarUnaPreferida_(tab, row) {
    if (row.preferida !== "S" || typeof logTarGrupo_ !== "function") return false;
    const g = logTarGrupo_(tab, row);
    let cambio = false;
    (window.logTarifas[tab] || []).forEach(function (o) {
        if (o !== row && o.preferida === "S" && logTarGrupo_(tab, o) === g) {
            o.preferida = "N";
            cambio = true;
        }
    });
    if (cambio) {
        const body = document.getElementById("logTarBody");
        if (body) body.querySelectorAll("tr[data-id]").forEach(function (tr) {
            const o = (window.logTarifas[tab] || []).find(function (r) { return r.id === tr.getAttribute("data-id"); });
            const box = tr.querySelector("[data-k='preferida']");
            if (o && box) {
                box.checked = o.preferida === "S";
                tr.classList.toggle("lt-pref", o.preferida === "S");
            }
        });
    }
    return cambio;
}

function logTarInit_() {
    logTarPintarNav_();
    const body = document.getElementById("logTarBody");
    if (!body || body.getAttribute("data-on")) return;
    body.setAttribute("data-on", "1");
    body.addEventListener("focusin", function (ev) {
        if (ev.target.getAttribute("data-k") === "concepto") logTarMenuAbrir_(ev.target);
    });
    body.addEventListener("input", function (ev) {
        if (ev.target.getAttribute("data-k") === "concepto") logTarMenuAbrir_(ev.target);
        logTarFlush_();
        const tr = ev.target.closest("tr[data-id]");
        if (!tr) return;
        const tab = window.logTarTab;
        const row = (window.logTarifas[tab] || []).find(function (r) { return r.id === tr.getAttribute("data-id"); });
        if (!row) return;
        if (row.preferida === "S") logTarDejarUnaPreferida_(tab, row);
        if (ev.target.getAttribute("data-k") === "forma") logTarPintar_();
        else tr.classList.toggle("lt-vieja", typeof logTarVieja_ === "function" && logTarVieja_(row));
    });
    body.addEventListener("change", function (ev) {
        if (ev.target.getAttribute("data-sel")) {
            if (!window.logTarSel) window.logTarSel = {};
            const tr = ev.target.closest("tr[data-id]");
            if (!tr) return;
            const id = tr.getAttribute("data-id");
            if (ev.target.checked) window.logTarSel[id] = 1;
            else delete window.logTarSel[id];
            return;
        }
        if (ev.target.getAttribute("data-k") === "preferida") {
            logTarFlush_();
            const tr = ev.target.closest("tr[data-id]");
            const tab = window.logTarTab;
            const row = tr && (window.logTarifas[tab] || []).find(function (r) { return r.id === tr.getAttribute("data-id"); });
            if (row) logTarDejarUnaPreferida_(tab, row);
            logTarPintar_();
        }
    });
    body.addEventListener("click", function (ev) {
        const btn = ev.target.closest("[data-lt]");
        if (!btn) return;
        const tr = btn.closest("tr[data-id]");
        const tab = window.logTarTab;
        const lista = window.logTarifas[tab] || [];
        logTarFlush_();
        if (btn.getAttribute("data-lt") === "otro") {
            const row = tr && lista.find(function (r) { return r.id === tr.getAttribute("data-id"); });
            if (!row) return;
            row.otros = (row.otros || []).concat([{ nombre: "", precio: "", moneda: row.moneda || "USD" }]);
            logTarPintar_();
            return;
        }
        if (!tr) return;
        const i = lista.findIndex(function (r) { return r.id === tr.getAttribute("data-id"); });
        if (i < 0) return;
        if (btn.getAttribute("data-lt") === "del") lista.splice(i, 1);
        if (btn.getAttribute("data-lt") === "dup") {
            const copia = JSON.parse(JSON.stringify(lista[i]));
            copia.id = logTarId_();
            copia.preferida = "N";
            copia.fecha = logTarHoy_();
            lista.splice(i + 1, 0, copia);
        }
        logTarPintar_();
    });
    const buscar = document.getElementById("logTarBuscar");
    if (buscar) buscar.addEventListener("input", function () {
        logTarFlush_();
        window.logTarPagina[window.logTarTab] = 0;
        logTarPintar_();
    });
    const filtro = document.getElementById("logTarFiltroMod");
    if (filtro) filtro.addEventListener("change", function () {
        logTarFlush_();
        window.logTarPagina[window.logTarTab] = 0;
        logTarPintar_();
    });
    const solo = document.getElementById("logTarSoloPref");
    if (solo) solo.addEventListener("change", function () { logTarFlush_(); logTarPintar_(); });
    const agr = document.getElementById("logTarAgrupar");
    if (agr) agr.addEventListener("change", function () {
        window.logTarGrupo[window.logTarTab] = agr.value;
        logTarPintar_();
    });
    const tam = document.getElementById("logTarTam");
    if (tam) tam.addEventListener("change", function () {
        window.logTarTam = Number(tam.value) || 25;
        window.logTarPagina[window.logTarTab] = 0;
        logTarPintar_();
    });
    const nums = document.getElementById("logTarPager");
    if (nums) nums.addEventListener("click", function (ev) {
        const b = ev.target.closest("[data-pg]");
        if (!b || b.disabled) return;
        const tab = window.logTarTab;
        const actual = window.logTarPagina[tab] || 0;
        const pg = b.getAttribute("data-pg");
        window.logTarPagina[tab] = pg === "prev" ? actual - 1 : pg === "next" ? actual + 1 : Number(pg);
        logTarFlush_();
        logTarPintar_();
    });
    document.getElementById("logTarPanel").addEventListener("click", function (ev) {
        if (ev.target && ev.target.id === "logTarOrdenFecha") {
            window.logTarOrden = (window.logTarOrden || "desc") === "desc" ? "asc" : "desc";
            logTarPintar_();
        }
    });
    document.getElementById("logTarPanel").addEventListener("change", function (ev) {
        if (!ev.target || ev.target.id !== "logTarSelTodo") return;
        if (!window.logTarSel) window.logTarSel = {};
        document.querySelectorAll("#logTarBody [data-sel]").forEach(function (box) {
            box.checked = ev.target.checked;
            const id = box.closest("tr").getAttribute("data-id");
            if (ev.target.checked) window.logTarSel[id] = 1;
            else delete window.logTarSel[id];
        });
    });
    body.addEventListener("mouseover", function (ev) {
        const el = ev.target.closest("input, select");
        if (!el || el.type === "checkbox" || el.type === "number") return;
        const txt = el.tagName === "SELECT" ? ((el.options[el.selectedIndex] || {}).text || "") : String(el.value || "");
        const corto = el.tagName !== "SELECT" && el.scrollWidth <= el.clientWidth + 2;
        const largo = el.tagName === "SELECT" ? txt.length > 12 && txt !== "País" : txt.length >= 18 || !corto;
        if (!txt || !largo) { logTarTipOcultar_(); return; }
        logTarTip_(txt, ev);
    });
    body.addEventListener("mouseout", function (ev) {
        if (ev.target.closest("input, select")) logTarTipOcultar_();
    });
    if (!window.logTarMenuDoc) {
        window.logTarMenuDoc = 1;
        document.addEventListener("mousedown", function (ev) {
            if (!document.getElementById("logTarMenu")) return;
            if (ev.target.closest("#logTarMenu") || (ev.target.getAttribute && (ev.target.getAttribute("data-k") === "concepto" || ev.target.getAttribute("data-ciudad")))) return;
            logTarMenuCerrar_();
        });
    }
    const btn = document.getElementById("logTarAgregar");
    if (btn) btn.addEventListener("click", logTarAgregar_);
    const sim = document.getElementById("logTarSimBtn");
    if (sim) sim.addEventListener("click", logTarSimularClick_);
    ["logTarSimCiudad", "logTarCopiaCiudad"].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("focus", function () { logTarMenuCiudad_(el); });
        el.addEventListener("input", function () { logTarMenuCiudad_(el); });
    });
    ["logTarSimPais", "logTarCopiaPais"].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", function () {
            const ciudad = document.getElementById(id === "logTarSimPais" ? "logTarSimCiudad" : "logTarCopiaCiudad");
            if (ciudad && document.activeElement === ciudad) logTarMenuCiudad_(ciudad);
        });
    });
    const copia = document.getElementById("logTarCopiaBtn");
    if (copia) copia.addEventListener("click", logTarDuplicarCiudad_);
}

function logTarMenuCerrar_() {
    const menu = document.getElementById("logTarMenu");
    if (menu) menu.remove();
}

function logTarMenuAbrir_(input) {
    logTarMenuCerrar_();
    const tab = window.logTarTab;
    const escrito = String(input.value || "").trim();
    const q = escrito.toLowerCase();
    const todos = logTarConceptosDe_(tab);
    const lista = todos.filter(function (s) { return !q || s.toLowerCase().indexOf(q) >= 0; });
    const ya = todos.some(function (s) { return s.toLowerCase() === q; });
    const menu = document.createElement("div");
    menu.id = "logTarMenu";
    menu.className = "lt-menu";
    const rect = input.getBoundingClientRect();
    menu.style.left = Math.max(8, rect.left) + "px";
    menu.style.top = (rect.bottom + 4) + "px";
    menu.style.width = Math.max(rect.width, 240) + "px";
    let html = lista.map(function (s) {
        return "<button type=\"button\" data-c=\"" + escLogTar_(s) + "\">" + escLogTar_(s) + "</button>";
    }).join("");
    if (escrito && !ya) html += "<button type=\"button\" class=\"lt-menu-nuevo\" data-nuevo=\"1\">Agregar «" + escLogTar_(escrito) + "»</button>";
    if (!html) html = "<div class=\"lt-menu-vacio\">Escribe un concepto y agrégalo.</div>";
    menu.innerHTML = html;
    document.body.appendChild(menu);
    menu.addEventListener("mousedown", function (ev) {
        const b = ev.target.closest("button");
        if (!b) return;
        ev.preventDefault();
        const nombre = b.getAttribute("data-nuevo") ? escrito : b.getAttribute("data-c");
        if (b.getAttribute("data-nuevo")) {
            if (!window.logTarConceptos) window.logTarConceptos = { origen: [], destino: [] };
            if (!window.logTarConceptos[tab]) window.logTarConceptos[tab] = [];
            if (window.logTarConceptos[tab].indexOf(nombre) < 0) window.logTarConceptos[tab].push(nombre);
        }
        input.value = nombre;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        logTarMenuCerrar_();
    });
}

function logTarTip_(txt, ev) {
    let tip = document.getElementById("mtxFloatTip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "mtxFloatTip";
        tip.className = "mtx-float-tip";
        document.body.appendChild(tip);
    }
    tip.textContent = txt;
    tip.style.display = "block";
    tip.style.left = Math.min(ev.clientX + 12, window.innerWidth - 360) + "px";
    tip.style.top = (ev.clientY + 16) + "px";
}

function logTarTipOcultar_() {
    const tip = document.getElementById("mtxFloatTip");
    if (tip) tip.style.display = "none";
}

function logTarLlenarSelectPais_(sel) {
    if (!sel || typeof logPaisesFuente_ !== "function") return;
    const v = sel.value;
    const ops = [["", "País"]];
    logPaisesFuente_().forEach(function (x) { if (x && x.nombre) ops.push([x.nombre, x.nombre]); });
    if (v && !ops.some(function (o) { return o[0] === v; })) ops.splice(1, 0, [v, v]);
    sel.innerHTML = ops.map(function (o) {
        return "<option value=\"" + escLogTar_(o[0]) + "\">" + escLogTar_(o[1]) + "</option>";
    }).join("");
    sel.value = v;
}

function logTarCiudadesDe_(pais) {
    const n = typeof logTarNorm_ === "function" ? logTarNorm_ : function (s) { return String(s || "").trim().toLowerCase(); };
    const want = n(pais);
    const out = [];
    ((window.logTarifas && window.logTarifas.destino) || []).forEach(function (f) {
        if (want && n(f.pais) !== want) return;
        const c = String(f.ciudad || "").trim();
        if (c && out.indexOf(c) < 0) out.push(c);
    });
    out.sort(function (a, b) { return a.localeCompare(b, "es"); });
    return out;
}

function logTarMenuCiudad_(input) {
    logTarMenuCerrar_();
    const paisId = input.id === "logTarCopiaCiudad" ? "logTarCopiaPais" : "logTarSimPais";
    const paisEl = document.getElementById(paisId);
    const q = String(input.value || "").trim().toLowerCase();
    const lista = logTarCiudadesDe_(paisEl ? paisEl.value : "").filter(function (s) { return !q || s.toLowerCase().indexOf(q) >= 0; });
    if (!lista.length) return;
    const menu = document.createElement("div");
    menu.id = "logTarMenu";
    menu.className = "lt-menu";
    const rect = input.getBoundingClientRect();
    menu.style.left = Math.max(8, rect.left) + "px";
    menu.style.top = (rect.bottom + 4) + "px";
    menu.style.width = Math.max(rect.width, 180) + "px";
    menu.innerHTML = lista.map(function (s) {
        return "<button type=\"button\" data-c=\"" + escLogTar_(s) + "\">" + escLogTar_(s) + "</button>";
    }).join("");
    document.body.appendChild(menu);
    menu.addEventListener("mousedown", function (ev) {
        const b = ev.target.closest("button");
        if (!b) return;
        ev.preventDefault();
        input.value = b.getAttribute("data-c") || "";
        logTarMenuCerrar_();
    });
}

function logTarDuplicarCiudad_() {
    logTarFlush_();
    const pais = (document.getElementById("logTarCopiaPais") || {}).value || "";
    const ciudad = String((document.getElementById("logTarCopiaCiudad") || {}).value || "").trim();
    const avisar = function (m) { if (typeof mostrarNotificacion === "function") mostrarNotificacion(m, "warning"); };
    if (!pais || !ciudad) { avisar("Elige el país y la ciudad de destino."); return; }
    const lista = (window.logTarifas && window.logTarifas.destino) || [];
    const ids = Object.keys(window.logTarSel || {});
    if (!ids.length) { avisar("Marca las filas que quieres copiar."); return; }
    let n = 0;
    ids.forEach(function (id) {
        const f = lista.find(function (r) { return r.id === id; });
        if (!f) return;
        const copia = JSON.parse(JSON.stringify(f));
        copia.id = logTarId_();
        copia.pais = pais;
        copia.ciudad = ciudad;
        copia.fecha = logTarHoy_();
        copia.preferida = "S";
        lista.push(copia);
        logTarDejarUnaPreferida_("destino", copia);
        n += 1;
    });
    window.logTarSel = {};
    logTarPintar_();
    if (n && typeof mostrarNotificacion === "function") mostrarNotificacion("Se copiaron " + n + " cargos a " + ciudad + ".", "success");
}

function logTarSimularClick_() {
    logTarFlush_();
    const g = function (id) { const el = document.getElementById(id); return el ? el.value : ""; };
    const r = typeof logTarSimularDestino_ === "function" ? logTarSimularDestino_({
        pais: g("logTarSimPais"),
        ciudad: g("logTarSimCiudad"),
        modalidad: g("logTarSimMod"),
        kg: g("logTarSimKg"),
        m3: g("logTarSimM3"),
        valor: g("logTarSimValor"),
        c20: g("logTarSim20"),
        c40: g("logTarSim40"),
        c40hc: g("logTarSimHc")
    }) : { total: 0, notas: [], uso: 0 };
    const out = document.getElementById("logTarSimOut");
    if (!out) return;
    if (!r.uso) {
        out.innerHTML = "<span class=\"text-muted\">No hay cargos preferidos para ese destino.</span>";
        return;
    }
    out.innerHTML = "<strong>" + r.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD</strong><br>" +
        r.notas.map(function (t) { return escLogTar_(t); }).join("<br>");
}

async function sincronizarArancelesUI() {
    const email = localStorage.getItem("smartbudget_email");
    const btn = document.getElementById("btnSyncAranceles");
    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sincronizando...'; }
    try {
        const data = await realizarPeticionBD({ action: "aranceles_sincronizar", email: email }, { timeoutMs: 120000 });
        if (!data.exito) throw new Error(data.mensaje || "Sin respuesta");
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(data.mensaje, "success");
        await refrescarEstadoAranceles();
        if (typeof fusionarPartidasDesdeArancel_ === "function") fusionarPartidasDesdeArancel_();
        if (typeof logCargarAranceles_ === "function") logCargarAranceles_();
    } catch (e) {
        const m = /Acci[oó]n no v[aá]lida/i.test(e.message || "")
            ? "El web app publicado todavía no tiene esta sync. Pega backend.gs y publica una versión nueva."
            : ("Error sincronizando aranceles: " + e.message);
        if (typeof mostrarNotificacion === "function") mostrarNotificacion(m, "danger");
    } finally {
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

var _tycDraft = null;
var _tycLang = "es";
var _tycFocus = null;
var TYC_VAR_CAMPOS = [
    { k: "validez", label: "Validez" },
    { k: "tope_prototipo", label: "Tope prototipo" },
    { k: "min_orden_prototipo", label: "Mín. orden" },
    { k: "plazo_prod", label: "Plazo ES" },
    { k: "plazo_prod_en", label: "Plazo EN" },
    { k: "dias_bodega", label: "Bodegaje" },
    { k: "anticipo", label: "Anticipo" },
    { k: "saldo", label: "Saldo" },
    { k: "garantia", label: "Garantía" }
];
var TYC_VAR_COTIZ = [
    { k: "cliente", label: "Cliente" },
    { k: "codigo", label: "Código" },
    { k: "ciudad", label: "Ciudad" },
    { k: "fecha", label: "Fecha" },
    { k: "comercial", label: "Comercial" },
    { k: "moneda", label: "Moneda" },
    { k: "total", label: "Total" }
];

function tycClonar_(o) { return JSON.parse(JSON.stringify(o == null ? {} : o)); }

function tycDocBase_() {
    if (typeof logTycDoc_ === "function") return tycClonar_(logTycDoc_());
    return { vars: {}, es: { titulo: "", secciones: [] }, en: { titulo: "", secciones: [] } };
}

function tycMarcarFocus_(el) { _tycFocus = el; }

function pintarChipsTyc() {
    const box = document.getElementById("tycChips");
    if (!box) return;
    const chip = function (k, auto) {
        return "<button type=\"button\" class=\"tyc-chip" + (auto ? " is-auto" : "") + "\" title=\"" +
            (auto ? "Se llena al emitir la cotización" : "Variable de empresa") +
            "\" onclick=\"tycInsertarVar('" + k + "')\">{{" + k + "}}</button>";
    };
    box.innerHTML = TYC_VAR_CAMPOS.map(function (v) { return chip(v.k, false); }).join("") +
        TYC_VAR_COTIZ.map(function (v) { return chip(v.k, true); }).join("");
}

function tycItemHtml_(it) {
    it = it || { k: "", v: "" };
    return "<div class=\"tyc-item-ed\">" +
        "<input class=\"form-control form-control-sm\" data-tyc=\"k\" placeholder=\"Etiqueta\" value=\"" + escHtml(it.k || "") + "\">" +
        "<textarea class=\"form-control form-control-sm\" data-tyc=\"v\" rows=\"3\" placeholder=\"Texto\">" + escHtml(it.v || "") + "</textarea>" +
        "<button type=\"button\" class=\"admin-icon-btn\" title=\"Quitar párrafo\" onclick=\"tycQuitarItem(this)\"><i class=\"bi bi-trash3\"></i></button>" +
        "</div>";
}

function tycSeccionHtml_(sec, i) {
    sec = sec || { id: "s" + (i + 1), t: "", items: [] };
    const items = (sec.items && sec.items.length) ? sec.items : [{ k: "", v: "" }];
    return "<div class=\"tyc-sec-ed\" data-sid=\"" + escHtml(sec.id || ("s" + (i + 1))) + "\">" +
        "<div class=\"tyc-sec-ed-head\">" +
        "<input class=\"form-control form-control-sm\" data-tyc=\"sec-t\" placeholder=\"Título de la sección\" value=\"" + escHtml(sec.t || "") + "\">" +
        "<button type=\"button\" class=\"btn admin-btn\" onclick=\"tycAgregarItem(this)\"><i class=\"bi bi-plus-lg\"></i></button>" +
        "<button type=\"button\" class=\"admin-icon-btn\" title=\"Quitar sección\" onclick=\"tycQuitarSeccion(this)\"><i class=\"bi bi-trash3\"></i></button>" +
        "</div><div class=\"tyc-sec-ed-items\">" + items.map(tycItemHtml_).join("") + "</div></div>";
}

function tycEnlazarFocus_() {
    const root = document.getElementById("panel-tyc");
    if (!root || root.dataset.tycFocusBound) return;
    root.dataset.tycFocusBound = "1";
    root.addEventListener("focusin", function (e) {
        const el = e.target;
        if (el && (el.matches("textarea, input") && el.closest("#tycSecciones, #tycTitulo"))) tycMarcarFocus_(el);
    });
}

function pintarTextosTyc() {
    if (!_tycDraft) return;
    const lib = _tycDraft[_tycLang] || { titulo: "", secciones: [] };
    const tit = document.getElementById("tycTitulo");
    if (tit) tit.value = lib.titulo || "";
    const box = document.getElementById("tycSecciones");
    if (box) box.innerHTML = (lib.secciones || []).map(tycSeccionHtml_).join("");
    document.getElementById("tycLangEs")?.classList.toggle("is-on", _tycLang === "es");
    document.getElementById("tycLangEn")?.classList.toggle("is-on", _tycLang === "en");
}

function pintarEditorTyc() {
    _tycDraft = tycDocBase_();
    _tycLang = "es";
    const vars = _tycDraft.vars || {};
    TYC_VAR_CAMPOS.forEach(function (v) {
        const el = document.getElementById("tycVar_" + v.k);
        if (el) el.value = vars[v.k] != null ? vars[v.k] : "";
    });
    pintarChipsTyc();
    pintarTextosTyc();
    tycEnlazarFocus_();
}

function leerIdiomaTyc_() {
    const vars = {};
    TYC_VAR_CAMPOS.forEach(function (v) {
        vars[v.k] = (document.getElementById("tycVar_" + v.k)?.value || "").trim();
    });
    const secciones = [];
    document.querySelectorAll("#tycSecciones .tyc-sec-ed").forEach(function (sec, i) {
        const items = [];
        sec.querySelectorAll(".tyc-item-ed").forEach(function (it) {
            items.push({
                k: it.querySelector('[data-tyc="k"]')?.value || "",
                v: it.querySelector('[data-tyc="v"]')?.value || ""
            });
        });
        secciones.push({
            id: sec.getAttribute("data-sid") || ("s" + (i + 1)),
            t: sec.querySelector('[data-tyc="sec-t"]')?.value || "",
            items: items
        });
    });
    if (!_tycDraft) _tycDraft = tycDocBase_();
    _tycDraft.vars = vars;
    _tycDraft[_tycLang] = {
        titulo: document.getElementById("tycTitulo")?.value || "",
        secciones: secciones
    };
    return _tycDraft;
}

function leerTycUI() {
    if (document.getElementById("tycSecciones")) return tycClonar_(leerIdiomaTyc_());
    if (typeof logTycDoc_ === "function") return tycClonar_(logTycDoc_());
    return (CONFIG_GLOBAL && CONFIG_GLOBAL.tyc) ? tycClonar_(CONFIG_GLOBAL.tyc) : null;
}

function tycCambiarIdioma(lang) {
    if (lang !== "es" && lang !== "en") return;
    leerIdiomaTyc_();
    _tycLang = lang;
    pintarTextosTyc();
}

function tycRestaurarIdioma() {
    if (typeof logTycDefault_ !== "function") return;
    leerIdiomaTyc_();
    _tycDraft[_tycLang] = tycClonar_(logTycDefault_(_tycLang));
    pintarTextosTyc();
}

function tycAgregarSeccion() {
    leerIdiomaTyc_();
    const n = ((_tycDraft[_tycLang] && _tycDraft[_tycLang].secciones) || []).length + 1;
    (_tycDraft[_tycLang].secciones || (_tycDraft[_tycLang].secciones = [])).push({
        id: "s" + n, t: "", items: [{ k: "", v: "" }]
    });
    pintarTextosTyc();
}

function tycQuitarSeccion(btn) {
    btn.closest(".tyc-sec-ed")?.remove();
}

function tycAgregarItem(btn) {
    const box = btn.closest(".tyc-sec-ed")?.querySelector(".tyc-sec-ed-items");
    if (box) box.insertAdjacentHTML("beforeend", tycItemHtml_({ k: "", v: "" }));
}

function tycQuitarItem(btn) {
    const wrap = btn.closest(".tyc-sec-ed-items");
    btn.closest(".tyc-item-ed")?.remove();
    if (wrap && !wrap.querySelector(".tyc-item-ed")) wrap.insertAdjacentHTML("beforeend", tycItemHtml_({ k: "", v: "" }));
}

function memClonar_(o) { return JSON.parse(JSON.stringify(o == null ? {} : o)); }

function memDocBase_() {
    if (typeof logMembreteDefault_ === "function") return memClonar_(logMembreteDefault_());
    return { logo: "", qr: "", firmaImg: "", web: "", oficinas: [] };
}

function memEsData_(s) { return /^data:image\//i.test(String(s || "")); }

function memSetPrev_(id, src, custom) {
    const el = document.getElementById(id);
    if (!el) return;
    el.src = src || "";
    el.dataset.custom = custom ? "1" : "";
    el.style.display = src ? "" : "none";
}

function memLeerPrev_(id) {
    const el = document.getElementById(id);
    if (!el || el.dataset.custom !== "1") return "";
    return memEsData_(el.src) ? el.src : "";
}

function memLeerArchivo_(file, maxW, maxH, cb) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
        const img = new Image();
        img.onload = function () {
            let w = img.width || 1, h = img.height || 1;
            const s = Math.min(1, maxW / w, maxH / h);
            w = Math.max(1, Math.round(w * s));
            h = Math.max(1, Math.round(h * s));
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            let out = c.toDataURL("image/png");
            if (out.length > 420000) out = c.toDataURL("image/jpeg", 0.88);
            cb(out);
        };
        img.onerror = function () { cb(reader.result); };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

function memOficinaHtml_(of) {
    of = of || { titulo: "", tel: "", dir1: "", dir2: "" };
    return "<div class=\"mem-ofi\">" +
        "<div class=\"admin-field\"><label>Título</label><input class=\"form-control form-control-sm\" data-mem=\"titulo\" value=\"" + escHtml(of.titulo || "") + "\"></div>" +
        "<div class=\"admin-field\"><label>Teléfono</label><input class=\"form-control form-control-sm\" data-mem=\"tel\" value=\"" + escHtml(of.tel || "") + "\"></div>" +
        "<button type=\"button\" class=\"admin-icon-btn\" title=\"Quitar oficina\" onclick=\"memQuitarOficina(this)\"><i class=\"bi bi-trash3\"></i></button>" +
        "<div class=\"admin-field mem-ofi-dir\"><label>Dirección (línea 1)</label><input class=\"form-control form-control-sm\" data-mem=\"dir1\" value=\"" + escHtml(of.dir1 || "") + "\"></div>" +
        "<div class=\"admin-field mem-ofi-dir\"><label>Dirección (línea 2)</label><input class=\"form-control form-control-sm\" data-mem=\"dir2\" value=\"" + escHtml(of.dir2 || "") + "\"></div>" +
        "</div>";
}

function memEnlazarArchivos_() {
    const root = document.getElementById("panel-membrete");
    if (!root || root.dataset.memBound) return;
    root.dataset.memBound = "1";
    const bind = function (inputId, prevId, maxW, maxH) {
        const inp = document.getElementById(inputId);
        if (!inp) return;
        inp.addEventListener("change", function () {
            const file = inp.files && inp.files[0];
            if (!file) return;
            memLeerArchivo_(file, maxW, maxH, function (data) {
                memSetPrev_(prevId, data, true);
                inp.value = "";
            });
        });
    };
    bind("memLogoFile", "memLogoPrev", 1400, 480);
    bind("memQrFile", "memQrPrev", 560, 560);
    bind("memFirmaFile", "memFirmaPrev", 1000, 360);
}

function pintarEditorMembrete() {
    const raw = (CONFIG_GLOBAL && CONFIG_GLOBAL.membrete) ? CONFIG_GLOBAL.membrete : {};
    const def = memDocBase_();
    const live = (typeof logMembreteDoc_ === "function") ? logMembreteDoc_() : def;
    memSetPrev_("memLogoPrev", live.logo, memEsData_(raw.logo));
    memSetPrev_("memQrPrev", live.qr, memEsData_(raw.qr));
    memSetPrev_("memFirmaPrev", live.firmaImg || "", memEsData_(raw.firmaImg));
    const web = document.getElementById("memWeb");
    if (web) web.value = live.web || "";
    const box = document.getElementById("memOficinas");
    if (box) box.innerHTML = (live.oficinas && live.oficinas.length ? live.oficinas : def.oficinas).map(memOficinaHtml_).join("");
    memEnlazarArchivos_();
}

function leerMembreteUI() {
    if (!document.getElementById("memOficinas")) {
        if (CONFIG_GLOBAL && CONFIG_GLOBAL.membrete) return memClonar_(CONFIG_GLOBAL.membrete);
        return memDocBase_();
    }
    const oficinas = [];
    document.querySelectorAll("#memOficinas .mem-ofi").forEach(function (el) {
        oficinas.push({
            titulo: el.querySelector('[data-mem="titulo"]')?.value || "",
            tel: el.querySelector('[data-mem="tel"]')?.value || "",
            dir1: el.querySelector('[data-mem="dir1"]')?.value || "",
            dir2: el.querySelector('[data-mem="dir2"]')?.value || ""
        });
    });
    return {
        logo: memLeerPrev_("memLogoPrev"),
        qr: memLeerPrev_("memQrPrev"),
        firmaImg: memLeerPrev_("memFirmaPrev"),
        web: (document.getElementById("memWeb")?.value || "").trim(),
        oficinas: oficinas
    };
}

function memRestaurar() {
    const def = memDocBase_();
    memSetPrev_("memLogoPrev", "assets/membrete-demo/logo-diforma.png", false);
    memSetPrev_("memQrPrev", "assets/membrete-demo/qr-diforma.png", false);
    memSetPrev_("memFirmaPrev", "", false);
    const web = document.getElementById("memWeb");
    if (web) web.value = def.web || "";
    const box = document.getElementById("memOficinas");
    if (box) box.innerHTML = (def.oficinas || []).map(memOficinaHtml_).join("");
}

function memAgregarOficina() {
    const box = document.getElementById("memOficinas");
    if (box) box.insertAdjacentHTML("beforeend", memOficinaHtml_({ titulo: "", tel: "", dir1: "", dir2: "" }));
}

function memQuitarOficina(btn) {
    btn.closest(".mem-ofi")?.remove();
}

function memQuitarFirma() {
    memSetPrev_("memFirmaPrev", "", false);
}

function tycInsertarVar(k) {
    const el = _tycFocus;
    const token = "{{" + k + "}}";
    if (!el) {
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("Pon el cursor en un texto para insertar {{" + k + "}}.", "info");
        return;
    }
    if (typeof el.selectionStart === "number") {
        const start = el.selectionStart, end = el.selectionEnd, val = el.value || "";
        el.value = val.slice(0, start) + token + val.slice(end);
        el.focus();
        el.selectionStart = el.selectionEnd = start + token.length;
        return;
    }
    el.value = (el.value || "") + token;
    el.focus();
}

async function guardarConfiguracion() {
    if (_configHojaFallo) {
        pintarAvisoConfigRemota_();
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("No se guardó: no se pudo leer la configuración de la empresa.", "danger");
        return;
    }
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
        partidas: JSON.stringify(partidasParaGuardar_()),
        logTrm: getVal('cfgLogTrm') || 0,
        logMeses: getVal('cfgLogMeses') || 6,
        logTarifas: JSON.stringify((typeof logTarParaGuardar_ === "function") ? logTarParaGuardar_() : (CONFIG_GLOBAL.logTarifas || {})),
        diasVigencia: { materiales: getVal('cfgDiasVigMat') || 180, procesos: getVal('cfgDiasVigProc') || 90 },
        operativos: { topeFab: getVal('cfgTopeOpFab'), topeCom: getVal('cfgTopeOpCom'), impFab: { max: getVal('cfgImpFabMax'), min: getVal('cfgImpFabMin') }, indFab: { max: getVal('cfgIndFabMax'), min: getVal('cfgIndFabMin') }, indCom: { max: getVal('cfgIndComMax'), min: getVal('cfgIndComMin') } },
        utilidadNal: { fab: { tope: getVal('n_fabTope'), max: getVal('n_fabMax'), min: getVal('n_fabMin') }, com: { tope: getVal('n_comTope'), max: getVal('n_comMax'), min: getVal('n_comMin') } },
        utilidadExp: { fab: { tope: getVal('e_fabTope'), max: getVal('e_fabMax'), min: getVal('e_fabMin') }, com: { tope: getVal('e_comTope'), max: getVal('e_comMax'), min: getVal('e_comMin') } },
        tyc: (typeof leerTycUI === "function") ? leerTycUI() : (CONFIG_GLOBAL && CONFIG_GLOBAL.tyc) || null,
        membrete: (typeof leerMembreteUI === "function") ? leerMembreteUI() : (CONFIG_GLOBAL && CONFIG_GLOBAL.membrete) || null,
        anchosMatriz: (CONFIG_GLOBAL && CONFIG_GLOBAL.anchosMatriz) || {}
    };
    
    if(typeof mostrarNotificacion === "function") mostrarNotificacion("Sincronizando configuración...", "info");
    try {
        try { await guardarArancelesConAjustes_(); }
        catch (eAr) {
            const m = /Acci[oó]n no v[aá]lida/i.test(eAr.message || "")
                ? "Los aranceles no se guardaron: publica backend.gs (versión nueva de la misma implementación) y vuelve a pulsar Guardar."
                : ("Aranceles: " + eAr.message);
            if (typeof mostrarNotificacion === "function") mostrarNotificacion(m, "danger");
        }
        const res = await fetch(CONFIG_GLOBAL.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'guardar_config', payload: data, email: email, authKey: token }) });
        const resData = await res.json();
        if (resData.exito) {
            CONFIG_GLOBAL = Object.assign({}, CONFIG_GLOBAL || {}, data);
            poblarSelectComisiones();
            if(typeof mostrarNotificacion === "function") mostrarNotificacion(resData.mensaje, "success");
            bootstrap.Modal.getInstance(document.getElementById('modalAdmin'))?.hide();
            if(typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
            if (typeof window.refrescarUsoGemini === "function") window.refrescarUsoGemini();
            if (typeof logisticaActualizarVista === "function") logisticaActualizarVista();
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
