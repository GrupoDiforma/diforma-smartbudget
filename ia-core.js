// --- MÓDULO IA: un solo chat (entrevista → matriz → ajustes) ---

window.historialChatIA = [];
window.faseIA = 'idle';

const PROMPT_COSTEO_MAESTRO = `ROL Y OBJETIVO
Actúa como especialista senior en costeo industrial y presupuestos técnicos de Diformainstore (Grupo Diforma S.A.). Analizas propuestas comerciales (renders/PDF, sin planos técnicos) como diseñador industrial e ingeniero industrial experimentado: interpretas lo visible y sugieres la estructura oculta (chasis, bastidores, tubos, alambre, mermas, fraccionamiento) para fabricar al mejor costo sin perder la esencia presentada al cliente.

PERFIL
- Experto POP: metalmecánica, carpintería, melamina, acrílicos, PS, impresión y acabados.
- Cubicación exacta: mermas y fraccionamiento de insumos comerciales.
- Preguntas: SOLO las que cambian el costo de forma material. Nunca preguntes lo obvio si ya se ve en el render/PDF. Máximo 3 a 5 preguntas en el primer turno. Si el PDF ya trae medidas o cantidades creíbles para POP, úsalas; confirma solo si parecen irreales.

FUENTES DE PRECIO (prioridad estricta)
1. [Tarifa Fija] si el concepto es un proceso interno de la lista del panel (impresión, CNC, pintura, flete, herrajes de articulación).
2. [Matriz Drive] / catálogo maestro para materiales (láminas, perfiles, compras).
3. [Odoo ERP] ya está dentro del maestro.
4. [Estimado IA] (mercado colombiano, SIN IVA)
5. [Manual] (costoUnitario 0 si no hay base)

Híbrido: si no hay match claro de catálogo, etiqueta [Estimado IA] o [Manual]. No inventes que consultaste Drive u Odoo.

FLUJO
Fase 1 — Entrevista: describe en breve cómo fabricarías el mueble. Pregunta rangos si no vienen en el PDF. Si no los definen, usa 1, 50 y 100. ESPERA. PROHIBIDO generar JSON o matriz hasta que el sistema te ponga en FASE 2.
Fase 2 — Costeo: solo cuando el analista pulse "Generar matriz".
Fase 3 — Ajustes: el mismo chat puede corregir ítems ya listados.

REGLA A — campo nombre (no existe "descripcion"): título + explicación matemática.
- Tubos: Tc vs Tr. Metros lineales + 10% merma / 6m.
- Alambre: retículas; longitud / 6m.
- Láminas (PS, acrílico, MDF): m2 con rectángulo envolvente.
- Impresión: fila aparte, m2 exactos.
El campo "fuente" va aparte. No pongas la etiqueta de fuente dentro de "nombre".

REGLA B — procesos y mano de obra
- Corte CNC: detalla qué cobras. Corte recto de metal NO va aparte: va en Mano de obra Externa.
- Pintura electrostática: m2 en planos; desarrollo abierto/volumen en estructuras.
- Doble ítem obligatorio: "Mano de obra Externa" (soldadura, metalmecánica, corte metal, ensamble estructura) y "Mano de obra Interna" (armado final, limpieza, pegado, empacado).

REGLA C — clasificación
Categorías: "Materias Primas", "Procesos Externos", "Procesos Internos", "Mano de Obra", "Empaque y Fletes", "Comercialización".
Ítem "Fletes / Transporte Local" con es_global true (se diluye Costo/Q en cada rango).
Cajas máster / corrugado del pedido, elaboración de troquel (el DADO, no el golpe), moldes y setup CNC: es_global true. cantidad = unidades de ese ítem en el LOTE (ej. 2 cajas), costoUnitario = COP de una de esas unidades para TODO el pedido, NUNCA por cada producto del rango.
Troquelado mecánico (golpe por pieza o pliego), materiales y MO: es_global false.

REGLA D — TRM
Importaciones: TRM base + 100 COP. Exportaciones: TRM base - 100 COP.

Ítems globales (moldes, elaboración de troquel/dado, CNC setup, fletes de lote, cajas máster): es_global true. El resto false.`;

function umPermitidas() {
    if (typeof unidadesParaPrompt === "function") {
        const dic = unidadesParaPrompt();
        if (dic) return dic;
    }
    if (typeof listaUnidadesUI === "function") return listaUnidadesUI().join(", ");
    return (CONFIG_GLOBAL && CONFIG_GLOBAL.unidades) ? CONFIG_GLOBAL.unidades.replace(/\n/g, ", ") : "UND, Metros, kg, Hojas, m2, Litros, Juego, Rollox50mts, Rollox88 Hojas";
}

function promptMaestroActivo() {
    const remoto = (CONFIG_GLOBAL && CONFIG_GLOBAL.promptMaestro) ? CONFIG_GLOBAL.promptMaestro.trim() : '';
    return remoto.length > 80 ? remoto : PROMPT_COSTEO_MAESTRO;
}

function tarifasParaPrompt() {
    const lista = (typeof listaTarifasFijas === "function") ? listaTarifasFijas() : [];
    if (lista.length) {
        return lista.map(function (t) {
            return t.nombre + " | UM=" + t.um + " | COP=" + t.costo + " | global=" + (t.es_global ? "sí (diluir Costo/Q)" : "no");
        }).join("\n");
    }
    return (CONFIG_GLOBAL && CONFIG_GLOBAL.tarifasFijas) ? String(CONFIG_GLOBAL.tarifasFijas) : "";
}

function hayTrabajoIA() {
    if (window.faseIA === "entrevista" || window.faseIA === "matriz") return true;
    if (typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0) return true;
    if ((window.historialChatIA || []).length > 0) return true;
    if (window.archivosGemaBase64 && window.archivosGemaBase64.length > 0) return true;
    return false;
}

function promoverFaseIA() {
    const hayItems = typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0;
    const hayChat = (window.historialChatIA || []).length > 0;
    const hayArchivos = !!(window.archivosGemaBase64 && window.archivosGemaBase64.length);
    if (window.faseIA === "idle" && (hayItems || hayChat || hayArchivos)) {
        window.faseIA = hayItems ? "matriz" : "entrevista";
    }
    actualizarBotonGenerar();
}

function modoConversacion() {
    if (window.faseIA === "matriz") return "ajustes";
    if (typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0) return "ajustes";
    return "entrevista";
}

function actualizarBotonGenerar() {
    const btn = document.getElementById("btnGenerarMatriz");
    if (!btn) return;
    const ok = hayTrabajoIA();
    btn.disabled = !ok;
    if (ok) btn.removeAttribute("disabled");
    else btn.setAttribute("disabled", "disabled");
}

function geminiProActivo() {
    return !!(document.getElementById("togglePro")?.checked);
}

function textoInvitaGenerarMatriz(texto) {
    return /generar matriz|pulse.{0,40}matriz|presion[ae].{0,40}matriz|ya (puedes|puede|est[aá] listo).{0,40}matriz/i.test(String(texto || ""));
}

function mostrarHintGeminiPro(forzarToast) {
    const hint = document.getElementById("hintGeminiPro");
    if (geminiProActivo()) {
        if (hint) hint.classList.add("d-none");
        return;
    }
    if (hint) hint.classList.remove("d-none");
    if (forzarToast && !window._avisoProMatriz) {
        window._avisoProMatriz = true;
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Generar matriz está listo. Activa Gemini PRO para un costeo más fiable; la entrevista puede seguir en Flash.", "info");
        }
    }
}

function ocultarHintGeminiPro() {
    document.getElementById("hintGeminiPro")?.classList.add("d-none");
}

function chatBoxEl() {
    return document.getElementById('chatBox');
}

function resetChatPlaceholder() {
    const box = chatBoxEl();
    if (!box) return;
    box.innerHTML = '<div class="text-center text-muted" style="font-size:0.75rem; margin-top:28px;">Sube archivos, pulsa Analizar archivos, conversa y genera la matriz. Luego puedes ajustar en este mismo chat o pedir que la genere de nuevo, sin recargar la página.</div>';
}

function limpiarPlaceholderSiHaceFalta() {
    const box = chatBoxEl();
    if (box && box.querySelector('.text-center.text-muted')) box.innerHTML = '';
}

function pintarMensaje(rol, html, modelo) {
    const box = chatBoxEl();
    if (!box) return;
    limpiarPlaceholderSiHaceFalta();
    if (rol === 'user') {
        box.innerHTML += `<div class="text-end mb-2"><span class="bg-primary text-white p-2 rounded d-inline-block text-start" style="font-size:0.8rem; max-width:90%; white-space:pre-wrap;">${html}</span></div>`;
    } else {
        const etiqueta = modelo ? `<b>${modelo}:</b><br>` : '';
        box.innerHTML += `<div class="text-start mb-2"><span class="bg-light border p-2 rounded d-inline-block text-dark" style="font-size:0.8rem; max-width:90%;">${etiqueta}${html}</span></div>`;
    }
    box.scrollTop = box.scrollHeight;
}

window.pintarHistorialChatIA = function(chat, fase) {
    window.historialChatIA = Array.isArray(chat) ? chat.slice() : [];
    const hayItems = typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0;
    window.faseIA = fase || (hayItems ? "matriz" : (window.historialChatIA.length ? "entrevista" : "idle"));
    const box = chatBoxEl();
    if (box) {
        box.innerHTML = "";
        if (!window.historialChatIA.length) {
            resetChatPlaceholder();
            if (hayItems) {
                pintarMensaje("model", "Proyecto recuperado. No había conversación guardada en la nube. Puedes seguir ajustando o pulsar Generar matriz; guarda de nuevo para conservar el chat.");
            }
        } else {
            window.historialChatIA.forEach(function (h) {
                const html = String(h.text || "").replace(/</g, "&lt;").replace(/\n/g, "<br>");
                pintarMensaje(h.role === "user" ? "user" : "model", html, h.modelo);
            });
        }
    }
    if (typeof actualizarBotonGenerar === "function") actualizarBotonGenerar();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
    return window.historialChatIA.length;
};

function textoGemini(data) {
    return data?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function extraerObjetoJsonIA(texto) {
    if (!texto) return null;
    let raw = texto;
    const fenced = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) raw = fenced[1];
    const tryParse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
    const objStart = raw.indexOf('{');
    if (objStart >= 0) {
        const parsed = tryParse(raw.slice(objStart));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
            const p = tryParse(m[0]);
            if (p && typeof p === "object" && !Array.isArray(p)) return p;
        }
    }
    return null;
}

function extraerCotizacionIA(texto) {
    const parsed = extraerObjetoJsonIA(texto);
    if (parsed && (Array.isArray(parsed.items) || parsed.ficha)) return parsed;
    if (!texto) return null;
    let raw = texto;
    const fenced = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) raw = fenced[1];
    const tryParse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
    const arr = raw.match(/\[[\s\S]*\]/);
    if (arr) {
        const p = tryParse(arr[0]);
        if (Array.isArray(p)) return { rangos: [1, 50, 100], items: p };
    }
    return null;
}

function textoSinJson(texto, cotizacion) {
    if (!texto) return '';
    let t = texto.replace(/```(?:json)?[\s\S]*?```/gi, '').trim();
    if (cotizacion) {
        const iObj = t.indexOf('{');
        const iArr = t.indexOf('[');
        const cut = (iObj >= 0 && (iArr < 0 || iObj < iArr)) ? iObj : iArr;
        if (cut >= 0) t = t.slice(0, cut).trim();
    }
    return t || (cotizacion ? 'Matriz actualizada.' : texto);
}

async function aplicarCotizacionEnUI(cotizacion) {
    if (!cotizacion) return false;
    let ok = false;
    if (Array.isArray(cotizacion.items)) {
        if (typeof window.aplicarRangosDesdeIA === 'function') window.aplicarRangosDesdeIA(cotizacion.rangos);
        await enriquecerItemsConCatalogo(cotizacion.items);
        window.reemplazarMatrizDesdeIA(cotizacion.items);
        window.faseIA = 'matriz';
        ok = true;
    }
    if (cotizacion.ficha && typeof aplicarFichaComercial === "function") {
        aplicarFichaComercial(cotizacion.ficha);
        ok = true;
    }
    return ok;
}

function bloqueLocaleParaPrompt() {
    const loc = typeof localeProyectoActual === "function" ? localeProyectoActual() : (window.localeProyecto || {});
    const um = loc.sistema === "imperial" ? "in" : "cm";
    const idioma = loc.idioma === "en" ? "English" : "español";
    const pistas = window.odooPistas || {};
    const lineas = [
        "=== FICHA COMERCIAL / LOCALE (Odoo Brief) ===",
        "idioma de la ficha: " + idioma + " (lang Odoo=" + (loc.langOdoo || "") + ")",
        "sistema de medida: " + (loc.sistema === "imperial" ? "Sistema Ingles" : "Sistema Internacional") + " → um=" + um,
        "país: " + (loc.pais || "—"),
        pistas.funcionales ? ("funcionales Odoo: " + pistas.funcionales) : "",
        pistas.dimDiseno ? ("dimensiones diseño Odoo: " + pistas.dimDiseno) : "",
        pistas.obsPresupuesto ? ("obs presupuesto Odoo: " + pistas.obsPresupuesto) : ""
    ].filter(Boolean);
    return lineas.join("\n");
}

function nombreCortoItem(s) {
    return String(s || "").replace(/\([^)]*\)/g, " ").replace(/=.*/, " ").replace(/\s+/g, " ").trim();
}

function normalizarTextoCatalogo(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[×*]/g, "x").replace(/[^a-z0-9x]+/g, " ").trim();
}

function tokensCatalogo(s) {
    const stop = /^(de|la|el|en|con|para|por|und|mm|del|las|los|una|un|m2|incl|merma|and|the|corte|obra|mano|exactos|laterales|version|pulg)$/;
    return normalizarTextoCatalogo(s).split(/\s+/).filter(function (w) { return w.length >= 2 && !stop.test(w); });
}

function extraerDimsCatalogo(s) {
    const t = normalizarTextoCatalogo(s);
    const out = [];
    const re = /(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+(?:\.\d+)?))?/g;
    let m;
    while ((m = re.exec(t))) {
        out.push(m[1] + "x" + m[2]);
        if (m[3]) out.push(m[1] + "x" + m[2] + "x" + m[3]);
    }
    return out;
}

function extraerCalibreCatalogo(s) {
    const t = normalizarTextoCatalogo(s);
    const m = t.match(/\b(?:cal|calibre|ga)\s*(\d{1,2})\b/) || t.match(/\b(\d{2})\s*(?:cal|ga)\b/);
    return m ? m[1] : "";
}

function scoreCatalogo(query, nombreCat) {
    const qn = nombreCortoItem(query);
    const a = tokensCatalogo(qn);
    const b = tokensCatalogo(nombreCat);
    if (!a.length || !b.length) return 0;
    let hit = 0;
    a.slice(0, 6).forEach(function (t) {
        if (b.indexOf(t) !== -1 || b.some(function (x) { return x.indexOf(t) !== -1 || t.indexOf(x) !== -1; })) hit++;
    });
    const den = Math.max(1, Math.min(a.length, 5));
    let score = hit / den;
    const compactCat = normalizarTextoCatalogo(nombreCat).replace(/\s/g, "");
    extraerDimsCatalogo(qn).forEach(function (d) {
        if (compactCat.indexOf(d.replace(/\s/g, "")) !== -1) score += 1.4;
    });
    const calQ = extraerCalibreCatalogo(qn);
    const calC = extraerCalibreCatalogo(nombreCat);
    if (calQ && calC && calQ === calC) score += 0.6;
    return score;
}

function parseLineaCatalogo(line) {
    const m = String(line || "").match(/^(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*UM=\s*(.*?)\s*\|\s*COP=\s*(.*)$/i);
    if (!m) return null;
    return { categoria: m[1].trim(), proveedor: m[2].trim(), nombre: m[3].trim(), um: m[4].trim(), costo_cop: parseFloat(m[5]) || 0 };
}

async function buscarCatalogoPorTokens(items) {
    const indice = [];
    const seen = {};
    function add(rec) {
        if (!rec || !rec.nombre) return;
        const k = rec.nombre.toLowerCase();
        if (seen[k]) return;
        seen[k] = true;
        indice.push(rec);
    }
    try {
        const data = await realizarPeticionBD({ action: "catalogo_maestro" });
        if (data && data.exito && data.data) {
            (data.data.items || []).forEach(add);
            (data.data.lineas || []).forEach(function (l) { add(parseLineaCatalogo(l)); });
        }
    } catch (e) {}
    const toks = [];
    const tokSeen = {};
    function addTok(t) {
        t = String(t || "").toLowerCase().trim();
        if (!t || t.length < 2 || tokSeen[t]) return;
        tokSeen[t] = true;
        toks.push(t);
    }
    items.forEach(function (it) {
        const corto = nombreCortoItem(it.nombre);
        extraerDimsCatalogo(corto).forEach(addTok);
        tokensCatalogo(corto).slice(0, 4).forEach(addTok);
    });
    const consultas = toks.slice(0, 10).map(function (q) {
        return realizarPeticionBD({ action: "catalogo_listar", q: q, vigente: "S", limit: 200, offset: 0 }).then(function (res) {
            ((res && res.data && res.data.items) || []).forEach(add);
        }).catch(function () {});
    });
    await Promise.all(consultas);
    return indice;
}

function mejorTarifaParaItem(nombre, tarifas) {
    let best = null, bestS = 0.45;
    (tarifas || []).forEach(function (t) {
        const s = scoreCatalogo(nombre, t.nombre);
        if (s > bestS) { bestS = s; best = t; }
    });
    return best;
}

function mejorFilaCatalogo(nombre, indice) {
    let best = null, bestS = 0.72;
    (indice || []).forEach(function (r) {
        const s = scoreCatalogo(nombre, r.nombre);
        if (s > bestS) { bestS = s; best = r; }
    });
    return best;
}

async function enriquecerItemsConCatalogo(items) {
    if (!items || !items.length) return items;
    const tarifas = (typeof listaTarifasFijas === "function") ? listaTarifasFijas() : [];
    items.forEach(function (it) {
        if (/tarifa/i.test(it.fuente || "")) return;
        const t = mejorTarifaParaItem(it.nombre, tarifas);
        if (!t) return;
        it.fuente = "[Tarifa Fija]";
        it.costoUnitario = t.costo;
        if (t.um) it.um = t.um;
        if (t.es_global) it.es_global = true;
    });
    const pendientes = items.filter(function (it) {
        if (/tarifa|odoo|manual/i.test(it.fuente || "")) return false;
        if (/mano\s*de\s*obra/i.test(it.nombre || "")) return false;
        return true;
    });
    if (!pendientes.length) return items;
    const indice = await buscarCatalogoPorTokens(pendientes);
    let cruzados = 0;
    pendientes.forEach(function (it) {
        const hit = mejorFilaCatalogo(it.nombre, indice);
        if (!hit || !(Number(hit.costo_cop) > 0)) return;
        it.fuente = "[Matriz Drive]";
        it.costoUnitario = Number(hit.costo_cop);
        if (hit.um) it.um = hit.um;
        cruzados++;
    });
    if (cruzados && typeof mostrarNotificacion === "function") {
        mostrarNotificacion(cruzados + " ítem(s) cruzados con Catalogo_Maestro.", "info");
    }
    return items;
}

function historialComoTexto() {
    return window.historialChatIA.map(h => `${h.role === 'user' ? 'ANALISTA' : 'IA'}: ${h.text}`).join('\n');
}

function instruccionesFase(modo) {
    const um = umPermitidas();
    const tarifas = tarifasParaPrompt();
    const base = `${promptMaestroActivo()}

=== REGLAS DEL SISTEMA (mandan sobre el texto de Ajustes) ===
Las fases las controla la app: entrevista hasta que el analista pulse Generar matriz; entonces JSON. No uses herramientas inventadas ni busques en Drive archivo por archivo. El catálogo ya viene abajo. campo um = UND (nunca escribas Unidades). campo fuente aparte; no lo metas en nombre.
Prioridad: 1) [Tarifa Fija] si el ítem coincide con la lista de tarifas (procesos internos). 2) Catálogo maestro / [Matriz Drive] para materiales. 3) [Estimado IA]. 4) [Manual].

UNIDADES DE LA MATRIZ (copia el código UM exacto; aplica factor y regla):
${um}

CÓMO LEER EL CATÁLOGO: costo_cop es el precio de UNA unidad de la UM del maestro. No mezcles UM matriz con UM Odoo/Drive sin convertir.
Si el maestro trae UND de perfil 6 m, no pongas Metros con el mismo costo. Láminas en Odoo = UND (placa), nunca Hojas.

TARIFAS FIJAS (mandan sobre el maestro si el concepto coincide):
${tarifas || '(vacío)'}`;

    if (modo === 'entrevista') {
        return `${base}

${bloqueLocaleParaPrompt()}

MODO ACTUAL: FASE 1 ENTREVISTA.
Responde en ${localeProyectoActual && localeProyectoActual().idioma === "en" ? "inglés" : "español"}, breve. PROHIBIDO JSON, arrays de ítems o costos. NO desgloses la matriz.
Aunque el analista dé todos los datos, SOLO continúa el diálogo. El costeo ocurre únicamente en FASE 2.
Pregunta solo lo no obvio. Incluye rangos si no están en los archivos. Medidas en ${localeProyectoActual && localeProyectoActual().sistema === "imperial" ? "pulgadas (in)" : "centímetros (cm)"}.
Si ya hay una matriz en pantalla o un historial previo, NO reinicies la entrevista: confirma lo pendiente y pide que pulse Generar matriz.
Cuando el costeo ya puede salir, invita a pulsar Generar matriz y menciona que, si quiere resultados más confiables, active Gemini PRO antes (la entrevista puede seguir en Flash).`;
    }
    if (modo === 'generar') {
        const umF = (typeof umFichaActual === "function") ? umFichaActual() : "cm";
        const langF = (typeof localeProyectoActual === "function" && localeProyectoActual().idioma === "en") ? "English" : "español";
        return `${base}

${bloqueLocaleParaPrompt()}

MODO ACTUAL: FASE 2 GENERAR COTIZACIÓN.
El analista confirmó. Usa rangos que haya dicho; si no hay, [1, 50, 100].
Primero un párrafo corto. AL FINAL un único JSON (sin markdown) con esta forma:
{"rangos":[1,50,100],"ficha":{"titulo":"...","descripcion":"3 a 4 líneas comerciales","dimensiones":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}"},"empaque":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}"}},"items":[{"fuente":"[Estimado IA]","nombre":"...","categoria":"Materias Primas","cantidad":1,"um":"UND","costoUnitario":0,"es_global":false}]}
ficha.titulo y ficha.descripcion en ${langF}. descripcion: 3–4 líneas, tono cotización (qué es, uso, materiales visibles, no receta de costo).
Medidas de ficha SOLO en ${umF}. Si el brief ya trae 60x40x120, úsalas. empaque: estima caja si no hay dato (un poco mayor que el mueble).
costoUnitario en COP sin IVA. Para es_global true, costoUnitario es el costo del LOTE (o por cada cantidad del lote), NO por producto. No rellenes costos[] en ítems globales: la app hace costoUnitario/Q. PROHIBIDO poner el valor de una caja o un flete en cada unidad del rango (ej. 5.000 cenefas).`;
    }
    return `${base}

${bloqueLocaleParaPrompt()}

MODO ACTUAL: FASE 3 AJUSTES sobre la matriz ya listada.
Responde breve. Si modificas ítems o el analista pide regenerar/rehacer la matriz, AL FINAL el JSON completo {"rangos":[...],"ficha":{...},"items":[...]} sin markdown. Incluye ficha si cambian título, texto o medidas.
Si solo aclaras, no envíes JSON.
Puede adjuntar archivos extra: úsalos. No pidas recargar la página.
Al rellenar costos: flete, cajas máster, elaboración de troquel (dado) y setup van con es_global true y costoUnitario = COP del lote (o por caja del lote). NO copies esos valores a costos[] ni los pongas como precio de cada producto. La app diluye Costo/Q. PROHIBIDO asignar una caja o un flete entero a cada unidad del rango (ej. 5.000 cenefas). Troquelado por golpe y materiales por pieza: es_global false.

=== FICHA ACTUAL ===
${JSON.stringify(typeof leerFichaComercialUI === "function" ? leerFichaComercialUI() : {})}

=== MATRIZ ACTUAL ===
${JSON.stringify({ rangos: (typeof lotesSimulacion !== 'undefined' ? lotesSimulacion.map(l => l.q) : [1]), items: (typeof itemsPresupuesto !== 'undefined' ? itemsPresupuesto : []) })}`;
}

window.limpiarMesaDeTrabajo = function() {
    window.historialChatIA = [];
    window.faseIA = 'idle';
    window._avisoProMatriz = false;
    ocultarHintGeminiPro();
    if (typeof window.vaciarArchivosIA === 'function') window.vaciarArchivosIA();
    if (typeof itemsPresupuesto !== 'undefined') itemsPresupuesto = [];
    if (typeof lotesSimulacion !== 'undefined') lotesSimulacion = [{ id: 'l1', q: 1 }];
    if (typeof pintarFichaComercial === "function") pintarFichaComercial(typeof fichaComercialVacia === "function" ? fichaComercialVacia() : {});
    if (typeof resetearVersionesProyecto === "function") resetearVersionesProyecto();
    if (typeof renderizarTablaItems === 'function') renderizarTablaItems();
    resetChatPlaceholder();
    actualizarBotonGenerar();
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();
};

async function obtenerCatalogoDriveTexto() {
    try {
        const data = await realizarPeticionBD({ action: 'catalogo_maestro' }, { timeoutMs: 60000 });
        if (!data.exito || !data.data) return '';
        const lineas = data.data.lineas || [];
        if (!lineas.length) return 'Catalogo_Maestro vacío. Un admin debe pulsar "Sincronizar catálogo desde Drive" en Ajustes.';
        return `Catalogo_Maestro (${data.data.total} ítems vigentes)\n` + lineas.join('\n');
    } catch (e) {
        return 'Catálogo maestro no disponible. Usa tarifas fijas o [Estimado IA].';
    }
}

window.reiniciarSesionIA = window.limpiarMesaDeTrabajo;

async function llamarGeminiConImagenes(promptTexto, timeoutMs) {
    const forzarPro = document.getElementById('togglePro')?.checked || false;
    const parts = [{ text: promptTexto }];
    (window.archivosGemaBase64 || []).forEach(f => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
    const data = await realizarPeticionBD({ action: 'gemini_analizar', forzarPro: forzarPro, parts: parts }, { timeoutMs: timeoutMs || 180000 });
    pintarUsoGemini(data && data.uso);
    return data;
}

async function llamarGeminiChat(promptTexto, timeoutMs) {
    const forzarPro = document.getElementById('togglePro')?.checked || false;
    const data = await realizarPeticionBD({ action: 'gemini_chat', forzarPro: forzarPro, promptText: promptTexto }, { timeoutMs: timeoutMs || 120000 });
    pintarUsoGemini(data && data.uso);
    return data;
}

function fmtTokens(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return Math.round(n / 1000) + "k";
    return String(n);
}

function pintarUsoGemini(uso) {
    if (!uso) return;
    const fill = document.getElementById("geminiUsoFill");
    const txt = document.getElementById("geminiUsoTxt");
    const wrap = document.getElementById("geminiUsoWrap");
    const alerta = document.getElementById("geminiUsoAlerta");
    const pct = Math.max(0, Math.min(100, Number(uso.porcentaje) || 0));
    const agotado = !!uso.cupoAgotado || String(uso.ultimoEstado) === "cupo";
    if (fill) fill.style.width = (agotado ? 100 : pct) + "%";
    const usd = Number(uso.costoUsd);
    const cupoUsd = Number(uso.cupoUsd) || 0;
    if (wrap) {
        wrap.classList.remove("ok", "warn", "crit");
        wrap.classList.add(agotado || pct >= 95 ? "crit" : (pct >= 80 ? "warn" : "ok"));
        wrap.title = "Consumo de toda la empresa este mes (tokens × tarifa de Ajustes). El mismo número para todos. Google no publica el saldo real de la API.";
    }
    if (txt) {
        if (agotado) txt.textContent = "Equipo · Gemini sin crédito";
        else if (cupoUsd > 0 && !isNaN(usd)) txt.textContent = "Equipo " + pct + "% · ~US$" + usd.toFixed(2) + " / " + cupoUsd;
        else txt.textContent = "Equipo " + pct + "% · " + fmtTokens(uso.tokensTotal) + "/" + fmtTokens(uso.cupoTokens);
    }
    if (alerta) {
        if (agotado) {
            alerta.classList.remove("d-none");
            alerta.textContent = "Gemini se quedó sin cupo o crédito. Recarga en Google AI Studio y reintenta.";
        } else {
            alerta.classList.add("d-none");
        }
    }
}

window.refrescarUsoGemini = async function () {
    try {
        if (!localStorage.getItem("smartbudget_token")) return;
        const data = await realizarPeticionBD({ action: "gemini_uso" });
        if (data && data.exito) pintarUsoGemini(data.data);
    } catch (e) {}
};

function esperaIAInicio_(mensaje) {
    if (typeof mostrarEsperaNube === "function") mostrarEsperaNube(mensaje || "La IA está trabajando…");
}
function esperaIATexto_(mensaje) {
    if (typeof textoEsperaNube === "function" && mensaje) textoEsperaNube(mensaje);
}
function esperaIAFin_() {
    if (typeof ocultarEsperaNube === "function") ocultarEsperaNube();
}
function marcarEsperaIA_(mensaje) {
    const typingId = "typing_" + Date.now();
    const box = chatBoxEl();
    if (box) {
        box.innerHTML += '<div id="' + typingId + '" class="text-start mb-2 ia-typing"><span class="text-muted" style="font-size:0.8rem;"><span class="spinner-border spinner-border-sm me-1"></span><span class="ia-typing-txt">' + mensaje + '</span></span></div>';
        box.scrollTop = box.scrollHeight;
    }
    esperaIAInicio_(mensaje);
    return typingId;
}
function quitarEsperaIA_(typingId) {
    if (typingId) document.getElementById(typingId)?.remove();
    esperaIAFin_();
}
function bloquearChatIA_(on) {
    const btn = document.getElementById("btnChat");
    const ta = document.getElementById("chatInput");
    if (btn) btn.disabled = !!on;
    if (ta) ta.disabled = !!on;
}

window.procesarPlanoIA = async function() {
    if (!window.archivosGemaBase64 || window.archivosGemaBase64.length === 0) {
        return mostrarNotificacion("Sube un render o PDF.", "warning");
    }
    const btn = document.getElementById('btnEjecutarIA');
    const txtOriginal = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analizando...'; btn.disabled = true; }
    const hayItems = typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0;
    const hayChat = (window.historialChatIA || []).length > 0;
    const reanudar = hayItems || hayChat;
    if (!reanudar) {
        window.historialChatIA = [];
        const boxReset = chatBoxEl();
        if (boxReset) boxReset.innerHTML = '';
    }
    window.faseIA = hayItems ? "matriz" : "entrevista";
    actualizarBotonGenerar();
    pintarMensaje('user', reanudar ? 'Reanalizar archivos (continuar)' : 'Analizar archivos adjuntos');
    window.historialChatIA.push({ role: 'user', text: reanudar ? 'Reanalizar archivos (continuar)' : 'Analizar archivos adjuntos' });
    const typingId = marcarEsperaIA_("Analizando archivos…");
    try {
        const extra = reanudar
            ? `\nYa hay matriz y/o chat. NO reinicies la entrevista. Resume el análisis. Si el costeo está listo, pide que pulse Generar matriz.\n=== MATRIZ ACTUAL ===\n${JSON.stringify({ rangos: (typeof lotesSimulacion !== "undefined" ? lotesSimulacion.map(function (l) { return l.q; }) : [1]), items: (typeof itemsPresupuesto !== "undefined" ? itemsPresupuesto : []) })}\n=== HISTORIAL ===\n${historialComoTexto()}`
            : "\nInicia la Fase 1.";
        const promptTexto = `${instruccionesFase(hayItems ? "ajustes" : "entrevista")}\n\nEl analista acaba de cargar ${window.archivosGemaBase64.length} archivo(s).${extra}`;
        const data = await llamarGeminiConImagenes(promptTexto, 180000);
        if (!data.exito) throw new Error(data.mensaje);
        const texto = textoGemini(data);
        const sinJson = textoSinJson(texto, extraerCotizacionIA(texto));
        window.historialChatIA.push({ role: 'model', text: sinJson });
        pintarMensaje('model', sinJson.replace(/\n/g, '<br>'), data.modeloUsado);
        mostrarNotificacion(reanudar ? "Continúa el análisis. Generar matriz está activo." : "Entrevista iniciada. Cuando termines, pulsa Generar matriz.", "success");
        promoverFaseIA();
        if (textoInvitaGenerarMatriz(sinJson)) mostrarHintGeminiPro(true);
    } catch (err) {
        mostrarNotificacion("Error Servidor: " + err.message, "danger");
        promoverFaseIA();
    } finally {
        quitarEsperaIA_(typingId);
        if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
        actualizarBotonGenerar();
    }
};

window.enviarMensajeChat = async function() {
    const input = document.getElementById('chatInput');
    let msg = input?.value.trim() || '';
    if (!msg && !(window.archivosGemaBase64 || []).length) return;
    if (!msg) msg = '(Archivos adicionales adjuntos)';
    if (input) input.value = '';
    pintarMensaje('user', msg.replace(/</g, '&lt;').replace(/\n/g, '<br>'));
    window.historialChatIA.push({ role: 'user', text: msg });
    if (typeof programarGuardarSesion === "function") programarGuardarSesion();

    promoverFaseIA();
    if (pideRegenerarMatriz(msg)) {
        return window.generarMatrizIA({ desdeChat: true });
    }

    const modo = modoConversacion();
    const msgEspera = modo === "ajustes" ? "La IA está ajustando la matriz…" : "La IA está respondiendo…";
    bloquearChatIA_(true);
    const typingId = marcarEsperaIA_(msgEspera);

    try {
        const promptTexto = `${instruccionesFase(modo)}\n\n=== HISTORIAL ===\n${historialComoTexto()}\n\n=== ÚLTIMO MENSAJE DEL ANALISTA ===\n${msg}`;
        const data = (window.archivosGemaBase64?.length)
            ? await llamarGeminiConImagenes(promptTexto, 180000)
            : await llamarGeminiChat(promptTexto, 120000);
        if (!data.exito) throw new Error(data.mensaje);
        const texto = textoGemini(data);
        const cotizacion = extraerCotizacionIA(texto);
        if (cotizacion && Array.isArray(cotizacion.items) && modo === 'ajustes') {
            esperaIATexto_("Aplicando la matriz…");
            await aplicarCotizacionEnUI(cotizacion);
        } else if (cotizacion && cotizacion.ficha && typeof aplicarFichaComercial === "function") {
            aplicarFichaComercial(cotizacion.ficha);
        }
        const charla = textoSinJson(texto, cotizacion);
        window.historialChatIA.push({ role: 'model', text: charla });
        pintarMensaje('model', charla.replace(/\n/g, '<br>'), data.modeloUsado);
        actualizarBotonGenerar();
        if (textoInvitaGenerarMatriz(charla) || textoInvitaGenerarMatriz(texto)) mostrarHintGeminiPro(true);
        if (typeof programarGuardarSesion === "function") programarGuardarSesion();
    } catch (err) {
        mostrarNotificacion("Error Servidor Chat: " + err.message, "danger");
    } finally {
        quitarEsperaIA_(typingId);
        bloquearChatIA_(false);
    }
};

function pideRegenerarMatriz(msg) {
    return /genera\w*.{0,48}matriz|matriz.{0,28}(nuevamente|de nuevo|otra vez)|vuelve a (generar|armar|costear)|reprocesa|regenera|rehacer.{0,24}matriz/i.test(String(msg || ""));
}

function promptSoloFichaComercial() {
    const umF = (typeof umFichaActual === "function") ? umFichaActual() : "cm";
    const langF = (typeof localeProyectoActual === "function" && localeProyectoActual().idioma === "en") ? "English" : "español";
    const fichaHoy = (typeof leerFichaComercialUI === "function") ? leerFichaComercialUI() : {};
    return `${bloqueLocaleParaPrompt()}

TAREA: rellenar SOLO la ficha comercial. NO toques costos ni matriz.
Idioma del texto: ${langF}. Medidas SOLO en ${umF}.
titulo corto (como en cotización). descripcion 3–4 líneas: qué es, uso en PDV, materiales visibles. Sin receta de costo.
dimensiones del mueble (ancho × fondo × alto). empaque de la caja (un poco mayor si no hay dato).
Usa renders/PDF, el chat y pistas de ítems (ej. caja 155x65x45). Si el brief Odoo trae 60×40×120, úsalas.

Ficha actual (puedes completar huecos, no borres lo que ya esté bien):
${JSON.stringify(fichaHoy)}

Responde un párrafo corto y AL FINAL un único JSON sin markdown:
{"ficha":{"titulo":"...","descripcion":"...","dimensiones":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}"},"empaque":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}"}}}`;
}

window.completarFichaIA = async function () {
    const hayArchivos = window.archivosGemaBase64 && window.archivosGemaBase64.length;
    const hayChat = (window.historialChatIA || []).length > 0;
    const hayItems = typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0;
    if (!hayArchivos && !hayChat && !hayItems) {
        return mostrarNotificacion("Escribe la ficha a mano, o analiza archivos / genera matriz y luego pulsa Rellenar con IA.", "warning");
    }
    const btn = document.getElementById("btnCompletarFicha");
    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Ficha...'; }
    pintarMensaje("user", "Completar ficha comercial (sin tocar la matriz)");
    window.historialChatIA.push({ role: "user", text: "Completar ficha comercial (sin tocar la matriz)" });
    const typingId = marcarEsperaIA_("Redactando la ficha comercial…");
    try {
        const promptTexto = `${promptSoloFichaComercial()}

=== HISTORIAL ===
${historialComoTexto()}

=== PISTAS DE MATRIZ (solo para medidas/nombre, no costes) ===
${JSON.stringify({
    proyecto: document.getElementById("noProyecto")?.value || "",
    cliente: document.getElementById("cliente")?.value || "",
    items: (typeof itemsPresupuesto !== "undefined" ? itemsPresupuesto.map(function (i) { return i.nombre; }) : [])
})}`;
        const data = hayArchivos
            ? await llamarGeminiConImagenes(promptTexto, 120000)
            : await llamarGeminiChat(promptTexto, 90000);
        if (!data.exito) throw new Error(data.mensaje);
        const texto = textoGemini(data);
        const cotizacion = extraerCotizacionIA(texto);
        if (cotizacion && cotizacion.ficha && typeof aplicarFichaComercial === "function") {
            aplicarFichaComercial(cotizacion.ficha);
        }
        const charla = textoSinJson(texto, cotizacion);
        window.historialChatIA.push({ role: "model", text: charla });
        pintarMensaje("model", charla.replace(/\n/g, "<br>"), data.modeloUsado);
        if (typeof programarGuardarSesion === "function") programarGuardarSesion();
        mostrarNotificacion(cotizacion && cotizacion.ficha ? "Ficha comercial lista. Revísala y edítala si hace falta." : "La IA no devolvió la ficha. Reintenta o escríbela a mano.", cotizacion && cotizacion.ficha ? "success" : "warning");
    } catch (err) {
        mostrarNotificacion("Error ficha: " + err.message, "danger");
    } finally {
        quitarEsperaIA_(typingId);
        if (btn) { btn.innerHTML = original; btn.disabled = false; }
    }
};

window.generarMatrizIA = async function(opts) {
    opts = opts || {};
    const hayArchivos = window.archivosGemaBase64 && window.archivosGemaBase64.length;
    const hayChat = (window.historialChatIA || []).length > 0;
    const hayItems = typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0;
    if (!hayArchivos && !hayChat && !hayItems) {
        return mostrarNotificacion("Adjunta archivos o carga un proyecto con chat o matriz.", "warning");
    }
    if (window.faseIA !== 'entrevista' && window.faseIA !== 'matriz') {
        if (hayItems || hayChat) window.faseIA = hayItems ? "matriz" : "entrevista";
        else return mostrarNotificacion("Primero pulsa Analizar archivos y completa la entrevista.", "warning");
    }
    const btn = document.getElementById('btnGenerarMatriz');
    const original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generando...'; }
    if (!opts.desdeChat) {
        const last = (window.historialChatIA || [])[(window.historialChatIA || []).length - 1];
        if (!(last && last.role === "user" && /generar matriz/i.test(last.text || ""))) {
            pintarMensaje('user', 'Generar matriz de costos');
            window.historialChatIA.push({ role: 'user', text: 'Generar matriz de costos' });
        }
    }
    const typingId = marcarEsperaIA_("Generando la matriz de costos…");
    try {
        esperaIATexto_("Leyendo el catálogo maestro…");
        const catalogo = await obtenerCatalogoDriveTexto();
        esperaIATexto_("Generando la matriz de costos…");
        const promptTexto = `${instruccionesFase('generar')}

=== CATÁLOGO MAESTRO (hoja Sheets, vigente; cada línea: categoria | proveedor | nombre | UM= | COP=) ===
${catalogo || '(vacío)'}
Si el ítem es un proceso de TARIFAS FIJAS, fuente = "[Tarifa Fija]" y usa ese COP/UM.
Materiales (tubos, ángulos, láminas, alambre, perfiles): busca en el catálogo por calibre y sección (ej. 2x4, 40x80) y usa fuente "[Matriz Drive]" con ese COP y UM. [Estimado IA] SOLO si no hay insumo parecido.

=== HISTORIAL ===
${historialComoTexto()}`;
        const data = hayArchivos
            ? await llamarGeminiConImagenes(promptTexto, 180000)
            : await llamarGeminiChat(promptTexto, 180000);
        if (!data.exito) throw new Error(data.mensaje);
        const texto = textoGemini(data);
        const cotizacion = extraerCotizacionIA(texto);
        if (cotizacion) {
            esperaIATexto_("Aplicando la matriz…");
            await aplicarCotizacionEnUI(cotizacion);
        }
        const charla = textoSinJson(texto, cotizacion);
        window.historialChatIA.push({ role: 'model', text: charla });
        pintarMensaje('model', charla.replace(/\n/g, '<br>'), data.modeloUsado);
        ocultarHintGeminiPro();
        if (typeof programarGuardarSesion === "function") programarGuardarSesion();
        mostrarNotificacion(cotizacion ? "Matriz generada. Sigue ajustando en el chat si hace falta." : "La IA no devolvió JSON válido. Reintenta Generar matriz.", cotizacion ? "success" : "warning");
    } catch (err) {
        mostrarNotificacion("Error generando matriz: " + err.message, "danger");
    } finally {
        quitarEsperaIA_(typingId);
        if (btn) { btn.innerHTML = original; }
        actualizarBotonGenerar();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const ta = document.getElementById('chatInput');
    if (ta) ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensajeChat();
        }
    });
    actualizarBotonGenerar();
    if (typeof window.refrescarUsoGemini === "function") window.refrescarUsoGemini();
    setInterval(function () {
        if (typeof window.refrescarUsoGemini === "function") window.refrescarUsoGemini();
    }, 40000);
    const tog = document.getElementById("togglePro");
    if (tog) tog.addEventListener("change", function () {
        if (tog.checked) ocultarHintGeminiPro();
    });
});
