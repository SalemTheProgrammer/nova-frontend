import type {
  AgentProposal,
  AgentStreamEvent,
  Article,
  AutonomyMode,
  AutonomySettings,
  CauseArret,
  ContexteLigne,
  DashboardResume,
  DispositionPreemption,
  DowntimePage,
  Faisabilite,
  Fournisseur,
  LigneProduction,
  Lot,
  LotDetail,
  LotQuarantaine,
  Machine,
  MachineEvent,
  MaintenanceEventRead,
  PrelevementMP,
  SparkplugDevice,
  SparkplugStatus,
  SparkplugTagMapping,
  TagTransformation,
  TargetKpi,
  Unite,
  DocumentRag,
  DocumentSearchResult,
  LigneFlux,
  LigneLien,
  LigneNode,
  MatierePremiere,
  Mouvement,
  Nomenclature,
  OrdreFabrication,
  PeriodeOEE,
  PointOEE,
  QualiteResume,
  QualityEventRead,
  StatutLot,
  StatutOF,
  StockMP,
  TRSRead,
} from "@/lib/types"

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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
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
    try {
      const data = (await res.json()) as ApiError & { detail?: string }
      message = data.error?.message ?? data.detail ?? message
    } catch {
      // no JSON body
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
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
      const data = (await res.json()) as ApiError & { detail?: string }
      message = data.error?.message ?? data.detail ?? message
    } catch {
      // no JSON body
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
}

// --------------------------- Chat / agent --------------------------- //
/**
 * Envoie un message à l'agent en mode streaming (SSE sur POST) et relaie chaque
 * événement (tokens, appels d'outils, artifacts) à `onEvent`. Résout quand le
 * flux est terminé.
 */
export async function streamChatMessage(
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

/** Relit l'historique d'un thread (pour réhydrater le panneau de chat après un
 * refresh de page — voir useAgentChat.ts et chatSession.ts). */
export function getChatHistory(threadId: string) {
  return api.get<{ thread_id: string; turns: import("@/hooks/useAgentChat").AgentTurn[] }>(
    `/chat/${encodeURIComponent(threadId)}/history`,
  )
}

export function deleteChatThread(threadId: string) {
  return api.del(`/chat/${encodeURIComponent(threadId)}`)
}

/** Message d'accueil de Nova (salutation, constats atelier, décisions en
 * attente), enregistré par le backend comme premier message du thread. */
export function chatAccueil(threadId?: string) {
  return api.post<{ thread_id: string; messages: string[] }>(
    "/chat/accueil",
    threadId ? { thread_id: threadId } : {},
  )
}

// --------------------------- Superviseur autonome --------------------------- //
export const agentApi = {
  propositions: (enAttenteSeulement = false) =>
    api.get<AgentProposal[]>(
      `/agent/propositions${enAttenteSeulement ? "?en_attente_seulement=true" : ""}`,
    ),
  approuver: (id: number) => api.post<AgentProposal>(`/agent/propositions/${id}/approuver`),
  rejeter: (id: number) => api.post<AgentProposal>(`/agent/propositions/${id}/rejeter`),
  autonomie: () => api.get<AutonomySettings>("/agent/autonomie"),
  definirAutonomie: (mode: AutonomyMode) =>
    api.post<AutonomySettings>("/agent/autonomie", { mode }),
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

// --------------------------- Articles --------------------------- //
export const articlesApi = {
  list: () => api.get<Article[]>("/articles"),
  create: (data: Partial<Article>) => api.post<Article>("/articles", data),
  update: (id: number, data: Partial<Article>) =>
    api.patch<Article>(`/articles/${id}`, data),
  remove: (id: number) => api.del(`/articles/${id}`),
  nomenclature: (id: number) => api.get<Nomenclature>(`/articles/${id}/nomenclature`),
  setNomenclature: (
    id: number,
    lignes: { matiere_premiere_id: number; quantite_par_unite: number }[],
  ) => api.post<Nomenclature>(`/articles/${id}/nomenclature`, { lignes }),
}

// --------------------------- Matières premières --------------------------- //
export const matieresApi = {
  list: () => api.get<MatierePremiere[]>("/matieres-premieres"),
  create: (data: Partial<MatierePremiere>) =>
    api.post<MatierePremiere>("/matieres-premieres", data),
  update: (id: number, data: Partial<MatierePremiere>) =>
    api.patch<MatierePremiere>(`/matieres-premieres/${id}`, data),
  remove: (id: number) => api.del(`/matieres-premieres/${id}`),
  lots: (id: number) => api.get<Lot[]>(`/matieres-premieres/${id}/lots`),
  receptionner: (
    id: number,
    data: {
      numero_lot: string
      quantite: number
      date_reception?: string | null
      date_peremption?: string | null
      fournisseur_id?: number | null
    },
  ) => api.post<Lot>(`/matieres-premieres/${id}/lots`, data),
  stock: () => api.get<StockMP[]>("/matieres-premieres/stock/etat"),
}

// --------------------------- Stock (lots + mouvements) --------------------------- //
export const stockApi = {
  lots: (params?: { matierePremiereId?: number; statut?: StatutLot }) => {
    const qs = new URLSearchParams()
    if (params?.matierePremiereId) qs.set("matiere_premiere_id", String(params.matierePremiereId))
    if (params?.statut) qs.set("statut", params.statut)
    const query = qs.toString()
    return api.get<LotDetail[]>(`/stock${query ? `?${query}` : ""}`)
  },
  create: (data: {
    matiere_premiere_id: number
    numero_lot: string
    quantite: number
    date_reception?: string | null
    date_peremption?: string | null
    fournisseur_id?: number | null
  }) => api.post<LotDetail>("/stock", data),
  get: (lotId: number) => api.get<LotDetail>(`/stock/${lotId}`),
  update: (
    lotId: number,
    data: { statut?: StatutLot; date_peremption?: string | null; fournisseur_id?: number | null },
  ) => api.patch<LotDetail>(`/stock/${lotId}`, data),
  ajuster: (lotId: number, quantite_restante: number, commentaire?: string) =>
    api.post<LotDetail>(`/stock/${lotId}/ajustement`, { quantite_restante, commentaire }),
  remove: (lotId: number) => api.del(`/stock/${lotId}`),
  mouvements: (params?: { matierePremiereId?: number; lotId?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.matierePremiereId) qs.set("matiere_premiere_id", String(params.matierePremiereId))
    if (params?.lotId) qs.set("lot_id", String(params.lotId))
    if (params?.limit) qs.set("limit", String(params.limit))
    const query = qs.toString()
    return api.get<Mouvement[]>(`/stock/mouvements${query ? `?${query}` : ""}`)
  },
}

// --------------------------- Fournisseurs --------------------------- //
export const fournisseursApi = {
  list: () => api.get<Fournisseur[]>("/fournisseurs"),
  create: (data: Partial<Fournisseur>) => api.post<Fournisseur>("/fournisseurs", data),
  update: (id: number, data: Partial<Fournisseur>) =>
    api.patch<Fournisseur>(`/fournisseurs/${id}`, data),
  contacts: (params?: {
    page?: number
    page_size?: number
    role_level?: string
    fournisseur_id?: number
    search?: string
  }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set("page", String(params.page))
    if (params?.page_size) query.set("page_size", String(params.page_size))
    if (params?.role_level && params.role_level !== "tous") query.set("role_level", params.role_level)
    if (params?.fournisseur_id != null) query.set("fournisseur_id", String(params.fournisseur_id))
    if (params?.search) query.set("search", params.search)
    const qs = query.toString()
    return api.get<FournisseurContactPage>(`/fournisseurs/contacts${qs ? `?${qs}` : ""}`)
  },
  createContact: (data: {
    fournisseur_id: number
    nom: string
    role_level: RoleLevel
    poste: string
    telephone: string
    email?: string
  }) => api.post<FournisseurContact>("/fournisseurs/contacts", data),
  updateContact: (
    id: number,
    data: Partial<{
      fournisseur_id: number
      nom: string
      role_level: RoleLevel
      poste: string
      telephone: string
      email: string
    }>,
  ) => api.patch<FournisseurContact>(`/fournisseurs/contacts/${id}`, data),
  deleteContact: (id: number) => api.del(`/fournisseurs/contacts/${id}`),
}

// --------------------------- Lignes de production --------------------------- //
export const lignesApi = {
  list: () => api.get<LigneProduction[]>("/lignes-production"),
  create: (data: Partial<LigneProduction>) =>
    api.post<LigneProduction>("/lignes-production", data),
  update: (id: number, data: Partial<LigneProduction>) =>
    api.patch<LigneProduction>(`/lignes-production/${id}`, data),
  remove: (id: number) => api.del(`/lignes-production/${id}`),
}

// --------------------------- Flux des lignes (graphe n8n) --------------------------- //
export const ligneFluxApi = {
  get: () => api.get<LigneFlux>("/lignes-production/flux"),
  setArticles: (ligneId: number, articleIds: number[]) =>
    api.put<LigneNode>(`/lignes-production/${ligneId}/articles`, { article_ids: articleIds }),
  createLien: (sourceId: number, targetId: number) =>
    api.post<LigneLien>("/lignes-production/liens", {
      source_id: sourceId,
      target_id: targetId,
    }),
  removeLien: (lienId: number) => api.del(`/lignes-production/liens/${lienId}`),
}

// --------------------------- Ordres de fabrication --------------------------- //
export const ordresApi = {
  list: () => api.get<OrdreFabrication[]>("/ordres-fabrication"),
  get: (id: number) => api.get<OrdreFabrication>(`/ordres-fabrication/${id}`),
  faisabilite: (articleId: number, quantite: number) =>
    api.get<Faisabilite>(
      `/ordres-fabrication/faisabilite?article_id=${articleId}&quantite=${quantite}`,
    ),
  create: (data: {
    article_id: number
    quantite: number
    date_echeance?: string | null
    ligne_production_id?: number | null
  }) => api.post<OrdreFabrication>("/ordres-fabrication", data),
  setStatut: (id: number, statut: StatutOF) =>
    api.patch<OrdreFabrication>(`/ordres-fabrication/${id}/statut`, { statut }),
  setLigne: (id: number, ligneProductionId: number | null) =>
    api.patch<OrdreFabrication>(`/ordres-fabrication/${id}/ligne`, {
      ligne_production_id: ligneProductionId,
    }),
  /** État d'occupation d'une ligne : OF en cours, file d'attente (EDD), place libre. */
  contexteLigne: (ligneId: number) =>
    api.get<ContexteLigne>(`/ordres-fabrication/lignes/${ligneId}/contexte`),
  /** Lance un OF sur sa ligne ; préempte l'OF en cours si `disposition` fourni.
   * Sans machine libre et sans disposition → 409 (l'appelant propose préemption/file). */
  lancer: (id: number, disposition?: DispositionPreemption) =>
    api.post<OrdreFabrication>(`/ordres-fabrication/${id}/lancer`, {
      preempt_disposition: disposition ?? null,
    }),
  /** Met l'OF en file d'attente sur une ligne (PLANIFIE, sans démarrage). */
  mettreEnFile: (id: number, ligneProductionId: number) =>
    api.post<OrdreFabrication>(`/ordres-fabrication/${id}/mettre-en-file`, {
      ligne_production_id: ligneProductionId,
    }),
}

// --------------------------- Base documentaire (RAG) --------------------------- //
export const documentsApi = {
  list: () => api.get<DocumentRag[]>("/documents"),
  upload: (nom: string, file: File, categorie?: string) => {
    const fd = new FormData()
    fd.append("nom", nom)
    if (categorie?.trim()) fd.append("categorie", categorie.trim())
    fd.append("file", file)
    return upload<DocumentRag>("/documents", fd)
  },
  remove: (id: number) => api.del(`/documents/${id}`),
  search: (q: string) =>
    api.get<DocumentSearchResult>(`/documents/recherche?q=${encodeURIComponent(q)}`),
  /** PDF source d'un document, récupéré en blob (l'en-tête X-API-Key est requis). */
  pdfBlob: async (id: number): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/documents/${id}/pdf`, {
      headers: { "X-API-Key": API_KEY, ...authHeaders() },
    })
    if (!res.ok) {
      let message = `PDF indisponible (${res.status})`
      try {
        const data = (await res.json()) as ApiError & { detail?: string }
        message = data.error?.message ?? data.detail ?? message
      } catch {
        // no JSON body
      }
      throw new Error(message)
    }
    return res.blob()
  },
}

// --------------------------- Machines --------------------------- //
export const machinesApi = {
  list: (ligneProductionId?: number) =>
    api.get<Machine[]>(
      ligneProductionId ? `/machines?ligne_production_id=${ligneProductionId}` : "/machines",
    ),
  get: (id: number) => api.get<Machine>(`/machines/${id}`),
  evenements: (id: number, limit = 100) =>
    api.get<MachineEvent[]>(`/machines/${id}/evenements?limit=${limit}`),
}


// --------------------------- Arrêts --------------------------- //
export const downtimeApi = {
  list: (params?: {
    machineId?: number
    cause?: CauseArret
    actifsSeulement?: boolean
    resolusSeulement?: boolean
    dateDebut?: string
    dateFin?: string
    page?: number
    pageSize?: number
  }) => {
    const qs = new URLSearchParams()
    if (params?.machineId) qs.set("machine_id", String(params.machineId))
    if (params?.cause) qs.set("cause", params.cause)
    if (params?.actifsSeulement) qs.set("actifs_seulement", "true")
    if (params?.resolusSeulement) qs.set("resolus_seulement", "true")
    if (params?.dateDebut) qs.set("date_debut", params.dateDebut)
    if (params?.dateFin) qs.set("date_fin", params.dateFin)
    qs.set("page", String(params?.page ?? 1))
    qs.set("page_size", String(params?.pageSize ?? 5))
    return api.get<DowntimePage>(`/arrets?${qs.toString()}`)
  },
}

// --------------------------- Qualité --------------------------- //
export const qualiteApi = {
  evenements: (machineId?: number, limit: number = 1000) => {
    const qs = new URLSearchParams()
    if (machineId) qs.append("machine_id", String(machineId))
    qs.append("limit", String(limit))
    return api.get<QualityEventRead[]>(`/qualite/evenements?${qs.toString()}`)
  },
  resume: (machineId?: number) =>
    api.get<QualiteResume>(`/qualite/resume${machineId ? `?machine_id=${machineId}` : ""}`),
}

// --------------------------- Maintenance --------------------------- //
export interface RisqueMachine {
  machine_id: number
  code: string
  nom: string
  score: number
  nb_pannes_7j: number
  duree_arret_7j_s: number
  jours_depuis_maintenance: number | null
  niveau: "faible" | "modere" | "eleve"
  recommandation: string
}

export const maintenanceApi = {
  list: (machineId?: number) =>
    api.get<MaintenanceEventRead[]>(`/maintenance${machineId ? `?machine_id=${machineId}` : ""}`),
  risques: () => api.get<RisqueMachine[]>("/maintenance/risques"),
  demarrer: (data: { machine_id: number; type_maintenance: string; description?: string }) =>
    api.post<{ status: string; message: string }>("/maintenance/demarrer", data),
  resoudre: (data: { machine_id: number; commentaire?: string }) =>
    api.post<{ status: string; message: string }>("/maintenance/resoudre", data),
}

// --------------------------- KPI / TRS / Dashboard --------------------------- //
export const kpiApi = {
  trs: (
    scope: "machine" | "ligne" | "of",
    id: number,
    opts?: { debut?: string; fin?: string },
  ) => {
    const qs = new URLSearchParams({ scope, id: String(id) })
    if (opts?.debut) qs.set("debut", opts.debut)
    if (opts?.fin) qs.set("fin", opts.fin)
    return api.get<TRSRead>(`/kpi/trs?${qs.toString()}`)
  },
  dashboard: (ligneId?: number | null) =>
    api.get<DashboardResume>(
      `/dashboard/resume${ligneId != null ? `?ligne_id=${ligneId}` : ""}`,
    ),
  oeeHistory: (ligneId: number | null | undefined, periode: PeriodeOEE) => {
    const qs = new URLSearchParams({ periode })
    if (ligneId != null) qs.set("ligne_id", String(ligneId))
    return api.get<PointOEE[]>(`/kpi/oee-history?${qs.toString()}`)
  },
  downloadBilanPdf: async (ligneId?: number | null, ofId?: number | null): Promise<void> => {
    const qs = new URLSearchParams()
    if (ligneId != null) qs.set("ligne_id", String(ligneId))
    if (ofId != null) qs.set("of_id", String(ofId))
    const query = qs.toString() ? `?${qs.toString()}` : ""
    const res = await fetch(`${API_BASE}/kpi/bilan-pdf${query}`, {
      headers: { "X-API-Key": API_KEY, ...authHeaders() },
    })
    if (!res.ok) {
      handleUnauthorized(res.status)
      let message = `Impossible de générer le bilan (${res.status})`
      try {
        const data = (await res.json()) as ApiError & { detail?: string }
        message = data.error?.message ?? data.detail ?? message
      } catch {
        // no JSON
      }
      throw new Error(message)
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const disposition = res.headers.get("content-disposition")
    let filename = `bilan-of-${ofId ?? "production"}.pdf`
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/)
      if (match && match[1]) filename = match[1]
    }
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },
}

// --------------------------- AI panel --------------------------- //
export const aiApi = {
  insights: () => api.get<{ insights: string[] }>("/ai/insights"),
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
    api.post<{ sent: boolean; dev_code?: string | null }>("/auth/request-code", { telephone }),
  verifyCode: (telephone: string, code: string) =>
    api.post<{ token: string; user: User }>("/auth/verify-code", { telephone, code }),
  me: () => api.get<User>("/auth/me"),
  /** Session de démonstration (lecture seule), sans code WhatsApp. */
  demo: () => api.post<{ token: string; user: User }>("/auth/demo", {}),
  demoDisponible: () =>
    api.get<{ enabled: boolean }>("/auth/demo").then((r) => r.enabled),
  /** Prépare l'état de démonstration (bouton « Réinitialiser l'usine »). */
  resetUsine: () =>
    api.post<{
      machines_demarrees: string[]
      arrets_injectes: number
      articles_chiffres: number
      of_a_l_heure: number
    }>("/auth/demo/reset-usine", {}),
}

export const adminApi = {
  users: () => api.get<User[]>("/admin/users"),
  tools: () => api.get<ToolCatalogItem[]>("/admin/tools"),
  createUser: (data: { telephone: string; nom_complet: string; outils_autorises: string[] }) =>
    api.post<User>("/admin/users", data),
  updateUser: (
    id: number,
    data: Partial<{ nom_complet: string; actif: boolean; outils_autorises: string[] }>,
  ) => api.patch<User>(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.del(`/admin/users/${id}`),
}

// --------------------------- Sparkplug B (automates / MQTT) --------------------------- //
export const sparkplugApi = {
  /** Connexion de l'hôte Sparkplug au broker MQTT. */
  status: () => api.get<SparkplugStatus>("/sparkplug/status"),
  getDevices: () => api.get<SparkplugDevice[]>("/sparkplug/devices"),
  getDevice: (id: number) => api.get<SparkplugDevice>(`/sparkplug/devices/${id}`),
  /** Rattache l'automate à une machine MES (`null` pour le détacher). Admin. */
  bindMachine: (deviceId: number, machineId: number | null) =>
    api.patch<SparkplugDevice>(`/sparkplug/devices/${deviceId}`, { machine_id: machineId }),
  updateMapping: (
    deviceId: number,
    data: {
      tag_name: string
      target_kpi: TargetKpi
      transformation: TagTransformation
      formula_param?: string | null
      description?: string | null
      actif?: boolean
    },
  ) => api.post<SparkplugTagMapping>(`/sparkplug/devices/${deviceId}/mappings`, data),
  deleteMapping: (deviceId: number, mappingId: number) =>
    api.del(`/sparkplug/devices/${deviceId}/mappings/${mappingId}`),
  /** Demande aux automates de republier leur état complet (NCMD Rebirth). Admin. */
  rebirth: () => api.post<{ edge_nodes: number }>("/sparkplug/rebirth"),
}

// --------------------- Prélèvements Matières Premières (BPF) --------------------- //
export const prelevementApi = {
  lister: () => api.get<PrelevementMP[]>("/prelevements"),
  lotsQuarantaine: () => api.get<LotQuarantaine[]>("/prelevements/lots-en-quarantaine"),
  creer: (data: {
    lot_id: number
    quantite_prelevee: number | string
    unite?: Unite
    preleveur: string
    zone_prelevement?: string
  }) => api.post<PrelevementMP>("/prelevements", data),
  valider: (
    id: number,
    data: {
      conforme: boolean
      analyste: string
      bulletin_analyse_ref: string
      commentaire?: string
    },
  ) => api.post<PrelevementMP>(`/prelevements/${id}/valider`, data),
}

// --------------------- Fournisseurs & Contacts --------------------- //
export type RoleLevel = "directeur" | "sous_directeur" | "chef" | "employe"

export interface FournisseurContact {
  id: number
  fournisseur_id: number
  nom: string
  role_level: RoleLevel
  poste: string
  telephone: string
  email: string
  fournisseur_nom?: string | null
  fournisseur_code?: string | null
}

export interface FournisseurContactPage {
  items: FournisseurContact[]
  total: number
  page: number
  page_size: number
  total_pages: number
  counts: Record<string, number>
}


