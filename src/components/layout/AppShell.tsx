import { useState, type ReactNode } from "react"
import { PanelLeft, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sidebar, type NavView } from "@/components/Sidebar"
import { RightAIAgent } from "@/components/layout/RightAIAgent"

export function AppShell({
  view,
  onChangeView,
  ligneId,
  onChangeLigne,
  children,
}: {
  view: NavView
  onChangeView: (v: NavView) => void
  ligneId: number | null
  onChangeLigne: (id: number | null) => void
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar
        view={view}
        onChange={onChangeView}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        ligneId={ligneId}
        onChangeLigne={onChangeLigne}
      />
      <div className="relative flex flex-1 overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-40 rounded-md border border-border bg-background p-1.5 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
        {aiPanelOpen && <RightAIAgent onClose={() => setAiPanelOpen(false)} />}
      </div>

      <button
        onClick={() => setAiPanelOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3",
          "text-sm font-medium shadow-lg transition-transform hover:scale-105",
          aiPanelOpen
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground",
        )}
      >
        {aiPanelOpen ? <X className="size-4" /> : <Sparkles className="size-4" />}
        Nova
      </button>
    </div>
  )
}
