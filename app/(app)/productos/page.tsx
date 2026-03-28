import { createClient } from "@/lib/supabase/server"
import { ProductosClient } from "./productos-client"

export const metadata = {
  title: "Productos | ASERTIVA Cotizador",
}

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data: productos, error } = await supabase
    .from("productos")
    .select("*")
    .order("cod_artic", { ascending: true })

  return <ProductosClient initialData={productos ?? []} error={error?.message} />
}
