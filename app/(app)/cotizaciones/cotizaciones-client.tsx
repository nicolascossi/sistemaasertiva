"use client"

import { useState } from "react"
import type { Cotizacion, CotizacionEstado, Cliente } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, FileText, Calendar, User, Search, X, Download, Loader2 } from "lucide-react"
import { NuevaCotizacionDialog } from "./nueva-cotizacion-dialog"
import { CotizacionDetailDialog } from "./cotizacion-detail-dialog"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Props {
  initialCotizaciones: Cotizacion[]
}

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

const ESTADO_CONFIG: Record<CotizacionEstado, { label: string; className: string }> = {
  borrador:  { label: "Borrador",  className: "bg-gray-100 text-gray-600 border-gray-200" },
  enviada:   { label: "Enviada",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  aceptada:  { label: "Aceptada",  className: "bg-green-50 text-green-700 border-green-200" },
  rechazada: { label: "Rechazada", className: "bg-red-50 text-red-600 border-red-200" },
}

const FILTROS_ESTADO: { value: CotizacionEstado | "todas"; label: string }[] = [
  { value: "todas",     label: "Todas" },
  { value: "borrador",  label: "Borrador" },
  { value: "enviada",   label: "Enviada" },
  { value: "aceptada",  label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
]

export function CotizacionesClient({ initialCotizaciones }: Props) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(initialCotizaciones)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<CotizacionEstado | "todas">("todas")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [selectedCotizacion, setSelectedCotizacion] = useState<Cotizacion | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const cotizacionesFiltradas = cotizaciones.filter((c) => {
    const matchEstado = filtroEstado === "todas" || c.estado === filtroEstado
    if (!matchEstado) return false
    if (!filtro.trim()) return true
    const q = filtro.trim().toLowerCase()
    return (
      c.razon_soci.toLowerCase().includes(q) ||
      c.cod_client.toLowerCase().includes(q)
    )
  })

  async function handleDownloadPDF(cot: Cotizacion) {
    setDownloadingId(cot.id)
    try {
      const supabase = createClient()
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("*")
        .eq("cod_client", cot.cod_client)
        .single()

      const { data: empresaData } = await supabase
        .from("empresa_config")
        .select("*")
        .limit(1)
        .single()

      const { generarCotizacionPDF } = await import("@/lib/generate-cotizacion-pdf")
      await generarCotizacionPDF(cot, clienteData as Cliente | null, empresaData)
    } catch (err) {
      console.error("Error al generar PDF:", err)
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleRefresh() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("cotizaciones")
      .select("*, cotizacion_items(*)")
      .order("created_at", { ascending: false })
    if (data) setCotizaciones(data as Cotizacion[])
    setLoading(false)
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Cotizaciones</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cotizaciones.length} cotización{cotizaciones.length !== 1 ? "es" : ""} registrada{cotizaciones.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-foreground text-background hover:bg-foreground/90 gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>

      {/* Filter bar */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por razón social o código de cliente..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9 pr-9 bg-white border-border text-sm h-9"
          />
          {filtro && (
            <button
              onClick={() => setFiltro("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Filtros de estado */}
        <div className="flex items-center gap-1">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroEstado(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                filtroEstado === f.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-white text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cotizaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sin cotizaciones</p>
              <p className="text-xs text-muted-foreground mt-1">
                Creá tu primera cotización usando el botón de arriba.
              </p>
            </div>
          </div>
        ) : cotizacionesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sin resultados</p>
              <p className="text-xs text-muted-foreground mt-1">
                No se encontraron cotizaciones con los filtros aplicados.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cotizacionesFiltradas.map((cot) => {
              const estadoCfg = ESTADO_CONFIG[cot.estado ?? "borrador"]
              return (
                <div
                  key={cot.id}
                  className="rounded-lg border border-border bg-white p-5 hover:border-foreground/30 transition-colors cursor-pointer"
                  onClick={() => { setSelectedCotizacion(cot); setDetailOpen(true) }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-foreground font-mono">{cot.numero}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs border", estadoCfg.className)}
                        >
                          {estadoCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          {cot.cotizacion_items?.length ?? 0} artículo{(cot.cotizacion_items?.length ?? 0) !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{cot.razon_soci}</span>
                        <span className="text-muted-foreground text-xs shrink-0">({cot.cod_client})</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(cot.fecha)}
                        </span>
                        {cot.observaciones && (
                          <span className="truncate max-w-xs">{cot.observaciones}</span>
                        )}
                      </div>
                    </div>
                    {/* Right: total + download */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                        <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(cot.total)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs border-border hover:bg-muted"
                        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(cot) }}
                        disabled={downloadingId === cot.id}
                      >
                        {downloadingId === cot.id
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generando...</>
                          : <><Download className="h-3.5 w-3.5" />Descargar PDF</>
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Items preview */}
                  {cot.cotizacion_items && cot.cotizacion_items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="space-y-1.5">
                        {cot.cotizacion_items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate max-w-xs">
                              <span className="font-mono text-foreground mr-2">{item.cod_artic}</span>
                              {item.descrip}
                              {item.marca ? ` · ${item.marca}` : ""}
                            </span>
                            <span className="text-foreground font-medium shrink-0 ml-4">
                              {item.cantidad} × {formatCurrency(item.precio_unitario)} = {formatCurrency(item.precio_total)}
                            </span>
                          </div>
                        ))}
                        {cot.cotizacion_items.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {cot.cotizacion_items.length - 3} artículo{cot.cotizacion_items.length - 3 !== 1 ? "s" : ""} más
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <NuevaCotizacionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleRefresh}
      />

      <CotizacionDetailDialog
        cotizacion={selectedCotizacion}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={() => { setDetailOpen(false); handleRefresh() }}
        onEstadoChanged={(id, estado) => {
          setCotizaciones((prev) =>
            prev.map((c) => c.id === id ? { ...c, estado } : c)
          )
          if (selectedCotizacion?.id === id) {
            setSelectedCotizacion((prev) => prev ? { ...prev, estado } : prev)
          }
        }}
      />
    </div>
  )
}
