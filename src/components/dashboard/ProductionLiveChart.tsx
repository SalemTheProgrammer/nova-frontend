import { useId } from "react"
import type { PointSerie } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

const WIDTH = 600
const HEIGHT = 200
const PAD = 20

export function ProductionLiveChart({ points }: { points: PointSerie[] }) {
  const uid = useId().replace(/:/g, "")
  const values = points.map((p) => p.quantite_bonne_cumulee)
  const max = Math.max(1, ...values)
  const dernier = values[values.length - 1] ?? 0

  const coords = points.map((p, i) => {
    const x = PAD + (i / Math.max(1, points.length - 1)) * (WIDTH - PAD * 2)
    const y = HEIGHT - PAD - (p.quantite_bonne_cumulee / max) * (HEIGHT - PAD * 2)
    return { x, y }
  })
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ")
  const area =
    coords.length > 1
      ? `${path} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PAD} L${coords[0].x.toFixed(1)},${HEIGHT - PAD} Z`
      : ""

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Production en temps réel</h3>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {dernier} bonnes pièces cumulées
        </span>
      </div>
      <div className="min-h-0 flex-1 p-3">
        {points.length === 0 ? (
          <EmptyState message="Aucune production enregistrée sur la fenêtre." />
        ) : (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="h-full w-full text-primary"
          >
            <defs>
              <linearGradient id={`prod-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1={PAD}
                x2={WIDTH - PAD}
                y1={PAD + t * (HEIGHT - PAD * 2)}
                y2={PAD + t * (HEIGHT - PAD * 2)}
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-border"
              />
            ))}
            <line
              x1={PAD}
              y1={HEIGHT - PAD}
              x2={WIDTH - PAD}
              y2={HEIGHT - PAD}
              stroke="currentColor"
              className="text-border"
              strokeWidth={1}
            />
            {area && <path d={area} fill={`url(#prod-${uid})`} />}
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
    </Card>
  )
}
