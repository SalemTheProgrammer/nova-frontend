import { useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { WebSocketProvider } from "@/hooks/useWebSocket"
import type { NavView } from "@/components/Sidebar"
import { MesDashboardPage } from "@/components/dashboard/MesDashboardPage"
import { SimulateurPage } from "@/components/dashboard/SimulateurPage"
import { MachinesPage } from "@/components/dashboard/MachinesPage"
import { TRSPage } from "@/components/dashboard/TRSPage"
import { ArretsPage } from "@/components/dashboard/ArretsPage"
import { QualitePage } from "@/components/dashboard/QualitePage"
import { MaintenancePage } from "@/components/dashboard/MaintenancePage"
import { StockPage } from "@/components/dashboard/StockPage"
import { OrdresPage } from "@/components/dashboard/OrdresPage"
import { ArticlesPage } from "@/components/dashboard/ArticlesPage"
import { MatieresPage } from "@/components/dashboard/MatieresPage"
import { LignesPage } from "@/components/dashboard/LignesPage"
import { FournisseursPage } from "@/components/dashboard/FournisseursPage"

function App() {
  const [view, setView] = useState<NavView>("dashboard")
  const [ligneId, setLigneId] = useState<number | null>(null)

  function renderView() {
    switch (view) {
      case "dashboard":
        return <MesDashboardPage ligneId={ligneId} />
      case "simulateur":
        return <SimulateurPage ligneId={ligneId} />
      case "machines":
        return <MachinesPage ligneId={ligneId} />
      case "trs":
        return <TRSPage ligneId={ligneId} />
      case "arrets":
        return <ArretsPage />
      case "qualite":
        return <QualitePage />
      case "maintenance":
        return <MaintenancePage />
      case "stock":
        return <StockPage />
      case "ordres":
        return <OrdresPage />
      case "articles":
        return <ArticlesPage />
      case "matieres":
        return <MatieresPage />
      case "lignes":
        return <LignesPage />
      case "fournisseurs":
        return <FournisseursPage />
    }
  }

  return (
    <WebSocketProvider>
      <AppShell view={view} onChangeView={setView} ligneId={ligneId} onChangeLigne={setLigneId}>
        {renderView()}
      </AppShell>
    </WebSocketProvider>
  )
}

export default App
