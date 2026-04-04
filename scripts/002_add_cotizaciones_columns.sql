-- Agregar columnas faltantes a cotizaciones
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS atte TEXT,
  ADD COLUMN IF NOT EXISTS expte TEXT,
  ADD COLUMN IF NOT EXISTS forma_pago TEXT,
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Funcion para generar el proximo numero de cotizacion (si no existe)
CREATE OR REPLACE FUNCTION public.get_next_cotizacion_numero()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO next_num FROM public.cotizaciones;
  RETURN next_num;
END;
$$;
