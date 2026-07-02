import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createElement } from "react"
import { connectDashboardSocket } from "@/lib/websocket"

export interface MachineUpdateMessage {
  type: "machine_update"
  machine: Record<string, unknown>
}

interface WsState {
  connected: boolean
  lastMessage: MachineUpdateMessage | null
}

const WebSocketContext = createContext<WsState>({ connected: false, lastMessage: null })

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<MachineUpdateMessage | null>(null)

  useEffect(() => {
    return connectDashboardSocket(
      (data) => setLastMessage(data as MachineUpdateMessage),
      setConnected,
    )
  }, [])

  return createElement(WebSocketContext.Provider, { value: { connected, lastMessage } }, children)
}

/** Connexion partagée à `/ws/dashboard` : statut + dernier message reçu. */
export function useWebSocket() {
  return useContext(WebSocketContext)
}
