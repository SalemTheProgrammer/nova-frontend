import { useEffect, useState, type ReactNode } from "react"
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { WebSocketProvider } from "@/hooks/useWebSocket"
import type { NavView } from "@/components/Sidebar"
import type { DocumentFocus, DocumentPassage } from "@/lib/types"
import { DocumentsPage } from "@/components/dashboard/DocumentsPage"
import { MesDashboardPage } from "@/components/dashboard/MesDashboardPage"
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
import { AfnorScreen } from "@/components/dashboard/AfnorScreen"
import { LoginPage } from "@/components/auth/LoginPage"
import { AdminUsersPage } from "@/components/admin/AdminUsersPage"
import { aiChatBus } from "@/lib/aiChatBus"
import { useAuth } from "@/lib/auth"
import { canAccessView, firstAccessibleView } from "@/lib/permissions"

const NAV_VIEWS: NavView[] = [
  "dashboard",
  "trs",
  "afnor",
  "arrets",
  "qualite",
  "maintenance",
  "stock",
  "ordres",
  "articles",
  "matieres",
  "lignes",
  "fournisseurs",
  "documents",
]

export const VIEW_TITLES: Record<NavView, string> = {
  dashboard: "Tableau de bord MES",
  trs: "TRS & Pertes de Rendement",
  afnor: "Norme AFNOR NF E 60-182",
  arrets: "Journal des Arrêts",
  qualite: "Contrôle Qualité & Rejets",
  maintenance: "Maintenance & Interventions",
  stock: "Gestion des Stocks",
  ordres: "Ordres de Fabrication",
  articles: "Catalogue Articles & Recettes",
  matieres: "Matières Premières",
  lignes: "Lignes de Production",
  fournisseurs: "Fournisseurs",
  documents: "Documentation Technique & BPF",
}

function isNavView(value: string | undefined): value is NavView {
  return !!value && (NAV_VIEWS as string[]).includes(value)
}

function AppContent({ view }: { view: NavView }) {
  const navigate = useNavigate()
  const setView = (next: NavView) => navigate(`/app/${next}`)
  const [ligneId, setLigneId] = useState<number | null>(null)
  const [docFocus, setDocFocus] = useState<DocumentFocus | null>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  // Permet à tout composant (ou bouton AI) d'ouvrir le panneau Nova
  useEffect(() => {
    aiChatBus.setOpenHandler(() => setAiPanelOpen(true))
    return () => aiChatBus.setOpenHandler(null)
  }, [])

  // Met à jour le titre de l'onglet du navigateur
  useEffect(() => {
    const titre = VIEW_TITLES[view] || "Supervision"
    document.title = `${titre} — Nova`
  }, [view])

  /** L'agent a cité des documents : ouvre le viewer PDF sur le premier passage localisable. */
  function handleDocumentsPassages(passages: DocumentPassage[]) {
    const premier = passages.find((p) => p.document_id != null && p.page != null)
    if (!premier) return
    setDocFocus({ documentId: premier.document_id!, page: premier.page!, passages })
    setView("documents")
  }

  /** Ouvre le panneau Nova et lui envoie directement un message préconstruit
   * (ex. « Créer avec Nova » sur la page Ordres). */
  function askNova(message: string) {
    setAiPanelOpen(true)
    aiChatBus.emit(message)
  }

  function renderView() {
    switch (view) {
      case "dashboard":
        return <MesDashboardPage ligneId={ligneId} onChangeLigne={setLigneId} />
      case "trs":
        return <TRSPage ligneId={ligneId} />
      case "afnor":
        return <AfnorScreen />
      case "arrets":
        return <ArretsPage />
      case "qualite":
        return <QualitePage />
      case "maintenance":
        return <MaintenancePage />
      case "stock":
        return <StockPage />
      case "ordres":
        return <OrdresPage onAskNova={askNova} />
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

function ViewRoute() {
  const { view } = useParams<{ view: string }>()
  const { user } = useAuth()
  if (!isNavView(view)) return <Navigate to={`/app/${firstAccessibleView(user)}`} replace />
  // Garde-fou pour un lien direct/marque-page vers une page hors du périmètre
  // de l'utilisateur — la nav (Sidebar) cache déjà ces entrées, mais l'URL
  // reste tapable à la main ; le backend refuserait de toute façon les appels
  // API de cette page (voir app/core/access.py), donc autant rediriger direct.
  if (!canAccessView(user, view)) {
    return <Navigate to={`/app/${firstAccessibleView(user)}`} replace />
  }
  return <AppContent view={view} />
}

/** Écran de chargement pendant la revalidation du jeton au démarrage. */
function AuthLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      Chargement…
    </div>
  )
}

/** Redirige vers /login si non connecté. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Réservé à l'administrateur : les autres retournent au dashboard. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function App() {
  const { user, loading } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={
          loading ? <AuthLoading /> : user ? <Navigate to="/app/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminUsersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/app/:view"
        element={
          <RequireAuth>
            <ViewRoute />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  )
}

export default App
