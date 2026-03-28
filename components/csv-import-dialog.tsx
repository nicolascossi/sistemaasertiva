"use client"

import { useState, useRef } from "react"
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setStatus("idle")
    setMessage("")
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setPreview(rows.slice(0, 5))
    }
    reader.readAsText(f)
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
      const text = await file.text()
      const rows = parseCSV(text)
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
        setMessage(`${data.imported} registros importados correctamente`)
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
      setStatus("idle")
      setMessage("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Columns hint */}
          <div className="rounded-md bg-muted px-4 py-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Columnas esperadas:</p>
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
              <p className="text-sm font-medium text-foreground">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Arrastrá tu archivo CSV aquí</p>
                <p className="text-xs text-muted-foreground">o hacé clic para seleccionar</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Vista previa (primeras {preview.length} filas):
              </p>
              <div className="overflow-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {Object.keys(preview[0]).map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-medium text-foreground">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5 text-muted-foreground">
                            {v || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status message */}
          {message && (
            <div
              className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${
                status === "success"
                  ? "bg-muted text-foreground"
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
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || status === "loading" || status === "success"}
          >
            {status === "loading" ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
