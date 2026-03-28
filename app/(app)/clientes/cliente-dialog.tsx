"use client"

import { useState } from "react"
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
import type { Cliente } from "@/lib/types"

interface Props {
  mode: "create" | "edit"
  cliente?: Cliente
  onSuccess: () => void
  children: React.ReactNode
}

export function ClienteDialog({ mode, cliente, onSuccess, children }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    cod_client: cliente?.cod_client ?? "",
    razon_soci: cliente?.razon_soci ?? "",
    domicilio: cliente?.domicilio ?? "",
    localidad: cliente?.localidad ?? "",
    c_postali: cliente?.c_postali ?? "",
    dentiftri: cliente?.dentiftri ?? "",
  })

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const supabase = createClient()
    const record = {
      cod_client: form.cod_client.trim(),
      razon_soci: form.razon_soci.trim(),
      domicilio: form.domicilio.trim() || null,
      localidad: form.localidad.trim() || null,
      c_postali: form.c_postali.trim() || null,
      dentiftri: form.dentiftri.trim() || null,
    }

    if (mode === "create") {
      const { error: err } = await supabase.from("clientes").insert(record)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { error: err } = await supabase
        .from("clientes")
        .update(record)
        .eq("id", cliente!.id)
      if (err) { setError(err.message); setLoading(false); return }
    }

    setLoading(false)
    setOpen(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo Cliente" : "Editar Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cod_client">Código *</Label>
              <Input
                id="cod_client"
                value={form.cod_client}
                onChange={(e) => handleChange("cod_client", e.target.value)}
                required
                disabled={mode === "edit"}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dentiftri">CUIT / DNI</Label>
              <Input
                id="dentiftri"
                value={form.dentiftri}
                onChange={(e) => handleChange("dentiftri", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="razon_soci">Razón Social *</Label>
            <Input
              id="razon_soci"
              value={form.razon_soci}
              onChange={(e) => handleChange("razon_soci", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="domicilio">Domicilio</Label>
            <Input
              id="domicilio"
              value={form.domicilio}
              onChange={(e) => handleChange("domicilio", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="localidad">Localidad</Label>
              <Input
                id="localidad"
                value={form.localidad}
                onChange={(e) => handleChange("localidad", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_postali">Código Postal</Label>
              <Input
                id="c_postali"
                value={form.c_postali}
                onChange={(e) => handleChange("c_postali", e.target.value)}
                className="font-mono"
              />
            </div>
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
