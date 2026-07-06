import { useEffect, useState } from "react"
import { kpiApi, machinesApi } from "@/lib/api"
import type { DashboardResume, Machine } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"

/** Résumé tableau de bord + liste des machines, rafraîchis à chaque événement WebSocket. */
export function useDashboardData(ligneId: number | null) {
  const [resume, setResume] = useState<DashboardResume | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { lastMessage } = useWebSocket()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [r, m] = await Promise.all([
          kpiApi.dashboard(ligneId),
          machinesApi.list(ligneId ?? undefined),
        ])
        if (!cancelled) {
          setResume(r)
          setMachines(m)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de chargement")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [ligneId, lastMessage])

  return { resume, machines, loading, error }
}
