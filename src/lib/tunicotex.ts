import { ApiRequestError, request, requestFile } from "@/lib/api"

export const DIVATEX_INDISPONIBLE = "divatex_indisponible"

/** Vrai si l'erreur vient d'un 503 « Base DIVA injoignable » (utilisé pour choisir <ErreurDivatex />). */
export function estErreurDivatex(e: unknown): boolean {
  return e instanceof ApiRequestError && e.code === DIVATEX_INDISPONIBLE
}

// Types miroirs de backend/app/schemas/tunicotex.py (snake_case conservé, dates ISO).

export type Nature = "tricotage" | "confection" | "finition"

export interface Groupe {
  id: number
  nom: string
}

export interface Ligne {
  id: number
  code: string
  nom: string
  groupe: Groupe | null
  nature: Nature
}

export interface LigneReference {
  id: number
  code: string
  nom: string
  groupe_id: number | null
  nature: Nature
}

export interface Phase {
  id: number
  nom: string
}

export interface Reference {
  date_reference: string
  calibre: boolean
  groupes: Groupe[]
  lignes: LigneReference[]
  phases: Phase[]
}

export interface ProductionLigne {
  ligne: Ligne
  jour: string
  sortie: number
  objectif: number | null
  objectif_date: string | null
  objectif_perime: boolean
  taux: number | null
  effectif: number
  minutes_produites: number
  minutes_presence: number
  rendement: number | null
  presence_estimee: boolean
  a_des_lectures: boolean
}

export interface PointJour {
  jour: string
  sortie: number
  objectif: number
}

export interface PointHeure {
  heure: number
  pieces: number
}

export interface SituationAtelier {
  jour: string
  sortie: number
  objectif: number
  /** Σ sortie des chaînes de confection avec objectif et lectures (numérateur du taux). */
  sortie_avec_objectif: number
  taux: number | null
  rendement_moyen: number | null
  lignes_sous_objectif: string[]
  lignes_au_dessus: string[]
  nb_of_en_retard: number
  a_des_lectures: boolean
}

export interface Atelier {
  situation: SituationAtelier
  lignes: ProductionLigne[]
  tendance: PointJour[]
}

export interface Operateur {
  id: number
  matricule: string
  nom: string
  prenom: string
  ligne_id: number | null
}

export interface RendementOperateur {
  operateur: Operateur
  ligne: string | null
  pieces_operations: number
  minutes_produites: number
  minutes_presence: number
  rendement: number | null
  presence_estimee: boolean
}

export interface FicheOperateur {
  operateur: Operateur
  du: string
  au: string
  par_jour: [string, number | null][]
  operations: [string, number][]
  total: RendementOperateur
}

export interface OFResume {
  id: number
  numero: string
  client: string | null
  article: string | null
  quantite: number
  date_export_prevue: string | null
  ouvert: boolean
  avancement_final: number
}

export interface AvancementPhase {
  phase_id: number
  nom: string
  quantite: number
  pct: number
}

export interface AvancementOF {
  of: OFResume
  phases: AvancementPhase[]
  /** [taille, quantité par id de phase] (clés JSON = chaînes). */
  tailles: [string, Record<string, number>][]
  lignes: string[]
  derniere_lecture: string | null
}

export interface ChaineDetail {
  production: ProductionLigne
  courbe: PointHeure[]
  operateurs: RendementOperateur[]
  ofs: OFResume[]
}

export interface OFRisque {
  of: OFResume
  statut: "en_retard" | "a_risque"
  jours: number
}

export interface CommandeDetail {
  id: number
  numero: string
  client: string | null
  date: string | null
  date_fin_visee: string | null
  quantite: number
  ofs: OFResume[]
  a_risque: boolean
}

// --------------------------- Rapports --------------------------- //

export interface ParametresRapport {
  jour?: string | null
  du?: string | null
  au?: string | null
  groupe_id?: number | null
  ligne_id?: number | null
  of_id?: number | null
  client_id?: number | null
  horizon_jours?: number | null
}

export interface EnvoiRapport {
  canal: "whatsapp" | "email"
  destinataire: string
  parametres: ParametresRapport
}

export interface EnvoiRapportReponse {
  ok: boolean
  message: string
}

/** Tuile d'un artifact `kpi_tiles` (voir backend/app/agent/tools/tunicotex.py). */
export interface Tuile {
  libelle: string
  valeur: string | number | null
  unite?: string
  etat?: "ok" | "alerte" | "neutre"
  note?: string
}

/** Phase d'un artifact `phase_pipeline`. */
export interface PhasePipelineItem {
  nom: string
  quantite: number
  pct: number
}

export interface TaillesPipeline {
  colonnes: string[]
  lignes: (string | number)[][]
}

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

function telecharger(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const tunicotexApi = {
  reference: () => request<Reference>("GET", "/tunicotex/reference"),
  atelier: (date?: string) => request<Atelier>("GET", `/tunicotex/atelier${qs({ date })}`),
  chaines: (date?: string, groupe?: number) =>
    request<ProductionLigne[]>("GET", `/tunicotex/chaines${qs({ date, groupe })}`),
  chaine: (id: number, date?: string) =>
    request<ChaineDetail>("GET", `/tunicotex/chaines/${id}${qs({ date })}`),
  rechercherOf: (q: string, ouverts?: boolean, client?: number) =>
    request<OFResume[]>("GET", `/tunicotex/of${qs({ q, ouverts, client })}`),
  of: (id: number) => request<AvancementOF>("GET", `/tunicotex/of/${id}`),
  operateurs: (p: { du?: string; au?: string; chaine?: number; groupe?: number }) =>
    request<RendementOperateur[]>("GET", `/tunicotex/operateurs${qs(p)}`),
  operateur: (id: number, du?: string, au?: string) =>
    request<FicheOperateur>("GET", `/tunicotex/operateurs/${id}${qs({ du, au })}`),
  commandesARisque: (horizon?: number, client?: number, date?: string) =>
    request<OFRisque[]>("GET", `/tunicotex/commandes${qs({ horizon, client, date })}`),
  rechercherCommandes: (q: string) =>
    request<CommandeDetail[]>("GET", `/tunicotex/commandes/recherche${qs({ q })}`),

  /** Télécharge le PDF (nom de fichier fourni par le serveur). */
  telechargerRapport: async (type: string, params: ParametresRapport = {}): Promise<void> => {
    const { blob, filename } = await requestFile(
      "GET",
      `/tunicotex/rapports/${encodeURIComponent(type)}.pdf${qs({ ...params })}`,
      `rapport-${type}.pdf`,
    )
    telecharger(blob, filename)
  },
  /** PDF du rapport en mémoire (aperçu), sans le télécharger. */
  apercuRapport: async (type: string, params: ParametresRapport = {}): Promise<Blob> =>
    (
      await requestFile(
        "GET",
        `/tunicotex/rapports/${encodeURIComponent(type)}.pdf${qs({ ...params })}`,
        `rapport-${type}.pdf`,
      )
    ).blob,
  envoyerRapport: (type: string, corps: EnvoiRapport) =>
    request<EnvoiRapportReponse>(
      "POST",
      `/tunicotex/rapports/${encodeURIComponent(type)}/envoyer`,
      corps,
    ),
}

/** Date ISO (AAAA-MM-JJ) -> JJ/MM/AAAA. */
export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [a, m, j] = iso.slice(0, 10).split("-")
  return a && m && j ? `${j}/${m}/${a}` : iso
}
