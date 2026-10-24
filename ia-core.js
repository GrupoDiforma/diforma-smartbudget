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

REGLA A — campo nombre (no existe "descripcion"): título corto + " — " + cuenta con cifras. El analista audita el costeo leyendo el nombre.
- Tubos: Tc vs Tr. Suma de tramos + 10% merma = metros; cuántas tiras de 6 m y qué sobra.
- Alambre: retículas; longitud / 6 m.
- Láminas planas (PS, acrílico, MDF): rectángulo envolvente en cm y m².
- PS termoformado: la holgura NO es un mm fijo. Desarrolla la lámina según altura y forma (planta + paredes/tiro + pestaña de sujeción/refile). Escribe esa cuenta en el nombre.
- Impresión: fila aparte, m² exactos.
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

function archivosActivosIA_() {
    if (typeof window.archivosParaIA === "function") return window.archivosParaIA() || [];
    return window.archivosGemaBase64 || [];
}

function hayTrabajoIA() {
    if (window.faseIA === "entrevista" || window.faseIA === "matriz") return true;
    if (typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0) return true;
    if ((window.historialChatIA || []).length > 0) return true;
    if (archivosActivosIA_().length > 0) return true;
    return false;
}

function promoverFaseIA() {
    const hayItems = typeof itemsPresupuesto !== "undefined" && itemsPresupuesto.length > 0;
    const hayChat = (window.historialChatIA || []).length > 0;
    const hayArchivos = archivosActivosIA_().length > 0;
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
        box.innerHTML += `<div class="text-end mb-2"><span class="chat-user p-2 rounded d-inline-block text-start" style="font-size:0.8rem; max-width:90%; white-space:pre-wrap;">${html}</span></div>`;
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

function rellenarEmpUndDesdeChat_(ficha) {
    if (!ficha || typeof ficha !== "object") return ficha;
    const emp = ficha.empaque || ficha.pack || {};
    const ya = emp.unidades || emp.und || emp.und_por_caja || emp.unidadesPorCaja || ficha.empUnd;
    if (ya !== undefined && ya !== null && ya !== "" && Number(ya) > 0) return ficha;
    const textos = [];
    if (ficha.descripcion) textos.push(ficha.descripcion);
    try {
        (window.historialChatIA || []).forEach(function (h) { textos.push(h.text || ""); });
    } catch (e) {}
    const blob = textos.join("\n");
    const m = blob.match(/(\d{1,4})\s*(?:u(?:nd(?:s|idades)?)?)\s*(?:por|\/)\s*caja/i)
        || blob.match(/caja(?:es)?\s*(?:de|con|para)\s*(\d{1,4})\s*(?:u(?:nd)?s?|unidades)?/i)
        || blob.match(/(\d{1,4})\s*(?:und|u)\s*(?:por|\/)\s*(?:caja|emp)/i);
    if (!m) return ficha;
    ficha.empaque = emp;
    ficha.empaque.unidades = Number(m[1]);
    return ficha;
}

/** Peso de una caja solo si alguien lo dijo. No se estima por el render ni por los m². */
function rellenarEmpPesoDesdeChat_(ficha) {
    if (!ficha || typeof ficha !== "object") return ficha;
    const emp = ficha.empaque || ficha.pack || {};
    const ya = emp.peso != null && emp.peso !== "" ? emp.peso : (emp.weight || emp.peso_caja || ficha.empPeso);
    if (ya !== undefined && ya !== null && ya !== "" && Number(String(ya).replace(",", ".")) > 0) return ficha;
    const textos = [];
    if (ficha.descripcion) textos.push(ficha.descripcion);
    try {
        (window.historialChatIA || []).forEach(function (h) { textos.push(h.text || ""); });
    } catch (e) {}
    const blob = textos.join("\n");
    const num = function (s) { return Number(String(s).replace(",", ".")); };
    const mKg = blob.match(/(?:peso(?:\s+de)?(?:\s+la)?\s+caja|caja)\s*(?:de|pesa|:|con)?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i)
        || blob.match(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:por|\/)\s*caja/i);
    const mLb = blob.match(/(?:peso(?:\s+de)?(?:\s+la)?\s+caja|caja)\s*(?:de|pesa|:|con)?\s*(\d+(?:[.,]\d+)?)\s*(?:lb|libras)\b/i)
        || blob.match(/(\d+(?:[.,]\d+)?)\s*(?:lb|libras)\s*(?:por|\/)\s*caja/i);
    const kg = mKg ? num(mKg[1]) : 0;
    const lb = mLb ? num(mLb[1]) : 0;
    const imperial = typeof umFichaActual === "function" && umFichaActual() === "in";
    let valor = 0;
    if (imperial) {
        if (lb > 0) valor = lb;
        else if (kg > 0) valor = Math.round(kg * 2.2046226218 * 100) / 100;
    } else if (kg > 0) valor = kg;
    else if (lb > 0) valor = Math.round((lb / 2.2046226218) * 100) / 100;
    if (!(valor > 0)) return ficha;
    ficha.empaque = emp;
    ficha.empaque.peso = valor;
    return ficha;
}

function avisarEmpaqueVsPieza_() {
    if (typeof leerFichaComercialUI !== "function") return;
    const f = leerFichaComercialUI();
    const da = Number(f.dimAlto);
    const ea = Number(f.empAlto);
    if (!(da > 0 && ea > 0) || ea + 0.5 >= da) return;
    const desc = String(f.descripcion || "").toLowerCase();
    const kd = /desarm|knock.?down|\bkd\b|en plano|panel a panel|plegad/.test(desc);
    if (kd) return;
    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("La caja mide " + ea + " de alto y la pieza " + da + ". Si viaja armada, el empaque debe ser un poco mayor. Revisa o indica si va desarmada.", "warning");
    }
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
        rellenarEmpUndDesdeChat_(cotizacion.ficha);
        rellenarEmpPesoDesdeChat_(cotizacion.ficha);
        aplicarFichaComercial(cotizacion.ficha);
        avisarEmpaqueVsPieza_();
        ok = true;
    }
    if (Array.isArray(cotizacion.items)) avisarCubicacionCorta_();
    return ok;
}

function nEntrepanosDesdeTexto_(t) {
    const m = String(t || "").match(/(\d{1,2})\s*(?:entrepa[nñ]os?|bandejas?|anaqueles?|estantes?|shelv(?:es|ing)?)/i);
    return m ? Number(m[1]) : 0;
}

function despieceMuebleMinimo_() {
    const f = typeof leerFichaComercialUI === "function" ? leerFichaComercialUI() : {};
    const a = Number(f.dimAncho) || 0;
    const p = Number(f.dimFondo) || 0;
    const h = Number(f.dimAlto) || 0;
    if (!(a > 0 && p > 0 && h > 0)) return null;
    const nEst = nEntrepanosDesdeTexto_((f.descripcion || "") + " " + (f.titulo || "")) || 4;
    const zH = Math.min(20, Math.max(10, Math.round(h * 0.08)));
    const parts = [
        { nom: "laterales", n: 2, L: p, W: h },
        { nom: "fondo", n: 1, L: a, W: h },
        { nom: "entrepaños", n: nEst, L: a, W: p },
        { nom: "zócalo", n: 1, L: a, W: zH },
        { nom: "tapa", n: 1, L: a, W: p }
    ];
    let cml = 0, m2 = 0;
    parts.forEach(function (x) {
        cml += x.n * 2 * (x.L + x.W);
        m2 += x.n * (x.L / 100) * (x.W / 100);
    });
    cml = Math.round(cml * 1.2);
    const merma = m2 * 1.18;
    const placa = 1.22 * 2.44;
    return {
        a: a, p: p, h: h, nEst: nEst, zH: zH, parts: parts,
        cml: cml, m2: m2, merma: merma,
        placas: Math.max(2, Math.ceil(merma / placa))
    };
}

function bloqueCubicacionMuebleParaPrompt() {
    const d = despieceMuebleMinimo_();
    const um = (typeof umFichaActual === "function") ? umFichaActual() : "cm";
    if (!d) {
        return [
            "=== DESPIECE DE MUEBLE (obligatorio si no es un panel suelto) ===",
            "Antes de costear, lista CADA parte visible u oculta: laterales, fondo, cuerpo, entrepaños/bandejas, zócalo, tapa, divisiones, pestañas de ensamble.",
            "Cartonplast: NO uses un solo rectángulo envolvente. Área = suma de L×W de cada parte. Cml = suma de 2×(L+W) de cada parte + hendidos/pestañas.",
            "Placa típica 122×244 cm (2,98 m²). cantidad en UND = ceil(m² con merma / 2,98). PROHIBIDO 1 placa o 0,x m² para un mueble de piso."
        ].join("\n");
    }
    const lineasPartes = d.parts.map(function (x) {
        return "- " + x.n + " " + x.nom + " " + x.L + "×" + x.W + " " + um + " → " + (x.n * 2 * (x.L + x.W)) + " Cml, " + (x.n * (x.L / 100) * (x.W / 100)).toFixed(2) + " m²";
    });
    return [
        "=== DESPIECE MÍNIMO (mueble / exhibidor / cartonplast) ===",
        "Medidas ficha: " + d.a + " × " + d.p + " × " + d.h + " " + um + ". Entrepaños/bandejas: " + d.nEst + " (ajusta solo si el render muestra otra cantidad).",
        "Lista y costea TODAS estas partes. PROHIBIDO un único rectángulo " + d.a + "×" + d.h + ".",
        lineasPartes.join("\n"),
        "Área neta mínima ≈ " + d.m2.toFixed(2) + " m². Con merma/yield 18% ≈ " + d.merma.toFixed(2) + " m².",
        "Placa 122×244 = 2,98 m² → mínimo " + d.placas + " UND de cartonplast (nunca 1 ni fracción de placa para este mueble).",
        "Cml mínimo (perímetros + 20% pestañas/hendidos de ensamble): " + d.cml + " Cml.",
        "Si tu lámina o tu mesa de corte quedan por debajo, está MAL: sube, no bajes.",
        "nombre lámina: «Cartonplast — 2 lat " + d.p + "×" + d.h + " + fondo " + d.a + "×" + d.h + " + " + d.nEst + " bandejas " + d.a + "×" + d.p + " + zócalo " + d.a + "×" + d.zH + " = " + d.merma.toFixed(2) + " m² → " + d.placas + " placas 122×244».",
        "nombre corte: «Mesa de corte — laterales + fondo + bandejas + zócalo + tapa = " + d.cml + " Cml» (o más)."
    ].join("\n");
}

function avisarCubicacionCorta_() {
    const d = despieceMuebleMinimo_();
    if (!d || typeof itemsPresupuesto === "undefined" || !itemsPresupuesto.length) return;
    const avisos = [];
    let m2Lamina = 0, undPlaca = 0, cml = 0;
    itemsPresupuesto.forEach(function (it) {
        const n = String(it.nombre || "");
        const um = String(it.um || "");
        const cant = Number(it.cantidad) || 0;
        if (/cartonplast|cart[oó]n\s*plast/i.test(n)) {
            if (/m2|m²/i.test(um)) m2Lamina += cant;
            if (/^und/i.test(um)) undPlaca += cant;
        }
        if (/mesa de corte|cml/i.test(n) || /^cml$/i.test(um)) cml += cant;
    });
    if (undPlaca > 0 && undPlaca + 0.05 < d.placas) {
        avisos.push("Cartonplast: " + undPlaca + " placa(s) vs mínimo " + d.placas + " para este despiece.");
    }
    if (m2Lamina > 0 && m2Lamina < d.m2 * 0.75) {
        avisos.push("Cartonplast: " + m2Lamina.toFixed(2) + " m² vs área neta mínima " + d.m2.toFixed(2) + " m².");
    }
    if (cml > 0 && cml < d.cml * 0.7) {
        avisos.push("Mesa de corte: " + cml + " Cml vs mínimo " + d.cml + " Cml (todas las partes).");
    }
    if (avisos.length && typeof mostrarNotificacion === "function") {
        mostrarNotificacion("Cubicación corta frente al despiece del mueble. " + avisos.join(" "), "warning");
    }
}

function bloqueLocaleParaPrompt() {
    const loc = typeof localeProyectoActual === "function" ? localeProyectoActual() : (window.localeProyecto || {});
    const um = loc.sistema === "imperial" ? "in" : "cm";
    const idioma = loc.idioma === "en" ? "English" : "español";
    const pistas = window.odooPistas || {};
    const hayPista = !!(pistas.funcionales || pistas.dimDiseno || pistas.obsPresupuesto);
    const lineas = [
        "=== CABECERA (sí usar) ===",
        "idioma de la FICHA (no del chat): " + idioma + " (lang Odoo=" + (loc.langOdoo || "") + ")",
        "sistema de medida: " + (loc.sistema === "imperial" ? "Sistema Ingles" : "Sistema Internacional") + " → um=" + um,
        "país: " + (loc.pais || "—"),
        "=== EVIDENCIA ===",
        "Mandan, en este orden: (1) PDF/render cargados (2) lo que el analista escribe en el chat (3) la ficha que él ya editó.",
        "El Lead de Odoo NO es fuente de medidas, materiales ni empaque. Puede estar desactualizado o copiado de otro proyecto."
    ];
    if (hayPista) {
        lineas.push("=== PISTAS ODOO NO VERIFICADAS (solo para preguntar si chocan con archivos/chat) ===");
        if (pistas.funcionales) lineas.push("funcionales: " + pistas.funcionales);
        if (pistas.dimDiseno) lineas.push("dim_diseno: " + pistas.dimDiseno);
        if (pistas.obsPresupuesto) lineas.push("obs_presupuesto: " + pistas.obsPresupuesto);
        lineas.push("Si una pista choca con el plano o con el analista, GANA el plano/analista. NUNCA copies dim_diseno a la ficha sin confirmar.");
    }
    return lineas.join("\n");
}

function compactarChatParaBrief_(chat) {
    return (chat || []).filter(function (h) { return h && h.text; }).map(function (h) {
        return (h.role === "user" ? "ANALISTA" : "IA") + ": " + String(h.text).replace(/\s+/g, " ").trim();
    }).join("\n").slice(0, 4500);
}

function versionGrupalActual_() {
    return (window.versionesPresupuesto || []).find(function (v) { return v.id === (window.versionActivaId || "V1"); }) || null;
}

function briefGrupalTexto_() {
    if (typeof esPresupuestoGrupal !== "function" || !esPresupuestoGrupal()) return "";
    const ver = versionGrupalActual_();
    if (!ver) return "";
    if (ver.briefGrupal) return String(ver.briefGrupal);
    const activo = ver.elementoActivoId || window.elementoActivoId;
    const otro = (ver.elementos || []).find(function (e) {
        return e.id !== activo && (e.historialChat || []).length >= 2;
    });
    return otro ? compactarChatParaBrief_(otro.historialChat) : "";
}

function bloqueGrupalParaPrompt() {
    if (typeof esPresupuestoGrupal !== "function" || !esPresupuestoGrupal()) {
        return "=== TIPO DE PRESUPUESTO ===\nINDIVIDUAL: una sola pieza. Costea solo eso. No preguntes si vienen más elementos.";
    }
    const ver = versionGrupalActual_();
    const elems = (ver && ver.elementos) || [];
    const activoId = (ver && ver.elementoActivoId) || window.elementoActivoId;
    const activo = elems.find(function (e) { return e.id === activoId; }) || elems[0];
    const nombreActivo = (activo && activo.nombre) || "Pieza 1";
    const lista = elems.map(function (e, i) {
        const on = e.id === (activo && activo.id) ? " ← ESTÁS COSTANDO ESTA" : "";
        const tieneMtx = (e.matrizItems || []).length > 0;
        return (i + 1) + ") " + (e.nombre || ("Pieza " + (i + 1))) + (tieneMtx ? " [ya tiene matriz; NO la toques]" : " [pendiente]") + on;
    }).join("\n");
    const primer = !elems.length || (elems[0] && activo && elems[0].id === activo.id);
    const brief = briefGrupalTexto_();
    const lineas = [
        "=== PRESUPUESTO GRUPAL ===",
        "Esto YA es un presupuesto grupal: varias piezas/elementos SEPARADOS (mueble, POP, display, campaña; NO asumas que es un stand).",
        "Cada elemento se analiza y se costea SOLO. No preguntes si son varios proyectos: ya lo son. No pidas la lista del grupo: ya está abajo.",
        "Pieza activa (única que costeas ahora): " + nombreActivo,
        "Piezas del grupo:",
        lista || ("1) " + nombreActivo)
    ];
    if (brief && !primer) {
        lineas.push("=== BRIEF GRUPAL (ya resuelto en la primera entrevista; NO repreguntar) ===");
        lineas.push(brief);
        lineas.push("En esta pieza pregunta SOLO lo específico de ella (medidas, partes, materiales propios). Rangos, destino, acabado común, tipo de empaque y Q del pedido ya están resueltos si aparecen arriba.");
    } else if (primer) {
        lineas.push("Esta es la PRIMERA pieza del grupo. En esta entrevista resuelve también lo que aplica a TODO el grupo: rangos/Q del pedido, destino, acabados comunes, tipo de empaque, quién instala, familia de materiales. Máximo 3–5 preguntas, nada obvio.");
        lineas.push("No preguntes «¿son varias piezas?», «¿esto es un stand?» ni «¿vienen más elementos?».");
    } else {
        lineas.push("Otras piezas ya existen. Pregunta solo lo de ESTA pieza. No reinicies una entrevista de campaña.");
    }
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
    const t = String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[×*]/g, "x").replace(/,/g, ".");
    const out = [];
    const seen = {};
    const re = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*x\s*(\d+(?:\.\d+)?))?/g;
    let m;
    while ((m = re.exec(t))) {
        const key2 = m[1] + "x" + m[2];
        if (!seen[key2]) { seen[key2] = true; out.push(key2); }
        if (m[3]) {
            const key3 = key2 + "x" + m[3];
            if (!seen[key3]) { seen[key3] = true; out.push(key3); }
        }
    }
    return out;
}

function familiaUmCatalogo_(um) {
    const u = String(um || "").toLowerCase();
    if (/m2|m²/.test(u)) return "area";
    if (/^kg|kilo/.test(u)) return "masa";
    if (/cml|metro/.test(u)) return "largo";
    if (/rollo/.test(u)) return "rollo";
    return "und";
}

function umCatalogoCompatible_(umItem, umCat) {
    const a = familiaUmCatalogo_(umItem);
    const b = familiaUmCatalogo_(umCat);
    if (a === b) return true;
    if (a === "area" && (b === "masa" || b === "largo")) return false;
    if (a === "largo" && b === "masa") return false;
    if (a === "masa" && (b === "area" || b === "largo")) return false;
    return true;
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
    extraerDimsCatalogo(qn).forEach(function (d) {
        if (extraerDimsCatalogo(nombreCat).indexOf(d) !== -1) score += 1.4;
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

function mejorFilaCatalogo(nombre, indice, umItem) {
    let best = null, bestS = 0.72;
    (indice || []).forEach(function (r) {
        if (umItem && r.um && !umCatalogoCompatible_(umItem, r.um)) return;
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
        const hit = mejorFilaCatalogo(it.nombre, indice, it.um);
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
IDIOMA DEL CHAT: SIEMPRE español. El analista es de Diforma. Aunque el Brief, el PDF o la ficha vayan en inglés, preguntas, resúmenes y aclaraciones van en español. El idioma Odoo (es/en) SOLO aplica a ficha.titulo y ficha.descripcion (texto para el cliente).
EVIDENCIA: PDF/render + chat del analista mandan sobre el Lead de Odoo. Locale (idioma/sistema/país) sí sale de Odoo. Medidas, materiales y und. por caja NO se copian del Brief.
Las fases las controla la app: entrevista hasta que el analista pulse Generar matriz; entonces JSON. No uses herramientas inventadas ni busques en Drive archivo por archivo. El catálogo ya viene abajo. campo um = UND (nunca escribas Unidades). campo fuente aparte; no lo metas en nombre.
NOMBRE AUDITABLE: cada ítem de material/proceso con cubicación lleva en nombre la cuenta (cifras). PROHIBIDO un título solo («Lámina PS Cal.60»). Forma: «título — pieza + extras = bruto → compra».
Ej. tubo: «Tc 1/2 — 4×0,80 + 4×0,40 = 4,80 m +10% = 5,28 m → 1 tira 6 m (sobra 0,72)».
Ej. PS termoformado: «PS Cal.60 frente — planta 60,3×7,9 cm; h tiro 3,0 cm; desarrollo paredes 2×3,0; pestaña ~2 cm/lado (relieve bajo, borde abierto) = lámina 64,3×15,9 cm = 0,102 m²».
TERMOFORMADO — cómo calcular la lámina (no inventes un mm único):
1) Planta = largo × ancho de la pieza terminada (plano/render).
2) Desarrollo = suma el tiro/altura en cada lado que baja o se curva (como patrón de chapa; si es L o aleta, desarrolla esa sección).
3) Pestaña de marco/refile: proporcional a altura y forma (relieve bajo ~1,5–2,5 cm/lado; medio 2,5–4 cm; alto o bajo corte / forma cerrada, más). Declara el cm que usaste.
4) Lámina bruta = planta + desarrollo + pestañas. cantidad en m² (o placas UND con yield). PROHIBIDO 0,035 UND sin esa cuenta.
Prioridad: 1) [Tarifa Fija] si el ítem coincide con la lista de tarifas (procesos internos). 2) Catálogo maestro / [Matriz Drive] para materiales. 3) [Estimado IA]. 4) [Manual].

UNIDADES DE LA MATRIZ (copia el código UM exacto; aplica factor y regla):
${um}

CÓMO LEER EL CATÁLOGO: costo_cop es el precio de UNA unidad de la UM del maestro. No mezcles UM matriz con UM Odoo/Drive sin convertir.
Si el maestro trae UND de perfil 6 m, no pongas Metros con el mismo costo. Láminas en Odoo = UND (placa), nunca Hojas.

TARIFAS FIJAS (mandan sobre el maestro si el concepto coincide):
${tarifas || '(vacío)'}

LÁMINAS (cartonplast, MDF, PS, acrílico, corrugado): el maestro vende PLACAS en UND. costoUnitario = COP de UNA placa del calibre/espesor correcto. cantidad = placas a comprar (ceil de m² netos / m² de la placa + merma). Escribe la cuenta en nombre. PROHIBIDO poner m² con el precio de una placa, o UND con un precio de m² inventado. Cartonplast: usa la fila del maestro con el espesor que se ve (3, 4, 5 mm), no otra lámina barata.

MESA DE CORTE (Cml): UM = Cml = centímetros lineales de TODOS los cortes, no el perímetro de una silueta. Un mueble = fondo + cuerpo + laterales + bandejas + zócalo + tapas + divisiones. Suma los filos reales de CADA parte. nombre: «Mesa de corte — fondo 2×A+2×B; cuerpo …; bandejas n×(…); zócalo … = N Cml».

MANO DE OBRA: mueble/exhibidor/showroom con varias partes = horas reales de taller + armado. PROHIBIDO 0,2–1 h para un gabinete de ~185 cm con bandejas. Siempre dos ítems: Mano de obra Externa y Mano de obra Interna.

EMPAQUE: caja un poco MAYOR que la pieza en las 3 cotas si viaja armada (holgura 2–8 cm). Si pieza.alto = 185, caja.alto NO puede ser 100 salvo que declares desarmado/KD en ficha.descripcion y entonces la caja cubre el panel más grande.`;

    if (modo === 'entrevista') {
        return `${base}

${bloqueLocaleParaPrompt()}

${bloqueGrupalParaPrompt()}

${bloqueCubicacionMuebleParaPrompt()}

MODO ACTUAL: FASE 1 ENTREVISTA.
Responde SIEMPRE en español, breve. Aunque el proyecto sea exportación o el Brief esté en inglés. PROHIBIDO JSON, arrays de ítems o costos. NO desgloses la matriz.
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

${bloqueGrupalParaPrompt()}

${bloqueCubicacionMuebleParaPrompt()}

MODO ACTUAL: FASE 2 GENERAR COTIZACIÓN.
El analista confirmó. Usa rangos que haya dicho; si no hay, [1, 50, 100].
Primero un párrafo corto EN ESPAÑOL (chat interno). AL FINAL un único JSON (sin markdown) con esta forma:
{"rangos":[1,50,100],"ficha":{"titulo":"...","descripcion":"3 a 4 líneas comerciales","dimensiones":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}"},"empaque":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}","unidades":200,"peso":0}},"items":[{"fuente":"[Estimado IA]","nombre":"PS Cal.60 frente — planta 60,3x7,9; h 3,0; paredes 2x3,0; pestaña 2 cm/lado = 64,3x15,9 cm = 0,102 m2","categoria":"Materias Primas","cantidad":0.102,"um":"m2","costoUnitario":0,"es_global":false}]}
nombre de cada ítem: título + cuenta con cifras (pieza, tolerancia, merma, tiras de 6 m). ficha.titulo y ficha.descripcion en ${langF}. descripcion de ficha: 3–4 líneas, tono cotización (qué es, uso, materiales visibles, no receta de costo). La receta de costo va en items.nombre, no en la ficha.
Medidas de ficha SOLO en ${umF}, tomadas del PDF/render o de lo que confirmó el analista. PROHIBIDO copiar dim_diseno u otras medidas del Lead Odoo.
empaque: caja un poco MAYOR que la pieza (holgura 2–8 cm por lado) si viaja armada. empaque.alto >= dimensiones.alto. PROHIBIDO caja más baja que el mueble (ej. pieza 185 y caja 100) salvo KD declarado. empaque.unidades = und. por caja, OBLIGATORIO si hay caja (si el analista dijo 200U, unidades=200; no lo dejes 0 ni lo omitas). empaque.peso = peso de UNA caja, en kg si las medidas son cm o en lb si son in. Llénalo solo si el analista, el PDF o el chat lo dijeron. Si dieron el peso de una pieza y las unidades por caja, multiplica. PROHIBIDO estimarlo por el render o por los m² de lámina. Si no está dicho, 0.
costoUnitario en COP sin IVA. Para es_global true, costoUnitario es el costo del LOTE (o por cada cantidad del lote), NO por producto. No rellenes costos[] en ítems globales: la app hace costoUnitario/Q. PROHIBIDO poner el valor de una caja o un flete en cada unidad del rango (ej. 5.000 cenefas).`;
    }
    return `${base}

${bloqueLocaleParaPrompt()}

${bloqueGrupalParaPrompt()}

${bloqueCubicacionMuebleParaPrompt()}

MODO ACTUAL: FASE 3 AJUSTES sobre la matriz ya listada.
Responde SIEMPRE en español, breve. Si modificas ítems o el analista pide regenerar/rehacer la matriz, AL FINAL el JSON completo {"rangos":[...],"ficha":{...},"items":[...]} sin markdown. Incluye ficha si cambian título, texto o medidas. Cada items.nombre debe conservar la cuenta (cifras, merma, tiras 6 m, tolerancia de termoformado).
Si solo aclaras, no envíes JSON.
Puede adjuntar archivos extra: úsalos. No pidas recargar la página.
Al rellenar costos: flete, cajas máster, elaboración de troquel (dado) y setup van con es_global true y costoUnitario = COP del lote (o por caja del lote). NO copies esos valores a costos[] ni los pongas como precio de cada producto. La app diluye Costo/Q. PROHIBIDO asignar una caja o un flete entero a cada unidad del rango (ej. 5.000 cenefas). Troquelado por golpe y materiales por pieza: es_global false.

=== FICHA ACTUAL ===
${JSON.stringify(typeof leerFichaComercialUI === "function" ? leerFichaComercialUI() : {})}

=== MATRIZ ACTUAL ===
${JSON.stringify({ rangos: (typeof lotesSimulacion !== 'undefined' ? lotesSimulacion.map(l => l.q) : [1]), items: (typeof itemsPresupuesto !== 'undefined' ? itemsPresupuesto : []) })}`;
}

window.limpiarMesaDeTrabajo = function() {
    /* Anula un guardado de sesión pendiente del proyecto anterior (podía reescribir Tipo Grupal). */
    if (typeof window.cancelarGuardarSesionPendiente === "function") window.cancelarGuardarSesionPendiente();
    window.historialChatIA = [];
    window.faseIA = 'idle';
    window._avisoProMatriz = false;
    window.odooPistas = {};
    window.elementoActivoId = "";
    ocultarHintGeminiPro();
    if (typeof window.vaciarArchivosIA === 'function') window.vaciarArchivosIA();
    if (typeof itemsPresupuesto !== 'undefined') itemsPresupuesto = [];
    if (typeof lotesSimulacion !== 'undefined') lotesSimulacion = [{ id: 'l1', q: 1 }];
    /* Tipo Individual antes de resetear versiones: si queda Grupal, pintarBarraElementos recrea Pieza 1. */
    window.tipoEstructura = "INDIVIDUAL";
    const selTipo = document.getElementById("selTipoEstructura");
    if (selTipo) selTipo.value = "INDIVIDUAL";
    if (typeof pintarFichaComercial === "function") pintarFichaComercial(typeof fichaComercialVacia === "function" ? fichaComercialVacia() : {});
    if (typeof resetearVersionesProyecto === "function") resetearVersionesProyecto();
    if (typeof aplicarTipoEstructura === "function") aplicarTipoEstructura("INDIVIDUAL", { hidratar: true });
    const fee = document.getElementById("simFee");
    if (fee) fee.value = "0";
    if (typeof poblarSelectComisiones === "function") poblarSelectComisiones();
    if (typeof window.pintarHistorialChatIA === "function") window.pintarHistorialChatIA([], "idle");
    else resetChatPlaceholder();
    if (typeof renderizarTablaItems === 'function') renderizarTablaItems();
    if (typeof actualizarSimuladorFinanciero === "function") actualizarSimuladorFinanciero();
    actualizarBotonGenerar();
    if (typeof guardarSesionTrabajo === "function") guardarSesionTrabajo();
    else if (typeof programarGuardarSesion === "function") programarGuardarSesion();
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

async function llamarGeminiConImagenes(promptTexto, timeoutMs, opts) {
    opts = opts || {};
    const toggle = document.getElementById('togglePro')?.checked || false;
    const forzarPro = (opts.forzarPro !== undefined) ? !!opts.forzarPro : toggle;
    const parts = [{ text: promptTexto }];
    const vis = (typeof window.prepararPartesGemini === "function")
        ? await window.prepararPartesGemini()
        : archivosActivosIA_().map(function (f) {
            return { inlineData: { mimeType: f.mimeType, data: f.data } };
        });
    vis.forEach(function (p) { parts.push(p); });
    const ms = timeoutMs || (forzarPro ? 300000 : 240000);
    const data = await realizarPeticionBD({ action: 'gemini_analizar', modulo: 'costos', forzarPro: forzarPro, parts: parts }, { timeoutMs: ms });
    pintarUsoGemini(data && data.uso);
    return data;
}

async function llamarGeminiChat(promptTexto, timeoutMs) {
    const forzarPro = document.getElementById('togglePro')?.checked || false;
    const data = await realizarPeticionBD({ action: 'gemini_chat', modulo: 'costos', forzarPro: forzarPro, promptText: promptTexto }, { timeoutMs: timeoutMs || 120000 });
    pintarUsoGemini(data && data.uso);
    return data;
}

function fmtTokens(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return Math.round(n / 1000) + "k";
    return String(n);
}

function fmtCop(n) {
    return "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");
}
function costoCopUso_(uso) {
    if (uso.costoCop != null) return Number(uso.costoCop) || 0;
    const trm = (typeof trmActualGlobal === "number" && trmActualGlobal > 0) ? trmActualGlobal : (Number(uso.trmCop) || 4150);
    return (Number(uso.costoUsd) || 0) * trm;
}
function pctCopUso_(uso, cop) {
    const cupo = Number(uso.cupoCop) || 0;
    if (cupo > 0) return Math.max(0, Math.min(100, Math.round(cop * 1000 / cupo) / 10));
    return Math.max(0, Math.min(100, Number(uso.porcentaje) || 0));
}
function pintarUsoGemini(uso) {
    if (!uso) return;
    window._ultimoUsoGemini = uso;
    const fill = document.getElementById("geminiUsoFill");
    const txt = document.getElementById("geminiUsoTxt");
    const wrap = document.getElementById("geminiUsoWrap");
    const alerta = document.getElementById("geminiUsoAlerta");
    const cop = costoCopUso_(uso);
    const cupoCop = Number(uso.cupoCop) || 0;
    const pct = pctCopUso_(uso, cop);
    const agotado = !!uso.cupoAgotado || String(uso.ultimoEstado) === "cupo";
    if (fill) fill.style.width = (agotado ? 100 : pct) + "%";
    if (wrap) {
        wrap.classList.remove("ok", "warn", "crit");
        wrap.classList.add(agotado || pct >= 95 ? "crit" : (pct >= 80 ? "warn" : "ok"));
        wrap.title = "Consumo Gemini de toda la empresa este mes: ~" + fmtCop(cop) + (cupoCop ? " de " + fmtCop(cupoCop) : "") + " (" + pct + "%), " + (uso.llamadas || 0) + " llamadas, " + fmtTokens(uso.tokensTotal) + " tokens." + (uso.saldoCop != null ? " Te restan " + fmtCop(uso.saldoCop) + (uso.calibrado ? " (sincronizado con Google)" : " (estimado, sin calibrar)") + "." : "") + " Clic para el detalle por día, módulo y modelo.";
    }
    if (txt) {
        if (agotado) txt.textContent = "Sin crédito";
        else if (cupoCop > 0) txt.textContent = pct + "% · " + fmtCop(cop) + " / " + fmtCop(cupoCop);
        else txt.textContent = pct + "% · " + fmtCop(cop);
    }
    if (alerta) {
        if (agotado) {
            alerta.classList.remove("d-none");
            alerta.textContent = "Gemini se quedó sin cupo o crédito. Recarga en Google AI Studio y reintenta.";
        } else {
            alerta.classList.add("d-none");
        }
    }
    pintarDetalleUsoGemini_(uso);
}
function filaUsoHtml_(f, trm) {
    const cop = f.costoCop != null ? f.costoCop : (Number(f.costoUsd) || 0) * trm;
    return "<tr><td>" + String(f.nombre || f.fecha || "—") + "</td><td class='text-end'>" + (f.llamadas || 0) + "</td><td class='text-end'>" + fmtTokens(f.tokensIn) + "</td><td class='text-end'>" + fmtTokens(f.tokensOut) + "</td><td class='text-end'>" + fmtTokens(f.tokensPensados) + "</td><td class='text-end'>" + fmtTokens(f.tokensTotal) + "</td><td class='text-end'>" + fmtCop(cop) + "</td></tr>";
}
function tablaUsoHtml_(titulo, filas, trm, vacio) {
    let h = "<h6 class='fw-bold mt-3 mb-2' style='font-size:0.85rem;'>" + titulo + "</h6>";
    if (!filas || !filas.length) return h + "<p class='text-muted small'>" + vacio + "</p>";
    h += "<div class='table-responsive'><table class='table table-sm align-middle mb-0'><thead class='table-light'><tr><th></th><th class='text-end'>Llamadas</th><th class='text-end'>Entrada</th><th class='text-end'>Salida*</th><th class='text-end'>Pensados</th><th class='text-end'>Total</th><th class='text-end'>Costo est.</th></tr></thead><tbody>";
    filas.forEach(function (f) { h += filaUsoHtml_(f, trm); });
    return h + "</tbody></table></div>";
}
function pintarDetalleUsoGemini_(uso) {
    const box = document.getElementById("geminiUsoDetalle");
    if (!box || !uso) return;
    const trm = (typeof trmActualGlobal === "number" && trmActualGlobal > 0) ? trmActualGlobal : (Number(uso.trmCop) || 4150);
    const cop = costoCopUso_(uso);
    const cupoCop = Number(uso.cupoCop) || 0;
    const pct = pctCopUso_(uso, cop);
    const hoy = uso.hoy || {};
    const nombreModulo = { costos: "Costos", logistica: "Logística", ajustes: "Ajustes", catalogo: "Catálogo (sync PDF)", excel: "Excel" };
    const porModulo = (uso.porModulo || []).map(function (f) { return Object.assign({}, f, { nombre: nombreModulo[f.nombre] || f.nombre }); });
    const dias = (uso.ultimos7 || []).map(function (f) { return { nombre: f.fecha, llamadas: f.llamadas, tokensTotal: f.tokensTotal, costoCop: f.costoCop, costoUsd: f.costoUsd }; });
    let h = "<div class='row g-2 text-center'>";
    h += "<div class='col-6 col-md-3'><div class='border rounded p-2'><div class='text-muted' style='font-size:0.7rem;'>MES (" + String(uso.periodo || "") + ")</div><div class='fw-bold'>" + fmtCop(cop) + "</div><div class='small text-muted'>" + pct + "%" + (cupoCop ? " de " + fmtCop(cupoCop) : "") + "</div></div></div>";
    h += "<div class='col-6 col-md-3'><div class='border rounded p-2'><div class='text-muted' style='font-size:0.7rem;'>HOY</div><div class='fw-bold'>" + fmtCop(hoy.costoCop != null ? hoy.costoCop : (Number(hoy.costoUsd) || 0) * trm) + "</div><div class='small text-muted'>" + (hoy.llamadas || 0) + " llamadas</div></div></div>";
    h += "<div class='col-6 col-md-3'><div class='border rounded p-2'><div class='text-muted' style='font-size:0.7rem;'>LLAMADAS DEL MES</div><div class='fw-bold'>" + (uso.llamadas || 0) + "</div><div class='small text-muted'>Último modelo: " + String(uso.ultimoModelo || "—") + "</div></div></div>";
    h += "<div class='col-6 col-md-3'><div class='border rounded p-2'><div class='text-muted' style='font-size:0.7rem;'>TOKENS DEL MES</div><div class='fw-bold'>" + fmtTokens(uso.tokensTotal) + "</div><div class='small text-muted'>In " + fmtTokens(uso.tokensIn) + " · Out " + fmtTokens(uso.tokensOut) + "</div></div></div>";
    h += "</div>";
    const saldoUso = uso.saldoCop != null ? Number(uso.saldoCop) : (cupoCop > 0 ? cupoCop - cop : null);
    if (saldoUso != null) {
        if (uso.calibrado && uso.calibracion) {
            h += "<div class='border rounded p-2 mt-2 small' style='background:#f0fdf4;'>Sincronizado con Google el <strong>" + String(uso.calibracion.fecha || "") + "</strong>: al calibrar restaban <strong>" + fmtCop(uso.calibracion.saldoCop) + "</strong> · consumo de la app desde entonces: <strong>" + fmtCop(uso.costoDesdeCalibracionCop || 0) + "</strong> · <strong>te restan " + fmtCop(saldoUso) + "</strong>.</div>";
        } else {
            h += "<div class='border rounded p-2 mt-2 small text-muted'>Saldo estimado (sin calibrar): te restan <strong>" + fmtCop(saldoUso) + "</strong>. Para sincronizarlo con Google: Ajustes → Prompts IA → Presupuesto Gemini → Calibrar ahora.</div>";
        }
    }
    h += tablaUsoHtml_("Por módulo (mes)", porModulo, trm, "Sin detalle por módulo todavía: llega con la próxima llamada tras publicar el backend nuevo.");
    h += tablaUsoHtml_("Por modelo (mes)", uso.porModelo || [], trm, "Sin detalle por modelo todavía.");
    h += tablaUsoHtml_("Últimos días", dias, trm, "Sin uso registrado en los últimos días.");
    h += "<p class='text-muted mt-3 mb-0' style='font-size:0.72rem;'>* La salida incluye los tokens pensados (razonamiento), que Google cobra como salida. Costo estimado con las tarifas de Ajustes y TRM " + fmtCop(trm).replace("$", "$") + " COP/USD; Google puede aplicar descuentos, por eso su consola manda. El detalle diario empieza a llenarse al publicar el <code>backend.gs</code> nuevo; el total del mes sí conserva el histórico.</p>";
    box.innerHTML = h;
}
window.abrirModalUsoGemini = function () {
    if (window._ultimoUsoGemini) pintarDetalleUsoGemini_(window._ultimoUsoGemini);
    const el = document.getElementById("modalUsoGemini");
    if (el && window.bootstrap) bootstrap.Modal.getOrCreateInstance(el).show();
    if (typeof window.refrescarUsoGemini === "function") window.refrescarUsoGemini();
};

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
    if (!archivosActivosIA_().length) {
        return mostrarNotificacion("Sube un render o PDF, o marca uno como Grupo para verlo en esta pieza.", "warning");
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
    const typingId = marcarEsperaIA_("Preparando archivos…");
    try {
        esperaIATexto_("Consultando a Gemini…");
        const extra = reanudar
            ? `\nYa hay matriz y/o chat. NO reinicies la entrevista. Resume el análisis. Si el costeo está listo, pide que pulse Generar matriz.\n=== MATRIZ ACTUAL ===\n${JSON.stringify({ rangos: (typeof lotesSimulacion !== "undefined" ? lotesSimulacion.map(function (l) { return l.q; }) : [1]), items: (typeof itemsPresupuesto !== "undefined" ? itemsPresupuesto : []) })}\n=== HISTORIAL ===\n${historialComoTexto()}`
            : "\nInicia la Fase 1.";
        const promptTexto = `${instruccionesFase(hayItems ? "ajustes" : "entrevista")}\n\nEl analista acaba de cargar ${archivosActivosIA_().length} archivo(s) de esta vista.${extra}`;
        const data = await llamarGeminiConImagenes(promptTexto, 240000, { forzarPro: false });
        if (!data.exito) throw new Error(data.mensaje);
        const texto = textoGemini(data);
        const sinJson = textoSinJson(texto, extraerCotizacionIA(texto));
        window.historialChatIA.push({ role: 'model', text: sinJson });
        pintarMensaje('model', sinJson.replace(/\n/g, '<br>'), data.modeloUsado);
        mostrarNotificacion(reanudar ? "Continúa el análisis. Generar matriz está activo." : "Entrevista iniciada. Cuando termines, pulsa Generar matriz.", "success");
        promoverFaseIA();
        if (textoInvitaGenerarMatriz(sinJson)) mostrarHintGeminiPro(true);
    } catch (err) {
        mostrarNotificacion(err.message || "No se pudo analizar. Reintenta.", "danger");
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
    if (!msg && !archivosActivosIA_().length) return;
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
        const data = await llamarGeminiChat(promptTexto, 90000);
        if (!data.exito) throw new Error(data.mensaje);
        const texto = textoGemini(data);
        const cotizacion = extraerCotizacionIA(texto);
        if (cotizacion && Array.isArray(cotizacion.items) && modo === 'ajustes') {
            esperaIATexto_("Aplicando la matriz…");
            await aplicarCotizacionEnUI(cotizacion);
        } else if (cotizacion && cotizacion.ficha && typeof aplicarFichaComercial === "function") {
            rellenarEmpUndDesdeChat_(cotizacion.ficha);
            rellenarEmpPesoDesdeChat_(cotizacion.ficha);
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

${bloqueGrupalParaPrompt()}

TAREA: rellenar SOLO la ficha comercial. NO toques costos ni matriz.
Párrafo del chat: español. Idioma de titulo/descripcion de la ficha: ${langF}. Medidas SOLO en ${umF}.
titulo corto (como en cotización). descripcion 3–4 líneas: qué es, uso en PDV, materiales visibles. Sin receta de costo.
dimensiones del mueble (ancho × fondo × alto) del PDF/render o del chat. empaque de la caja un poco MAYOR que la pieza (no más baja). Si va desarmada, dilo en descripcion.
empaque.unidades = und. por caja: si el analista dijo «caja con 200U», unidades=200. No lo dejes vacío.
empaque.peso = peso de UNA caja, en kg si las medidas son cm o en lb si son in. Solo si el analista, el PDF o el chat lo dijeron. Si no está dicho, 0. No lo estimes.
partida: elige UNA de esta lista (solo partidas configuradas en Ajustes→Logística→Aranceles para el país del cliente). Formato 9403.20.00.00. Si no hay ninguna que encaje o la lista está vacía, deja partida vacía y en el párrafo del chat invita a configurar la partida faltante en Ajustes → Logística → Aranceles para ese país. País del cliente: ${(typeof logPaisCliente === "function" ? logPaisCliente() : "") || (typeof localeProyectoActual === "function" ? (localeProyectoActual().pais || "sin país") : "sin país")}. Lista: ${((typeof logListaPartidas === "function" ? logListaPartidas({ pais: (typeof logPaisCliente === "function" ? logPaisCliente() : "") }) : []).map(function (p) { return p.codigo + " " + p.nombre; }).join("; ") || "(vacía: no hay partidas de Aranceles para este país)")}.
PROHIBIDO inventar una partida que no esté en la lista. PROHIBIDO copiar medidas del Lead Odoo si el archivo o el chat ya dieron otras.

Ficha actual (puedes completar huecos, no borres lo que ya esté bien):
${JSON.stringify(fichaHoy)}

Responde un párrafo corto y AL FINAL un único JSON sin markdown:
{"ficha":{"titulo":"...","descripcion":"...","partida":"9403.20.00.00","dimensiones":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}"},"empaque":{"ancho":0,"fondo":0,"alto":0,"um":"${umF}","unidades":200,"peso":0}}}`;
}

window.completarFichaIA = async function () {
    const hayArchivos = archivosActivosIA_().length > 0;
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
        let notaPartida = "";
        if (cotizacion && cotizacion.ficha && typeof aplicarFichaComercial === "function") {
            rellenarEmpUndDesdeChat_(cotizacion.ficha);
            rellenarEmpPesoDesdeChat_(cotizacion.ficha);
            const paisCli = typeof logPaisCliente === "function" ? logPaisCliente() : "";
            const listaP = typeof logListaPartidas === "function" ? logListaPartidas({ pais: paisCli }) : [];
            let partIn = cotizacion.ficha.partida ? String(cotizacion.ficha.partida) : "";
            if (partIn && paisCli && typeof logPartidaFmt === "function") {
                const fmt = logPartidaFmt(partIn);
                if (!listaP.some(function (p) { return p.codigo === fmt; })) {
                    cotizacion.ficha.partida = "";
                    partIn = "";
                    notaPartida = "No hay esa partida en Aranceles para " + paisCli + ". Quedó en blanco: configúrala en Ajustes → Logística → Aranceles y vuelve a elegirla.";
                }
            }
            aplicarFichaComercial(cotizacion.ficha);
            if (typeof logSugerirPartida === "function" && typeof leerFichaComercialUI === "function") {
                const ya = leerFichaComercialUI();
                if (!ya.partida) {
                    const sug = logSugerirPartida((ya.titulo || "") + "\n" + (ya.descripcion || ""), { pais: paisCli });
                    if (sug && sug.codigo) aplicarFichaComercial({ partida: sug.codigo });
                    else if (!notaPartida && paisCli && !listaP.length) {
                        notaPartida = "No hay partidas de Aranceles para " + paisCli + ". Configura la partida en Ajustes → Logística → Aranceles.";
                    } else if (!notaPartida && !ya.partida) {
                        notaPartida = "No pude asignar partida para " + (paisCli || "este país") + ". Revisa el material o configúrala en Ajustes → Logística → Aranceles.";
                    }
                }
            }
            if (typeof logAlCambiarPartidaFicha === "function") logAlCambiarPartidaFicha();
            avisarEmpaqueVsPieza_();
        }
        let charla = textoSinJson(texto, cotizacion);
        if (notaPartida) charla = (charla ? charla + "\n\n" : "") + notaPartida;
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
    const hayArchivos = archivosActivosIA_().length > 0;
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
            ? await llamarGeminiConImagenes(promptTexto, 300000)
            : await llamarGeminiChat(promptTexto, 240000);
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
