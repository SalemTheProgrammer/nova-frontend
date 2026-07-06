import { PackageCheck, PackageX } from "lucide-react"
import { Card } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

/** Carte simple et lisible : combien de pièces sont bonnes vs rejetées sur l'OF en cours. */
export function RejectsCard({
  quantiteBonne,
  quantiteRejetee,
}: {
  quantiteBonne: string
  quantiteRejetee: string
}) {
  const bonne = Number(quantiteBonne) || 0
  const rejetee = Number(quantiteRejetee) || 0
  const total = bonne + rejetee
  const pct = total > 0 ? (rejetee / total) * 100 : 0
  const good = rejetee === 0

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Pièces rejetées</h3>
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            good ? "bg-emerald-500/15" : "bg-destructive/15",
          )}
        >
          {good ? (
            <PackageCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <PackageX className="size-5 text-destructive" />
          )}
        </div>
      </div>

      <p
        className={cn(
          "mt-3 font-mono text-4xl font-bold leading-none tabular-nums",
          good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
        )}
      >
        {rejetee}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {good
          ? "Aucun rejet — qualité parfaite sur l'ordre en cours."
          : `${pct.toFixed(1)}% de la production de l'ordre en cours`}
      </p>

      <div className="mt-auto pt-5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${total > 0 ? (bonne / total) * 100 : 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs font-medium text-muted-foreground">
          <span>{bonne} bonnes pièces</span>
          <span>{rejetee} rejetées</span>
        </div>
      </div>
    </Card>
  )
}
