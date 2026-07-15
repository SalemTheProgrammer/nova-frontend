import { cn } from "@/lib/utils"

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0)
  const e = polar(cx, cy, r, a1)
  const large = a0 - a1 > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

/** Compteur semi-circulaire à aiguille façon speedomètre — arc plein d'une seule
 * couleur (selon la valeur) + aiguille, pour les cartes machine. */
export function MeterGauge({ value, size = 128 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, value))
  const sw = size * 0.14
  const width = size
  const height = size * 0.58
  const cx = width / 2
  const cy = height - 2
  const r = width / 2 - sw / 2 - 2
  const angle = 180 - pct * 180

  const tone = pct >= 0.7 ? "text-emerald-500" : pct >= 0.4 ? "text-amber-400" : "text-red-500"

  const needleLen = r - sw * 0.75
  const tip = polar(cx, cy, needleLen, angle)

  return (
    <div className="flex w-full flex-col items-center">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height + 4}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full"
      >
        <path
          d={arc(cx, cy, r, 180, 0)}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
          strokeLinecap="round"
          className="text-muted/30"
        />
        {pct > 0.005 && (
          <path
            d={arc(cx, cy, r, 180, angle)}
            fill="none"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            className={cn("transition-all duration-700 ease-out", tone)}
          />
        )}
        <line
          x1={cx}
          y1={cy}
          x2={tip.x}
          y2={tip.y}
          stroke="currentColor"
          strokeWidth={Math.max(2, size * 0.025)}
          strokeLinecap="round"
          className="text-foreground/80 transition-all duration-700 ease-out"
        />
        <circle cx={cx} cy={cy} r={Math.max(3, size * 0.04)} className="fill-foreground/80" />
      </svg>
      <span className={cn("text-lg font-bold tabular-nums", tone)}>{Math.round(pct * 100)}%</span>
    </div>
  )
}
