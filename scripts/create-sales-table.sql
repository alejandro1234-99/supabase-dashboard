-- Ejecuta esto en Supabase SQL Editor antes de importar

CREATE TABLE IF NOT EXISTS purchase_approved (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id             text UNIQUE NOT NULL,
  nombre_completo         text,
  correo_electronico      text,
  edicion                 text,
  status                  text,
  metodo_pago             text,
  moneda                  text,
  precio                  numeric,
  cash_collected          numeric,
  en_reserva              numeric,
  comision                numeric,
  cuotas_restantes        integer,
  importe_cuotas_futuras  numeric,
  importe_comisiones_futuras numeric,
  fecha_compra            date,
  fecha_reembolso         date,
  date_added              date,
  id_factura              text,
  id_hotmart              text,
  nombre_comercial        text,
  fuente                  text,
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE purchase_approved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON purchase_approved
  FOR ALL TO service_role USING (true) WITH CHECK (true);
