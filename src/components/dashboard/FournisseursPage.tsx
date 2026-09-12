import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Plus, Search, X } from "lucide-react"
import {
  fournisseursApi,
  type FournisseurContact,
  type FournisseurContactPage,
  type RoleLevel,
} from "@/lib/api"
import type { Fournisseur } from "@/lib/types"
import { useResource } from "@/lib/useResource"
import {
  Button,
  ErrorBanner,
  Field,
  Modal,
  Page,
  Select,
  TextInput,
} from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

type TabFilter = "tous" | RoleLevel

const ROLE_LABELS: Record<RoleLevel, string> = {
  directeur: "Directeur",
  sous_directeur: "Sous-directeur",
  chef: "Chef de service",
  employe: "Employé",
}

export function FournisseursPage() {
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<TabFilter>("tous")
  const [search, setSearch] = useState("")
  const [fournisseurFilter, setFournisseurFilter] = useState<string>("all")
  const [fournisseurDropdownOpen, setFournisseurDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Feedback copie
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Modale création / édition
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<FournisseurContact | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fournisseur_id: "",
    role_level: "directeur" as RoleLevel,
    nom: "",
    poste: "",
    telephone: "+216 ",
    email: "salem.dahmani345@gmail.com",
  })

  // Récupération paginée depuis le backend (10 par page)
  const { data: pageData, loading, error, reload, setError } = useResource<FournisseurContactPage>(
    () =>
      fournisseursApi.contacts({
        page,
        page_size: 10,
        role_level: activeTab !== "tous" ? activeTab : undefined,
        fournisseur_id: fournisseurFilter !== "all" ? Number(fournisseurFilter) : undefined,
        search: search.trim() || undefined,
      }),
    [page, activeTab, fournisseurFilter, search],
  )

  const fournisseurs = useResource<Fournisseur[]>(() => fournisseursApi.list(), [])

  // Fermer le menu déroulant fournisseur au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFournisseurDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Réinitialiser la page à 1 lors du changement de filtre
  function handleTabChange(tab: TabFilter) {
    setActiveTab(tab)
    setPage(1)
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(1)
  }

  function handleFournisseurChange(val: string) {
    setFournisseurFilter(val)
    setPage(1)
    setFournisseurDropdownOpen(false)
  }

  function handleOpenCreate() {
    setEditingContact(null)
    const defaultFid =
      fournisseurs.data && fournisseurs.data.length > 0 ? String(fournisseurs.data[0].id) : ""
    setForm({
      fournisseur_id: defaultFid,
      role_level: activeTab !== "tous" ? activeTab : "directeur",
      nom: "",
      poste: "",
      telephone: "+216 ",
      email: "salem.dahmani345@gmail.com",
    })
    setModalOpen(true)
  }

  function handleOpenEdit(contact: FournisseurContact) {
    setEditingContact(contact)
    setForm({
      fournisseur_id: String(contact.fournisseur_id),
      role_level: contact.role_level,
      nom: contact.nom,
      poste: contact.poste,
      telephone: contact.telephone,
      email: contact.email,
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim() || !form.poste.trim() || !form.fournisseur_id) {
      setError("Veuillez remplir tous les champs obligatoires.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editingContact) {
        await fournisseursApi.updateContact(editingContact.id, {
          fournisseur_id: Number(form.fournisseur_id),
          role_level: form.role_level,
          nom: form.nom.trim(),
          poste: form.poste.trim(),
          telephone: form.telephone.trim(),
          email: form.email.trim(),
        })
      } else {
        await fournisseursApi.createContact({
          fournisseur_id: Number(form.fournisseur_id),
          role_level: form.role_level,
          nom: form.nom.trim(),
          poste: form.poste.trim(),
          telephone: form.telephone.trim(),
          email: form.email.trim() || "salem.dahmani345@gmail.com",
        })
      }
      setModalOpen(false)
      void reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Voulez-vous vraiment supprimer cet interlocuteur ?")) return
    try {
      await fournisseursApi.deleteContact(id)
      void reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
    }
  }

  function handleCopy(id: number, email: string) {
    navigator.clipboard.writeText(email)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const items = pageData?.items ?? []
  const total = pageData?.total ?? 0
  const totalPages = pageData?.total_pages ?? 1
  const counts = pageData?.counts ?? {
    tous: 0,
    directeur: 0,
    sous_directeur: 0,
    chef: 0,
    employe: 0,
  }
  const fournisseurList = fournisseurs.data ?? []

  return (
    <Page fullHeight className="bg-background !p-3 sm:!p-4 overflow-hidden">
      <div className="flex h-full w-full min-w-0 flex-col justify-between overflow-hidden gap-2">
        {/* =========================================================================
            1. En-tête Compact (Moindre hauteur possible)
           ========================================================================= */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 pb-2.5">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
              Fournisseurs & Interlocuteurs
            </h1>
            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {total} contact{total > 1 ? "s" : ""}
            </span>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="h-8 shrink-0 gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
          >
            <Plus className="size-3.5" /> Ajouter un contact
          </Button>
        </header>

        <ErrorBanner message={error ?? fournisseurs.error} />

        {/* =========================================================================
            2. Barre de Navigation par Onglets + Filtres (Hauteur ultra-compacte)
           ========================================================================= */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          {/* Onglets segmentés sans icônes décoratives */}
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
            {(
              [
                { key: "tous", label: "Tous", count: counts.tous },
                { key: "directeur", label: "Directeurs", count: counts.directeur },
                { key: "sous_directeur", label: "Sous-directeurs", count: counts.sous_directeur },
                { key: "chef", label: "Chefs", count: counts.chef },
                { key: "employe", label: "Employés", count: counts.employe },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                  activeTab === t.key
                    ? "bg-foreground text-background shadow-2xs"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "rounded px-1 text-[10px]",
                    activeTab === t.key ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Recherche & Filtre Fournisseur */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-56 sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Rechercher…"
                className="h-7.5 w-full rounded-lg border border-border/80 bg-card pl-7 pr-6 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </div>

            {/* Menu filtre Fournisseur */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setFournisseurDropdownOpen(!fournisseurDropdownOpen)}
                className={cn(
                  "flex h-7.5 items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 text-xs font-medium text-foreground shadow-2xs transition-all hover:bg-accent/40",
                  fournisseurFilter !== "all" && "border-primary/40 bg-primary/[0.04] text-foreground font-semibold",
                )}
              >
                <span className="max-w-[130px] truncate text-[11px]">
                  {fournisseurFilter === "all"
                    ? "Tous fournisseurs"
                    : (fournisseurList.find((f) => String(f.id) === fournisseurFilter)?.nom ?? "Fournisseur")}
                </span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>

              {fournisseurDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-40 w-60 rounded-xl border border-border/80 bg-card p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => handleFournisseurChange("all")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors",
                      fournisseurFilter === "all"
                        ? "bg-accent font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <span>Tous les fournisseurs</span>
                    {fournisseurFilter === "all" && <Check className="size-3 text-primary" />}
                  </button>

                  <div className="my-1 h-px bg-border/60" />

                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {fournisseurList.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFournisseurChange(String(f.id))}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors",
                          fournisseurFilter === String(f.id)
                            ? "bg-accent font-semibold text-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{f.nom}</span>
                        {fournisseurFilter === String(f.id) && <Check className="size-3 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. Tableau Ultra-Compact (10 lignes max, 0 défilement)
           ========================================================================= */}
        <div className="flex-1 min-h-0 rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col justify-between">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-2 px-3 font-semibold">Nom & Prénom</th>
                  <th className="py-2 px-3 font-semibold">Poste / Rôle</th>
                  <th className="py-2 px-3 font-semibold">Niveau</th>
                  <th className="py-2 px-3 font-semibold">Fournisseur</th>
                  <th className="py-2 px-3 font-semibold">Téléphone</th>
                  <th className="py-2 px-3 font-semibold">Email</th>
                  <th className="py-2 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      Chargement des interlocuteurs…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      Aucun interlocuteur trouvé dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  items.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-accent/40 transition-colors h-9"
                    >
                      {/* Nom */}
                      <td className="py-1.5 px-3 font-semibold text-foreground whitespace-nowrap">
                        {contact.nom}
                      </td>

                      {/* Poste */}
                      <td className="py-1.5 px-3 text-muted-foreground whitespace-nowrap max-w-[200px] truncate">
                        {contact.poste}
                      </td>

                      {/* Niveau hiérarchique */}
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-semibold",
                            contact.role_level === "directeur" && "bg-purple-500/15 text-purple-700 dark:text-purple-300",
                            contact.role_level === "sous_directeur" && "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                            contact.role_level === "chef" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                            contact.role_level === "employe" && "bg-slate-500/15 text-slate-700 dark:text-slate-300",
                          )}
                        >
                          {ROLE_LABELS[contact.role_level]}
                        </span>
                      </td>

                      {/* Fournisseur */}
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-1.5 py-0.2 text-[10px] font-medium text-foreground">
                          {contact.fournisseur_nom || contact.fournisseur_code || "—"}
                        </span>
                      </td>

                      {/* Téléphone */}
                      <td className="py-1.5 px-3 font-mono text-[11px] text-foreground whitespace-nowrap">
                        <a href={`tel:${contact.telephone}`} className="hover:underline">
                          {contact.telephone}
                        </a>
                      </td>

                      {/* Email */}
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`mailto:${contact.email}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(contact.id, contact.email)}
                            title="Copier l'email"
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedId === contact.id ? (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                Copié
                              </span>
                            ) : (
                              <Copy className="size-2.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(contact)}
                            className="rounded-md px-2 py-0.5 text-[11px] font-medium text-foreground border border-border/60 hover:bg-accent transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(contact.id)}
                            className="rounded-md px-2 py-0.5 text-[11px] font-medium text-rose-600 border border-border/60 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* =========================================================================
              4. Pagination Compacte (Moindre hauteur, 10 items max par page)
             ========================================================================= */}
          <div className="flex shrink-0 items-center justify-between border-t border-border/60 bg-muted/15 px-3 py-1.5 text-xs text-muted-foreground">
            <div className="text-[11px]">
              Affichage de{" "}
              <span className="font-semibold text-foreground">
                {total === 0 ? 0 : (page - 1) * 10 + 1}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-foreground">
                {Math.min(page * 10, total)}
              </span>{" "}
              sur <span className="font-semibold text-foreground">{total}</span> contacts
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] mr-1">
                Page {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-6.5 items-center gap-1 rounded-md border border-border/80 bg-card px-2 text-[11px] font-medium text-foreground shadow-2xs transition-all hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-3" /> Précédent
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-6.5 items-center gap-1 rounded-md border border-border/80 bg-card px-2 text-[11px] font-medium text-foreground shadow-2xs transition-all hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. Modale Création / Édition
           ========================================================================= */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingContact ? "Modifier l'interlocuteur" : "Ajouter un interlocuteur"}
        >
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Entreprise Fournisseur">
              <Select
                value={form.fournisseur_id}
                onChange={(e) => setForm({ ...form, fournisseur_id: e.target.value })}
                required
              >
                <option value="" disabled>
                  Sélectionner une entreprise…
                </option>
                {fournisseurList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom} ({f.code})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Niveau hiérarchique">
              <Select
                value={form.role_level}
                onChange={(e) => setForm({ ...form, role_level: e.target.value as RoleLevel })}
                required
              >
                <option value="directeur">Directeur</option>
                <option value="sous_directeur">Sous-directeur</option>
                <option value="chef">Chef de service</option>
                <option value="employe">Employé</option>
              </Select>
            </Field>

            <Field label="Nom complet">
              <TextInput
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex: Salem Dahmani"
                required
              />
            </Field>

            <Field label="Poste exact">
              <TextInput
                value={form.poste}
                onChange={(e) => setForm({ ...form, poste: e.target.value })}
                placeholder="Ex: Directeur Commercial, Responsable Achats…"
                required
              />
            </Field>

            <Field label="Numéro de téléphone">
              <TextInput
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="+216 71 850 100"
                required
              />
            </Field>

            <Field label="Adresse email">
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-lg text-xs h-8"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-3.5 h-8"
              >
                {saving ? "Enregistrement…" : editingContact ? "Mettre à jour" : "Ajouter"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Page>
  )
}
