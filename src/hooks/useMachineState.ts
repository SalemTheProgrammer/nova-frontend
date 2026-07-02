import { useCallback, useEffect, useState } from "react"
import { machinesApi } from "@/lib/api"
import type { Machine, MachineEvent } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"

/** État + timeline d'une machine, fusionné en temps réel via WebSocket. */
export function useMachineState(machineId: number | null) {
  const [machine, setMachine] = useState<Machine | null>(null)
  const [events, setEvents] = useState<MachineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { lastMessage } = useWebSocket()

  const reload = useCallback(async () => {
    if (machineId == null) {
      setMachine(null)
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [m, evts] = await Promise.all([
      machinesApi.get(machineId),
      machinesApi.evenements(machineId, 100),
    ])
    setMachine(m)
    setEvents(evts)
    setLoading(false)
  }, [machineId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!lastMessage || machineId == null || lastMessage.type !== "machine_update") return
    const updated = lastMessage.machine as unknown as Machine
    if (updated?.id === machineId) {
      setMachine(updated)
      void machinesApi.evenements(machineId, 100).then(setEvents).catch(() => {})
    }
  }, [lastMessage, machineId])

  return { machine, events, loading, reload }
}
