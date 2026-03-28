import type { Cotizacion, Cliente, EmpresaConfig } from "@/lib/types"

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = reject
    img.src = url
  })
}

export async function generarCotizacionPDF(
  cotizacion: Cotizacion,
  cliente: Cliente | null,
  empresa?: EmpresaConfig | null
) {
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageW = doc.internal.pageSize.getWidth()   // 210 mm
  const pageH = doc.internal.pageSize.getHeight()  // 297 mm
  const margin = 10
  const pink: [number, number, number] = [220, 20, 130]
  const darkGray: [number, number, number] = [50, 50, 50]
  const lightGray: [number, number, number] = [245, 245, 245]
  const borderGray: [number, number, number] = [200, 200, 200]

  // Datos de empresa (fallback a valores por defecto si no hay config)
  const nombreEmpresa = empresa?.nombre ?? "Asertiva S.A."
  const domicilioEmpresa = empresa?.domicilio ?? "Av. Colon 1450"
  const localidadEmpresa = empresa?.localidad ?? "Bahia Blanca, Pcia de Bs. As."
  const telefonoEmpresa = empresa?.telefono ?? ""
  const whatsappEmpresa = empresa?.whatsapp ?? ""
  const emailEmpresa = empresa?.email ?? ""
  const webEmpresa = empresa?.web ?? ""
  const cuitEmpresa = empresa?.cuit ?? ""
  const iibbEmpresa = empresa?.iibb ?? ""
  const inicioActividad = empresa?.inicio_actividad ?? ""
  const condicionIva = empresa?.condicion_iva ?? "IVA Responsable Inscripto"

  // ─── LOGO ────────────────────────────────────────────────────────────────
  try {
    const logoBase64 = await loadImageAsBase64("/logo-asertiva.png")
    doc.addImage(logoBase64, "PNG", margin, margin, 45, 27)
  } catch {
    // Logo no disponible, continua sin él
  }

  // ─── ENCABEZADO: datos empresa (columna central) ─────────────────────────
  const colCenter = 60
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...darkGray)
  doc.text(nombreEmpresa, colCenter, 16)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...darkGray)
  doc.text(`${domicilioEmpresa}, ${localidadEmpresa}`, colCenter, 21)
  if (telefonoEmpresa) doc.text(`Tel: ${telefonoEmpresa}`, colCenter, 25.5)
  if (whatsappEmpresa) {
    doc.setFont("helvetica", "bold")
    doc.text("WhatsApp:", colCenter, 30)
    doc.setFont("helvetica", "normal")
    doc.text(` ${whatsappEmpresa}`, colCenter + 16, 30)
  }
  if (emailEmpresa) {
    doc.setFont("helvetica", "bold")
    doc.text("Mail:", colCenter, 34.5)
    doc.setFont("helvetica", "normal")
    doc.text(` ${emailEmpresa}`, colCenter + 8, 34.5)
  }
  if (webEmpresa) {
    doc.setTextColor(...pink)
    doc.text(webEmpresa, colCenter, 39)
    doc.setTextColor(...darkGray)
  }

  // ─── ENCABEZADO: datos empresa (columna derecha) ─────────────────────────
  const colRight = 135
  const rightEdge = pageW - margin   // 200
  const labelW = rightEdge - colRight

  doc.setFontSize(8)

  // Fecha
  doc.setFont("helvetica", "bold")
  doc.text("Fecha:", colRight, 16)
  doc.setTextColor(...pink)
  doc.text(formatDate(cotizacion.fecha), rightEdge, 16, { align: "right" })
  doc.setTextColor(...darkGray)

  // N° Cotización
  doc.setFont("helvetica", "bold")
  doc.text("N° Cotización:", colRight, 21)
  doc.setFont("helvetica", "normal")
  doc.text(cotizacion.numero, rightEdge, 21, { align: "right" })

  // CUIT
  if (cuitEmpresa) {
    doc.setFont("helvetica", "bold")
    doc.text("Cuit:", colRight, 25.5)
    doc.setFont("helvetica", "normal")
    doc.text(cuitEmpresa, rightEdge, 25.5, { align: "right" })
  }

  // IIBB
  if (iibbEmpresa) {
    doc.setFont("helvetica", "bold")
    doc.text("Ingresos Brutos", colRight, 30)
    doc.setFont("helvetica", "normal")
    doc.text(iibbEmpresa, rightEdge, 30, { align: "right" })
  }

  // Inicio de actividades
  if (inicioActividad) {
    doc.setFont("helvetica", "bold")
    doc.text("Inicio de Actividades", colRight, 34.5)
    doc.setFont("helvetica", "normal")
    doc.text(inicioActividad, rightEdge, 34.5, { align: "right" })
  }

  // IVA
  doc.setFont("helvetica", "bold")
  doc.text(condicionIva, colRight, 39)

  // ─── SEPARADOR ───────────────────────────────────────────────────────────
  doc.setDrawColor(...borderGray)
  doc.setLineWidth(0.4)
  doc.line(margin, 43, pageW - margin, 43)

  // ─── BLOQUE CLIENTE ──────────────────────────────────────────────────────
  const clienteY = 45
  const clienteH = 30
  doc.setDrawColor(...pink)
  doc.setLineWidth(0.8)
  doc.rect(margin, clienteY, pageW - margin * 2, clienteH)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...darkGray)

  const cl = cliente
  const labelX = margin + 3
  const valueX = margin + 22

  // Fila 1: Cliente
  const codClient = cl?.cod_client ?? cotizacion.cod_client
  const razonSoci = cl?.razon_soci ?? cotizacion.razon_soci
  doc.setFont("helvetica", "normal")
  doc.text("Cliente:", labelX, clienteY + 6)
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.setFont("helvetica", "normal")
  doc.text(`(${codClient})`, valueX, clienteY + 6)
  const codWidth = doc.getTextWidth(`(${codClient})`)
  doc.setTextColor(...darkGray)
  doc.setFont("helvetica", "bold")
  doc.text(razonSoci, valueX + codWidth + 2, clienteY + 6)

  // Fila 2: Dirección
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...darkGray)
  doc.text("Direccion:", labelX, clienteY + 13)
  doc.setFont("helvetica", "bold")
  const domicilio = cl?.domicilio ?? ""
  const localidad = cl?.localidad ?? ""
  const direccionCompleta = localidad ? `${domicilio}, ${localidad}` : domicilio
  doc.text(direccionCompleta, valueX, clienteY + 13)
  doc.setFont("helvetica", "normal")
  doc.text("Cod.Postal:", pageW - margin - 30, clienteY + 13)
  doc.setFont("helvetica", "bold")
  doc.text(cl?.c_postali ?? "", rightEdge, clienteY + 13, { align: "right" })

  // Fila 3: CUIT cliente
  doc.setFont("helvetica", "normal")
  doc.text("CUIT:", labelX, clienteY + 20)
  doc.setFont("helvetica", "bold")
  doc.text(cl?.dentiftri ?? "", valueX, clienteY + 20)
  doc.setFont("helvetica", "normal")
  doc.text("Atte:", valueX + 75, clienteY + 20)

  // Fila 4: Entrega
  doc.setFont("helvetica", "normal")
  doc.text("Entrega:", labelX, clienteY + 27)
  doc.setFont("helvetica", "bold")
  doc.text(formatDate(cotizacion.fecha), valueX, clienteY + 27)
  doc.setFont("helvetica", "normal")
  doc.text("Expte:", valueX + 75, clienteY + 27)

  // ─── TABLA DE PRODUCTOS ───────────────────────────────────────────────────
  const tableStartY = clienteY + clienteH + 5
  const items = cotizacion.cotizacion_items ?? []

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [["Renglon", "Producto", "Descripcion", "Marca", "Codigo", "Cantidad", "Precio Unitario", "Subtotal"]],
    body: items.map((item, idx) => [
      idx + 1,
      item.cod_artic,
      item.descrip,
      item.marca ?? "",
      item.desc_adic ?? "",
      item.cantidad,
      formatCurrency(item.precio_unitario),
      formatCurrency(item.precio_total),
    ]),
    headStyles: {
      fillColor: pink,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      minCellHeight: 8,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: darkGray,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 13 },
      1: { halign: "left",   cellWidth: 27 },
      2: { halign: "left",   cellWidth: "auto" },
      3: { halign: "left",   cellWidth: 22 },
      4: { halign: "left",   cellWidth: 22 },
      5: { halign: "center", cellWidth: 16 },
      6: { halign: "left",   cellWidth: 25 },
      7: { halign: "left",   cellWidth: 27 },
    },
    tableLineColor: borderGray,
    tableLineWidth: 0.2,
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        doc.setDrawColor(...pink)
        doc.setLineWidth(0.6)
        doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height)
        doc.setDrawColor(...borderGray)
        doc.setLineWidth(0.2)
      }
    },
  })

  // ─── PIE: SUBTOTAL / TOTAL / OBSERVACIONES / CONDICIONES ─────────────────
  // @ts-ignore
  const afterTable = (doc as any).lastAutoTable.finalY + 4

  // Nota percepción
  doc.setFont("helvetica", "italic")
  doc.setFontSize(6.5)
  doc.setTextColor(120, 120, 120)
  doc.text("NO incluye PERCEPCION de IB de Buenos Aires", rightEdge, afterTable, { align: "right" })

  // Cajas SubTotal y Total
  const boxW = 65
  const boxH = 10
  const boxX = rightEdge - boxW
  const subTotalY = afterTable + 2
  const totalBoxY = subTotalY + boxH + 2

  // Caja SubTotal
  doc.setDrawColor(...pink)
  doc.setLineWidth(0.8)
  doc.rect(boxX, subTotalY, boxW, boxH)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...darkGray)
  doc.text("SubTotal", boxX + 3, subTotalY + 6.5)
  doc.text("$", boxX + 32, subTotalY + 6.5)
  doc.text(formatCurrency(cotizacion.total).replace("$", "").trim(), rightEdge - 2, subTotalY + 6.5, { align: "right" })

  // Caja Total
  doc.setDrawColor(...pink)
  doc.setLineWidth(0.8)
  doc.rect(boxX, totalBoxY, boxW, boxH)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...darkGray)
  doc.text("Total", boxX + 3, totalBoxY + 6.5)
  doc.text("$", boxX + 32, totalBoxY + 6.5)
  doc.text(formatCurrency(cotizacion.total).replace("$", "").trim(), rightEdge - 2, totalBoxY + 6.5, { align: "right" })

  // Observaciones
  const obsY = totalBoxY + boxH + 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...darkGray)
  doc.text("Observaciones:", margin, obsY)
  doc.setFont("helvetica", "normal")
  if (cotizacion.observaciones) {
    doc.text(cotizacion.observaciones, margin + 32, obsY)
  }

  // Separador
  doc.setDrawColor(...borderGray)
  doc.setLineWidth(0.3)
  doc.line(margin, obsY + 5, pageW - margin, obsY + 5)

  // PRECIOS FINALES
  const condY = obsY + 11
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...darkGray)
  doc.text("PRECIOS FINALES", margin, condY)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text("Forma de Pago:", margin, condY + 7)
  doc.setFont("helvetica", "normal")
  doc.text(cotizacion.forma_pago ?? "CUENTA CORRIENTE 30 DIAS", margin + 28, condY + 7)

  doc.setFont("helvetica", "bold")
  doc.text("Mantenimiento de Oferta:", margin, condY + 14)
  doc.setFont("helvetica", "normal")
  doc.text("10 DIAS", margin + 42, condY + 14)

  doc.setFont("helvetica", "bold")
  doc.text("Plazo de Entrega:", margin, condY + 21)
  doc.setFont("helvetica", "normal")
  doc.text("INMEDIATO LUEGO DE RECIBIDA LA ORDEN DE COMPRA", margin + 30, condY + 21)

  // Envío bonificado
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.text("ENVIO BONIFICADO A PARTIR DE $120.000,00", margin, condY + 29)

  // Gracias / URL
  const graciasY = condY + 39
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...pink)
  doc.text("Gracias por elegirnos!", pageW / 2, graciasY, { align: "center" })

  if (webEmpresa) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(...darkGray)
    doc.text(webEmpresa.toUpperCase(), rightEdge, graciasY, { align: "right" })
  }

  doc.save(`cotizacion-${cotizacion.numero}.pdf`)
}
