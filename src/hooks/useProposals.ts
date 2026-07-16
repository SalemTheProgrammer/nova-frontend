import { useCallback, useEffect, useState } from "react"
import { agentApi } from "@/lib/api"
import { useWebSocket } from "@/hooks/useWebSocket"
import type { AgentProposal } from "@/lib/types"

/**
 * Journal des propositions du superviseur Nova : chargement initial + mises à
 * jour temps réel via WebSocket (agent_proposal / agent_proposal_update).
 */
export function useProposals() {
  const [proposals, setProposals] = useState<AgentProposal[]>([])
  const { lastMessage } = useWebSocket()

  useEffect(() => {
    agentApi.propositions().then(setProposals).catch(() => {})
  }, [])

  useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type !== "agent_proposal" && lastMessage.type !== "agent_proposal_update")
      return
    const proposal = (lastMessage as { proposal?: AgentProposal }).proposal
    if (!proposal) return
    setProposals((prev) => {
      const existing = prev.findIndex((p) => p.id === proposal.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = proposal
        return next
      }
      return [proposal, ...prev]
    })
  }, [lastMessage])

  const applyDecision = useCallback((updated: AgentProposal) => {
    setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const pending = proposals.filter((p) => p.statut === "PROPOSEE")
  // Dernières décisions résolues (opérateur ou autopilote) : permet de montrer
  // "Nova a agi seule" juste après une exécution automatique, même si la carte
  // n'était jamais passée par l'onglet "en attente" (risque faible = exécutée
  // dès sa création, jamais visible en PROPOSEE côté client).
  const recentDecided = proposals.filter((p) => p.statut !== "PROPOSEE").slice(0, 5)
  return { proposals, pending, recentDecided, applyDecision }
}
