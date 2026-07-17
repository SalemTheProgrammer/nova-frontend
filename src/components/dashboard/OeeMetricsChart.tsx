import { useEffect, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { kpiApi } from "@/lib/api"
import type { PeriodeOEE, PointOEE } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

const ONGLETS: { value: PeriodeOEE; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
]

/** Tendance du TRS : le détail D/P/Q est déjà visible dans la carte voisine. */
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
    <Card className="dashboard-panel flex h-full min-h-0 flex-col p-3 shadow-sm xl:p-4">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground/90">Évolution du TRS</p>
          <p className="dashboard-card-subtitle mt-0.5 text-xs text-muted-foreground">
            Tendance par rapport à l'objectif de 74%
          </p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.value}
              type="button"
              onClick={() => setPeriode(onglet.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                periode === onglet.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {onglet.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {!loading && rows.length === 0 ? (
          <EmptyState message="Aucune donnée sur cette période." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 14, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
                unit="%"
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value) => `${value}%`}
              />
              <ReferenceLine
                y={74}
                stroke="#a1a1aa"
                strokeDasharray="5 5"
                label={{ value: "Objectif", fill: "#71717a", fontSize: 10 }}
              />
              <Line
                dataKey="TRS"
                stroke="#7c3aed"
                strokeWidth={3}
                dot={{ r: 3, fill: "#7c3aed" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
