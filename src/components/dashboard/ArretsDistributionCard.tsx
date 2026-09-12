import { useMemo } from "react"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  type ChartOptions,
} from "chart.js"
import { Doughnut } from "react-chartjs-2"
import { CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardResume } from "@/lib/types"

ChartJS.register(ArcElement, Tooltip)

const CAUSE_META: Record<string, { label: string; color: string; hex: string }> = {
  PANNE_MECANIQUE: { label: "Panne mécanique", color: "bg-rose-500", hex: "#f43f5e" },
  PANNE_ELECTRIQUE: { label: "Panne électrique", color: "bg-red-500", hex: "#ef4444" },
  ATTENTE_MATIERE: { label: "Attente matière première", color: "bg-amber-500", hex: "#f59e0b" },
  CHANGEMENT_SERIE: { label: "Changement de série", color: "bg-sky-500", hex: "#0ea5e9" },
  REGLAGE_MACHINE: { label: "Réglage machine", color: "bg-indigo-500", hex: "#6366f1" },
  MANQUE_OPERATEUR: { label: "Manque opérateur", color: "bg-orange-500", hex: "#f97316" },
  NETTOYAGE: { label: "Nettoyage & désinfection", color: "bg-teal-500", hex: "#14b8a6" },
  MAINTENANCE_PLANIFIEE: { label: "Maintenance planifiée", color: "bg-blue-500", hex: "#3b82f6" },
  MICRO_ARRET: { label: "Micro-arrêts fréquents", color: "bg-purple-500", hex: "#a855f7" },
  QUALITE_BLOQUANTE: { label: "Non-conformité bloquante", color: "bg-pink-500", hex: "#ec4899" },
  PRELEVEMENT_QUALITE: { label: "Prélèvement qualité BPF", color: "bg-emerald-500", hex: "#10b981" },
  AUTRE: { label: "Autre cause non spécifiée", color: "bg-zinc-500", hex: "#71717a" },
}

function formatDuree(secondes: number | string | null | undefined): string {
  const s = Math.round(Number(secondes ?? 0))
  if (s <= 0) return "0s"
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`
  if (m > 0) return `${m}m ${sec > 0 ? `${sec}s` : ""}`
  return `${sec}s`
}

interface ArretsDistributionProps {
  resume: DashboardResume | null
  className?: string
}

export function ArretsDistributionCard({ resume, className }: ArretsDistributionProps) {
  const causes = resume?.top_causes_arret ?? []
  const totalArretS = Number(resume?.temps_arret_total_s ?? 0)

  // Calcule les pourcentages par cause
  const distribution = useMemo(() => {
    return causes.map((c) => {
      const dur = Number(c.duree_s ?? 0)
      const pct = totalArretS > 0 ? Math.round((dur / totalArretS) * 100) : 0
      const meta = CAUSE_META[c.cause] ?? { label: c.cause, color: "bg-zinc-500", hex: "#71717a" }
      return {
        key: c.cause,
        label: meta.label,
        color: meta.color,
        hex: meta.hex,
        durationS: dur,
        durationLabel: formatDuree(dur),
        percentage: pct,
      }
    })
  }, [causes, totalArretS])

  // Données pour le Doughnut Chart.js
  const doughnutData = useMemo(() => {
    if (distribution.length === 0) {
      return {
        labels: ["Aucun arrêt"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["rgba(148, 163, 184, 0.12)"],
            borderWidth: 0,
          },
        ],
      }
    }
    return {
      labels: distribution.map((d) => d.label),
      datasets: [
        {
          data: distribution.map((d) => Math.max(Math.round(d.durationS / 60), 1)),
          backgroundColor: distribution.map((d) => d.hex),
          borderColor: "transparent",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    }
  }, [distribution])

  const doughnutOptions: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: distribution.length > 0,
          backgroundColor: "rgba(15, 23, 42, 0.94)",
          titleColor: "#f8fafc",
          bodyColor: "#e2e8f0",
          padding: 8,
          boxPadding: 4,
          callbacks: {
            label: (ctx) => {
              const item = distribution[ctx.dataIndex]
              return item ? ` ${item.label} : ${item.durationLabel} (${item.percentage}%)` : ""
            },
          },
        },
      },
    }),
    [distribution],
  )

  const planifieS = Number(resume?.arrets_planifies?.duree_totale_s ?? 0)
  const nonPlanifieS = Number(resume?.arrets_non_planifies?.duree_totale_s ?? 0)
  const microCount = resume?.micro_arrets_nombre ?? 0
  const mttrS = Number(resume?.mttr_s ?? 0)
  const mtbfS = Number(resume?.mtbf_s ?? 0)

  return (
    <div className={cn("flex flex-col rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="size-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground truncate">
            Distribution des Arrêts
          </h3>
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">Total :</span>
          <span className="font-mono text-sm font-bold text-foreground">
            {formatDuree(totalArretS)}
          </span>
        </div>
      </div>

      {/* Zone médiane : Cercle agrandi (Chart.js Doughnut) à gauche + Texte tout à droite (colonnes égales 50/50, ratio interne 80/20) */}
      <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 items-center gap-4 sm:gap-6 py-1">
        {/* Colonne gauche (50%) : Cercle Doughnut grand et centré */}
        <div className="relative flex size-44 sm:size-48 lg:size-52 shrink-0 items-center justify-center justify-self-center">
          <Doughnut data={doughnutData} options={doughnutOptions} />

          {/* Centre du Donut */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-sm sm:text-base font-bold text-foreground">
              {formatDuree(totalArretS)}
            </span>
            <span className="text-[9.5px] uppercase tracking-wider font-semibold text-muted-foreground">
              {totalArretS > 0 ? "Arrêts" : "Optimal"}
            </span>
          </div>
        </div>

        {/* Colonne droite (50%) : Liste détaillée repoussée tout à droite avec ratio 80% libellé / 20% valeurs */}
        <div className="w-full space-y-2 overflow-y-auto max-h-[160px] pl-1 sm:pl-4 pr-1">
          {distribution.length === 0 ? (
            <div className="flex flex-col items-end justify-center py-4 text-right">
              <CheckCircle2 className="size-6 text-emerald-500/80 stroke-1" />
              <p className="mt-1 text-xs font-medium text-foreground">Aucun arrêt en cours</p>
              <p className="text-[10px] text-muted-foreground">Ligne opérationnelle sans interruption</p>
            </div>
          ) : (
            distribution.map((d) => (
              <div key={d.key} className="flex items-center justify-between gap-2 py-0.5 text-[11px]">
                {/* 80% Colonne Libellé */}
                <div className="flex items-center gap-2 min-w-0 w-[80%] pr-2">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: d.hex }} />
                  <span className="truncate text-foreground font-medium text-[11px]" title={d.label}>
                    {d.label}
                  </span>
                </div>
                {/* 20% Colonne Valeurs alignée tout à droite */}
                <div className="flex items-center justify-end gap-2.5 w-[20%] shrink-0 tabular-nums text-[10.5px]">
                  <span className="font-mono text-muted-foreground">{d.durationLabel}</span>
                  <span className="w-8 text-right font-mono font-bold text-foreground">
                    {d.percentage}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Metrics (Fiabilité MTBF / MTTR & Types) */}
      <div className="mt-2 grid grid-cols-5 gap-1.5 border-t border-border/60 pt-2 text-center text-xs">
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Planifiés</p>
          <p className="font-mono text-xs font-semibold text-foreground">{formatDuree(planifieS)}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Non Plan.</p>
          <p className="font-mono text-xs font-semibold text-foreground">{formatDuree(nonPlanifieS)}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Micro</p>
          <p className="font-mono text-xs font-semibold text-foreground">{microCount}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground">MTTR</p>
          <p className="font-mono text-xs font-semibold text-foreground">
            {mttrS > 0 ? formatDuree(mttrS) : "—"}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground">MTBF</p>
          <p className="font-mono text-xs font-semibold text-foreground">
            {mtbfS > 0 ? formatDuree(mtbfS) : "—"}
          </p>
        </div>
      </div>
    </div>
  )
}
