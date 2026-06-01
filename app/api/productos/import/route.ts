import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    const supabase = await createClient()

    // Convierte precios en cualquier formato numérico al valor correcto
    // Soporta: "$ 17.445,78" → 17445.78 | "17445.78" → 17445.78 | "17445,78" → 17445.78
    function parsePrecio(raw: string): number {
      let s = raw.replace(/\$/g, "").replace(/\s/g, "").trim()
      const hasDot   = s.includes(".")
      const hasComma = s.includes(",")

      if (hasDot && hasComma) {
        // Formato argentino: 17.445,78 → puntos=miles, coma=decimal
        s = s.replace(/\./g, "").replace(",", ".")
      } else if (hasDot && !hasComma) {
        // Si el punto separa exactamente 3 dígitos al final es miles (1.234), sino es decimal (17445.78)
        s = /\.\d{3}$/.test(s) ? s.replace(/\./g, "") : s
      } else if (!hasDot && hasComma) {
        // Coma como decimal: 17445,78
        s = s.replace(",", ".")
      }

      return parseFloat(s) || 0
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
