import { useDashboardData } from "@/hooks/useDashboardData"
import { Card, EmptyState, ErrorBanner, Page } from "@/components/dashboard/primitives"
import { TRSGaugeRow } from "@/components/dashboard/TRSGaugeRow"
import { ProductionLiveChart } from "@/components/dashboard/ProductionLiveChart"
import { OFHeaderBar } from "@/components/dashboard/OFHeaderBar"
import { RejectsCard } from "@/components/dashboard/RejectsCard"

/**
 * Salle de contrôle façon pupitre atelier : bandeau OF (article, lot, quantité,
 * statut) puis les 8 indicateurs AFNOR NF E60-182 en un coup d'œil, avant la
 * production en temps réel et les rejets.
 */
export function MesDashboardPage({ ligneId }: { ligneId: number | null }) {
  const { resume, loading, error } = useDashboardData(ligneId)

  return (
    <Page>
      <ErrorBanner message={error} />
      {loading && !resume ? (
        <EmptyState message="Chargement…" />
      ) : !resume ? (
        <EmptyState message="Aucune donnée disponible." />
      ) : (
        <div className="space-y-5">
          <OFHeaderBar of={resume.of_actif} />

          <Card className="p-4">
            <TRSGaugeRow resume={resume} />
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="min-h-[360px] lg:col-span-2">
              <ProductionLiveChart points={resume.serie_production} />
            </div>
            <div className="min-h-[360px]">
              <RejectsCard
                quantiteBonne={resume.quantite_bonne}
                quantiteRejetee={resume.quantite_rejetee}
              />
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
