# Documento maestro — SmartBudget

Convenciones que **siempre** aplican al modificar Logística, Simulador 3D, PDF, Excel o el consolidador.

## 1. Opciones (escenarios): regla obligatoria

Una cotización tiene **dos formas válidas**:

| Modo | Cómo se reconoce | Dónde viven modalidad, cubicaje, costos |
|---|---|---|
| **Sin opciones** (única) | `logEscList_()` vacío / `modo: "unica"` | `logQuote.env` (global) |
| **Con opciones** | 1…N en `logQuote.escenarios` | `env.porEsc[escId]` por cada una |

Ambos modos son normales. **No asumas que siempre hay opciones**, ni que nunca las hay.

### Debe cumplirse en todo cambio

1. **Detectar el modo** con `logEscList_()` (o equivalente). Si está vacío → trabajar el **env global** (`escId ""`).
2. **Con opciones:** leer/escribir por opción (`porEsc[escId]`), no solo la activa en la UI.
3. **Validaciones de export (PDF / Excel):**
   - Sin opciones → validar el estado global.
   - Con opciones → validar **todas** las activas; bloquear si *alguna* falla.
4. **Generar / Análisis / Aplicar logística / Simulador 3D** deben cubrir el modo que exista (global o cada opción).
5. **PDF y Excel** pintan una hoja única o una por opción, según el modo; los datos deben salir del sitio correcto (global vs `porEsc`).
6. Flags (`sim3dPendiente`, `logCostosPendiente`, `costosFirma`, …):
   - Sin opciones → en `env`.
   - Con opciones → en `porEsc[id]` (+ agregado global solo para badges).

### Anti-patrones (ya ocurrieron)

- Tratar solo la opción UI y desbloquear PDF dejando otras desfasadas.
- Escribir lógica “solo con opciones” y romper cotizaciones en modo única (o al revés).
- Calcular tarifas solo para `logOpcionUiSel_` / `escUi`.
- Asumir “si no veo tabs de opción, no hay que validar” — en modo única **sí** hay que validar el global.

### Checklist rápido antes de merge

- [ ] ¿Funciona con **0 opciones** (env global)?
- [ ] ¿Funciona con **2+ opciones** (`porEsc`)?
- [ ] ¿El export falla si la Opción 2 está mal aunque la 1 esté bien?
- [ ] ¿Mensajes de error hablan de “opciones” solo cuando `logEscList_().length > 0`?

## 2. Sync Simulador 3D ↔ costos

1. Cambios 3D → `sim3dPendiente` → **Aplicar a Logística**.
2. Tras aplicar → `logCostosPendiente` (global o por cada opción) + invalidar catálogo → **Análisis** + **Generar**.
3. PDF/Excel bloqueados hasta alinear costos (`costosFirma` = cubicaje/mix actual) en el modo que corresponda.
4. Guardar puede avisar; no debe saltarse el bloqueo de export.

## 3. Precios Costos ↔ cotización

- Filas con `snap` = precios congelados (historial).
- **Actualiza Presupuesto** refresca desde Costos a propósito.
- No pisar cotizaciones del historial en silencio al abrir Costos.
