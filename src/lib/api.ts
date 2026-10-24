import type { AgentStreamEvent, DocumentRag, DocumentSearchResult } from "@/lib/types"

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1"
const API_KEY = import.meta.env.VITE_API_KEY ?? "dev-local-key"

// --------------------------- Jeton de session utilisateur --------------------------- //
const TOKEN_KEY = "nova_token"
const USER_KEY = "nova_user"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** 401 sur une session existante = jeton expiré/invalide → déconnexion + retour login.
 * (Pas de redirection quand aucun jeton n'est stocké : ex. code de connexion erroné.) */
function handleUnauthorized(status: number): void {
  if (status === 401 && getToken()) {
    clearSession()
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login"
    }
  }
}

export interface ApiError {
  error: { code: string; message: string; details?: Record<string, unknown> }
}

/** Erreur HTTP typée : `status` et `code` (ex. `divatex_indisponible` pour un 503). */
export class ApiRequestError extends Error {
  status: number
  code: string | null
  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.code = code
  }
}

async function fetchOk(method: string, path: string, body?: unknown): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...authHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    handleUnauthorized(res.status)
    let message = `Requête échouée (${res.status})`
    let code: string | null = null
    try {
      const data = (await res.json()) as Partial<ApiError> & { detail?: unknown }
      message = data.error?.message ?? texteDetail(data.detail) ?? message
      code = data.error?.code ?? null
    } catch {
      // no JSON body
    }
    throw new ApiRequestError(message, res.status, code)
  }
  return res
}

/** `detail` FastAPI : un texte, ou un tableau d'erreurs de validation (422)
 * qu'on n'affiche jamais brut (« [object Object] »). */
function texteDetail(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail
  return detail !== undefined && detail !== null ? "Paramètres invalides." : undefined
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetchOk(method, path, body)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Comme `request`, mais renvoie le corps brut (ex. PDF à télécharger). */
export async function requestBlob(method: string, path: string, body?: unknown): Promise<Blob> {
  return (await fetchOk(method, path, body)).blob()
}

/** Comme `requestBlob`, avec le nom de fichier de l'en-tête Content-Disposition. */
export async function requestFile(
  method: string,
  path: string,
  fallbackName: string,
  body?: unknown,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetchOk(method, path, body)
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  let filename = fallbackName
  if (match) {
    try {
      filename = decodeURIComponent(match[1])
    } catch {
      filename = match[1]
    }
  }
  return { blob: await res.blob(), filename }
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    // no Content-Type: browser sets multipart boundary
    headers: { "X-API-Key": API_KEY, ...authHeaders() },
    body: formData,
  })
  if (!res.ok) {
    handleUnauthorized(res.status)
    let message = `Requête échouée (${res.status})`
    try {
      const data = (await res.json()) as Partial<ApiError> & { detail?: unknown }
      message = data.error?.message ?? texteDetail(data.detail) ?? message
    } catch {
      // no JSON body
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

// --------------------------- Chat / agent --------------------------- //
/**
 * Envoie un message à l'agent en mode streaming (SSE sur POST) et relaie chaque
 * événement (tokens, appels d'outils, artifacts) à `onEvent`. Résout quand le
 * flux est terminé.
 */
async function streamChatMessage(
  message: string,
  threadId: string | undefined,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
  mode: "texte" | "voix" = "texte",
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY, ...authHeaders() },
    body: JSON.stringify({ message, mode, ...(threadId ? { thread_id: threadId } : {}) }),
    signal,
  })
  if (!res.ok || !res.body) {
    handleUnauthorized(res.status)
    throw new Error(`Le flux agent a échoué (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split("\n\n")
    buffer = frames.pop() ?? ""
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "))
      if (!line) continue
      try {
        onEvent(JSON.parse(line.slice(6)) as AgentStreamEvent)
      } catch {
        // frame malformée : ignorée
      }
    }
  }
}

export const agentApi = {
  stream: streamChatMessage,
  /** Relit l'historique d'un thread (pour réhydrater le panneau de chat après un
   * refresh de page — voir useAgentChat.ts et chatSession.ts). */
  history: (threadId: string) =>
    request<{ thread_id: string; turns: import("@/hooks/useAgentChat").AgentTurn[] }>(
      "GET",
      `/chat/${encodeURIComponent(threadId)}/history`,
    ),
  clear: (threadId: string) => request<void>("DELETE", `/chat/${encodeURIComponent(threadId)}`),
  /** Message d'accueil de Nova (salutation, constats atelier, décisions en
   * attente), enregistré par le backend comme premier message du thread. */
  accueil: (threadId?: string) =>
    request<{ thread_id: string; messages: string[] }>(
      "POST",
      "/chat/accueil",
      threadId ? { thread_id: threadId } : {},
    ),
}

// --------------------------- Voix (OpenAI) --------------------------- //
export const voiceApi = {
  transcribe: async (audio: Blob): Promise<string> => {
    const fd = new FormData()
    fd.append("file", audio, "audio.webm")
    const res = await upload<{ text: string }>("/voice/transcribe", fd)
    return res.text
  },
  speak: async (text: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/voice/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY, ...authHeaders() },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error(`Synthèse vocale échouée (${res.status})`)
    return res.blob()
  },
}

// --------------------------- Base documentaire (RAG) --------------------------- //
export const documentsApi = {
  list: () => request<DocumentRag[]>("GET", "/documents"),
  upload: (nom: string, file: File, categorie?: string) => {
    const fd = new FormData()
    fd.append("nom", nom)
    if (categorie?.trim()) fd.append("categorie", categorie.trim())
    fd.append("file", file)
    return upload<DocumentRag>("/documents", fd)
  },
  remove: (id: number) => request<void>("DELETE", `/documents/${id}`),
  search: (q: string) =>
    request<DocumentSearchResult>("GET", `/documents/recherche?q=${encodeURIComponent(q)}`),
  /** PDF source d'un document, récupéré en blob (l'en-tête X-API-Key est requis). */
  pdfBlob: async (id: number): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/documents/${id}/pdf`, {
      headers: { "X-API-Key": API_KEY, ...authHeaders() },
    })
    if (!res.ok) {
      let message = `PDF indisponible (${res.status})`
      try {
        const data = (await res.json()) as Partial<ApiError> & { detail?: unknown }
        message = data.error?.message ?? texteDetail(data.detail) ?? message
      } catch {
        // no JSON body
      }
      throw new Error(message)
    }
    return res.blob()
  },
}

// --------------------------- Authentification / utilisateurs --------------------------- //
export interface User {
  id: number
  telephone: string
  nom_complet: string
  is_admin: boolean
  actif: boolean
  outils_autorises: string[]
}

export interface ToolCatalogItem {
  name: string
  categorie: string
  description: string
}

export const authApi = {
  requestCode: (telephone: string) =>
    request<{ sent: boolean; dev_code?: string | null }>("POST", "/auth/request-code", { telephone }),
  verifyCode: (telephone: string, code: string) =>
    request<{ token: string; user: User }>("POST", "/auth/verify-code", { telephone, code }),
  me: () => request<User>("GET", "/auth/me"),
}

export const adminApi = {
  users: () => request<User[]>("GET", "/admin/users"),
  tools: () => request<ToolCatalogItem[]>("GET", "/admin/tools"),
  createUser: (data: { telephone: string; nom_complet: string; outils_autorises: string[] }) =>
    request<User>("POST", "/admin/users", data),
  updateUser: (
    id: number,
    data: Partial<{ nom_complet: string; actif: boolean; outils_autorises: string[] }>,
  ) => request<User>("PATCH", `/admin/users/${id}`, data),
  deleteUser: (id: number) => request<void>("DELETE", `/admin/users/${id}`),
  /** Conversations des utilisateurs avec Nova (web et WhatsApp), en lecture seule. */
  conversations: (utilisateurId?: number) =>
    request<ConversationResume[]>(
      "GET",
      utilisateurId != null
        ? `/admin/conversations?utilisateur_id=${utilisateurId}`
        : "/admin/conversations",
    ),
  conversation: (threadId: string) =>
    request<ConversationDetail>("GET", `/admin/conversations/${encodeURIComponent(threadId)}`),
}

export interface ConversationResume {
  thread_id: string
  canal: "web" | "whatsapp"
  utilisateur_id: number | null
  utilisateur_nom: string
  telephone: string
  apercu: string
  date_creation: string
  date_maj: string
}

export interface ConversationDetail {
  conversation: ConversationResume
  turns: import("@/hooks/useAgentChat").AgentTurn[]
}
