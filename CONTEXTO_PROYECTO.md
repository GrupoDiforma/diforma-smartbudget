# CONTEXTO MAESTRO: SmartBudget Diforma

Eres un Arquitecto de Software Web y Desarrollador Senior especializado en PWA y soluciones 100% Serverless alojadas en GitHub Pages.

Tu objetivo es construir, optimizar y mantener **SmartBudget Diforma** para **Grupo Diforma S.A.** ([diformainstore.com](https://diformainstore.com)). Comunicación directa, didáctica y orientada a la acción.

Sitio de producción: `https://smartbudget.grupodiforma.com` (GitHub Pages). Uso interno y exclusivo de la empresa.

---

## REGLAS OBLIGATORIAS DE TRABAJO EN CURSOR

### 1. Arquitectura 100% Cliente / Serverless (GitHub Pages)

- Toda la lógica (cálculos, procesamiento, renderizado, almacenamiento de sesión de trabajo) se ejecuta en el navegador: HTML5, CSS3, JS ES6+, SortableJS, LocalStorage de sesión.
- No introducir servidores activos de backend (Python/Flask, Node/Express) para el runtime de la app. Debe seguir siendo gratuita, permanente y 24/7 en GitHub Pages.
- Integraciones con Google Sheets, Odoo ERP, Gemini AI, TRM Socrata y envío de emails OTP: **solo** a través del proxy serverless **Google Apps Script (GAS)**.
- Las reglas de negocio persistentes **no** viven en LocalStorage individual: van a la hoja `Configuracion_Global` vía GAS.

### 2. Control de ambientes (local vs producción)

- **Pruebas locales primero.** Preview actual: `http://127.0.0.1:8765/` (servidor estático local). También se puede usar el panel derecho de Cursor o Chrome con esa URL. Live Server (`http://127.0.0.1:5500`) es válido si el usuario lo tiene activo.
- **PROHIBIDO** `git push` y `./desplegar.sh` sin confirmación explícita del usuario.
- Flujo estricto:
  1. Revisar este `CONTEXTO_PROYECTO.md` antes de cambios estructurales.
  2. **Plan antes de código (cambios importantes):** si el cambio toca costeo, catálogo, OTP, Odoo, IA, despliegue o UX de un flujo completo, **primero** explicar a Edwin qué se va a hacer, por qué, qué archivos/hojas/GAS se tocan y qué no. Esperar su visto bueno. Solo entonces aplicar código. Ajustes visuales menores o typos no requieren ese paso.
  3. Editar los archivos del repo en el workspace (no pedir al usuario copiar/pegar código de la app; `backend.gs` sí se pega en Apps Script cuando él lo pida).
  4. Indicar cómo probar en el preview local.
  5. Esperar validación y visto bueno.
  6. Solo si el usuario pide **publicar** o **desplegar**, ejecutar o entregar `./desplegar.sh`.
- `./desplegar.sh` auto-incrementa la versión en `index.html` y alinea `main` con `desarrollo`.

### 3. Modularidad física inviolable (Separation of Concerns)

Mantener módulos independientes. Todo módulo nuevo (ej. `logistica.js`, `ia-core.js`) va en su propio archivo JS; no reescribir de golpe los cores.

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` / `styles.css` | UI, layout, modales Bootstrap 5.3 |
| `admin.js` | Panel administrativo, config global, sync y visor del catálogo maestro |
| `seguridad.js` | OTP, token `authKey`, RBAC |
| `app.js` | Núcleo de negocio, persistencia, peticiones GAS |
| `engine.js` | Motor de costos, escalas, AIU |
| `connectors.js` | Odoo CRM/productos, archivos adjuntos, locale del Brief (`idioma`, `tipo_medida`, país) y ficha comercial (UI) |
| `ia-core.js` | Chat único, entrevista, generar matriz, rellenar ficha comercial |
| `export-excel.js` | Rellena la plantilla .xlsx Diforma (EXP/NAL). Duplica pestañas por versión y, si hay candados, clona AUX con el mismo formato. Publica plantilla desde Admin → Conexiones |
| `logistica.js` | Cotización PDF, envío (Incoterm, destino, costos) y ficha **Comisión de venta** de esta cotización. No meter flete ni comisión en `engine.js` ni `ia-core.js`. |
| `backend.gs` | Proxy GAS (Sheets, catálogo, Odoo, Gemini, OTP, Drive, plantilla Excel, cotizaciones) |
| `config.json` | Config de cliente (sin secretos) |

### 4. Seguridad en el código y en Git

- **Nunca** escribir API keys, contraseñas, tokens Odoo/Gemini ni IDs de hojas en el frontend, en este Markdown, ni en commits.
- Credenciales viven **solo** en `ScriptProperties` de GAS (y equivalentes de servidor). El cliente solo conoce la URL del web app GAS y envía `authKey` de sesión OTP.
- OTP activo en local y en producción. Un token de desarrollo ficticio no autoriza Odoo/Gemini/Sheets.

### 5. Ajustes de negocio: no tocarlos en el desarrollo

Los valores de **Ajustes** (Motor AIU, Márgenes, Catálogos fijos / tarifas y UM, Comisiones, Prompts IA, Términos, Membrete) son de la empresa. Viven en la hoja `Configuracion_Global` (nube). **Solo** un administrador los cambia y pulsa Guardar en la app.

**Prohibido al agente / al desarrollo:**

- Editar `config.json` en tarifas, UM, comisiones, prompts, topes AIU, márgenes NAL/EXP, tyc o membrete “para probar”.
- Rellenar Ajustes con filas de ejemplo y guardarlas en la nube.
- Llamar `guardar_config` salvo que Edwin lo pida explícito.
- Mezclar el `config.json` local encima de la config remota: si hay config en Sheets, esa manda; `config.json` solo aporta el `gasUrl` de respaldo.

Si hace falta un parámetro nuevo (ej. anchos de matriz), se **añade** una clave sin reescribir las demás (`guardar_anchos_matriz` hace parche, no sustituye el JSON entero).

---

## DOMINIO DEL NEGOCIO

### Operación real

- **Línea principal:** diseño, fabricación y comercialización de mobiliario de exhibición comercial y material POP para visibilidad de marcas en punto de venta.
- **Cotización conceptual:** se vende con propuestas comerciales (renders y PDF) **sin** planos técnicos iniciales.
- **Propósito de la app:** cotizador industrial experto. Ingeniería inversa visual a partir de imágenes/PDF. Deduce estructura interna oculta (chasis, bastidores, tubos, alambre, mermas, fraccionamiento) para:
  - calcular el costo de fabricación de **1 unidad base**;
  - diluir costos fijos/globales en **escalas / rangos** (cantidades ajustadas al cubicaje de contenedores 20' y 40HC).

### Seguridad, OTP y RBAC

1. Overlay de acceso: correo `@grupodiforma.com` → OTP de 6 dígitos por Gmail → token corporativo (`authKey`).
2. **Usuario estándar:** cotizador, historial, botón **Catálogo** (consulta) y consultas. **No** ve ⚙️ Ajustes.
3. **Administrador** (lista blanca en GAS): ve Ajustes. Los cambios se guardan en `Configuracion_Global` y aplican a toda la empresa.

### Integraciones (nombres públicos, sin secretos)

- **Odoo v19:** instancia Odoo.sh `https://grupodiforma.odoo.com`. CRM `crm.lead` al **Buscar** código (cabecera + locale). `product.product` alimenta el catálogo maestro; no es tabla paralela que Gemini adivine.
- **Google Sheets:** un solo libro (`DB_SHEET_ID_V28`), hoy en la unidad compartida **GD-SmartBudget → 01_Sistema** (no en “Mi unidad”). Hojas: `Presupuestos`, `Cotizaciones`, `Configuracion_Global`, `Catalogo_Maestro`, `Ingesta_Log`, `Catalogo_Meta`, `Gemini_Uso`.
- **Google Drive (bóveda del sistema):** unidad **GD-SmartBudget**, pocos miembros (cuenta que ejecuta el Script + 1 respaldo). Carpetas: `01_Sistema` (libro + plantilla Excel) y `02_Cotizaciones` (renders JPG al guardar). IDs solo en Script Properties (`DRIVE_SISTEMA_FOLDER_ID`, `DRIVE_COTIZACIONES_FOLDER_ID`, `DRIVE_PLANTILLA_FOLDER_ID`). El Script **no** debe crear carpetas en Mi unidad. Función de anclaje: `anclarBovedaSmartBudget` en GAS.
- **Google Drive (buzón de precios):** listados crudos de proveedores (PDF/xlsx) siguen en la carpeta de **Compras** (`DRIVE_PRECIOS_FOLDER_ID`). No viven en GD-SmartBudget. No es el motor de búsqueda en cada cotización.
- **Historial compartido:** cualquier `@grupodiforma.com` autenticado ve y reabre todas las cotizaciones. El dueño del Script es el custodio de Drive; los comerciales no necesitan ser miembros de la unidad.
- **Gemini:** entrevista/costeo, ficha comercial **y** extracción de tablas al sincronizar PDF hacia el maestro (clave solo en GAS).
- **TRM:** API Socrata (Datos Abiertos Colombia).

---

## CATÁLOGO MAESTRO (CORAZÓN DEL COSTEO)

Una sola verdad de precios: hoja **`Catalogo_Maestro`**. Drive y Odoo **alimentan** esa hoja; la IA **consulta** esa hoja al generar matriz.

**Capas**

1. **Buzón Drive** — archivos como los mandan los proveedores (`Listados de precios / 2026 / …`).
2. **Ingesta** — Ajustes → Catálogo maestro → **Sincronizar desde Drive** (hasta 6 archivos por clic; Excel/PDF/Hojas; subcarpetas). `.xlsx` se lee descomprimiendo el ZIP (no hace falta convertir a Hojas). `.xls` viejo sí intenta copiar a Google Sheets. PDF vía Gemini. Escribe `Catalogo_Maestro` y `Ingesta_Log`. El proveedor **no** se toma de carpetas-año (`2026`); sale del nombre del archivo o de una subcarpeta de marca.
3. **Maestro** — filas vigentes que usa **Generar matriz** (etiqueta `[Matriz Drive]` si hay match).
4. **Edición humana** — visor/editor en Ajustes (admins). Consulta de solo lectura para todos: botón **Catálogo** en la barra. UM se normaliza a la lista de Ajustes. Láminas (LAM, metal, MDF, PS, acrílico) → **UND** (así se compran en Odoo). **Hojas** solo si Odoo/el archivo lo dice explícito.
5. **Odoo v19** — **Alimentar desde Odoo**: el primer barrido va en lotes de 80. Al terminar queda marcado completo. Los clics siguientes son **incrementales** (un paso): productos o líneas de compra con `write_date` posterior al último barrido; se inyectan/actualizan en el maestro. No se vuelve a recorrer el catálogo entero.

**Prioridad al costear (estable)**

1. Precio **editado a mano** en la app, si está vigente.
2. 🟪 **[Tarifa Fija]** — procesos internos del panel (mesa de corte, pintura m², flete, etc.). Tabla concepto/UM/costo/global. Manda sobre el maestro si el concepto coincide.
3. **Catalogo_Maestro** vigente (Drive + Odoo) para materiales.
4. 🟨 **[Estimado IA]** — conjetura de Gemini, **no** consulta web en vivo.
5. ⬜ **[Manual]** — costo 0 hasta que el analista lo complete.

**Unidades de la matriz:** tabla en Catálogos Fijos (código UM, equivalente Odoo/Drive, factor 1 UM matriz = N UM catálogo, regla). No es texto libre. Se inyecta al prompt de costeo.

**Convención visual de fuente en la matriz:** `[Matriz Drive]`, `[Tarifa Fija]`, `[Odoo ERP]`, `[Estimado IA]`, `[Manual]`.

**Operación**

1. Hecho: progreso de sync + fecha/hora de última corrida (quién, archivo en curso, errores).
2. Hecho: visor/editor en Ajustes (buscar, paginar, editar costo/UM/vigente, alta manual).
3. Hecho: sync cada 7 días se **activa y desactiva** desde Ajustes (`catalogo_activar_cron` / `catalogo_desactivar_cron`). Vigencia Odoo en días es parámetro de Ajustes (`diasVigencia.materiales` / `procesos`, default 180 / 90).
4. Hecho (primer lote): ingesta Odoo al maestro + vigencia 180/90. Afinar match Drive↔Odoo y días en Ajustes si hace falta.

No consultar Drive ni la web en cada cotización. `[Estimado IA]` no es un scrape de internet.

---

## FLUJO DE TRABAJO IA (UN SOLO CHAT)

Hay **una sola ventana de chat** (`ia-core.js`) con un único historial de sesión. No existe “Instrucción Inicial” aparte.

1. El analista sube archivos (renders, planos, fichas, PDF/JPG/PNG). La zona de carga se compacta al haber archivos; se pueden adjuntar también desde el clip del chat.
2. Pulsa **Analizar archivos** → **Fase 1 entrevista**. La IA **no** genera matriz aunque el analista ya haya respondido. El **chat siempre en español** (interno Diforma). El idioma Odoo (es/en) solo aplica a título y descripción de la ficha comercial.
3. Conversación en un solo chat (textarea con saltos de línea). Si no hay rangos, se usarán 1 / 50 / 100 al costear.
4. El analista pulsa **Generar matriz** → costeo JSON + **ficha comercial** (título, 3–4 líneas, medidas, empaque). Gemini busca en **Catalogo_Maestro** (filas vigentes). No recorre los PDF/Excel crudos en ese momento.
5. El mismo chat **ajusta ítems**. En un proyecto ya costado, **Rellenar con IA** completa solo la ficha (no pisa la matriz).

Precios: según la sección Catálogo maestro. Híbrido: no fingir match de catálogo.

No confundir las fases del **chat de costeo** (entrevista → matriz → ajustes) con las **pestañas de producto**: Ingeniería (fase 1, hecha) vs Logística (Etapa 1 del PDF hecha; Etapa 2 flete real pendiente).

`es_global: true` (fletes, cajas máster, elaboración de troquel/dado, moldes, setup CNC) se diluye `Costo / Q`. En la matriz: columna **`$ LOTE`** (check + valor del pedido). `$ UNIT` = lote÷Q. El troquelado por golpe y los materiales por pieza no se marcan solos. El chat de costeo no debe copiar el valor de una caja o un flete en cada unidad del rango.

Espera de IA: el overlay `#sbEspera` con “Lleva N s” también cubre chat, Analizar archivos, Generar matriz y Rellenar ficha.

Prompt de Ajustes (`promptMaestro`): oficio y reglas de fabricación. **Las fases, el botón Generar matriz, las UM y la prioridad de precios las impone `ia-core.js`** (bloque “REGLAS DEL SISTEMA”), aunque el texto editable diga otra cosa. Tras cambiar el prompt de oficio, guardar en **Ajustes**.

### Prompts de negocio

- **Presupuestos y Costos (pestaña Ingeniería):** ver `PROMPT_COSTEO_MAESTRO` en `ia-core.js` y el campo admin.
- **Logístico:** chat propio en la pestaña Logística (entre Envío y Costos logísticos), separado del de Costos. Usa el Prompt logístico de Ajustes. Entrevista en el chat; **Generar datos logísticos** escribe las filas abiertas y las marca como estimado. Sugiere modalidad y no la cambia sola. El catálogo de Drive **no** está conectado.

---

## ESTÁNDARES UI/UX Y MOTOR FINANCIERO AIU

- **Cero ventanas nativas:** prohibido `alert()`, `confirm()` y `prompt()`. Usar modales Bootstrap 5.3 o toasts en `#toastContainer`.
- **Drag & drop:** SortableJS; jaladores `.drag-handle`.
- **Motor AIU y bimoneda:** TRM oficial Socrata. Simulación COP/USD con comisión de venta, fee libre y topes de utilidad/imprevistos.
- **Limpieza de mesa:** al buscar una **nueva** oportunidad en Odoo, vaciar ítems, restablecer lote a Q=1, limpiar archivos, reiniciar el chat IA y vaciar la ficha. El locale se vuelve a tomar del Brief.
- **Pestañas:** Ingeniería de Costos y Logística y consolidador comercial (PDF Etapa 1 + Etapa 2 Paso 1). Modales con franja roja gruesa en el header. Visor de adjuntos: imágenes + PDF.js (páginas). Espera de nube: overlay `#sbEspera` (spinner + qué hace + segundos) al listar/abrir historial y Guardadas; barra `logCargaBar` mientras llegan los renders. Cero `alert`/`confirm`/`prompt` nativos (salvo el `confirm` al abrir una guardada con cambios sin salvar, y el de borrar historial de Costos).

---

## DATOS PERSISTENTES (SHEETS)

Mismo libro (`DB_SHEET_ID_V28`):

- `Presupuestos`: historial de proyectos de Costos (matriz, versiones, chat).
- `Cotizaciones`: historial de PDF comerciales (una fila por revisión: ID `C-00001`, Rev, número, cliente, JSON partido en 4 celdas, usuario). Las imágenes no van en la celda: archivos en `02_Cotizaciones` y refs `imgRef`/`srcRef`.
- `Configuracion_Global`: tarifas, topes, márgenes, comisiones, prompts, URL GAS, **`tyc`**, **`membrete`** y **`anchosMatriz`**. `guardar_config` sustituye el JSON entero: hay que persistir siempre `tyc`, `membrete` y `anchosMatriz`. Los anchos también se pueden parchear con `guardar_anchos_matriz` sin tocar el resto.
- `Catalogo_Maestro`: corazón de precios (categoria, proveedor, nombre, um, costo_cop, vigente, revisar, fuente_archivo, file_id, ruta, actualizado). Vive en este libro (GD-SmartBudget / 01_Sistema), **no** dentro del buzón de listados de Compras.
- `Ingesta_Log`: cada archivo procesado (estado OK/VACIO/ERROR, filas, fecha).
- `Catalogo_Meta`: una fila de progreso (`estado`, archivo, índice, mensaje, `ultima_sync`, `ultima_por`).
- `Gemini_Uso`: consumo mensual **de toda la empresa** (tokens/USD). El medidor “Equipo” lee esta hoja, no propiedades del script por cada deployment.

Los JSON de `Presupuestos` incluyen `versiones[]` (V1, V2… con matriz, chat, comentario y `fichaComercial`) y `cabecera.locale`.

---

## ESTADO DEL PRODUCTO (octubre 2026)

Hay **dos pestañas** en la app. No mezclar con las fases internas del chat de Gemini.

### Fase 1 — Ingeniería de Costos (hecha; pulir solo si Edwin lo pide)

Local preview: `http://127.0.0.1:8765/` (versión de UI según badge en `index.html`). Producción: `https://smartbudget.grupodiforma.com` tras `git push` a `main`. Tras editar `backend.gs` en el repo, Edwin debe **pegarlo** en Apps Script.

**Cabecera y Odoo.** Buscar código de oportunidad (`crm.lead`). Equipo, cliente, mercado por `pricelist_id` (USD → Exportación, si no Nacional). Locale del Brief:

| Campo Odoo | Uso en la app |
| --- | --- |
| `lang_code` / `idioma` (`es_CO`, `en_US`…) | Español o English de la ficha |
| `tipo_medida` `"1"` | Sistema Internacional → **cm** |
| `tipo_medida` `"2"` | Sistema Ingles → **in** |
| `country_id` | País (fallback imperial si US/PR y viene vacío `tipo_medida`) |
| `funcionales`, `dim_diseno`, `obs_presupuesto` | Pistas de texto para la IA (no sustituyen la ficha) |

**Versiones.** Un proyecto = un código Odoo. V1 al empezar; **Nueva versión** copia matriz/chat/ficha. Comentario opcional. Historial: una fila por código, JSON con todas las versiones.

**Renders del grupal.** A Drive solo va el archivo al que se le puso el pin Cotización de esa pieza. El botón **Cargar Renders** (y al abrir el presupuesto) trae dos cosas: la imagen de Odoo, que entra como Grupo, y el pin de cotización de cada pieza (si el JSON no trae `imgRef`, se busca en la cotización guardada de ese código). Planos, PDF y demás archivos del análisis no se suben a Drive ni vuelven. Subir un pin nuevo exige pegar el `backend.gs` actual (`presupuesto_imagenes`); si esa acción no existe, el guardado avisa.

**Excel.** Plantilla oficial se publica en Admin → Conexiones (Drive). Relleno EXP/NAL; pestañas `EXP {codigo}-V1` / `NAL…` y clones V2, V3… al lado de V1 (no al final). En un grupal, las pestañas de las piezas quedan seguidas (la otra de mercado, NAL o EXP, va después del bloque). C3 es el No. Proyecto sin el código, más el nombre de la pieza: `SHOW ROOM-Nombre elemento`. Observaciones: texto OMIL/Nestlé intacto; nota de versión debajo, otro color, solo en la celda maestra del merge. La plantilla siempre tiene 3 columnas de Q (E/G/I): NAL/EXP rellenan las vacías copiando el último Q; **AUX no** (`sinPad`: Q=0 en columnas de relleno). Flete de la fila 35 solo por nombre (`flete|transporte`); no toda la categoría Empaque. En esa fila E es el **total del lote** (la fórmula `K35=E*D/K7` diluye).

**Candado y AUX.** Clic en el candado de cada fila: la línea no suma al AIU ni al NAL/EXP; el valor se conserva. Clic en el candado del **encabezado**: candar o liberar toda la matriz (no hay menú extra junto a + Agregar Rango). Si hay líneas candadas, se genera `AUX {codigo}-V1` **clonando el mismo formato** de NAL/EXP (cabecera, fab 10–32, flete 35, com 37–39, fórmulas AIU). AUX incluye las candadas (estudio). NAL/EXP oficiales no las incluyen.

Clonar AUX: **antes** de rellenar NAL/EXP (si se clona después, ExcelJS copia resultados cacheados y rompe fórmulas compartidas). No asignar `cell.model` (ExcelJS 4.4 revienta `writeBuffer` con `reading 'value'`). No copiar `column.style` (lo serializa como Calibri 11 y recorta números del AIU). Sí copiar **estilo de fila** (plantilla: Arial 8 pt, alto ~9) y anchos. Tras cambiar `export-excel.js`, Ctrl+F5 (`?v=`).

**Anchos de la matriz.** El usuario arrastra el borde de las columnas. Un admin los persiste en `Configuracion_Global.anchosMatriz` (acción GAS `guardar_anchos_matriz`, parche; no pisa Motor AIU ni prompts). El resto de usuarios los recibe al cargar la config. Tras pegar el `backend.gs` actualizado en Apps Script, esa acción ya existe.

**AIU en pantalla.** Fila **Costo directo** resaltada (`.aiu-directo`): es el dato que cotizan los coordinadores de producción.

**IA y visor.** Split 50/50. PDF.js con paginación. Generar matriz timeout largo (hasta 180 s). Timeout por defecto de otras peticiones 45 s. Gemini PRO opcional. Medidor de cupo **global** (`Gemini_Uso`).

**Ficha comercial (puente a Logística).** En Ingeniería, editable, persistida **por versión**: título, descripción 3–4 líneas, medidas generales y empaque (cm/in según locale). Sale al **Generar matriz** o con **Rellenar con IA** (no toca costos). Alimenta la cotización PDF. No reescribirla al cambiar Mercado a mano.

**No hacer al costear un proyecto ya abierto:** volver a **Buscar** en Odoo limpia la mesa.

### Fase 2 — Logística y consolidador comercial

#### Etapa 1 — Cotización PDF (hecha; 15 oct 2026)

Módulo `logistica.js`. Hoja **Carta**, iframe `srcdoc`, PDF = impresión nativa de Chrome (**Guardar como PDF**). Sin librería de PDF. Webfont incrustada: **no** (Edwin la descartó; Print to PDF de Windows a veces come la L).

**Documento.** Membrete HTML (barra roja, logo, pie con QR + oficinas + web). Cabecera y firma editables sobre la hoja (over > Odoo > proyecto). Tabla de ítems: arrastrar orden, anchos/alto, mostrar/ocultar título-desc-medidas, cantidad única o escenarios. Se pueden mezclar versiones de **otros** proyectos de Costos (nube) → tipo interno CONS.

**Ajustes (admins).** Pestaña **Términos** (`CONFIG_GLOBAL.tyc`: vars + textos ES/EN). Pestaña **Membrete**: logo, QR, oficinas, web, firma manuscrita opcional. Eso cubre cambios de contenido. Un rediseño **radical** de cabecera/pie es cambio del HTML de la plantilla (con Edwin). **No** cargar la cabecera/pie enteros como una sola imagen: el texto saldría borroso al imprimir y cada oficina exigiría un arte nuevo. Decisión (oct 2026): logo y QR sí son imagen; oficinas y web siguen en HTML. Un PDF ya descargado no cambia; reimprimir una guardada usa el membrete **actual**.

**Nombre de archivo.** Interno CONS / COT / QUOT. En pantalla y PDF: Consolidado / Consolidated, Cotizacion / Quotation. El número es el código del **primer ítem** de la lista (el usuario lo define arrastrando esa fila arriba). Al soltar la fila se suelta el código que hubiera quedado guardado en el encabezado, y el título de la hoja y el nombre del PDF pasan al proyecto que quedó primero. Al imprimir se recalcula el `document.title`.

**Gran total del PDF.** Cotización **Nacional / Colombia:** `GRAN TOTAL SIN IVA (COP)` / `GRAND TOTAL BEFORE VAT (COP)`. Cotización **Exterior** (mercado EXPORT, ES o EN): `GRAN TOTAL (USD|COP)` / `GRAND TOTAL (USD|COP)` — no lleva “SIN IVA”. Función `logEtiquetaGranTotal_` en `logistica.js`.

**Historial Guardadas.** Hoja `Cotizaciones`. Guardar = nueva o Rev. Listar/abrir/guardar van en cola GAS (un request a la vez). Imágenes: IndexedDB `smartbudget_log` / `img`; si faltan, blob secuencial (`cotizacion_imagenes` modo `blob`). Prefetch de la lista si ya hay `gasUrl`. Overlay de espera al listar y al abrir; barra de renders `N de M · s`.

**GAS cotizaciones.** Acciones: `guardar_cotizacion`, `listar_cotizaciones`, `obtener_cotizacion`, `cotizacion_imagenes`. Caché de lista 120 s. No crear carpeta `SmartBudget_Cotizaciones` en Mi unidad si falta el ID: abortar.

**Pendiente de Etapa 1:** **Paso 8** — validar 3 PDF reales (membrete, textos, gran total según mercado, orden, nombre de archivo). Ya no bloquea Etapa 2.

#### Etapa 2 — Envío real

**Paso 1 (publicado en V1.0.29).** Incoterm, destino, cubicaje, filas de costo, el formato de abajo y la ficha de comisión. **Kg vol** (interno, no va al PDF): aérea = ancho × largo × alto de la caja en cm / 6.000; courier = / 5.000; se multiplica por las cajas. Marítimo y terrestre no lo muestran. **Peso por caja** se escribe en la ficha de Costos (kg o lb según el sistema) y en Envío se suma peso × cajas; tampoco sale en el PDF. **Descuento o recargo:** el % es el Fee libre de Costos. Con el candado cerrado sale una línea después del subtotal y antes de la logística; negativo descuenta, positivo recarga; no entra en la comisión ni en el flete. El comentario es opcional y, si se escribe, sale bajo el título de esa línea. Vacío, la línea no cambia. Una cotización ya guardada sin comentario queda igual. **Historial:** columna Nombre es el campo No. Proyecto del presupuesto, sin el código (el código ya está en Proyecto). El comentario queda para notas. Al abrir Guardadas se lee el nombre actual de cada presupuesto en la nube, así que las cotizaciones ya guardadas cambian sin volver a guardarlas. Si ese presupuesto no está en la nube, queda el nombre con el que se guardó la cotización. **País y código de Envío:** el menú trae el catálogo ISO en español (Trinidad y Tobago = TT). Si el Apps Script ya tiene `odoo_paises`, Odoo reemplaza esa lista con `res.country`.

**Formato en uso.** Dos bloques y un gran total.

- Bloque proyectos (exportación): subtotal por defecto **PRECIO SUBTOTAL EXWORKS (USD)** (precio en planta). El texto del subtotal es editable.
- Bloque logística aparte, con su subtotal (título editable). Las filas salen de la matriz según Incoterm × modalidad. El comercial llena el valor. Siempre puede agregar una **fila libre**.
- Cierre por defecto: **GRAN TOTAL + Incoterm + ciudad + código de país** (ej. `GRAN TOTAL CIF MIAMI US`). El título es editable (ej. `DDP SIN IVU`: el IVU lo paga el importador). Editar el título no cambia qué filas abre el Incoterm.
- El comercial elige **detalle** (cada fila) o **una línea**. En una línea, un % (0–100) se ve como logística y el resto se reparte en los proyectos **según el subtotal de cada uno**. El gran total no cambia. El % no se imprime.
- Listas desplegables (la IA logística las podrá seleccionar después): **modalidad**, **Incoterm**, **país** y **código corto**. País y código salen de Odoo y se pueden cambiar. **Puerto/lugar** no va en el PDF; queda opcional y oculto, solo como dato para la IA en marítimo.
- Modalidades: **Courier** (una sola línea consolidada), **Aérea**, **Marítimo FCL**, **Marítimo LCL**, **Terrestre** (frontera: Ecuador, Venezuela). FCL y LCL usan las mismas filas.
- Incoterms solo marítimos (FAS, FOB, CFR, CIF) no se ofrecen en aérea, courier ni terrestre.
- **Aéreo:** el flete terrestre local entra dentro de **Costos en origen** (no hay fila aparte). El flete principal, si el Incoterm lo marca, es el **flete aéreo internacional**.
- **Marítimo:** flete interno = terrestre Bogotá–puerto; flete principal = flete marítimo.
- **Duties** y **Taxes** son dos filas. Cada una tiene **%** y **observaciones internas** (no van al PDF). En el PDF solo entra el valor de la fila. No llevan el margen de logística.
- **Margen de logística.** El valor de la fila es el costo. Para la cotización se le suma un %. En exportación es uno solo (defecto 20%) y cubre origen, fletes, seguro, destino, courier y la fila libre. En nacional cada uno tiene el suyo: envío, montaje, bodegaje y otro (defecto 30%). El % no se imprime. Una cotización ya guardada, sin este dato, queda en 0% para no cambiar el total.
- Nacional (cerrado): Envío nacional, Montaje e instalación, Bodegaje, Otro. Gran total **SIN IVA**, título editable. Sin modalidad ni Incoterm.

Matriz vendedor (Sí = la fila existe):

| Incoterm | Origen | Flete interno | Flete principal | Seguro | Destino | Duties | Taxes | Aplica a |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EXW | — | — | — | — | — | — | — | Multimodal |
| FCA | Sí | Sí | — | — | — | — | — | Multimodal |
| FAS | Sí | Sí | — | — | — | — | — | Solo marítimo |
| FOB | Sí | Sí | — | — | — | — | — | Solo marítimo |
| CFR | Sí | Sí | Sí | — | — | — | — | Solo marítimo |
| CIF | Sí | Sí | Sí | Sí | — | — | — | Solo marítimo |
| CPT | Sí | Sí | Sí | — | — | — | — | Multimodal |
| CIP | Sí | Sí | Sí | Sí | — | — | — | Multimodal |
| DAP / DPU | Sí | Sí | Sí | — | Sí | — | — | Multimodal |
| DDP | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Multimodal |

En aéreo, “Flete interno = Sí” no abre fila: ese terrestre ya va dentro de Costos en origen.

#### Comisión de venta (publicada en V1.0.29)

Ficha en Logística, entre Proyectos y Envío. El presupuesto trae el precio con la comisión con la que se calculó (`pctBase` / `snap.pctCom`). El % de la ficha lo reemplaza solo en esta cotización y el precio de la hoja cambia al momento. En cero queda el precio base, sin comisión. Subir el % suma esa comisión sobre esa base, no encima de la comisión vieja. Fórmula del precio: `precioGuardado × (100 + % nuevo + fee) / (100 + % origen + fee)`. El fee no se edita aquí.

La liquidación (`valor = subtotal de proyectos × % / (100 + % + fee)`) usa el precio de venta de los proyectos, sin flete. Fletes, montaje, instalación, bodegaje y el resto no entran y no se mueven al cambiar el %. Un arancel o impuesto dejado en % sigue el precio del presupuesto, no el precio ya ajustado por la comisión de la ficha.

**Una línea.** El gran total no cambia. El % visible queda como logística; el resto se reparte en los productos solo para la impresión, en proporción al precio de venta de cada uno (ya con la comisión de la ficha, todavía sin flete). La comisión no lee el precio impreso. Ejemplo: venta $110 + flete escondido $30 → la fila muestra $140 y la comisión se liquida sobre $110.

**Precio a mano.** Si la fila lleva flete prorrateado, el precio unitario de la hoja no se edita (`.pu-lock`). Cantidad, textos y el precio en modo Detalle siguen editables. Para cambiar el precio de venta hay que pasar los costos a Detalle.

Al guardar, `datos.comision` (`pct`, `pctBase`, `fee`) y `snap.pctCom` van en el JSON. El total de la lista es el gran total ya ajustado. Reabrir la revisión restaura % y precios. Una cotización vieja, sin ese bloque, asume que la comisión ahora seleccionada en Costos es la que está dentro del precio: no salta hasta que se cambie el %.

**Asistente IA de logística.** Chat en la pestaña, aparte del de Costos. Lee el Prompt logístico de Ajustes. El catálogo de Drive sigue pendiente.

- **Catálogo.** Las cotizaciones de los proveedores logísticos viven en una carpeta de Drive de la empresa. Un admin las sincroniza a una hoja, igual que `Catalogo_Maestro`. El chat consulta esa hoja. No abre los PDF en cada cotización.
- **Si no hay tarifa.** El asistente propone un estimado y lo marca como estimado. No lo presenta como precio de proveedor. No es una búsqueda web en vivo.
- **Flujo.** Si falta un dato (destino, cajas, peso, puerto en marítimo), hay entrevista en español. Luego **Generar datos logísticos** escribe el valor en las filas que ya abre la modalidad × Incoterm × destino. Esos valores siguen editables.
- **Modalidad.** La IA sugiere la más conveniente para el envío. No la cambia sola. El comercial o el analista de costos elige modalidad, destino e Incoterm.
- No mueve comisión ni el precio de los proyectos.

**Aún sin diseñar:** márgenes logísticos en Ajustes, contenedor. Partir el JSON del presupuesto (una celda, tope 50.000) queda para cuando Edwin pida el plan.

### Recordatorios operativos

- Sin secretos ni IDs de hojas/carpetas en frontend ni en este Markdown.
- OTP + `authKey` en local y producción.
- Preview local antes de producción. Tras editar `backend.gs`, Edwin lo pega en Apps Script y publica una versión nueva del web app.
- GD-SmartBudget: no añadir al equipo de Compras; 03_Listados se **eliminó** a propósito (los listados siguen en Compras).
- `propuestas-ui/` es experimento de UI, no parte del flujo de costeo.
- **No alterar Ajustes** (Motor AIU, Márgenes, Catálogos fijos, Comisiones, Prompts IA) desde el código ni con `guardar_config` de desarrollo. Solo el administrador, en la UI, cuando él lo decida.

---

## CHECKPOINT — 16 oct 2026

Producción (`main` y `desarrollo`): **V1.0.29**. Preview local: `http://127.0.0.1:8765/` con Ctrl+F5. `backend.gs` del repo sigue pidiéndose a mano en Apps Script (cotizaciones, imágenes Odoo, anchos). La ficha de comisión no lo necesita.

**Caché publicada:** `styles.css 1.0.47` · `admin.js 1.0.29` · `app.js 1.0.32` · `engine.js 1.0.34` · `ia-core.js 1.0.29` · `export-excel.js 1.0.30` · `logistica.js 1.0.58` · `seguridad.js 1.0.25`. `propuestas-ui/` no entra en commits.

Si Ajustes no logra leer la hoja, el aviso queda visible y **Guardar** queda apagado (`_configHojaFallo`). Historial de Costos y lista de cotizaciones se muestran al instante con la última lista de ese teléfono y se actualizan detrás. Las fotos salen por enlace de Drive; el archivo completo solo se pide al editar la imagen.

**Hecho y validado con Edwin (sesión 15 oct):**

- Globales en matriz: columna **`$ LOTE`**; `$ UNIT` = lote÷Q. El chat no debe copiar caja/flete a cada unidad del rango (REGLA C; `costos[]` de globales se ignora).
- Troquelado por golpe **no** se infiere global; el dado/molde/setup sí.
- Candado masivo por icono del encabezado.
- AUX = clon de plantilla NAL/EXP, no tabla propia; clone antes de rellenar; AUX no rellena 3 rangos si solo hay uno; fuente Arial 8 del AIU no se pierde al clonar.
- Anchos de columnas globales (`anchosMatriz`). Config remota manda; no mezclar `config.json` encima.
- AIU: **Costo directo** mismo tamaño que + Imprevistos, mayúsculas, cifra en rojo (sin recuadro). Totales de tarjeta (Precio venta unitario / Total negocio) centrados y un poco más grandes.
- PDF: “SIN IVA” solo en cotizaciones de Colombia.
- **Etapa 2 Paso 1:** Incoterm + destino + cubicaje de ficha + fila Envío a mano. Totales partidos cuando hay envío. Persistido en `guardar_cotizacion` (sin GAS nuevo).

**Pendiente (no mezclar en el mismo hilo si se puede evitar):**

1. Edwin pega `backend.gs` en Apps Script si aún no lo hizo (`guardar_anchos_matriz`).
2. **Paso 8 Etapa 1:** validar 3 PDF reales (membrete, textos, gran total según mercado, orden, nombre de archivo).
3. Si Ajustes en Sheets se ve raro: **no pulsar Guardar**; el agente no debe `guardar_config`.
4. Etapa 2: el chat de logística ya está en la pestaña (entrevista, Generar datos, modalidad sugerida). El catálogo de Drive no está conectado. Márgenes logísticos y partir el JSON del presupuesto siguen pendientes.

**Nuevo chat:** *«Lee `CONTEXTO_PROYECTO.md` (checkpoint 16 oct 2026) y continúa desde ahí»* + la tarea concreta. No reabrir Excel, AUX, candados, OTP ni Ajustes salvo regresión.

