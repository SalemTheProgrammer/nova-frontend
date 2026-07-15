import { RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useDashboardData } from "@/hooks/useDashboardData"
import { ordresApi } from "@/lib/api"
import type { OFActif, OrdreFabrication } from "@/lib/types"
import { EmptyState, ErrorBanner, Page } from "@/components/dashboard/primitives"
import { OFHeaderBar } from "@/components/dashboard/OFHeaderBar"
import { OFSearchAutocomplete } from "@/components/dashboard/OFSearchAutocomplete"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { CurrentOeeCard } from "@/components/dashboard/CurrentOeeCard"
import { OeeMetricsChart } from "@/components/dashboard/OeeMetricsChart"
import { StationSummaryCard } from "@/components/dashboard/StationSummaryCard"
import { ActiveMachinesRow } from "@/components/dashboard/ActiveMachinesRow"

function ordreVersOFActif(ordre: OrdreFabrication): OFActif {
  return {
    id: ordre.id,
    numero: ordre.numero,
    article_code: ordre.code_article,
    article_designation: ordre.designation_article,
    lot_produit: ordre.numero_lot_produit,
    quantite_planifiee: ordre.quantite_planifiee,
    quantite_bonne: ordre.quantite_bonne,
    quantite_rejetee: ordre.quantite_rejetee,
    statut: ordre.statut,
    ligne_production_id: ordre.ligne_production_id,
  }
}

/** Manufacturing Dashboard : une synthèse démo lisible, puis le détail à la demande. */
export function MesDashboardPage({ ligneId }: { ligneId: number | null }) {
  const { resume, machines, loading, error, refresh, revision } = useDashboardData(ligneId)
  const [ordres, setOrdres] = useState<OrdreFabrication[]>([])
  const [ofId, setOfId] = useState<number | null>(null)

  useEffect(() => {
    ordresApi.list().then(setOrdres).catch(() => {})
  }, [revision])

  useEffect(() => {
    setOfId(null)
  }, [ligneId])

  const ordresDisponibles =
    ligneId == null ? ordres : ordres.filter((ordre) => ordre.ligne_production_id === ligneId)
  const ordreChoisi =
    ofId != null ? ordresDisponibles.find((ordre) => ordre.id === ofId) : undefined
  const ofAffiche = ordreChoisi ? ordreVersOFActif(ordreChoisi) : (resume?.of_actif ?? null)

  return (
    <Page
      fullHeight
      className="dashboard-page"
      title="Tableau de bord de production"
      description="Les signaux essentiels de la production en temps réel"
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Actualiser le dashboard"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3",
            "text-sm font-medium transition-colors hover:bg-accent",
          )}
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <ErrorBanner message={error} />
        <div className="min-h-0 flex-1">
          {loading && !resume ? (
            <DashboardSkeleton />
          ) : !resume ? (
            <EmptyState message="Aucune donnée disponible." />
          ) : (
            <div className="dashboard-content h-full overflow-hidden">
              <div className="dashboard-layout">
                <section className="dashboard-production">
                  <div className="dashboard-production-toolbar">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">Production en cours</p>
                      <p className="dashboard-card-subtitle text-[11px] text-muted-foreground">
                        Recherche rapide parmi tous les ordres de fabrication
                      </p>
                    </div>
                    <OFSearchAutocomplete
                      ordres={ordresDisponibles}
                      value={ofId}
                      onChange={setOfId}
                    />
                  </div>
                  <OFHeaderBar of={ofAffiche} />
                </section>

                <div className="dashboard-overview-grid">
                  <CurrentOeeCard
                    trsGlobal={Number(resume.trs_global)}
                    disponibilite={Number(resume.disponibilite)}
                    performance={Number(resume.performance)}
                    qualite={Number(resume.qualite)}
                    ligneId={ligneId}
                  />
                  <OeeMetricsChart ligneId={ligneId} />
                </div>

                <div className="dashboard-secondary-grid">
                  <ActiveMachinesRow machines={machines} />
                  <StationSummaryCard />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}
