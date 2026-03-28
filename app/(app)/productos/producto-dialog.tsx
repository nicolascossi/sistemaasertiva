"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import type { Producto } from "@/lib/types"

interface Props {
  mode: "create" | "edit"
  producto?: Producto
  onSuccess: () => void
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProductoDialog({ mode, producto, onSuccess, children, open: controlledOpen, onOpenChange: controlledOnOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(v)
    else setInternalOpen(v)
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    cod_artic: producto?.cod_artic ?? "",
    descrip: producto?.descrip ?? "",
    desc_adic: producto?.desc_adic ?? "",
    marca: producto?.marca ?? "",
    lista: producto?.lista?.toString() ?? "0",
  })

  useEffect(() => {
    if (open) {
      setForm({
        cod_artic: producto?.cod_artic ?? "",
        descrip: producto?.descrip ?? "",
        desc_adic: producto?.desc_adic ?? "",
        marca: producto?.marca ?? "",
        lista: producto?.lista?.toString() ?? "0",
      })
      setError("")
    }
  }, [open, producto])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const supabase = createClient()
    const record = {
      cod_artic: form.cod_artic.trim(),
      descrip: form.descrip.trim(),
      desc_adic: form.desc_adic.trim() || null,
      marca: form.marca.trim() || null,
      lista: parseFloat(form.lista.replace(",", ".")) || 0,
    }

    if (mode === "create") {
      const { error: err } = await supabase.from("productos").insert(record)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { error: err } = await supabase
        .from("productos")
        .update(record)
        .eq("id", producto!.id)
      if (err) { setError(err.message); setLoading(false); return }
    }

    setLoading(false)
    setOpen(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo Producto" : "Editar Producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cod_artic">Código *</Label>
              <Input
                id="cod_artic"
                value={form.cod_artic}
                onChange={(e) => handleChange("cod_artic", e.target.value)}
                required
                disabled={mode === "edit"}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={form.marca}
                onChange={(e) => handleChange("marca", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descrip">Descripción *</Label>
            <Input
              id="descrip"
              value={form.descrip}
              onChange={(e) => handleChange("descrip", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc_adic">Descripción Adicional</Label>
            <Input
              id="desc_adic"
              value={form.desc_adic}
              onChange={(e) => handleChange("desc_adic", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lista">Precio Lista *</Label>
            <Input
              id="lista"
              type="text"
              inputMode="decimal"
              value={form.lista}
              onChange={(e) => handleChange("lista", e.target.value)}
              required
              className="font-mono"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
