import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createElement } from "react"
import { connectDashboardSocket } from "@/lib/websocket"
import type { AgentProposal } from "@/lib/types"

export interface MachineUpdateMessage {
  type: "machine_update"
  machine: Record<string, unknown>
}

export interface AgentProposalMessage {
  type: "agent_proposal" | "agent_proposal_update"
  proposal: AgentProposal
}

export interface GenericWsMessage {
  type: string
  [key: string]: unknown
}

export type WsMessage = MachineUpdateMessage | AgentProposalMessage | GenericWsMessage

interface WsState {
  connected: boolean
  lastMessage: WsMessage | null
}

const WebSocketContext = createContext<WsState>({ connected: false, lastMessage: null })

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)

  useEffect(() => {
    return connectDashboardSocket(
      (data) => setLastMessage(data as WsMessage),
      setConnected,
    )
  }, [])

  return createElement(WebSocketContext.Provider, { value: { connected, lastMessage } }, children)
}

/** Connexion partagée à `/ws/dashboard` : statut + dernier message reçu. */
export function useWebSocket() {
  return useContext(WebSocketContext)
}
