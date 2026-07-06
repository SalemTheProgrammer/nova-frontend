import { Gauge } from "@/components/dashboard/Gauge"
import { cn } from "@/lib/utils"
import type { DashboardResume } from "@/lib/types"

const TONE_BG: Record<string, string> = {
  yellow: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
  orange: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30",
  blue: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30",
}

function GaugeTile({
  title,
  value,
  tone,
}: {
  title: string
  value: number
  tone?: "yellow" | "orange" | "blue"
}) {
  return (
    <div
      className={cn(
        "flex min-w-[7.5rem] flex-1 flex-col items-center gap-1.5 rounded-lg border p-3",
        tone ? TONE_BG[tone] : "border-border bg-background",
      )}
    >
      <p className="text-center text-xs font-semibold text-foreground/80">{title}</p>
      <Gauge value={value} label="" size={104} />
    </div>
  )
}

/**
 * Rangée complète des 8 indicateurs AFNOR NF E60-182, façon pupitre atelier :
 * disponibilité/performance/qualité, TRS, charge, TRG, taux stratégique, TRE —
 * tous visibles d'un coup d'œil, sans repli, comme sur une console SCADA.
 */
export function TRSGaugeRow({ resume }: { resume: DashboardResume }) {
  const trg = Number(resume.trs_detail?.trg ?? "0")
  const tre = Number(resume.trs_detail?.tre ?? "0")

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3">
      <GaugeTile title="Taux de disponibilité" value={Number(resume.disponibilite)} />
      <GaugeTile title="Taux de Performance" value={Number(resume.performance)} />
      <GaugeTile title="Taux de Qualité" value={Number(resume.qualite)} />
      <GaugeTile title="TRS" value={Number(resume.trs_global)} tone="yellow" />
      <GaugeTile title="Taux de charge" value={Number(resume.taux_charge)} />
      <GaugeTile title="TRG" value={trg} tone="orange" />
      <GaugeTile title="Taux stratégique" value={Number(resume.taux_engagement)} />
      <GaugeTile title="TRE" value={tre} tone="blue" />
    </div>
  )
}
