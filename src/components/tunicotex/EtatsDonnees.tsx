import { Loader2 } from "lucide-react"
import { Button } from "@/components/shared/primitives"

export function Chargement() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Chargement…
    </div>
  )
}

export function Vide({ raison }: { raison: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
      {raison}
    </div>
  )
}

export function ErreurDivatex({
  onRetry,
  message = "Base DIVA injoignable.",
}: {
  onRetry: () => void
  message?: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-10 text-center">
      <p className="text-sm font-medium text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  )
}
