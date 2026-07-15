import { useEffect, useState } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { kpiApi } from "@/lib/api"
import { Card } from "@/components/dashboard/primitives"
import { RingGauge } from "@/components/dashboard/RingGauge"

const OBJECTIF_TRS = 0.74

/** Vue synthétique du TRS : un score principal et les trois facteurs qui l'expliquent. */
export function CurrentOeeCard({
  trsGlobal,
  disponibilite,
  performance,
  qualite,
  ligneId,
}: {
  trsGlobal: number
  disponibilite: number
  performance: number
  qualite: number
  ligneId: number | null
}) {
  const [delta, setDelta] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    kpiApi
      .oeeHistory(ligneId, "week")
      .then((points) => {
        if (cancelled || points.length < 2) return
        const hier = Number(points[points.length - 2].trs)
        const aujourdhui = Number(points[points.length - 1].trs)
        // Différence en points de pourcentage du TRS, pas un delta
        // relatif — sinon une base proche de 0 fait exploser le ratio.
        setDelta((aujourdhui - hier) * 100)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ligneId])

  return (
    <Card className="dashboard-panel flex h-full min-h-0 flex-col p-3 shadow-sm xl:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground/90">Performance actuelle</p>
          <p className="dashboard-card-subtitle mt-0.5 text-xs text-muted-foreground">
            TRS et facteurs de production
          </p>
        </div>
        {delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              delta >= 0
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 text-red-600 dark:text-red-400",
            )}
          >
            {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="dashboard-trs-body grid min-h-0 flex-1 items-center gap-3">
        <div className="dashboard-trs-primary flex min-h-0 min-w-0 flex-col items-center justify-center">
          <RingGauge value={trsGlobal} label="TRS" target={OBJECTIF_TRS} className="min-h-0 flex-1" />
          <p className="dashboard-target-note mt-1 text-center text-[10px] text-muted-foreground">
            Objectif {Math.round(OBJECTIF_TRS * 100)}%
          </p>
        </div>

        <div className="dashboard-factor-grid grid min-h-0 min-w-0 gap-1 border-l border-border pl-2">
          <div className="flex min-h-0 min-w-0 justify-center"><RingGauge value={disponibilite} label="Dispo." compact /></div>
          <div className="flex min-h-0 min-w-0 justify-center"><RingGauge value={performance} label="Perf." compact /></div>
          <div className="flex min-h-0 min-w-0 justify-center"><RingGauge value={qualite} label="Qualité" compact /></div>
        </div>
      </div>
    </Card>
  )
}
