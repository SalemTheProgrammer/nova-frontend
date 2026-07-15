const STORAGE_KEY = "nova:chat-thread-id"

/** Persiste le thread_id de la conversation Nova pour la réhydrater après un
 * refresh de page (voir useAgentChat.ts). */
export const chatSession = {
  get threadId(): string | undefined {
    if (typeof window === "undefined") return undefined
    return window.localStorage.getItem(STORAGE_KEY) ?? undefined
  },
  setThreadId(threadId: string) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, threadId)
  },
  clear() {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(STORAGE_KEY)
  },
}
