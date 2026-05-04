-- Tabla espejo de Hotmart: 1 fila por transaction.
-- Solo se llena por sync con la API Hotmart. No se edita a mano.

CREATE TABLE IF NOT EXISTS public.hotmart_raw_sales (
  transaction        text PRIMARY KEY,
  buyer_email        text NOT NULL,
  buyer_name         text,
  buyer_ucode        text NOT NULL,
  product_id         bigint,
  product_name       text,
  offer_code         text,
  payment_mode       text,
  installments_total smallint,
  payment_method     text,
  payment_type       text,
  is_subscription    boolean DEFAULT false,
  status             text NOT NULL,
  price_value        numeric(14,2),
  price_currency     text,
  hotmart_fee_total  numeric(14,2),
  approved_date      timestamptz,
  order_date         timestamptz,
  warranty_expire    timestamptz,
  raw_payload        jsonb,
  synced_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotmart_raw_buyer_email ON public.hotmart_raw_sales (lower(buyer_email));
CREATE INDEX IF NOT EXISTS idx_hotmart_raw_buyer_ucode ON public.hotmart_raw_sales (buyer_ucode);
CREATE INDEX IF NOT EXISTS idx_hotmart_raw_offer_date ON public.hotmart_raw_sales (offer_code, approved_date);
CREATE INDEX IF NOT EXISTS idx_hotmart_raw_status ON public.hotmart_raw_sales (status);
CREATE INDEX IF NOT EXISTS idx_hotmart_raw_approved_date ON public.hotmart_raw_sales (approved_date DESC);

-- RLS: solo service_role puede leer/escribir (es tabla operativa, no para clientes)
ALTER TABLE public.hotmart_raw_sales ENABLE ROW LEVEL SECURITY;

-- Admins pueden leer (para el panel)
CREATE POLICY "admins_read_hotmart_raw" ON public.hotmart_raw_sales
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

COMMENT ON TABLE public.hotmart_raw_sales IS 'Espejo crudo de Hotmart sales API. Llave: transaction (HP+dígitos). Cargado por sync periódico + webhook. No se edita a mano.';
