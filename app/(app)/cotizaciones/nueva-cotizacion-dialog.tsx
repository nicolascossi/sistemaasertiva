"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Cliente, Producto, CotizacionItem } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Search, X, Plus, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n)
}

export function NuevaCotizacionDialog({ open, onOpenChange, onCreated }: Props) {
  const supabase = createClient()

  // --- Cliente ---
  const [clienteQuery, setClienteQuery] = useState("")
  const [clienteSuggestions, setClienteSuggestions] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [clienteLoading, setClienteLoading] = useState(false)
  const [showClienteSugg, setShowClienteSugg] = useState(false)

  // --- Producto search ---
  const [productoQuery, setProductoQuery] = useState("")
  const [productoSuggestions, setProductoSuggestions] = useState<Producto[]>([])
  const [productoLoading, setProductoLoading] = useState(false)
  const [showProductoSugg, setShowProductoSugg] = useState(false)

  // --- Items de la cotizacion ---
  const [items, setItems] = useState<(CotizacionItem & { tempId: string })[]>([])

  // --- Obs, forma de pago, atte, expte y estado general ---
  const [observaciones, setObservaciones] = useState("")
  const [formaPago, setFormaPago] = useState("")
  const [atte, setAtte] = useState("")
  const [expte, setExpte] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const clienteRef = useRef<HTMLDivElement>(null)
  const productoRef = useRef<HTMLDivElement>(null)

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setClienteQuery("")
      setClienteSuggestions([])
      setClienteSeleccionado(null)
      setProductoQuery("")
      setProductoSuggestions([])
      setItems([])
      setObservaciones("")
      setFormaPago("")
      setAtte("")
      setExpte("")
      setSaveError(null)
    }
  }, [open])

  // Buscar clientes
  useEffect(() => {
    if (clienteQuery.length < 1) { setClienteSuggestions([]); return }
    const t = setTimeout(async () => {
      setClienteLoading(true)
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .or(`cod_client.ilike.%${clienteQuery}%,razon_soci.ilike.%${clienteQuery}%`)
        .limit(8)
      setClienteSuggestions(data ?? [])
      setShowClienteSugg(true)
      setClienteLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [clienteQuery])

  // Buscar productos
  useEffect(() => {
    if (productoQuery.length < 1) { setProductoSuggestions([]); return }
    const t = setTimeout(async () => {
      setProductoLoading(true)
      const { data } = await supabase
        .from("productos")
        .select("*")
        .or(`cod_artic.ilike.%${productoQuery}%,descrip.ilike.%${productoQuery}%`)
        .limit(100)
      setProductoSuggestions(data ?? [])
      setShowProductoSugg(true)
      setProductoLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [productoQuery])

  // Cerrar dropdowns al hacer click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setShowClienteSugg(false)
      }
      if (productoRef.current && !productoRef.current.contains(e.target as Node)) {
        setShowProductoSugg(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function selectCliente(c: Cliente) {
    setClienteSeleccionado(c)
    setClienteQuery(`${c.cod_client} – ${c.razon_soci}`)
    setShowClienteSugg(false)
  }

  function selectProducto(p: Producto) {
    const existe = items.find((i) => i.cod_artic === p.cod_artic)
    if (existe) {
      setItems((prev) =>
        prev.map((i) =>
          i.cod_artic === p.cod_artic
            ? { ...i, cantidad: i.cantidad + 1, precio_total: (i.cantidad + 1) * i.precio_unitario }
            : i
        )
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          tempId: crypto.randomUUID(),
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

  function updateCantidad(tempId: string, cantidad: number) {
    if (cantidad < 0) return
    setItems((prev) =>
      prev.map((i) =>
        i.tempId === tempId
          ? { ...i, cantidad, precio_total: cantidad * i.precio_unitario }
          : i
      )
    )
  }

  function updatePrecio(tempId: string, precio: number) {
    if (precio < 0) return
    setItems((prev) =>
      prev.map((i) =>
        i.tempId === tempId
          ? { ...i, precio_unitario: precio, precio_total: i.cantidad * precio }
          : i
      )
    )
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  const total = items.reduce((acc, i) => acc + i.precio_total, 0)

  async function handleGuardar() {
    if (!clienteSeleccionado) return
    if (items.length === 0) return
    setSaving(true)
    setSaveError(null)
    try {
      // Obtener el proximo numero de cotizacion via funcion SQL, con fallback manual
      let numero: number
      const { data: rpcData, error: numError } = await supabase.rpc("get_next_cotizacion_numero")
      if (numError || rpcData == null) {
        // Fallback: MAX(numero) + 1
        const { data: maxData, error: maxError } = await supabase
          .from("cotizaciones")
          .select("numero")
          .order("numero", { ascending: false })
          .limit(1)
          .single()
        if (maxError && maxError.code !== "PGRST116") throw new Error("No se pudo generar el número de cotización")
        numero = maxData ? (maxData.numero as number) + 1 : 1
      } else {
        numero = rpcData as number
      }

      const { data: cot, error: cotError } = await supabase
        .from("cotizaciones")
        .insert({
          numero,
          cod_client: clienteSeleccionado.cod_client,
          razon_soci: clienteSeleccionado.razon_soci,
          total,
          estado: "borrador",
          observaciones: observaciones || null,
          forma_pago: formaPago || null,
          atte: atte || null,
          expte: expte || null,
        })
        .select()
        .single()

      if (cotError || !cot) throw cotError

      const itemsToInsert = items.map((i) => ({
        cotizacion_id: cot.id,
        cod_artic: i.cod_artic,
        descrip: i.descrip,
        desc_adic: i.desc_adic,
        marca: i.marca,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        precio_total: i.precio_total,
      }))

      const { error: itemsError } = await supabase.from("cotizacion_items").insert(itemsToInsert)
      if (itemsError) throw itemsError

      onCreated()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : "Error al guardar la cotización. Revisá la consola.")
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!clienteSeleccionado && items.length > 0 && !saving

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white p-0 gap-0"
        style={{ width: "90vw", maxWidth: "90vw" }}
      >
        <DialogHeader className="px-6 py-5 border-b border-border">
          <DialogTitle className="text-base font-semibold text-foreground">
            Nueva Cotización
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* CLIENTE */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cliente
            </Label>
            <div ref={clienteRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-white border-border"
                  placeholder="Buscar por código o razón social..."
                  value={clienteQuery}
                  onChange={(e) => {
                    setClienteQuery(e.target.value)
                    setClienteSeleccionado(null)
                  }}
                  onFocus={() => clienteSuggestions.length > 0 && setShowClienteSugg(true)}
                />
                {clienteLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {showClienteSugg && clienteSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-lg">
                  {clienteSuggestions.map((c) => (
                    <button
                      key={c.cod_client}
                      className="flex w-full flex-col px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
                      onMouseDown={() => selectCliente(c)}
                    >
                      <span className="text-sm font-medium text-foreground">{c.razon_soci}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.cod_client}{c.localidad ? ` · ${c.localidad}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {clienteSeleccionado && (
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{clienteSeleccionado.razon_soci}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {clienteSeleccionado.cod_client}
                    {clienteSeleccionado.domicilio ? ` · ${clienteSeleccionado.domicilio}` : ""}
                    {clienteSeleccionado.localidad ? `, ${clienteSeleccionado.localidad}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => { setClienteSeleccionado(null); setClienteQuery("") }}
                  className="text-muted-foreground hover:text-foreground ml-2 mt-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* AGREGAR PRODUCTO */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agregar Artículo
            </Label>
            <div ref={productoRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-white border-border"
                  placeholder="Buscar por código o descripción..."
                  value={productoQuery}
                  onChange={(e) => setProductoQuery(e.target.value)}
                  onFocus={() => productoSuggestions.length > 0 && setShowProductoSugg(true)}
                />
                {productoLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {showProductoSugg && productoSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-lg max-h-64 overflow-y-auto">
                  {productoSuggestions.map((p) => (
                    <button
                      key={p.cod_artic}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
                      onMouseDown={() => selectProducto(p)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.descrip}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.cod_artic}
                          {p.desc_adic ? ` · ${p.desc_adic}` : ""}
                          {p.marca ? ` · ${p.marca}` : ""}
                        </p>
                      </div>
                      <span className="ml-4 shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(p.lista)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TABLA DE ITEMS */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Artículos
              </Label>
              <div className="rounded-md border border-border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_2fr_1fr_1fr_100px_140px_140px_48px] bg-muted/50 border-b border-border">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código de Artículo</div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Artículo</div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marca</div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Cantidad</div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Precio Unit.</div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total</div>
                  <div className="px-4 py-2"></div>
                </div>
                {/* Rows */}
                {items.map((item) => (
                  <div
                    key={item.tempId}
                    className="grid grid-cols-[1fr_2fr_1fr_1fr_100px_140px_140px_48px] border-b border-border last:border-0 items-center"
                  >
                    <div className="px-4 py-3 min-w-0">
                      <span className="text-sm text-muted-foreground">{item.cod_artic}</span>
                    </div>
                    <div className="px-4 py-3 min-w-0">
                      <span className="text-sm font-medium text-foreground leading-tight">{item.descrip}</span>
                    </div>
                    <div className="px-4 py-3 min-w-0">
                      <span className="text-sm font-medium text-foreground">{item.marca ?? "—"}</span>
                    </div>
                    <div className="px-4 py-3 min-w-0">
                      <span className="text-sm text-muted-foreground">{item.desc_adic ?? "—"}</span>
                    </div>
                    <div className="px-4 py-3">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.cantidad}
                        onChange={(e) => updateCantidad(item.tempId, Number(e.target.value))}
                        className="h-8 text-center bg-white border-border text-sm w-full"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.precio_unitario}
                        onChange={(e) => updatePrecio(item.tempId, Number(e.target.value))}
                        className="h-8 text-right bg-white border-border text-sm w-full"
                      />
                    </div>
                    <div className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(item.precio_total)}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex justify-center">
                      <button
                        onClick={() => removeItem(item.tempId)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {/* Total row */}
                <div className="grid grid-cols-[1fr_2fr_1fr_1fr_100px_140px_140px_48px] bg-muted/30 border-t-2 border-border">
                  <div className="px-4 py-3 col-span-6 text-sm font-semibold text-foreground text-right">
                    Total
                  </div>
                  <div className="px-4 py-3 text-right">
                    <span className="text-base font-bold text-foreground">{formatCurrency(total)}</span>
                  </div>
                  <div className="px-4 py-3"></div>
                </div>
              </div>
            </div>
          )}

          {/* ATTE + EXPTE + FORMA DE PAGO + OBSERVACIONES */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Atte (opcional)
              </Label>
              <Input
                placeholder="Ej: Lic. García..."
                value={atte}
                onChange={(e) => setAtte(e.target.value)}
                className="bg-white border-border text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expediente (opcional)
              </Label>
              <Input
                placeholder="Ej: EX-2024-001..."
                value={expte}
                onChange={(e) => setExpte(e.target.value)}
                className="bg-white border-border text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Forma de Pago (opcional)
              </Label>
              <Input
                placeholder="Ej: Cuenta corriente 30 días..."
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="bg-white border-border text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Observaciones (opcional)
              </Label>
              <Input
                placeholder="Condiciones, validez, entrega..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="bg-white border-border text-sm"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <div className="text-sm">
            {saveError ? (
              <span className="text-red-600 font-medium">{saveError}</span>
            ) : items.length > 0 ? (
              <span className="text-muted-foreground">{items.length} artículo{items.length !== 1 ? "s" : ""} · Total: {formatCurrency(total)}</span>
            ) : (
              <span className="text-muted-foreground">Agregá artículos para continuar</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground"
            >
              Cancelar
            </Button>
            <Button
              disabled={!canSave}
              onClick={handleGuardar}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
              ) : (
                "Guardar Cotización"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
