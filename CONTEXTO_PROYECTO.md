# SmartBudget Diforma - Documento Maestro de Arquitectura (V1.0)

## 1. Resumen Ejecutivo
SmartBudget Diforma es una aplicación web de cotización y presupuestación industrial 100% Serverless. Permite cubicación con IA (Gemini), integración ERP (Odoo), almacenamiento histórico en Google Sheets y simulación financiera AIU en tiempo real.

## 2. Arquitectura de Seguridad (Pattern Backend Proxy)
- **Frontend (GitHub Pages):** Libre de credenciales. No contiene API Keys ni contraseñas.
- **Backend (Google Apps Script):** Actúa como proxy intermediario seguro.
- **Propiedades del Script (Script Properties):**
  - `ODOO_PWD`: Contraseña de Odoo ERP.
  - `GEMINI_API_KEY`: Clave de la API de Google Gemini.
  - `DB_SHEET_ID_V28`: ID de la hoja de cálculo para el historial de proyectos.

## 3. Mapa de Archivos Core (Estructura Plana)
1. `index.html`: UI Shell, modales de administración, catálogo Odoo, historial y mapa de etiquetas (campo **COMERCIAL** adaptado).
2. `styles.css`: Estilos corporativos Grupo Diforma (`--diforma-red`), fuentes coloreadas (`[Base interna]`, `[Tarifa Fija]`, `[Estimado IA]`, `[Odoo ERP]`).
3. `config.json`: Base de datos estática para parámetros iniciales y tarifas fijas.
4. `app.js`: Lógica de interfaz, notificaciones (Toasts), gestión DOM segura y persistencia en Google Sheets.
5. `engine.js`: Motor matemático de matrices, escalas (Q), ordenamiento Drag & Drop y Simulador AIU (Precio Unitario + Valor Total Negocio en COP y USD).
6. `connectors.js`: Puente de comunicación sin credenciales hacia el Proxy en Apps Script.
7. `backend.gs`: Código fuente en Apps Script con enrutador dinámico de Gemini (`obtenerModelosDinamicos`) y consultas Odoo RPC (`id_vendedor`).

## 4. Estado de Integraciones
- **Odoo ERP:** Lee oportunidades CRM extrayendo el campo comercial exacto (`id_vendedor`) y busca productos en el catálogo de materiales.
- **Gemini AI:** Descubrimiento automático de modelos en tiempo real con respaldo en cascada para evitar fallos por cambio de nombres en la API v1beta.
- **Base de Datos:** Guarda y descarga el JSON completo del presupuesto desde Google Sheets.
