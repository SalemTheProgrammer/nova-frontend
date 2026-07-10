import type {
  AgentProposal,
  AgentStreamEvent,
  Article,
  CauseRebut,
  DashboardResume,
  DowntimeEventRead,
  Faisabilite,
  Fournisseur,
  LigneProduction,
  Lot,
  LotDetail,
  Machine,
  MachineEvent,
  MaintenanceEventRead,
  DocumentRag,
  DocumentSearchResult,
  LigneFlux,
  LigneLien,
  LigneNode,
  MatierePremiere,
  Mouvement,
  Nomenclature,
  OrdreFabrication,
  QualiteResume,
  QualityEventRead,
  StatutLot,
  StatutOF,
  StockMP,
  TRSRead,
  TypeMaintenance,
} from "@/lib/types"

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1"
const API_KEY = import.meta.env.VITE_API_KEY ?? "dev-local-key"

/** Origine du backend FastAPI — sert aussi la console simulateur en HTML (`/simulateur`). */
export const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000"
export const SIMULATOR_CONSOLE_URL = `${BACKEND_ORIGIN}/simulateur`


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
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
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
    headers: { "X-API-Key": API_KEY }, // no Content-Type: browser sets multipart boundary
    body: formData,
  })
  if (!res.ok) {
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
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ message, mode, ...(threadId ? { thread_id: threadId } : {}) }),
    signal,
  })
  if (!res.ok || !res.body) {
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

// --------------------------- Superviseur autonome --------------------------- //
export const agentApi = {
  propositions: (enAttenteSeulement = false) =>
    api.get<AgentProposal[]>(
      `/agent/propositions${enAttenteSeulement ? "?en_attente_seulement=true" : ""}`,
    ),
  approuver: (id: number) => api.post<AgentProposal>(`/agent/propositions/${id}/approuver`),
  rejeter: (id: number) => api.post<AgentProposal>(`/agent/propositions/${id}/rejeter`),
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
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
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
  remove: (id: number) => api.del(`/fournisseurs/${id}`),
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
    date_fin_prevue?: string | null
    ligne_production_id?: number | null
  }) => api.post<OrdreFabrication>("/ordres-fabrication", data),
  setStatut: (id: number, statut: StatutOF) =>
    api.patch<OrdreFabrication>(`/ordres-fabrication/${id}/statut`, { statut }),
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
      headers: { "X-API-Key": API_KEY },
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

// --------------------------- Simulateur --------------------------- //
export const simulatorApi = {
  start: (machineId: number, ordreFabricationId?: number | null) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/start`, {
      ordre_fabrication_id: ordreFabricationId ?? null,
    }),
  stop: (machineId: number) => api.post<Machine>(`/simulateur/machines/${machineId}/stop`),
  pause: (machineId: number) => api.post<Machine>(`/simulateur/machines/${machineId}/pause`),
  alarme: (machineId: number, message?: string) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/alarme`, { message }),
  cycleTime: (machineId: number, tempsCycleS: number) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/cycle-time`, {
      temps_cycle_s: tempsCycleS,
    }),
  produireBonne: (machineId: number, quantite = 1) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/production/bonne`, { quantite }),
  produireRebut: (machineId: number, quantite = 1, cause: CauseRebut = "AUTRE") =>
    api.post<Machine>(`/simulateur/machines/${machineId}/production/rebut`, { quantite, cause }),
  declencherArret: (machineId: number, cause: string, comment?: string) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/arret/declencher`, { cause, comment }),
  resoudreArret: (machineId: number, comment?: string) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/arret/resoudre`, { comment }),
  demarrerMaintenance: (machineId: number, type: TypeMaintenance, description?: string) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/maintenance/demarrer`, {
      type,
      description,
    }),
  terminerMaintenance: (machineId: number, prochaineMaintenance?: string) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/maintenance/terminer`, {
      prochaine_maintenance: prochaineMaintenance,
    }),
  envoyerTag: (machineId: number, tag: string, valeur: number | string) =>
    api.post<Machine>(`/simulateur/machines/${machineId}/tag`, { tag, valeur }),
  // Mode auto + scénarios de démonstration
  autoStatut: () => api.get<{ actif: boolean }>("/simulateur/auto"),
  autoStart: () => api.post<{ actif: boolean }>("/simulateur/auto/start"),
  autoStop: () => api.post<{ actif: boolean }>("/simulateur/auto/stop"),
  scenario: (nom: "panne-critique" | "derive-qualite" | "rupture-stock") =>
    api.post<{ scenario: string; message: string }>(`/simulateur/scenarios/${nom}`),
}

// --------------------------- Arrêts --------------------------- //
export const downtimeApi = {
  list: (params?: { machineId?: number; actifsSeulement?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.machineId) qs.set("machine_id", String(params.machineId))
    if (params?.actifsSeulement) qs.set("actifs_seulement", "true")
    const query = qs.toString()
    return api.get<DowntimeEventRead[]>(`/arrets${query ? `?${query}` : ""}`)
  },
}

// --------------------------- Qualité --------------------------- //
export const qualiteApi = {
  evenements: (machineId?: number) =>
    api.get<QualityEventRead[]>(
      `/qualite/evenements${machineId ? `?machine_id=${machineId}` : ""}`,
    ),
  resume: (machineId?: number) =>
    api.get<QualiteResume>(`/qualite/resume${machineId ? `?machine_id=${machineId}` : ""}`),
}

// --------------------------- Maintenance --------------------------- //
export const maintenanceApi = {
  list: (machineId?: number) =>
    api.get<MaintenanceEventRead[]>(`/maintenance${machineId ? `?machine_id=${machineId}` : ""}`),
}

// --------------------------- KPI / TRS / Dashboard --------------------------- //
export const kpiApi = {
  trs: (scope: "machine" | "ligne" | "of", id: number) =>
    api.get<TRSRead>(`/kpi/trs?scope=${scope}&id=${id}`),
  dashboard: (ligneId?: number | null) =>
    api.get<DashboardResume>(
      `/dashboard/resume${ligneId != null ? `?ligne_id=${ligneId}` : ""}`,
    ),
}

// --------------------------- AI panel --------------------------- //
export const aiApi = {
  insights: () => api.get<{ insights: string[] }>("/ai/insights"),
}
