import type { NavView } from "@/components/Sidebar"
import type { User } from "@/lib/api"

/**
 * Catégories d'outils requises par vue — miroir de la même règle appliquée
 * côté backend (voir `app/core/access.py` et les routeurs REST). Une vue
 * absente de cette table n'est pas restreinte (connexion suffit) : c'est le
 * cas de "assistant" (le périmètre s'applique par outil DANS la conversation,
 * pas par page) et de "qualite"/"jumeau" (aucune catégorie d'outil dédiée
 * côté agent). Garder synchronisé avec le mapping backend si l'un des deux
 * change.
 */
const NAV_CATEGORIES: Partial<Record<NavView, string[]>> = {
  dashboard: ["Supervision / MES"],
  machines: ["Supervision / MES", "Actions machine"],
  trs: ["Supervision / MES"],
  arrets: ["Supervision / MES", "Actions machine"],
  maintenance: ["Actions machine"],
  stock: ["Fabrication"],
  ordres: ["Fabrication", "Actions machine"],
  articles: ["Fabrication"],
  matieres: ["Fabrication"],
  lignes: ["Fabrication"],
  fournisseurs: ["Fabrication"],
  documents: ["Documents"],
  simulateur: ["Jumeau numérique", "Actions machine"],
}

export function canAccessView(user: User | null, view: NavView): boolean {
  if (!user) return false
  if (user.is_admin) return true
  const requises = NAV_CATEGORIES[view]
  if (!requises) return true
  const autorises = new Set(user.outils_autorises)
  return requises.some((c) => CATEGORY_TOOLS[c]?.some((t) => autorises.has(t)))
}

/** Table catégorie -> noms d'outils, dérivée de `admin/tools` (voir
 * AdminUsersPage) mais dupliquée ici en dur : cette vérification tourne avant
 * tout appel réseau (garde de route), donc pas de dépendance à un fetch. */
const CATEGORY_TOOLS: Record<string, string[]> = {
  Documents: ["rechercher_documents", "lister_documents_disponibles"],
  Fabrication: [
    "lister_articles",
    "rechercher_article",
    "verifier_disponibilite",
    "lister_lignes_production",
    "etat_stock_matiere",
    "creer_ordre_fabrication",
    "consulter_ordre_fabrication",
    "lister_ordres_par_quantite",
  ],
  "Supervision / MES": [
    "etat_machine",
    "etat_ligne",
    "resume_trs",
    "calculer_cout_of",
    "arrets_actifs",
    "alertes_actives",
  ],
  "Actions machine": [
    "choisir_meilleure_ligne",
    "generer_rapport_production",
    "risque_panne_machines",
    "simuler_scenario_panne",
    "analyser_bascule_of",
    "demarrer_machine",
    "lancer_of_maintenant",
    "mettre_of_en_file",
    "arreter_machine",
    "arreter_ligne",
    "resoudre_arret_machine",
    "lancer_maintenance",
    "basculer_of_vers_ligne",
    "acquitter_alerte",
  ],
  "Jumeau numérique": ["piloter_jumeau_numerique"],
}

/** Première vue accessible à cet utilisateur, dans un ordre de préférence
 * raisonnable — "assistant" n'a jamais de restriction donc termine toujours. */
const ORDRE_REPLI: NavView[] = [
  "dashboard",
  "documents",
  "qualite",
  "machines",
  "stock",
  "articles",
  "assistant",
]

export function firstAccessibleView(user: User | null): NavView {
  for (const view of ORDRE_REPLI) {
    if (canAccessView(user, view)) return view
  }
  return "assistant"
}
