import { useState, useMemo, useEffect } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js"
import { Bar, Doughnut, Line } from "react-chartjs-2"
import {
  CheckCircle2,
  AlertTriangle,
  Filter,
  Cpu,
  RefreshCw,
  Activity,
  ClipboardList,
  ShieldCheck,
} from "lucide-react"
import { qualiteApi, machinesApi, ordresApi } from "@/lib/api"
import type { QualityEventRead, QualiteResume, Machine, OrdreFabrication, CauseRebut } from "@/lib/types"
import { CAUSES_REBUT } from "@/lib/types"
import { cn } from "@/lib/utils"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// Couleurs significatives et intuitives de qualité
const CAUSE_REBUT_META: Record<string, { label: string; hex: string; bg: string }> = {
  DEFAUT_DIMENSIONNEL: { label: "Mauvaise dimension", hex: "#2563eb", bg: "#2563eb" },
  DEFAUT_VISUEL: { label: "Défaut d'aspect", hex: "#7c3aed", bg: "#7c3aed" },
  MAUVAIS_REGLAGE: { label: "Mauvais réglage", hex: "#ea580c", bg: "#ea580c" },
  DEFAUT_MATIERE: { label: "Matière défectueuse", hex: "#d97706", bg: "#d97706" },
  ERREUR_OPERATEUR: { label: "Erreur manipulation", hex: "#b45309", bg: "#b45309" },
  PROBLEME_MACHINE: { label: "Problème machine", hex: "#dc2626", bg: "#dc2626" },
  NON_CONFORMITE_PROCESS: { label: "Écart recette BPF", hex: "#991b1b", bg: "#991b1b" },
  AUTRE: { label: "Autre défaut", hex: "#475569", bg: "#475569" },
}

function getRebutMeta(cause: string) {
  return CAUSE_REBUT_META[cause] ?? {
    label: cause.replace(/_/g, " ").toLowerCase(),
    hex: "#4f46e5",
    bg: "#4f46e5",
  }
}

function parseSafeDate(dateStr: string): Date {
  return new Date(dateStr.replace(" ", "T"))
}

export function QualitePage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [ordres, setOrdres] = useState<OrdreFabrication[]>([])
  const [resume, setResume] = useState<QualiteResume | null>(null)
  const [events, setEvents] = useState<QualityEventRead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filtres
  const [machineId, setMachineId] = useState<number | "ALL">("ALL")
  const [selectedCause, setSelectedCause] = useState<CauseRebut | "ALL">("ALL")
  const [selectedOfId, setSelectedOfId] = useState<number | "ALL">("ALL")
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all")

  useEffect(() => {
    let active = true
    setLoading(true)

    const mIdParam = machineId === "ALL" ? undefined : machineId

    Promise.all([
      machinesApi.list().catch(() => [] as Machine[]),
      ordresApi.list().catch(() => [] as OrdreFabrication[]),
      qualiteApi.resume(mIdParam).catch(() => null),
      qualiteApi.evenements(mIdParam, 1000).catch(() => [] as QualityEventRead[]),
    ]).then(([mList, oList, resData, evtList]) => {
      if (!active) return
      setMachines(mList)
      setOrdres(oList)
      setResume(resData)
      setEvents(evtList)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [refreshKey, machineId])

  // Filtrage des événements selon la cause, l'OF et la période sélectionnés
  const filteredEvents = useMemo(() => {
    const nowMs = Date.now()
    const daysLimit = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : null

    return events.filter((e) => {
      if (selectedCause !== "ALL" && e.cause !== selectedCause) return false
      if (selectedOfId !== "ALL" && e.ordre_fabrication_id !== selectedOfId) return false
      if (daysLimit !== null && e.created_at) {
        const itemTime = parseSafeDate(e.created_at).getTime()
        if (!isNaN(itemTime) && nowMs - itemTime > daysLimit * 24 * 3600 * 1000) {
          return false
        }
      }
      return true
    })
  }, [events, selectedCause, selectedOfId, timeRange])

  // Calcul des statistiques
  const stats = useMemo(() => {
    // Si aucun filtre spécifique OF/Cause/Période n'est actif, on utilise les agrégats complets du résumé
    const isGlobal = selectedCause === "ALL" && selectedOfId === "ALL" && timeRange === "all"

    let bonnes = 0
    let rebuts = 0
    const causesCount: Record<string, number> = {}
    const machineRebuts: Record<string, number> = {}

    if (isGlobal && resume) {
      bonnes = resume.quantite_bonne
      rebuts = resume.quantite_rejetee
      Object.assign(causesCount, resume.causes)
    } else {
      filteredEvents.forEach((e) => {
        if (e.type === "BONNE") {
          bonnes += e.quantite
        } else {
          rebuts += e.quantite
          if (e.cause) {
            causesCount[e.cause] = (causesCount[e.cause] || 0) + e.quantite
          }
        }
      })
    }

    // Répartition par machine basée sur les événements
    events.forEach((e) => {
      if (e.type === "REBUT") {
        if (selectedCause !== "ALL" && e.cause !== selectedCause) return
        if (selectedOfId !== "ALL" && e.ordre_fabrication_id !== selectedOfId) return
        const mCode = e.code_machine || `M-${e.machine_id}`
        machineRebuts[mCode] = (machineRebuts[mCode] || 0) + e.quantite
      }
    })

    const total = bonnes + rebuts
    const tauxRebutPct = total > 0 ? ((rebuts / total) * 100).toFixed(1) : "0.0"
    const tauxConformePct = total > 0 ? ((bonnes / total) * 100).toFixed(1) : "100.0"

    // Cause N°1
    let topCause = "Aucun"
    let topCauseCount = 0
    Object.entries(causesCount).forEach(([c, cnt]) => {
      if (cnt > topCauseCount) {
        topCauseCount = cnt
        topCause = getRebutMeta(c).label
      }
    })
    const topCausePct = rebuts > 0 ? Math.round((topCauseCount / rebuts) * 100) : 0

    return {
      bonnes,
      rebuts,
      total,
      tauxRebutPct,
      tauxConformePct,
      topCause,
      topCausePct,
      causesCount,
      machineRebuts,
    }
  }, [resume, filteredEvents, events, selectedCause, selectedOfId])

  // 1. Dataset : Pourquoi on jette les pièces ? (Causes principales de rebut)
  const causesChartData = useMemo(() => {
    const sorted = Object.entries(stats.causesCount)
      .map(([cause, count]) => ({
        cause,
        label: getRebutMeta(cause).label,
        count,
        hex: getRebutMeta(cause).hex,
        bg: getRebutMeta(cause).bg,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      labels: sorted.map((s) => s.label),
      datasets: [
        {
          label: "Pièces rejetées",
          data: sorted.map((s) => s.count),
          backgroundColor: sorted.map((s) => s.bg),
          borderColor: "#000000",
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 24,
        },
      ],
    }
  }, [stats.causesCount])

  // 2. Dataset : Part des pièces bonnes vs rebuts (% Doughnut)
  const conformiteChartData = useMemo(() => {
    return {
      labels: ["Pièces conformes", "Pièces rejetées"],
      datasets: [
        {
          data: [stats.bonnes, stats.rebuts],
          backgroundColor: ["#16a34a", "#dc2626"],
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }
  }, [stats.bonnes, stats.rebuts])

  // 3. Dataset : Quelles machines fabriquent le plus de rebuts ?
  const machineChartData = useMemo(() => {
    const entries = (machines.length > 0 ? machines.map((m) => m.code) : Object.keys(stats.machineRebuts))
      .map((code) => ({
        code,
        count: stats.machineRebuts[code] || 0,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      labels: entries.map((e) => e.code),
      datasets: [
        {
          label: "Pièces rejetées",
          data: entries.map((e) => e.count),
          backgroundColor: "#ea580c",
          borderColor: "#c2410c",
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 34,
        },
      ],
    }
  }, [machines, stats.machineRebuts])

  // 4. Dataset : Évolution des rebuts jour par jour
  const trendChartData = useMemo(() => {
    const dailyRebuts: Record<string, number> = {}

    if (timeRange === "7d") {
      const d = new Date()
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(d)
        dayDate.setDate(d.getDate() - i)
        const key = dayDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
        dailyRebuts[key] = 0
      }
    } else if (timeRange === "30d") {
      const d = new Date()
      for (let i = 29; i >= 0; i--) {
        const dayDate = new Date(d)
        dayDate.setDate(d.getDate() - i)
        const key = dayDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
        dailyRebuts[key] = 0
      }
    }

    filteredEvents.forEach((e) => {
      if (e.type !== "REBUT" || !e.created_at) return
      const dtDate = parseSafeDate(e.created_at)
      if (isNaN(dtDate.getTime())) return
      const key = dtDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
      dailyRebuts[key] = (dailyRebuts[key] || 0) + e.quantite
    })

    const keys = Object.keys(dailyRebuts)
    if (timeRange === "all") {
      keys.sort((a, b) => {
        const [da, ma] = a.split("/").map(Number)
        const [db, mb] = b.split("/").map(Number)
        return (ma - mb) || (da - db)
      })
    }

    return {
      labels: keys,
      datasets: [
        {
          label: "Pièces rejetées",
          data: keys.map((k) => dailyRebuts[k]),
          fill: true,
          backgroundColor: "rgba(220, 38, 38, 0.15)",
          borderColor: "#dc2626",
          borderWidth: 3,
          tension: 0.3,
          pointBackgroundColor: "#dc2626",
          pointBorderColor: "#000000",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [filteredEvents, timeRange])

  // ================= OPTIONS CHART.JS AVEC LABELS GRANDS, NOIRS ET SANS INCLINAISON =================
  const horizontalBarOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#000000",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 13, weight: "bold" },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${Number(ctx.raw).toLocaleString()} pièces rejetées`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.08)" },
        ticks: {
          color: "#000000",
          font: { size: 12, weight: "bold" },
          maxRotation: 0,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#000000",
          font: { size: 12, weight: "bold" },
        },
      },
    },
  }

  const verticalBarOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#000000",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 13, weight: "bold" },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${Number(ctx.raw).toLocaleString()} pièces rejetées`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#000000",
          font: { size: 12, weight: "bold" },
          maxRotation: 0,
        },
      },
      y: {
        grid: { color: "rgba(0, 0, 0, 0.08)" },
        ticks: {
          color: "#000000",
          font: { size: 12, weight: "bold" },
        },
      },
    },
  }

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#000000",
          font: { size: 12, weight: "bold" },
          boxWidth: 12,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: "#000000",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 13, weight: "bold" },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const total = stats.total || 1
            const pct = ((Number(ctx.raw) / total) * 100).toFixed(1)
            return ` ${ctx.label} : ${Number(ctx.raw).toLocaleString()} pièces (${pct}%)`
          },
        },
      },
    },
  }

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#000000",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 13, weight: "bold" },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${Number(ctx.raw).toLocaleString()} pièces rejetées`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.08)" },
        ticks: {
          color: "#000000",
          font: { size: 12, weight: "bold" },
          maxRotation: 0,
        },
      },
      y: {
        grid: { color: "rgba(0, 0, 0, 0.08)" },
        ticks: {
          color: "#000000",
          font: { size: 12, weight: "bold" },
        },
      },
    },
  }

  return (
    <div className="h-full w-full min-h-0 flex flex-col p-3 sm:p-4 gap-2.5 overflow-hidden select-none bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ----------------- EN-TÊTE SANS ICÔNE NI BADGE (SHRINK-0) ----------------- */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-zinc-300 dark:border-zinc-800">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-black dark:text-white leading-none">
            Contrôle Qualité & Rejets
          </h1>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1">
            Suivi visuel des pièces bonnes, des défauts et des rebuts
          </p>
        </div>

        {/* Barre de filtres compacte avec Machine, Cause et OF */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre Machine */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-black dark:text-white shadow-2xs">
            <Cpu className="size-3.5 text-zinc-700 dark:text-zinc-300" />
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="bg-transparent text-black dark:text-white font-bold focus:outline-hidden cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                Toutes les machines
              </option>
              {machines.map((m) => (
                <option key={m.id} value={m.id} className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  {m.code}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Ordre de Fabrication (OF) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-black dark:text-white shadow-2xs">
            <ClipboardList className="size-3.5 text-zinc-700 dark:text-zinc-300" />
            <select
              value={selectedOfId}
              onChange={(e) => setSelectedOfId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="bg-transparent text-black dark:text-white font-bold focus:outline-hidden cursor-pointer text-xs max-w-[150px] truncate"
            >
              <option value="ALL" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                Tous les OFs
              </option>
              {ordres.map((o) => (
                <option key={o.id} value={o.id} className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  {o.numero} {o.code_article ? `(${o.code_article})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Défaut */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-black dark:text-white shadow-2xs">
            <Filter className="size-3.5 text-zinc-700 dark:text-zinc-300" />
            <select
              value={selectedCause}
              onChange={(e) => setSelectedCause(e.target.value as CauseRebut | "ALL")}
              className="bg-transparent text-black dark:text-white font-bold focus:outline-hidden cursor-pointer text-xs max-w-[140px] truncate"
            >
              <option value="ALL" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                Tous les défauts
              </option>
              {CAUSES_REBUT.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  {getRebutMeta(c).label}
                </option>
              ))}
            </select>
          </div>

          {/* Période */}
          <div className="flex items-center bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 p-0.5 rounded-lg text-xs shadow-2xs">
            <button
              onClick={() => setTimeRange("7d")}
              className={cn(
                "px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer",
                timeRange === "7d" ? "bg-black text-white dark:bg-white dark:text-black" : "text-zinc-700 dark:text-zinc-300 hover:text-black"
              )}
            >
              7 jours
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={cn(
                "px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer",
                timeRange === "30d" ? "bg-black text-white dark:bg-white dark:text-black" : "text-zinc-700 dark:text-zinc-300 hover:text-black"
              )}
            >
              30 jours
            </button>
            <button
              onClick={() => setTimeRange("all")}
              className={cn(
                "px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer",
                timeRange === "all" ? "bg-black text-white dark:bg-white dark:text-black" : "text-zinc-700 dark:text-zinc-300 hover:text-black"
              )}
            >
              Tout
            </button>
          </div>

          {/* Actualiser */}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Actualiser"
            className="p-1.5 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-black dark:text-white transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin text-blue-600")} />
          </button>
        </div>
      </div>

      {/* ----------------- 4 CARTES STATISTIQUES EN GRAND ET CLAIR (SHRINK-0) ----------------- */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Pièces conformes</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
              {stats.bonnes.toLocaleString()}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Pièces rejetées (rebuts)</div>
            <div className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
              {stats.rebuts.toLocaleString()}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600">
            <AlertTriangle className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Taux de rebut global</div>
            <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">
              {stats.tauxRebutPct}%
            </div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Activity className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Défaut N°1 ({stats.topCausePct}%)</div>
            <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 truncate max-w-[130px] mt-0.5">
              {stats.topCause}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600">
            <ShieldCheck className="size-4" />
          </div>
        </div>
      </div>

      {/* ----------------- GRILLE 2X2 DE 4 GRAPHIQUES (FLEX-1 MIN-H-0 - SANS SCROLL) ----------------- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2.5">
        {/* GRAPHIQUE 1 : POURQUOI ON JETTE LES PIÈCES ? */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                Pourquoi on jette les pièces ?
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Causes des défauts (en nombre de pièces)
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border border-zinc-300 dark:border-zinc-700">
              Du plus grand au plus petit
            </span>
          </div>

          <div className="flex-1 min-h-0 relative w-full h-full">
            {causesChartData.labels.length > 0 ? (
              <Bar data={causesChartData} options={horizontalBarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                {loading ? "Chargement des données…" : "Aucun défaut enregistré."}
              </div>
            )}
          </div>
        </div>

        {/* GRAPHIQUE 2 : PROPORTION BONNES VS REBUTS */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                Part des pièces bonnes vs rebuts
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Taux de conformité global ({stats.tauxConformePct}% conformes)
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Conformité
            </span>
          </div>

          <div className="flex-1 min-h-0 relative w-full h-full flex items-center justify-center">
            {stats.total > 0 ? (
              <Doughnut data={conformiteChartData} options={doughnutOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                {loading ? "Chargement…" : "Aucune production enregistrée."}
              </div>
            )}
          </div>
        </div>

        {/* GRAPHIQUE 3 : QUELLES MACHINES FABRIQUENT LE PLUS DE REBUTS ? */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                Quelles machines fabriquent le plus de rebuts ?
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Nombre de pièces rejetées par machine
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
              Par machine
            </span>
          </div>

          <div className="flex-1 min-h-0 relative w-full h-full">
            {machineChartData.labels.length > 0 ? (
              <Bar data={machineChartData} options={verticalBarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                {loading ? "Chargement…" : "Aucun rebut par machine."}
              </div>
            )}
          </div>
        </div>

        {/* GRAPHIQUE 4 : ÉVOLUTION DES REBUTS JOUR PAR JOUR */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                Évolution des rebuts jour par jour
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Historique des pièces rejetées dans le temps
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Chaque jour
            </span>
          </div>

          <div className="flex-1 min-h-0 relative w-full h-full">
            <Line data={trendChartData} options={lineOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}
