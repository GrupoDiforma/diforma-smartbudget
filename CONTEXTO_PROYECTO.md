# 🧠 CONTEXTO MAESTRO: SmartBudget Diforma

## 1. Resumen del Proyecto
**SmartBudget Diforma** es una aplicación web (PWA Serverless) de uso interno y exclusivo para Grupo Diforma S.A. Su objetivo es la estimación de costos industriales, generación de presupuestos, integración con el CRM Odoo y asistencia inteligente mediante Gemini AI.

## 2. Arquitectura del Sistema
* **Frontend (100% Cliente):** HTML5, CSS3 (Bootstrap 5), Vanilla JS (ES6+). Alojado en **GitHub Pages** (`smartbudget.grupodiforma.com`). No hay backend en Node.js ni Python.
* **Backend Proxy (Serverless):** Google Apps Script (GAS). Actúa como un puente seguro para conectarse a las bases de datos y APIs externas sin exponer credenciales en el Frontend. La URL de ejecución pública (V2) termina en `...38kMYa9j7Ddaa8p/exec`.
* **Base de Datos:** Google Sheets (Gestionada a través del Proxy de GAS).
* **Integraciones Externas (Vía GAS):** 
  * Odoo ERP (Consultas XML-RPC a `crm.lead` y `product.product`).
  * Gemini AI (Análisis de imágenes/planos y chat de reajuste).

## 3. Seguridad y Autenticación (Sistema Híbrido OTP)
Debido a bloqueos de CORS y "Cookies de terceros" en navegadores (especialmente en Modo Incógnito), se implementó una arquitectura **Passwordless OTP (One-Time Password)**:
1. **Frontend Bloqueado:** Al abrir la app, un overlay bloquea el uso exigiendo un correo.
2. **Validación de Dominio:** Solo se permiten correos terminados en `@grupodiforma.com`.
3. **Envío de Código:** El frontend envía el correo al backend GAS (`action: solicitar_otp`). GAS envía un código de 6 dígitos vía Gmail y lo guarda en caché por 10 minutos.
4. **Desbloqueo:** El usuario ingresa el código. Si es correcto, el backend devuelve el token corporativo maestro (`authKey: Diforma_SmartBudget_2026_Secure_Key`).
5. **Persistencia y Consumo:** El frontend guarda el `authKey` en `LocalStorage` (`smartbudget_token`). TODAS las peticiones HTTP posteriores hacia GAS deben incluir esta `authKey` en el payload JSON; de lo contrario, el servidor las rechaza inmediatamente.

## 4. Flujo de Trabajo y Despliegue (CI/CD)
El proyecto utiliza un flujo de Git estricto:
* **Entorno Local:** GitHub Codespaces (Rama `desarrollo`).
* **Despliegue a Producción (GitHub Pages):** Se realiza **exclusivamente** mediante el script bash `./desplegar.sh`.
* **Automatización del Script:** 
  1. Lee `index.html` y hace un auto-incremento de la versión (ej. V1.0.2 -> V1.0.3).
  2. Hace commit en la rama `desarrollo`.
  3. Cambia a la rama `main`, sincroniza exactamente con `desarrollo` (Merge/Reset).
  4. Sube a `main` (desencadenando la acción de GitHub Pages) y regresa a `desarrollo`.

## 5. Estructura de Archivos Clave
* `index.html`: UI principal, modales y bloqueos de pantalla.
* `app.js`: Lógica de UI, sistema OTP de login, y funciones de guardado/historial.
* `config.json`: Variables globales (tarifas, topes, márgenes, prompts) modificables desde el panel de Ajustes (Admin). *Ojo: Ya no contiene la authKey expuesta.*
* `backend.gs` (En Google Apps Script): Recibe POST/GET, maneja envío de correos OTP, valida el `authKey` y ejecuta funciones `proxy` hacia Odoo y Sheets.
* `desplegar.sh`: Script ejecutable de CI/CD para despliegues a producción en 1 clic.

## 6. Instrucciones para la Inteligencia Artificial
* **Rol:** Actuar como Arquitecto de Software Web Senior.
* **Regla de Código:** Todo código debe entregarse empaquetado en comandos bash usando `cat << 'EOF' > archivo.ext` para ser ejecutado en la terminal de Codespaces.
* **Regla de Despliegue:** NUNCA incluir comandos `git push origin main` a menos que el usuario indique explícitamente "Publicar a producción" tras haber probado en el entorno local de Codespaces.
* **Paradigma:** Mantener la filosofía Serverless/Cliente. No sugerir bases de datos SQL tradicionales, servidores Node/Express ni requerimientos de instalación npm que rompan la naturaleza estática de GitHub Pages.
