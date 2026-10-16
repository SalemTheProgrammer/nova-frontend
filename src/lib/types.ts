export interface DocumentRag {
  id: number
  nom: string
  fichier: string
  categorie: string | null
  nb_pages: number
  nb_chunks: number
  statut: string
  date_creation: string
}

export interface DocumentPassage {
  document_id: number | null
  document_nom: string
  source: string
  page: number | null
  score: number
  citation: string
  /** Phrases du chunk qui répondent à la question — seul ce texte est surligné. */
  extraits?: string[]
}

export interface DocumentSearchResult {
  query: string
  passages: DocumentPassage[]
}

/** Contexte de consultation d'un document : PDF à ouvrir + passages à surligner. */
export interface DocumentFocus {
  documentId: number
  page: number
  passages: DocumentPassage[]
}

// --------------------------- Agent streaming --------------------------- //
export interface AgentArtifact {
  kind: string
  [key: string]: unknown
}

export type AgentStreamEvent =
  | { type: "turn_start" }
  | { type: "token"; content: string }
  | { type: "tool_start"; id: string; name: string; input?: unknown }
  | { type: "tool_end"; id: string; name: string; output: string; artifact: AgentArtifact | null }
  | { type: "done"; thread_id: string; response: string }
  | { type: "error"; message: string }
