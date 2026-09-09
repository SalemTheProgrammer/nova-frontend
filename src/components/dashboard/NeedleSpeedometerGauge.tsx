import { useId } from "react"
import { cn } from "@/lib/utils"

interface NeedleSpeedometerGaugeProps {
  value: number // 0 à 100
  target?: number // ex: 74
  size?: number
  className?: string
}

// 6 zones de couleur fidèles à l'image de référence
const ZONES = [
  { label: "Critique", color: "#dc2626", startPct: 0, endPct: 16.66 },
  { label: "Faible", color: "#ea580c", startPct: 16.66, endPct: 33.33 },
  { label: "Moyen", color: "#f59e0b", startPct: 33.33, endPct: 50 },
  { label: "Bon", color: "#eab308", startPct: 50, endPct: 66.66 },
  { label: "Très bon", color: "#16a34a", startPct: 66.66, endPct: 83.33 },
  { label: "Optimal", color: "#84cc16", startPct: 83.33, endPct: 100 },
]

const TICK_PERCENTAGES = [
  { pct: 0, label: "0%" },
  { pct: 17, label: "17%" },
  { pct: 33, label: "33%" },
  { pct: 50, label: "50%" },
  { pct: 67, label: "67%" },
  { pct: 83, label: "83%" },
  { pct: 100, label: "100%" },
]

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  }
}

// Génère la trajectoire SVG d'un secteur d'anneau
function describeAnnularSector(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngleDeg: number,
  endAngleDeg: number,
) {
  const p1 = polarToCartesian(cx, cy, rOuter, startAngleDeg)
  const p2 = polarToCartesian(cx, cy, rOuter, endAngleDeg)
  const p3 = polarToCartesian(cx, cy, rInner, endAngleDeg)
  const p4 = polarToCartesian(cx, cy, rInner, startAngleDeg)

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 0 0 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 0 1 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ")
}

export function NeedleSpeedometerGauge({
  value,
  size = 280,
  className,
}: NeedleSpeedometerGaugeProps) {
  const uid = useId().replace(/:/g, "")
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  // Angle de l'aiguille : 0% = 180° (gauche), 100% = 0° (droite)
  const needleAngle = 180 - (pct / 100) * 180

  const width = size
  const height = size * 0.62
  const cx = width / 2
  const cy = height - 16

  const rOuter = size * 0.42
  const rInner = size * 0.24
  const rLabels = (rOuter + rInner) / 2
  const rTicks = rOuter + 14

  // Déterminer la zone active actuelle
  const activeZone = ZONES.find((z) => pct >= z.startPct && pct <= z.endPct) ?? ZONES[ZONES.length - 1]

  return (
    <div className={cn("relative flex flex-col items-center select-none", className)}>
      <svg
        viewBox={`0 0 ${width} ${height + 24}`}
        className="w-full max-w-[340px] overflow-visible"
      >
        <defs>
          <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
          </filter>
          <linearGradient id={`hubGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>
          <linearGradient id={`needleGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>

        {/* Secteurs de couleur en arc */}
        {ZONES.map((zone, idx) => {
          const startAngle = 180 - (zone.startPct / 100) * 180
          const endAngle = 180 - (zone.endPct / 100) * 180
          const midAngle = (startAngle + endAngle) / 2
          const labelPos = polarToCartesian(cx, cy, rLabels, midAngle)

          return (
            <g key={idx}>
              <path
                d={describeAnnularSector(cx, cy, rInner, rOuter, startAngle, endAngle)}
                fill={zone.color}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="transition-opacity duration-300 hover:opacity-90"
              />
              {/* Libellé de la zone à l'intérieur du secteur */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize={size * 0.034}
                fontWeight="700"
                className="pointer-events-none drop-shadow-xs"
                transform={`rotate(${90 - midAngle}, ${labelPos.x}, ${labelPos.y})`}
              >
                {zone.label}
              </text>
            </g>
          )
        })}

        {/* Graduations de pourcentage autour de l'arc */}
        {TICK_PERCENTAGES.map((tick, idx) => {
          const angle = 180 - (tick.pct / 100) * 180
          const tickPos = polarToCartesian(cx, cy, rTicks, angle)
          const lineStart = polarToCartesian(cx, cy, rOuter, angle)
          const lineEnd = polarToCartesian(cx, cy, rOuter + 5, angle)

          return (
            <g key={idx}>
              <line
                x1={lineStart.x}
                y1={lineStart.y}
                x2={lineEnd.x}
                y2={lineEnd.y}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <text
                x={tickPos.x}
                y={tickPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#64748b"
                fontSize={size * 0.038}
                fontWeight="700"
                className="font-sans"
              >
                {tick.label}
              </text>
            </g>
          )
        })}

        {/* Aiguille pivotante ultra-réaliste */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${180 - needleAngle}deg)`,
            transition: "transform 1.2s cubic-bezier(0.34, 1.3, 0.64, 1)",
          }}
        >
          {/* Lame conique de l'aiguille */}
          <polygon
            points={`
              ${cx - rOuter * 0.96},${cy}
              ${cx},${cy - 5.5}
              ${cx + 12},${cy}
              ${cx},${cy + 5.5}
            `}
            fill={`url(#needleGrad-${uid})`}
            filter={`url(#shadow-${uid})`}
          />
          {/* Ligne de reflet sur l'aiguille */}
          <line
            x1={cx - rOuter * 0.9}
            y1={cy}
            x2={cx}
            y2={cy}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeOpacity="0.6"
          />
        </g>

        {/* Moyeu central chromé / sombre 3D */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.08}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="2"
          filter={`url(#shadow-${uid})`}
        />
        <circle cx={cx} cy={cy} r={size * 0.06} fill={`url(#hubGrad-${uid})`} />
        <circle cx={cx - 2} cy={cy - 2} r={size * 0.02} fill="#ffffff" opacity="0.25" />
      </svg>

      {/* Résumé textuel sous le cadran (grand chiffre + statut compréhensible) */}
      <div className="-mt-1 flex flex-col items-center text-center">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="size-2 rounded-full shadow-xs"
            style={{ backgroundColor: activeZone.color }}
          />
          <span
            className="text-xs font-bold tracking-wide"
            style={{ color: activeZone.color }}
          >
            Rendement {activeZone.label}
          </span>
        </div>
      </div>
    </div>
  )
}
