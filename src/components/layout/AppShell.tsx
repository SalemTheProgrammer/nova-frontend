import { useEffect, useState, type ReactNode } from "react"
import { Menu, Sparkles } from "lucide-react"
import { Sidebar, type NavView } from "@/components/Sidebar"
import { RightAIAgent } from "@/components/layout/RightAIAgent"
import type { DocumentPassage } from "@/lib/types"
import { useProposals } from "@/hooks/useProposals"

export function AppShell({
  view,
  onChangeView,
  ligneId,
  onChangeLigne,
  onDocumentsPassages,
  aiPanelOpen,
  onAiPanelOpenChange,
  immersive = false,
  children,
}: {
  view: NavView
  onChangeView: (v: NavView) => void
  ligneId: number | null
  onChangeLigne: (id: number | null) => void
  onDocumentsPassages: (passages: DocumentPassage[]) => void
  aiPanelOpen: boolean
  onAiPanelOpenChange: (open: boolean) => void
  /** Vue plein écran (jumeau) : le panneau Nova flotte, détaché des bords. */
  immersive?: boolean
  children: ReactNode
}) {
  // Le jumeau numérique est un simple miroir temps réel : l'agent Nova n'y
  // déclenche jamais de changement de page (voir NovaVoicePage.navigationEnabled).
  const navigationEnabled = view !== "jumeau"
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 768px)").matches,
  )
  const [panelMounted, setPanelMounted] = useState(aiPanelOpen)
  const [panelClosing, setPanelClosing] = useState(false)
  const setAiPanelOpen = onAiPanelOpenChange
  const { pending } = useProposals()

  function handleNavigate(nextView: NavView) {
    onChangeView(nextView)
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false)
  }

  // Laisse la place au panneau Nova : le menu se replie automatiquement à son
  // ouverture (l'utilisateur peut toujours le redéplier manuellement ensuite).
  useEffect(() => {
    if (aiPanelOpen) setSidebarOpen(false)
  }, [aiPanelOpen])

  // Garde le panneau monté le temps de son animation de sortie (sinon il
  // disparaît instantanément dès que `aiPanelOpen` repasse à false).
  useEffect(() => {
    if (aiPanelOpen) {
      setPanelMounted(true)
      setPanelClosing(false)
      return
    }
    setPanelClosing(true)
    const t = setTimeout(() => {
      setPanelMounted(false)
      setPanelClosing(false)
    }, 200)
    return () => clearTimeout(t)
  }, [aiPanelOpen])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        view={view}
        onChange={handleNavigate}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        ligneId={ligneId}
        onChangeLigne={onChangeLigne}
      />
      <div className="relative flex min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3 md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm"
            >
              <Menu className="size-4" />
            </button>
            <img src="/favicon.svg" alt="" className="size-7 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Nova MES</p>
              <p className="truncate text-[11px] text-muted-foreground">Supervision de production</p>
            </div>
          </header>
          <main
            className={`flex min-h-0 min-w-0 flex-1 flex-col ${view === "dashboard" ? "overflow-hidden" : "overflow-y-auto"}`}
          >
            {children}
          </main>
        </div>
        {panelMounted &&
          (immersive ? (
            // Plein écran : le panneau flotte au-dessus de la 3D, détaché des
            // bords haut/bas/droite (marge + coins arrondis).
            <div className="pointer-events-none fixed inset-y-0 right-0 z-50 flex py-4 pr-4">
              <div className="pointer-events-auto h-full">
                <RightAIAgent
                  floating
                  closing={panelClosing}
                  onClose={() => setAiPanelOpen(false)}
                  onNavigate={handleNavigate}
                  onDocumentsPassages={onDocumentsPassages}
                  navigationEnabled={navigationEnabled}
                />
              </div>
            </div>
          ) : (
            <RightAIAgent
              closing={panelClosing}
              onClose={() => setAiPanelOpen(false)}
              onNavigate={handleNavigate}
              onDocumentsPassages={onDocumentsPassages}
              navigationEnabled={navigationEnabled}
            />
          ))}
      </div>

      {/* Bouton flottant Nova : grande pilule violette lumineuse (dégradé + reflet
          + étincelles), masquée quand le panneau est ouvert — celui-ci a déjà son
          propre bouton de fermeture dans l'en-tête. */}
      {!aiPanelOpen && (
        <button
          onClick={() => setAiPanelOpen(true)}
          className={`nova-fab fixed bottom-8 right-8 z-50 animate-in fade-in zoom-in-90 duration-200 ${sidebarOpen ? "hidden md:block" : ""}`}
        >
          <span className="relative z-10 flex items-center gap-3 text-xl font-semibold text-white">
            Nova
            <Sparkles className="nova-fab-sparkle size-6" />
            {pending.length > 0 && (
              <span className="relative inline-flex size-6">
                <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-50" />
                <span className="relative inline-flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-violet-700">
                  {pending.length}
                </span>
              </span>
            )}
          </span>
        </button>
      )}
    </div>
  )
}
