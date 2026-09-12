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
  AlertTriangle,
  Clock,
  Filter,
  Cpu,
  RefreshCw,
  Activity,
  Layers,
  ClipboardList,
} from "lucide-react"
import { downtimeApi, machinesApi, ordresApi } from "@/lib/api"
import type { DowntimeEventRead, Machine, CauseArret, OrdreFabrication } from "@/lib/types"
import { CAUSES_ARRET } from "@/lib/types"
import { cn, formatDureeHHMMSS } from "@/lib/utils"

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

// Couleurs significatives et intuitives d'atelier
const CAUSE_META: Record<string, { label: string; hex: string; bg: string }> = {
  PANNE_MECANIQUE: { label: "Panne mécanique", hex: "#dc2626", bg: "#dc2626" },
  PANNE_ELECTRIQUE: { label: "Panne électrique", hex: "#ea580c", bg: "#ea580c" },
  ATTENTE_MATIERE: { label: "Attente matière", hex: "#d97706", bg: "#d97706" },
  CHANGEMENT_SERIE: { label: "Changement de série", hex: "#2563eb", bg: "#2563eb" },
  REGLAGE_MACHINE: { label: "Réglage machine", hex: "#7c3aed", bg: "#7c3aed" },
  MANQUE_OPERATEUR: { label: "Manque opérateur", hex: "#b45309", bg: "#b45309" },
  NETTOYAGE: { label: "Nettoyage & BPF", hex: "#059669", bg: "#059669" },
  MAINTENANCE_PLANIFIEE: { label: "Maintenance prévue", hex: "#0284c7", bg: "#0284c7" },
  MICRO_ARRET: { label: "Micro-arrêt", hex: "#f97316", bg: "#f97316" },
  QUALITE_BLOQUANTE: { label: "Défaut qualité", hex: "#991b1b", bg: "#991b1b" },
  PRELEVEMENT_QUALITE: { label: "Contrôle labo", hex: "#0d9488", bg: "#0d9488" },
  AUTRE: { label: "Autre problème", hex: "#475569", bg: "#475569" },
}

function getCauseMeta(cause: string) {
  return CAUSE_META[cause] ?? {
    label: cause.replace(/_/g, " ").toLowerCase(),
    hex: "#4f46e5",
    bg: "#4f46e5",
  }
}

function parseSafeDate(dateStr: string): Date {
  return new Date(dateStr.replace(" ", "T"))
}

/** Formate l'axe en heures simples (ex: 0h, 5h, 10h) pour éviter d'encombrer le graphique */
function formatHoursAxis(hoursVal: number | string): string {
  const h = Number(hoursVal)
  if (h === 0) return "0h"
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${Math.round(h)}h`
}

export function ArretsPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [ordres, setOrdres] = useState<OrdreFabrication[]>([])
  const [downtimes, setDowntimes] = useState<DowntimeEventRead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filtres
  const [machineId, setMachineId] = useState<number | "ALL">("ALL")
  const [selectedCause, setSelectedCause] = useState<CauseArret | "ALL">("ALL")
  const [selectedOfId, setSelectedOfId] = useState<number | "ALL">("ALL")
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all")

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([
      machinesApi.list().catch(() => [] as Machine[]),
      ordresApi.list().catch(() => [] as OrdreFabrication[]),
      downtimeApi
        .list({ pageSize: 200 })
        .then((res) => res.items)
        .catch(() => [] as DowntimeEventRead[]),
    ]).then(([mList, oList, dList]) => {
      if (!active) return
      setMachines(mList)
      setOrdres(oList)
      setDowntimes(dList)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [refreshKey])

  // Filtrage
  const filteredDowntimes = useMemo(() => {
    const nowMs = Date.now()
    const daysLimit = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : null

    return downtimes.filter((d) => {
      if (machineId !== "ALL" && d.machine_id !== machineId) return false
      if (selectedCause !== "ALL" && d.cause !== selectedCause) return false
      if (selectedOfId !== "ALL" && d.ordre_fabrication_id !== selectedOfId) return false
      if (daysLimit !== null && d.start_time) {
        const itemTime = parseSafeDate(d.start_time).getTime()
        if (!isNaN(itemTime) && nowMs - itemTime > daysLimit * 24 * 3600 * 1000) {
          return false
        }
      }
      return true
    })
  }, [downtimes, machineId, selectedCause, selectedOfId, timeRange])

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = filteredDowntimes.length
    let totalSeconds = 0
    const causeDurations: Record<string, number> = {}
    const machineDurations: Record<string, number> = {}
    let actifsCount = 0

    filteredDowntimes.forEach((d) => {
      let dur = Number(d.duree_s ?? 0)
      if (!d.end_time) {
        actifsCount++
        const start = parseSafeDate(d.start_time).getTime()
        if (!isNaN(start)) {
          dur = Math.max(0, Math.floor((Date.now() - start) / 1000))
        }
      }
      totalSeconds += dur

      causeDurations[d.cause] = (causeDurations[d.cause] || 0) + dur
      const mCode = d.code_machine || `M-${d.machine_id}`
      machineDurations[mCode] = (machineDurations[mCode] || 0) + dur
    })

    let topCause = "Aucune"
    let topCauseSeconds = 0
    Object.entries(causeDurations).forEach(([c, s]) => {
      if (s > topCauseSeconds) {
        topCauseSeconds = s
        topCause = getCauseMeta(c).label
      }
    })

    let topMachine = "Aucune"
    let topMachineSeconds = 0
    Object.entries(machineDurations).forEach(([m, s]) => {
      if (s > topMachineSeconds) {
        topMachineSeconds = s
        topMachine = m
      }
    })

    return {
      totalCount,
      totalSeconds,
      actifsCount,
      topCause,
      topCausePct: totalSeconds > 0 ? Math.round((topCauseSeconds / totalSeconds) * 100) : 0,
      topMachine,
      causeDurations,
      machineDurations,
    }
  }, [filteredDowntimes])

  // 1. Dataset : Pourquoi les machines s'arrêtent ? (Heures en valeurs, formatDureeHHMMSS au survol)
  const causesChartData = useMemo(() => {
    const sorted = Object.entries(kpis.causeDurations)
      .map(([cause, sec]) => ({
        cause,
        label: getCauseMeta(cause).label,
        seconds: sec,
        hours: Number((sec / 3600).toFixed(2)),
        hex: getCauseMeta(cause).hex,
        bg: getCauseMeta(cause).bg,
      }))
      .sort((a, b) => b.seconds - a.seconds)

    return {
      labels: sorted.map((s) => s.label),
      rawSeconds: sorted.map((s) => s.seconds),
      datasets: [
        {
          label: "Temps perdu",
          data: sorted.map((s) => s.hours),
          backgroundColor: sorted.map((s) => s.bg),
          borderColor: "#000000",
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 24,
        },
      ],
    }
  }, [kpis.causeDurations])

  // 2. Dataset : D'où viennent les pannes ? (% par problème)
  const doughnutChartData = useMemo(() => {
    const entries = Object.entries(kpis.causeDurations)
      .map(([cause, sec]) => ({
        cause,
        label: getCauseMeta(cause).label,
        seconds: sec,
        hours: Number((sec / 3600).toFixed(2)),
        hex: getCauseMeta(cause).hex,
      }))
      .sort((a, b) => b.seconds - a.seconds)

    return {
      labels: entries.map((e) => e.label),
      rawSeconds: entries.map((e) => e.seconds),
      datasets: [
        {
          data: entries.map((e) => e.hours),
          backgroundColor: entries.map((e) => e.hex),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }
  }, [kpis.causeDurations])

  // 3. Dataset : Quelles machines tombent le plus en panne ?
  const machineChartData = useMemo(() => {
    const entries = (machines.length > 0 ? machines.map((m) => m.code) : Object.keys(kpis.machineDurations))
      .map((code) => {
        const sec = kpis.machineDurations[code] || 0
        return {
          code,
          seconds: sec,
          hours: Number((sec / 3600).toFixed(2)),
        }
      })
      .sort((a, b) => b.seconds - a.seconds)

    return {
      labels: entries.map((e) => e.code),
      rawSeconds: entries.map((e) => e.seconds),
      datasets: [
        {
          label: "Temps perdu",
          data: entries.map((e) => e.hours),
          backgroundColor: "#2563eb",
          borderColor: "#1d4ed8",
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 34,
        },
      ],
    }
  }, [machines, kpis.machineDurations])

  // 4. Dataset : Évolution des pannes jour par jour
  const trendChartData = useMemo(() => {
    const dailySecMap: Record<string, number> = {}
    const d = new Date()
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(d)
      dayDate.setDate(d.getDate() - i)
      const key = dayDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
      dailySecMap[key] = 0
    }

    filteredDowntimes.forEach((dt) => {
      if (!dt.start_time) return
      const dtDate = parseSafeDate(dt.start_time)
      if (isNaN(dtDate.getTime())) return
      const key = dtDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
      const durSec = Number(dt.duree_s ?? 0)
      dailySecMap[key] = (dailySecMap[key] || 0) + durSec
    })

    const labels = Object.keys(dailySecMap)
    const rawSeconds = Object.values(dailySecMap)
    const hoursData = rawSeconds.map((s) => Number((s / 3600).toFixed(2)))

    return {
      labels,
      rawSeconds,
      datasets: [
        {
          label: "Temps perdu",
          data: hoursData,
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
  }, [filteredDowntimes])

  // ================= OPTIONS CHART.JS ÉPURÉES : AXES LISIBLES SANS INCLINAISON + INFOBULLES HH:MM:SS =================
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
          label: (ctx) => {
            const sec = causesChartData.rawSeconds[ctx.dataIndex] || 0
            return ` Durée : ${formatDureeHHMMSS(sec)}`
          },
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
          callback: (val) => formatHoursAxis(val),
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
          label: (ctx) => {
            const sec = machineChartData.rawSeconds[ctx.dataIndex] || 0
            return ` Durée : ${formatDureeHHMMSS(sec)}`
          },
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
          callback: (val) => formatHoursAxis(val),
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
          padding: 6,
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
            const sec = doughnutChartData.rawSeconds[ctx.dataIndex] || 0
            return ` ${ctx.label} : ${formatDureeHHMMSS(sec)}`
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
          label: (ctx) => {
            const sec = trendChartData.rawSeconds[ctx.dataIndex] || 0
            return ` Durée perdue : ${formatDureeHHMMSS(sec)}`
          },
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
          callback: (val) => formatHoursAxis(val),
        },
      },
    },
  }

  return (
    <div className="h-full w-full min-h-0 flex flex-col p-3 sm:p-4 gap-2.5 overflow-hidden select-none bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ----------------- EN-TÊTE SANS ICÔNE NI BADGE ----------------- */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-zinc-300 dark:border-zinc-800">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-black dark:text-white leading-none">
            Journal des Arrêts
          </h1>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1">
            Suivi visuel des pannes et du temps perdu en production
          </p>
        </div>

        {/* Filtres simples, gros et ajout du filtre par OF */}
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

          {/* Filtre Cause */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-black dark:text-white shadow-2xs">
            <Filter className="size-3.5 text-zinc-700 dark:text-zinc-300" />
            <select
              value={selectedCause}
              onChange={(e) => setSelectedCause(e.target.value as CauseArret | "ALL")}
              className="bg-transparent text-black dark:text-white font-bold focus:outline-hidden cursor-pointer text-xs max-w-[140px] truncate"
            >
              <option value="ALL" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                Tous les problèmes
              </option>
              {CAUSES_ARRET.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  {getCauseMeta(c).label}
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

      {/* ----------------- 4 CARTES STATISTIQUES (AVEC GRAND FORMAT 00HH:00MM:00SS) ----------------- */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Total des pannes</div>
            <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">{kpis.totalCount}</div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white">
            <Activity className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Temps total perdu</div>
            <div className="text-base sm:text-lg font-black font-mono text-red-600 mt-0.5 tracking-tight">
              {formatDureeHHMMSS(kpis.totalSeconds)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600">
            <Clock className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Problème N°1 ({kpis.topCausePct}%)</div>
            <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 truncate max-w-[130px] mt-0.5">
              {kpis.topCause}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600">
            <AlertTriangle className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Arrêts en cours</div>
            <div className="text-lg sm:text-xl font-black text-black dark:text-white mt-0.5 flex items-center gap-1.5">
              {kpis.actifsCount > 0 ? (
                <span className="text-red-600 flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-red-600 animate-ping" />
                  {kpis.actifsCount} en arrêt
                </span>
              ) : (
                <span className="text-emerald-600 text-sm font-black">0 (Tout tourne)</span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Layers className="size-4" />
          </div>
        </div>
      </div>

      {/* ----------------- GRILLE 2X2 DE 4 GRAPHIQUES PROPRES SANS SURCHARGE D'AXES ----------------- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2.5">
        {/* GRAPHIQUE 1 : POURQUOI LES MACHINES S'ARRÊTENT ? */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                Pourquoi les machines s'arrêtent ?
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Causes principales (survolez une barre pour voir le détail 00HH:00MM:00SS)
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
                {loading ? "Chargement des données…" : "Aucun arrêt enregistré sur cette sélection."}
              </div>
            )}
          </div>
        </div>

        {/* GRAPHIQUE 2 : D'OÙ VIENNENT LES PANNES ? */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                D'où viennent les pannes ?
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Part de chaque problème en pourcentage (%)
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border border-zinc-300 dark:border-zinc-700">
              Répartition %
            </span>
          </div>

          <div className="flex-1 min-h-0 relative w-full h-full flex items-center justify-center">
            {doughnutChartData.labels.length > 0 ? (
              <Doughnut data={doughnutChartData} options={doughnutOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                {loading ? "Chargement…" : "Aucune donnée disponible."}
              </div>
            )}
          </div>
        </div>

        {/* GRAPHIQUE 3 : QUELLES MACHINES TOMBENT LE PLUS EN PANNE ? */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                Quelles machines tombent le plus en panne ?
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Temps d'arrêt total par machine (survolez pour le format 00HH:00MM:00SS)
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              Par machine
            </span>
          </div>

          <div className="flex-1 min-h-0 relative w-full h-full">
            {machineChartData.labels.length > 0 ? (
              <Bar data={machineChartData} options={verticalBarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                {loading ? "Chargement…" : "Aucune machine en panne."}
              </div>
            )}
          </div>
        </div>

        {/* GRAPHIQUE 4 : ÉVOLUTION DES PANNES JOUR PAR JOUR */}
        <div className="h-full min-h-0 flex flex-col p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-black dark:text-white">
                Évolution des pannes jour par jour
              </h2>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Historique des arrêts dans le temps
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
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
