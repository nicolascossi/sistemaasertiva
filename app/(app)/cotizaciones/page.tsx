import { createClient } from "@/lib/supabase/server"
import { CotizacionesClient } from "./cotizaciones-client"

export const metadata = {
  title: "Cotizaciones | ASERTIVA Cotizador",
}

export default async function CotizacionesPage() {
  const supabase = await createClient()
  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("*, cotizacion_items(*)")
    .order("created_at", { ascending: false })

  return <CotizacionesClient initialCotizaciones={cotizaciones ?? []} />
}
