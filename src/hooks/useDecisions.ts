import { useCallback, useEffect, useMemo, useState } from "react"
import { agentApi } from "@/lib/api"
import { useWebSocket } from "@/hooks/useWebSocket"
import type { AgentProposal } from "@/lib/types"

/** Nombre de décisions en attente présentées d'un coup dans le chat. */
const MAX_AFFICHEES = 3

/** Une décision entrée dans la conversation, avant le tour n° `position`. */
export interface DecisionAffichee {
  proposition: AgentProposal
  position: number
}

/**
 * Décisions du superviseur Nova présentées dans le chat : chargement initial +
 * temps réel (WebSocket agent_proposal / agent_proposal_update).
 *
 * `position` = nombre de tours de la conversation à cet instant (null tant que
 * l'historique n'est pas rechargé) : chaque décision s'insère là où elle est
 * arrivée, et la conversation continue normalement en dessous.
 *
 * Seules les plus récentes en attente entrent dans la conversation (les autres
 * sont comptées dans `autresEnAttente`) ; une décision entrée y reste une fois
 * tranchée — son résultat remplace alors les boutons, même si elle l'a été
 * ailleurs (WhatsApp, autopilote).
 */
export function useDecisions(position: number | null) {
  const [propositions, setPropositions] = useState<AgentProposal[]>([])
  const [entrees, setEntrees] = useState<{ id: number; position: number }[]>([])
  const { lastMessage } = useWebSocket()

  useEffect(() => {
    agentApi.propositions().then(setPropositions).catch(() => {})
  }, [])

  useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type !== "agent_proposal" && lastMessage.type !== "agent_proposal_update")
      return
    const proposal = (lastMessage as { proposal?: AgentProposal }).proposal
    if (!proposal) return
    setPropositions((prev) => {
      const existante = prev.findIndex((p) => p.id === proposal.id)
      if (existante >= 0) {
        const next = [...prev]
        next[existante] = proposal
        return next
      }
      return [proposal, ...prev]
    })
  }, [lastMessage])

  const enAttente = useMemo(
    () =>
      propositions
        .filter((p) => p.statut === "PROPOSEE")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [propositions],
  )

  useEffect(() => {
    if (position == null) return
    const plusRecentes = enAttente.slice(0, MAX_AFFICHEES).map((p) => p.id)
    setEntrees((prev) => {
      const nouvelles = plusRecentes.filter((id) => !prev.some((e) => e.id === id))
      return nouvelles.length > 0
        ? [...prev, ...nouvelles.map((id) => ({ id, position }))]
        : prev
    })
  }, [enAttente, position])

  const decisions = useMemo<DecisionAffichee[]>(
    () =>
      entrees
        .map((e) => {
          const proposition = propositions.find((p) => p.id === e.id)
          return proposition ? { proposition, position: e.position } : null
        })
        .filter((d): d is DecisionAffichee => d != null)
        .sort(
          (a, b) =>
            a.position - b.position ||
            a.proposition.created_at.localeCompare(b.proposition.created_at),
        ),
    [entrees, propositions],
  )
  const autresEnAttente = enAttente.filter((p) => !entrees.some((e) => e.id === p.id)).length

  const appliquer = useCallback((maj: AgentProposal) => {
    setPropositions((prev) => prev.map((p) => (p.id === maj.id ? maj : p)))
  }, [])

  return { decisions, autresEnAttente, appliquer }
}
