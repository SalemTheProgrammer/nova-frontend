import { useEffect, useState, type ReactNode } from "react"
import { Menu, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
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
    <div className="flex h-dvh overflow-hidden bg-muted/40 dark:bg-zinc-950">
      <Sidebar
        view={view}
        onChange={handleNavigate}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        ligneId={ligneId}
        onChangeLigne={onChangeLigne}
      />
      <div className="relative flex min-w-0 flex-1 overflow-hidden m-2 md:m-0 md:my-3 md:mr-3 md:ml-3 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-sm shadow-xl">
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
            <img src="/nova-logo.png" alt="Nova" className="size-7 rounded-lg object-contain" />
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

      {/* Bouton vertical Nova AI ancré au bord droit, centré verticalement, avec logo Nova */}
      {!aiPanelOpen && (
        <button
          type="button"
          onClick={() => setAiPanelOpen(true)}
          title="Ouvrir le copilote Nova AI"
          aria-label="Ouvrir le copilote Nova AI"
          className={cn(
            "fixed right-0 top-1/2 -translate-y-1/2 z-50 group flex flex-col items-center gap-2.5 py-3 px-2",
            "rounded-l-2xl border-l border-y border-violet-400/40",
            "bg-gradient-to-b from-violet-600 via-indigo-700 to-violet-950",
            "shadow-[0_4px_24px_rgba(124,58,237,0.45)] backdrop-blur-xl",
            "transition-all duration-300 ease-out hover:-translate-x-1.5 hover:shadow-[0_6px_32px_rgba(139,92,246,0.6)]",
            "cursor-pointer select-none",
          )}
        >
          {/* Logo Nova Badge avec effet de verre */}
          <div className="relative flex size-7 items-center justify-center rounded-xl bg-white/15 p-1 backdrop-blur-md shadow-inner ring-1 ring-white/30 transition-transform group-hover:scale-110">
            <img
              src="/nova-logo.png"
              alt="Nova AI"
              className="size-full object-contain drop-shadow"
            />
            {/* LED verte pulsation live */}
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-violet-700 animate-pulse" />
          </div>

          {/* Label vertical Nova AI */}
          <div className="flex flex-col items-center gap-1">
            <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-black uppercase tracking-widest text-white drop-shadow-sm font-mono">
              NOVA AI
            </span>
            <Sparkles className="size-3 text-violet-200 animate-pulse" />
          </div>

          {/* Badge de notifications de propositions */}
          {pending.length > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-md ring-2 ring-violet-900 animate-bounce">
              {pending.length}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
