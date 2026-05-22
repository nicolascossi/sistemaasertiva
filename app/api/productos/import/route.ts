import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    const supabase = await createClient()

    // Convierte precios en formato argentino: "$ 114.689,15" → 114689.15
    function parsePrecio(raw: string): number {
      const cleaned = raw
        .replace(/\$/g, "")   // quita el signo $
        .replace(/\s/g, "")   // quita espacios
        .replace(/\./g, "")   // quita puntos (separador de miles)
        .replace(",", ".")    // reemplaza coma decimal por punto
      return parseFloat(cleaned) || 0
    }

    const records = rows.map((r: Record<string, string>) => ({
      cod_artic: String(r["COD_ARTIC"] ?? r["cod_artic"] ?? "").trim(),
      descrip: String(r["DESCRIP"] ?? r["descrip"] ?? "").trim(),
      desc_adic: (r["DESC_ADIC"] ?? r["desc_adic"] ?? "").trim() || null,
      marca: (r["MARCA"] ?? r["marca"] ?? "").trim() || null,
      lista: parsePrecio(String(r["PRECIO"] ?? r["precio"] ?? r["LISTA"] ?? r["lista"] ?? "0")),
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
