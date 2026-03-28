-- Productos (artículos de la droguería)
CREATE TABLE IF NOT EXISTS public.productos (
  id BIGSERIAL PRIMARY KEY,
  cod_artic TEXT NOT NULL UNIQUE,
  descrip TEXT NOT NULL,
  desc_adic TEXT,
  marca TEXT,
  lista NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "productos_select_all" ON public.productos FOR SELECT USING (true);
CREATE POLICY "productos_insert_all" ON public.productos FOR INSERT WITH CHECK (true);
CREATE POLICY "productos_update_all" ON public.productos FOR UPDATE USING (true);
CREATE POLICY "productos_delete_all" ON public.productos FOR DELETE USING (true);

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id BIGSERIAL PRIMARY KEY,
  cod_client TEXT NOT NULL UNIQUE,
  razon_soci TEXT NOT NULL,
  domicilio TEXT,
  localidad TEXT,
  c_postali TEXT,
  dentiftri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_all" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "clientes_insert_all" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "clientes_update_all" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "clientes_delete_all" ON public.clientes FOR DELETE USING (true);

-- Trigger para updated_at en productos
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_updated_at ON public.productos;
CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS clientes_updated_at ON public.clientes;
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
