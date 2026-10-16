import { useEffect, useState, type ReactNode } from "react"
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import type { NavView } from "@/components/Sidebar"
import type { DocumentFocus, DocumentPassage } from "@/lib/types"
import { DocumentsPage } from "@/components/shared/DocumentsPage"
import { EnConstruction } from "@/components/shared/EnConstruction"
import { LoginPage } from "@/components/auth/LoginPage"
import { AdminUsersPage } from "@/components/admin/AdminUsersPage"
import { aiChatBus } from "@/lib/aiChatBus"
import { useAuth } from "@/lib/auth"
import { canAccessView, firstAccessibleView } from "@/lib/permissions"

const NAV_VIEWS: NavView[] = [
  "atelier",
  "chaines",
  "of",
  "operateurs",
  "commandes",
  "rapports",
  "documents",
  "admin",
]

export const VIEW_TITLES: Record<NavView, string> = {
  atelier: "Tableau de bord",
  chaines: "Chaînes",
  of: "Ordres de fabrication",
  operateurs: "Opérateurs",
  commandes: "Commandes & livraisons",
  rapports: "Rapports",
  documents: "Documentation",
  admin: "Administration",
}

function isNavView(value: string | undefined): value is NavView {
  return !!value && (NAV_VIEWS as string[]).includes(value)
}

function AppContent({ view }: { view: NavView }) {
  const navigate = useNavigate()
  const setView = (next: NavView) => navigate(`/app/${next}`)
  const [docFocus, setDocFocus] = useState<DocumentFocus | null>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  // Permet à tout composant (ou bouton AI) d'ouvrir le panneau Nova
  useEffect(() => {
    aiChatBus.setOpenHandler(() => setAiPanelOpen(true))
    return () => aiChatBus.setOpenHandler(null)
  }, [])

  // Met à jour le titre de l'onglet du navigateur
  useEffect(() => {
    const titre = VIEW_TITLES[view] || "Nova"
    document.title = `${titre} — Nova`
  }, [view])

  /** L'agent a cité des documents : ouvre le viewer PDF sur le premier passage localisable. */
  function handleDocumentsPassages(passages: DocumentPassage[]) {
    const premier = passages.find((p) => p.document_id != null && p.page != null)
    if (!premier) return
    setDocFocus({ documentId: premier.document_id!, page: premier.page!, passages })
    setView("documents")
  }

  function renderView() {
    switch (view) {
      case "atelier":
      case "chaines":
      case "of":
      case "operateurs":
      case "commandes":
      case "rapports":
        return <EnConstruction />
      case "documents":
        return <DocumentsPage focus={docFocus} onClearFocus={() => setDocFocus(null)} />
      case "admin":
        return <AdminUsersPage />
    }
  }

  return (
    <AppShell
      view={view}
      onChangeView={setView}
      onDocumentsPassages={handleDocumentsPassages}
      aiPanelOpen={aiPanelOpen}
      onAiPanelOpenChange={setAiPanelOpen}
    >
      {renderView()}
    </AppShell>
  )
}

/** Utilisateur sans aucun outil activé : pas de redirection possible. */
function AucunAcces() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
      Aucun accès — demandez à l'administrateur d'activer vos outils.
    </div>
  )
}

function ViewRoute() {
  const { view } = useParams<{ view: string }>()
  const { user } = useAuth()
  const repli = firstAccessibleView(user)
  if (!isNavView(view)) {
    return repli ? <Navigate to={`/app/${repli}`} replace /> : <AucunAcces />
  }
  // Garde-fou pour un lien direct/marque-page vers une page hors du périmètre
  // de l'utilisateur — la nav (Sidebar) cache déjà ces entrées, mais l'URL
  // reste tapable à la main ; le backend refuserait de toute façon les appels
  // API de cette page (voir app/core/access.py), donc autant rediriger direct.
  if (!canAccessView(user, view)) {
    return repli ? <Navigate to={`/app/${repli}`} replace /> : <AucunAcces />
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

function App() {
  const { user, loading } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={
          loading ? <AuthLoading /> : user ? <Navigate to="/app/atelier" replace /> : <LoginPage />
        }
      />
      <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
      <Route
        path="/app/:view"
        element={
          <RequireAuth>
            <ViewRoute />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/app/atelier" replace />} />
      <Route path="*" element={<Navigate to="/app/atelier" replace />} />
    </Routes>
  )
}

export default App
