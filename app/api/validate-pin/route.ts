import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { pin, type } = await req.json()

  if (!pin || !type) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  let expected: string | undefined

  if (type === "edicion") {
    expected = process.env.PIN_EDICION
  } else if (type === "importar") {
    expected = process.env.PIN_IMPORTAR
  }

  if (!expected) {
    return NextResponse.json({ valid: false, error: "PIN no configurado en el servidor" }, { status: 500 })
  }

  return NextResponse.json({ valid: pin === expected })
}
