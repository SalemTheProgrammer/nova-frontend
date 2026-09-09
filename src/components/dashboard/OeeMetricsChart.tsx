import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { kpiApi } from "@/lib/api"
import type { PeriodeOEE, PointOEE } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

const ONGLETS: { value: PeriodeOEE; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
]

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const val = payload[0].value
    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-2 shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
        <p className="text-sm font-extrabold text-foreground font-mono mt-0.5">
          {val != null ? `${val}%` : "—"}
        </p>
        <div className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="size-1 rounded-full bg-emerald-500" />
          <span>Objectif : 74%</span>
        </div>
      </div>
    )
  }
  return null
}

/** Tendance du TRS compacte pour 100vh */
export function OeeMetricsChart({ ligneId }: { ligneId: number | null }) {
  const [periode, setPeriode] = useState<PeriodeOEE>("week")
  const [points, setPoints] = useState<PointOEE[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    kpiApi
      .oeeHistory(ligneId, periode)
      .then((result) => {
        if (!cancelled) setPoints(result)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ligneId, periode])

  const rows = points.map((point) => ({
    label: point.label,
    TRS: point.trs === null ? null : Math.round(Number(point.trs) * 100),
  }))

  return (
    <Card className="flex h-full min-h-0 flex-col justify-between p-3.5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Télémétrie Temporelle
            </h3>
            <p className="text-[10px] text-muted-foreground">Historique TRS vs Seuil 74%</p>
          </div>
        </div>

        {/* Sélecteur de période compact */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5 border border-border/50">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.value}
              type="button"
              onClick={() => setPeriode(onglet.value)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all",
                periode === onglet.value
                  ? "bg-violet-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {onglet.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 pt-1">
        {!loading && rows.length === 0 ? (
          <EmptyState message="Aucune donnée sur cette période." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTrsCompact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={32}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={74}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "74%",
                  fill: "#10b981",
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
              <Area
                type="monotone"
                dataKey="TRS"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTrsCompact)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
