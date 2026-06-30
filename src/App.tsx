import { useState } from "react"
import { PanelLeft } from "lucide-react"
import { Sidebar, type NavView } from "@/components/Sidebar"
import { ChatView } from "@/components/ChatView"
import { StockPage } from "@/components/dashboard/StockPage"
import { OrdresPage } from "@/components/dashboard/OrdresPage"
import { ArticlesPage } from "@/components/dashboard/ArticlesPage"
import { MatieresPage } from "@/components/dashboard/MatieresPage"
import { LignesPage } from "@/components/dashboard/LignesPage"
import { FournisseursPage } from "@/components/dashboard/FournisseursPage"
import { NormesPage } from "@/components/dashboard/NormesPage"

function App() {
  const [view, setView] = useState<NavView>("assistant")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  function renderView() {
    switch (view) {
      case "assistant":
        return <ChatView />
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
      case "normes":
        return <NormesPage />
    }
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar
        view={view}
        onChange={setView}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-40 rounded-md border border-border bg-background p-1.5 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
        <div className="flex flex-1 flex-col overflow-y-auto">{renderView()}</div>
      </div>
    </div>
  )
}

export default App
