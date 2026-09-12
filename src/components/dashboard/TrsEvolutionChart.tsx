import { useEffect, useState, useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { Activity, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { kpiApi } from "@/lib/api"
import type { PeriodeOEE, PointOEE } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

interface TrsEvolutionChartProps {
  ligneId: number | null
  trsGlobalActuel?: number | string
  disponibiliteActuelle?: number | string
  performanceActuelle?: number | string
  qualiteActuelle?: number | string
  className?: string
}

interface ChartPoint {
  time: string
  trs: number | null
  disponibilite: number | null
  performance: number | null
  qualite: number | null
}

function pourcent(v: string | number | null | undefined): number {
  const n = Number(v ?? 0)
  return Math.round(n <= 1 ? n * 100 : n)
}

export function TrsEvolutionChart({
  ligneId,
  trsGlobalActuel,
  disponibiliteActuelle,
  performanceActuelle,
  qualiteActuelle,
  className,
}: TrsEvolutionChartProps) {
  const [periode, setPeriode] = useState<PeriodeOEE>("day")
  const [history, setHistory] = useState<PointOEE[]>([])
  const [loading, setLoading] = useState(false)
  const { connected } = useWebSocket()

  // Charge l'historique TRS
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    kpiApi
      .oeeHistory(ligneId, periode)
      .then((points) => {
        if (!cancelled) setHistory(points)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ligneId, periode])

  // Transformation des données pour Chart.js
  const chartData: ChartPoint[] = useMemo(() => {
    if (history.length === 0) return []
    const mapped: ChartPoint[] = history.map((p) => ({
      time: p.label,
      trs: pourcent(p.trs),
      disponibilite: pourcent(p.disponibilite),
      performance: pourcent(p.performance),
      qualite: pourcent(p.qualite),
    }))

    // Si on est en vue "day", synchronisation du dernier point avec la valeur en temps réel
    if (periode === "day" && trsGlobalActuel != null && mapped.length > 0) {
      const lastIndex = mapped.length - 1
      mapped[lastIndex] = {
        ...mapped[lastIndex],
        trs: pourcent(trsGlobalActuel),
        disponibilite: pourcent(disponibiliteActuelle),
        performance: pourcent(performanceActuelle),
        qualite: pourcent(qualiteActuelle),
      }
    }
    return mapped
  }, [history, periode, trsGlobalActuel, disponibiliteActuelle, performanceActuelle, qualiteActuelle])

  // Labels pour l'axe X (même si aucune donnée, les repères temporels sont présents)
  const labels = useMemo(() => {
    if (chartData.length > 0) {
      return chartData.map((d) => d.time)
    }
    if (periode === "day") {
      return ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"]
    }
    if (periode === "week") {
      return ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    }
    return ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
  }, [chartData, periode])

  const chartDatasets = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "TRS Global",
          data: chartData.length > 0 ? chartData.map((d) => d.trs) : [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: chartData.length <= 15 ? 3 : 1.5,
          pointHoverRadius: 5,
          spanGaps: true,
        },
        {
          label: "Disponibilité",
          data: chartData.length > 0 ? chartData.map((d) => d.disponibilite) : [],
          borderColor: "#0ea5e9",
          borderDash: [4, 4],
          borderWidth: 1.5,
          fill: false,
          tension: 0.35,
          pointRadius: chartData.length <= 15 ? 2 : 0,
          pointHoverRadius: 4,
          spanGaps: true,
        },
        {
          label: "Performance",
          data: chartData.length > 0 ? chartData.map((d) => d.performance) : [],
          borderColor: "#f59e0b",
          borderDash: [4, 4],
          borderWidth: 1.5,
          fill: false,
          tension: 0.35,
          pointRadius: chartData.length <= 15 ? 2 : 0,
          pointHoverRadius: 4,
          spanGaps: true,
        },
        {
          label: "Qualité",
          data: chartData.length > 0 ? chartData.map((d) => d.qualite) : [],
          borderColor: "#8b5cf6",
          borderDash: [4, 4],
          borderWidth: 1.5,
          fill: false,
          tension: 0.35,
          pointRadius: chartData.length <= 15 ? 2 : 0,
          pointHoverRadius: 4,
          spanGaps: true,
        },
      ],
    }),
    [labels, chartData],
  )

  const chartOptions: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: chartData.length > 0,
          backgroundColor: "rgba(15, 23, 42, 0.94)",
          titleColor: "#f8fafc",
          bodyColor: "#e2e8f0",
          borderColor: "rgba(148, 163, 184, 0.25)",
          borderWidth: 1,
          padding: 8,
          boxPadding: 4,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label} : ${ctx.parsed.y}%`,
          },
        },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: "rgba(148, 163, 184, 0.1)",
          },
          ticks: {
            color: "#94a3b8",
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
          border: {
            display: false,
          },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: "#94a3b8",
            font: { size: 10 },
            callback: (val) => `${val}%`,
          },
          grid: {
            display: true,
            color: "rgba(148, 163, 184, 0.12)",
          },
          border: {
            display: false,
          },
        },
      },
    }),
    [chartData.length],
  )

  return (
    <div className={cn("flex flex-col rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="size-4 text-emerald-500 shrink-0" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground truncate">
            Évolution du TRS
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Badge temps réel */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors",
              connected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border/60 bg-muted/50 text-muted-foreground"
            )}
          >
            <Radio className={cn("size-2.5", connected && "animate-pulse text-emerald-500")} />
            {connected ? "Live IoT" : "Télémétrie"}
          </span>

          {/* Sélecteur de période */}
          <div className="inline-flex rounded-md border border-border/80 bg-muted/40 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setPeriode("day")}
              className={cn(
                "rounded px-2 py-0.5 transition-all",
                periode === "day" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              24h
            </button>
            <button
              type="button"
              onClick={() => setPeriode("week")}
              className={cn(
                "rounded px-2 py-0.5 transition-all",
                periode === "week" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              7 jours
            </button>
            <button
              type="button"
              onClick={() => setPeriode("month")}
              className={cn(
                "rounded px-2 py-0.5 transition-all",
                periode === "month" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              30 jours
            </button>
          </div>
        </div>
      </div>

      {/* Légende interactive compacte */}
      <div className="flex flex-wrap items-center gap-3 pt-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" />
          <strong className="text-foreground font-medium">TRS Global</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-sky-500" />
          Disponibilité
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500" />
          Performance
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-violet-500" />
          Qualité
        </span>
      </div>

      {/* Graphique Chart.js avec grille et axes toujours visibles */}
      <div className="relative mt-2 min-h-0 flex-1 w-full text-muted-foreground">
        <Line data={chartDatasets} options={chartOptions} />

        {chartData.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-lg border border-border/70 bg-card/85 px-3 py-1.5 text-xs text-muted-foreground shadow-xs backdrop-blur-xs">
              {loading ? "Chargement des métriques…" : "Aucune donnée de télémétrie sur la période"}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
