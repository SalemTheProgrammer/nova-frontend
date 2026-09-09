import { useId } from "react"
import { cn } from "@/lib/utils"

interface NotchedRadialGaugeProps {
  value: number // Valeur numérique brute (ex. 219 ou 456)
  min?: number
  max?: number
  unit: string
  label?: string
  accentColor?: string // ex: "#f43f5e" ou "#f59e0b"
  glowColor?: string
  totalTicks?: number
  size?: number
  className?: string
}

export function NotchedRadialGauge({
  value,
  min = 0,
  max = 500,
  unit,
  accentColor = "#f43f5e",
  glowColor,
  totalTicks = 36,
  size = 145,
  className,
}: NotchedRadialGaugeProps) {
  const uid = useId().replace(/:/g, "")
  const clamped = Math.max(min, Math.min(max, value))
  const ratio = max > min ? (clamped - min) / (max - min) : 0
  const activeTicksCount = Math.round(ratio * totalTicks)

  // Coordonnées du centre et rayons proportionnels
  const cx = size / 2
  const cy = size / 2 + 4
  const outerR = size * 0.44
  const innerR = size * 0.32
  const tickStrokeWidth = Math.max(2, size * 0.02)

  // Balayage d'arc 245° horaire (du bas-gauche au bas-droite)
  const sweepAngle = 245

  const ticks = Array.from({ length: totalTicks }, (_, i) => {
    const t = i / (totalTicks - 1)
    const angle = (147.5 + t * sweepAngle) * (Math.PI / 180)
    const x1 = cx + innerR * Math.cos(angle)
    const y1 = cy + innerR * Math.sin(angle)
    const x2 = cx + outerR * Math.cos(angle)
    const y2 = cy + outerR * Math.sin(angle)
    const isActive = i <= activeTicksCount

    return {
      index: i,
      x1,
      y1,
      x2,
      y2,
      isActive,
    }
  })

  return (
    <div className={cn("relative flex flex-col items-center justify-center select-none h-full w-full", className)}>
      <svg
        viewBox={`0 0 ${size} ${size * 0.84}`}
        className="w-full h-full max-h-[115px] overflow-visible"
      >
        <defs>
          <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {ticks.map((tick) => (
          <line
            key={tick.index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isActive ? accentColor : "currentColor"}
            strokeWidth={tickStrokeWidth}
            strokeLinecap="round"
            className={cn(
              "transition-colors duration-300",
              tick.isActive
                ? "opacity-100"
                : "text-slate-200 dark:text-zinc-800 opacity-70",
            )}
            style={
              tick.isActive && glowColor
                ? { filter: `drop-shadow(0 0 3px ${glowColor})` }
                : undefined
            }
          />
        ))}
      </svg>

      {/* Affichage numérique central */}
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
          {Math.round(value)}
          {unit.includes("°") ? "°" : ""}
        </span>
        <span className="mt-0.5 text-[10px] font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase font-mono">
          {unit.replace("°", "").trim()}
        </span>
      </div>
    </div>
  )
}
