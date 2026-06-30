import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp, Bot, ClipboardList, FlaskConical, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessage, type ChatMsg } from "@/components/ChatMessage"
import { sendChatMessage } from "@/lib/api"

let counter = 0
const nextId = () => `msg-${Date.now()}-${counter++}`

const suggestions = [
  { icon: ClipboardList, text: "Lance un OF de 300 boîtes de PARA500" },
  { icon: FlaskConical, text: "Quel est l'état du stock des matières premières ?" },
  { icon: Sparkles, text: "Vérifie la faisabilité de 1000 unités de PARA500" },
  { icon: Bot, text: "Quels articles puis-je fabriquer ?" },
]

export function ChatView() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadId = useRef<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

  const isEmpty = messages.length === 0

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setError(null)
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }])
    setInput("")
    setLoading(true)
    scrollToBottom()

    try {
      const res = await sendChatMessage(trimmed, threadId.current)
      threadId.current = res.thread_id
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: res.response }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
      scrollToBottom()
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
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4">
          {isEmpty ? (
            <div className="flex min-h-[calc(100svh-7rem)] flex-col items-center justify-center">
              <div className="mb-8 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="size-8 text-primary" />
              </div>
              <h1 className="mb-2 text-2xl font-semibold tracking-tight">
                Superviseur de fabrication
              </h1>
              <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
                Lancez des ordres de fabrication, vérifiez le stock et la faisabilité —
                en langage naturel.
              </p>
              <div className="grid w-full max-w-lg grid-cols-2 gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => void handleSend(s.text)}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <s.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="text-foreground/80">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-6">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 pt-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Réflexion…
                  </div>
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-background">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message au superviseur…"
              rows={1}
              className={cn(
                "field-sizing-content max-h-40 w-full resize-none rounded-2xl border border-input bg-muted/30 py-3 pl-4 pr-12 text-sm",
                "outline-none transition-colors placeholder:text-muted-foreground",
                "focus:border-ring focus:ring-2 focus:ring-ring/20",
              )}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                "absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-xl transition-colors",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Nova peut se tromper. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  )
}
