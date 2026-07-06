import type { CauseArretResume } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"]

function label(cause: string): string {
  return cause.replace(/_/g, " ").toLowerCase()
}

function fmtMin(s: number): string {
  return `${Math.round(s / 60)} min`
}

/** Répartition des arrêts par cause (donut) — où se concentrent les pertes de disponibilité. */
export function ArretTypeDistribution({ causes }: { causes: CauseArretResume[] }) {
  const total = causes.reduce((sum, c) => sum + Number(c.duree_s), 0)
  const size = 148
  const strokeWidth = 20
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - strokeWidth / 2 - 2
  const circumference = 2 * Math.PI * r

  let offsetAccum = 0
  const segments = causes.map((c, i) => {
    const value = Number(c.duree_s)
    const pct = total > 0 ? value / total : 0
    const dash = pct * circumference
    const seg = {
      cause: c.cause,
      pct,
      dash,
      offset: offsetAccum,
      color: COLORS[i % COLORS.length],
      value,
    }
    offsetAccum += dash
    return seg
  })

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">Distribution des types d'arrêt</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {causes.length === 0 || total === 0 ? (
          <EmptyState message="Aucun arrêt enregistré — la ligne tourne sans interruption." />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 text-muted/30">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
                {segments.map((s, i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                    strokeDashoffset={-s.offset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-base font-semibold tabular-nums">{fmtMin(total)}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">arrêt total</span>
              </div>
            </div>
            <ul className="w-full space-y-1.5">
              {segments.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate">{label(s.cause)}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {Math.round(s.pct * 100)}% · {fmtMin(s.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
