import { useEffect, useState, type ReactNode } from "react"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sidebar, type NavView } from "@/components/Sidebar"
import { RightAIAgent } from "@/components/layout/RightAIAgent"
import { NovaLogo } from "@/components/NovaLogo"
import type { DocumentPassage } from "@/lib/types"

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
  /** Vue plein écran : le panneau Nova flotte, détaché des bords. */
  immersive?: boolean
  children: ReactNode
}) {
  const navigationEnabled = true
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 768px)").matches,
  )
  const [panelMounted, setPanelMounted] = useState(aiPanelOpen)
  const [panelClosing, setPanelClosing] = useState(false)
  const setAiPanelOpen = onAiPanelOpenChange

  function handleNavigate(nextView: NavView) {
    onChangeView(nextView)
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false)
  }

  // Laisse la place au panneau Nova : le menu se replie automatiquement à son
  // ouverture (l'utilisateur peut toujours le redéplier manuellement ensuite).
  useEffect(() => {
    if (aiPanelOpen) setSidebarOpen(false)
  }, [aiPanelOpen])

  // Garde le panneau monté le temps de son animation de sortie.
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
    <div className="flex h-dvh overflow-hidden bg-muted/50 dark:bg-zinc-950">
      <Sidebar
        view={view}
        onChange={handleNavigate}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        ligneId={ligneId}
        onChangeLigne={onChangeLigne}
      />
      <div
        className={cn(
          "relative my-2 ml-2 flex min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-background transition-all md:my-3 md:ml-3",
          panelMounted && !immersive ? "mr-2 md:mr-0" : "mr-2 md:mr-3",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3 md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
            >
              <Menu className="size-4" />
            </button>
            <img src="/nova-logo.png" alt="Nova" className="size-8 object-contain" />
            <p className="truncate text-sm font-semibold">Nova MES</p>
          </header>
          <main
            className={`flex min-h-0 min-w-0 flex-1 flex-col ${view === "dashboard" || view === "afnor" ? "overflow-hidden" : "overflow-y-auto"}`}
          >
            {children}
          </main>
        </div>
      </div>

      {panelMounted &&
        (immersive ? (
          // Plein écran : le panneau flotte au-dessus de la 3D, détaché des bords.
          <div className="pointer-events-none fixed inset-y-0 right-0 z-50 flex py-3 pr-3">
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
          <div className="my-2 mr-2 flex h-[calc(100dvh-1rem)] shrink-0 max-md:fixed max-md:inset-0 max-md:z-50 max-md:m-0 max-md:h-full max-md:w-full md:my-3 md:ml-3 md:mr-3 md:h-[calc(100dvh-1.5rem)]">
            <RightAIAgent
              closing={panelClosing}
              onClose={() => setAiPanelOpen(false)}
              onNavigate={handleNavigate}
              onDocumentsPassages={onDocumentsPassages}
              navigationEnabled={navigationEnabled}
            />
          </div>
        ))}

      {/* Onglet Nova ancré au bord droit : format équilibré */}
      {!aiPanelOpen && (
        <button
          type="button"
          onClick={() => setAiPanelOpen(true)}
          title="Ouvrir l'assistant Nova"
          aria-label="Ouvrir l'assistant Nova"
          className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border border-r-0 border-violet-500/30 bg-violet-600 hover:bg-violet-700 px-2.5 py-3 text-white shadow-lg shadow-violet-500/25 transition-all hover:px-3 active:scale-95"
        >
          <NovaLogo className="size-6 text-white transition-transform hover:scale-110" />
          <span className="rotate-180 text-xs font-semibold tracking-wider text-white [writing-mode:vertical-rl]">
            Nova
          </span>
        </button>
      )}
    </div>
  )
}
