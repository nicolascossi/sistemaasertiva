"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, Pencil, Trash2, Plus, ChevronUp, ChevronDown, ChevronsUpDown, History, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { ClienteDialog } from "./cliente-dialog"
import { ClienteHistorialDialog } from "./cliente-historial-dialog"
import type { Cliente } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Props {
  initialData: Cliente[]
  error?: string
}

type SortField = "cod_client" | "razon_soci" | "localidad" | "dentiftri"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 20

export function ClientesClient({ initialData, error }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [clientes, setClientes] = useState<Cliente[]>(initialData)
  const [, startTransition] = useTransition()
  const [sortField, setSortField] = useState<SortField>("razon_soci")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [historialCliente, setHistorialCliente] = useState<Cliente | null>(null)
  const [historialOpen, setHistorialOpen] = useState(false)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(1)
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-foreground" />
      : <ChevronDown className="h-3.5 w-3.5 text-foreground" />
  }

  const filtered = clientes
    .filter(
      (c) =>
        c.cod_client.toLowerCase().includes(search.toLowerCase()) ||
        c.razon_soci.toLowerCase().includes(search.toLowerCase()) ||
        (c.localidad ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.dentiftri ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const va = (a[sortField] ?? "").toLowerCase()
      const vb = (b[sortField] ?? "").toLowerCase()
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function refresh() {
    startTransition(() => router.refresh())
    const supabase = createClient()
    supabase
      .from("clientes")
      .select("*")
      .order("razon_soci")
      .then(({ data }) => {
        if (data) setClientes(data)
      })
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from("clientes").delete().eq("id", id)
    setClientes((prev) => prev.filter((c) => c.id !== id))
    setDeletingId(null)
  }

  const SORTABLE_COLS: { field: SortField; label: string }[] = [
    { field: "cod_client",  label: "Código" },
    { field: "razon_soci",  label: "Razón Social" },
    { field: "localidad",   label: "Localidad" },
    { field: "dentiftri",   label: "CUIT / DNI" },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog
            title="Importar Clientes desde Excel"
            description="Importá la nómina de clientes desde el Excel de Tango. Todos los clientes existentes serán reemplazados por la nueva lista."
            expectedColumns={["Codigo", "Razon social", "Domicilio", "Localidad", "Codigo postal", "Nro. de documento", "Descripcion"]}
            apiEndpoint="/api/clientes/import"
            onSuccess={refresh}
          />
          <ClienteDialog mode="create" onSuccess={refresh}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </ClienteDialog>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, razón social o localidad..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {SORTABLE_COLS.map(({ field, label }) => (
                <TableHead
                  key={field}
                  className={cn(
                    "font-semibold text-foreground cursor-pointer select-none hover:bg-muted/70 transition-colors",
                    field === "cod_client" && "w-32",
                    field === "localidad" && "w-36",
                    field === "dentiftri" && "w-36"
                  )}
                  onClick={() => handleSort(field)}
                >
                  <span className="flex items-center gap-1.5">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </TableHead>
              ))}
              <TableHead className="font-semibold text-foreground">Domicilio</TableHead>
              <TableHead className="font-semibold text-foreground w-24">C. Postal</TableHead>
              <TableHead className="font-semibold text-foreground">Cond. de Pago</TableHead>
              <TableHead className="w-28 text-right font-semibold text-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  {search
                    ? "No se encontraron clientes para la búsqueda."
                    : "No hay clientes. Importá el Excel de Tango o creá uno manualmente."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((cliente) => (
                <TableRow key={cliente.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {cliente.cod_client}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{cliente.razon_soci}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cliente.localidad ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{cliente.dentiftri ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cliente.domicilio ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{cliente.c_postali ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cliente.forma_pago ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Ver historial"
                        onClick={() => { setHistorialCliente(cliente); setHistorialOpen(true) }}
                      >
                        <History className="h-3.5 w-3.5" />
                        <span className="sr-only">Historial</span>
                      </Button>
                      <ClienteDialog mode="edit" cliente={cliente} onSuccess={refresh}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </ClienteDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            {deletingId === cliente.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de eliminar a <strong>{cliente.razon_soci}</strong>? Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(cliente.id)}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} clientes
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {filtered.length > 0 && filtered.length <= PAGE_SIZE && (
        <p className="text-xs text-muted-foreground">
          Mostrando {filtered.length} de {clientes.length} clientes
        </p>
      )}

      <ClienteHistorialDialog
        cliente={historialCliente}
        open={historialOpen}
        onOpenChange={setHistorialOpen}
      />
    </div>
  )
}
