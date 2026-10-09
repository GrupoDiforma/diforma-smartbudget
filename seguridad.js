function aplicarControlDeRoles() {
    const rol = localStorage.getItem('smartbudget_rol') || 'USER';
    const btnAjustes = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Ajustes') || b.getAttribute('onclick') === 'abrirModalAdmin()');
    if (btnAjustes) btnAjustes.style.display = (rol === 'ADMIN') ? 'inline-block' : 'none';
}

function verificarAccesoCorporativo() {
    if (localStorage.getItem('smartbudget_token')) { aplicarControlDeRoles(); return; }
    document.body.insertAdjacentHTML('beforeend', `
        <div id="authOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(241, 245, 249, 0.98);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div class="card p-4 shadow-lg text-center" style="max-width:400px; width:90%; border-top: 5px solid #d32f2f;">
                <h3 class="mb-3 text-dark"><i class="bi bi-shield-lock-fill text-danger me-2"></i>Acceso Seguro</h3>
                <p class="text-muted small mb-4">Ingresa tu correo corporativo para recibir un código.</p>
                <div id="stepEmail">
                    <input type="email" id="authEmail" class="form-control mb-3 text-center" placeholder="usuario@grupodiforma.com">
                    <button class="btn btn-danger w-100 fw-bold" id="btnSolicitar" onclick="ui_solicitarOTP()">1. Recibir Código</button>
                </div>
                <div id="stepCode" class="d-none">
                    <div class="alert alert-success py-2 small mb-3">✔ Código enviado.</div>
                    <input type="text" id="authCode" class="form-control mb-3 text-center fs-3 fw-bold" placeholder="• • • • • •" maxlength="6" style="letter-spacing: 5px;">
                    <button class="btn btn-success w-100 fw-bold" id="btnVerificar" onclick="ui_verificarOTP()">2. Validar y Entrar</button>
                    <button class="btn btn-link w-100 mt-2 text-muted small" onclick="document.getElementById('stepCode').classList.add('d-none');document.getElementById('stepEmail').classList.remove('d-none');">Usar otro correo</button>
                </div>
            </div>
        </div>
    `);
}

async function ui_solicitarOTP() {
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    if(!email.endsWith('@grupodiforma.com')) return alert("Usa un correo @grupodiforma.com");
    document.getElementById('btnSolicitar').innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    document.getElementById('btnSolicitar').disabled = true;
    try {
        const res = await fetch(CONFIG_GLOBAL.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'solicitar_otp', email: email }) });
        const data = await res.json();
        if(data.exito) { document.getElementById('stepEmail').classList.add('d-none'); document.getElementById('stepCode').classList.remove('d-none'); } 
        else { alert(data.mensaje); }
    } catch(e) { alert("Error de red."); }
    document.getElementById('btnSolicitar').innerHTML = '1. Recibir Código';
    document.getElementById('btnSolicitar').disabled = false;
}

async function ui_verificarOTP() {
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    const code = document.getElementById('authCode').value.trim();
    if(code.length !== 6) return alert("Ingresa el código de 6 dígitos.");
    document.getElementById('btnVerificar').innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';
    document.getElementById('btnVerificar').disabled = true;
    try {
        const res = await fetch(CONFIG_GLOBAL.gasUrl, { method: 'POST', body: JSON.stringify({ action: 'verificar_otp', email: email, otp: code }) });
        const data = await res.json();
        if(data.exito) {
            localStorage.setItem('smartbudget_token', data.token); localStorage.setItem('smartbudget_email', data.email); localStorage.setItem('smartbudget_rol', data.rol);
            document.getElementById('authOverlay').remove();
            if(typeof mostrarNotificacion === "function") mostrarNotificacion(`Acceso corporativo validado (${data.rol}).`, "success");
            aplicarControlDeRoles();
        } else { alert(data.mensaje); }
    } catch(e) { alert("Error validando el código."); }
    document.getElementById('btnVerificar').innerHTML = '2. Validar y Entrar';
    document.getElementById('btnVerificar').disabled = false;
}
