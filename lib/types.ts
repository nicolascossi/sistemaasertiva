export interface Producto {
  id: number
  cod_artic: string
  descrip: string
  desc_adic: string | null
  marca: string | null
  lista: number
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: number
  cod_client: string
  razon_soci: string
  domicilio: string | null
  localidad: string | null
  c_postali: string | null
  dentiftri: string | null
  forma_pago: string | null
  created_at: string
  updated_at: string
}

export interface CotizacionItem {
  id?: number
  cotizacion_id?: number
  cod_artic: string
  descrip: string
  desc_adic: string | null
  marca: string | null
  cantidad: number
  precio_unitario: number
  precio_total: number
}

export type CotizacionEstado = "borrador" | "enviada" | "aceptada" | "rechazada"

export interface Cotizacion {
  id: number
  numero: string
  cod_client: string
  razon_soci: string
  fecha: string
  total: number
  estado: CotizacionEstado
  observaciones: string | null
  forma_pago: string | null
  atte: string | null
  expte: string | null
  created_at: string
  updated_at: string
  cotizacion_items?: CotizacionItem[]
}

export interface EmpresaConfig {
  id: number
  nombre: string
  cuit: string | null
  domicilio: string | null
  localidad: string | null
  telefono: string | null
  whatsapp: string | null
  email: string | null
  web: string | null
  iibb: string | null
  inicio_actividad: string | null
  condicion_iva: string | null
}
