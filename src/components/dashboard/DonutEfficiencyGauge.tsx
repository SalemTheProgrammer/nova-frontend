import { useId } from "react"
import { cn } from "@/lib/utils"

interface DonutEfficiencyGaugeProps {
  percentage: number // 0 à 100
  size?: number
  strokeWidth?: number
  accentColor?: string // défaut cyan #06b6d4 / #0ea5e9
  className?: string
}

export function DonutEfficiencyGauge({
  percentage,
  size = 120,
  strokeWidth = 9,
  accentColor = "#06b6d4",
  className,
}: DonutEfficiencyGaugeProps) {
  const uid = useId().replace(/:/g, "")
  const pct = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className={cn("relative flex items-center justify-center select-none h-full w-full", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full max-h-[115px] transform -rotate-90 overflow-visible"
      >
        <defs>
          <linearGradient id={`donutGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <filter id={`donutGlow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Piste de fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-100 dark:text-zinc-800/80"
        />

        {/* Halo de lueur */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#donutGrad-${uid})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          filter={`url(#donutGlow-${uid})`}
          className="opacity-30 transition-all duration-1000 ease-out"
        />

        {/* Progression active */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#donutGrad-${uid})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Valeur centrale */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
          {Math.round(pct)}
          <span className="text-lg font-bold ml-0.5 text-slate-600 dark:text-zinc-400">%</span>
        </span>
      </div>
    </div>
  )
}
