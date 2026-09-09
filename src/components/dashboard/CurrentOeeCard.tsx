import { useEffect, useState } from "react"
import {
  Activity,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { kpiApi } from "@/lib/api"
import { Card } from "@/components/dashboard/primitives"

const OBJECTIF_TRS = 0.74

function ModernRadialGauge({
  value,
  target = OBJECTIF_TRS,
}: {
  value: number
  target?: number
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const percent = Math.round(pct * 100)
  const size = 106
  const strokeWidth = 9
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - pct * circumference

  const isGood = pct >= target
  const strokeColor = isGood ? "url(#trsGradientGood)" : "url(#trsGradientWarn)"

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="trsGradientGood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="trsGradientWarn" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {/* Piste de fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/40"
        />
        {/* Anneau de progression */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Valeur centrale */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black tracking-tight text-foreground font-mono">
          {percent}%
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          TRS Global
        </span>
      </div>
    </div>
  )
}

function FactorBar({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof Zap
  color: string
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const percent = Math.round(pct * 100)

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-2.5 py-1.5 transition-all hover:bg-muted/40">
      <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs", color)}>
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs leading-none mb-1">
          <span className="font-semibold text-foreground truncate text-[11px]">{label}</span>
          <span className="font-mono font-bold text-foreground tabular-nums text-xs">{percent}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", color.replace("text-", "bg-"))}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/** Vue synthétique moderne du TRS 100vh compacte et percutante */
export function CurrentOeeCard({
  trsGlobal,
  disponibilite,
  performance,
  qualite,
  ligneId,
}: {
  trsGlobal: number
  disponibilite: number
  performance: number
  qualite: number
  ligneId: number | null
}) {
  const [delta, setDelta] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    kpiApi
      .oeeHistory(ligneId, "week")
      .then((points) => {
        if (cancelled || points.length < 2) return
        const avantDernier = points[points.length - 2]
        const dernier = points[points.length - 1]
        if (avantDernier.trs === null || dernier.trs === null) return
        const hier = Number(avantDernier.trs)
        const aujourdhui = Number(dernier.trs)
        setDelta((aujourdhui - hier) * 100)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ligneId])

  return (
    <Card className="flex h-full min-h-0 flex-col justify-between p-3.5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between gap-2 shrink-0 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Activity className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Performance OEE
            </h3>
            <p className="text-[10px] text-muted-foreground">TRS & 3 Facteurs de Rendement</p>
          </div>
        </div>
        {delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              delta >= 0
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 text-red-600 dark:text-red-400",
            )}
          >
            {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-4 py-1">
        {/* Cadran Radial */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <ModernRadialGauge value={trsGlobal} target={OBJECTIF_TRS} />
          <span className="mt-1 text-[10px] font-medium text-muted-foreground">
            Cible : <strong className="text-foreground">{Math.round(OBJECTIF_TRS * 100)}%</strong>
          </span>
        </div>

        {/* 3 Facteurs D/P/Q */}
        <div className="flex min-h-0 flex-1 flex-col justify-center space-y-1.5">
          <FactorBar
            label="Disponibilité"
            value={disponibilite}
            icon={Zap}
            color="text-indigo-500"
          />
          <FactorBar
            label="Performance"
            value={performance}
            icon={Activity}
            color="text-violet-500"
          />
          <FactorBar
            label="Qualité"
            value={qualite}
            icon={ShieldCheck}
            color="text-emerald-500"
          />
        </div>
      </div>
    </Card>
  )
}
