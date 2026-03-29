"use client"

import { useState, useRef } from "react"
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { parseCSV } from "@/lib/csv-parser"

interface CsvImportDialogProps {
  title: string
  description: string
  expectedColumns: string[]
  apiEndpoint: string
  onSuccess: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

async function parseExcel(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import("xlsx")
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        String(v ?? ""),
      ])
    )
  )
}

function isExcel(file: File) {
  return (
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  )
}

export function CsvImportDialog({
  title,
  description,
  expectedColumns,
  apiEndpoint,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CsvImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setStatus("idle")
    setMessage("")
    setPreview([])
    setTotalRows(0)
    try {
      let rows: Record<string, string>[]
      if (isExcel(f)) {
        rows = await parseExcel(f)
      } else {
        const text = await f.text()
        rows = parseCSV(text)
      }
      setTotalRows(rows.length)
      setPreview(rows.slice(0, 5))
    } catch {
      setStatus("error")
      setMessage("No se pudo leer el archivo. Verificá que sea un Excel o CSV válido.")
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleImport() {
    if (!file) return
    setStatus("loading")
    setMessage("")
    try {
      let rows: Record<string, string>[]
      if (isExcel(file)) {
        rows = await parseExcel(file)
      } else {
        const text = await file.text()
        rows = parseCSV(text)
      }
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus("error")
        setMessage(data.error ?? "Error al importar")
      } else {
        setStatus("success")
        setMessage(`✓ ${data.imported} registros importados correctamente`)
        onSuccess()
      }
    } catch (err) {
      setStatus("error")
      setMessage(String(err))
    }
  }

  function setOpen(v: boolean) {
    if (controlledOnOpenChange) controlledOnOpenChange(v)
    else setInternalOpen(v)
  }

  function handleClose(o: boolean) {
    setOpen(o)
    if (!o) {
      setFile(null)
      setPreview([])
      setTotalRows(0)
      setStatus("idle")
      setMessage("")
    }
  }

  const previewCols = preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl w-[95vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Columns hint */}
          <div className="rounded-md bg-muted px-4 py-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Columnas requeridas en el archivo:</p>
            <div className="flex flex-wrap gap-2">
              {expectedColumns.map((col) => (
                <code key={col} className="rounded bg-background px-2 py-0.5 text-xs font-mono border border-border">
                  {col}
                </code>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:bg-muted/60"
          >
            <FileText className="h-8 w-8 text-muted-foreground" />
            {file ? (
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                {totalRows > 0 && (
                  <p className="text-xs text-muted-foreground">{totalRows} filas detectadas</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Arrastrá tu archivo aquí</p>
                <p className="text-xs text-muted-foreground">o hacé clic para seleccionar · Excel (.xlsx) o CSV</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Vista previa — primeras {preview.length} de {totalRows} filas:
              </p>
              <div className="overflow-auto rounded-md border border-border max-h-44">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {previewCols.map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {previewCols.map((k, j) => (
                          <td key={j} className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                            {row[k] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status */}
          {message && (
            <div
              className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${
                status === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {status === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={status === "loading"}>
            {status === "success" ? "Cerrar" : "Cancelar"}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || status === "loading" || status === "success"}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
