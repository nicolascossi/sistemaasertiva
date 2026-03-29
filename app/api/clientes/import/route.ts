import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    const supabase = await createClient()

    const records = rows.map((r: Record<string, string>) => ({
      // Formato Tango ("Nomina Nico.xlsx"): Codigo, Razon social, Domicilio, Localidad, Codigo postal, Nro. de documento
      // Formato generico: COD_CLIENT, RAZON_SOCI, DOMICILIO, LOCALIDAD, C_POSTALI, DENTIFTRI
      cod_client: String(r["CODIGO"] ?? r["COD_CLIENT"] ?? r["cod_client"] ?? "").trim(),
      razon_soci: (r["RAZON SOCIAL"] ?? r["RAZON_SOCI"] ?? r["razon_soci"] ?? "").trim(),
      domicilio:  (r["DOMICILIO"] ?? r["domicilio"] ?? "").trim() || null,
      localidad:  (r["LOCALIDAD"] ?? r["localidad"] ?? "").trim() || null,
      c_postali:  (r["CODIGO POSTAL"] ?? r["C_POSTALI"] ?? r["c_postali"] ?? "").trim() || null,
      dentiftri:  (r["NRO. DE DOCUMENTO"] ?? r["DENTIFTRI"] ?? r["dentiftri"] ?? "").trim() || null,
    })).filter((r) => r.cod_client && r.razon_soci)

    if (records.length === 0) {
      return NextResponse.json({ error: "No se encontraron filas válidas (se necesitan columnas CODIGO y RAZON SOCIAL)" }, { status: 400 })
    }

    // Reemplazar todo: borrar todos los clientes e insertar los nuevos
    const { error: deleteError } = await supabase.from("clientes").delete().neq("id", 0)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const { error: insertError } = await supabase.from("clientes").insert(records)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ imported: records.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
