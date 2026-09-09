import { cn } from "@/lib/utils"

interface SegmentedBlockGaugeProps {
  value: number // Pourcentage (ex: 67.2)
  label?: string // Sous-titre (ex: "Objectif Ligne" ou "Rendement Global")
  totalBlocks?: number // 14 blocs comme sur l'image
  color?: string // Couleur active (orange #ea580c comme sur l'image)
  inactiveColor?: string // Couleur inactive (#f1f5f9)
  size?: number
  className?: string
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  }
}

export function SegmentedBlockGauge({
  value,
  label = "Rendement Global",
  totalBlocks = 14,
  color = "#ea580c",
  inactiveColor = "#f1f5f9",
  size = 280,
  className,
}: SegmentedBlockGaugeProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const activeCount = Math.round((pct / 100) * totalBlocks)

  const width = size
  const height = size * 0.58
  const cx = width / 2
  const cy = height - 10

  const rOuter = size * 0.44
  const rInner = size * 0.28

  const totalAngle = 180
  const anglePerBlock = totalAngle / totalBlocks
  const gapAngle = 3.2 // Espacement angulaire entre les blocs

  // Génère les 14 blocs semi-circulaires
  const blocks = Array.from({ length: totalBlocks }, (_, i) => {
    // De gauche (180°) vers la droite (0°)
    const startAngle = 180 - (i * anglePerBlock + gapAngle / 2)
    const endAngle = 180 - ((i + 1) * anglePerBlock - gapAngle / 2)

    const p1 = polarToCartesian(cx, cy, rInner, startAngle)
    const p2 = polarToCartesian(cx, cy, rOuter, startAngle)
    const p3 = polarToCartesian(cx, cy, rOuter, endAngle)
    const p4 = polarToCartesian(cx, cy, rInner, endAngle)

    // Trajectoire en arc avec coins arrondis
    const d = [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${rOuter} ${rOuter} 0 0 0 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${rInner} ${rInner} 0 0 1 ${p1.x} ${p1.y}`,
      "Z",
    ].join(" ")

    const isActive = i < activeCount

    return {
      index: i,
      d,
      isActive,
    }
  })

  return (
    <div className={cn("relative flex flex-col items-center select-none", className)}>
      <svg
        viewBox={`0 0 ${width} ${height + 10}`}
        className="w-full max-w-[320px] overflow-visible"
      >
        <defs>
          <filter id="blockShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#ea580c" floodOpacity="0.25" />
          </filter>
        </defs>

        {blocks.map((block) => (
          <path
            key={block.index}
            d={block.d}
            fill={block.isActive ? color : inactiveColor}
            stroke={block.isActive ? color : inactiveColor}
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={block.isActive ? "url(#blockShadow)" : undefined}
            className={cn(
              "transition-all duration-500",
              !block.isActive && "dark:fill-zinc-800/80 dark:stroke-zinc-800/80",
            )}
          />
        ))}
      </svg>

      {/* Chiffre et libellé au centre (comme sur l'image de référence) */}
      <div className="-mt-8 sm:-mt-10 flex flex-col items-center text-center pointer-events-none z-10">
        <span className="font-sans text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
          {pct.toFixed(1)}%
        </span>
        <span className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          {label}
        </span>
      </div>
    </div>
  )
}
