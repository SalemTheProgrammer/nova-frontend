import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { AgentArtifact } from "@/lib/types"

/** Spec générique renvoyée par l'outil `generer_graphique` du backend. */
export interface ChartSpec {
  chart_type: "line" | "bar" | "area" | "pie"
  title: string
  unit?: string | null
  series: { name: string; data: { x: string | number; y: number }[] }[]
}

const PALETTE = ["#2563eb", "#f97316", "#10b981", "#a855f7", "#e11d48", "#eab308"]

/** Fusionne les séries {x,y} en lignes Recharts : [{x, [nom1]: y, [nom2]: y}]. */
function fusionnerSeries(series: ChartSpec["series"]) {
  const parX = new Map<string | number, Record<string, string | number>>()
  for (const s of series) {
    for (const p of s.data) {
      const row = parX.get(p.x) ?? { x: p.x }
      row[s.name] = p.y
      parX.set(p.x, row)
    }
  }
  return [...parX.values()]
}

export function ChartCard({ artifact }: { artifact: AgentArtifact }) {
  const spec = artifact as unknown as ChartSpec
  const rows = useMemo(() => fusionnerSeries(spec.series ?? []), [spec.series])
  if (!spec.series?.length) return null

  const multi = spec.series.length > 1
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
      <XAxis dataKey="x" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} unit={spec.unit ?? undefined} />
      <Tooltip
        contentStyle={{ fontSize: 12, borderRadius: 8 }}
        formatter={(v) => `${v}${spec.unit ?? ""}`}
      />
      {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  )

  let corps: React.ReactElement
  switch (spec.chart_type) {
    case "bar":
      corps = (
        <BarChart data={rows}>
          {axes}
          {spec.series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      )
      break
    case "area":
      corps = (
        <AreaChart data={rows}>
          {axes}
          {spec.series.map((s, i) => (
            <Area
              key={s.name}
              dataKey={s.name}
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      )
      break
    case "pie": {
      const points = spec.series[0].data
      corps = (
        <PieChart>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Pie data={points} dataKey="y" nameKey="x" innerRadius="45%" paddingAngle={2}>
            {points.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      )
      break
    }
    default:
      corps = (
        <LineChart data={rows}>
          {axes}
          {spec.series.map((s, i) => (
            <Line
              key={s.name}
              dataKey={s.name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2.5}
              dot={false}
            />
          ))}
        </LineChart>
      )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-3 py-2">
        <span className="text-xs font-semibold">{spec.title}</span>
      </div>
      <div className="h-56 px-2 py-3">
        <ResponsiveContainer width="100%" height="100%">
          {corps}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
