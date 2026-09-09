import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
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

  const groupes = useMemo(() => grouperOutils(tools), [tools])
  const selected = users.find((u) => u.id === selectedId) ?? null

  useEffect(() => {
    document.title = "Administration Utilisateurs — Nova"
  }, [])

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
    if (!window.confirm(`Supprimer le numéro ${user.telephone} ?`)) return
    try {
      await adminApi.deleteUser(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      if (selectedId === user.id) setSelectedId(null)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Suppression impossible.")
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-violet-600 dark:text-violet-400" />
          <div>
            <h1 className="text-base font-bold leading-tight">Administration</h1>
            <p className="text-xs text-muted-foreground">Numéros autorisés & accès aux outils</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/dashboard">
            <ArrowLeft className="size-4" /> Retour à l'application
          </Link>
        </Button>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-[20rem_1fr] md:p-6">
        {/* Liste des numéros */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Numéros ({users.length})</h2>
            <Button
              size="sm"
              onClick={() => {
                setAjoutOuvert(true)
                setSelectedId(null)
              }}
            >
              <UserPlus className="size-4" /> Ajouter
            </Button>
          </div>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          {chargement ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Nom</th>
                    <th className="px-3 py-2 font-medium">Téléphone</th>
                    <th className="px-3 py-2 font-medium">Outils</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => {
                        setSelectedId(user.id)
                        setAjoutOuvert(false)
                      }}
                      className={cn(
                        "cursor-pointer border-b border-border last:border-0 transition-colors",
                        selectedId === user.id
                          ? "bg-violet-50 dark:bg-violet-950/40"
                          : "hover:bg-muted",
                      )}
                    >
                      <td className="max-w-40 truncate px-3 py-2.5 font-medium">
                        {user.nom_complet || "Sans nom"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {user.telephone}
                      </td>
                      <td className="px-3 py-2.5">
                        {user.is_admin ? (
                          <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            ADMIN
                          </span>
                        ) : (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {user.outils_autorises.length}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {user.actif ? (
                          <span className="rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            actif
                          </span>
                        ) : (
                          <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            inactif
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Éditeur */}
        <div>
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
            <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Sélectionnez un numéro pour gérer ses accès, ou ajoutez-en un.
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
    <div className="space-y-4">
      {groupes.map(({ categorie, outils }) => {
        const noms = outils.map((o) => o.name)
        const coches = noms.filter((n) => selection.has(n)).length
        const tousCoches = coches === noms.length
        return (
          <div key={categorie} className="rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
              <span className="text-sm font-semibold">
                {categorie}{" "}
                <span className="font-normal text-muted-foreground">
                  ({coches}/{noms.length})
                </span>
              </span>
              <button
                type="button"
                onClick={() => onToggleGroupe(noms, !tousCoches)}
                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                {tousCoches ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
            <div className="grid gap-1 p-2 sm:grid-cols-2">
              {outils.map((outil) => {
                const coche = selection.has(outil.name)
                return (
                  <label
                    key={outil.name}
                    className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-muted"
                    title={outil.description}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        coche
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-input bg-background",
                      )}
                    >
                      {coche && <Check className="size-3" />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={coche}
                      onChange={() => onToggle(outil.name)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{outil.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
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

  async function sauvegarder() {
    setEnregistre(true)
    setErreur(null)
    try {
      const saved = await adminApi.updateUser(user.id, {
        nom_complet: nom.trim(),
        actif,
        outils_autorises: Array.from(selection),
      })
      onSaved(saved)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible.")
    } finally {
      setEnregistre(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{user.telephone}</h2>
          {user.is_admin && (
            <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
              Administrateur — accès à tous les outils
            </span>
          )}
        </div>
        {!user.is_admin && (
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="size-4" /> Supprimer
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className="mb-1.5 block text-sm font-medium">
            Nom complet
          </label>
          <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className="h-9" />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
              disabled={user.is_admin}
            />
            Compte actif
          </label>
        </div>
      </div>

      {!user.is_admin && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Outils autorisés</h3>
          <ChecklistOutils
            groupes={groupes}
            selection={selection}
            onToggle={toggle}
            onToggleGroupe={toggleGroupe}
          />
        </div>
      )}

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <div className="flex justify-end">
        <Button onClick={sauvegarder} disabled={enregistre}>
          {enregistre ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Enregistrer
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
    <form onSubmit={creer} className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="text-base font-bold">Nouveau numéro</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-tel" className="mb-1.5 block text-sm font-medium">
            Numéro de téléphone
          </label>
          <Input
            id="new-tel"
            type="tel"
            placeholder="+216 12 345 678"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
            className="h-9"
          />
        </div>
        <div>
          <label htmlFor="new-nom" className="mb-1.5 block text-sm font-medium">
            Nom complet
          </label>
          <Input
            id="new-nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Outils autorisés</h3>
        <ChecklistOutils
          groupes={groupes}
          selection={selection}
          onToggle={toggle}
          onToggleGroupe={toggleGroupe}
        />
      </div>

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={enregistre}>
          {enregistre ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Créer le numéro
        </Button>
      </div>
    </form>
  )
}
