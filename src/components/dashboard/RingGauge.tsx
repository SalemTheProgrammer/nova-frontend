import { cn } from "@/lib/utils"

const CX = 120
const CY = 106
const RADIUS = 84
const START_ANGLE = 150
const END_ANGLE = 390

function pointOnCircle(radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(radians),
    y: CY + radius * Math.sin(radians),
  }
}

function arcPath(radius: number, startAngle: number, endAngle: number) {
  const start = pointOnCircle(radius, startAngle)
  const end = pointOnCircle(radius, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/**
 * Cadran analogique/numérique SVG inspiré de jquery.simplegauge (MIT).
 * Le viewBox rend le cadran entièrement fluide : sa taille vient uniquement
 * de son conteneur, sans largeur fixe qui laisserait de l'espace inutilisé.
 */
export function RingGauge({
  value,
  label,
  showValue = true,
  target,
  compact = false,
  className,
}: {
  value: number
  label?: string
  showValue?: boolean
  target?: number
  compact?: boolean
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const percent = Math.round(pct * 100)
  const needleAngle = START_ANGLE + pct * (END_ANGLE - START_ANGLE)
  const targetPct = target == null ? null : Math.max(0, Math.min(1, target))
  const targetPoint =
    targetPct == null
      ? null
      : pointOnCircle(RADIUS, START_ANGLE + targetPct * (END_ANGLE - START_ANGLE))
  const tone =
    pct >= 0.7 ? "text-emerald-500" : pct >= 0.4 ? "text-amber-500" : "text-red-500"
  const ticks = Array.from({ length: 21 }, (_, index) => {
    const tickPct = index / 20
    const angle = START_ANGLE + tickPct * (END_ANGLE - START_ANGLE)
    const major = compact ? index % 10 === 0 : index % 4 === 0
    return {
      index,
      major,
      outer: pointOnCircle(78, angle),
      inner: pointOnCircle(major ? 68 : 72, angle),
      label: pointOnCircle(58, angle),
      value: Math.round(tickPct * 100),
    }
  })

  return (
    <div
      className={cn("flex h-full min-h-0 w-full min-w-0 items-center justify-center", className)}
      role="img"
      aria-label={`${label ?? "Indicateur"} : ${percent} %`}
    >
      <svg
        viewBox="0 0 240 190"
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full max-h-full max-w-full"
        aria-hidden="true"
      >
        <path
          d={arcPath(RADIUS, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          className="text-muted/70"
        />
        <path
          d={arcPath(RADIUS, START_ANGLE, START_ANGLE + 96)}
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          className="text-red-500"
        />
        <path
          d={arcPath(RADIUS, START_ANGLE + 96, START_ANGLE + 168)}
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          className="text-amber-500"
        />
        <path
          d={arcPath(RADIUS, START_ANGLE + 168, END_ANGLE)}
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          className="text-emerald-500"
        />

        {ticks.map((tick) => (
          <g key={tick.index}>
            <line
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
              stroke="currentColor"
              strokeWidth={tick.major ? 2.2 : 1.2}
              className="text-background/90"
            />
            {tick.major && (
              <text
                x={tick.label.x}
                y={tick.label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground font-mono font-semibold"
                fontSize={compact ? 8.5 : 9.5}
              >
                {tick.value}
              </text>
            )}
          </g>
        ))}

        {targetPoint && (
          <circle
            cx={targetPoint.x}
            cy={targetPoint.y}
            r="4.2"
            className="fill-background stroke-foreground"
            strokeWidth="2"
          />
        )}

        <g
          className="transition-transform duration-700 ease-out"
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${needleAngle}deg)`,
          }}
        >
          <polygon
            points={`${CX - 10},${CY - 4.5} ${CX - 10},${CY + 4.5} ${CX + 70},${CY}`}
            className="fill-slate-600 dark:fill-slate-300"
          />
        </g>
        <circle cx={CX} cy={CY} r="9" className="fill-slate-600 dark:fill-slate-300" />
        <circle cx={CX} cy={CY} r="3" className="fill-background" />

        {showValue && (
          <text
            x={CX}
            y="73"
            textAnchor="middle"
            dominantBaseline="middle"
            className={cn("fill-current font-mono font-bold tabular-nums", tone)}
            fontSize={compact ? 21 : 24}
          >
            {percent}%
          </text>
        )}
        {label && (
          <text
            x={CX}
            y="147"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground/75 font-sans font-semibold"
            fontSize={compact ? 11 : 12.5}
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  )
}
