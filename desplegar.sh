#!/bin/bash
set -e

MSG="${1:-Actualización automática de producción}"

echo "🚀 Sincronizando e incrementando versión..."

# 1. Incrementar automáticamente la versión en index.html
node -e '
const fs = require("fs");
let file = "index.html";
let content = fs.readFileSync(file, "utf8");
let match = content.match(/id="appVersionBadge">(V\d+\.\d+(?:\.\d+)?)/);
if (match) {
  let oldVer = match[1];
  let parts = oldVer.replace("V", "").split(".");
  let major = parts[0] || "1";
  let minor = parts[1] || "0";
  let patch = parseInt(parts[2] || "0") + 1;
  let newVer = `V${major}.${minor}.${patch}`;
  content = content.replace(`id="appVersionBadge">${oldVer}`, `id="appVersionBadge">${newVer}`);
  fs.writeFileSync(file, content);
  console.log(`📌 Versión incrementada automáticamente: ${oldVer} -> ${newVer}`);
}
'

# 2. Guardar y subir a desarrollo
git checkout desarrollo
git add .
git commit -m "$MSG" || true
git push origin desarrollo

# 3. Forzar alineación exacta de main con desarrollo
git checkout main
git reset --hard desarrollo
git push origin main

# 4. Regresar a desarrollo
git checkout desarrollo

echo "✅ ¡Publicación a Producción completada sin conflictos!"
