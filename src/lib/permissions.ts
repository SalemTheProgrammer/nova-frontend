import type { NavView } from "@/components/Sidebar"
import type { User } from "@/lib/api"

/**
 * Catégories d'outils requises par vue — miroir de la même règle appliquée
 * côté backend (voir `app/core/access.py` et les routeurs REST). Une vue
 * absente de cette table n'est pas restreinte (connexion suffit). Garder
 * synchronisé avec le mapping backend si l'un des deux change.
 */
const NAV_CATEGORIES: Partial<Record<NavView, string[]>> = {
  atelier: ["Atelier Tunicotex"],
  chaines: ["Atelier Tunicotex"],
  operateurs: ["Atelier Tunicotex"],
  of: ["Atelier Tunicotex"],
  commandes: ["Atelier Tunicotex"],
  rapports: ["Atelier Tunicotex"],
  documents: ["Documents"],
}

export function canAccessView(user: User | null, view: NavView): boolean {
  if (!user) return false
  if (view === "admin") return Boolean(user.is_admin)
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
  "Atelier Tunicotex": [
    "situation_atelier",
    "production_chaines",
    "detail_chaine",
    "rechercher_of",
    "avancement_of",
    "rendement_operateurs",
    "fiche_operateur",
    "commandes_a_risque",
    "consulter_commande",
    "rapport_pdf",
  ],
}

/** Première vue accessible à cet utilisateur, dans un ordre de préférence
 * raisonnable. */
const ORDRE_REPLI: NavView[] = ["atelier", "documents"]

export function firstAccessibleView(user: User | null): NavView {
  for (const view of ORDRE_REPLI) {
    if (canAccessView(user, view)) return view
  }
  return "atelier"
}
