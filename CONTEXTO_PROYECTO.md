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
| `connectors.js` | Odoo CRM/productos, archivos adjuntos |
| `ia-core.js` | Chat único, entrevista, generar matriz |
| `export-excel.js` | Rellena la plantilla .xlsx Diforma (EXP/NAL). Duplica pestañas por versión (V1, V2…) y publica plantilla desde Admin → Conexiones |
| `backend.gs` | Proxy GAS (Sheets, catálogo, Odoo, Gemini, OTP, Drive, plantilla Excel) |
| `config.json` | Config de cliente (sin secretos) |

### 4. Seguridad en el código y en Git

- **Nunca** escribir API keys, contraseñas, tokens Odoo/Gemini ni IDs de hojas en el frontend, en este Markdown, ni en commits.
- Credenciales viven **solo** en `ScriptProperties` de GAS (y equivalentes de servidor). El cliente solo conoce la URL del web app GAS y envía `authKey` de sesión OTP.
- OTP activo en local y en producción. Un token de desarrollo ficticio no autoriza Odoo/Gemini/Sheets.

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

- **Odoo:** instancia Odoo.sh `https://grupodiforma.odoo.com` (CRM oportunidades + costos de `product.product` como **alimento** del catálogo maestro, no como tabla paralela que Gemini adivine).
- **Google Sheets:** mismo libro (`DB_SHEET_ID_V28`): `Presupuestos`, `Configuracion_Global`, `Catalogo_Maestro`, `Ingesta_Log`, `Catalogo_Meta` (progreso y última sync).
- **Google Drive:** **buzón** de listados crudos de proveedores (PDF, xlsx, subcarpetas por año). ID de carpeta solo en GAS. No es el motor de búsqueda en cada cotización. La plantilla Excel de presupuesto vive en otra carpeta (`DRIVE_PLANTILLA_FOLDER_ID`).
- **Gemini:** entrevista/costeo de proyectos **y** extracción de tablas al sincronizar PDF hacia el maestro (clave solo en GAS).
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
4. El analista pulsa **Generar matriz** → **Fase 2**. Gemini busca en **Catalogo_Maestro** (filas vigentes). No recorre los PDF/Excel crudos en ese momento.
5. **Fase 3:** el mismo chat ajusta ítems.

Precios: según la sección Catálogo maestro. Híbrido: no fingir match de catálogo.

`es_global: true` (fletes, moldes, troqueles, setup CNC) se diluye `Costo / Q`. El resto hereda el unitario.

Prompt de Ajustes (`promptMaestro`): oficio y reglas de fabricación. **Las fases, el botón Generar matriz, las UM y la prioridad de precios las impone `ia-core.js`** (bloque “REGLAS DEL SISTEMA”), aunque el texto editable diga otra cosa. Tras cambiar el prompt de oficio, guardar en **Ajustes**.

### Prompts de negocio

- **Presupuestos y Costos (Fase 1):** ver `PROMPT_COSTEO_MAESTRO` en `ia-core.js` y el campo admin.
- **Logístico (Fase 2, futura):** volumen, empaque, fletes y cotizaciones PDF.

---

## ESTÁNDARES UI/UX Y MOTOR FINANCIERO AIU

- **Cero ventanas nativas:** prohibido `alert()`, `confirm()` y `prompt()`. Usar modales Bootstrap 5.3 o toasts en `#toastContainer`.
- **Drag & drop:** SortableJS; jaladores `.drag-handle`.
- **Motor AIU y bimoneda:** TRM oficial Socrata. Simulación COP/USD con comisión de venta, fee libre y topes de utilidad/imprevistos.
- **Limpieza de mesa:** al buscar una **nueva** oportunidad en Odoo, vaciar ítems, restablecer lote a Q=1, limpiar archivos y reiniciar el chat IA.

---

## DATOS PERSISTENTES (SHEETS)

Mismo libro (`DB_SHEET_ID_V28`):

- `Presupuestos`: historial de proyectos guardados.
- `Configuracion_Global`: tarifas, topes, márgenes, comisiones, prompts, URL GAS.
- `Catalogo_Maestro`: corazón de precios (categoria, proveedor, nombre, um, costo_cop, vigente, revisar, fuente_archivo, file_id, ruta, actualizado). Vive en este libro de Sheets (aparecerá en Drive como el archivo del historial), **no** dentro de la carpeta *Listados de precios*.
- `Ingesta_Log`: cada archivo procesado (estado OK/VACIO/ERROR, filas, fecha).
- `Catalogo_Meta`: una fila de progreso (`estado`, archivo, índice, mensaje, `ultima_sync`, `ultima_por`).

