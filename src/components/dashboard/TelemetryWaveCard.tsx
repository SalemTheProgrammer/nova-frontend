import { useId } from "react"
import { cn } from "@/lib/utils"

interface TelemetryWaveCardProps {
  title: string
  value: string | number
  unit: string
  waveColor?: string // défaut cyan #0ea5e9
  wavePoints?: number[]
  statusDot?: boolean
  statusColor?: string
  className?: string
}

export function TelemetryWaveCard({
  title,
  value,
  unit,
  waveColor = "#0ea5e9",
  wavePoints = [40, 55, 35, 60, 48, 75, 45, 68, 52, 60, 45, 55, 70, 48, 62],
  statusDot,
  statusColor = "#10b981",
  className,
}: TelemetryWaveCardProps) {
  const uid = useId().replace(/:/g, "")
  const width = 260
  const height = 48

  const n = wavePoints.length
  const stepX = width / (n - 1)
  const coords = wavePoints.map((val, i) => ({
    x: i * stepX,
    y: height - (val / 100) * (height - 8) - 4,
  }))

  let linePath = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i]
    const next = coords[i + 1]
    const cpX = (current.x + next.x) / 2
    linePath += ` C ${cpX} ${current.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`
  }

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/85 bg-white p-2.5 sm:p-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-900/90",
        className,
      )}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between gap-1.5 shrink-0">
        <span className="text-[10px] sm:text-[10.5px] font-bold tracking-wider text-slate-500 uppercase font-mono truncate dark:text-zinc-400">
          {title}
        </span>
        {statusDot && (
          <span
            className="size-1.5 rounded-full animate-pulse shrink-0"
            style={{ backgroundColor: statusColor }}
          />
        )}
      </div>

      {/* Mesure principale */}
      <div className="my-0.5 z-10 flex items-baseline gap-1.5">
        <span className="font-mono text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
          {value}
        </span>
        <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 font-mono">
          {unit}
        </span>
      </div>

      {/* Courbe sparkline intégrée au bas de la carte */}
      <div className="relative -mx-3 -mb-3 h-10 sm:h-11 w-[calc(100%+1.5rem)] overflow-hidden pointer-events-none shrink-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id={`sparkFill-${uid}`} x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor={waveColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={waveColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill={`url(#sparkFill-${uid})`} />
          <path
            d={linePath}
            fill="none"
            stroke={waveColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
