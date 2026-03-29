"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, Pencil, Trash2, Plus, Upload, ChevronUp, ChevronDown, ChevronsUpDown, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
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
import { ProductoDialog } from "./producto-dialog"
import { PinDialog } from "@/components/pin-dialog"
import type { Producto } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Props {
  initialData: Producto[]
  error?: string
}

type SortField = "cod_artic" | "descrip" | "marca" | "lista"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 20

async function validatePin(pin: string, type: "edicion" | "importar"): Promise<boolean> {
  const res = await fetch("/api/validate-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, type }),
  })
  const data = await res.json()
  return data.valid === true
}

export function ProductosClient({ initialData, error }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [productos, setProductos] = useState<Producto[]>(initialData)
  const [isPending, startTransition] = useTransition()
  const [sortField, setSortField] = useState<SortField>("cod_artic")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // PIN state
  const [pinEdicionOpen, setPinEdicionOpen] = useState(false)
  const [pinImportarOpen, setPinImportarOpen] = useState(false)
  const [pinValidating, setPinValidating] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [productoDialogOpen, setProductoDialogOpen] = useState(false)
  const [editandoProducto, setEditandoProducto] = useState<Producto | null>(null)

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

  const filtered = productos
    .filter(
      (p) =>
        p.cod_artic.toLowerCase().includes(search.toLowerCase()) ||
        p.descrip.toLowerCase().includes(search.toLowerCase()) ||
        (p.marca ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === "lista") {
        return sortDir === "asc" ? a.lista - b.lista : b.lista - a.lista
      }
      const va = (a[sortField] ?? "").toString().toLowerCase()
      const vb = (b[sortField] ?? "").toString().toLowerCase()
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function refresh() {
    startTransition(() => router.refresh())
    const supabase = createClient()
    supabase
      .from("productos")
      .select("*")
      .order("cod_artic")
      .then(({ data }) => {
        if (data) setProductos(data)
      })
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from("productos").delete().eq("id", id)
    setProductos((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
  }

  function requestEditar(producto: Producto) {
    setEditandoProducto(producto)
    setPinEdicionOpen(true)
  }

  function requestNuevo() {
    setEditandoProducto(null)
    setPinEdicionOpen(true)
  }

  async function handlePinEdicion(pin: string) {
    setPinValidating(true)
    const valid = await validatePin(pin, "edicion")
    setPinValidating(false)
    if (valid) {
      setPinEdicionOpen(false)
      setProductoDialogOpen(true)
    }
    return valid
  }

  async function handlePinImportar(pin: string) {
    setPinValidating(true)
    const valid = await validatePin(pin, "importar")
    setPinValidating(false)
    if (valid) {
      setPinImportarOpen(false)
      setCsvImportOpen(true)
    }
    return valid
  }

  const SORTABLE_COLS: { field: SortField; label: string; className?: string }[] = [
    { field: "cod_artic", label: "Código", className: "w-32" },
    { field: "descrip",   label: "Descripción" },
    { field: "marca",     label: "Marca", className: "w-32" },
    { field: "lista",     label: "Precio Lista", className: "w-32" },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground">
            {productos.length} producto{productos.length !== 1 ? "s" : ""} en el catálogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPinImportarOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <Button size="sm" onClick={requestNuevo}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
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
          placeholder="Buscar por código, descripción o marca..."
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
              {SORTABLE_COLS.map(({ field, label, className }) => (
                <TableHead
                  key={field}
                  className={cn(
                    "font-semibold text-foreground cursor-pointer select-none hover:bg-muted/70 transition-colors",
                    field === "lista" && "text-right",
                    className
                  )}
                  onClick={() => handleSort(field)}
                >
                  <span className={cn("flex items-center gap-1.5", field === "lista" && "justify-end")}>
                    {label}
                    <SortIcon field={field} />
                  </span>
                </TableHead>
              ))}
              <TableHead className="font-semibold text-foreground">Desc. Adicional</TableHead>
              <TableHead className="w-24 text-right font-semibold text-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  {search
                    ? "No se encontraron productos para la búsqueda."
                    : "No hay productos. Importá un CSV o creá uno manualmente."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((producto) => (
                <TableRow key={producto.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {producto.cod_artic}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{producto.descrip}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{producto.marca ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-foreground">
                    ${Number(producto.lista).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{producto.desc_adic ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => requestEditar(producto)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            {deletingId === producto.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de eliminar <strong>{producto.descrip}</strong>? Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(producto.id)}
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
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} productos
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
          Mostrando {filtered.length} de {productos.length} productos
        </p>
      )}

      {/* PIN para crear/editar artículos */}
      <PinDialog
        open={pinEdicionOpen}
        onOpenChange={setPinEdicionOpen}
        correctPin="__server__"
        title="PIN requerido"
        description="Ingresá el PIN para crear o modificar artículos."
        onSuccess={() => setProductoDialogOpen(true)}
        onValidate={(pin) => handlePinEdicion(pin)}
      />

      {/* PIN para importar CSV */}
      <PinDialog
        open={pinImportarOpen}
        onOpenChange={setPinImportarOpen}
        correctPin="__server__"
        title="PIN requerido"
        description="Ingresá el PIN para importar la lista de artículos y precios."
        onSuccess={() => setCsvImportOpen(true)}
        onValidate={(pin) => handlePinImportar(pin)}
      />

      {/* Producto dialog */}
      <ProductoDialog
        mode={editandoProducto ? "edit" : "create"}
        producto={editandoProducto ?? undefined}
        onSuccess={() => { setProductoDialogOpen(false); refresh() }}
        open={productoDialogOpen}
        onOpenChange={setProductoDialogOpen}
      />

      {/* CSV Import dialog */}
      <CsvImportDialog
        title="Importar Lista de Precios"
        description="Importá tu lista de precios desde Excel (.xlsx) o CSV. Todos los productos existentes serán reemplazados por la nueva lista."
        expectedColumns={["COD_ARTIC", "DESCRIP", "DESC_ADIC", "PRECIO"]}
        apiEndpoint="/api/productos/import"
        onSuccess={() => { setCsvImportOpen(false); refresh() }}
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
      />
    </div>
  )
}
