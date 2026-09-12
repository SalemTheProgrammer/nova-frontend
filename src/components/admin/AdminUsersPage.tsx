import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  Check,
  CheckCircle2,
  Cpu,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { adminApi, type ToolCatalogItem, type User } from "@/lib/api"

/** Regroupe le catalogue d'outils par catégorie, en conservant l'ordre. */
function grouperOutils(tools: ToolCatalogItem[]): { categorie: string; outils: ToolCatalogItem[] }[] {
  const ordre: string[] = []
  const map = new Map<string, ToolCatalogItem[]>()
  for (const t of tools) {
    if (!map.has(t.categorie)) {
      map.set(t.categorie, [])
      ordre.push(t.categorie)
    }
    map.get(t.categorie)!.push(t)
  }
  return ordre.map((categorie) => ({ categorie, outils: map.get(categorie)! }))
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [tools, setTools] = useState<ToolCatalogItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIF" | "INACTIF" | "ADMIN">("ALL")

  const groupes = useMemo(() => grouperOutils(tools), [tools])
  const selected = users.find((u) => u.id === selectedId) ?? null

  async function recharger() {
    setChargement(true)
    try {
      const [u, t] = await Promise.all([adminApi.users(), adminApi.tools()])
      setUsers(u)
      setTools(t)
      setErreur(null)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Chargement impossible.")
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    recharger()
  }, [])

  function onUserSaved(saved: User) {
    setUsers((prev) => {
      const existe = prev.some((u) => u.id === saved.id)
      return existe ? prev.map((u) => (u.id === saved.id ? saved : u)) : [...prev, saved]
    })
    setSelectedId(saved.id)
    setAjoutOuvert(false)
  }

  async function supprimer(user: User) {
    if (
      !window.confirm(
        `Confirmez-vous la suppression définitive du compte ${user.telephone} (${user.nom_complet || "Sans nom"}) ?`,
      )
    ) {
      return
    }
    try {
      await adminApi.deleteUser(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      if (selectedId === user.id) setSelectedId(null)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Suppression impossible.")
    }
  }

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter === "ACTIF" && !u.actif) return false
      if (statusFilter === "INACTIF" && u.actif) return false
      if (statusFilter === "ADMIN" && !u.is_admin) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const matchName = (u.nom_complet || "").toLowerCase().includes(q)
      const matchTel = (u.telephone || "").toLowerCase().includes(q)
      return matchName || matchTel
    })
  }, [users, statusFilter, searchQuery])

  // KPIs
  const stats = useMemo(() => {
    const total = users.length
    const admins = users.filter((u) => u.is_admin).length
    const actifs = users.filter((u) => u.actif).length
    const totalTools = tools.length
    return { total, admins, actifs, totalTools }
  }, [users, tools])

  return (
    <div className="h-full w-full min-h-0 flex flex-col p-3 sm:p-5 gap-3 overflow-y-auto select-none bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ----------------- EN-TÊTE DASHBOARD ----------------- */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-violet-600 dark:text-violet-400" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-black dark:text-white leading-none">
              Administration & Droits d'Accès
            </h1>
          </div>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1">
            Gestion des numéros autorisés WhatsApp/SMS et attribution granulaire des outils IA Nova
          </p>
        </div>

        {/* Boutons d'action en-tête */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setAjoutOuvert(true)
              setSelectedId(null)
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-8 px-3 shadow-xs cursor-pointer"
          >
            <UserPlus className="size-3.5 mr-1.5" /> Nouveau numéro
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={recharger}
            disabled={chargement}
            title="Actualiser la liste"
            className="border-zinc-300 dark:border-zinc-700 text-black dark:text-white font-bold text-xs h-8 px-2.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={cn("size-3.5", chargement && "animate-spin text-violet-600")} />
          </Button>
        </div>
      </div>

      {/* ----------------- 4 CARTES KPI STATISTIQUES ----------------- */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Total Numéros</div>
            <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">
              {stats.total}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Users className="size-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Administrateurs</div>
            <div className="text-xl sm:text-2xl font-black text-violet-600 dark:text-violet-400 mt-0.5">
              {stats.admins}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600">
            <Shield className="size-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Comptes Actifs</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
              {stats.actifs}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
            <UserCheck className="size-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Outils Nova IA</div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
              {stats.totalTools}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600">
            <Cpu className="size-4.5" />
          </div>
        </div>
      </div>

      {erreur && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {erreur}
        </div>
      )}

      {/* ----------------- GRILLE PRINCIPALE (SPLIT VIEW LISTE / ÉDITEUR) ----------------- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* COLONNE GAUCHE (LISTE DES UTILISATEURS - 5 colonnes sur 12) */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs">
          {/* Barre de recherche et filtres de statut */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Rechercher par nom ou numéro…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Filtres rapides */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer",
                  statusFilter === "ALL"
                    ? "bg-black text-white dark:bg-white dark:text-black font-black"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black",
                )}
              >
                Tous ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIF")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer",
                  statusFilter === "ACTIF"
                    ? "bg-emerald-600 text-white font-black"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black",
                )}
              >
                Actifs ({stats.actifs})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ADMIN")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer",
                  statusFilter === "ADMIN"
                    ? "bg-violet-600 text-white font-black"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black",
                )}
              >
                Admins ({stats.admins})
              </button>
            </div>
          </div>

          {/* Liste interactive des numéros */}
          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {chargement ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-zinc-500">
                <Loader2 className="size-4 animate-spin text-violet-600" /> Chargement des numéros…
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-xs font-bold text-zinc-500">
                Aucun utilisateur ne correspond à votre recherche.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedId === user.id && !ajoutOuvert
                const initials = (user.nom_complet || user.telephone)
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()

                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedId(user.id)
                      setAjoutOuvert(false)
                    }}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer shadow-2xs",
                      isSelected
                        ? "border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 dark:border-violet-500"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "size-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                          user.is_admin
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
                        )}
                      >
                        {initials || "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-black dark:text-white truncate">
                          {user.nom_complet || "Sans nom"}
                        </div>
                        <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 font-mono truncate">
                          {user.telephone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {user.is_admin ? (
                        <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                          ADMIN
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                          {user.outils_autorises.length} outils
                        </span>
                      )}

                      <span
                        className={cn(
                          "size-2 rounded-full shrink-0",
                          user.actif ? "bg-emerald-500" : "bg-red-500",
                        )}
                        title={user.actif ? "Compte actif" : "Compte inactif"}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* COLONNE DROITE (ÉDITEUR / FORMULAIRE / ÉTAT VIDE - 7 colonnes sur 12) */}
        <div className="lg:col-span-7">
          {ajoutOuvert ? (
            <UserForm
              groupes={groupes}
              onSaved={onUserSaved}
              onCancel={() => setAjoutOuvert(false)}
            />
          ) : selected ? (
            <UserEditor
              key={selected.id}
              user={selected}
              groupes={groupes}
              onSaved={onUserSaved}
              onDelete={() => supprimer(selected)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
              <ShieldCheck className="size-12 text-zinc-400 dark:text-zinc-600 mb-3 stroke-[1.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">
                Sélectionnez un numéro ou ajoutez-en un
              </h3>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4">
                Cliquez sur un compte à gauche pour modifier son nom, activer ou désactiver son accès, et configurer les outils auxquels il a droit via WhatsApp et Nova MES.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setAjoutOuvert(true)
                  setSelectedId(null)
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                <UserPlus className="size-3.5 mr-1.5" /> Ajouter un nouveau numéro
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type Groupe = { categorie: string; outils: ToolCatalogItem[] }

/** Cases à cocher groupées par catégorie, avec « tout cocher » par groupe. */
function ChecklistOutils({
  groupes,
  selection,
  onToggle,
  onToggleGroupe,
}: {
  groupes: Groupe[]
  selection: Set<string>
  onToggle: (name: string) => void
  onToggleGroupe: (names: string[], tout: boolean) => void
}) {
  return (
    <div className="space-y-3">
      {groupes.map(({ categorie, outils }) => {
        const noms = outils.map((o) => o.name)
        const coches = noms.filter((n) => selection.has(n)).length
        const tousCoches = coches === noms.length
        return (
          <div
            key={categorie}
            className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/60 px-3 py-2">
              <span className="text-xs font-black text-black dark:text-white flex items-center gap-1.5">
                <Wrench className="size-3.5 text-zinc-600 dark:text-zinc-400" />
                {categorie}
                <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                  {coches} / {noms.length}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onToggleGroupe(noms, !tousCoches)}
                className="text-[11px] font-black text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline cursor-pointer"
              >
                {tousCoches ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
            <div className="grid gap-1.5 p-2.5 sm:grid-cols-2">
              {outils.map((outil) => {
                const coche = selection.has(outil.name)
                return (
                  <label
                    key={outil.name}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors border",
                      coche
                        ? "border-violet-300 dark:border-violet-800/80 bg-violet-50/50 dark:bg-violet-950/30"
                        : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                    )}
                    title={outil.description}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        coche
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900",
                      )}
                    >
                      {coche && <Check className="size-3 stroke-[3]" />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={coche}
                      onChange={() => onToggle(outil.name)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-black dark:text-white">
                        {outil.name}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {outil.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function useSelection(initial: string[]) {
  const [selection, setSelection] = useState<Set<string>>(() => new Set(initial))
  const toggle = (name: string) =>
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  const toggleGroupe = (names: string[], tout: boolean) =>
    setSelection((prev) => {
      const next = new Set(prev)
      for (const n of names) {
        if (tout) next.add(n)
        else next.delete(n)
      }
      return next
    })
  return { selection, setSelection, toggle, toggleGroupe }
}

/** Édition d'un numéro existant. */
function UserEditor({
  user,
  groupes,
  onSaved,
  onDelete,
}: {
  user: User
  groupes: Groupe[]
  onSaved: (u: User) => void
  onDelete: () => void
}) {
  const [nom, setNom] = useState(user.nom_complet)
  const [actif, setActif] = useState(user.actif)
  const { selection, toggle, toggleGroupe } = useSelection(user.outils_autorises)
  const [enregistre, setEnregistre] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)

  async function sauvegarder() {
    setEnregistre(true)
    setErreur(null)
    setSucces(false)
    try {
      const saved = await adminApi.updateUser(user.id, {
        nom_complet: nom.trim(),
        actif,
        outils_autorises: Array.from(selection),
      })
      setSucces(true)
      setTimeout(() => setSucces(false), 2500)
      onSaved(saved)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible.")
    } finally {
      setEnregistre(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-black dark:text-white font-mono tracking-tight">
              {user.telephone}
            </h2>
            {user.is_admin ? (
              <span className="rounded-md bg-violet-600 px-2 py-0.5 text-xs font-black text-white">
                ADMINISTRATEUR
              </span>
            ) : user.actif ? (
              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-xs font-bold">
                Actif
              </span>
            ) : (
              <span className="rounded-md bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 px-2 py-0.5 text-xs font-bold">
                Inactif
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
            {user.is_admin
              ? "Les administrateurs disposent automatiquement de tous les droits et outils du système."
              : `Autorisé sur ${selection.size} outil(s) Nova MES.`}
          </p>
        </div>

        {!user.is_admin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="text-xs font-bold h-8 px-2.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="size-3.5 mr-1" /> Supprimer ce compte
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className="mb-1 block text-xs font-bold text-black dark:text-white">
            Nom complet / Titre du technicien
          </label>
          <Input
            id="nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Mohamed Ben Salah"
            className="h-8.5 text-xs font-bold border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-white"
          />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-black dark:text-white select-none">
            <input
              type="checkbox"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
              disabled={user.is_admin}
              className="size-4 rounded accent-violet-600 cursor-pointer"
            />
            <span>Compte actif (autorisé à se connecter et recevoir des messages)</span>
          </label>
        </div>
      </div>

      {!user.is_admin && (
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">
              Outils & Permissions Accordés
            </h3>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
              {selection.size} sélectionné(s)
            </span>
          </div>

          <ChecklistOutils
            groupes={groupes}
            selection={selection}
            onToggle={toggle}
            onToggleGroupe={toggleGroupe}
          />
        </div>
      )}

      {erreur && (
        <p className="text-xs font-bold text-red-600 dark:text-red-400">{erreur}</p>
      )}

      {succes && (
        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="size-3.5" /> Modifications enregistrées avec succès.
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={sauvegarder}
          disabled={enregistre}
          className="bg-violet-600 hover:bg-violet-700 text-white font-black text-xs h-8.5 px-4 cursor-pointer shadow-xs"
        >
          {enregistre ? (
            <Loader2 className="size-3.5 animate-spin mr-1.5" />
          ) : (
            <Check className="size-3.5 mr-1.5" />
          )}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  )
}

/** Création d'un nouveau numéro. */
function UserForm({
  groupes,
  onSaved,
  onCancel,
}: {
  groupes: Groupe[]
  onSaved: (u: User) => void
  onCancel: () => void
}) {
  const [telephone, setTelephone] = useState("")
  const [nom, setNom] = useState("")
  const { selection, toggle, toggleGroupe } = useSelection([])
  const [enregistre, setEnregistre] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function creer(e: FormEvent) {
    e.preventDefault()
    setEnregistre(true)
    setErreur(null)
    try {
      const saved = await adminApi.createUser({
        telephone: telephone.trim(),
        nom_complet: nom.trim(),
        outils_autorises: Array.from(selection),
      })
      onSaved(saved)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Création impossible.")
    } finally {
      setEnregistre(false)
    }
  }

  return (
    <form
      onSubmit={creer}
      className="space-y-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs"
    >
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-black text-black dark:text-white">
            Nouveau Numéro Autorisé
          </h2>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Enregistrez un numéro de téléphone avec ses permissions d'outils initiales.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-tel" className="mb-1 block text-xs font-bold text-black dark:text-white">
            Numéro de téléphone (WhatsApp / SMS)
          </label>
          <Input
            id="new-tel"
            type="tel"
            placeholder="+216 12 345 678"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
            className="h-8.5 text-xs font-bold border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="new-nom" className="mb-1 block text-xs font-bold text-black dark:text-white">
            Nom complet / Rôle
          </label>
          <Input
            id="new-nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Technicien Ligne 1"
            className="h-8.5 text-xs font-bold border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-white"
          />
        </div>
      </div>

      <div className="pt-2">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">
            Outils & Permissions Initiales
          </h3>
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
            {selection.size} sélectionné(s)
          </span>
        </div>

        <ChecklistOutils
          groupes={groupes}
          selection={selection}
          onToggle={toggle}
          onToggleGroupe={toggleGroupe}
        />
      </div>

      {erreur && (
        <p className="text-xs font-bold text-red-600 dark:text-red-400">{erreur}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-xs font-bold h-8.5 px-3 border-zinc-300 dark:border-zinc-700 cursor-pointer"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={enregistre}
          className="bg-violet-600 hover:bg-violet-700 text-white font-black text-xs h-8.5 px-4 cursor-pointer shadow-xs"
        >
          {enregistre ? (
            <Loader2 className="size-3.5 animate-spin mr-1.5" />
          ) : (
            <Plus className="size-3.5 mr-1.5" />
          )}
          Créer et autoriser le numéro
        </Button>
      </div>
    </form>
  )
}
