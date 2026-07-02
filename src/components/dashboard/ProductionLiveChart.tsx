import type { PointSerie } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

const WIDTH = 600
const HEIGHT = 160
const PAD = 24

export function ProductionLiveChart({ points }: { points: PointSerie[] }) {
  const values = points.map((p) => p.quantite_bonne_cumulee)
  const max = Math.max(1, ...values)

  const path = points
    .map((p, i) => {
      const x = PAD + (i / Math.max(1, points.length - 1)) * (WIDTH - PAD * 2)
      const y = HEIGHT - PAD - (p.quantite_bonne_cumulee / max) * (HEIGHT - PAD * 2)
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Évolution production en temps réel</h3>
      {points.length === 0 ? (
        <EmptyState message="Aucune production enregistrée sur la fenêtre." />
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full text-primary">
          <line
            x1={PAD}
            y1={HEIGHT - PAD}
            x2={WIDTH - PAD}
            y2={HEIGHT - PAD}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />
          <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
        </svg>
      )}
    </Card>
  )
}
