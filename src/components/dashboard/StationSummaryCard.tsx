import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronRight, Sparkles } from "lucide-react"
import { Card, EmptyState } from "@/components/dashboard/primitives"
import { aiApi } from "@/lib/api"
import { useWebSocket } from "@/hooks/useWebSocket"

/** Résumé atelier — les insights générés par Nova, en lecture rapide façon flash-brief. */
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

  return (
    <Card className="dashboard-panel flex h-full min-h-0 flex-col p-3 shadow-sm">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
            <Sparkles className="size-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground/90">Brief Nova</p>
            <p className="dashboard-card-subtitle text-[11px] text-muted-foreground">Priorités opérationnelles</p>
          </div>
        </div>
        {insights.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Top 3
          </span>
        )}
      </div>
      <div className="dashboard-insights min-h-0 flex-1 space-y-2 overflow-hidden">
        {!loading && insights.length === 0 ? (
          <EmptyState message="Aucun insight pour l'instant." />
        ) : (
          insights.slice(0, 3).map((insight, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/45 p-2 text-xs leading-relaxed text-foreground/85">
              <ChevronRight className="mt-0.5 size-3 shrink-0 text-violet-600" />
              <span className="line-clamp-2">{insight}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
