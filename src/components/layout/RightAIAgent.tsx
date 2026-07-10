import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import {
  ArrowUp,
  Loader2,
  Mic,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { aiApi } from "@/lib/api"
import { useAgentChat } from "@/hooks/useAgentChat"
import { useProposals } from "@/hooks/useProposals"
import { useVoice } from "@/hooks/useVoice"
import { useWebSocket } from "@/hooks/useWebSocket"
import { AgentTurnView } from "@/components/agent/AgentMessage"
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
}: {
  onClose: () => void
  onNavigate: (view: NavView) => void
  onDocumentsPassages: (passages: DocumentPassage[]) => void
}) {
  const { connected, lastMessage } = useWebSocket()
  const [insights, setInsights] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const ttsEnabledRef = useRef(ttsEnabled)
  ttsEnabledRef.current = ttsEnabled

  const voice = useVoice((text) => {
    setInput("")
    void send(text)
  })
  const { turns, loading, send } = useAgentChat(
    (finalText) => {
      if (ttsEnabledRef.current && finalText) void voice.speak(finalText)
    },
    (artifact) => {
      if (
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
        onNavigate("jumeau")
        twinBus.emit({
          action: artifact.action as TwinCommand["action"],
          cible: artifact.cible as string | undefined,
          valeur: artifact.valeur as number | boolean | undefined,
        })
      }
    },
  )
  const { pending, applyDecision } = useProposals()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    aiApi
      .insights()
      .then((r) => {
        if (!cancelled) setInsights(r.insights)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // se rafraîchit à chaque événement machine reçu par WebSocket
  }, [lastMessage])

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

  return (
    <aside
      className={cn(
        "flex h-full w-[26rem] shrink-0 flex-col border-l border-border bg-sidebar",
        "animate-in slide-in-from-right-8 duration-200",
      )}
    >
      {/* En-tête */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">Assistant Nova</span>
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

      {/* Propositions en attente (human-in-the-loop) */}
      {pending.length > 0 && (
        <div className="shrink-0 space-y-2 border-b border-border bg-destructive/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Décisions en attente
          </p>
          {pending.slice(0, 2).map((p) => (
            <ProposalCard key={p.id} proposal={p} onDecided={applyDecision} />
          ))}
        </div>
      )}

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
          <div className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Nova analyse…
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
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voice.recording ? "Parlez, je vous écoute…" : "Question à Nova…"}
            rows={1}
            className={cn(
              "field-sizing-content max-h-32 w-full resize-none rounded-xl border border-input bg-background py-2.5 pl-3 pr-[4.25rem] text-sm",
              "outline-none transition-colors placeholder:text-muted-foreground",
              "focus:border-ring focus:ring-2 focus:ring-ring/20",
              voice.recording && "border-destructive/60 ring-2 ring-destructive/20",
            )}
          />
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => (voice.recording ? voice.stopRecording() : void voice.startRecording())}
              title={voice.recording ? "Terminer et envoyer" : "Parler à Nova"}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg transition-colors",
                voice.recording
                  ? "animate-pulse bg-destructive text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {voice.recording ? <Square className="size-3" /> : <Mic className="size-3.5" />}
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg transition-colors",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
            </button>
          </div>
        </form>
      </div>
    </aside>
  )
}
