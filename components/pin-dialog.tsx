"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, X, Loader2 } from "lucide-react"

interface PinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** PIN local para comparar (ignorado si se provee onValidate) */
  correctPin?: string
  title: string
  description?: string
  onSuccess: () => void
  /** Validacion async server-side. Devuelve true si el PIN es correcto. */
  onValidate?: (pin: string) => Promise<boolean>
}

export function PinDialog({
  open,
  onOpenChange,
  correctPin,
  title,
  description,
  onSuccess,
  onValidate,
}: PinDialogProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [validating, setValidating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPin("")
      setError(false)
      setValidating(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidating(true)
    setError(false)

    let valid = false
    if (onValidate) {
      valid = await onValidate(pin)
    } else {
      valid = pin === correctPin
    }

    setValidating(false)

    if (valid) {
      onSuccess()
    } else {
      setError(true)
      setPin("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
              <Lock className="h-4 w-4 text-background" />
            </div>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              placeholder="Ingresá el PIN"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false) }}
              className={`text-center text-lg tracking-[0.5em] font-mono bg-white border-border ${
                error ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
              maxLength={8}
              disabled={validating}
            />
            {error && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <X className="h-3 w-3" /> PIN incorrecto. Intentá de nuevo.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={validating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pin.length === 0 || validating}>
              {validating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verificando...</> : "Confirmar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
