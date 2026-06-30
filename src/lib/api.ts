import type {
  Article,
  Faisabilite,
  Fournisseur,
  LigneProduction,
  Lot,
  MatierePremiere,
  Nomenclature,
  Norme,
  NormeSearchResult,
  OrdreFabrication,
  StatutOF,
  StockMP,
} from "@/lib/types"

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1"
const API_KEY = import.meta.env.VITE_API_KEY ?? "dev-local-key"

export interface ChatResponse {
  thread_id: string
  response: string
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
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
}

// --------------------------- Chat / agent --------------------------- //
export function sendChatMessage(message: string, threadId?: string): Promise<ChatResponse> {
  return api.post<ChatResponse>("/chat", {
    message,
    ...(threadId ? { thread_id: threadId } : {}),
  })
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

// --------------------------- Normes (RAG) --------------------------- //
export const normesApi = {
  list: () => api.get<Norme[]>("/normes"),
  upload: (nom: string, file: File) => {
    const fd = new FormData()
    fd.append("nom", nom)
    fd.append("file", file)
    return upload<Norme>("/normes", fd)
  },
  remove: (id: number) => api.del(`/normes/${id}`),
  search: (q: string) =>
    api.get<NormeSearchResult>(`/normes/recherche?q=${encodeURIComponent(q)}`),
}
