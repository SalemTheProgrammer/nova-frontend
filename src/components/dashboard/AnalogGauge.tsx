import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { DashboardResume } from "@/lib/types"

export interface RangeSegment {
  start: number
  end: number
  color: string
}

export interface AnalogGaugeProps {
  value: number // 0 to 100
  label: string
  caption?: string
  sublabel?: string
  ranges?: RangeSegment[]
  unit?: string
  className?: string
  statusText?: string
}

// Convert polar angle (degrees, 0 = 12 o'clock) to Cartesian coordinates (x, y)
function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  }
}

// Generates an SVG path for an annular sector (ribbon arc)
function describeArcSegment(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startDeg: number,
  endDeg: number
): string {
  const p1 = polarToCartesian(cx, cy, rOut, startDeg)
  const p2 = polarToCartesian(cx, cy, rOut, endDeg)
  const p3 = polarToCartesian(cx, cy, rIn, endDeg)
  const p4 = polarToCartesian(cx, cy, rIn, startDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    "Z",
  ].join(" ")
}

/**
 * Jauge analogique circulaire ultra-précise fidèle au modèle jQWidgets :
 * - Lunette métallique argentée biseautée
 * - Cadran circulaire blanc éclatant
 * - Bande d'arc de couleur (Range) jaune, orange, rouge
 * - Graduations majeures (numérotées 0, 20, 40, 60, 80, 100), moyennes et mineures
 * - Aiguille conique effilée orange avec moyeu central circulaire
 * - Légende sous le cadran ("Gauge caption") et valeur numérique
 */
export function AnalogGauge({
  value,
  label,
  caption,
  ranges,
  unit = "%",
  className,
}: AnalogGaugeProps) {
  // Clamp value between 0 and 100
  const clampedVal = Math.max(0, Math.min(100, isNaN(value) ? 0 : value))

  // Geometry configuration (260x260 viewBox)
  const cx = 130
  const cy = 130
  const startAngle = -135 // 7:30 clock position
  const totalSweep = 270 // 270 deg sweep ending at +135 deg (4:30 position)

  // Radii
  const rOuter = 126
  const rMid = 120
  const rInner = 114
  const rFace = 112
  const rRangeOut = 108
  const rRangeIn = 96
  const rTrack = 96 // track where ticks originate

  // Plages de couleur jQWidgets conformes :
  // Jaune entre 60 et 80, Vert entre 80 et 100
  const activeRanges = useMemo(() => {
    return (
      ranges ?? [
        { start: 60, end: 80, color: "#facc15" },
        { start: 80, end: 100, color: "#22c55e" },
      ]
    )
  }, [ranges])

  // Needles rotation angles
  const needleAngle = startAngle + (clampedVal / 100.0) * totalSweep

  // Generate ticks & scale numbers
  const { ticks, labels } = useMemo(() => {
    const tList: {
      type: "major" | "medium" | "minor"
      x1: number
      y1: number
      x2: number
      y2: number
    }[] = []

    const lList: {
      val: number
      x: number
      y: number
    }[] = []

    for (let i = 0; i <= 100; i += 2) {
      const ang = startAngle + (i / 100.0) * totalSweep
      const isMajor = i % 20 === 0
      const isMedium = i % 10 === 0 && !isMajor

      if (isMajor) {
        const p1 = polarToCartesian(cx, cy, rTrack, ang)
        const p2 = polarToCartesian(cx, cy, rTrack - 12, ang)
        tList.push({ type: "major", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })

        const lp = polarToCartesian(cx, cy, rTrack - 24, ang)
        lList.push({ val: i, x: lp.x, y: lp.y })
      } else if (isMedium) {
        const p1 = polarToCartesian(cx, cy, rTrack, ang)
        const p2 = polarToCartesian(cx, cy, rTrack - 8, ang)
        tList.push({ type: "medium", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
      } else {
        const p1 = polarToCartesian(cx, cy, rTrack, ang)
        const p2 = polarToCartesian(cx, cy, rTrack - 5, ang)
        tList.push({ type: "minor", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
      }
    }

    return { ticks: tList, labels: lList }
  }, [startAngle, totalSweep, cx, cy, rTrack])

  // Track arc path
  const trackPath = useMemo(() => {
    const p1 = polarToCartesian(cx, cy, rTrack, startAngle)
    const p2 = polarToCartesian(cx, cy, rTrack, startAngle + totalSweep)
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${rTrack} ${rTrack} 0 1 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }, [cx, cy, rTrack, startAngle, totalSweep])

  // Range arc paths
  const rangePaths = useMemo(() => {
    return activeRanges.map((r, idx) => {
      const sDeg = startAngle + (r.start / 100.0) * totalSweep
      const eDeg = startAngle + (r.end / 100.0) * totalSweep
      return {
        key: `range-${idx}`,
        d: describeArcSegment(cx, cy, rRangeIn, rRangeOut, sDeg, eDeg),
        color: r.color,
      }
    })
  }, [activeRanges, startAngle, totalSweep, cx, cy, rRangeIn, rRangeOut])

  const displayCaption = caption ?? label

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-2 sm:p-2.5 shadow-xs transition-all hover:border-border/80 hover:shadow-sm",
        className
      )}
      title={label ? `${label} : ${clampedVal.toFixed(1)}%` : undefined}
    >
      {/* Label centré unique pour la jauge (ex: TRS, PERFORMANCE, etc.) */}
      <h4 className="w-full text-center text-xs sm:text-[13px] font-bold tracking-wider uppercase text-foreground truncate pt-0.5 pb-0.5">
        {displayCaption}
      </h4>

      {/* Cadran SVG Analogique agrandi */}
      <div className="relative flex w-full max-w-[185px] sm:max-w-[205px] xl:max-w-[225px] items-center justify-center py-0.5">
        <svg
          viewBox="0 0 260 260"
          className="h-auto w-full select-none overflow-visible drop-shadow-xs"
          style={{ maxHeight: "185px" }}
        >
          {/* Lunette métallique extérieure biseautée (argentée / chromée) */}
          <circle cx={cx} cy={cy} r={rOuter} fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={rMid} fill="#e2e8f0" />
          <circle cx={cx} cy={cy} r={rInner} fill="#cbd5e1" />

          {/* Cadran blanc éclatant */}
          <circle cx={cx} cy={cy} r={rFace} fill="#ffffff" />

          {/* Bandes de couleur (Ranges) */}
          {rangePaths.map((rp) => (
            <path key={rp.key} d={rp.d} fill={rp.color} />
          ))}

          {/* Ligne d'arc de délimitation (Border) */}
          <path d={trackPath} fill="none" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />

          {/* Tiques de graduation */}
          {ticks.map((t, idx) => (
            <line
              key={`tick-${idx}`}
              x1={t.x1.toFixed(2)}
              y1={t.y1.toFixed(2)}
              x2={t.x2.toFixed(2)}
              y2={t.y2.toFixed(2)}
              stroke={t.type === "major" ? "#334155" : t.type === "medium" ? "#64748b" : "#94a3b8"}
              strokeWidth={t.type === "major" ? 1.7 : t.type === "medium" ? 1.2 : 0.9}
              strokeLinecap="round"
            />
          ))}

          {/* Chiffres d'échelle (0, 20, 40, 60, 80, 100) */}
          {labels.map((l) => (
            <text
              key={`lbl-${l.val}`}
              x={l.x.toFixed(2)}
              y={l.y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#1e293b"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="12.5"
              fontWeight="700"
            >
              {l.val}
            </text>
          ))}

          {/* Valeur numérique intégrée sous le moyeu */}
          <text
            x={cx}
            y="180"
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize="22"
            fontWeight="800"
            fill="#0f172a"
          >
            {clampedVal.toFixed(1)}
            {unit}
          </text>

          {/* Aiguille conique principale (orange vif jQWidgets) */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Tige de l'aiguille effilée */}
            <polygon
              points={`${cx - 3.4},${cy} ${cx},${cy - 85} ${cx + 3.4},${cy}`}
              fill="#ea580c"
            />
            <line x1={cx} y1={cy} x2={cx} y2={cy - 85} stroke="#c2410c" strokeWidth="0.8" />
          </g>

          {/* Moyeu central circulaire orange avec cerclage */}
          <circle cx={cx} cy={cy} r={7.5} fill="#ea580c" stroke="#c2410c" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={2.5} fill="#ffedd5" />
        </svg>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Groupe des 4 Jauges Alignées : TRS, Disponibilité, Performance, TRG/TRE
// -----------------------------------------------------------------------------

function parsePct(v: string | number | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === "number" ? v : parseFloat(v)
  if (isNaN(n)) return 0
  return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10
}

interface AnalogGaugesRowProps {
  resume: DashboardResume | null
  className?: string
}

export function AnalogGaugesRow({ resume, className }: AnalogGaugesRowProps) {
  // 1. TRS Global
  const trsVal = parsePct(resume?.trs_global ?? resume?.trs_detail?.trs)

  // 2. Disponibilité Opérationnelle (DO)
  const dispoVal = parsePct(resume?.disponibilite ?? resume?.trs_detail?.do)

  // 3. Performance (TP)
  const perfVal = parsePct(resume?.performance ?? resume?.trs_detail?.tp)

  // 4. TRG & TRE (AFNOR NF E60-182)
  // TRG = TRS * Taux de charge
  // TRE = TRG * Taux d'engagement
  const tauxCharge = resume?.taux_charge ? parseFloat(resume.taux_charge) : 0.95
  const tauxEngage = resume?.taux_engagement ? parseFloat(resume.taux_engagement) : 0.88

  const trgVal =
    resume?.trs_detail?.trg != null
      ? parsePct(resume.trs_detail.trg)
      : Math.round(trsVal * (tauxCharge <= 1 ? tauxCharge : tauxCharge / 100) * 10) / 10

  const treVal =
    resume?.trs_detail?.tre != null
      ? parsePct(resume.trs_detail.tre)
      : Math.round(trgVal * (tauxEngage <= 1 ? tauxEngage : tauxEngage / 100) * 10) / 10

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 xl:gap-3 items-stretch", className)}>
      {/* 1. Jauge TRS */}
      <AnalogGauge value={trsVal} label="TRS" caption="TRS" />

      {/* 2. Jauge Disponibilité */}
      <AnalogGauge value={dispoVal} label="Disponibilité" caption="DISPONIBILITÉ" />

      {/* 3. Jauge Performance */}
      <AnalogGauge value={perfVal} label="Performance" caption="PERFORMANCE" />

      {/* 4. Jauge TRG */}
      <AnalogGauge value={trgVal} label="TRG" caption="TRG" />

      {/* 5. Jauge TRE */}
      <AnalogGauge value={treVal} label="TRE" caption="TRE" />
    </div>
  )
}
