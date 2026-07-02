import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp, Loader2, Sparkles, Wifi, WifiOff, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessage, type ChatMsg } from "@/components/ChatMessage"
import { aiApi, sendChatMessage } from "@/lib/api"
import { useWebSocket } from "@/hooks/useWebSocket"

let counter = 0
const nextId = () => `ai-msg-${Date.now()}-${counter++}`

export function RightAIAgent({ onClose }: { onClose: () => void }) {
  const { connected, lastMessage } = useWebSocket()
  const [insights, setInsights] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const threadId = useRef<string | undefined>(undefined)

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

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }])
    setInput("")
    setLoading(true)
    try {
      const res = await sendChatMessage(trimmed, threadId.current)
      threadId.current = res.thread_id
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: res.response }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Une erreur est survenue",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    void handleSend(input)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full w-96 shrink-0 flex-col border-l border-border bg-sidebar",
        "animate-in slide-in-from-right-8 fade-in duration-200",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">Assistant Nova</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
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

      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Insights temps réel
        </p>
        <div className="space-y-2">
          {insights.length === 0 && (
            <p className="text-xs text-muted-foreground">Chargement des insights…</p>
          )}
          {insights.map((insight, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground/90"
            >
              {insight}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Posez une question sur la production, le TRS ou un arrêt en cours.
          </p>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Réflexion…
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Question à Nova…"
            rows={1}
            className={cn(
              "field-sizing-content max-h-32 w-full resize-none rounded-xl border border-input bg-background py-2.5 pl-3 pr-10 text-sm",
              "outline-none transition-colors placeholder:text-muted-foreground",
              "focus:border-ring focus:ring-2 focus:ring-ring/20",
            )}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={cn(
              "absolute bottom-1.5 right-1.5 flex size-7 items-center justify-center rounded-lg transition-colors",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/80"
                : "bg-muted text-muted-foreground",
            )}
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
          </button>
        </form>
      </div>
    </aside>
  )
}
