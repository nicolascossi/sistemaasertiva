import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: cotizaciones },
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

  return (
    <DashboardClient
      cotizaciones={cotizaciones ?? []}
      totalClientes={totalClientes ?? 0}
      totalProductos={totalProductos ?? 0}
    />
  )
}
