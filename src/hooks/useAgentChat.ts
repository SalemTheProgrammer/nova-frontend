import { useCallback, useEffect, useRef, useState } from "react"
import { deleteChatThread, getChatHistory, streamChatMessage } from "@/lib/api"
import { chatSession } from "@/lib/chatSession"
import type { AgentArtifact, AgentStreamEvent } from "@/lib/types"

/** Un segment d'une réponse de l'agent : texte streamé ou étape d'outil. */
export type AgentSegment =
  | { type: "text"; content: string }
  | {
      type: "tool"
      id: string
      name: string
      status: "running" | "done"
      output?: string
      artifact?: AgentArtifact | null
    }

export interface AgentTurn {
  id: string
  role: "user" | "assistant"
  segments: AgentSegment[]
}

let counter = 0
const nextId = () => `turn-${Date.now()}-${counter++}`

/**
 * Conversation streamée avec l'agent Nova : chaque réponse est une liste de
 * segments (texte + étapes d'outils avec artifacts) mise à jour en direct.
 *
 * `onArtifact` est appelé dès qu'un outil renvoie un artifact structuré (avant
 * même la fin du tour) — utilisé par exemple pour rediriger l'interface vers la
 * page concernée sans attendre la fin de la réponse.
 */
export function useAgentChat(
  onFinal?: (text: string) => void,
  onArtifact?: (artifact: AgentArtifact, toolName: string) => void,
) {
  const [turns, setTurns] = useState<AgentTurn[]>([])
  const [loading, setLoading] = useState(false)
  const threadId = useRef<string | undefined>(chatSession.threadId)
  // true une fois l'historique éventuel rechargé : avant, une conversation vide
  // ne veut pas encore dire « nouvelle conversation ».
  const [pret, setPret] = useState(() => !chatSession.threadId)

  // Réhydrate la conversation après un refresh de page : le thread_id
  // survit dans localStorage, l'historique des messages survit côté backend
  // (checkpointer SQLite — voir backend/app/agent/graph.py).
  useEffect(() => {
    const savedThreadId = threadId.current
    if (!savedThreadId) return
    let cancelled = false
    getChatHistory(savedThreadId)
      .then((r) => {
        if (!cancelled && r.turns.length > 0) setTurns(r.turns)
      })
      .catch(() => {
        // Thread introuvable/expiré : on repart d'une conversation vide.
      })
      .finally(() => {
        if (!cancelled) setPret(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = useCallback(
    async (text: string, mode: "texte" | "voix" = "texte") => {
      const trimmed = text.trim()
      if (!trimmed) return
      setTurns((prev) => [
        ...prev,
        { id: nextId(), role: "user", segments: [{ type: "text", content: trimmed }] },
        { id: nextId(), role: "assistant", segments: [] },
      ])
      setLoading(true)

      const patchAssistant = (fn: (segments: AgentSegment[]) => AgentSegment[]) => {
        setTurns((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (!last || last.role !== "assistant") return prev
          next[next.length - 1] = { ...last, segments: fn(last.segments) }
          return next
        })
      }

      const handleEvent = (event: AgentStreamEvent) => {
        switch (event.type) {
          case "turn_start":
            // Un nouveau tour LLM démarre : le prochain token ouvrira un segment texte.
            patchAssistant((segments) => segments)
            break
          case "token":
            patchAssistant((segments) => {
              const last = segments[segments.length - 1]
              if (last?.type === "text") {
                return [
                  ...segments.slice(0, -1),
                  { type: "text", content: last.content + event.content },
                ]
              }
              return [...segments, { type: "text", content: event.content }]
            })
            break
          case "tool_start":
            patchAssistant((segments) => [
              ...segments,
              { type: "tool", id: event.id, name: event.name, status: "running" },
            ])
            break
          case "tool_end":
            patchAssistant((segments) =>
              segments.map((s) =>
                s.type === "tool" && s.id === event.id
                  ? { ...s, status: "done", output: event.output, artifact: event.artifact }
                  : s,
              ),
            )
            if (event.artifact) onArtifact?.(event.artifact, event.name)
            break
          case "done":
            threadId.current = event.thread_id
            chatSession.setThreadId(event.thread_id)
            if (event.response) onFinal?.(event.response)
            break
          case "error":
            patchAssistant((segments) => [
              ...segments,
              { type: "text", content: event.message },
            ])
            break
        }
      }

      try {
        await streamChatMessage(trimmed, threadId.current, handleEvent, undefined, mode)
      } catch (err) {
        handleEvent({
          type: "error",
          message: err instanceof Error ? err.message : "Une erreur est survenue",
        })
      } finally {
        setLoading(false)
      }
    },
    [onFinal],
  )

  const clear = useCallback(async () => {
    const currentThreadId = threadId.current
    setTurns([])
    threadId.current = undefined
    chatSession.clear()
    if (currentThreadId) {
      try {
        await deleteChatThread(currentThreadId)
      } catch {
        // Le thread n'existe peut-être déjà plus côté serveur : sans
        // conséquence, l'état local est déjà réinitialisé.
      }
    }
  }, [])

  /** Le message d'accueil a ouvert ce thread côté backend : les prochains
   * messages de l'opérateur doivent y partir. */
  const adopterThread = useCallback((id: string) => {
    threadId.current = id
    chatSession.setThreadId(id)
  }, [])

  const threadActuel = useCallback(() => threadId.current, [])

  return { turns, loading, send, clear, pret, adopterThread, threadActuel }
}
