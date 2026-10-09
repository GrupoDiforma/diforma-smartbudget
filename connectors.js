window.archivosGemaBase64 = [];
window.procesarArchivosNativos = function(files) { if(!files || files.length===0) return; Array.from(files).forEach(file => { const reader = new FileReader(); reader.onload = e => { if(e.target.result) { window.archivosGemaBase64.push({ name: file.name, mimeType: file.type || 'image/jpeg', data: e.target.result.split(',')[1] }); window.actualizarListaUI(); } }; reader.readAsDataURL(file); }); };
window.actualizarListaUI = function() { const c = document.getElementById('listaArchivosContainer'); const s = document.getElementById('dropzoneStatusText'); if(s) s.innerText = window.archivosGemaBase64.length > 0 ? `✓ ${window.archivosGemaBase64.length} listo(s)` : "JPG, PNG o PDF"; if(c) c.innerHTML = window.archivosGemaBase64.map((f, i) => `<div class="d-flex justify-content-between bg-white border p-1 rounded mb-1" style="font-size:0.75rem;"><span class="text-truncate"><i class="bi bi-image me-1"></i>${f.name}</span><i class="bi bi-x text-danger cursor-pointer fs-5" onclick="window.eliminarGemaArchivo(${i})"></i></div>`).join(''); };
window.eliminarGemaArchivo = function(idx) { window.archivosGemaBase64.splice(idx, 1); window.actualizarListaUI(); };
function inicializarDragAndDropArchivos() { const box = document.getElementById('dropzoneBox'); if(!box) return; ['dragover','dragenter'].forEach(e => box.addEventListener(e, ev => { ev.preventDefault(); box.classList.add('dragover'); })); ['dragleave','drop'].forEach(e => box.addEventListener(e, ev => { ev.preventDefault(); box.classList.remove('dragover'); })); box.addEventListener('drop', ev => { ev.preventDefault(); if(ev.dataTransfer.files.length > 0) window.procesarArchivosNativos(ev.dataTransfer.files); }); }

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

        const badge = document.getElementById('badgeTipo');
        if(badge) { badge.innerText = tipo; badge.className = tipo === "EXPORTACION" ? "badge bg-primary px-2 py-1" : "badge badge-nacional px-2 py-1"; }
        mostrarAlertaOdoo("¡Proyecto importado!", "success");
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

function agregarMaterialOdoo(p) { itemsPresupuesto.push({ id: Date.now()+Math.random(), fuente: "[Odoo ERP]", nombre: p.nombre, categoria: p.categoria, cantidad: 1, um: p.um, costoUnitario: p.costoUnitario, costos:{} }); lotesSimulacion.forEach(l => itemsPresupuesto[itemsPresupuesto.length-1].costos[l.id]=p.costoUnitario); renderizarTablaItems(); mostrarNotificacion("Agregado a matriz", "success"); bootstrap.Modal.getInstance(document.getElementById('modalOdooMateriales'))?.hide(); }

window.procesarPlanoIA = async function() {
    if (window.archivosGemaBase64.length === 0) return mostrarNotificacion("Sube un plano.", "warning");
    const btn = document.getElementById('btnEjecutarIA'); const txtOriginal = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando a Servidor...'; btn.disabled = true;
    try {
        const forzarPro = document.getElementById('togglePro')?.checked || false;
        const promptBase = document.getElementById('txtPromptParticular').value || 'Desglosar materiales';
        let umList = (CONFIG_GLOBAL && CONFIG_GLOBAL.unidades) ? CONFIG_GLOBAL.unidades.replace(/\n/g, ", ") : "UND, Metros, kg";
        let promptTexto = `${CONFIG_GLOBAL.promptMaestro}\n\nInstrucción:\n${promptBase}\n\nREGLAS JSON: Campo 'um' exacto a: ${umList}. El campo 'nombre' NO debe incluir corchetes de fuente. REGLA CRÍTICA DE COSTOS: NUNCA devuelvas costoUnitario en 0. Estima obligatoriamente un valor numérico real en COP según el mercado industrial colombiano. Preserva el campo 'fuente' como '[Base interna]' si aplica o '[Estimado IA]'.\n\nREGLA ESTRICTA: Devuelve SOLO el Array JSON plano sin markdown.`;
        let parts = [{ text: promptTexto }];
        window.archivosGemaBase64.forEach(f => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));

        const data = await realizarPeticionBD({ action: 'gemini_analizar', forzarPro: forzarPro, parts: parts });
        if(!data.exito) throw new Error(data.mensaje);

        const texto = data.data.candidates[0].content.parts[0].text;
        const match = texto.match(/\[[\s\S]*\]/); if(!match) throw new Error("JSON no válido desde Servidor.");
        window.reemplazarMatrizDesdeIA(JSON.parse(match[0]));
        mostrarNotificacion(`Análisis exitoso (Modelo: ${data.modeloUsado}).`, "success");
    } catch(err) { mostrarNotificacion("Error Servidor: " + err.message, "danger"); } finally { btn.innerHTML = txtOriginal; btn.disabled = false; }
};

window.enviarMensajeChat = async function() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if(!msg) return;

    const chatBox = document.getElementById('chatBox');
    if(chatBox.innerHTML.includes("Analiza un render o saluda a la IA")) chatBox.innerHTML = '';
    chatBox.innerHTML += `<div class="text-end mb-2"><span class="bg-primary text-white p-2 rounded d-inline-block text-start" style="font-size:0.8rem;">${msg}</span></div>`;
    input.value = '';

    const typingId = 'typing_' + Date.now();
    chatBox.innerHTML += `<div id="${typingId}" class="text-start mb-2"><span class="text-muted" style="font-size:0.8rem;"><span class="spinner-border spinner-border-sm"></span> Conectando al Servidor...</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const forzarPro = document.getElementById('togglePro')?.checked || false;
        let umList = (CONFIG_GLOBAL && CONFIG_GLOBAL.unidades) ? CONFIG_GLOBAL.unidades.replace(/\n/g, ", ") : "UND, Metros, kg";
        let promptText = `Eres un analista de presupuestos.\n=== MATRIZ ACTUAL ===\n${JSON.stringify(itemsPresupuesto)}\n\n=== SOLICITUD ===\n${msg}\n\nINSTRUCCIÓN CRÍTICA:\n1. Responde con texto natural breve.\n2. SI la solicitud modifica la matriz, incluye AL FINAL la matriz JSON actualizada (inicia con [ y termina con ]).\n3. REGLA DE UNIDADES: Si hay JSON, el campo 'um' DEBE ser exacto a estas: ${umList}.`;

        const data = await realizarPeticionBD({ action: 'gemini_chat', forzarPro: forzarPro, promptText: promptText });
        document.getElementById(typingId)?.remove();
        if(!data.exito) throw new Error(data.mensaje);

        let txt = data.data.candidates[0].content.parts[0].text;
        let match = txt.match(/\[[\s\S]*\]/);
        let charla = txt;

        if (match) {
            charla = txt.replace(match[0], "").trim();
            if(!charla) charla = "Matriz actualizada.";
            try { window.reemplazarMatrizDesdeIA(JSON.parse(match[0])); } catch(e) {}
        }
        chatBox.innerHTML += `<div class="text-start mb-2"><span class="bg-light border p-2 rounded d-inline-block text-dark" style="font-size:0.8rem; max-width:90%;"><b>${data.modeloUsado}:</b><br>${charla.replace(/\n/g,'<br>')}</span></div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch(err) {
        document.getElementById(typingId)?.remove();
        mostrarNotificacion("Error Servidor Chat: " + err.message, "danger");
    }
};
