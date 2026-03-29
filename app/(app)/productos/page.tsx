import { createClient } from "@/lib/supabase/server"
import { ProductosClient } from "./productos-client"

export const metadata = {
  title: "Productos | ASERTIVA Cotizador",
}

export default async function ProductosPage() {
  try {
    const supabase = await createClient()
    const { data: productos, error } = await supabase
      .from("productos")
      .select("*")
      .order("cod_artic", { ascending: true })

    return <ProductosClient initialData={productos ?? []} error={error?.message} />
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800 mb-2">Error al cargar productos</h2>
          <pre className="text-xs text-red-700 whitespace-pre-wrap">{message}</pre>
        </div>
      </div>
    )
  }
}
