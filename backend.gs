/**
 * Alcances OAuth (appsscript.json → oauthScopes). Sin "drive" la plantilla no se puede publicar.
 *   https://www.googleapis.com/auth/spreadsheets
 *   https://www.googleapis.com/auth/drive
 *   https://www.googleapis.com/auth/script.send_mail
 *   https://www.googleapis.com/auth/script.external_request
 *   https://www.googleapis.com/auth/script.scriptapp
 *   https://www.googleapis.com/auth/userinfo.email
 */
var CORPORATE_TOKEN = "Diforma_SmartBudget_2026_Secure_Key";

// ⚠️ LISTA BLANCA DE ADMINISTRADORES (correos en minúsculas)
var ADMIN_EMAILS = [
  "tu_correo@grupodiforma.com",
  "edwin.laverde@grupodiforma.com"
];

function doGet(e) {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SmartBudget Backend</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;}</style></head><body><h2>⚡ Backend Serverless Global Activo</h2></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;

    // --- 1. RUTAS PÚBLICAS (No requieren token corporativo) ---
    if (action === "solicitar_otp") return outputJSON(solicitarOTP(params.email));
    if (action === "verificar_otp") return outputJSON(verificarOTP(params.email, params.otp));
    if (action === "obtener_config") return outputJSON(obtenerConfiguracionGlobal());

    // --- 2. BÓVEDA CERRADA (Requiere Token) ---
    if (params.authKey !== CORPORATE_TOKEN) return outputJSON({exito: false, mensaje: "Acceso no autorizado. Token inválido."});

    var result = { exito: false, mensaje: "Acción no válida" };
    if (action === "guardar_config") result = guardarConfiguracionGlobal(params.payload, params.email);
    else if (action === "guardar_anchos_matriz") result = guardarAnchosMatriz(params.anchos, params.email);
    else if (action === "guardar") result = guardarPresupuestoBD(params.payload);
    else if (action === "listar") result = listarPresupuestosBD();
    else if (action === "obtener") result = obtenerProyectoPorId(params.id);
    else if (action === "eliminar") result = eliminarRegistroHistorico(params.id);
    else if (action === "odoo_buscar") result = proxyOdooBuscar(params.codigo);
    else if (action === "odoo_cotizacion_datos") result = proxyOdooCotizacionDatos(params.codigo);
    else if (action === "odoo_imagen_proyecto") result = proxyOdooImagenProyecto(params.codigo, params.campo);
    else if (action === "guardar_cotizacion") result = guardarCotizacionBD(params, params.email);
    else if (action === "listar_cotizaciones") result = listarCotizacionesBD();
    else if (action === "obtener_cotizacion") result = obtenerCotizacionBD(params.id, params.rev);
    else if (action === "cotizacion_imagenes") result = imagenesCotizacionBD(params.ids, params.modo);
    else if (action === "odoo_productos") result = proxyOdooProductos(params.query);
    else if (action === "gemini_analizar") result = proxyGeminiAnalizar(params);
    else if (action === "gemini_chat") result = proxyGeminiChat(params);
    else if (action === "gemini_uso") result = obtenerUsoGemini();
    else if (action === "catalogo_drive") result = obtenerCatalogoMaestro();
    else if (action === "catalogo_maestro") result = obtenerCatalogoMaestro();
    else if (action === "catalogo_estado") result = estadoCatalogoMaestro();
    else if (action === "catalogo_sincronizar") result = sincronizarCatalogoMaestro(params.email);
    else if (action === "catalogo_listar") result = listarCatalogoMaestro(params);
    else if (action === "catalogo_guardar_fila") result = guardarFilaCatalogo(params, params.email);
    else if (action === "catalogo_crear_fila") result = crearFilaCatalogo(params, params.email);
    else if (action === "catalogo_activar_cron") result = asegurarTriggerCatalogoSemanal(params.email);
    else if (action === "catalogo_desactivar_cron") result = desactivarTriggerCatalogoSemanal(params.email);
    else if (action === "catalogo_sincronizar_odoo") result = sincronizarCatalogoOdoo(params.email);
    else if (action === "plantilla_xlsx_guardar") result = guardarPlantillaXlsx(params);
    else if (action === "plantilla_xlsx_obtener") result = obtenerPlantillaXlsx(params);

    return outputJSON(result);
  } catch (err) {
    return outputJSON({exito: false, mensaje: err.message});
  }
}

function outputJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// --- SISTEMA OTP Y ROLES ---
function solicitarOTP(email) {
  if (!email || email.split('@')[1] !== "grupodiforma.com") return {exito: false, mensaje: "Solo correos @grupodiforma.com"};
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  CacheService.getScriptCache().put("OTP_" + email, otp, 600);
  MailApp.sendEmail(email, "Clave de Acceso - SmartBudget Diforma", "Tu código seguro de un solo uso es:\n\n" + otp + "\n\nSistemas Diforma.");
  return {exito: true, mensaje: "Código enviado."};
}

function verificarOTP(email, otp_ingresado) {
  var otp_guardado = CacheService.getScriptCache().get("OTP_" + email);
  if (otp_guardado && otp_guardado === String(otp_ingresado)) {
    CacheService.getScriptCache().remove("OTP_" + email);
    var rol = ADMIN_EMAILS.indexOf(email.toLowerCase()) !== -1 ? "ADMIN" : "USER";
    return {exito: true, token: CORPORATE_TOKEN, rol: rol, email: email.toLowerCase()};
  }
  return {exito: false, mensaje: "Código incorrecto o ha expirado."};
}

// --- CONFIGURACIÓN GLOBAL ---
function obtenerHojaConfig() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("DB_SHEET_ID_V28");
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Configuracion_Global");
  if (!sheet) {
    sheet = ss.insertSheet("Configuracion_Global");
    sheet.appendRow(["ID", "JSON_Config", "Ultima_Actualizacion", "Actualizado_Por"]);
  }
  return sheet;
}

function obtenerConfiguracionGlobal() {
  var sheet = obtenerHojaConfig();
  var data = sheet.getDataRange().getValues();
  if (data.length > 1 && data[1][1]) {
    return { exito: true, data: JSON.parse(data[1][1]) };
  }
  return { exito: false, mensaje: "Sin configuración remota aún." };
}

function guardarConfiguracionGlobal(configData, email) {
  if (ADMIN_EMAILS.indexOf(email.toLowerCase()) === -1) return {exito: false, mensaje: "Permisos insuficientes."};
  var sheet = obtenerHojaConfig();
  var fechaHoy = new Date().toISOString().replace('T', ' ').substring(0, 19);
  var jsonStr = JSON.stringify(configData);
  var data = sheet.getDataRange().getValues();
  if (data.length > 1) { sheet.getRange(2, 2, 1, 3).setValues([[jsonStr, fechaHoy, email]]); }
  else { sheet.appendRow(["CONF_MAESTRA", jsonStr, fechaHoy, email]); }
  return {exito: true, mensaje: "Configuración global actualizada para toda la empresa."};
}

function guardarAnchosMatriz(anchos, email) {
  if (ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) === -1) {
    return { exito: false, mensaje: "Permisos insuficientes." };
  }
  var sheet = obtenerHojaConfig();
  var data = sheet.getDataRange().getValues();
  var cfg = {};
  if (data.length > 1 && data[1][1]) {
    try { cfg = JSON.parse(data[1][1]); } catch (e) { cfg = {}; }
  }
  cfg.anchosMatriz = (anchos && typeof anchos === "object") ? anchos : {};
  var fechaHoy = new Date().toISOString().replace("T", " ").substring(0, 19);
  var jsonStr = JSON.stringify(cfg);
  if (data.length > 1) { sheet.getRange(2, 2, 1, 3).setValues([[jsonStr, fechaHoy, email]]); }
  else { sheet.appendRow(["CONF_MAESTRA", jsonStr, fechaHoy, email]); }
  return { exito: true, mensaje: "Anchos de matriz guardados para toda la empresa." };
}

// ==========================================
// PROXY ODOO ERP
// ==========================================
function odooCredenciales_() {
  var p = PropertiesService.getScriptProperties();
  return {
    url: p.getProperty("ODOO_URL") || "https://grupodiforma.odoo.com",
    db: p.getProperty("ODOO_DB") || "carlosnavarreteeclosion-grupodiforma-production-26892718",
    user: p.getProperty("ODOO_USER") || "edwin.laverde@grupodiforma.com",
    pwd: p.getProperty("ODOO_PWD")
  };
}

function rpcCallGAS(service, method, args) {
  var c = odooCredenciales_();
  if (!c.pwd) throw new Error("Falta la contraseña de Odoo (ODOO_PWD) en Script Properties.");
  var res = UrlFetchApp.fetch(c.url.replace(/\/$/, "") + "/jsonrpc", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service: service, method: method, args: args }, id: Math.floor(Math.random() * 1000) }),
    muteHttpExceptions: true
  });
  var json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.data ? json.error.data.message : json.error.message);
  return json.result;
}

var _odooUidCache = null;
function odooUid_() {
  if (_odooUidCache) return _odooUidCache;
  var c = odooCredenciales_();
  var uid = rpcCallGAS("common", "authenticate", [c.db, c.user, c.pwd, {}]);
  if (!uid) throw new Error("Odoo rechazó usuario/contraseña. Revisa ODOO_PWD.");
  _odooUidCache = uid;
  return uid;
}

function odooCount_(model, domain) {
  var c = odooCredenciales_();
  var uid = odooUid_();
  return Number(rpcCallGAS("object", "execute_kw", [c.db, uid, c.pwd, model, "search_count", [domain || []]])) || 0;
}

function odooSearchRead_(model, domain, fields, limit, offset, order) {
  var c = odooCredenciales_();
  var uid = odooUid_();
  var kw = { fields: fields, limit: limit || 80 };
  if (offset) kw.offset = offset;
  if (order) kw.order = order;
  return rpcCallGAS("object", "execute_kw", [c.db, uid, c.pwd, model, "search_read", [domain || []], kw]);
}

function proxyOdooBuscar(codigo) {
  var records = odooSearchRead_("crm.lead", [["name", "ilike", codigo]], [
    "name", "partner_id", "user_id", "id_vendedor", "create_date", "pricelist_id",
    "id_disenador", "id_presupuestador", "idioma", "lang_code", "lang_id",
    "country_id", "tipo_medida", "funcionales", "dim_diseno", "obs_presupuesto"
  ], 1, 0, "");
  return (!records || records.length === 0) ? {exito: false, mensaje: "No encontrada"} : {exito: true, data: records[0]};
}

// ==========================================
// COTIZACIÓN PDF: contacto del cliente + datos del comercial (firma)
// Acción independiente de odoo_buscar: no la hace más lenta. Solo lee campos que
// existan en tu Odoo; lo que falte vuelve vacío y se avisa en "avisos".
// ==========================================
function odooCamposExistentes_(model, campos) {
  var c = odooCredenciales_();
  var uid = odooUid_();
  var meta = rpcCallGAS("object", "execute_kw", [c.db, uid, c.pwd, model, "fields_get", [campos], { attributes: ["type", "relation"] }]);
  return meta || {};
}

function odooLeerRegistro_(model, id, campos) {
  var meta = odooCamposExistentes_(model, campos);
  var ok = campos.filter(function (f) { return meta[f]; });
  if (!ok.length) return {};
  var c = odooCredenciales_();
  var uid = odooUid_();
  var r = rpcCallGAS("object", "execute_kw", [c.db, uid, c.pwd, model, "read", [[id]], { fields: ok }]);
  return (r && r[0]) || {};
}

function odooTexto_(v) {
  if (v === false || v === null || v === undefined) return "";
  return String(v).trim();
}

function odooRelId_(v) {
  if (v && v.length) return v[0];
  return typeof v === "number" ? v : 0;
}

/** Persona desde res.partner, res.users o hr.employee → {nombre, cargo, correo, telefono, web}. */
function odooPersona_(model, id) {
  var out = { nombre: "", cargo: "", correo: "", telefono: "", web: "" };
  if (!model || !id) return out;
  var rec = odooLeerRegistro_(model, id, [
    "name", "function", "job_title", "email", "work_email", "phone", "mobile", "work_phone", "mobile_phone", "website", "partner_id"
  ]);
  out.nombre = odooTexto_(rec.name);
  out.cargo = odooTexto_(rec.function || rec.job_title);
  out.correo = odooTexto_(rec.email || rec.work_email);
  out.telefono = odooTexto_(rec.phone || rec.work_phone || rec.mobile || rec.mobile_phone);
  out.web = odooTexto_(rec.website);
  var pid = odooRelId_(rec.partner_id);
  if (pid && model !== "res.partner" && (!out.cargo || !out.web || !out.telefono || !out.correo)) {
    var p = odooLeerRegistro_("res.partner", pid, ["function", "website", "phone", "mobile", "email"]);
    if (!out.cargo) out.cargo = odooTexto_(p["function"]);
    if (!out.web) out.web = odooTexto_(p.website);
    if (!out.telefono) out.telefono = odooTexto_(p.phone || p.mobile);
    if (!out.correo) out.correo = odooTexto_(p.email);
  }
  return out;
}

function proxyOdooCotizacionDatos(codigo) {
  codigo = String(codigo || "").trim();
  if (!codigo) return { exito: false, mensaje: "Falta el código del proyecto." };
  var pedidos = ["name", "partner_id", "contact_id", "id_vendedor", "user_id", "contact_name", "partner_name", "email_from", "phone", "function"];
  var meta = odooCamposExistentes_("crm.lead", pedidos);
  var campos = pedidos.filter(function (f) { return meta[f]; });
  var recs = odooSearchRead_("crm.lead", [["name", "ilike", codigo]], campos, 1, 0, "");
  if (!recs || !recs.length) return { exito: false, mensaje: "No encontrada" };
  var lead = recs[0];
  var avisos = [];

  var contacto = { nombre: "", cargo: "", correo: "", telefono: "" };
  if (meta.contact_id && lead.contact_id) {
    var pc = odooPersona_(meta.contact_id.relation || "res.partner", odooRelId_(lead.contact_id));
    contacto = { nombre: pc.nombre, cargo: pc.cargo, correo: pc.correo, telefono: pc.telefono };
  } else {
    contacto.nombre = odooTexto_(lead.contact_name);
    contacto.cargo = odooTexto_(lead["function"]);
    contacto.correo = odooTexto_(lead.email_from);
    contacto.telefono = odooTexto_(lead.phone);
  }
  if (!contacto.nombre) avisos.push("Odoo no trae el nombre del contacto.");
  else if (!contacto.cargo) avisos.push("El contacto no tiene cargo en Odoo.");

  var comercial = { nombre: "", cargo: "", correo: "", telefono: "", web: "" };
  if (meta.id_vendedor && lead.id_vendedor) {
    comercial = odooPersona_(meta.id_vendedor.relation || "res.users", odooRelId_(lead.id_vendedor));
  } else if (meta.user_id && lead.user_id) {
    comercial = odooPersona_("res.users", odooRelId_(lead.user_id));
  }
  if (!comercial.nombre) avisos.push("Odoo no trae el comercial del proyecto.");
  else if (!comercial.cargo || !comercial.correo || !comercial.telefono) avisos.push("A la firma le faltan datos del comercial (cargo, correo o teléfono).");

  var nombre = odooTexto_(lead.name);
  return {
    exito: true,
    data: {
      codigoProyecto: nombre.split(" ")[0],
      nombreProyecto: nombre,
      cliente: lead.partner_id ? String(lead.partner_id[1] || "") : "",
      contacto: contacto,
      comercial: comercial,
      avisos: avisos
    }
  };
}

// ==========================================
// COTIZACIÓN PDF: imagen del proyecto (campo binario de crm.lead)
// No hace falta saber el nombre del campo: busca los campos binarios del lead,
// prueba primero las versiones pequeñas (image_256, image_128…) y devuelve la
// primera imagen que tenga contenido. En "candidatos" lista lo que encontró,
// para poder fijar el campo correcto si hay más de uno.
// ==========================================
function odooMimeImagen_(b64) {
  var h = String(b64 || "").substring(0, 12);
  if (h.indexOf("/9j/") === 0) return "image/jpeg";
  if (h.indexOf("iVBOR") === 0) return "image/png";
  if (h.indexOf("R0lGOD") === 0) return "image/gif";
  if (h.indexOf("UklGR") === 0) return "image/webp";
  if (h.indexOf("PHN2Zy") === 0 || h.indexOf("PD94") === 0) return "image/svg+xml";
  return "image/jpeg";
}

function proxyOdooImagenProyecto(codigo, campoForzado) {
  codigo = String(codigo || "").trim();
  if (!codigo) return { exito: false, mensaje: "Falta el código del proyecto." };
  var c = odooCredenciales_();
  var uid = odooUid_();
  var meta = rpcCallGAS("object", "execute_kw", [c.db, uid, c.pwd, "crm.lead", "fields_get", [[]], { attributes: ["type", "string"] }]) || {};
  var binarios = Object.keys(meta).filter(function (f) {
    return meta[f].type === "binary" && !/_filename$|_name$/.test(f);
  });
  var prioridad = function (f) {
    var m = f.match(/^image_(\d+)$/);
    if (m) return 100 - Math.min(99, Math.round(Number(m[1]) / 20)); // 128, 256, 512... de menor a mayor
    if (/imagen|image|foto|render|thumb/i.test(f + " " + (meta[f].string || ""))) return 10;
    return 1;
  };
  binarios.sort(function (a, b) { return prioridad(b) - prioridad(a); });
  if (campoForzado && meta[campoForzado]) binarios = [campoForzado];
  if (!binarios.length) return { exito: false, mensaje: "El modelo crm.lead no tiene campos de imagen.", candidatos: [] };

  var ids = odooSearchRead_("crm.lead", [["name", "ilike", codigo]], ["name"], 1, 0, "");
  if (!ids || !ids.length) return { exito: false, mensaje: "No encontrada" };
  var id = ids[0].id;

  var vistos = [];
  for (var i = 0; i < binarios.length && i < 8; i++) {
    var f = binarios[i];
    var r = rpcCallGAS("object", "execute_kw", [c.db, uid, c.pwd, "crm.lead", "read", [[id]], { fields: [f] }]);
    var b64 = r && r[0] && r[0][f];
    vistos.push(f + (b64 ? "" : " (vacío)"));
    if (b64 && typeof b64 === "string") {
      return {
        exito: true,
        data: {
          campo: f,
          etiqueta: meta[f].string || f,
          mime: odooMimeImagen_(b64),
          base64: b64,
          kb: Math.round(b64.length * 0.75 / 1024),
          candidatos: vistos
        }
      };
    }
  }
  return { exito: false, mensaje: "El proyecto no tiene imagen en: " + vistos.join(", "), candidatos: vistos };
}

// ==========================================
// COTIZACIONES: historial en la hoja "Cotizaciones" + imágenes en Drive
// - Una fila por revisión. ID (C-00001) identifica la cotización; Rev sube cada vez
//   que se guarda una revisión de una cotización abierta del historial.
// - El contenido (JSON sin imágenes) se parte en hasta 4 celdas de 45.000 caracteres.
// - Bóveda: unidad compartida GD-SmartBudget (solo Script + 1 respaldo).
//     01_Sistema      → DRIVE_SISTEMA_FOLDER_ID (libro + plantilla Excel)
//     02_Cotizaciones → DRIVE_COTIZACIONES_FOLDER_ID (renders JPG)
//   Listados de proveedores: carpeta DRIVE_PRECIOS_FOLDER_ID (sigue en Compras).
// - No crear carpetas en "Mi unidad": si falta el ID, se aborta.
// ==========================================
var COT_COLS_ = ["ID", "Rev", "Numero", "Tipo", "Proyecto", "Proyectos", "Cliente", "Idioma", "Moneda", "Total", "Creado", "Usuario", "Comentario", "Datos_1", "Datos_2", "Datos_3", "Datos_4"];
var COT_CHUNK_ = 45000;

function obtenerHojaCotizaciones_() {
  var ss = libroHistorico_();
  var sh = ss.getSheetByName("Cotizaciones");
  if (!sh) {
    sh = ss.insertSheet("Cotizaciones");
    sh.appendRow(COT_COLS_);
    sh.setFrozenRows(1);
  }
  return sh;
}

function driveGetJson_(url) {
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + tokenDrive_() },
    muteHttpExceptions: true
  });
  var json = JSON.parse(res.getContentText() || "{}");
  if (res.getResponseCode() >= 400) {
    throw new Error((json.error && json.error.message) || ("Drive HTTP " + res.getResponseCode()));
  }
  return json;
}

function primeraCarpetaPorNombres_(nombres) {
  for (var i = 0; i < nombres.length; i++) {
    var it = DriveApp.getFoldersByName(nombres[i]);
    if (it.hasNext()) {
      var f = it.next();
      return { id: f.getId(), name: f.getName() };
    }
  }
  return null;
}

function buscarCarpetaDriveApi_(nombre) {
  var q = "name = '" + String(nombre).replace(/'/g, "\\'") + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  var url = "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(q) +
    "&includeItemsFromAllDrives=true&supportsAllDrives=true&corpora=allDrives&fields=files(id,name)&pageSize=10";
  try {
    var files = driveGetJson_(url).files || [];
    return files[0] || null;
  } catch (e) {
    return null;
  }
}

function diagnosticoBoveda_() {
  var nombres = [];
  try {
    var it = DriveApp.getFoldersByName("01_Sistema");
    if (it.hasNext()) nombres.push("DriveApp ve 01_Sistema");
    var it2 = DriveApp.getFoldersByName("02_Cotizaciones");
    if (it2.hasNext()) nombres.push("DriveApp ve 02_Cotizaciones");
  } catch (e1) {
    nombres.push("DriveApp: " + e1.message);
  }
  try {
    var pack = driveGetJson_("https://www.googleapis.com/drive/v3/drives?pageSize=50&fields=drives(id,name)");
    var drives = pack.drives || [];
    nombres.push("unidades: " + (drives.map(function (d) { return d.name; }).join(", ") || "(ninguna)"));
  } catch (e2) {
    nombres.push("lista unidades: " + e2.message);
  }
  return nombres.join(" · ");
}

/** Encuentra 01_Sistema y 02_Cotizaciones por nombre (unidad compartida o Mi unidad). */
function carpetasBovedaSmartBudget_() {
  DriveApp.getRootFolder();
  var sistema = primeraCarpetaPorNombres_(["01_Sistema", "01 Sistema", "01-Sistema"]) ||
    buscarCarpetaDriveApi_("01_Sistema");
  var cots = primeraCarpetaPorNombres_(["02_Cotizaciones", "02 Cotizaciones", "02-Cotizaciones"]) ||
    buscarCarpetaDriveApi_("02_Cotizaciones");
  if (!sistema || !cots) {
    throw new Error("No encuentro 01_Sistema o 02_Cotizaciones. " + diagnosticoBoveda_());
  }
  return { driveId: "", driveName: "GD-SmartBudget", sistema: sistema, cotizaciones: cots };
}

function recordarBoveda_(boveda) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("DRIVE_SISTEMA_FOLDER_ID", boveda.sistema.id);
  props.setProperty("DRIVE_COTIZACIONES_FOLDER_ID", boveda.cotizaciones.id);
  props.setProperty("DRIVE_PLANTILLA_FOLDER_ID", boveda.sistema.id);
}

function carpetaPorId_(prop, etiqueta) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(prop);
  if (!id) {
    recordarBoveda_(carpetasBovedaSmartBudget_());
    id = props.getProperty(prop);
  }
  if (!id) throw new Error("Falta " + prop + " (carpeta " + etiqueta + " en GD-SmartBudget).");
  try { return DriveApp.getFolderById(id); }
  catch (e) { throw new Error("No se abre " + etiqueta + ". Revisa que el Script sea miembro de GD-SmartBudget."); }
}

function carpetaCotizaciones_() {
  return carpetaPorId_("DRIVE_COTIZACIONES_FOLDER_ID", "02_Cotizaciones");
}

function carpetaSistema_() {
  return carpetaPorId_("DRIVE_SISTEMA_FOLDER_ID", "01_Sistema");
}

/** Mueve un archivo a una carpeta de unidad compartida (conserva el ID). */
function moverArchivoACarpetaDrive_(fileId, folderId) {
  if (!fileId || !folderId) return;
  var token = tokenDrive_();
  var meta = UrlFetchApp.fetch(
    "https://www.googleapis.com/drive/v3/files/" + fileId + "?fields=parents&supportsAllDrives=true",
    { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true }
  );
  var json = JSON.parse(meta.getContentText() || "{}");
  var parents = json.parents || [];
  var url = "https://www.googleapis.com/drive/v3/files/" + fileId +
    "?supportsAllDrives=true&addParents=" + folderId +
    (parents.length ? "&removeParents=" + parents.join(",") : "");
  var res = UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: "{}",
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 400) {
    var err = JSON.parse(res.getContentText() || "{}");
    throw new Error((err.error && err.error.message) || ("Drive HTTP " + res.getResponseCode()));
  }
}

/**
 * Ejecutar una vez (▶) después de pegar este backend.gs.
 * Busca GD-SmartBudget sola, guarda los IDs y confirma libro/plantilla en 01_Sistema.
 */
function anclarBovedaSmartBudget() {
  var props = PropertiesService.getScriptProperties();
  var boveda = carpetasBovedaSmartBudget_();
  recordarBoveda_(boveda);
  var out = ["unidad " + boveda.driveName, boveda.sistema.name, boveda.cotizaciones.name];
  var sheetId = props.getProperty("DB_SHEET_ID_V28");
  if (sheetId) {
    moverArchivoACarpetaDrive_(sheetId, boveda.sistema.id);
    out.push("libro en " + boveda.sistema.name);
  }
  var plantilla = props.getProperty("PLANTILLA_XLSX_ID");
  if (plantilla) {
    moverArchivoACarpetaDrive_(plantilla, boveda.sistema.id);
    out.push("plantilla en " + boveda.sistema.name);
  }
  var n = recogerImagenesViejasCotizacion_(boveda.cotizaciones.id);
  if (n) out.push(n + " imagen(es) recolectadas");
  return "Bóveda anclada: " + out.join(" · ");
}

function recogerImagenesViejasCotizacion_(destId) {
  var n = 0;
  var it = DriveApp.getFoldersByName("SmartBudget_Cotizaciones");
  while (it.hasNext()) {
    var f = it.next();
    if (f.getId() === destId) continue;
    var files = f.getFiles();
    while (files.hasNext()) {
      moverArchivoACarpetaDrive_(files.next().getId(), destId);
      n++;
    }
  }
  return n;
}

function verificarBovedaSmartBudget() {
  var props = PropertiesService.getScriptProperties();
  var sis = carpetaSistema_();
  var cot = carpetaCotizaciones_();
  var sheetId = props.getProperty("DB_SHEET_ID_V28");
  if (!sheetId) throw new Error("Falta DB_SHEET_ID_V28.");
  SpreadsheetApp.openById(sheetId);
  return "OK · " + sis.getName() + " + " + cot.getName() + " + libro " + sheetId;
}

function fechaCotizacion_(d) {
  return d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") : String(d || "");
}

function guardarCotizacionBD(p, email) {
  if (!p || !p.datos) return { exito: false, mensaje: "Falta el contenido de la cotización." };
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = obtenerHojaCotizaciones_();
    var props = PropertiesService.getScriptProperties();
    var id = String(p.id || "");
    var rev = 1;
    if (id) {
      var last = sh.getLastRow();
      if (last > 1) {
        var v = sh.getRange(2, 1, last - 1, 2).getValues();
        for (var i = 0; i < v.length; i++) {
          if (String(v[i][0]) === id) rev = Math.max(rev, (Number(v[i][1]) || 0) + 1);
        }
      }
    } else {
      var seq = (Number(props.getProperty("COT_SEQ")) || 0) + 1;
      props.setProperty("COT_SEQ", String(seq));
      id = "C-" + ("00000" + seq).slice(-5);
    }
    var datos = JSON.parse(p.datos);
    var refs = {};
    var carpeta = null;
    (p.imagenes || []).forEach(function (im) {
      if (!im || !im.k || !im.data) return;
      var m = String(im.data).match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return;
      if (!carpeta) carpeta = carpetaCotizaciones_();
      var nombre = id + "_r" + rev + "_" + String(im.k).replace(/[^\w]/g, "_") + ".jpg";
      var file = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre));
      publicarArchivoCotizacion_(file);
      refs[im.k] = file.getId();
    });
    (datos.filas || []).forEach(function (f) {
      if (refs[f.uid + ":img"]) f.imgRef = refs[f.uid + ":img"];
      if (refs[f.uid + ":src"]) f.srcRef = refs[f.uid + ":src"];
    });
    var json = JSON.stringify(datos);
    if (json.length > COT_CHUNK_ * 4) return { exito: false, mensaje: "La cotización es demasiado grande para guardarse (reduce filas o textos)." };
    var partes = [];
    for (var k = 0; k < 4; k++) partes.push(json.substring(k * COT_CHUNK_, (k + 1) * COT_CHUNK_));
    var creado = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    sh.appendRow([id, rev, String(p.numero || ""), String(p.tipo || ""), String(p.proyecto || ""), String(p.proyectos || ""), String(p.cliente || ""), String(p.idioma || ""), String(p.moneda || ""), Number(p.total) || 0, creado, String(email || ""), String(p.comentario || "")].concat(partes));
    try { CacheService.getScriptCache().remove("cot_list_v1"); } catch (eC) {}
    return { exito: true, mensaje: "Cotización guardada.", data: { id: id, rev: rev, numero: String(p.numero || ""), refs: refs } };
  } finally {
    lock.releaseLock();
  }
}

function listarCotizacionesBD() {
  var cache = CacheService.getScriptCache();
  try {
    var hit = cache.get("cot_list_v1");
    if (hit) return { exito: true, data: JSON.parse(hit) };
  } catch (e0) {}
  var sh = obtenerHojaCotizaciones_();
  var last = sh.getLastRow();
  if (last <= 1) return { exito: true, data: [] };
  var desde = Math.max(2, last - 399);
  var rows = sh.getRange(desde, 1, last - desde + 1, 13).getValues();
  var out = rows.map(function (r) {
    return {
      id: String(r[0]), rev: Number(r[1]) || 1, numero: String(r[2]), tipo: String(r[3]),
      proyecto: String(r[4]), proyectos: String(r[5]), cliente: String(r[6]), idioma: String(r[7]),
      moneda: String(r[8]), total: Number(r[9]) || 0, creado: fechaCotizacion_(r[10]),
      usuario: String(r[11]), comentario: String(r[12])
    };
  });
  out.reverse();
  try { cache.put("cot_list_v1", JSON.stringify(out), 120); } catch (e1) {}
  return { exito: true, data: out };
}

function obtenerCotizacionBD(id, rev) {
  var sh = obtenerHojaCotizaciones_();
  var last = sh.getLastRow();
  if (last <= 1) return { exito: false, mensaje: "No se encontró la cotización." };
  var pares = sh.getRange(2, 1, last - 1, 2).getValues();
  var idx = -1, mejor = 0;
  for (var i = 0; i < pares.length; i++) {
    if (String(pares[i][0]) !== String(id)) continue;
    var r = Number(pares[i][1]) || 1;
    if (rev ? r === Number(rev) : r > mejor) { idx = i; mejor = r; }
  }
  if (idx < 0) return { exito: false, mensaje: "No se encontró la cotización." };
  var d = sh.getRange(idx + 2, 1, 1, 17).getValues()[0];
  var json = [13, 14, 15, 16].map(function (c) { return String(d[c] || ""); }).join("");
  var datos;
  try { datos = JSON.parse(json); } catch (e) { return { exito: false, mensaje: "El contenido guardado está dañado." }; }
  return {
    exito: true,
    data: {
      id: String(d[0]), rev: Number(d[1]) || 1, numero: String(d[2]), tipo: String(d[3]),
      proyecto: String(d[4]), proyectos: String(d[5]), cliente: String(d[6]), idioma: String(d[7]),
      moneda: String(d[8]), total: Number(d[9]) || 0, creado: fechaCotizacion_(d[10]),
      comentario: String(d[12]), datos: datos
    }
  };
}

function urlImagenDrive_(fid, px) {
  return "https://lh3.googleusercontent.com/d/" + fid + "=s" + (px || 800);
}

function publicarArchivoCotizacion_(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* ya era público o sin permiso */ }
}

function imagenesCotizacionBD(ids, modo) {
  var out = {};
  var blob = String(modo || "") === "blob";
  (ids || []).slice(0, 30).forEach(function (fid) {
    try {
      var f = DriveApp.getFileById(fid);
      if (!/^C-\d+_r\d+_/.test(f.getName())) return;
      if (!blob) {
        publicarArchivoCotizacion_(f);
        out[fid] = urlImagenDrive_(fid, 800);
      } else {
        var b = f.getBlob();
        out[fid] = "data:" + b.getContentType() + ";base64," + Utilities.base64Encode(b.getBytes());
      }
    } catch (e) { /* archivo no disponible: se omite */ }
  });
  return { exito: true, data: out };
}

function proxyOdooProductos(query) {
  var records = odooSearchRead_("product.product", ["|", ["name", "ilike", query], ["default_code", "ilike", query]], ["default_code", "name", "categ_id", "uom_id", "standard_price"], 20, 0, "");
  return {exito: true, data: records};
}

// ==========================================
// CATÁLOGO MAESTRO (Sheets) ← ingesta desde Drive
// Carpeta cruda: Listados de precios (PDF/xlsx de proveedores)
// Destino: hoja Catalogo_Maestro en el mismo libro del historial
// ==========================================
function folderPreciosDriveId() {
  return PropertiesService.getScriptProperties().getProperty("DRIVE_PRECIOS_FOLDER_ID") || "18VUiZpF_ihTIW1GNKj7_H343dRvzpCjN";
}

function folderPlantillaExcelId() {
  return PropertiesService.getScriptProperties().getProperty("DRIVE_PLANTILLA_FOLDER_ID") || "1vkDQDsScf3WivUygRtpkRoZmzqknwpbT";
}

function tokenDrive_() {
  return ScriptApp.getOAuthToken();
}

function papeleraDrive_(fileId) {
  if (!fileId) return;
  try {
    UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + fileId + "?supportsAllDrives=true", {
      method: "patch",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + tokenDrive_() },
      payload: JSON.stringify({ trashed: true }),
      muteHttpExceptions: true
    });
  } catch (e) {}
}

function subirArchivoACarpetaDrive_(folderId, nombre, bytes, mime) {
  mime = mime || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  var boundary = "sb_xlsx_" + Date.now();
  var meta = JSON.stringify({ name: nombre, parents: [folderId], mimeType: mime });
  var body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
    meta + "\r\n--" + boundary + "\r\nContent-Type: " + mime + "\r\nContent-Transfer-Encoding: base64\r\n\r\n" +
    Utilities.base64Encode(bytes) + "\r\n--" + boundary + "--";
  var res = UrlFetchApp.fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name",
    {
      method: "post",
      contentType: "multipart/related; boundary=" + boundary,
      headers: { Authorization: "Bearer " + tokenDrive_() },
      payload: body,
      muteHttpExceptions: true
    }
  );
  var json = JSON.parse(res.getContentText() || "{}");
  if (!json.id) {
    var msg = (json.error && json.error.message) ? json.error.message : ("HTTP " + res.getResponseCode());
    throw new Error("Drive no recibió la plantilla: " + msg);
  }
  return json;
}

/** Ejecutar una vez desde el editor (▶). Debe aparecer un diálogo NUEVO que mencione Drive (ver, editar, crear). */
function autorizarDrivePlantilla() {
  var blob = Utilities.newBlob("ok", "text/plain", "_sb_auth_plantilla.txt");
  var file = DriveApp.createFile(blob);
  var folder = DriveApp.getFolderById(folderPlantillaExcelId());
  try { file.moveTo(folder); } catch (e1) {
    try { folder.addFile(file); } catch (e2) {}
  }
  try { file.setTrashed(true); } catch (e3) { papeleraDrive_(file.getId()); }
  return "Drive de escritura OK: " + folder.getName();
}

function guardarPlantillaXlsx(params) {
  if (ADMIN_EMAILS.indexOf(String(params.email || "").toLowerCase()) === -1) {
    return { exito: false, mensaje: "Solo administradores pueden publicar la plantilla." };
  }
  var b64 = String(params.base64 || "").replace(/^data:[^;]+;base64,/, "");
  if (!b64) return { exito: false, mensaje: "Falta el archivo." };
  if (b64.length > 6000000) return { exito: false, mensaje: "La plantilla es demasiado pesada." };
  var bytes;
  try { bytes = Utilities.base64Decode(b64); }
  catch (e) { return { exito: false, mensaje: "No se pudo leer el Excel." }; }
  var nombre = String(params.nombre || "plantilla-presupuesto.xlsx").replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ()]/g, "_");
  if (!/\.xlsx$/i.test(nombre)) nombre += ".xlsx";
  var mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  var props = PropertiesService.getScriptProperties();
  var oldId = props.getProperty("PLANTILLA_XLSX_ID");
  var creado = subirArchivoACarpetaDrive_(folderPlantillaExcelId(), nombre, bytes, mime);
  if (oldId) papeleraDrive_(oldId);
  props.setProperty("PLANTILLA_XLSX_ID", creado.id);
  var mapa = params.mapa;
  if (typeof mapa !== "string") mapa = JSON.stringify(mapa || {});
  if (mapa.length > 8000) mapa = "{}";
  props.setProperty("PLANTILLA_XLSX_MAP", mapa);
  props.setProperty("PLANTILLA_XLSX_NOMBRE", nombre);
  var mapaObj = {};
  try { mapaObj = JSON.parse(mapa); } catch (e3) { mapaObj = {}; }
  return { exito: true, mensaje: "Plantilla publicada.", data: { id: creado.id, nombre: nombre, mapa: mapaObj } };
}

function obtenerPlantillaXlsx(params) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("PLANTILLA_XLSX_ID");
  var mapaRaw = props.getProperty("PLANTILLA_XLSX_MAP");
  var mapa = null;
  try { mapa = mapaRaw ? JSON.parse(mapaRaw) : null; } catch (e) { mapa = null; }
  if (!id) return { exito: true, data: { hay: false, mapa: mapa } };
  try {
    var file = DriveApp.getFileById(id);
    var data = {
      hay: true,
      nombre: file.getName(),
      actualizado: file.getLastUpdated().toISOString(),
      mapa: mapa
    };
    if (params && params.soloMeta) return { exito: true, data: data };
    data.base64 = Utilities.base64Encode(file.getBlob().getBytes());
    return { exito: true, data: data };
  } catch (err) {
    return { exito: true, data: { hay: false, mapa: mapa, mensaje: err.message } };
  }
}

function libroHistorico_() {
  var sheetId = PropertiesService.getScriptProperties().getProperty("DB_SHEET_ID_V28");
  if (!sheetId) throw new Error("Falta DB_SHEET_ID_V28.");
  return SpreadsheetApp.openById(sheetId);
}

/** Ejecutar una vez desde el editor (▶): renombra el libro del historial a "SmartBudget_Presupuestos".
 *  El script lo encuentra por ID, así que el cambio de nombre no rompe nada. */
function renombrarLibroHistorico() {
  var ss = libroHistorico_();
  var antes = ss.getName();
  ss.rename("SmartBudget_Presupuestos");
  return "Renombrado: " + antes + " → " + ss.getName() + " (" + ss.getUrl() + ")";
}

function obtenerHojaCatalogo() {
  var ss = libroHistorico_();
  var sheet = ss.getSheetByName("Catalogo_Maestro");
  if (!sheet) {
    sheet = ss.insertSheet("Catalogo_Maestro");
    sheet.appendRow(["categoria", "proveedor", "nombre", "um", "costo_cop", "vigente", "revisar", "fuente_archivo", "file_id", "ruta", "actualizado"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function obtenerHojaMetaCatalogo() {
  var ss = libroHistorico_();
  var sheet = ss.getSheetByName("Catalogo_Meta");
  if (!sheet) {
    sheet = ss.insertSheet("Catalogo_Meta");
    sheet.appendRow(["estado", "archivo", "indice", "total", "mensaje", "ultima_sync", "ultima_por", "errores"]);
    sheet.appendRow(["idle", "", 0, 0, "", "", "", ""]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ahoraBogota_() {
  return Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd HH:mm:ss");
}

function escribirProgresoCatalogo_(p) {
  var sheet = obtenerHojaMetaCatalogo();
  var row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  var estado = p.estado != null ? p.estado : row[0];
  var archivo = p.archivo != null ? p.archivo : row[1];
  var indice = p.indice != null ? p.indice : row[2];
  var total = p.total != null ? p.total : row[3];
  var mensaje = p.mensaje != null ? p.mensaje : row[4];
  var ultima = p.ultima_sync != null ? p.ultima_sync : row[5];
  var por = p.ultima_por != null ? p.ultima_por : row[6];
  var errores = p.errores != null ? p.errores : row[7];
  sheet.getRange(2, 1, 1, 8).setValues([[estado, archivo, indice, total, mensaje, ultima, por, errores]]);
  SpreadsheetApp.flush();
  try {
    CacheService.getScriptCache().put("CAT_PROGRESS", JSON.stringify({
      estado: estado, archivo: archivo, indice: indice, total: total, mensaje: mensaje,
      ultima_sync: ultima, ultima_por: por, errores: errores
    }), 400);
  } catch (e) {}
}

function leerProgresoCatalogo_() {
  try {
    var c = CacheService.getScriptCache().get("CAT_PROGRESS");
    if (c) return JSON.parse(c);
  } catch (e) {}
  var row = obtenerHojaMetaCatalogo().getRange(2, 1, 1, 8).getValues()[0];
  return {
    estado: row[0] || "idle", archivo: row[1] || "", indice: Number(row[2]) || 0, total: Number(row[3]) || 0,
    mensaje: row[4] || "", ultima_sync: row[5] || "", ultima_por: row[6] || "", errores: row[7] || ""
  };
}

function obtenerHojaIngesta() {
  var ss = libroHistorico_();
  var sheet = ss.getSheetByName("Ingesta_Log");
  if (!sheet) {
    sheet = ss.insertSheet("Ingesta_Log");
    sheet.appendRow(["file_id", "nombre", "modificado", "estado", "filas", "error", "fecha"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function indiceColumnaCatalogo(header, claves) {
  for (var i = 0; i < header.length; i++) {
    var h = String(header[i] || "").toLowerCase();
    for (var k = 0; k < claves.length; k++) {
      if (h.indexOf(claves[k]) !== -1) return i;
    }
  }
  return -1;
}

function parseCostoCop_(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  var s = String(val).replace(/[$\s]/g, "").replace(/\./g, "").replace(/,/g, ".");
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

var UMS_OFICIALES_DEF_ = ["UND", "Metros", "kg", "Hojas", "m2", "Litros", "Juego", "Rollox50mts", "Rollox88 Hojas"];
var _umsOficialesCache = null;

function listaUnidadesOficiales_() {
  if (_umsOficialesCache) return _umsOficialesCache;
  var arr = [];
  try {
    var cfg = obtenerConfiguracionGlobal();
    if (cfg.exito && cfg.data && cfg.data.unidades) {
      arr = String(cfg.data.unidades).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
  } catch (e) {}
  if (!arr.length) arr = UMS_OFICIALES_DEF_.slice();
  var seen = {};
  var out = [];
  arr.concat(UMS_OFICIALES_DEF_).forEach(function (u) {
    var k = u.toLowerCase();
    if (!seen[k]) { seen[k] = true; out.push(u); }
  });
  _umsOficialesCache = out;
  return out;
}

function pickUmOficial_(candidatos) {
  var of = listaUnidadesOficiales_();
  for (var i = 0; i < candidatos.length; i++) {
    for (var j = 0; j < of.length; j++) {
      if (of[j].toLowerCase() === String(candidatos[i]).toLowerCase()) return of[j];
    }
  }
  return of[0] || "UND";
}

function normalizarUm_(raw, nombre) {
  var t = String(raw || "").trim();
  var n = String(nombre || "").toLowerCase();
  var blob = (t + " " + n).toLowerCase();
  blob = blob.replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u");
  if (esLaminaCompradaComoUnidad_(nombre) && !/^metros$|^kg$|^m2$|^litros$/i.test(t)) return pickUmOficial_(["UND"]);
  var of = listaUnidadesOficiales_();
  for (var j = 0; j < of.length; j++) {
    if (t && of[j].toLowerCase() === t.toLowerCase()) return of[j];
  }
  if (/unidades/i.test(t)) return pickUmOficial_(["UND"]);
  if (/rollox\s*88|rollo\s*x?\s*88/.test(blob)) return pickUmOficial_(["Rollox88 Hojas"]);
  if (/rollox\s*50|rollo\s*x?\s*50/.test(blob)) return pickUmOficial_(["Rollox50mts"]);
  if (/\bm2\b|m²|metro\s*cuadrad/.test(blob)) return pickUmOficial_(["m2"]);
  if (/\bkg\b|kilo/.test(blob)) return pickUmOficial_(["kg"]);
  if (/\blitro|\blt\b/.test(blob)) return pickUmOficial_(["Litros"]);
  if (/juego|kit\b/.test(blob)) return pickUmOficial_(["Juego"]);
  if (/lamina|\blam\b|lam cal|plancha/.test(blob)) return pickUmOficial_(["UND"]);
  if (/\bhojas?\b/.test(blob)) return pickUmOficial_(["Hojas"]);
  if (/\bmetro|\bmts\b|\bml\b/.test(t.toLowerCase())) return pickUmOficial_(["Metros"]);
  if (/tira/.test(n) && !/lamina/.test(n)) return pickUmOficial_(["UND"]);
  if (/\bund\b|unidad|pza|pieza/.test(blob)) return pickUmOficial_(["UND"]);
  return pickUmOficial_(["UND"]);
}

function esLaminaCompradaComoUnidad_(nombre) {
  var n = String(nombre || "").toLowerCase();
  n = n.replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u");
  return /lamina|\blam\b|lam cal|plancha/.test(n) && !/\bhojas?\b/.test(n);
}

function repararUmVaciasCatalogo_(sheet, data) {
  if (!data || data.length < 2) return 0;
  var col = [];
  var changed = 0;
  for (var i = 0; i < data.length; i++) {
    if (i === 0) { col.push([data[i][3]]); continue; }
    var cur = String(data[i][3] || "").trim();
    var nuevo = cur;
    if (!cur) nuevo = normalizarUm_("", data[i][2]);
    else if (/^hojas?$/i.test(cur) && esLaminaCompradaComoUnidad_(data[i][2])) nuevo = "UND";
    else if (/^unidades$/i.test(cur)) nuevo = "UND";
    if (nuevo !== cur) { data[i][3] = nuevo; changed++; }
    col.push([data[i][3]]);
  }
  if (changed) {
    sheet.getRange(1, 4, col.length, 1).setValues(col);
    CacheService.getScriptCache().remove("CAT_MAESTRO_V1");
  }
  return changed;
}

function inferirCategoria_(name, ruta) {
  var t = (String(name) + " " + String(ruta)).toLowerCase();
  if (/metal|acero|lamina|lámina|tubo/.test(t)) return "Metal";
  if (/acril/.test(t)) return "Acrilico";
  if (/brittek|herraje|tornill/.test(t)) return "Herrajes";
  if (/ikeplas|plastic|ps\b|poliestireno|mdf|melamin/.test(t)) return "Plasticos";
  if (/pintur|proceso|laser|láser|cnc/.test(t)) return "Procesos";
  return "General";
}

function esCarpetaRuido_(s) {
  var t = String(s || "").trim();
  if (!t) return true;
  if (/^(19|20)\d{2}$/.test(t)) return true;
  if (/listados?\s*de\s*precios/i.test(t)) return true;
  if (/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s*\d{2,4}$/i.test(t)) return true;
  return false;
}

function tituloProveedor_(s) {
  s = String(s || "").replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.split(" ").map(function (w) {
    if (!w) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

function proveedorDesdeNombreArchivo_(name) {
  var base = String(name || "").replace(/\.[^.]+$/, "");
  base = base.replace(/listados?\s*de\s*precios/ig, " ");
  base = base.replace(/\d{1,2}[\s._\-]\d{1,2}[\s._\-]\d{2,4}/g, " ");
  base = base.replace(/\b(19|20)\d{2}\b/g, " ");
  base = base.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!base || esCarpetaRuido_(base) || base.length < 3) return "";
  return tituloProveedor_(base);
}

function inferirProveedor_(name, ruta) {
  var desdeArchivo = proveedorDesdeNombreArchivo_(name);
  if (desdeArchivo) return desdeArchivo;
  var parts = String(ruta || "").split("/").map(function (p) { return p.trim(); }).filter(function (p) { return p && !esCarpetaRuido_(p); });
  if (parts.length) return tituloProveedor_(parts[parts.length - 1]);
  return "Proveedor";
}

function repararProveedoresCatalogo_(sheet, data) {
  if (!data || data.length < 2) return 0;
  var col = [];
  var changed = 0;
  for (var i = 0; i < data.length; i++) {
    if (i === 0) { col.push([data[i][1]]); continue; }
    var cur = String(data[i][1] || "");
    if (esCarpetaRuido_(cur)) {
      var nuevo = inferirProveedor_(data[i][7], data[i][9]);
      if (nuevo && nuevo !== cur) {
        data[i][1] = nuevo;
        changed++;
      }
    }
    col.push([data[i][1]]);
  }
  if (changed) {
    sheet.getRange(1, 2, col.length, 1).setValues(col);
    CacheService.getScriptCache().remove("CAT_MAESTRO_V1");
  }
  return changed;
}

function listarArchivosListados_(folder, depth, acc, ruta) {
  if (!folder || depth > 3) return;
  var files = folder.getFiles();
  while (files.hasNext()) {
    acc.push({ file: files.next(), ruta: ruta });
  }
  var subs = folder.getFolders();
  while (subs.hasNext()) {
    var sub = subs.next();
    listarArchivosListados_(sub, depth + 1, acc, ruta + " / " + sub.getName());
  }
}

var CLAVES_NOMBRE_CAT_ = ["nombre", "material", "descripcion", "descripción", "item", "producto", "insumo", "referencia", "detalle", "articulo", "artículo", "artículos"];
var CLAVES_PRECIO_CAT_ = ["precio", "costo", "valor", "unitario", "cop", "p. unit", "vta", "credito", "crédito"];
var CLAVES_UM_CAT_ = ["um", "unidad", "und", "u.m", "medida"];

function detectarFilaEncabezado_(values) {
  var max = Math.min(20, values.length);
  var best = 0;
  var bestScore = -1;
  for (var i = 0; i < max; i++) {
    var header = values[i] || [];
    var score = 0;
    if (indiceColumnaCatalogo(header, CLAVES_NOMBRE_CAT_) >= 0) score += 3;
    if (indiceColumnaCatalogo(header, CLAVES_PRECIO_CAT_) >= 0) score += 3;
    if (indiceColumnaCatalogo(header, CLAVES_UM_CAT_) >= 0) score += 1;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return bestScore >= 3 ? best : 0;
}

function extraerFilasDeValores_(values) {
  var out = [];
  if (!values || values.length < 2) return out;
  var headIdx = detectarFilaEncabezado_(values);
  var header = values[headIdx] || [];
  var colNombre = indiceColumnaCatalogo(header, CLAVES_NOMBRE_CAT_);
  var colPrecio = indiceColumnaCatalogo(header, CLAVES_PRECIO_CAT_);
  var colUm = indiceColumnaCatalogo(header, CLAVES_UM_CAT_);
  if (colNombre < 0) colNombre = 0;
  for (var r = headIdx + 1; r < values.length && out.length < 2000; r++) {
    var nom = String(values[r][colNombre] || "").trim();
    if (!nom || nom.length < 2) continue;
    if (indiceColumnaCatalogo([nom], CLAVES_NOMBRE_CAT_) >= 0 && indiceColumnaCatalogo([nom], CLAVES_PRECIO_CAT_) < 0) continue;
    var umCruda = colUm >= 0 ? String(values[r][colUm] || "").trim() : "";
    out.push({
      nombre: nom,
      um: normalizarUm_(umCruda, nom),
      costo: colPrecio >= 0 ? parseCostoCop_(values[r][colPrecio]) : 0
    });
  }
  return out;
}

function extraerFilasDeSpreadsheet_(ss) {
  var out = [];
  var sheets = ss.getSheets();
  for (var s = 0; s < Math.min(sheets.length, 6); s++) {
    var filas = extraerFilasDeValores_(sheets[s].getDataRange().getDisplayValues());
    for (var i = 0; i < filas.length && out.length < 2000; i++) out.push(filas[i]);
  }
  return out;
}

function colLetraAIndice_(ref) {
  var m = String(ref || "").match(/^([A-Z]+)/i);
  if (!m) return 0;
  var s = m[1].toUpperCase();
  var n = 0;
  for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n - 1;
}

function textosXml_(el) {
  var acc = [];
  function walk(node) {
    if (!node) return;
    if (node.getText) {
      var t = node.getText();
      if (t) acc.push(t);
    }
    var kids = node.getChildren ? node.getChildren() : [];
    for (var i = 0; i < kids.length; i++) walk(kids[i]);
  }
  walk(el);
  return acc.join("");
}

function extraerMatrizXlsx_(file) {
  var blob = file.getBlob().copyBlob();
  blob.setContentType("application/zip");
  var parts = Utilities.unzip(blob);
  var shared = [];
  var sheetXmls = [];
  for (var i = 0; i < parts.length; i++) {
    var n = String(parts[i].getName() || "").replace(/\\/g, "/");
    if (/sharedStrings\.xml$/i.test(n)) {
      var docS = XmlService.parse(parts[i].getDataAsString());
      var sis = docS.getRootElement().getChildren();
      for (var si = 0; si < sis.length; si++) {
        if (String(sis[si].getName()).toLowerCase() === "si") shared.push(textosXml_(sis[si]));
        else if (sis[si].getName() === "si") shared.push(textosXml_(sis[si]));
      }
      if (!shared.length) {
        var ns = docS.getRootElement().getNamespace();
        var siNs = docS.getRootElement().getChildren("si", ns);
        for (var j = 0; j < siNs.length; j++) shared.push(textosXml_(siNs[j]));
      }
    }
    if (/worksheets\/sheet\d+\.xml$/i.test(n)) sheetXmls.push(parts[i].getDataAsString());
  }
  var valoresTodos = [];
  for (var s = 0; s < Math.min(sheetXmls.length, 6); s++) {
    var doc = XmlService.parse(sheetXmls[s]);
    var root = doc.getRootElement();
    var ns = root.getNamespace();
    var sheetData = root.getChild("sheetData", ns) || root.getChild("sheetData");
    if (!sheetData) continue;
    var rows = sheetData.getChildren("row", ns);
    if (!rows.length) rows = sheetData.getChildren("row");
    var grid = [];
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].getChildren("c", ns);
      if (!cells.length) cells = rows[r].getChildren("c");
      var line = [];
      for (var c = 0; c < cells.length; c++) {
        var cell = cells[c];
        var ref = cell.getAttribute("r") ? cell.getAttribute("r").getValue() : "";
        var tipo = cell.getAttribute("t") ? cell.getAttribute("t").getValue() : "";
        var vEl = cell.getChild("v", ns) || cell.getChild("v");
        var isEl = cell.getChild("is", ns) || cell.getChild("is");
        var raw = vEl ? vEl.getText() : (isEl ? textosXml_(isEl) : "");
        var val = raw;
        if (tipo === "s") val = shared[parseInt(raw, 10)] || "";
        var idx = ref ? colLetraAIndice_(ref) : c;
        while (line.length <= idx) line.push("");
        line[idx] = val;
      }
      grid.push(line);
    }
    if (grid.length) valoresTodos.push(grid);
  }
  var out = [];
  for (var g = 0; g < valoresTodos.length; g++) {
    var filas = extraerFilasDeValores_(valoresTodos[g]);
    for (var k = 0; k < filas.length && out.length < 2000; k++) out.push(filas[k]);
  }
  return out;
}

function convertirExcelASheetTemporal_(file) {
  var token = ScriptApp.getOAuthToken();
  var res = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "/copy?supportsAllDrives=true", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify({
      name: "_sb_tmp_" + file.getName(),
      mimeType: "application/vnd.google-apps.spreadsheet"
    }),
    muteHttpExceptions: true
  });
  var json = JSON.parse(res.getContentText());
  if (!json.id) throw new Error((json.error && json.error.message) ? json.error.message : "No se pudo convertir el Excel a Hojas de Google.");
  return json.id;
}

function extraerPreciosPdfGemini_(file) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY para leer PDF.");
  var bytes = Utilities.base64Encode(file.getBlob().getBytes());
  var payload = {
    contents: [{
      parts: [
        { text: "Eres un extractor de listas de precios industriales. Devuelve SOLO un JSON array de objetos {nombre, um, costo_cop, categoria}. um debe ser una de: " + listaUnidadesOficiales_().join(", ") + ". Si el archivo no trae UM: lámina/plancha/LAM=UND (en Odoo se compran por Unidad); perfil/ángulo/canal/tubo/tira de 6m=UND; metros lineales=Metros; rollos 50m=Rollox50mts; rollos 88 hojas=Rollox88 Hojas. costo_cop numérico COP sin IVA. Ignora portadas. Sin markdown." },
        { inlineData: { mimeType: "application/pdf", data: bytes } }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  };
  var r = ejecutarGeminiDinamico(apiKey, payload, false);
  var txt = "";
  try { txt = r.data.candidates[0].content.parts[0].text || ""; } catch (e) { throw new Error("Gemini no devolvió texto del PDF."); }
  var m = txt.match(/\[[\s\S]*\]/);
  if (!m) return [];
  var arr = JSON.parse(m[0]);
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var it = arr[i];
    if (!it || !it.nombre) continue;
    out.push({ nombre: String(it.nombre), um: normalizarUm_(it.um, it.nombre), costo: parseCostoCop_(it.costo_cop), categoria: it.categoria || "" });
  }
  return out;
}

function extraerFilasDeArchivo_(file, ruta) {
  var mime = file.getMimeType();
  var name = file.getName();
  var tmpId = null;
  try {
    if (mime === MimeType.GOOGLE_SHEETS) return extraerFilasDeSpreadsheet_(SpreadsheetApp.openById(file.getId()));
    if (mime === MimeType.CSV || /\.csv$/i.test(name)) {
      var filas = file.getBlob().getDataAsString("UTF-8").split(/\r?\n/);
      var out = [];
      for (var i = 1; i < filas.length && out.length < 250; i++) {
        var cols = filas[i].split(",");
        if (!cols[0] || !cols[0].trim()) continue;
        out.push({ nombre: cols[0].trim(), um: (cols[1] || "").trim(), costo: parseCostoCop_(cols[2]) });
      }
      return out;
    }
    if (/\.xlsx$/i.test(name) || mime.indexOf("spreadsheetml") !== -1) {
      try {
        return extraerMatrizXlsx_(file);
      } catch (eXlsx) {
        tmpId = convertirExcelASheetTemporal_(file);
        return extraerFilasDeSpreadsheet_(SpreadsheetApp.openById(tmpId));
      }
    }
    if (/\.xls$/i.test(name) || mime.indexOf("ms-excel") !== -1) {
      tmpId = convertirExcelASheetTemporal_(file);
      return extraerFilasDeSpreadsheet_(SpreadsheetApp.openById(tmpId));
    }
    if (mime === MimeType.PDF || /\.pdf$/i.test(name)) return extraerPreciosPdfGemini_(file);
    return [];
  } finally {
    if (tmpId) {
      try { DriveApp.getFileById(tmpId).setTrashed(true); } catch (e2) {}
    }
  }
}

function desactivarFilasDeArchivo_(sheet, fileId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][8]) === String(fileId)) sheet.getRange(i + 1, 6).setValue("N");
  }
}

function appendFilasCatalogo_(sheet, rows, meta) {
  if (!rows || !rows.length) return 0;
  var ahora = new Date().toISOString().replace("T", " ").substring(0, 19);
  var chunk = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var cat = r.categoria || meta.categoria;
    var revisar = (!r.costo || r.costo <= 0) ? "S" : "N";
    chunk.push([cat, meta.proveedor, r.nombre, normalizarUm_(r.um, r.nombre), r.costo || 0, "S", revisar, meta.nombre, meta.fileId, meta.ruta, ahora]);
  }
  sheet.getRange(sheet.getLastRow() + 1, 1, chunk.length, 11).setValues(chunk);
  return chunk.length;
}

function mapaIngestaOk_() {
  var log = obtenerHojaIngesta();
  var data = log.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]) === "OK") map[String(data[i][0])] = String(data[i][2] || "");
  }
  return map;
}

function registrarIngesta_(file, estado, filas, error) {
  var log = obtenerHojaIngesta();
  var mod = "";
  try { mod = file.getLastUpdated().toISOString(); } catch (e) {}
  log.appendRow([file.getId(), file.getName(), mod, estado, filas || 0, error || "", new Date().toISOString().replace("T", " ").substring(0, 19)]);
}

function sincronizarCatalogoMaestro(email, fromTrigger) {
  if (!fromTrigger && ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) === -1) {
    return { exito: false, mensaje: "Solo administradores pueden sincronizar el catálogo." };
  }
  var quien = fromTrigger ? "auto-7d" : String(email || "");
  var folder = DriveApp.getFolderById(folderPreciosDriveId());
  var acc = [];
  listarArchivosListados_(folder, 0, acc, folder.getName());
  escribirProgresoCatalogo_({
    estado: "running", archivo: "Listando carpeta Drive…", indice: 0, total: acc.length,
    mensaje: "Encontrados " + acc.length + " archivo(s). Iniciando ingesta.",
    ultima_por: quien
  });
  var cat = obtenerHojaCatalogo();
  var yaOk = mapaIngestaOk_();
  var procesados = 0;
  var omitidos = 0;
  var filasOk = 0;
  var errores = [];
  var maxArchivos = 6;
  var pendientesReales = 0;
  for (var j = 0; j < acc.length; j++) {
    if (/^_sb_tmp_/i.test(acc[j].file.getName())) continue;
    var mod0 = "";
    try { mod0 = acc[j].file.getLastUpdated().toISOString(); } catch (e00) {}
    if (!(yaOk[acc[j].file.getId()] && yaOk[acc[j].file.getId()] === mod0)) pendientesReales++;
  }
  escribirProgresoCatalogo_({ total: acc.length, mensaje: pendientesReales + " archivo(s) pendientes de esta corrida (máx. 6)." });
  for (var i = 0; i < acc.length && procesados < maxArchivos; i++) {
    var file = acc[i].file;
    var ruta = acc[i].ruta;
    var name = file.getName();
    if (/^_sb_tmp_/i.test(name)) continue;
    var mod = "";
    try { mod = file.getLastUpdated().toISOString(); } catch (e0) {}
    if (yaOk[file.getId()] && yaOk[file.getId()] === mod) { omitidos++; continue; }
    escribirProgresoCatalogo_({
      estado: "running", archivo: name, indice: procesados + 1, total: Math.min(maxArchivos, pendientesReales),
      mensaje: "Procesando " + name + " (" + (procesados + 1) + "/" + Math.min(maxArchivos, pendientesReales) + "). Los PDF tardan más."
    });
    try {
      var rows = extraerFilasDeArchivo_(file, ruta);
      desactivarFilasDeArchivo_(cat, file.getId());
      var n = appendFilasCatalogo_(cat, rows, {
        categoria: inferirCategoria_(name, ruta),
        proveedor: inferirProveedor_(name, ruta),
        nombre: name,
        fileId: file.getId(),
        ruta: ruta
      });
      filasOk += n;
      procesados++;
      registrarIngesta_(file, n ? "OK" : "VACIO", n, n ? "" : "Sin filas extraídas");
      escribirProgresoCatalogo_({ mensaje: name + ": " + n + " filas." });
    } catch (err) {
      procesados++;
      errores.push(name + ": " + err.message);
      registrarIngesta_(file, "ERROR", 0, err.message);
      escribirProgresoCatalogo_({ mensaje: "Error en " + name, errores: errores.join(" | ") });
    }
  }
  CacheService.getScriptCache().remove("CAT_MAESTRO_V1");
  var restantes = Math.max(0, pendientesReales - procesados);
  var msgFinal = "Sincronización: " + procesados + " archivo(s), " + filasOk + " filas nuevas, " + omitidos + " ya al día. " + (restantes ? "Quedan " + restantes + " por procesar: vuelve a pulsar Sincronizar." : "Carpeta al día.");
  escribirProgresoCatalogo_({
    estado: "idle", archivo: "", indice: procesados, total: acc.length, mensaje: msgFinal,
    ultima_sync: ahoraBogota_(), ultima_por: quien, errores: errores.join(" | ")
  });
  return {
    exito: true,
    mensaje: msgFinal,
    data: { archivos: procesados, filas: filasOk, pendientes: restantes, errores: errores }
  };
}

function jobCatalogoSemanal() {
  sincronizarCatalogoMaestro("auto-7d", true);
}

function mensajeFaltaScopeTriggers_(err) {
  var m = err && err.message ? String(err.message) : "";
  if (/script\.scriptapp|getProjectTriggers|scriptapp/i.test(m)) {
    return "Falta autorizar el permiso de activadores en Apps Script. En el editor abre la función autorizarTriggersCatalogo, pulsa Ejecutar, acepta «Administrar los activadores» y vuelve a desplegar el web app. Luego reintenta Activar sync cada 7 días.";
  }
  return m || "No se pudo configurar el activador.";
}

function autorizarTriggersCatalogo() {
  ScriptApp.getProjectTriggers();
}

function asegurarTriggerCatalogoSemanal(email) {
  if (ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) === -1) {
    return { exito: false, mensaje: "Solo administradores." };
  }
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "jobCatalogoSemanal") {
        return { exito: true, mensaje: "La sync automática cada 7 días ya estaba activa (aprox. 06:00)." };
      }
    }
    ScriptApp.newTrigger("jobCatalogoSemanal").timeBased().everyDays(7).atHour(6).create();
    return { exito: true, mensaje: "Activada sync automática cada 7 días, hacia las 06:00." };
  } catch (err) {
    return { exito: false, mensaje: mensajeFaltaScopeTriggers_(err) };
  }
}

function desactivarTriggerCatalogoSemanal(email) {
  if (ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) === -1) {
    return { exito: false, mensaje: "Solo administradores." };
  }
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var n = 0;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "jobCatalogoSemanal") {
        ScriptApp.deleteTrigger(triggers[i]);
        n++;
      }
    }
    return { exito: true, mensaje: n ? "Sync automática cada 7 días desactivada." : "No había un activador que apagar." };
  } catch (err) {
    return { exito: false, mensaje: mensajeFaltaScopeTriggers_(err) };
  }
}

function estadoCatalogoMaestro() {
  var sheet = obtenerHojaCatalogo();
  var data = sheet.getDataRange().getValues();
  var vigentes = 0;
  var revisar = 0;
  var umsMap = {};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][5]) === "S") vigentes++;
    if (String(data[i][6]) === "S") revisar++;
    var umf = String(data[i][3] || "").trim();
    if (umf) umsMap[umf] = true;
  }
  var prog = leerProgresoCatalogo_();
  var cron = false;
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var t = 0; t < triggers.length; t++) {
      if (triggers[t].getHandlerFunction() === "jobCatalogoSemanal") cron = true;
    }
  } catch (e) {}
  var propsEst = PropertiesService.getScriptProperties();
  var totOdoo = Number(propsEst.getProperty("CAT_ODOO_TOTAL") || 0);
  if (barridoOdooYaCompleto_(propsEst, data, totOdoo || contarFilasOdooEnMaestro_(data))) {
    if (propsEst.getProperty("CAT_ODOO_FULL_DONE") !== "1") marcarBarridoOdooCompleto_(propsEst);
  }
  return {
    exito: true,
    data: {
      total: Math.max(0, data.length - 1), vigentes: vigentes, revisar: revisar,
      estado: prog.estado, archivo: prog.archivo, indice: prog.indice, totalArchivos: prog.total,
      mensaje: prog.mensaje, ultima_sync: prog.ultima_sync, ultima_por: prog.ultima_por,
      errores: prog.errores, cron7d: cron,
      odoo_offset: Number(PropertiesService.getScriptProperties().getProperty("CAT_ODOO_OFFSET") || 0),
      odoo_total: Number(PropertiesService.getScriptProperties().getProperty("CAT_ODOO_TOTAL") || 0),
      odoo_lote: 80,
      odoo_full: PropertiesService.getScriptProperties().getProperty("CAT_ODOO_FULL_DONE") === "1",
      odoo_last: PropertiesService.getScriptProperties().getProperty("CAT_ODOO_LAST_BOG") || "",
      dias_vigencia: diasVigenciaConfig_(),
      ums: Object.keys(umsMap).sort()
    }
  };
}

function listarCatalogoMaestro(params) {
  var q = String((params && params.q) || "").toLowerCase().trim();
  var fCat = String((params && params.categoria) || "").trim();
  var fProv = String((params && params.proveedor) || "").trim();
  var fVig = String((params && params.vigente) || "").trim();
  var fRev = String((params && params.revisar) || "").trim();
  var limit = Math.min(Number((params && params.limit) || 25), 200);
  var offset = Math.max(Number((params && params.offset) || 0), 0);
  var sheet = obtenerHojaCatalogo();
  var data = sheet.getDataRange().getValues();
  repararProveedoresCatalogo_(sheet, data);
  repararUmVaciasCatalogo_(sheet, data);
  var rows = [];
  var cats = {};
  var provs = {};
  var ums = {};
  for (var i = 1; i < data.length; i++) {
    var cat = String(data[i][0] || "");
    var prov = String(data[i][1] || "");
    var umRow = String(data[i][3] || "").trim();
    if (cat) cats[cat] = true;
    if (prov) provs[prov] = true;
    if (umRow) ums[umRow] = true;
    var blob = (cat + " " + prov + " " + data[i][2] + " " + data[i][7]).toLowerCase();
    if (q && blob.indexOf(q) === -1) continue;
    if (fCat && cat !== fCat) continue;
    if (fProv && prov !== fProv) continue;
    if (fVig && String(data[i][5]) !== fVig) continue;
    if (fRev && String(data[i][6]) !== fRev) continue;
    rows.push({
      row: i + 1,
      categoria: data[i][0], proveedor: data[i][1], nombre: data[i][2], um: data[i][3],
      costo_cop: data[i][4], vigente: data[i][5], revisar: data[i][6], fuente_archivo: data[i][7],
      actualizado: data[i][10]
    });
  }
  return {
    exito: true,
    data: {
      total: rows.length, items: rows.slice(offset, offset + limit), offset: offset, limit: limit,
      categorias: Object.keys(cats).sort(), proveedores: Object.keys(provs).sort(), ums: Object.keys(ums).sort()
    }
  };
}

function guardarFilaCatalogo(params, email) {
  if (ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) === -1) return { exito: false, mensaje: "Solo administradores." };
  var f = params.fila || {};
  var row = Number(f.row);
  if (!row || row < 2) return { exito: false, mensaje: "Fila inválida." };
  var sheet = obtenerHojaCatalogo();
  sheet.getRange(row, 1, 1, 7).setValues([[
    f.categoria || "", f.proveedor || "", f.nombre || "", f.um || "",
    parseCostoCop_(f.costo_cop), f.vigente === "N" ? "N" : "S", f.revisar === "S" ? "S" : "N"
  ]]);
  sheet.getRange(row, 11).setValue(ahoraBogota_());
  CacheService.getScriptCache().remove("CAT_MAESTRO_V1");
  return { exito: true, mensaje: "Ítem actualizado." };
}

function crearFilaCatalogo(params, email) {
  if (ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) === -1) return { exito: false, mensaje: "Solo administradores." };
  var f = params.fila || {};
  if (!String(f.nombre || "").trim()) return { exito: false, mensaje: "El nombre es obligatorio." };
  var sheet = obtenerHojaCatalogo();
  sheet.appendRow([
    f.categoria || "General", f.proveedor || "Manual", String(f.nombre).trim(), f.um || "UND",
    parseCostoCop_(f.costo_cop), "S", "N", "[Manual app]", "", "app", ahoraBogota_()
  ]);
  CacheService.getScriptCache().remove("CAT_MAESTRO_V1");
  return { exito: true, mensaje: "Ítem creado en el catálogo maestro." };
}

var _diasVigCache = null;
function diasVigenciaConfig_() {
  if (_diasVigCache) return _diasVigCache;
  var mat = 180, proc = 90;
  try {
    var cfg = obtenerConfiguracionGlobal();
    if (cfg.exito && cfg.data && cfg.data.diasVigencia) {
      mat = Number(cfg.data.diasVigencia.materiales) || 180;
      proc = Number(cfg.data.diasVigencia.procesos) || 90;
    }
  } catch (e) {}
  _diasVigCache = { materiales: mat, procesos: proc };
  return _diasVigCache;
}

function diasVigenciaOdoo_(categName) {
  var d = diasVigenciaConfig_();
  var t = String(categName || "").toLowerCase();
  if (/proceso|mano de obra|\bmo\b|servicio|pintur/.test(t)) return d.procesos;
  return d.materiales;
}

function fechaOdooADate_(s) {
  if (!s) return null;
  var d = new Date(String(s).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

function vigentePorDias_(fecha, dias) {
  var d = fechaOdooADate_(fecha);
  if (!d) return "N";
  var limite = new Date();
  limite.setDate(limite.getDate() - dias);
  return d >= limite ? "S" : "N";
}

function mapaFilasPorFileId_(data) {
  var map = {};
  for (var i = 1; i < data.length; i++) map[String(data[i][8] || "")] = i + 1;
  return map;
}

function ultimasComprasOdoo_(ids) {
  var out = {};
  if (!ids || !ids.length) return out;
  var camposA = ["product_id", "price_unit", "product_uom_id", "date_planned"];
  var camposB = ["product_id", "price_unit", "product_uom", "date_planned"];
  var lines = [];
  try {
    lines = odooSearchRead_("purchase.order.line", [["product_id", "in", ids], ["order_id.state", "in", ["purchase", "done"]]], camposA, 80, 0, "date_planned desc");
  } catch (e1) {
    try {
      lines = odooSearchRead_("purchase.order.line", [["product_id", "in", ids]], camposB, 80, 0, "date_planned desc");
    } catch (e2) {
      return { __error: e2.message || e1.message };
    }
  }
  for (var i = 0; i < lines.length; i++) {
    var pid = lines[i].product_id ? lines[i].product_id[0] : 0;
    if (!pid || out[pid]) continue;
    var uom = lines[i].product_uom_id || lines[i].product_uom;
    out[pid] = {
      costo: Number(lines[i].price_unit) || 0,
      um: uom ? uom[1] : "",
      fecha: lines[i].date_planned || ""
    };
  }
  return out;
}

function isoUtcOdoo_(d) {
  return Utilities.formatDate(d || new Date(), "UTC", "yyyy-MM-dd HH:mm:ss");
}

function contarFilasOdooEnMaestro_(data) {
  var n = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][8] || "").indexOf("odoo:") === 0) n++;
  }
  return n;
}

function marcarBarridoOdooCompleto_(props) {
  props.setProperty("CAT_ODOO_FULL_DONE", "1");
  props.setProperty("CAT_ODOO_OFFSET", "0");
  props.setProperty("CAT_ODOO_LAST_UTC", isoUtcOdoo_(new Date()));
  props.setProperty("CAT_ODOO_LAST_BOG", ahoraBogota_());
}

function barridoOdooYaCompleto_(props, data, totalProd) {
  if (props.getProperty("CAT_ODOO_FULL_DONE") === "1") return true;
  var n = contarFilasOdooEnMaestro_(data);
  return totalProd > 0 && n >= Math.max(50, totalProd * 0.6);
}

function upsertProductosOdoo_(records, sheet, data) {
  var ids = [];
  for (var i = 0; i < records.length; i++) ids.push(records[i].id);
  var compras = ultimasComprasOdoo_(ids);
  var aviso = "";
  if (compras.__error) { aviso = " Sin líneas de compra: " + compras.__error; compras = {}; }
  var porId = mapaFilasPorFileId_(data);
  var ahora = ahoraBogota_();
  var nuevas = [];
  var upserts = 0;
  for (var r = 0; r < records.length; r++) {
    var rec = records[r];
    var categ = rec.categ_id ? rec.categ_id[1] : "";
    var compra = compras[rec.id];
    var umOdoo = (compra && compra.um) || (rec.uom_id ? rec.uom_id[1] : "Unidades");
    var um = normalizarUm_(umOdoo, rec.name);
    var costo = (compra && compra.costo) || Number(rec.standard_price) || 0;
    var fechaRef = (compra && compra.fecha) || rec.write_date || "";
    var vigente = vigentePorDias_(fechaRef, diasVigenciaOdoo_(categ));
    var revisar = (!costo || vigente === "N") ? "S" : "N";
    var fid = "odoo:" + rec.id;
    var fila = [
      inferirCategoria_(rec.name, categ), "Odoo", rec.name, um, costo, vigente, revisar,
      "[Odoo ERP] " + (rec.default_code || ""), fid, "odoo/" + (categ || "productos"), ahora
    ];
    if (porId[fid]) sheet.getRange(porId[fid], 1, 1, 11).setValues([fila]);
    else nuevas.push(fila);
    upserts++;
  }
  if (nuevas.length) sheet.getRange(sheet.getLastRow() + 1, 1, nuevas.length, 11).setValues(nuevas);
  CacheService.getScriptCache().remove("CAT_MAESTRO_V1");
  return { upserts: upserts, aviso: aviso };
}

function idsCambiadosOdooDesde_(desdeUtc, limite) {
  var vistos = {};
  var ids = [];
  function add(id) {
    if (!id || vistos[id]) return;
    vistos[id] = true;
    ids.push(id);
  }
  var prods = [];
  try {
    prods = odooSearchRead_("product.product", [["write_date", ">=", desdeUtc]], ["id"], limite, 0, "write_date desc");
  } catch (e1) { prods = []; }
  for (var i = 0; i < prods.length; i++) add(prods[i].id);
  try {
    var lines = odooSearchRead_("purchase.order.line", [["write_date", ">=", desdeUtc]], ["product_id"], limite, 0, "write_date desc");
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].product_id) add(lines[j].product_id[0]);
    }
  } catch (e2) {}
  return ids;
}

function sincronizarCatalogoOdooIncremental_(email, props, sheet, data, totalProd) {
  var desdeUtc = props.getProperty("CAT_ODOO_LAST_UTC");
  if (!desdeUtc) {
    var d = new Date();
    d.setDate(d.getDate() - 7);
    desdeUtc = isoUtcOdoo_(d);
  }
  escribirProgresoCatalogo_({
    estado: "running", archivo: "Odoo cambios", indice: 0, total: 1,
    mensaje: "Buscando cambios en Odoo desde " + desdeUtc + " UTC (un solo paso)…",
    ultima_por: String(email || "")
  });
  var ids = idsCambiadosOdooDesde_(desdeUtc, 200);
  if (!ids.length) {
    marcarBarridoOdooCompleto_(props);
    var msg0 = "Odoo al día: no hay productos ni compras nuevos desde el último barrido.";
    escribirProgresoCatalogo_({ estado: "idle", archivo: "", indice: 1, total: 1, mensaje: msg0, ultima_sync: ahoraBogota_(), ultima_por: String(email || "") });
    return { exito: true, mensaje: msg0, data: { modo: "incremental", upserts: 0, total: totalProd } };
  }
  escribirProgresoCatalogo_({ indice: 1, total: ids.length, mensaje: ids.length + " cambio(s). Actualizando el maestro…" });
  var records = odooSearchRead_("product.product", [["id", "in", ids]], ["default_code", "name", "categ_id", "uom_id", "standard_price", "write_date"], ids.length, 0, "");
  var res = upsertProductosOdoo_(records, sheet, data);
  marcarBarridoOdooCompleto_(props);
  var msg = "Odoo incremental: " + res.upserts + " ítem(s) inyectados/actualizados en un paso. El maestro no se vuelve a barrer entero." + (res.aviso || "");
  escribirProgresoCatalogo_({
    estado: "idle", archivo: "", indice: res.upserts, total: res.upserts || 1, mensaje: msg,
    ultima_sync: ahoraBogota_(), ultima_por: String(email || ""), errores: res.aviso || ""
  });
  return { exito: true, mensaje: msg, data: { modo: "incremental", upserts: res.upserts, total: totalProd } };
}

function sincronizarCatalogoOdoo(email) {
  if (ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) === -1) {
    return { exito: false, mensaje: "Solo administradores pueden alimentar el catálogo desde Odoo." };
  }
  var props = PropertiesService.getScriptProperties();
  var offset = Number(props.getProperty("CAT_ODOO_OFFSET") || 0);
  var limit = 80;
  var dominio = [["purchase_ok", "=", true]];
  var totalProd = 0;
  try { totalProd = odooCount_("product.product", dominio); }
  catch (eCnt) {
    dominio = [];
    totalProd = odooCount_("product.product", dominio);
  }
  if (!totalProd) totalProd = offset + limit;
  props.setProperty("CAT_ODOO_TOTAL", String(totalProd));
  var sheet = obtenerHojaCatalogo();
  var data = sheet.getDataRange().getValues();
  var yaCompleto = barridoOdooYaCompleto_(props, data, totalProd);
  if (yaCompleto) {
    props.setProperty("CAT_ODOO_OFFSET", "0");
    return sincronizarCatalogoOdooIncremental_(email, props, sheet, data, totalProd);
  }
  var loteActual = Math.floor(offset / limit) + 1;
  var lotesTotales = Math.max(1, Math.ceil(totalProd / limit));
  var clicsRestantes = Math.max(0, lotesTotales - loteActual);
  escribirProgresoCatalogo_({
    estado: "running", archivo: "Odoo v19 inicial", indice: offset, total: totalProd,
    mensaje: "Barrido inicial lote " + loteActual + " de " + lotesTotales + " (" + offset + "/" + totalProd + ").",
    ultima_por: String(email || "")
  });
  var records = odooSearchRead_("product.product", dominio, ["default_code", "name", "categ_id", "uom_id", "standard_price", "write_date"], limit, offset, "id asc");
  escribirProgresoCatalogo_({
    indice: offset + Math.floor(records.length / 2),
    mensaje: "Lote inicial " + loteActual + "/" + lotesTotales + ": escribiendo " + records.length + " productos…"
  });
  var res = upsertProductosOdoo_(records, sheet, data);
  var nextOffset = records.length < limit ? 0 : offset + records.length;
  var completo = !nextOffset || (offset + records.length >= totalProd);
  if (completo) {
    marcarBarridoOdooCompleto_(props);
  } else {
    props.setProperty("CAT_ODOO_OFFSET", String(nextOffset));
  }
  var hechos = Math.min(offset + records.length, totalProd);
  var msgFinal = completo
    ? ("Barrido inicial listo (" + totalProd + " productos). De ahora en adelante un solo clic trae solo cambios.")
    : ("Odoo lote inicial " + loteActual + "/" + lotesTotales + ": " + res.upserts + " productos (" + hechos + " de " + totalProd + "). Pulsa " + clicsRestantes + " vez/veces más para terminar el primer barrido.");
  msgFinal += res.aviso || "";
  escribirProgresoCatalogo_({
    estado: "idle", archivo: "", indice: hechos, total: totalProd, mensaje: msgFinal,
    ultima_sync: ahoraBogota_(), ultima_por: String(email || ""), errores: res.aviso || ""
  });
  return {
    exito: true,
    mensaje: msgFinal,
    data: { modo: completo ? "inicial-completo" : "inicial", upserts: res.upserts, offset: completo ? 0 : nextOffset, total: totalProd, clics_restantes: completo ? 0 : clicsRestantes }
  };
}

function obtenerCatalogoMaestro() {
  var sheet = obtenerHojaCatalogo();
  var data = sheet.getDataRange().getValues();
  var metal = /tubo|angulo|canal|lamin|alambre|perfil|platina|varilla|rectang|cuadrad|calibre|cal\s|ps\b|mdf|acril/i;
  var vigentes = [];
  var otros = [];
  for (var i = 1; i < data.length; i++) {
    var rec = {
      cat: String(data[i][0] || ""),
      prov: String(data[i][1] || ""),
      n: String(data[i][2] || ""),
      um: String(data[i][3] || ""),
      cop: data[i][4],
      vig: String(data[i][5] || "")
    };
    if (!rec.n) continue;
    if (rec.vig === "S") vigentes.push(rec);
    else if (Number(rec.cop) > 0) otros.push(rec);
  }
  vigentes.sort(function (a, b) { return (metal.test(b.n) ? 1 : 0) - (metal.test(a.n) ? 1 : 0); });
  var picked = vigentes.concat(otros).slice(0, 1200);
  var lineas = [];
  var items = [];
  for (var j = 0; j < picked.length; j++) {
    var r = picked[j];
    lineas.push(r.cat + " | " + r.prov + " | " + r.n + " | UM=" + r.um + " | COP=" + r.cop);
    items.push({ nombre: r.n, um: r.um, costo_cop: r.cop, categoria: r.cat, proveedor: r.prov, vigente: r.vig });
  }
  return { exito: true, data: { carpeta: "Catalogo_Maestro", total: vigentes.length, enviados: picked.length, lineas: lineas, items: items } };
}

// ==========================================
// PROXY DINÁMICO GEMINI AI
// ==========================================
function obtenerModelosDinamicos(apiKey) {
  var cache = CacheService.getScriptCache();
  var cachedModels = cache.get("GEMINI_MODELS_V41");
  if (cachedModels) return JSON.parse(cachedModels);
  var res = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey, { muteHttpExceptions: true });
  if (res.getResponseCode() === 200) {
    var json = JSON.parse(res.getContentText());
    var available = [];
    if (json.models) {
      for (var i = 0; i < json.models.length; i++) {
        if (json.models[i].supportedGenerationMethods && json.models[i].supportedGenerationMethods.indexOf("generateContent") !== -1) {
          available.push(json.models[i].name.replace("models/", ""));
        }
      }
    }
    cache.put("GEMINI_MODELS_V41", JSON.stringify(available), 21600);
    return available;
  }
  return [];
}

function ordenarModelosPorPotencia(modelos) {
  return modelos.sort(function(a, b) {
    function puntaje(m) {
      var p = 0;
      var vm = m.match(/\d+\.\d+/);
      if (vm) p += parseFloat(vm[0]) * 1000;
      if (m.indexOf("thinking") !== -1) p += 500;
      if (m.indexOf("exp") !== -1 || m.indexOf("latest") !== -1) p += 100;
      if (m.indexOf("vision") !== -1) p -= 200;
      if (m.indexOf("8b") !== -1) p -= 300;
      return p;
    }
    return puntaje(b) - puntaje(a);
  });
}

function periodoUsoGemini_() {
  var tz = "America/Bogota";
  try { tz = Session.getScriptTimeZone() || tz; } catch (e) {}
  return Utilities.formatDate(new Date(), tz, "yyyy-MM");
}

function esErrorCupoGemini_(msg) {
  return /RESOURCE_EXHAUSTED|exceeded your current quota|quota exceeded|billing|insufficient|limit: 0|rate limit/i.test(String(msg || ""));
}

function tarifasGeminiConfig_() {
  var out = { cupoTokens: 2000000, cupoUsd: 20, usdIn: 1.25, usdOut: 10 };
  try {
    var cfg = obtenerConfiguracionGlobal();
    if (cfg.exito && cfg.data) {
      if (cfg.data.geminiCupoTokens) out.cupoTokens = Number(cfg.data.geminiCupoTokens) || out.cupoTokens;
      if (cfg.data.geminiCupoUsd != null) out.cupoUsd = Number(cfg.data.geminiCupoUsd) || out.cupoUsd;
      if (cfg.data.geminiUsdPor1MIn) out.usdIn = Number(cfg.data.geminiUsdPor1MIn) || out.usdIn;
      if (cfg.data.geminiUsdPor1MOut) out.usdOut = Number(cfg.data.geminiUsdPor1MOut) || out.usdOut;
    }
  } catch (e) {}
  return out;
}

function cupoTokensConfig_() {
  return tarifasGeminiConfig_().cupoTokens;
}

function usoGeminiVacio_(periodo) {
  return {
    periodo: periodo || periodoUsoGemini_(),
    llamadas: 0, tokensIn: 0, tokensOut: 0, tokensTotal: 0,
    ultimoModelo: "", ultima: "", ultimoError: "", ultimoEstado: "ok", cupoAgotado: false
  };
}

function filaUsoDesdeValores_(row) {
  return {
    periodo: String(row[0] || ""),
    llamadas: Number(row[1]) || 0,
    tokensIn: Number(row[2]) || 0,
    tokensOut: Number(row[3]) || 0,
    tokensTotal: Number(row[4]) || 0,
    ultimoModelo: String(row[5] || ""),
    ultima: String(row[6] || ""),
    ultimoError: String(row[7] || ""),
    ultimoEstado: String(row[8] || "ok"),
    cupoAgotado: row[9] === true || String(row[9]) === "true"
  };
}

function hojaUsoGemini_() {
  var ss = libroHistorico_();
  var sh = ss.getSheetByName("Gemini_Uso");
  if (!sh) {
    sh = ss.insertSheet("Gemini_Uso");
    sh.appendRow(["periodo", "llamadas", "tokensIn", "tokensOut", "tokensTotal", "ultimoModelo", "ultima", "ultimoError", "ultimoEstado", "cupoAgotado"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function leerUsoDeProps_(periodo) {
  var raw = PropertiesService.getScriptProperties().getProperty("GEMINI_USO_V1");
  if (!raw) return null;
  try {
    var o = JSON.parse(raw);
    if (!o || o.periodo !== periodo) return null;
    return o;
  } catch (e) { return null; }
}

function leerUsoGemini_() {
  var periodo = periodoUsoGemini_();
  var empty = usoGeminiVacio_(periodo);
  try {
    var sh = hojaUsoGemini_();
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === periodo) return filaUsoDesdeValores_(data[i]);
    }
    var migrado = leerUsoDeProps_(periodo);
    if (migrado) {
      guardarUsoGemini_(migrado);
      return migrado;
    }
  } catch (e) {
    var fallback = leerUsoDeProps_(periodo);
    if (fallback) return fallback;
  }
  return empty;
}

function guardarUsoGemini_(o) {
  o.tokensTotal = (Number(o.tokensIn) || 0) + (Number(o.tokensOut) || 0);
  var vals = [[
    o.periodo, o.llamadas, o.tokensIn, o.tokensOut, o.tokensTotal,
    o.ultimoModelo || "", o.ultima || "", o.ultimoError || "", o.ultimoEstado || "ok", !!o.cupoAgotado
  ]];
  try {
    var sh = hojaUsoGemini_();
    var data = sh.getDataRange().getValues();
    var f = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(o.periodo)) { f = i + 1; break; }
    }
    if (f > 0) sh.getRange(f, 1, 1, 10).setValues(vals);
    else sh.appendRow(vals[0]);
  } catch (e) {}
  try {
    PropertiesService.getScriptProperties().setProperty("GEMINI_USO_V1", JSON.stringify(o));
  } catch (e2) {}
}

function registrarUsoGemini_(patch) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (eLock) {}
  try {
    var o = leerUsoGemini_();
    if (patch.tokensIn) o.tokensIn += Number(patch.tokensIn) || 0;
    if (patch.tokensOut) o.tokensOut += Number(patch.tokensOut) || 0;
    o.tokensTotal = o.tokensIn + o.tokensOut;
    if (patch.llamada) o.llamadas += 1;
    if (patch.modelo) o.ultimoModelo = patch.modelo;
    o.ultima = new Date().toISOString();
    if (patch.error) {
      o.ultimoError = String(patch.error).slice(0, 400);
      o.ultimoEstado = esErrorCupoGemini_(patch.error) ? "cupo" : "error";
      o.cupoAgotado = o.ultimoEstado === "cupo";
    } else if (patch.ok) {
      o.ultimoError = "";
      o.ultimoEstado = "ok";
      o.cupoAgotado = false;
    }
    guardarUsoGemini_(o);
    return o;
  } finally {
    try { lock.releaseLock(); } catch (eRel) {}
  }
}

function obtenerUsoGemini() {
  var t = tarifasGeminiConfig_();
  var o = leerUsoGemini_();
  var tin = Number(o.tokensIn) || 0;
  var tout = Number(o.tokensOut) || 0;
  var costoUsd = (tin / 1000000) * t.usdIn + (tout / 1000000) * t.usdOut;
  var pctUsd = t.cupoUsd > 0 ? Math.min(100, Math.round(costoUsd * 1000 / t.cupoUsd) / 10) : 0;
  var pctTok = t.cupoTokens > 0 ? Math.min(100, Math.round((Number(o.tokensTotal) || 0) * 100 / t.cupoTokens)) : 0;
  var pct = t.cupoUsd > 0 ? pctUsd : pctTok;
  return {
    exito: true,
    data: Object.assign({}, o, {
      cupoTokens: t.cupoTokens,
      cupoUsd: t.cupoUsd,
      costoUsd: Math.round(costoUsd * 10000) / 10000,
      porcentaje: pct,
      porcentajeTokens: pctTok
    })
  };
}

function payloadUsoGemini_() {
  return obtenerUsoGemini().data;
}

function ejecutarGeminiDinamico(apiKey, payload, forzarPro) {
  var modelos = obtenerModelosDinamicos(apiKey);
  var c = [];
  var tm = forzarPro ? "PRO" : "FLASH";
  if (modelos && modelos.length > 0) {
    if (tm === "PRO") c = ordenarModelosPorPotencia(modelos.filter(function(m) { return m.indexOf("pro") !== -1 || m.indexOf("thinking") !== -1; }));
    else c = ordenarModelosPorPotencia(modelos.filter(function(m) { return m.indexOf("flash") !== -1 && m.indexOf("thinking") === -1; }));
  }
  c = c.filter(function (m) { return String(m).indexOf("thinking") === -1; }).slice(0, 2);
  if (c.length === 0) c = (tm === "PRO") ? ["gemini-2.5-pro", "gemini-1.5-pro"] : ["gemini-2.0-flash", "gemini-1.5-flash"];
  var jsonRes = null;
  var me = "";
  var err = [];
  for (var i = 0; i < c.length; i++) {
    try {
      var r = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/" + c[i] + ":generateContent?key=" + apiKey, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      var rp = JSON.parse(r.getContentText());
      if (!rp.error) { jsonRes = rp; me = c[i]; break; }
      else { err.push(c[i] + ": " + rp.error.message); }
    } catch (e) { err.push(c[i] + " err: " + e.message); }
  }
  if (!jsonRes) {
    var joined = err.join("\n");
    registrarUsoGemini_({ error: joined });
    var cupo = esErrorCupoGemini_(joined);
    return {
      exito: false,
      mensaje: cupo
        ? "Gemini se quedó sin cupo o crédito. Recarga el saldo en Google AI Studio y reintenta."
        : ("Servidor Gemini sin modelos.\n" + joined),
      cupoAgotado: cupo,
      uso: payloadUsoGemini_()
    };
  }
  var um = (jsonRes.usageMetadata) || {};
  registrarUsoGemini_({
    llamada: true,
    tokensIn: um.promptTokenCount || 0,
    tokensOut: um.candidatesTokenCount || 0,
    modelo: me,
    ok: true
  });
  return { exito: true, data: jsonRes, modeloUsado: me, uso: payloadUsoGemini_() };
}

function proxyGeminiAnalizar(p) {
  var k = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!k) throw new Error("Falta API Key");
  return ejecutarGeminiDinamico(k, { contents: [{ parts: p.parts }], generationConfig: { temperature: 0.1 } }, p.forzarPro);
}

function proxyGeminiChat(p) {
  var k = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!k) throw new Error("Falta API Key");
  return ejecutarGeminiDinamico(k, { contents: [{ parts: [{ text: p.promptText }] }], generationConfig: { temperature: 0.2 } }, p.forzarPro);
}

// ==========================================
// BASE DE DATOS SHEETS
// ==========================================
function obtenerHojaBD() {
  var ss = libroHistorico_();
  var sheet = ss.getSheetByName("Presupuestos");
  if (!sheet) throw new Error("Falta la hoja Presupuestos en el libro de GD-SmartBudget.");
  return sheet;
}

function guardarPresupuestoBD(datos) {
  var sheet = obtenerHojaBD();
  var data = sheet.getDataRange().getValues();
  var no = datos.cabecera.noProyecto;
  if (!no) return { exito: false, mensaje: "Carga un proyecto." };
  var json = JSON.stringify(datos);
  var hoy = new Date().toISOString().replace('T', ' ').substring(0, 19);
  var f = -1;
  for (var i = 1; i < data.length; i++) { if (String(data[i][1]) === String(no)) { f = i + 1; break; } }
  invalidarListaPresupuestos_();
  if (f > 0) {
    sheet.getRange(f, 3, 1, 6).setValues([[ String(datos.cabecera.cliente), String(datos.cabecera.nombreProyecto), String(datos.cabecera.tipoPresupuesto), "EN_PROCESO", hoy, json ]]);
    return { exito: true, mensaje: "Actualizado." };
  }
  sheet.appendRow([ "PRE-" + Date.now(), String(no), String(datos.cabecera.cliente), String(datos.cabecera.nombreProyecto), String(datos.cabecera.tipoPresupuesto), "EN_PROCESO", hoy, json ]);
  return { exito: true, mensaje: "Guardado." };
}

function invalidarListaPresupuestos_() {
  try { CacheService.getScriptCache().remove("PRE_LIST_V2"); } catch (e) {}
}

function listarPresupuestosBD() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("PRE_LIST_V2");
  if (hit) {
    try { return JSON.parse(hit); } catch (e) {}
  }
  var sheet = obtenerHojaBD();
  var last = sheet.getLastRow();
  if (last <= 1) return { exito: true, data: [] };
  var data = sheet.getRange(2, 1, last - 1, 7).getValues();
  var l = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i][6];
    l.push({
      id: String(data[i][0] || ""),
      noProyecto: String(data[i][1] || ""),
      cliente: String(data[i][2] || ""),
      requerimiento: String(data[i][3] || ""),
      tipo: String(data[i][4] || ""),
      estado: String(data[i][5] || ""),
      fechaGuardado: (d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") : String(d || ""))
    });
  }
  var out = { exito: true, data: l.reverse() };
  try { cache.put("PRE_LIST_V2", JSON.stringify(out), 60); } catch (e2) {}
  return out;
}

function obtenerProyectoPorId(id) {
  var data = obtenerHojaBD().getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id) || String(data[i][1]) === String(id)) return { exito: true, data: JSON.parse(data[i][7]) };
  }
  return { exito: false, mensaje: "No encontrado." };
}

function eliminarRegistroHistorico(id) {
  var sheet = obtenerHojaBD();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id) || String(data[i][1]) === String(id)) {
      sheet.deleteRow(i + 1);
      invalidarListaPresupuestos_();
      return { exito: true, mensaje: "Eliminado." };
    }
  }
  return { exito: false, mensaje: "No encontrado." };
}
