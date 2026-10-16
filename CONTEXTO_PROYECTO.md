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
| `logistica.js` | Cotización PDF (Etapa 1) + Etapa 2 Paso 1: Incoterm, destino, cubicaje desde ficha y líneas de envío a mano. No meter flete/IA en `engine.js` ni `ia-core.js`. |
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
2. Pulsa **Analizar archivos** → **Fase 1 entrevista**. La IA **no** genera matriz aunque el analista ya haya respondido.
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
- **Logístico:** el campo admin “Prompt logístico” existe. Etapa 2 Paso 1 (Incoterm, destino, cubicaje, envío a mano) ya está. Maestro de tarifas, prorrateo e IA de flete **no** iniciados.

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

**Excel.** Plantilla oficial se publica en Admin → Conexiones (Drive). Relleno EXP/NAL; pestañas `EXP {codigo}-V1` / `NAL…` y clones V2, V3… al lado de V1 (no al final). Observaciones: texto OMIL/Nestlé intacto; nota de versión debajo, otro color, solo en la celda maestra del merge. La plantilla siempre tiene 3 columnas de Q (E/G/I): NAL/EXP rellenan las vacías copiando el último Q; **AUX no** (`sinPad`: Q=0 en columnas de relleno). Flete de la fila 35 solo por nombre (`flete|transporte`); no toda la categoría Empaque. En esa fila E es el **total del lote** (la fórmula `K35=E*D/K7` diluye).

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

**Nombre de archivo.** Interno CONS / COT / QUOT. En pantalla y PDF: Consolidado / Consolidated, Cotizacion / Quotation. El número es el código del **primer ítem** de la lista (el usuario lo define arrastrando esa fila arriba). Al imprimir se recalcula el `document.title` (no se deja el de una revisión vieja).

**Gran total del PDF.** Cotización **Nacional / Colombia:** `GRAN TOTAL SIN IVA (COP)` / `GRAND TOTAL BEFORE VAT (COP)`. Cotización **Exterior** (mercado EXPORT, ES o EN): `GRAN TOTAL (USD|COP)` / `GRAND TOTAL (USD|COP)` — no lleva “SIN IVA”. Función `logEtiquetaGranTotal_` en `logistica.js`.

**Historial Guardadas.** Hoja `Cotizaciones`. Guardar = nueva o Rev. Listar/abrir/guardar van en cola GAS (un request a la vez). Imágenes: IndexedDB `smartbudget_log` / `img`; si faltan, blob secuencial (`cotizacion_imagenes` modo `blob`). Prefetch de la lista si ya hay `gasUrl`. Overlay de espera al listar y al abrir; barra de renders `N de M · s`.

**GAS cotizaciones.** Acciones: `guardar_cotizacion`, `listar_cotizaciones`, `obtener_cotizacion`, `cotizacion_imagenes`. Caché de lista 120 s. No crear carpeta `SmartBudget_Cotizaciones` en Mi unidad si falta el ID: abortar.

**Pendiente de Etapa 1:** **Paso 8** — validar 3 PDF reales (membrete, textos, gran total según mercado, orden, nombre de archivo). Ya no bloquea Etapa 2.

#### Etapa 2 — Envío real

**Paso 1 (borrador en local, 15 oct).** Incoterm corto, destino, cubicaje y una fila de envío libre. Sirve de base. El formato acordado abajo lo reemplaza cuando Edwin pida el código.

**Formato acordado (diseño, sin código aún).** Dos bloques y un gran total.

- Bloque proyectos (exportación): subtotal por defecto **PRECIO SUBTOTAL EXWORKS (USD)** (precio en planta). El texto del subtotal es editable.
- Bloque logística aparte, con su subtotal (título editable). Las filas salen de la matriz según Incoterm × modalidad. El comercial llena el valor. Siempre puede agregar una **fila libre**.
- Cierre por defecto: **GRAN TOTAL + Incoterm + ciudad + código de país** (ej. `GRAN TOTAL CIF MIAMI US`). El título es editable (ej. `DDP SIN IVU`: el IVU lo paga el importador). Editar el título no cambia qué filas abre el Incoterm.
- El comercial elige **detalle** (cada fila) o **una línea**. En una línea, un % (0–100) se ve como logística y el resto se reparte en los proyectos **según el subtotal de cada uno**. El gran total no cambia. El % no se imprime.
- Listas desplegables (la IA logística las podrá seleccionar después): **modalidad**, **Incoterm**, **país** y **código corto**. País y código salen de Odoo y se pueden cambiar. **Puerto/lugar** no va en el PDF; queda opcional y oculto, solo como dato para la IA en marítimo.
- Modalidades: **Courier** (una sola línea consolidada), **Aérea**, **Marítimo FCL**, **Marítimo LCL**, **Terrestre** (frontera: Ecuador, Venezuela). FCL y LCL usan las mismas filas.
- Incoterms solo marítimos (FAS, FOB, CFR, CIF) no se ofrecen en aérea, courier ni terrestre.
- **Aéreo:** el flete terrestre local entra dentro de **Costos en origen** (no hay fila aparte). El flete principal, si el Incoterm lo marca, es el **flete aéreo internacional**.
- **Marítimo:** flete interno = terrestre Bogotá–puerto; flete principal = flete marítimo.
- **Duties** y **Taxes** son dos filas. Cada una tiene **%** y **observaciones internas** (no van al PDF). En el PDF solo entra el valor de la fila.
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

**Aún sin diseñar:** maestro de tarifas, IA de flete, márgenes logísticos en Ajustes, comisión sin base logística, contenedor y peso. Plan antes de código.

### Recordatorios operativos

- Sin secretos ni IDs de hojas/carpetas en frontend ni en este Markdown.
- OTP + `authKey` en local y producción.
- Preview local antes de producción. Tras editar `backend.gs`, Edwin lo pega en Apps Script y publica una versión nueva del web app.
- GD-SmartBudget: no añadir al equipo de Compras; 03_Listados se **eliminó** a propósito (los listados siguen en Compras).
- `propuestas-ui/` es experimento de UI, no parte del flujo de costeo.
- **No alterar Ajustes** (Motor AIU, Márgenes, Catálogos fijos, Comisiones, Prompts IA) desde el código ni con `guardar_config` de desarrollo. Solo el administrador, en la UI, cuando él lo decida.

---

## CHECKPOINT — 15 oct 2026 (publicado en GitHub Pages)

Ingeniería + Excel + PDF Etapa 1 + **Etapa 2 Paso 1** (Incoterm / destino / cubicaje / envío a mano). Publicado en `main` / `desarrollo` como **V1.0.26**. Preview local: `http://127.0.0.1:8765/` con Ctrl+F5. `backend.gs` sigue pidiéndose a mano en Apps Script.

**Caché UI (index.html):** `styles.css 1.0.47` · `admin.js 1.0.28` · `engine.js 1.0.34` · `ia-core.js 1.0.29` · `export-excel.js 1.0.30` · `logistica.js 1.0.52`.

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
4. Etapa 2: el formato está en local (`logistica.js 1.0.52`, `styles.css 1.0.47`). El tipo Nacional o Exportación se elige en Logística y no depende del mercado abierto en Costos. La pestaña queda en dos columnas (controles | hojas Carta) con zoom para ver la hoja completa. País y código usan lista anclada al campo. Filas de costo se arrastran, duplican y quitan; Restaurar vuelve a la plantilla del Incoterm. El gran total siempre muestra la moneda; al editarlo las letras pasan a negro y al salir vuelven a blanco. DDP imprime Costos en destino aunque el valor esté en cero. Una página que solo sigue con envíos no repite el encabezado de proyectos. Idioma y sistema de medidas se heredan del proyecto y se pueden cambiar solo en la cotización. Maestro, IA y márgenes logísticos siguen sin diseñar.

**Nuevo chat:** arrancar con: *«Lee `CONTEXTO_PROYECTO.md` (checkpoint 15 oct 2026) y continúa desde ahí»* + la tarea concreta. No reabrir Excel/AUX/candados salvo regresión.

