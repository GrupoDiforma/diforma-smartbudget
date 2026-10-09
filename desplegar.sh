#!/bin/bash
set -e

MSG="${1:-Actualización automática de producción}"

echo "🚀 Iniciando despliegue a Producción en 1 solo paso..."

# Guardar cambios en desarrollo
git add .
git commit -m "$MSG" || true
git push origin desarrollo

# Sincronizar y publicar directamente en la rama main (Producción)
git checkout main
git pull origin main || true
git merge desarrollo -m "Merge automático: $MSG"
git push origin main

# Regresar automáticamente a la rama de trabajo
git checkout desarrollo

echo "✅ ¡Publicación a Producción completada con éxito!"
