import { createClient } from "@/lib/supabase/server"
import { ClientesClient } from "./clientes-client"

export const metadata = {
  title: "Clientes | ASERTIVA Cotizador",
}

export default async function ClientesPage() {
  try {
    const supabase = await createClient()
    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("*")
      .order("razon_soci", { ascending: true })

    return <ClientesClient initialData={clientes ?? []} error={error?.message} />
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800 mb-2">Error al cargar clientes</h2>
          <pre className="text-xs text-red-700 whitespace-pre-wrap">{message}</pre>
        </div>
      </div>
    )
  }
}
