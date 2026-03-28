"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { Cotizacion, CotizacionEstado } from "@/lib/types"
import { FileText, Users, Package, TrendingUp, Clock, CheckCircle, XCircle, Send, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  cotizaciones: Pick<Cotizacion, "id" | "numero" | "razon_soci" | "cod_client" | "total" | "estado" | "fecha" | "created_at">[]
  totalClientes: number
  totalProductos: number
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const ESTADO_CONFIG: Record<CotizacionEstado, { label: string; icon: React.ElementType; className: string; dot: string }> = {
  borrador:  { label: "Borrador",  icon: Clock,         className: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
  enviada:   { label: "Enviada",   icon: Send,          className: "bg-blue-50 text-blue-700",    dot: "bg-blue-500" },
  aceptada:  { label: "Aceptada",  icon: CheckCircle,   className: "bg-green-50 text-green-700",  dot: "bg-green-500" },
  rechazada: { label: "Rechazada", icon: XCircle,       className: "bg-red-50 text-red-600",      dot: "bg-red-500" },
}

export function DashboardClient({ cotizaciones, totalClientes, totalProductos }: Props) {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const cotMes = useMemo(
    () => cotizaciones.filter((c) => new Date(c.created_at) >= inicioMes),
    [cotizaciones]
  )

  const totalMes = useMemo(
    () => cotMes.reduce((acc, c) => acc + c.total, 0),
    [cotMes]
  )

  const porEstado = useMemo(() => {
    const counts: Record<CotizacionEstado, number> = { borrador: 0, enviada: 0, aceptada: 0, rechazada: 0 }
    for (const c of cotizaciones) {
      counts[c.estado ?? "borrador"]++
    }
    return counts
  }, [cotizaciones])

  const ultimasCotizaciones = cotizaciones.slice(0, 8)

  const stats = [
    {
      label: "Cotizaciones este mes",
      value: cotMes.length.toString(),
      sub: `${cotizaciones.length} en total`,
      icon: FileText,
      href: "/cotizaciones",
    },
    {
      label: "Monto cotizado este mes",
      value: formatCurrency(totalMes),
      sub: "Total bruto sin impuestos",
      icon: TrendingUp,
      href: "/cotizaciones",
    },
    {
      label: "Clientes registrados",
      value: totalClientes.toString(),
      sub: "Base de clientes activa",
      icon: Users,
      href: "/clientes",
    },
    {
      label: "Productos en catálogo",
      value: totalProductos.toString(),
      sub: "Artículos disponibles",
      icon: Package,
      href: "/productos",
    },
  ]

  return (
    <div className="flex flex-1 flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Resumen de actividad — {hoy.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.label}
                href={s.href}
                className="rounded-lg border border-border bg-white p-5 hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1 truncate">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0 ml-3">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Cotizaciones por estado */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Estado de cotizaciones</h2>
            <div className="space-y-3">
              {(Object.entries(ESTADO_CONFIG) as [CotizacionEstado, typeof ESTADO_CONFIG[CotizacionEstado]][]).map(([estado, cfg]) => {
                const count = porEstado[estado]
                const pct = cotizaciones.length > 0 ? Math.round((count / cotizaciones.length) * 100) : 0
                return (
                  <div key={estado}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <span className={cn("inline-block w-2 h-2 rounded-full", cfg.dot)} />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", cfg.dot)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Últimas cotizaciones */}
          <div className="rounded-lg border border-border bg-white xl:col-span-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Últimas cotizaciones</h2>
              <Link href="/cotizaciones" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {ultimasCotizaciones.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Sin cotizaciones registradas
              </div>
            ) : (
              <div className="divide-y divide-border">
                {ultimasCotizaciones.map((cot) => {
                  const estado = cot.estado ?? "borrador"
                  const cfg = ESTADO_CONFIG[estado]
                  return (
                    <Link
                      key={cot.id}
                      href="/cotizaciones"
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-foreground shrink-0">{cot.numero}</span>
                        <span className="text-sm text-foreground truncate">{cot.razon_soci}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium border",
                            cfg.className,
                            estado === "borrador" ? "border-gray-200" :
                            estado === "enviada" ? "border-blue-200" :
                            estado === "aceptada" ? "border-green-200" : "border-red-200"
                          )}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(cot.fecha)}</span>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(cot.total)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
