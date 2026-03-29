import { createClient } from "@/lib/supabase/server"
import { CotizacionesClient } from "./cotizaciones-client"

export const metadata = {
  title: "Cotizaciones | ASERTIVA Cotizador",
}

export default async function CotizacionesPage() {
  try {
    const supabase = await createClient()
    const { data: cotizaciones, error } = await supabase
      .from("cotizaciones")
      .select("*, cotizacion_items(*)")
      .order("created_at", { ascending: false })

    if (error) console.error("Error cargando cotizaciones:", error)

    return <CotizacionesClient initialCotizaciones={cotizaciones ?? []} />
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800 mb-2">Error al cargar cotizaciones</h2>
          <pre className="text-xs text-red-700 whitespace-pre-wrap">{message}</pre>
        </div>
      </div>
    )
  }
}
