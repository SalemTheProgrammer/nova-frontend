import { useId } from "react"
import { cn } from "@/lib/utils"

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = startAngle - endAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

const angleFor = (v: number) => 180 - v * 180

/** Cadran semi-circulaire à aiguille, look premium — arc dégradé, graduations, aiguille lumineuse. */
export function Gauge({
  value,
  label,
  size = 180,
}: {
  value: number // 0..1
  label: string
  size?: number
}) {
  const uid = useId().replace(/:/g, "")
  const pct = Math.max(0, Math.min(1, value))
  const width = size
  const height = size * 0.66
  const strokeWidth = Math.max(9, size * 0.085)
  const cx = width / 2
  const cy = height - strokeWidth * 0.4 - 2
  const r = width / 2 - strokeWidth / 2 - 4
  const needleLen = r - strokeWidth * 0.35
  const needleAngle = angleFor(pct)
  const needleTip = polarToCartesian(cx, cy, needleLen, needleAngle)
  const needleBackLen = strokeWidth * 0.5
  const needleBack = polarToCartesian(cx, cy, needleBackLen, needleAngle + 180)
  const hubRadius = Math.max(6, strokeWidth * 0.42)

  const tone =
    pct >= 0.7
      ? "text-emerald-500"
      : pct >= 0.4
        ? "text-amber-500"
        : "text-red-500"

  // Graduations tous les 10%.
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10
    const a = angleFor(t)
    const outer = polarToCartesian(cx, cy, r + strokeWidth / 2 + 2, a)
    const inner = polarToCartesian(cx, cy, r + strokeWidth / 2 - (i % 5 === 0 ? 7 : 4), a)
    return { outer, inner, major: i % 5 === 0 }
  })

  return (
    <div className="flex flex-col items-center" style={{ width }}>
      <svg width={width} height={height + 4} viewBox={`0 0 ${width} ${height + 4}`}>
        <defs>
          <linearGradient id={`arc-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="42%" stopColor="#f59e0b" />
            <stop offset="72%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={size * 0.012} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`hub-${uid}`}>
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#6b7280" />
          </radialGradient>
        </defs>

        {/* Piste de fond */}
        <path
          d={describeArc(cx, cy, r, 180, 0)}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-muted/40"
        />
        {/* Arc dégradé */}
        <path
          d={describeArc(cx, cy, r, 180, 0)}
          fill="none"
          stroke={`url(#arc-${uid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Graduations */}
        {ticks.map((tk, i) => (
          <line
            key={i}
            x1={tk.inner.x}
            y1={tk.inner.y}
            x2={tk.outer.x}
            y2={tk.outer.y}
            stroke="currentColor"
            strokeWidth={tk.major ? 2 : 1}
            className="text-muted-foreground/40"
          />
        ))}

        {/* Aiguille */}
        <g filter={`url(#glow-${uid})`}>
          <line
            x1={needleBack.x}
            y1={needleBack.y}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="currentColor"
            strokeWidth={Math.max(3, size * 0.022)}
            strokeLinecap="round"
            className={cn("text-foreground transition-all duration-700 ease-out", tone)}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        </g>
        <circle cx={cx} cy={cy} r={hubRadius} fill={`url(#hub-${uid})`} stroke="currentColor" strokeWidth={1.5} className="text-border" />
        <circle cx={cx} cy={cy} r={hubRadius * 0.4} className="fill-foreground/80" />
      </svg>

      <div className="-mt-1 flex flex-col items-center">
        <span
          className={cn("font-bold leading-none tabular-nums", tone)}
          style={{ fontSize: Math.max(16, size * 0.19) }}
        >
          {Math.round(pct * 100)}
          <span style={{ fontSize: Math.max(10, size * 0.09) }}>%</span>
        </span>
        {label && (
          <span
            className="mt-1 text-center font-medium text-muted-foreground"
            style={{ fontSize: Math.max(10, size * 0.072) }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
