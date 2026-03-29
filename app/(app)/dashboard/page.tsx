import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
  try {
    const supabase = await createClient()

    const [
      { data: cotizaciones, error: errCot },
      { count: totalClientes },
      { count: totalProductos },
    ] = await Promise.all([
      supabase
        .from("cotizaciones")
        .select("id, numero, razon_soci, cod_client, total, estado, fecha, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("clientes").select("*", { count: "exact", head: true }),
      supabase.from("productos").select("*", { count: "exact", head: true }),
    ])

    if (errCot) {
      console.error("Error cargando cotizaciones:", errCot)
    }

    return (
      <DashboardClient
        cotizaciones={cotizaciones ?? []}
        totalClientes={totalClientes ?? 0}
        totalProductos={totalProductos ?? 0}
      />
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800 mb-2">Error al cargar el dashboard</h2>
          <pre className="text-xs text-red-700 whitespace-pre-wrap">{message}</pre>
          <p className="text-xs text-red-600 mt-3">
            Verificá que las variables <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> estén configuradas en Vercel.
          </p>
        </div>
      </div>
    )
  }
}
