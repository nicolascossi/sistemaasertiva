"use client"

import { useState, useEffect, useRef } from "react"
import type { Cotizacion, CotizacionItem, CotizacionEstado, Cliente, Producto, EmpresaConfig } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Download, Pencil, Check, X, Search, Loader2, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Props {
  cotizacion: Cotizacion | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onUpdated: () => void
  onEstadoChanged: (id: number, estado: CotizacionEstado) => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const ESTADOS: { value: CotizacionEstado; label: string; className: string }[] = [
  { value: "borrador",  label: "Borrador",  className: "bg-gray-100 text-gray-600 border-gray-200" },
  { value: "enviada",   label: "Enviada",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "aceptada",  label: "Aceptada",  className: "bg-green-50 text-green-700 border-green-200" },
  { value: "rechazada", label: "Rechazada", className: "bg-red-50 text-red-600 border-red-200" },
]

export function CotizacionDetailDialog({ cotizacion, open, onOpenChange, onUpdated, onEstadoChanged }: Props) {
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<(CotizacionItem & { tempId: string })[]>([])
  const [observaciones, setObservaciones] = useState("")
  const [formaPago, setFormaPago] = useState("")
  const [atte, setAtte] = useState("")
  const [expte, setExpte] = useState("")
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [estadoLoading, setEstadoLoading] = useState(false)
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false)
  const estadoRef = useRef<HTMLDivElement>(null)

  // Producto search
  const [productoQuery, setProductoQuery] = useState("")
  const [productoSuggestions, setProductoSuggestions] = useState<Producto[]>([])
  const [productoLoading, setProductoLoading] = useState(false)
  const [showProductoSugg, setShowProductoSugg] = useState(false)
  const productoRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Buscar productos con debounce
  useEffect(() => {
    if (productoQuery.length < 1) { setProductoSuggestions([]); return }
    const t = setTimeout(async () => {
      setProductoLoading(true)
      const { data } = await supabase
        .from("productos")
        .select("*")
        .or(`cod_artic.ilike.%${productoQuery}%,descrip.ilike.%${productoQuery}%`)
        .limit(10)
      setProductoSuggestions(data ?? [])
      setShowProductoSugg(true)
      setProductoLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [productoQuery])

  // Cerrar dropdowns al click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (productoRef.current && !productoRef.current.contains(e.target as Node)) {
        setShowProductoSugg(false)
      }
      if (estadoRef.current && !estadoRef.current.contains(e.target as Node)) {
        setEstadoDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function selectProducto(p: Producto) {
    const existe = items.find((i) => i.cod_artic === p.cod_artic)
    if (existe) {
      setItems((prev) =>
        prev.map((i) =>
          i.cod_artic === p.cod_artic
            ? { ...i, cantidad: i.cantidad + 1, precio_total: parseFloat(((i.cantidad + 1) * i.precio_unitario).toFixed(2)) }
            : i
        )
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          tempId: `new-${Date.now()}-${Math.random()}`,
          cod_artic: p.cod_artic,
          descrip: p.descrip,
          desc_adic: p.desc_adic,
          marca: p.marca,
          cantidad: 1,
          precio_unitario: p.lista,
          precio_total: p.lista,
        },
      ])
    }
    setProductoQuery("")
    setProductoSuggestions([])
    setShowProductoSugg(false)
  }

  function initEdit() {
    if (!cotizacion) return
    setItems(
      (cotizacion.cotizacion_items ?? []).map((i) => ({
        ...i,
        tempId: String(i.id ?? Math.random()),
      }))
    )
    setObservaciones(cotizacion.observaciones ?? "")
    setFormaPago(cotizacion.forma_pago ?? "")
    setAtte(cotizacion.atte ?? "")
    setExpte(cotizacion.expte ?? "")
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setProductoQuery("")
    setProductoSuggestions([])
  }

  function updateCantidad(tempId: string, cantidad: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.tempId === tempId
          ? { ...i, cantidad, precio_total: parseFloat((cantidad * i.precio_unitario).toFixed(2)) }
          : i
      )
    )
  }

  function updatePrecio(tempId: string, precio_unitario: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.tempId === tempId
          ? { ...i, precio_unitario, precio_total: parseFloat((i.cantidad * precio_unitario).toFixed(2)) }
          : i
      )
    )
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  const total = items.reduce((acc, i) => acc + i.precio_total, 0)

  async function handleGuardar() {
    if (!cotizacion) return
    setSaving(true)
    try {
      await supabase
        .from("cotizaciones")
        .update({ total, observaciones: observaciones || null, forma_pago: formaPago || null, atte: atte || null, expte: expte || null })
        .eq("id", cotizacion.id)

      await supabase.from("cotizacion_items").delete().eq("cotizacion_id", cotizacion.id)

      if (items.length > 0) {
        await supabase.from("cotizacion_items").insert(
          items.map((i) => ({
            cotizacion_id: cotizacion.id,
            cod_artic: i.cod_artic,
            descrip: i.descrip,
            desc_adic: i.desc_adic,
            marca: i.marca,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            precio_total: i.precio_total,
          }))
        )
      }

      setEditing(false)
      onUpdated()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleCambiarEstado(nuevoEstado: CotizacionEstado) {
    if (!cotizacion) return
    setEstadoLoading(true)
    setEstadoDropdownOpen(false)
    try {
      await supabase
        .from("cotizaciones")
        .update({ estado: nuevoEstado })
        .eq("id", cotizacion.id)
      onEstadoChanged(cotizacion.id, nuevoEstado)
    } catch (err) {
      console.error(err)
    } finally {
      setEstadoLoading(false)
    }
  }

  async function handleDownload() {
    if (!cotizacion) return
    setDownloading(true)
    try {
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("*")
        .eq("cod_client", cotizacion.cod_client)
        .single()

      const { data: empresaData } = await supabase
        .from("empresa_config")
        .select("*")
        .limit(1)
        .single()

      const cotizacionParaPDF: Cotizacion = editing
        ? { ...cotizacion, total, observaciones: observaciones || null, forma_pago: formaPago || null, atte: atte || null, expte: expte || null, cotizacion_items: items }
        : cotizacion

      const { generarCotizacionPDF } = await import("@/lib/generate-cotizacion-pdf")
      await generarCotizacionPDF(cotizacionParaPDF, clienteData as Cliente | null, empresaData as EmpresaConfig | null)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(false)
    }
  }

  if (!cotizacion) return null

  const estadoActual = cotizacion.estado ?? "borrador"
  const estadoCfg = ESTADOS.find((e) => e.value === estadoActual) ?? ESTADOS[0]
  const displayItems = editing ? items : (cotizacion.cotizacion_items ?? [])
  const displayTotal = editing ? total : cotizacion.total

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEditing(false) }}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white p-0 gap-0"
        style={{ width: "90vw", maxWidth: "90vw" }}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-start justify-between border-b border-border px-6 py-4 space-y-0">
          <div>
            <DialogTitle className="text-base font-bold text-foreground font-mono">
              {String(cotizacion.numero).padStart(5, "0")}
            </DialogTitle>
            <p className="text-sm text-foreground font-medium mt-0.5">{cotizacion.razon_soci}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cotizacion.cod_client} · {formatDate(cotizacion.fecha)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap justify-end">
            {/* Selector de estado */}
            <div ref={estadoRef} className="relative">
              <button
                onClick={() => setEstadoDropdownOpen((v) => !v)}
                disabled={estadoLoading}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  estadoCfg.className,
                  "hover:opacity-80"
                )}
              >
                {estadoLoading
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : estadoCfg.label
                }
                <ChevronDown className="h-3 w-3" />
              </button>
              {estadoDropdownOpen && (
                <div className="absolute right-0 z-50 mt-1 w-36 rounded-md border border-border bg-white shadow-lg">
                  {ESTADOS.map((e) => (
                    <button
                      key={e.value}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted",
                        estadoActual === e.value && "bg-muted"
                      )}
                      onClick={() => handleCambiarEstado(e.value)}
                    >
                      <span className={cn("inline-block w-2 h-2 rounded-full border", e.className)} />
                      {e.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-border"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generando...</>
                    : <><Download className="h-3.5 w-3.5" />Descargar PDF</>
                  }
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90"
                  onClick={initEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-border"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90"
                  onClick={handleGuardar}
                  disabled={saving}
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Guardando...</>
                    : <><Check className="h-3.5 w-3.5" />Guardar cambios</>
                  }
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Buscador de productos — solo en modo edición */}
          {editing && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agregar Artículo
              </Label>
              <div ref={productoRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  {productoLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  <Input
                    placeholder="Buscar por código o descripción..."
                    value={productoQuery}
                    onChange={(e) => setProductoQuery(e.target.value)}
                    onFocus={() => productoSuggestions.length > 0 && setShowProductoSugg(true)}
                    className="pl-9 pr-9 bg-white border-border text-sm"
                  />
                </div>
                {showProductoSugg && productoSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-lg max-h-60 overflow-y-auto">
                    {productoSuggestions.map((p) => (
                      <button
                        key={p.cod_artic}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
                        onMouseDown={(e) => { e.preventDefault(); selectProducto(p) }}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground shrink-0">{p.cod_artic}</span>
                            <span className="text-sm font-medium text-foreground truncate">{p.descrip}</span>
                            {p.marca && <span className="text-sm font-medium text-foreground shrink-0">{p.marca}</span>}
                            {p.desc_adic && <span className="text-xs text-muted-foreground shrink-0">{p.desc_adic}</span>}
                          </div>
                          <span className="text-sm font-semibold text-foreground shrink-0">
                            {formatCurrency(p.lista)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabla artículos */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Artículos</p>
            <div className="rounded-md border border-border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_2fr_1fr_1fr_100px_140px_140px_48px] bg-muted/50 border-b border-border">
                {["Código de Artículo", "Artículo", "Marca", "Código", "Cantidad", "Precio Unit.", "Total", ""].map((h) => (
                  <div key={h} className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </div>
                ))}
              </div>

              {displayItems.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Sin artículos</div>
              ) : (
                displayItems.map((item) => {
                  const ti = item as CotizacionItem & { tempId?: string }
                  const key = ti.tempId ?? String(item.id)
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_2fr_1fr_1fr_100px_140px_140px_48px] border-b border-border last:border-0 items-center"
                    >
                      <div className="px-4 py-3 min-w-0">
                        <span className="text-sm text-muted-foreground">{item.cod_artic}</span>
                      </div>
                      <div className="px-4 py-3 min-w-0">
                        <span className="text-sm font-medium text-foreground">{item.descrip}</span>
                      </div>
                      <div className="px-4 py-3 min-w-0">
                        <span className="text-sm font-medium text-foreground">{item.marca ?? "—"}</span>
                      </div>
                      <div className="px-4 py-3 min-w-0">
                        <span className="text-sm text-muted-foreground">{item.desc_adic ?? "—"}</span>
                      </div>
                      <div className="px-4 py-3">
                        {editing ? (
                          <Input
                            type="number"
                            min={1}
                            value={(item as CotizacionItem & { tempId: string }).cantidad}
                            onChange={(e) => updateCantidad(ti.tempId!, Number(e.target.value))}
                            className="h-8 text-center bg-white border-border text-sm w-full"
                          />
                        ) : (
                          <span className="text-sm text-foreground text-center block">{item.cantidad}</span>
                        )}
                      </div>
                      <div className="px-4 py-3">
                        {editing ? (
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={(item as CotizacionItem & { tempId: string }).precio_unitario}
                            onChange={(e) => updatePrecio(ti.tempId!, Number(e.target.value))}
                            className="h-8 text-right bg-white border-border text-sm w-full"
                          />
                        ) : (
                          <span className="text-sm text-foreground text-right block">{formatCurrency(item.precio_unitario)}</span>
                        )}
                      </div>
                      <div className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(item.precio_total)}</span>
                      </div>
                      <div className="px-4 py-3 flex justify-center">
                        {editing && (
                          <button
                            onClick={() => removeItem(ti.tempId!)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Total row */}
              <div className="grid grid-cols-[1fr_2fr_1fr_1fr_100px_140px_140px_48px] bg-muted/30 border-t-2 border-border">
                <div className="px-4 py-3 col-span-6 text-sm font-semibold text-foreground text-right">Total</div>
                <div className="px-4 py-3 text-right">
                  <span className="text-base font-bold text-foreground">{formatCurrency(displayTotal)}</span>
                </div>
                <div />
              </div>
            </div>
          </div>

          {/* Atte + Expte + Forma de Pago + Observaciones */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Atte</p>
              {editing ? (
                <Input
                  value={atte}
                  onChange={(e) => setAtte(e.target.value)}
                  placeholder="Ej: Lic. García..."
                  className="bg-white border-border text-sm"
                />
              ) : (
                <p className="text-sm text-foreground bg-muted/30 rounded-md border border-border px-3 py-2 min-h-[36px]">
                  {cotizacion.atte ?? <span className="text-muted-foreground italic">Sin especificar</span>}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expediente</p>
              {editing ? (
                <Input
                  value={expte}
                  onChange={(e) => setExpte(e.target.value)}
                  placeholder="Ej: EX-2024-001..."
                  className="bg-white border-border text-sm"
                />
              ) : (
                <p className="text-sm text-foreground bg-muted/30 rounded-md border border-border px-3 py-2 min-h-[36px]">
                  {cotizacion.expte ?? <span className="text-muted-foreground italic">Sin especificar</span>}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Forma de Pago</p>
              {editing ? (
                <Input
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  placeholder="Ej: Cuenta corriente 30 días..."
                  className="bg-white border-border text-sm"
                />
              ) : (
                <p className="text-sm text-foreground bg-muted/30 rounded-md border border-border px-3 py-2 min-h-[36px]">
                  {cotizacion.forma_pago ?? <span className="text-muted-foreground italic">Sin especificar</span>}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Observaciones</p>
              {editing ? (
                <Input
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Condiciones, validez, entrega..."
                  className="bg-white border-border text-sm"
                />
              ) : (
                <p className="text-sm text-foreground bg-muted/30 rounded-md border border-border px-3 py-2 min-h-[36px]">
                  {cotizacion.observaciones ?? <span className="text-muted-foreground italic">Sin observaciones</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
