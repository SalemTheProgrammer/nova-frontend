import { ClipboardList } from "lucide-react"
import type { OFActif } from "@/lib/types"
import { Card } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

const EN_MARCHE = new Set(["EN_COURS"])

/** Bandeau d'OF volontairement synthétique pour une lecture de démonstration. */
export function OFHeaderBar({ of }: { of: OFActif | null }) {
  if (!of) {
    return (
      <Card className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <ClipboardList className="size-4 shrink-0" />
        Aucun ordre de fabrication en cours sur ce périmètre.
      </Card>
    )
  }

  const enMarche = EN_MARCHE.has(of.statut)
  const objectif = Math.max(1, Number(of.quantite_planifiee))
  const realise = Math.min(
    objectif,
    Number(of.quantite_bonne) + Number(of.quantite_rejetee),
  )
  const progression = Math.min(100, Math.round((realise / objectif) * 100))

  return (
    <Card className="dashboard-of-card grid gap-3 p-3 shadow-sm">
      <div className="dashboard-of-identity flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
          <ClipboardList className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Ordre en cours
          </p>
          <p className="truncate text-sm font-semibold">{of.numero}</p>
          <p className="truncate text-xs text-muted-foreground">{of.article_designation}</p>
        </div>
      </div>

      <div className="dashboard-of-progress min-w-0 self-center">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">Progression</span>
          <span className="font-mono font-semibold tabular-nums">{progression}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
            style={{ width: `${progression}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {realise.toLocaleString("fr-FR")} / {objectif.toLocaleString("fr-FR")} unités
        </p>
      </div>

      <div className="dashboard-of-status flex items-center justify-between gap-3 rounded-xl bg-muted/45 px-3 py-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Statut
          </p>
          <p className="text-sm font-semibold">
            {enMarche ? "En production" : of.statut.replaceAll("_", " ")}
          </p>
          {of.lot_produit && (
            <p className="text-[11px] text-muted-foreground">Lot {of.lot_produit}</p>
          )}
        </div>
        <span
          className={cn(
            "size-3 shrink-0 rounded-full ring-4",
            enMarche
              ? "bg-emerald-500 ring-emerald-500/15"
              : "bg-amber-500 ring-amber-500/15",
          )}
        />
      </div>
    </Card>
  )
}
