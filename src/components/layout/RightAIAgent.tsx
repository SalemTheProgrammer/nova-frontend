import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import {
  ArrowUp,
  Loader2,
  Mic,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { aiChatBus } from "@/lib/aiChatBus"
import { useAgentChat } from "@/hooks/useAgentChat"
import { useVoice } from "@/hooks/useVoice"
import { useWebSocket } from "@/hooks/useWebSocket"
import { AgentTurnView } from "@/components/agent/AgentMessage"
import { NovaGreeting } from "@/components/agent/NovaGreeting"
import { NovaLogo } from "@/components/NovaLogo"
import type { NavView } from "@/components/Sidebar"
import type { DocumentPassage } from "@/lib/types"

const VALID_VIEWS: readonly string[] = [
  "dashboard",
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
  floating?: boolean
  navigationEnabled?: boolean
}) {
  const { connected } = useWebSocket()
  const [input, setInput] = useState("")
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const ttsEnabledRef = useRef(ttsEnabled)
  ttsEnabledRef.current = ttsEnabled

  const voice = useVoice((text) => {
    setInput("")
    void send(text)
  })
  const { turns, loading, send, clear, pret, adopterThread, threadActuel } = useAgentChat(
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
    },
  )
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Accueil de Nova : seulement pour une conversation vide, et une fois
  // l'historique éventuel rechargé (sinon il s'afficherait puis disparaîtrait).
  // Il reste ensuite en tête de la conversation ; « effacer » en relance un.
  const [accueil, setAccueil] = useState(false)
  const [accueilKey, setAccueilKey] = useState(0)
  useEffect(() => {
    if (pret && turns.length === 0) setAccueil(true)
  }, [pret, turns.length])

  // Permet à une autre page (ex. « Créer avec Nova » sur Ordres) de préremplir
  // et d'envoyer un message dès que ce panneau est monté (voir aiChatBus.ts).
  useEffect(() => {
    aiChatBus.setHandler((texte) => void send(texte))
    return () => aiChatBus.setHandler(null)
  }, [send])

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
    if (
      window.confirm("Effacer toute la conversation avec Nova ? Cette action est irréversible.")
    ) {
      void clear()
      setAccueilKey((k) => k + 1)
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full w-[26rem] shrink-0 flex-col bg-card duration-200 md:w-[27.5rem]",
        floating
          ? "overflow-hidden rounded-xl border border-border shadow-2xl"
          : "overflow-hidden rounded-xl border border-border shadow-sm",
        closing
          ? "animate-out slide-out-to-right-8 fade-out"
          : "animate-in slide-in-from-right-8 fade-in",
      )}
    >
      {/* En-tête style Sidebar Drawer */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-500/25 transition-transform hover:scale-105">
            <NovaLogo className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Assistant Nova
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                  connected
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                {connected ? "En ligne" : "Hors ligne"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Copilote IA & supervision atelier</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            disabled={turns.length === 0}
            title="Effacer la conversation"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (ttsEnabled) voice.stopSpeaking()
              setTtsEnabled((v) => !v)
            }}
            title={ttsEnabled ? "Désactiver la voix" : "Nova répond à voix haute"}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              ttsEnabled
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {ttsEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fermer le panneau"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {accueil && (
          <NovaGreeting key={accueilKey} threadId={threadActuel()} onThread={adopterThread} />
        )}
        {turns.map((turn) => (
          <AgentTurnView
            key={turn.id}
            turn={turn}
            onQuickReply={(text) => void send(text)}
          />
        ))}
        {loading && turns[turns.length - 1]?.segments.length === 0 && (
          <div className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
            <div className="flex size-5 items-center justify-center rounded-md bg-muted">
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            </div>
            <span>Nova analyse votre requête…</span>
          </div>
        )}
      </div>

      {/* Saisie + voix style Sidebar */}
      <div className="shrink-0 border-t border-border/80 bg-card p-3">
        {voice.transcribing && (
          <p className="mb-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin text-primary" /> Transcription vocale en cours…
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex items-end gap-2 rounded-xl border border-border bg-background p-1.5 pl-3.5 shadow-xs transition-all",
            "focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-foreground/5",
            voice.recording && "border-destructive/60 ring-2 ring-destructive/20",
          )}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voice.recording ? "Parlez, je vous écoute…" : "Demandez à Nova…"}
            rows={1}
            className="field-sizing-content max-h-32 flex-1 resize-none bg-transparent py-1 text-xs sm:text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex shrink-0 items-center gap-1 pb-0.5">
            <button
              type="button"
              onClick={() =>
                voice.recording ? voice.stopRecording() : void voice.startRecording()
              }
              title={voice.recording ? "Terminer et envoyer" : "Parler à Nova"}
              className={cn(
                "flex size-8 items-center justify-center rounded-xl transition-all active:scale-95",
                voice.recording
                  ? "bg-destructive text-white shadow-sm animate-pulse"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {voice.recording ? <Square className="size-3.5" /> : <Mic className="size-4" />}
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                "flex size-8 items-center justify-center rounded-xl transition-all active:scale-95",
                input.trim()
                  ? "bg-foreground text-background shadow-xs hover:opacity-90"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed",
              )}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </aside>
  )
}
