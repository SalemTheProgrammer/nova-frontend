import type { CauseArretResume } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

export function DowntimeCauseChart({ causes }: { causes: CauseArretResume[] }) {
  const max = Math.max(1, ...causes.map((c) => Number(c.duree_s)))

  return (
    <Card className="h-full min-h-0 overflow-y-auto p-4">
      <h3 className="mb-3 text-sm font-semibold">Top causes d'arrêt</h3>
      {causes.length === 0 ? (
        <EmptyState message="Aucun arrêt enregistré." />
      ) : (
        <div className="space-y-2.5">
          {causes.map((c) => {
            const duree = Number(c.duree_s)
            const pct = (duree / max) * 100
            return (
              <div key={c.cause}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="capitalize">{c.cause.replace(/_/g, " ").toLowerCase()}</span>
                  <span className="font-mono text-muted-foreground">{Math.round(duree / 60)} min</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-destructive/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
