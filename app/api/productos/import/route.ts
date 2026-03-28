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
      cod_artic: r["COD_ARTIC"] ?? r["cod_artic"] ?? "",
      descrip: r["DESCRIP"] ?? r["descrip"] ?? "",
      desc_adic: r["DESC_ADIC"] ?? r["desc_adic"] ?? null,
      marca: r["MARCA"] ?? r["marca"] ?? null,
      lista: parseFloat((r["LISTA"] ?? r["lista"] ?? "0").replace(",", ".")) || 0,
    })).filter((r) => r.cod_artic && r.descrip)

    // Borrar todos los productos existentes antes de importar la nueva lista
    const { error: deleteError } = await supabase
      .from("productos")
      .delete()
      .neq("id", 0)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const { error, count } = await supabase
      .from("productos")
      .insert(records, { count: "exact" })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ imported: count ?? records.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
