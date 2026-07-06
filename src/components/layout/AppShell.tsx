import { useState, type ReactNode } from "react"
import { PanelLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sidebar, type NavView } from "@/components/Sidebar"
import { RightAIAgent } from "@/components/layout/RightAIAgent"
import { NovaOrb } from "@/components/agent/NovaOrb"
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
  children,
}: {
  view: NavView
  onChangeView: (v: NavView) => void
  ligneId: number | null
  onChangeLigne: (id: number | null) => void
  onDocumentsPassages: (passages: DocumentPassage[]) => void
  aiPanelOpen: boolean
  onAiPanelOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const setAiPanelOpen = onAiPanelOpenChange
  const { pending } = useProposals()

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
        {aiPanelOpen && (
          <RightAIAgent
            onClose={() => setAiPanelOpen(false)}
            onNavigate={onChangeView}
            onDocumentsPassages={onDocumentsPassages}
          />
        )}
      </div>

      {/* Bouton flottant : la mini-bulle vivante de Nova — même identité que le
          mode vocal plein écran (violet « réfléchit » quand des décisions attendent). */}
      <button
        onClick={() => setAiPanelOpen(!aiPanelOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full py-2 pl-2 pr-4",
          "border border-border bg-background text-sm font-medium text-foreground",
          "shadow-lg transition-transform hover:scale-105",
        )}
      >
        {aiPanelOpen ? (
          <span className="flex size-8 items-center justify-center">
            <X className="size-4" />
          </span>
        ) : (
          <NovaOrb etat={pending.length > 0 ? "reflexion" : "repos"} className="size-8" />
        )}
        Nova
        {!aiPanelOpen && pending.length > 0 && (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </button>
    </div>
  )
}
