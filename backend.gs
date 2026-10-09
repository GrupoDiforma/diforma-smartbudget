function doGet(e) {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Autenticación SmartBudget</title>' +
    '<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;}' +
    '.card{background:white;padding:35px 40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;max-width:460px;border-top:5px solid #d32f2f;}' +
    'h2{color:#0f172a;margin-top:0;margin-bottom:12px;font-size:1.4rem;}p{color:#64748b;font-size:0.95rem;line-height:1.5;margin:8px 0;}</style></head><body>' +
    '<div class="card"><div style="font-size:2.5rem;margin-bottom:10px;">✅</div>' +
    '<h2>Sesión Corporativa Verificada</h2>' +
    '<p>Tu cuenta <strong>@grupodiforma.com</strong> se ha autenticado con éxito en el servidor de Google Apps Script.</p>' +
    '<p style="margin-top:20px;font-weight:600;color:#059669;">Ya puedes cerrar esta pestaña y regresar a la aplicación SmartBudget Diforma.</p>' +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var result = { exito: false, mensaje: "Acción no válida" };

    if (action === "guardar") result = guardarPresupuestoBD(params.payload);
    else if (action === "listar") result = listarPresupuestosBD();
    else if (action === "obtener") result = obtenerProyectoPorId(params.id);
    else if (action === "eliminar") result = eliminarRegistroHistorico(params.id);
    else if (action === "odoo_buscar") result = proxyOdooBuscar(params.codigo);
    else if (action === "odoo_productos") result = proxyOdooProductos(params.query);
    else if (action === "gemini_analizar") result = proxyGeminiAnalizar(params);
    else if (action === "gemini_chat") result = proxyGeminiChat(params);

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({exito: false, mensaje: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// PROXY ODOO ERP
// ==========================================
function rpcCallGAS(service, method, args) {
  var props = PropertiesService.getScriptProperties();
  var pwd = props.getProperty("ODOO_PWD"); 
  if(!pwd) throw new Error("Falta la contraseña de Odoo en Google Apps Script.");
  
  var payload = { jsonrpc: "2.0", method: "call", params: { service: service, method: method, args: args }, id: Math.floor(Math.random() * 1000) };
  var options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };
  var res = UrlFetchApp.fetch("https://grupodiforma.odoo.com/jsonrpc", options);
  var json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.data ? json.error.data.message : json.error.message);
  return json.result;
}

function proxyOdooBuscar(codigo) {
  var db = "carlosnavarreteeclosion-grupodiforma-production-26892718";
  var user = "edwin.laverde@grupodiforma.com";
  var pwd = PropertiesService.getScriptProperties().getProperty("ODOO_PWD");
  var uid = rpcCallGAS("common", "authenticate", [db, user, pwd, {}]);
  if (!uid) throw new Error("Credenciales de Odoo rechazadas.");
  
  var records = rpcCallGAS("object", "execute_kw", [db, uid, pwd, "crm.lead", "search_read", [[["name", "ilike", codigo]]], { fields: ["name", "partner_id", "user_id", "id_vendedor", "create_date", "pricelist_id", "id_disenador", "id_presupuestador"], limit: 1 }]);
  if(!records || records.length===0) return {exito: false, mensaje: "Oportunidad no encontrada"};
  return {exito: true, data: records[0]};
}

function proxyOdooProductos(query) {
  var db = "carlosnavarreteeclosion-grupodiforma-production-26892718";
  var user = "edwin.laverde@grupodiforma.com";
  var pwd = PropertiesService.getScriptProperties().getProperty("ODOO_PWD");
  var uid = rpcCallGAS("common", "authenticate", [db, user, pwd, {}]);
  var records = rpcCallGAS("object", "execute_kw", [db, uid, pwd, "product.product", "search_read", [["|", ["name", "ilike", query], ["default_code", "ilike", query]]], { fields: ["default_code", "name", "categ_id", "uom_id", "standard_price"], limit: 20 }]);
  return {exito: true, data: records};
}

// ==========================================
// PROXY DINÁMICO GEMINI AI
// ==========================================
function obtenerModelosDinamicos(apiKey) {
  var cache = CacheService.getScriptCache();
  var cachedModels = cache.get("GEMINI_MODELS_V41"); 
  if (cachedModels) return JSON.parse(cachedModels); 

  var url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  
  if (res.getResponseCode() === 200) {
    var json = JSON.parse(res.getContentText());
    var available = [];
    if (json.models) {
      for (var i = 0; i < json.models.length; i++) {
        var m = json.models[i];
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.indexOf("generateContent") !== -1) {
          available.push(m.name.replace("models/", ""));
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
      var versionMatch = m.match(/\d+\.\d+/);
      if (versionMatch) p += parseFloat(versionMatch[0]) * 1000; 
      if (m.indexOf("thinking") !== -1) p += 500; 
      if (m.indexOf("exp") !== -1 || m.indexOf("latest") !== -1) p += 100; 
      if (m.indexOf("vision") !== -1) p -= 200; 
      if (m.indexOf("8b") !== -1) p -= 300;     
      return p;
    }
    return puntaje(b) - puntaje(a);
  });
}

function ejecutarGeminiDinamico(apiKey, payload, forzarPro) {
  var modelosDisponibles = obtenerModelosDinamicos(apiKey);
  var candidatos = [];
  var tipoModelo = forzarPro ? "PRO" : "FLASH";

  if (modelosDisponibles && modelosDisponibles.length > 0) {
    if (tipoModelo === "PRO") {
      var pros = modelosDisponibles.filter(function(m) { 
        return m.indexOf("pro") !== -1 || m.indexOf("thinking") !== -1; 
      });
      candidatos = ordenarModelosPorPotencia(pros);
    } else {
      var flash = modelosDisponibles.filter(function(m) { 
        return m.indexOf("flash") !== -1 && m.indexOf("thinking") === -1; 
      });
      candidatos = ordenarModelosPorPotencia(flash);
    }
  }

  if (candidatos.length === 0) {
    candidatos = (tipoModelo === "PRO") ? ["gemini-1.5-pro"] : ["gemini-1.5-flash"];
  }

  var options = { 
    method: "post", 
    contentType: "application/json", 
    payload: JSON.stringify(payload), 
    muteHttpExceptions: true 
  };
  
  var jsonRes = null;
  var modeloExitoso = "";
  var logErrores = []; 

  for (var i = 0; i < candidatos.length; i++) {
    var testModel = candidatos[i];
    var testEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + testModel + ":generateContent?key=" + apiKey;
    
    try {
      var res = UrlFetchApp.fetch(testEndpoint, options);
      var resP = JSON.parse(res.getContentText());

      if (!resP.error) {
        jsonRes = resP; 
        modeloExitoso = testModel; 
        break; 
      } else {
        var msg = resP.error.message;
        logErrores.push(testModel + ": " + msg);
      }
    } catch(err) { 
      logErrores.push(testModel + " err: " + err.message); 
    }
  }

  if (!jsonRes) {
    throw new Error("Servidor Gemini sin modelos disponibles. Detalle:\n" + logErrores.join("\n"));
  }

  return { exito: true, data: jsonRes, modeloUsado: modeloExitoso };
}

function proxyGeminiAnalizar(params) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if(!apiKey) throw new Error("Falta la API Key de Gemini en Google Apps Script.");
  var payload = { contents: [{ parts: params.parts }], generationConfig: { temperature: 0.1 } };
  return ejecutarGeminiDinamico(apiKey, payload, params.forzarPro);
}

function proxyGeminiChat(params) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if(!apiKey) throw new Error("Falta la API Key de Gemini en Google Apps Script.");
  var payload = { contents: [{ parts: [{ text: params.promptText }] }], generationConfig: { temperature: 0.2 } };
  return ejecutarGeminiDinamico(apiKey, payload, params.forzarPro);
}

// ==========================================
// BASE DE DATOS SHEETS
// ==========================================
function obtenerHojaBD() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("DB_SHEET_ID_V28"); 
  var ss;
  if (!sheetId) { ss = SpreadsheetApp.create("SmartBudget_BD_Historico_V28"); props.setProperty("DB_SHEET_ID_V28", ss.getId()); var sheet = ss.getActiveSheet(); sheet.setName("Presupuestos"); sheet.appendRow(["ID_Presupuesto", "No_Proyecto", "Cliente", "Nombre_Proyecto", "Tipo", "Estado", "Fecha_Actualizacion", "JSON_Data"]); } 
  else { try { ss = SpreadsheetApp.openById(sheetId); } catch(e) { ss = SpreadsheetApp.create("SmartBudget_BD_Historico_V28"); props.setProperty("DB_SHEET_ID_V28", ss.getId()); var sheet = ss.getActiveSheet(); sheet.setName("Presupuestos"); sheet.appendRow(["ID_Presupuesto", "No_Proyecto", "Cliente", "Nombre_Proyecto", "Tipo", "Estado", "Fecha_Actualizacion", "JSON_Data"]); } }
  return ss.getSheetByName("Presupuestos");
}

function guardarPresupuestoBD(datosCompletos) {
  var sheet = obtenerHojaBD(); var data = sheet.getDataRange().getValues(); var noProyecto = datosCompletos.cabecera.noProyecto;
  if (!noProyecto) return { exito: false, mensaje: "Carga un proyecto antes de guardar." };
  var jsonString = JSON.stringify(datosCompletos); var fechaHoy = new Date().toISOString().replace('T', ' ').substring(0, 19); var filaEncontrada = -1;
  for (var i = 1; i < data.length; i++) { if (String(data[i][1]) === String(noProyecto)) { filaEncontrada = i + 1; break; } }
  if (filaEncontrada > 0) { sheet.getRange(filaEncontrada, 3, 1, 6).setValues([[ String(datosCompletos.cabecera.cliente), String(datosCompletos.cabecera.nombreProyecto), String(datosCompletos.cabecera.tipoPresupuesto), "EN_PROCESO", fechaHoy, jsonString ]]); return { exito: true, mensaje: "Actualizado en Sheets." }; } 
  else { sheet.appendRow([ "PRE-" + Date.now(), String(noProyecto), String(datosCompletos.cabecera.cliente), String(datosCompletos.cabecera.nombreProyecto), String(datosCompletos.cabecera.tipoPresupuesto), "EN_PROCESO", fechaHoy, jsonString ]); return { exito: true, mensaje: "Guardado en Sheets." }; }
}

function listarPresupuestosBD() {
  var sheet = obtenerHojaBD(); var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { exito: true, data: [] };
  var lista = [];
  for (var i = 1; i < data.length; i++) { var valFecha = data[i][6]; var strFecha = valFecha instanceof Date ? Utilities.formatDate(valFecha, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") : String(valFecha || ''); lista.push({ id: String(data[i][0] || ''), noProyecto: String(data[i][1] || ''), cliente: String(data[i][2] || ''), requerimiento: String(data[i][3] || ''), tipo: String(data[i][4] || ''), estado: String(data[i][5] || ''), fechaGuardado: strFecha }); }
  return { exito: true, data: lista.reverse() };
}

function obtenerProyectoPorId(idRegistro) {
  var data = obtenerHojaBD().getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { if (String(data[i][0]) === String(idRegistro) || String(data[i][1]) === String(idRegistro)) return { exito: true, data: JSON.parse(data[i][7]) }; }
  return { exito: false, mensaje: "No encontrado." };
}

function eliminarRegistroHistorico(idRegistro) {
  var sheet = obtenerHojaBD(); var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { if (String(data[i][0]) === String(idRegistro) || String(data[i][1]) === String(idRegistro)) { sheet.deleteRow(i + 1); return { exito: true, mensaje: "Eliminado." }; } }
  return { exito: false, mensaje: "No encontrado." };
}
