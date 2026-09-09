import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, Sparkles } from "lucide-react"
import { Card, EmptyState } from "@/components/dashboard/primitives"
import { aiApi } from "@/lib/api"
import { aiChatBus } from "@/lib/aiChatBus"
import { useWebSocket } from "@/hooks/useWebSocket"

/** Flash-brief d'atelier généré par Nova Agent */
export function StationSummaryCard() {
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { lastMessage } = useWebSocket()

  const loadInsights = useCallback(() => {
    let cancelled = false
    aiApi
      .insights()
      .then((r) => {
        if (!cancelled) setInsights(r.insights)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => loadInsights(), [loadInsights])

  useEffect(() => {
    if (!lastMessage || refreshTimer.current != null) return
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      loadInsights()
    }, 5000)
  }, [lastMessage, loadInsights])

  useEffect(
    () => () => {
      if (refreshTimer.current != null) clearTimeout(refreshTimer.current)
    },
    [],
  )

  function askNova(question: string) {
    aiChatBus.emit(question)
  }

  return (
    <Card className="flex h-full min-h-0 flex-col p-3.5 shadow-sm border border-border/80 bg-card/80 backdrop-blur-md rounded-2xl justify-between">
      <div className="flex shrink-0 items-center justify-between gap-2 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="relative flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs">
            <Bot className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-card animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Copilote Nova AI</h3>
              <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-violet-600 dark:text-violet-400">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Intelligence & Recommandations</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => askNova("Fais-moi un bilan complet de la production actuelle et des anomalies détectées.")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Sparkles className="size-3" />
          <span>Interroger</span>
        </button>
      </div>

      {/* Liste des insights */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto py-2 pr-0.5">
        {!loading && insights.length === 0 ? (
          <EmptyState message="Aucune anomalie ou alerte signalée sur ce poste." />
        ) : (
          insights.slice(0, 3).map((insight, i) => (
            <div
              key={i}
              onClick={() => askNova(`Donne-moi plus de détails et le plan d'action sur cette recommandation : "${insight}"`)}
              className="group flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-2 text-xs leading-relaxed text-foreground transition-all hover:bg-muted/40 hover:border-violet-500/30 cursor-pointer"
              title="Cliquer pour demander à Nova d'approfondir"
            >
              <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-mono font-bold text-[9px]">
                {i + 1}
              </span>
              <p className="line-clamp-2 text-[11px] font-medium text-foreground/90 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {insight}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Suggestions rapides en pied de carte */}
      <div className="shrink-0 pt-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-border/40">
        <button
          type="button"
          onClick={() => askNova("Analyse les causes des écarts de TRS sur la ligne active.")}
          className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          🔍 Causes TRS
        </button>
        <button
          type="button"
          onClick={() => askNova("Quelles sont les machines les plus critiques en ce moment ?")}
          className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          ⚡ Diagnostic Parc
        </button>
      </div>
    </Card>
  )
}
