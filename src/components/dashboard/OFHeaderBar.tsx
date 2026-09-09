import { ClipboardList, Layers } from "lucide-react"
import type { OFActif } from "@/lib/types"
import { Card } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

const EN_MARCHE = new Set(["EN_COURS"])

/** Bandeau d'OF dynamique et moderne pour le pilotage de production */
export function OFHeaderBar({ of }: { of: OFActif | null }) {
  if (!of) {
    return (
      <Card className="flex items-center gap-3 p-3.5 text-sm text-muted-foreground shadow-sm border border-border/70 bg-card/60">
        <ClipboardList className="size-4 text-violet-500 shrink-0" />
        <span>Aucun ordre de fabrication en cours sur ce périmètre. Sélectionnez une ligne active.</span>
      </Card>
    )
  }

  const enMarche = EN_MARCHE.has(of.statut)
  const objectif = Math.max(1, Number(of.quantite_planifiee))
  const bon = Number(of.quantite_bonne)
  const rejet = Number(of.quantite_rejetee)
  const realise = Math.min(objectif, bon + rejet)
  const progression = Math.min(100, Math.round((realise / objectif) * 100))
  const tauxRejet = realise > 0 ? ((rejet / realise) * 100).toFixed(1) : "0.0"

  return (
    <Card className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 shadow-md border border-border/80 bg-gradient-to-r from-card via-card to-violet-950/10">
      {/* 1. Identification OF */}
      <div className="md:col-span-4 flex items-center gap-3 min-w-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
          <ClipboardList className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Ordre Actif
            </span>
            {of.lot_produit && (
              <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-violet-600 dark:text-violet-300">
                Lot {of.lot_produit}
              </span>
            )}
          </div>
          <h3 className="truncate text-base font-bold text-foreground tracking-tight">
            {of.numero}
          </h3>
          <p className="truncate text-xs text-muted-foreground font-medium">
            {of.article_designation}
          </p>
        </div>
      </div>

      {/* 2. Barre de progression dynamique */}
      <div className="md:col-span-5 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="size-3.5 text-violet-500" />
            Avancement OF
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-extrabold text-sm text-foreground tabular-nums">
              {progression}%
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              ({realise.toLocaleString("fr-FR")} / {objectif.toLocaleString("fr-FR")} u)
            </span>
          </div>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 border border-border/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500 transition-[width] duration-700 shadow-sm"
            style={{ width: `${progression}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
          <span>Bonnes : {bon.toLocaleString("fr-FR")} u</span>
          <span className={cn(Number(tauxRejet) > 2 ? "text-amber-500 font-semibold" : "text-emerald-500 font-semibold")}>
            Rejets : {rejet} u ({tauxRejet}%)
          </span>
        </div>
      </div>

      {/* 3. Statut & Cadence */}
      <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 md:border-l border-border/70 pt-2 md:pt-0 md:pl-3">
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            État OF
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                "size-2 rounded-full",
                enMarche ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
              )}
            />
            <span className="text-xs font-bold text-foreground">
              {enMarche ? "En production" : of.statut.replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-center">
          <span className="text-[10px] font-medium text-muted-foreground block">Cadence</span>
          <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
            Nominale
          </span>
        </div>
      </div>
    </Card>
  )
}
