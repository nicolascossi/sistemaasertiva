-- Agregar forma_pago a clientes (se importa desde la columna Descripcion del Excel Tango)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS forma_pago TEXT;
