import { createClient } from "@/lib/supabase/server"
import { ClientesClient } from "./clientes-client"

export const metadata = {
  title: "Clientes | ASERTIVA Cotizador",
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("*")
    .order("razon_soci", { ascending: true })

  return <ClientesClient initialData={clientes ?? []} error={error?.message} />
}
