import { useEffect, useRef, useState } from "react"
import { kpiApi, machinesApi } from "@/lib/api"
import type { DashboardResume, Machine } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"

/** Résumé tableau de bord + liste des machines, rafraîchis à chaque événement WebSocket. */
export function useDashboardData(ligneId: number | null) {
  const [resume, setResume] = useState<DashboardResume | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  }, [ligneId, reloadKey])

  // Machine events can arrive several times per second. Update the machine
  // immediately and refresh the OF/dashboard aggregates at most once per second.
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== "machine_update") return
    const updated = lastMessage.machine as unknown as Machine
    if (ligneId != null && updated.ligne_production_id !== ligneId) return
    setMachines((current) => {
      const exists = current.some((machine) => machine.id === updated.id)
      return exists
        ? current.map((machine) => (machine.id === updated.id ? updated : machine))
        : [...current, updated]
    })
    if (refreshTimer.current == null) {
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        setReloadKey((key) => key + 1)
      }, 1000)
    }
  }, [lastMessage, ligneId])

  useEffect(
    () => () => {
      if (refreshTimer.current != null) clearTimeout(refreshTimer.current)
    },
    [],
  )

  const refresh = () => setReloadKey((k) => k + 1)

  return { resume, machines, loading, error, refresh, revision: reloadKey }
}
