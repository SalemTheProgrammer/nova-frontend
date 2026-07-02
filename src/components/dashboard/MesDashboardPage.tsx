import { AlertTriangle, Factory, Gauge as GaugeIcon, Package } from "lucide-react"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Card, EmptyState, ErrorBanner, Page } from "@/components/dashboard/primitives"
import { Gauge } from "@/components/dashboard/Gauge"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { MachineStatusGrid } from "@/components/dashboard/MachineStatusGrid"
import { ProductionLiveChart } from "@/components/dashboard/ProductionLiveChart"
import { DowntimeCauseChart } from "@/components/dashboard/DowntimeCauseChart"
import { AlertList } from "@/components/dashboard/AlertList"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { TRSBreakdown } from "@/components/dashboard/TRSBreakdown"

export function MesDashboardPage({ ligneId }: { ligneId: number | null }) {
  const { resume, machines, loading, error } = useDashboardData(ligneId)

  return (
    <Page title="Dashboard" description="Vue d'ensemble complète de l'usine, en temps réel.">
      <ErrorBanner message={error} />
      {loading && !resume ? (
        <EmptyState message="Chargement…" />
      ) : !resume ? (
        <EmptyState message="Aucune donnée disponible." />
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-center gap-4">
              <Gauge value={Number(resume.trs_global)} label="TRS — Performance globale" size={200} />
              <Gauge value={Number(resume.disponibilite)} label="Disponibilité" size={150} />
              <Gauge value={Number(resume.performance)} label="Performance" size={150} />
              <Gauge value={Number(resume.qualite)} label="Qualité" size={150} />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Machines en marche"
              value={`${resume.machines_en_marche} / ${resume.machines_total}`}
              icon={Factory}
              tone={resume.machines_en_marche > 0 ? "green" : "neutral"}
            />
            <KpiCard
              label="Cadence actuelle"
              value={`${resume.cadence_actuelle_par_min} u/min`}
              icon={GaugeIcon}
            />
            <KpiCard
              label="Alertes en cours"
              value={String(resume.alertes_actives.length)}
              icon={AlertTriangle}
              tone={resume.alertes_actives.length > 0 ? "red" : "neutral"}
            />
            <KpiCard
              label="Production (bonnes / total)"
              value={`${resume.quantite_bonne} / ${resume.production_reelle}`}
              icon={Package}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <MachineStatusGrid machines={machines} />
              <AlertList alerts={resume.alertes_actives} />
            </div>
            <ActivityFeed evenements={resume.activite_recente} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProductionLiveChart points={resume.serie_production} />
            <DowntimeCauseChart causes={resume.top_causes_arret} />
          </div>

          {resume.trs_detail && (
            <div>
              <h2 className="mb-3 text-base font-semibold">
                Détail AFNOR (NF E60-182) — usine complète
              </h2>
              <TRSBreakdown trs={resume.trs_detail} />
            </div>
          )}
        </div>
      )}
    </Page>
  )
}
