# 🧠 CONTEXTO MAESTRO: SmartBudget Diforma

## 1. Resumen del Proyecto
**SmartBudget Diforma** es una PWA Serverless de uso interno y exclusivo para Grupo Diforma S.A. Su objetivo es la estimación de costos industriales, generación de presupuestos, integración con el CRM Odoo, módulo futuro de Logística & Cotizaciones y asistencia inteligente con Gemini AI.

## 2. Arquitectura del Sistema (100% Serverless)
* **Frontend:** HTML5, CSS3 (Bootstrap 5), Vanilla JS (ES6+). Alojado en **GitHub Pages** (`smartbudget.grupodiforma.com`). Sin servidores backend de pago (Node/Python).
* **Backend Proxy (Serverless):** Google Apps Script (GAS) actuando como puente seguro de conexión con Google Sheets, Odoo ERP y Gemini AI.
* **Base de Datos Persistente:** Google Sheets (Gestionado a través del Proxy de GAS).
  * Hoja `Presupuestos`: Historial de proyectos guardados.
  * Hoja `Configuracion_Global`: Matriz maestra con tarifas, topes, márgenes y prompts oficiales para todos los usuarios.

## 3. Seguridad, Autenticación y Control de Acceso (OTP + RBAC)
1. **Acceso Seguro OTP:** Bloqueo de pantalla inicial. El usuario ingresa su correo `@grupodiforma.com`, el backend valida el dominio y le envía un código de 6 dígitos por Gmail. Al validar el OTP, el usuario recibe el token corporativo (`authKey`) para autorizar sus peticiones.
2. **Control de Roles (RBAC - Role Based Access Control):**
   * **Usuarios Estándar (@grupodiforma.com):** Tienen acceso completo al cotizador, historial y consultas de Odoo/Gemini, pero **NO ven ni tienen acceso al botón de ⚙️ Ajustes**.
   * **Usuarios Administradores (Lista Blanca de Correos):** Son los únicos a quienes se les renderiza el botón de **⚙️ Ajustes**. Al modificar cualquier valor (prompts, márgenes, tarifas), la actualización se guarda en la hoja `Configuracion_Global` de Google Sheets, reflejándose instantáneamente para todos los usuarios de la empresa.

## 4. Prompts IA de Negocio
* **Prompt Presupuestos y Costos (Fase 1):** Mega-prompt de ingeniería de valor para extracción de materiales, mermas, desglose de mano de obra y auditoría matemática de planos/renders.
* **Prompt Logístico (Fase 2 - Futura):** Instrucciones especializadas para calcular volumen, empaque, fletes y estructuración de cotizaciones en PDF entregables.

## 5. Flujo de Trabajo y CI/CD
* **Entorno de Pruebas:** GitHub Codespaces (Rama `desarrollo`).
* **Despliegue a Producción:** Se ejecuta exclusivamente mediante `./desplegar.sh` tras la validación y confirmación explícita del usuario.
* **Automatización del Script:** Auto-incrementa la versión en `index.html` (ej. V1.0.4 -> V1.0.5) y sincroniza la rama `main` con `desarrollo`.

## 6. Reglas Inviolables para Desarrolladores / IA
1. **Entregas Exclusivas por Terminal:** Todo código o modificación se entrega empaquetado en bloques `cat << 'EOF' > archivo.ext`.
2. **Pruebas Locales Primero:** Todo cambio se prueba en la vista previa de Codespaces. NUNCA ejecutar `git push` o `./desplegar.sh` sin visto bueno explícito.
3. **Configuraciones Globales:** Ninguna regla de negocio o variable del Panel Admin debe depender de `LocalStorage` individual; todo cambio administrativo debe viajar a la hoja `Configuracion_Global` en Google Sheets.
