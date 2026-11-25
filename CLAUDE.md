# SmartBudget Diforma — guía para Claude Code

Cotizador industrial (PWA 100% serverless) de **Grupo Diforma**. Producción: `https://smartbudget.grupodiforma.com` (GitHub Pages). Uso interno.

**Lee primero `CONTEXTO_PROYECTO.md`** (arquitectura, módulos, integraciones, catálogo maestro, flujo IA). Es la fuente de verdad. Si algo aquí contradice ese archivo, manda `CONTEXTO_PROYECTO.md`. También existe `docs/MAESTRO.md`.

## Sobre el usuario
Edwin Laverde no es ingeniero de sistemas. Responde en **español, en lenguaje sencillo**, explica los términos técnicos y di qué archivos vas a tocar y por qué.

## Reglas obligatorias (resumen)
- **Arquitectura 100% cliente.** Nada de servidores backend (Flask/Express). Integraciones (Sheets, Odoo, Gemini, OTP, TRM) **solo** vía el proxy Google Apps Script (`backend.gs`).
- **Plan antes de código** en cambios importantes (costeo, catálogo, OTP, Odoo, IA, despliegue, UX de un flujo completo): explica qué harás, qué archivos toca y qué no, y espera el visto bueno de Edwin. Ajustes visuales menores o typos no lo requieren.
- **Prohibido `git push` y `./desplegar.sh` sin confirmación explícita de Edwin.** Flujo: editar → indicar cómo probar en el preview local (`http://127.0.0.1:8765/`, ver `iniciar-preview.bat`) → esperar validación → solo si pide publicar, desplegar.
- `./desplegar.sh` es lo único que cambia la versión (`#appVersionBadge` en `index.html`). Versiones de dos números: V2.0 … V2.9, V3.0.
- **Modularidad:** cada módulo en su archivo (`app.js`, `engine.js`, `logistica.js`, `ia-core.js`, `export-excel.js`, `simulador3d.js`, `connectors.js`, `admin.js`, `seguridad.js`, `backend.gs`). No reescribir cores de golpe. No meter flete ni comisión en `engine.js` ni `ia-core.js`.
- **Seguridad:** nunca escribir API keys, contraseñas, tokens ni IDs de hojas en el frontend, en Markdown ni en commits. Las credenciales viven solo en `ScriptProperties` de GAS.
- **Ajustes de negocio intocables:** no editar `config.json` (tarifas, UM, comisiones, prompts, AIU, márgenes, términos, membrete) ni llamar `guardar_config` salvo que Edwin lo pida explícito. Si hace falta un parámetro nuevo, se **añade** una clave sin sobrescribir las demás.
- `backend.gs` no se despliega solo: Edwin lo pega en Apps Script cuando lo pide.

## Regla de Cursor migrada: opciones con y sin
Aplica siempre al tocar Logística, Simulador 3D, PDF, Excel o validaciones (fuente: `docs/MAESTRO.md` §1).

Una cotización puede **no tener opciones** (`logEscList_()` vacío → estado en `logQuote.env`, modo única) o **tener 1…N opciones** (estado en `env.porEsc[escId]`).

1. Detecta el modo con `logEscList_()`. No asumas siempre opciones ni nunca opciones.
2. Sin opciones → valida/escribe el global. Con opciones → **todas** las activas, no solo la de la UI.
3. Export PDF/Excel falla si el global (sin opciones) o *cualquier* opción (con opciones) está desfasado.
4. Flags (`logCostosPendiente`, firmas): en `env` si no hay opciones; en `porEsc[id]` si las hay.
5. Habla de «opciones» al usuario solo cuando existen.

Error típico: lógica escrita solo para la opción activa o solo para multi-opción, rompiendo el otro modo.
