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
- `./desplegar.sh` es lo único que cambia la versión de la app, en `#appVersionBadge` de `index.html`, y alinea `main` con `desarrollo`.
- **Versión de la app:** `V2.0`, `V2.1` … `V2.9`, `V3.0`. Dos números. El segundo va de 0 a 9; al pasar de 9 sube el primero y el segundo vuelve a 0. No usar tres números (`V1.0.33` era el esquema anterior; un badge así, al desplegar, entra en `V2.0`).
- El `?v=` de `styles.css`, `app.js` y el resto es la caché de ese archivo. No sigue esta serie. Las versiones `V1`, `V2` de un presupuesto tampoco: son del proyecto, no de la app. Las notas «publicado en V1.0.29» de este archivo son historia del esquema anterior.

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
| `logistica.js` | Cotización PDF, envío (Incoterm, destino, costos), tarifas manuales de Ajustes → Logística y ficha **Comisión de venta**. No meter flete ni comisión en `engine.js` ni `ia-core.js`. |
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
- Mezclar el resto de `config.json` encima de la config remota. Si hay config en Sheets, esa manda en tarifas, prompts, membrete y demás. La excepción es `gasUrl`: la app usa el de `config.json` y, al Guardar, lo escribe en la hoja. Una URL vieja guardada en `Configuracion_Global` no puede volver a ocupar Conexiones. No crear una implementación nueva: cambia la URL y la app seguiría llamando la anterior.

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
- **Google Sheets:** un solo libro (`DB_SHEET_ID_V28`), en la unidad compartida **GD-SmartBudget → 01_Sistema**. Hojas vivas: `Presupuestos`, `Cotizaciones`, `Configuracion_Global`, `Catalogo_Maestro`, `Ingesta_Log`, `Catalogo_Meta`, `Gemini_Uso`, `Ciudades`, `Aranceles`, `Tarifas_Logistica`. `Costos_Logisticos` es un volcado viejo de cartas de operadores: la app no lo lee y se puede borrar.
- **Google Drive (bóveda del sistema):** unidad **GD-SmartBudget**, pocos miembros (cuenta que ejecuta el Script + 1 respaldo). Carpetas: `01_Sistema` (libro + plantilla Excel) y `02_Cotizaciones` (renders JPG al guardar). IDs solo en Script Properties (`DRIVE_SISTEMA_FOLDER_ID`, `DRIVE_COTIZACIONES_FOLDER_ID`, `DRIVE_PLANTILLA_FOLDER_ID`). El Script **no** debe crear carpetas en Mi unidad. Función de anclaje: `anclarBovedaSmartBudget` en GAS.
- **Google Drive (buzón de precios):** listados crudos de proveedores (PDF/xlsx) siguen en la carpeta de **Compras** (`DRIVE_PRECIOS_FOLDER_ID`). No viven en GD-SmartBudget. No es el motor de búsqueda en cada cotización.
- **Historial compartido:** cualquier `@grupodiforma.com` autenticado ve y reabre todas las cotizaciones. El dueño del Script es el custodio de Drive; los comerciales no necesitan ser miembros de la unidad.
- **Gemini:** entrevista/costeo, ficha comercial y extracción de tablas al sincronizar PDF hacia el maestro (clave solo en GAS). En Logística el chat solo opina (modalidad, huecos, preguntas). Análisis y Generar datos logísticos los hace la app con las tarifas de Ajustes.
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

No confundir las fases del **chat de costeo** (entrevista → matriz → ajustes) con las **pestañas de producto**: Ingeniería (fase 1, hecha) vs Logística (PDF hecho; el envío lo liquida la app desde Ajustes, no Gemini).

`es_global: true` (fletes, cajas máster, elaboración de troquel/dado, moldes, setup CNC) se diluye `Costo / Q`. En la matriz: columna **`$ LOTE`** (check + valor del pedido). `$ UNIT` = lote÷Q. El troquelado por golpe y los materiales por pieza no se marcan solos. El chat de costeo no debe copiar el valor de una caja o un flete en cada unidad del rango.

Espera de IA: el overlay `#sbEspera` con “Lleva N s” también cubre chat, Analizar archivos, Generar matriz y Rellenar ficha.

Prompt de Ajustes (`promptMaestro`): oficio y reglas de fabricación. **Las fases, el botón Generar matriz, las UM y la prioridad de precios las impone `ia-core.js`** (bloque “REGLAS DEL SISTEMA”), aunque el texto editable diga otra cosa. Tras cambiar el prompt de oficio, guardar en **Ajustes**.

### Prompts de negocio

- **Presupuestos y Costos (pestaña Ingeniería):** ver `PROMPT_COSTEO_MAESTRO` en `ia-core.js` y el campo admin.
- **Logístico:** chat propio en Logística, separado del de Costos. **Análisis** y **Generar datos logísticos** no llaman a Gemini: leen `logTarifas` en Ajustes y escriben el costo. El chat (Gemini) sugiere modalidad y explica huecos; no inventa tarifas ni cambia la modalidad. Aranceles salen de la hoja `Aranceles`. Ver checkpoint 21 oct.

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
- `Configuracion_Global`: TRM, vigencia, AIU, márgenes, comisiones, prompts, URL GAS, **`tyc`**, **`membrete`** y **`anchosMatriz`**. El Guardar sigue enviando esos tres junto con el resto. El JSON se parte en celdas de 40.000 caracteres (`JSON_Config`, `JSON_2`…). Si la lectura falla, Guardar queda apagado para no pisar la nube con una copia local. `logTarifas` ya no vive aquí: al Guardar con el backend nuevo se escribe en `Tarifas_Logistica` y se quita del JSON.
- `Tarifas_Logistica`: una fila por tarifa (origen, interno, aéreo, FCL, LCL, seguro, destino) más filas `lugar` y `concepto`. La crea el Guardar. Los precios numéricos se guardan como número: Sheets estaba leyendo `2.5` como 2 de mayo y `2.4` como 2 de abril, y la caja de número salía vacía.
- `Ciudades`: una fila por ciudad (`id`, `nombre`, `pais`, `uso`). El alta manda el correo del admin.
- `Aranceles`: una fila por tasa.
- `Costos_Logisticos`: importación vieja, columnas corridas. No la lee ningún módulo. Se puede eliminar la pestaña.
- `Catalogo_Maestro`: corazón de precios (categoria, proveedor, nombre, um, costo_cop, vigente, revisar, fuente_archivo, file_id, ruta, actualizado). Vive en este libro (GD-SmartBudget / 01_Sistema), **no** dentro del buzón de listados de Compras.
- `Ingesta_Log`: cada archivo procesado (estado OK/VACIO/ERROR, filas, fecha).
- `Catalogo_Meta`: una fila de progreso (`estado`, archivo, índice, mensaje, `ultima_sync`, `ultima_por`).
- `Gemini_Uso`: consumo mensual **de toda la empresa** (tokens/USD). El contador global del encabezado lee esta hoja, no propiedades del script por cada deployment.
- `Gemini_Uso_Diario`: una fila por fecha × módulo (`costos`, `logistica`, `ajustes`, `catalogo`, `excel`) × modelo, con llamadas, tokens de entrada/salida/pensados/total y costo USD estimado por modelo (Flash con su tarifa, resto con la de Pro). La crea el backend al registrar. El contador global vive en el encabezado (junto a Catálogo/Ajustes) y su modal desglosa hoy, mes, módulo, modelo y últimos días. El % del mes va contra `geminiCupoCop` (límite COP de Google, editable en Ajustes → Presupuesto Gemini; defecto 50.000), no contra el cupo USD. La salida facturable incluye `thoughtsTokenCount`. El histórico mensual previo al detalle se estima con la tarifa general para no perderlo.

Los JSON de `Presupuestos` incluyen `versiones[]` (V1, V2… con matriz, chat, comentario y `fichaComercial`) y `cabecera.locale`.

**Cuando la información crece.** Una celda no es una base de datos. Lo que aumenta (tarifas, ciudades, aranceles, filas de catálogo) va en filas de una pestaña, una fila por dato. Un documento (presupuesto o cotización) sigue siendo una fila de resumen; si el cuerpo no cabe, se parte en celdas y, si aun así no cabe, el archivo va a Drive. No volver a meter listas crecientes dentro de `Configuracion_Global`. Si una pestaña se vuelve inmanejable, se abre otra pestaña en el mismo libro con la misma forma. Si el libro mismo se queda corto, se crea otro archivo con la misma dinámica (una fila por dato, el script lo abre por id) y no se aplasta todo en una celda. `Costos_Logisticos` no se reutiliza para eso.

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

**Versiones.** Un proyecto = un código Odoo. V1 al empezar; **Nueva versión** copia matriz/chat/ficha. Comentario opcional. Historial: una fila por código, JSON con todas las versiones. En un individual, al cambiar de versión los títulos de las secciones 1, 2, 3 y 4 muestran «Versión V2» y las cuatro secciones, la matriz y el chat parpadean, igual que al cambiar de pieza en un grupal. En un grupal esos títulos siguen mostrando el nombre de la pieza.

**Peso de la caja.** La ficha lo guarda solo si el analista, el PDF o el chat lo dijeron (kg en métrico, lb en imperial). Al generar la matriz y al pulsar Rellenar con IA se copia ese dato; si Gemini lo deja en 0 y el chat dice «12 kg por caja», se toma de ahí. No se estima por el render ni por los m² de lámina.

**Renders del grupal.** A Drive solo va el archivo al que se le puso el pin Cotización de esa pieza. El botón **Cargar Renders** (y al abrir el presupuesto) trae dos cosas: la imagen de Odoo, que entra como Grupo, y el pin de cotización de cada pieza (si el JSON no trae `imgRef`, se busca en la cotización guardada de ese código). Planos, PDF y demás archivos del análisis no se suben a Drive ni vuelven. Subir un pin nuevo exige pegar el `backend.gs` actual (`presupuesto_imagenes`); si esa acción no existe, el guardado avisa.

**Excel.** Plantilla oficial se publica en Admin → Conexiones (Drive). Relleno EXP/NAL; pestañas `EXP {codigo}-V1` / `NAL…` y clones V2, V3… al lado de V1 (no al final). En un grupal, las pestañas de las piezas quedan seguidas (la otra de mercado, NAL o EXP, va después del bloque). C3 es el No. Proyecto sin el código, más el nombre de la pieza: `SHOW ROOM-Nombre elemento`. Observaciones: texto OMIL/Nestlé intacto; nota de versión debajo, otro color, solo en la celda maestra del merge. La plantilla siempre tiene 3 columnas de Q (E/G/I): NAL/EXP rellenan las vacías copiando el último Q; **AUX no** (`sinPad`: Q=0 en columnas de relleno). Flete de la fila 35 solo por nombre (`flete|transporte`); no toda la categoría Empaque. En esa fila E es el **total del lote** (la fórmula `K35=E*D/K7` diluye).

**Candado y AUX.** Clic en el candado de cada fila: la línea no suma al AIU ni al NAL/EXP; el valor se conserva. Clic en el candado del **encabezado**: candar o liberar toda la matriz (no hay menú extra junto a + Agregar Rango). Si hay líneas candadas, se genera `AUX {codigo}-V1` **clonando el mismo formato** de NAL/EXP (cabecera, fab 10–32, flete 35, com 37–39, fórmulas AIU). AUX incluye las candadas (estudio). NAL/EXP oficiales no las incluyen.

Clonar AUX: **antes** de rellenar NAL/EXP (si se clona después, ExcelJS copia resultados cacheados y rompe fórmulas compartidas). No asignar `cell.model` (ExcelJS 4.4 revienta `writeBuffer` con `reading 'value'`). No copiar `column.style` (lo serializa como Calibri 11 y recorta números del AIU). Sí copiar **estilo de fila** (plantilla: Arial 8 pt, alto ~9) y anchos. Tras cambiar `export-excel.js`, Ctrl+F5 (`?v=`).

**Anchos de la matriz.** El usuario arrastra el borde de las columnas. Un admin los persiste en `Configuracion_Global.anchosMatriz` (acción GAS `guardar_anchos_matriz`, parche; no pisa Motor AIU ni prompts). El resto de usuarios los recibe al cargar la config. Tras pegar el `backend.gs` actualizado en Apps Script, esa acción ya existe.

**AIU en pantalla.** Fila **Costo directo** resaltada (`.aiu-directo`): es el dato que cotizan los coordinadores de producción.

**IA y visor.** Split 50/50. PDF.js con paginación. Generar matriz timeout largo (hasta 180 s). Timeout por defecto de otras peticiones 45 s. Gemini PRO opcional. Contador de consumo **global en el encabezado** (`Gemini_Uso` + `Gemini_Uso_Diario`; ver checkpoint 22 oct).

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
- Bloque logística aparte, con su subtotal (título editable). Las filas salen de la matriz según Incoterm × modalidad. **Generar datos logísticos** escribe el costo desde Ajustes. El comercial puede editarlo. Siempre puede agregar una **fila libre**.
- Cierre por defecto: **GRAN TOTAL + Incoterm + ciudad + código de país** (ej. `GRAN TOTAL CIF MIAMI US`). El título es editable (ej. `DDP SIN IVU`: el IVU lo paga el importador). Editar el título no cambia qué filas abre el Incoterm.
- El comercial elige **detalle** (cada fila) o **una línea**. En una línea, un % (0–100) se ve como logística y el resto se reparte en los proyectos **según el subtotal de cada uno**. El gran total no cambia. El % no se imprime.
- **Modalidad**, **Incoterm**, **país** y **código** los elige la persona. País y código salen de Odoo y se pueden cambiar. El chat puede sugerir modalidad y no la cambia sola. **Puerto** no va en el PDF; sirve para casar el flete marítimo.
- Modalidades: **Courier** (una sola línea consolidada), **Aérea**, **Marítimo FCL**, **Marítimo LCL**, **Terrestre** (frontera: Ecuador, Venezuela). FCL y LCL usan las mismas filas.
- Incoterms solo marítimos (FAS, FOB, CFR, CIF) no se ofrecen en aérea, courier ni terrestre.
- **Aéreo:** el flete terrestre local entra dentro de **Costos en origen** (no hay fila aparte). El flete principal, si el Incoterm lo marca, es el **flete aéreo internacional**.
- **Marítimo:** flete interno = terrestre Bogotá–puerto; flete principal = flete marítimo.
- **Duties** y **Taxes** se editan como dos filas (%, valor y observación). La observación se guarda con la cotización y no se imprime. En la hoja y en el PDF salen sumados en una sola fila **Duties y Taxes**. No llevan el margen de logística. El % sale de Ajustes → Logística → Aranceles (país de Odoo × partida de la ficha). Si varias partidas tienen distinto duty, se prorratea por valor; el tax, si el % es el mismo, va una sola vez.
- **Margen de logística.** El valor de la fila es el costo. Para la cotización de exportación se le suma el % de **Ajustes → Logística → Margen logística** (defecto 30%, clave `logMargenPct`). Una cotización nueva lo toma de ahí. Una ya guardada conserva el % con el que se armó. En la ficha se puede cambiar solo para esa cotización. En nacional cada fila tiene el suyo: envío, montaje, bodegaje y otro (defecto 30%). El % no se imprime. Duties y Taxes no lo llevan.
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

**Precio del proyecto en la cotización activa.** La ficha (medidas y empaque) se lee en vivo. El precio unitario también, mientras la fila no tenga `snap`. Si la hoja se quedó con el primer precio, al cambiar la matriz, la cantidad o el simulador se suelta y vuelve el del presupuesto (`logAlinearPrecioVivo_`, `logisticaTrasPresupuesto_` desde `engine.js`). Una cotización **guardada** conserva el `snap` y no se mueve. El botón refrescar de esa fila vuelve a leer el presupuesto abierto. El tamaño de la caja no cambia el unitario: ese sale de la matriz y del AIU.

**Asistente de logística.** Tres papeles, no uno. **Análisis costos logísticos** y **Generar datos logísticos** son locales e instantáneos: no llaman a Gemini. El análisis liquida lo que hay en Ajustes y sugiere otra modalidad si el volumen lo pide; no la cambia. Generar escribe el costo en la ficha (`fuente` `[Catálogo]`). La cotización le suma el margen. El **chat** es lo único que usa Gemini: sugiere modalidad, explica un hueco (rango aéreo vacío, contenedor justo, Incoterm) y responde preguntas. No inventa tarifas, no reescribe el catálogo y no dice que ya cambió la modalidad. Duties y Taxes siguen en Aranceles.

**Catálogo de aranceles (en local, falta publicar).** Misma mecánica que `Catalogo_Maestro`: el archivo sigue en Drive, la sync escribe la hoja `Aranceles`, Logística lee la hoja. Fuente: `GD-Logistica\Aranceles\Impuestos y aranceles_listado.xlsx` (una fila por país + partida `9403.20.00.00`, duties %, base, taxes %, base, observación). El país de la cotización es el de Odoo (`res.country`); el Excel no duplica esa lista. Ajustes → Logística: primero Partidas (solo código y descripción; Agregar y Quitar) y debajo Aranceles (agregar a mano, observación, sin Guardar ni Duplicar por fila). Las dos se graban con el Guardar de Ajustes. Sincronizar Drive reemplaza la tabla de aranceles y suma partidas nuevas. El IVU de Puerto Rico lo paga el importador: la cotización no lo suma mientras la observación lo diga. No copiar usuarios ni claves de las primeras filas del libro original. Ids de Drive no van al frontend ni aquí. El script no crea carpetas. Falta pegar `backend.gs` y publicar una versión nueva de la implementación que ya usa la app; si no, Guardar aranceles y la sync del listado plano responden «Acción no válida».

**Tarifas logísticas.** Una fila por tarifa en la hoja `Tarifas_Logistica`. El Guardar de Ajustes escribe esa hoja y saca `logTarifas` del JSON de configuración. Si la hoja todavía está vacía, la app sigue leyendo el JSON viejo. Análisis y Generar datos logísticos son locales y escriben el costo con fuente `[Catálogo]`. El chat de Gemini no inventa tarifas. Los países del menú salen en español (`Estados Unidos`, no `United States`); el cruce con ciudades es por código ISO.

Cada cargo es una fila de tarifa. **Generar** suma las preferidas en la fila única que el Incoterm ya abrió. No crea filas por cargo. Moneda por cargo; COP se pasa a USD con la TRM de Ajustes (`#cfgLogTrm` o `logTrm`) y, si la cotización es COP, el total vuelve a COP con la TRM de la cotización. El margen de la ficha se suma después, en la hoja, no dentro del costo. Duties y Taxes no llevan margen.

Preferida **S** es una sola por grupo (origen: modalidad|concepto; interno: modalidad|contenedor; aéreo: país|ciudad; FCL: país|puerto|contenedor; LCL: país|puerto; seguro: modalidad; destino: país|ciudad|modalidad|concepto). Vigencia: fecha + meses de Ajustes (defecto 6). Sigue aplicando y avisa que conviene cotizar. Semilla solo si el arreglo está vacío. Origen y destino ya cargados no se pisan. Edwin debe pulsar **Guardar** en Ajustes para que seguro e interno queden en la nube.

| Bloque IFS | Dónde | Cómo se liquida |
| --- | --- | --- |
| Flete aéreo por rango + combustible | Aéreo | Kg cobrable = max(peso real, kg vol). Rango: ≥500 +500, ≥300 +300, ≥100 +100, si no +45. Si esa celda está vacía, no se usa otro rango: se avisa llenarla en Ajustes → Logística → Aéreo. |
| Camión urbano aéreo | Origen, no flete interno | En aéreo la matriz no abre flete interno. La fila interna aérea existe en la tabla y no se suma otra vez. |
| Bogotá–puerto | Interno | Aéreo: El Dorado, camión COP 470.000 (8 oct 2026). LCL: Cartagena, VH turbo COP 4.690.000 (23 jul 2025). FCL: Cartagena, 20' COP 5.100.000 y 40' COP 6.600.000 (6 oct 2026). No hay 40HC: no inventarlo. |
| Documentos, AMS, maniobras, DTHC, SOLAS, agenciamiento | Origen | Por embarque, por contenedor o % del EXW, según la fila. IVA de origen ya va dentro del precio guardado: no aplicar 1,19 otra vez. |
| Seguro | Seguro | Aéreo y FCL 0,40 % mín. USD 75 (2026). LCL 0,40 % mín. USD 60 (2025). Base: precio subtotal EXW de la cotización, pasado a USD. |
| Destino Miami | Destino | Solo la página DDP de abril 2025. El resto de ciudades se duplica en la tabla y se edita. |
| Duty & Taxes del forwarder | No usar | Salen de Aranceles. |

«Al costo», «se confirmará» y «en caso de requerirse» no entran. Origen aéreo es la carta de San Juan del 8 oct 2026, no la de Miami de abril 2025. Las tablas de flete marítimo (FCL por naviera y LCL 180 USD W/M) no están cargadas salvo lo que Edwin escriba. Sin tarifa preferida, la fila queda vacía: no se inventa un `[Estimado IA]` en Análisis ni en Generar.

**Escenarios (Opción 1…n) con logística (22 oct 2026).** Cada opción liquida su propia logística: cubicaje (cajas, m³, peso) por las cantidades de esa opción, mix de contenedores calculado y editable por opción, embarques por opción y cada línea (origen, flete interno, flete principal, seguro sobre el EXW de esa opción, destino, Duties/Taxes con su CIF) guardada en `env.porEsc[escId]` (`contenedores`, `contenedoresManual`, `embarques`, `cubM3/cubPeso/cubKgVol`, `valores/fuentes/notas/pcts` por línea). Sin `porEsc` (cotizaciones viejas) vale el global para todas hasta recalcular. Análisis y Generar recorren todas las opciones. En la hoja/PDF ya no se apilan qty/pu/sub con una sola logística y un gran total múltiple: va **una sección completa por opción** (encabezado OPCIÓN n, sus productos, subtotal EXW, su bloque logístico con `FCL mix · m³ · kg`, su gran total e IVA/anticipo si aplica), una debajo de otra en el mismo documento, sin salto de página forzado. La ficha de Envío muestra la tabla por opción (los inputs globales de contenedores/cubicaje se ocultan en escenarios) y Costos logísticos edita los valores de la opción elegida en las pestañas sobre las filas; el % de Duties/Taxes sigue compartido.

**Envío, contenedores y embarques.** Cubicaje (m³, peso real, kg vol) es editable en la ficha. Vacío usa el empaque. En FCL el análisis propone cuántos 20', 40' y 40HC caben y los deja editables. **Calcular** vuelve a poner la mezcla. Útiles de planificación, no tarifas: 20' 28 m³ / 21.700 kg, 40' 58 m³ / 26.500 kg, 40HC 68 m³ / 26.500 kg. Si la operación usa otros, se cambian en `LOG_CONT_CAP_`. Lo escrito no se pisa. **Embarques** (defecto 1) multiplican los cargos marcados por embarque. El flete por kg, por W/M o por contenedor usa el cubicaje o la cantidad de cada equipo y no se multiplica otra vez.

**Partida arancelaria.** Vive en la ficha comercial del elemento (`fichaComercial.partida`) y en la fila de la cotización. Desplegable editable. **Rellenar con IA** está junto al título comercial, no en la barra de país, idioma y sistema. No se imprime. Lista en **Ajustes → Logística → Partidas** (`CONFIG_GLOBAL.partidas`), formato `9403.20.00.00`. Semilla: las 31 del listado (metálico, madera, plástico, display plástico, impresos, cartón, cajas corrugadas y plegadizas, calcomanías, hojalata, neveras, caja de luz, y los códigos nacionales del Excel, p. ej. `9403.20.99.00`). La ficha sugiere una sola; si nombra dos materiales, queda vacía. Cartonplast → plástico. El cruce con Duties y Taxes es país de destino × esa partida.

**Aún sin diseñar, fuera de este catálogo:** márgenes logísticos dentro de Ajustes (el % ya vive en la ficha de la cotización). Partir el JSON del presupuesto queda para cuando Edwin pida el plan.

### Recordatorios operativos

- Sin secretos ni IDs de hojas/carpetas en frontend ni en este Markdown.
- OTP + `authKey` en local y producción.
- Preview local antes de producción. Tras editar `backend.gs`, Edwin lo pega en Apps Script y publica una versión nueva del web app.
- GD-SmartBudget: no añadir al equipo de Compras; 03_Listados se **eliminó** a propósito (los listados siguen en Compras).
- `propuestas-ui/` es experimento de UI, no parte del flujo de costeo.
- **No alterar Ajustes** (Motor AIU, Márgenes, Catálogos fijos, Comisiones, Prompts IA) desde el código ni con `guardar_config` de desarrollo. Solo el administrador, en la UI, cuando él lo decida.

---

## CHECKPOINT — 21 oct 2026, tarde

Lee este checkpoint y la sección **Tarifas logísticas**. No abras chats anteriores ni las cartas de IFS.

La versión de la app es **V2.0**, **V2.1** … **V2.9**, **V3.0**. El badge lo cambia solo `./desplegar.sh`. El esquema de tres números (`V1.0.33`) ya no se usa. El guardado de cotizaciones está en el repo y todavía no está publicado. No hacer `git push` ni `./desplegar.sh` salvo que Edwin lo pida. No llamar `guardar_config`. No poner ids de Drive ni claves en frontend ni aquí. No alterar Motor AIU, Márgenes, el contenido de Catálogos fijos, Comisiones ni el texto de Prompts IA. Mover Catálogo maestro y Catálogos fijos bajo el menú **Costos** ya está hecho: no cambiar el contenido de esos paneles.

Caché local: `styles.css 1.0.80` · `admin.js 1.0.72` · `connectors.js 1.0.41` · `ia-core.js 1.0.43` · `engine.js 1.0.39` · `logistica.js 1.0.140` · `export-excel.js 1.0.33`. Tras cambiar uno de esos archivos, subir el `?v=` en `index.html`. Edwin recarga con Ctrl+F5. `backend.gs` no lleva `?v=`: hay que pegarlo y publicar **versión nueva de la misma implementación**. Una implementación nueva cambia la URL.

Nube, una fila por dato:

- `Tarifas_Logistica` guarda las tarifas. `Configuracion_Global` guarda solo ajustes cortos. `Ciudades` y `Aranceles` ya tenían su pestaña. Presupuestos y cotizaciones siguen siendo una fila de resumen, con el cuerpo partido y las imágenes en Drive.
- `Costos_Logisticos` no se usa. Edwin puede borrar esa pestaña.
- La URL de Conexiones es la de `config.json`. Guardar contra otra implementación no crea la hoja de tarifas.
- Al guardar una cotización hay overlay con segundos. La fila entra a Guardadas en ese navegador al terminar. El backend debe borrar la caché `cot_list_v2` para que el otro navegador la vea al momento.
- Con una cotización abierta, **Guardar** reescribe esa misma Rev (`modo: misma`). **Guardar como Rev N+1** añade otra fila. Una cotización nueva solo nace si no hay ninguna abierta. En Guardadas, el basurero borra esa revisión; el segundo clic confirma. Drive solo tira un render `C-#####_r#_…` si ninguna otra fila lo cita. Los renders de presupuesto no se tocan. Hasta publicar este `backend.gs`, el servidor viejo sigue creando una Rev nueva.

Cotización y ficha, en el repo:

- Encabezado gris de la tabla a dos líneas: Código de / proyecto, Precio / unitario · moneda, Precio / subtotal. La franja crece; ya no recorta con una sola línea.
- Flete marítimo del PDF: `(FCL 1×40')` o `(LCL 2,350 m³)`.
- Ficha de costos: el total de los valores queda en la misma columna que los costos, y el % del gran total a su derecha.
- La firma del comercial (nombre, cargo e imagen) es más grande que los términos.
- Aéreo: un rango vacío no se reemplaza por otro. `2.5` y `2.4` no pueden guardarse como fecha.
- Sobre **Otros cargos**: el precio es el porcentaje de los conceptos nombrados en esa ruta, no de la mercancía.
- El margen de exportación sale de Ajustes → Logística (defecto 30%). La ficha puede cambiarlo solo en esa cotización. Una guardada no se mueve.
- Leer una carta de operador muestra el avance. No hay duplicado masivo de filas. Ciudades es la última pestaña de Ajustes → Logística.

Siguiente, solo si Edwin lo pide: publicar `backend.gs`, o cargar la escala LCL de Cartagena que él dicte. No inventar 40HC de flete interno ni tarifas de puerto.

---

## CHECKPOINT — 22 oct 2026

Dos cambios de esta jornada, **en el repo (rama `desarrollo`) y sin publicar**: el badge sigue en la versión que dejó el último despliegue y no se hizo `git push` ni `./desplegar.sh`. No se llamó `guardar_config` ni se alteraron Motor AIU, Márgenes, Catálogos fijos, Comisiones ni los textos de Prompts IA. Los campos nuevos de Gemini en Ajustes solo se guardan si un administrador pulsa Guardar.

**1. Contador global de Gemini (encabezado).** El medidor viejo vivía escondido en el Asistente de costeo y subestimaba el gasto: no contaba `thoughtsTokenCount` (Google lo cobra como salida), estimaba Flash a tarifa de Pro, medía contra un cupo USD sin relación con el límite real y no desglosaba por día, módulo ni modelo (al probarlo decía octubre ≈ US$1,97 cuando la consola de Google marcaba COP 37.712 de 50.000 en el mes). Ahora:

- Contador en el encabezado, junto a Catálogo/Ajustes/versión, visible en Ingeniería y en Logística; se quitó el del Asistente de costeo. Muestra `% · COP estimado / límite COP` con barra (ámbar ≥80 %, roja ≥95 % o sin crédito).
- Clic abre el modal **Uso de Gemini — toda la empresa**: mes y hoy (costo y llamadas), tokens del mes, tablas por módulo y por modelo y últimos días.
- `backend.gs` suma los pensados a la salida facturable, cobra Flash con su tarifa (`geminiUsdPor1MInFlash/OutFlash`; el resto con la de Pro) y escribe **`Gemini_Uso_Diario`** (una fila por fecha × módulo × modelo). Cada llamada se etiqueta por origen: `costos`, `logistica`, `ajustes`, `catalogo` (sync de PDF) y `excel` (el refinamiento de plantilla, que antes ni refrescaba el medidor).
- El % va contra **`geminiCupoCop`** (defecto 50.000, el límite de Google; editable en Ajustes → Presupuesto Gemini si Edwin lo cambia en Google). El histórico mensual previo al detalle diario se sigue estimando con la tarifa general para no perder el total del mes.
- Es un **estimado interno**, no el saldo de Google: Google no publica saldo en vivo, puede aplicar descuentos (en las capturas, −COP 845) y su consola manda. Solo cuenta lo que pasa por GAS en SmartBudget; si la misma clave se usa en otra herramienta, eso aparece en Google y no aquí. Octubre de 2026 no reconcilia exacto (los pensados de este mes nunca se guardaron); el primer mes limpio es noviembre.

**2. Logística por escenario (Opción 1…n).** Antes el cubicaje salía solo de la Opción 1 y había un único mix de contenedores y un único valor por línea para todos los rangos, así que un FCL CIF cobraba el mismo flete a 38 que a 184 unidades y la hoja apilaba cantidades con un solo bloque logístico. Ahora cada opción liquida lo suyo (ver **Escenarios (Opción 1…n) con logística** en la sección de tarifas): cubicaje, contenedores calculables y editables por opción, embarques por opción, seguro sobre el EXW de esa opción y Duties/Taxes con su CIF, persistido en `env.porEsc[escId]`. La hoja trae **una sección completa por opción, una debajo de otra en el mismo PDF** (OPCIÓN n → productos → subtotal EXW → su logística con `FCL mix · m³ · kg` → su gran total e IVA/anticipo), sin salto de página forzado. Análisis, Generar, validaciones y el borrado por cambio del presupuesto recorren todas las opciones. Cotización ya guardada sin `porEsc`: usa el valor global en todas hasta que se pulse Análisis + Generar otra vez.

**Pendientes, solo si Edwin lo pide:**

1. Pegar `backend.gs` en Apps Script y publicar **versión nueva de la misma implementación**. Sin eso, el chip Gemini muestra el total mensual de siempre (sin `cupoCop` ni detalle diario) y Guardar aranceles/la sync del listado siguen respondiendo «Acción no válida» donde ya se anotó.
2. Validar con la cotización real de escenarios (17652, CIF Everglades, FCL): Análisis → Generar → revisar mix por opción y los tres gran totales en el PDF.
3. Publicar/desplegar cuando Edwin lo pida. No inventar 40HC de flete interno ni tarifas de puerto; la escala LCL de Cartagena la dicta Edwin.

