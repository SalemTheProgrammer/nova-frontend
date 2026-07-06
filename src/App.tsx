import { useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { WebSocketProvider } from "@/hooks/useWebSocket"
import type { NavView } from "@/components/Sidebar"
import type { DocumentFocus, DocumentPassage } from "@/lib/types"
import { DocumentsPage } from "@/components/dashboard/DocumentsPage"
import { MesDashboardPage } from "@/components/dashboard/MesDashboardPage"
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
import { ConsoleUsinePage } from "@/components/dashboard/ConsoleUsinePage"
import { NovaVoicePage } from "@/components/dashboard/NovaVoicePage"

function App() {
  const [view, setView] = useState<NavView>("dashboard")
  const [ligneId, setLigneId] = useState<number | null>(null)
  const [docFocus, setDocFocus] = useState<DocumentFocus | null>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  /** L'agent a cité des documents : ouvre le viewer PDF sur le premier passage localisable. */
  function handleDocumentsPassages(passages: DocumentPassage[]) {
    const premier = passages.find((p) => p.document_id != null && p.page != null)
    if (!premier) return
    setDocFocus({ documentId: premier.document_id!, page: premier.page!, passages })
    setView("documents")
  }

  function renderView() {
    switch (view) {
      case "dashboard":
        return <MesDashboardPage ligneId={ligneId} />
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
      case "documents":
        return <DocumentsPage focus={docFocus} onClearFocus={() => setDocFocus(null)} />
      case "simulateur":
        // Console usine servie par le backend (flux n8n + pupitre simulateur).
        return <ConsoleUsinePage />
      case "assistant":
        // Mode voix plein écran : navigation désactivée (navigationEnabled=false),
        // seule l'instance du panneau latéral pilote les changements de page.
        return <NovaVoicePage navigationEnabled={false} />
    }
  }

  return (
    <WebSocketProvider>
      <AppShell
        view={view}
        onChangeView={setView}
        ligneId={ligneId}
        onChangeLigne={setLigneId}
        onDocumentsPassages={handleDocumentsPassages}
        aiPanelOpen={aiPanelOpen}
        onAiPanelOpenChange={setAiPanelOpen}
      >
        {renderView()}
      </AppShell>
    </WebSocketProvider>
  )
}

export default App
