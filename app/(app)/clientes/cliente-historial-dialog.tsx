"use client"

import { useState, useEffect } from "react"
import type { Cliente, Cotizacion, CotizacionEstado } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (v: boolean) => void
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

export function ClienteHistorialDialog({ cliente, open, onOpenChange }: Props) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !cliente) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("cotizaciones")
      .select("*, cotizacion_items(*)")
      .eq("cod_client", cliente.cod_client)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCotizaciones((data as Cotizacion[]) ?? [])
        setLoading(false)
      })
  }, [open, cliente])

  if (!cliente) return null

  const totalAceptado = cotizaciones
    .filter((c) => c.estado === "aceptada")
    .reduce((acc, c) => acc + c.total, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-white p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold text-foreground">
            Historial de {cliente.razon_soci}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{cliente.cod_client}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cotizaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Este cliente no tiene cotizaciones aún.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border shrink-0">
              <div className="px-5 py-3 text-center">
                <p className="text-xl font-bold text-foreground">{cotizaciones.length}</p>
                <p className="text-xs text-muted-foreground">Cotizaciones</p>
              </div>
              <div className="px-5 py-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {cotizaciones.filter((c) => c.estado === "aceptada").length}
                </p>
                <p className="text-xs text-muted-foreground">Aceptadas</p>
              </div>
              <div className="px-5 py-3 text-center">
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalAceptado)}</p>
                <p className="text-xs text-muted-foreground">Total aceptado</p>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {cotizaciones.map((cot) => {
                const estado = cot.estado ?? "borrador"
                const cfg = ESTADO_CONFIG[estado]
                return (
                  <div key={cot.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-foreground shrink-0">{cot.numero}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{formatDate(cot.fecha)}</p>
                        {cot.observaciones && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{cot.observaciones}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span
                        className={cn("px-2 py-0.5 rounded text-xs font-medium border", cfg.className)}
                      >
                        {cfg.label}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(cot.total)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
