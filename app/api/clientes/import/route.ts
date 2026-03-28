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
      cod_client: r["COD_CLIENT"] ?? r["cod_client"] ?? "",
      razon_soci: r["RAZON_SOCI"] ?? r["razon_soci"] ?? "",
      domicilio: r["DOMICILIO"] ?? r["domicilio"] ?? null,
      localidad: r["LOCALIDAD"] ?? r["localidad"] ?? null,
      c_postali: r["C_POSTALI"] ?? r["c_postali"] ?? null,
      dentiftri: r["DENTIFTRI"] ?? r["dentiftri"] ?? null,
    })).filter((r) => r.cod_client && r.razon_soci)

    const { error, count } = await supabase
      .from("clientes")
      .upsert(records, { onConflict: "cod_client", count: "exact" })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ imported: count ?? records.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
