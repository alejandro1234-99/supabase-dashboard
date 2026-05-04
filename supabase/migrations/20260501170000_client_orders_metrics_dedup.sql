-- Reemplaza client_orders_metrics deduplicando por recurrency_number.
-- Hotmart reintenta cada cuota fallida ~5 veces. Antes contábamos cada reintento como cuota.
-- Ahora: por cada cuota real (recurrency_number), tomamos el ÚLTIMO intento por order_date.

DROP MATERIALIZED VIEW IF EXISTS public.client_orders_metrics CASCADE;

CREATE MATERIALIZED VIEW public.client_orders_metrics AS
WITH
-- 1) Una fila por cuota real (buyer + offer + recurrency_number), tomando el último intento.
deduped AS (
  SELECT DISTINCT ON (buyer_ucode, offer_code, recurrency)
    buyer_ucode,
    offer_code,
    recurrency,
    transaction,
    buyer_email,
    buyer_name,
    price_currency AS currency,
    installments_total,
    payment_mode,
    payment_method,
    status,
    price_value,
    hotmart_fee_total,
    approved_date,
    order_date,
    warranty_expire
  FROM (
    SELECT
      *,
      COALESCE((raw_payload->'purchase'->>'recurrency_number')::int, 1) AS recurrency
    FROM public.hotmart_raw_sales
    WHERE buyer_ucode IS NOT NULL AND buyer_ucode <> ''
  ) src
  ORDER BY buyer_ucode, offer_code, recurrency, order_date DESC NULLS LAST
),
-- 2) Agregar a nivel orden (buyer + offer)
base AS (
  SELECT
    buyer_ucode,
    offer_code,
    (ARRAY_AGG(buyer_email      ORDER BY order_date DESC NULLS LAST))[1] AS buyer_email,
    (ARRAY_AGG(buyer_name       ORDER BY order_date DESC NULLS LAST))[1] AS buyer_name,
    (ARRAY_AGG(currency         ORDER BY order_date NULLS LAST))[1]      AS currency,
    (ARRAY_AGG(installments_total ORDER BY order_date NULLS LAST))[1]    AS installments_total,
    (ARRAY_AGG(payment_mode     ORDER BY order_date NULLS LAST))[1]      AS payment_mode,
    (ARRAY_AGG(payment_method   ORDER BY order_date NULLS LAST))[1]      AS payment_method,

    COUNT(*) FILTER (WHERE status = 'COMPLETE')         AS cuotas_pagadas,
    COUNT(*) FILTER (WHERE status = 'OVERDUE')          AS cuotas_overdue,
    COUNT(*) FILTER (WHERE status = 'REFUNDED')         AS cuotas_refunded,
    COUNT(*) FILTER (WHERE status = 'CANCELLED')        AS cuotas_canceladas,
    COUNT(*) FILTER (WHERE status = 'EXPIRED')          AS cuotas_expired,
    COUNT(*) FILTER (WHERE status = 'APPROVED')         AS cuotas_approved,
    COUNT(*) FILTER (WHERE status = 'WAITING_PAYMENT')  AS cuotas_waiting,
    COUNT(*) FILTER (WHERE status = 'CHARGEBACK')       AS cuotas_chargeback,
    COUNT(*)                                            AS cuotas_total_detectadas,

    COALESCE(SUM(price_value)        FILTER (WHERE status = 'COMPLETE'), 0) AS bruto_cobrado,
    COALESCE(SUM(hotmart_fee_total)  FILTER (WHERE status = 'COMPLETE'), 0) AS comision_total,
    COALESCE(SUM(price_value - COALESCE(hotmart_fee_total, 0)) FILTER (WHERE status = 'COMPLETE'), 0) AS cash_collected,
    COALESCE(SUM(price_value)        FILTER (WHERE status = 'REFUNDED'), 0) AS importe_reembolsado,
    COALESCE(SUM(price_value)        FILTER (WHERE status = 'OVERDUE'),  0) AS importe_overdue,
    COALESCE(SUM(price_value)        FILTER (WHERE status = 'APPROVED'), 0) AS importe_pendiente_aprobacion,

    MIN(approved_date) FILTER (WHERE status IN ('COMPLETE','APPROVED','REFUNDED','OVERDUE')) AS fecha_compra_inicial,
    MAX(approved_date) FILTER (WHERE status = 'COMPLETE')                                    AS ultimo_pago_at,
    MAX(approved_date) FILTER (WHERE status = 'REFUNDED')                                    AS fecha_reembolso,
    MIN(order_date)    FILTER (WHERE status = 'OVERDUE')                                     AS primer_overdue_at
  FROM deduped
  GROUP BY buyer_ucode, offer_code
)
SELECT
  buyer_ucode,
  offer_code,
  buyer_email,
  buyer_name,
  currency,
  installments_total,
  payment_mode,
  payment_method,

  cuotas_pagadas,
  cuotas_overdue,
  cuotas_refunded,
  cuotas_canceladas,
  cuotas_expired,
  cuotas_approved,
  cuotas_waiting,
  cuotas_chargeback,
  cuotas_total_detectadas,

  bruto_cobrado,
  comision_total,
  cash_collected,
  importe_reembolsado,
  importe_overdue,
  importe_pendiente_aprobacion,
  bruto_cobrado - importe_reembolsado AS net_revenue,

  fecha_compra_inicial,
  ultimo_pago_at,
  fecha_reembolso,
  primer_overdue_at,
  TO_CHAR(fecha_compra_inicial, 'YYYY-MM') AS cohort,
  CASE
    WHEN primer_overdue_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (NOW() - primer_overdue_at)) / 86400
    ELSE NULL
  END::int AS dias_overdue,

  CASE
    WHEN cuotas_refunded > 0 AND cuotas_pagadas = 0                       THEN 'REEMBOLSADA'
    WHEN cuotas_refunded > 0 AND cuotas_pagadas > 0                       THEN 'REEMBOLSADA_PARCIAL'
    WHEN cuotas_pagadas > 0 AND cuotas_overdue > 0                        THEN 'ACTIVA_CON_RETRASO'
    WHEN cuotas_pagadas > 0 AND cuotas_pagadas < installments_total       THEN 'ACTIVA'
    WHEN cuotas_pagadas >= COALESCE(installments_total, 1)                THEN 'COMPLETADA'
    WHEN cuotas_pagadas = 0 AND cuotas_approved > 0                       THEN 'PENDIENTE_APROBACION'
    WHEN cuotas_pagadas = 0 AND (cuotas_canceladas > 0 OR cuotas_expired > 0) THEN 'CANCELADA'
    ELSE 'OTRO'
  END AS status_orden,

  NOW() AS computed_at
FROM base;

CREATE UNIQUE INDEX idx_orders_metrics_pk    ON public.client_orders_metrics (buyer_ucode, offer_code);
CREATE INDEX        idx_orders_metrics_email   ON public.client_orders_metrics (lower(buyer_email));
CREATE INDEX        idx_orders_metrics_status  ON public.client_orders_metrics (status_orden);
CREATE INDEX        idx_orders_metrics_cohort  ON public.client_orders_metrics (cohort);
CREATE INDEX        idx_orders_metrics_overdue ON public.client_orders_metrics (dias_overdue) WHERE dias_overdue IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_client_orders_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.client_orders_metrics;
END;
$$;
