#!/bin/bash
set -e

MSG="${1:-Actualización automática de producción}"

echo "🚀 Sincronizando y desplegando a Producción..."

# 1. Guardar y subir desarrollo
git checkout desarrollo
git add .
git commit -m "$MSG" || true
git push origin desarrollo

# 2. Forzar alineación exacta de main con desarrollo
git checkout main
git reset --hard desarrollo
git push origin main

# 3. Regresar a desarrollo
git checkout desarrollo

echo "✅ ¡Publicación a Producción completada sin conflictos!"
