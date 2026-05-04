# Inbox — Supabase Dashboard

> Tareas pendientes del proyecto. Las que se completen, se mueven a "## Closed" con la fecha.

## Open

### Hotmart sync — verificar funcionamiento
- Workflow n8n: `https://n8n-n8n.26ckev.easypanel.host/workflow/hfFZh1bGIE5n2UTN`
- Cron: cada día 03:00 UTC
- **A revisar en 2026-05-04** (3 días después de activar): que se ha ejecutado al menos 2 veces sin errores, que las cifras del panel siguen cuadrando, que el campo `synced_at` de `hotmart_raw_sales` es reciente.
- Test alternativo: ejecutar manualmente `Execute workflow` desde la UI y validar output JSON.

### Detector de nuevas ediciones
- Activo desde 2026-05-01.
- Lógica: si han pasado >25 días del último `sales_open_at` Y hay día con >=5 ventas COMPLETE/APPROVED, sugiere fecha y SQL.
- **Pendiente**: conectar nodo Slack a la rama TRUE de "¿Nuevo lanzamiento?" (cuando el usuario decida canal).
- **Test natural**: ~2026-05-26 cuando se acerque el lanzamiento Mayo 2026, validar que detecta y propone fecha.

### Recobros Sequra
- Hoy el panel "Recobros pendientes" solo muestra cuotas overdue de Hotmart.
- **Falta**: traer recobros pendientes de Sequra (sus cobros aplazados). Sequra tiene API o panel propio. Hay que decidir vía:
  - API Sequra (requiere credenciales merchant)
  - Export manual periódico
  - Webhook de Sequra → BD
- Datos a integrar: alumno, importe pendiente, días overdue, estado en Sequra (pendiente, fallido, cobrado tarde).
- **Bloqueante**: necesita credenciales/acceso Sequra.

### Pestaña "Contratos y Facturas"
- Acabada en 2026-05-01 (estructura inicial con 3 estados).
- Hoy cruza 3 tablas locales:
  - `purchase_approved.id_factura` — 760 IDs Holded asignados (pero NO confirmados como emitidos)
  - `onboarding.contrato_firmado/id_contrato/id_factura/factura_enviada` — info de form OB
  - `billing_info` — datos facturación (NIF, dirección) → pendiente integrar en la vista
- Lógica 3-estados:
  - **Contrato**: 🟢 firmado (verificado) · 🟡 enviado (id asignado, sin firmar) · 🔴 no
  - **Factura**: 🟢 emitida (factura_enviada=true) · 🟡 asignada (id en BD pero no confirmado en Holded) · 🔴 no
- **Pendiente conectar**:
  - **Holded API** (facturas) — credenciales pendientes del usuario. Validará si las "asignadas" están realmente emitidas.
  - **Zoho Sign API** (contratos) — credenciales pendientes
  - **DocuSign API** (contratos) — credenciales pendientes
  - **Airtable Purchase Approved** (legacy) — credenciales ya en `accesos.md`. Para ediciones antiguas, ahí está quién tiene factura/contrato realmente generados (no solo asignados). Hacer sync.
- Cuando lleguen credenciales, sync similar al de Hotmart vía n8n.

### Reorganización del modelo de datos cliente (deuda técnica)
- Hay 3 tablas con info parcial de cada cliente:
  - `purchase_approved` (Hotmart sales + asignación manual + id_factura Holded)
  - `onboarding` (form OB con datos facturación)
  - `billing_info` (56 filas con tax_id, billing_email, dirección)
- A futuro: consolidar en una vista `clients` que cruce todo + APIs externas (Holded, Zoho, DocuSign, Sequra).
- Por ahora, los endpoints hacen el cruce en runtime. Sostenible mientras no crezca demasiado.

### Backfill `profiles.contract_signed_at`
- Solo 2 perfiles tienen el campo poblado, pero `onboarding.contrato_firmado=true` para 295.
- Ejecutar UPDATE para sincronizar `profiles.contract_signed_at` desde `onboarding` (cuando esté validado).

## Closed

### 2026-05-01 · Vista materializada `client_orders_metrics`
- Creada con dedup por `recurrency_number` y cruce con transferencias de `purchase_approved`.

### 2026-05-01 · Sync diario Hotmart → BD
- Workflow n8n activo. Cron 03:00 UTC. Idempotente vía PRIMARY KEY `transaction`.

### 2026-05-01 · Panel "Administración" → "Pagos y Recobros"
- KPIs cash collected, previsión bruta vs ajustada (con tasa de impago), por edición, por método de pago/cuotas, recobros pendientes.

### 2026-05-01 · Identificación de reservas
- Reglas: pago único + total <€800 → reserva. Excluidas de KPIs ventas/reembolsos.

### 2026-05-01 · Exclusión offers test (`mb98un0m` €1)
- 5 transactions de offer "mb98un0m" (€1 test) excluidas de todos los conteos en endpoints `/api/administracion/*`.

### 2026-05-01 · Cohort por edición real (sales_open_at)
- 11 ediciones detectadas desde 2024-08 hasta 2026-04. Función `cohort_for_date()` asigna por lanzamiento.
