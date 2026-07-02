import { useCallback, useEffect, useRef, useState } from "react"
import { machinesApi, simulatorApi } from "@/lib/api"
import type { Machine, MachineEvent } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"

const CYCLE_MIN_MS = 300

/** Fait vivre une machine simulée : état, timeline, et tick client tant qu'elle tourne. */
export function useSimulator(machineId: number | null) {
  const [machine, setMachine] = useState<Machine | null>(null)
  const [events, setEvents] = useState<MachineEvent[]>([])
  const [defectRate, setDefectRate] = useState(0.08)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { lastMessage } = useWebSocket()
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const reload = useCallback(async () => {
    if (machineId == null) {
      setMachine(null)
      setEvents([])
      return
    }
    const [m, evts] = await Promise.all([
      machinesApi.get(machineId),
      machinesApi.evenements(machineId, 50),
    ])
    setMachine(m)
    setEvents(evts)
  }, [machineId])

  useEffect(() => {
    void reload()
  }, [reload])

  // Fusionne les mises à jour temps réel (WebSocket) concernant cette machine.
  useEffect(() => {
    if (!lastMessage || machineId == null || lastMessage.type !== "machine_update") return
    const updated = lastMessage.machine as unknown as Machine
    if (updated?.id === machineId) {
      setMachine(updated)
      void machinesApi.evenements(machineId, 50).then(setEvents).catch(() => {})
    }
  }, [lastMessage, machineId])

  // Tick client : tant que la machine est MARCHE, produit une unité par cycle réel —
  // c'est ce qui fait "vivre" le simulateur, en frappant les vrais endpoints backend.
  useEffect(() => {
    if (tickTimer.current) {
      clearInterval(tickTimer.current)
      tickTimer.current = null
    }
    if (!machine || machine.statut !== "MARCHE" || machineId == null) return

    const cycleS = Number(machine.temps_cycle_actuel_s ?? machine.temps_cycle_cible_s ?? 4)
    const intervalMs = Math.max(CYCLE_MIN_MS, cycleS * 1000)

    tickTimer.current = setInterval(() => {
      const isScrap = Math.random() < defectRate
      const action = isScrap
        ? simulatorApi.produireRebut(machineId, 1, "AUTRE")
        : simulatorApi.produireBonne(machineId, 1)
      action.catch(() => {})
    }, intervalMs)

    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current)
    }
  }, [
    machine?.statut,
    machine?.temps_cycle_actuel_s,
    machine?.temps_cycle_cible_s,
    machineId,
    defectRate,
  ])

  const run = useCallback(
    async (action: () => Promise<Machine>) => {
      setError(null)
      setLoading(true)
      try {
        const updated = await action()
        setMachine(updated)
        if (machineId != null) {
          void machinesApi.evenements(machineId, 50).then(setEvents).catch(() => {})
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur")
      } finally {
        setLoading(false)
      }
    },
    [machineId],
  )

  return { machine, events, defectRate, setDefectRate, loading, error, reload, run }
}
