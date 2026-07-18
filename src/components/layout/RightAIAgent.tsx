import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import {
  ArrowUp,
  Loader2,
  Mic,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { aiApi } from "@/lib/api"
import { aiChatBus } from "@/lib/aiChatBus"
import { useAgentChat } from "@/hooks/useAgentChat"
import { useProposals } from "@/hooks/useProposals"
import { useVoice } from "@/hooks/useVoice"
import { useWebSocket } from "@/hooks/useWebSocket"
import { AgentTurnView } from "@/components/agent/AgentMessage"
import { AutonomyToggle } from "@/components/agent/AutonomyToggle"
import { ProposalCard } from "@/components/agent/ProposalCard"
import type { NavView } from "@/components/Sidebar"
import type { DocumentPassage } from "@/lib/types"
import { twinBus, type TwinCommand } from "@/components/twin/twinBus"

const VALID_VIEWS: readonly string[] = [
  "dashboard",
  "jumeau",
  "machines",
  "trs",
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
  "simulateur",
]

const SUGGESTIONS = [
  "Quel est le TRS de l'usine et pourquoi ?",
  "Lance la fabrication de 500 unités",
  "Quelle est la meilleure ligne disponible ?",
  "Quelles machines risquent de tomber en panne ?",
  "Génère le rapport de production",
]

export function RightAIAgent({
  onClose,
  onNavigate,
  onDocumentsPassages,
  closing = false,
  floating = false,
  navigationEnabled = true,
}: {
  onClose: () => void
  onNavigate: (view: NavView) => void
  onDocumentsPassages: (passages: DocumentPassage[]) => void
  closing?: boolean
  /** Mode plein écran du jumeau : panneau détaché des bords, coins arrondis. */
  floating?: boolean
  /** false dans le jumeau numérique : les artifacts de navigation/pilotage sont
   * ignorés, le jumeau reste un simple miroir temps réel (voir NovaVoicePage). */
  navigationEnabled?: boolean
}) {
  const { connected, lastMessage } = useWebSocket()
  const [insights, setInsights] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<"chat" | "decisions">("chat")
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const ttsEnabledRef = useRef(ttsEnabled)
  ttsEnabledRef.current = ttsEnabled

  const voice = useVoice((text) => {
    setInput("")
    void send(text)
  })
  const { turns, loading, send, clear } = useAgentChat(
    (finalText) => {
      if (ttsEnabledRef.current && finalText) void voice.speak(finalText)
    },
    (artifact) => {
      if (
        navigationEnabled &&
        artifact.kind === "navigation" &&
        typeof artifact.page === "string" &&
        VALID_VIEWS.includes(artifact.page)
      ) {
        onNavigate(artifact.page as NavView)
      }
      if (artifact.kind === "documents" && Array.isArray(artifact.passages)) {
        // Ouvre le PDF source avec les passages cités surlignés.
        onDocumentsPassages(artifact.passages as DocumentPassage[])
      }
      if (artifact.kind === "twin_command" && typeof artifact.action === "string") {
        // Nova pilote le jumeau : on ouvre la page (le map de navigation ouvre
        // déjà `jumeau`) et on transmet la commande au moteur de simulation.
        if (navigationEnabled) onNavigate("jumeau")
        twinBus.emit({
          action: artifact.action as TwinCommand["action"],
          cible: artifact.cible as string | undefined,
          valeur: artifact.valeur as number | boolean | undefined,
        })
      }
    },
  )
  const { pending, recentDecided, applyDecision } = useProposals()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Permet à une autre page (ex. « Créer avec Nova » sur Ordres) de préremplir
  // et d'envoyer un message dès que ce panneau est monté (voir aiChatBus.ts).
  useEffect(() => {
    aiChatBus.setHandler((texte) => void send(texte))
    return () => aiChatBus.setHandler(null)
  }, [send])

  const insightsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    function fetchInsights() {
      aiApi
        .insights()
        .then((r) => {
          if (!cancelled) setInsights(r.insights)
        })
        .catch(() => {})
    }

    fetchInsights()
    return () => {
      cancelled = true
    }
  }, [])

  // Les événements machine (broadcasts WebSocket) arrivent plusieurs fois par
  // seconde en usine simulée : un refetch par message a saturé le pool de
  // connexions DB en production (endpoint coûteux appelé ~2x/s). On se
  // contente donc d'un refresh au plus une fois toutes les 15s, comme
  // useDashboardData le fait déjà pour le résumé du tableau de bord.
  useEffect(() => {
    if (!lastMessage) return
    if (insightsTimer.current == null) {
      insightsTimer.current = setTimeout(() => {
        insightsTimer.current = null
        aiApi
          .insights()
          .then((r) => setInsights(r.insights))
          .catch(() => {})
      }, 15000)
    }
  }, [lastMessage])

  useEffect(
    () => () => {
      if (insightsTimer.current != null) clearTimeout(insightsTimer.current)
    },
    [],
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, loading])

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!input.trim() || loading) return
    const text = input
    setInput("")
    void send(text)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleClear() {
    if (turns.length === 0) return
    if (window.confirm("Effacer toute la conversation avec Nova ? Cette action est irréversible.")) {
      void clear()
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full w-[26rem] shrink-0 flex-col bg-sidebar duration-200",
        floating
          ? "overflow-hidden rounded-2xl border border-border shadow-2xl"
          : "border-l border-border",
        closing
          ? "animate-out slide-out-to-right-8 fade-out"
          : "animate-in slide-in-from-right-8 fade-in",
      )}
    >
      {/* En-tête */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">Assistant Nova</span>
          <button
            onClick={handleClear}
            disabled={turns.length === 0}
            title="Effacer la conversation"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
          </button>
          {pending.length > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (ttsEnabled) voice.stopSpeaking()
              setTtsEnabled((v) => !v)
            }}
            title={ttsEnabled ? "Désactiver la voix" : "Nova répond à voix haute"}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              ttsEnabled
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {ttsEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <span
            className={cn(
              "flex items-center text-xs",
              connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
            )}
            title={connected ? "WebSocket connecté" : "WebSocket déconnecté"}
          >
            {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex shrink-0 border-b border-border">
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === "chat"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Discussion
        </button>
        <button
          onClick={() => setActiveTab("decisions")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === "decisions"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Décisions en attente
          {pending.length > 0 && (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "decisions" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <AutonomyToggle />
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune décision en attente.</p>
            ) : (
              pending.map((p) => <ProposalCard key={p.id} proposal={p} onDecided={applyDecision} />)
            )}
            {recentDecided.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Décisions récentes
                </p>
                {recentDecided.map((p) => (
                  <ProposalCard key={p.id} proposal={p} compact />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Insights temps réel
                  </p>
                  {insights.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Analyse en cours…</p>
                  ) : (
                    insights.map((insight, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground/90"
                      >
                        {insight}
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Essayez
                  </p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((turn) => (
              <AgentTurnView key={turn.id} turn={turn} onQuickReply={(text) => void send(text)} />
            ))}
            {loading && turns[turns.length - 1]?.segments.length === 0 && (
              <div className="flex items-center gap-1.5 pl-10 text-xs text-muted-foreground">
                <span>Nova réfléchit</span>
                <span className="flex items-center gap-0.5">
                  <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <span className="size-1 animate-bounce rounded-full bg-current" />
                </span>
              </div>
            )}
          </div>

          {/* Saisie + voix */}
          <div className="shrink-0 border-t border-border p-3">
            {voice.transcribing && (
              <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Transcription en cours…
              </p>
            )}
            <form
              onSubmit={handleSubmit}
              className={cn(
                "flex items-center gap-2 rounded-2xl border border-input bg-background py-1.5 pl-3.5 pr-1.5",
                "transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
                voice.recording && "border-destructive/60 ring-2 ring-destructive/20",
              )}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voice.recording ? "Parlez, je vous écoute…" : "Question à Nova…"}
                rows={1}
                className="field-sizing-content max-h-32 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => (voice.recording ? voice.stopRecording() : void voice.startRecording())}
                  title={voice.recording ? "Terminer et envoyer" : "Parler à Nova"}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-all duration-150",
                    voice.recording
                      ? "animate-pulse bg-destructive text-white shadow-sm shadow-destructive/40"
                      : "bg-foreground text-background hover:scale-105 hover:bg-foreground/85",
                  )}
                >
                  {voice.recording ? <Square className="size-3.5" /> : <Mic className="size-4" />}
                </button>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-all duration-150",
                    input.trim()
                      ? "bg-foreground text-background shadow-sm shadow-foreground/30 hover:scale-105 hover:bg-foreground/85"
                      : "bg-foreground/15 text-foreground/40",
                  )}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </aside>
  )
}
