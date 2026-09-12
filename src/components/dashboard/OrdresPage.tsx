import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Ban,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Factory,
  Package,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
  X,
  XCircle,
} from "lucide-react"
import { articlesApi, lignesApi, ordresApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import { useWebSocket } from "@/hooks/useWebSocket"
import type {
  Article,
  ContexteLigne,
  DispositionPreemption,
  Faisabilite,
  LigneProduction,
  OrdreFabrication,
  StatutOF,
} from "@/lib/types"
import { STATUTS_OF } from "@/lib/types"
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Page,
  Select,
  TextInput,
} from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

type TabFilter = "tous" | "en_cours" | "a_faire" | "termines" | "retard"

/** Date simple lisible par tous : « 15 juillet » */
function formatDateSimple(iso: string | null): string {
  if (!iso) return "Pas de date fixée"
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}

/** Créneau simple : « Aujourd'hui 14:30 » */
function formatHeureSimple(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Reste à produire en nombre simple */
function resteAProduire(of: OrdreFabrication): number {
  return Math.max(
    0,
    Number(of.quantite_planifiee) - Number(of.quantite_bonne) - Number(of.quantite_rejetee),
  )
}

/** Est-ce en retard par rapport à l'échéance ? */
function estEnRetard(of: OrdreFabrication): boolean {
  if (!of.date_fin_prevue || !of.date_echeance) return false
  const fin = new Date(of.date_fin_prevue)
  const jourFin = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
  const [y, m, d] = of.date_echeance.slice(0, 10).split("-").map(Number)
  const jourEcheance = new Date(y, m - 1, d)
  return jourFin.getTime() > jourEcheance.getTime()
}

export function OrdresPage({ onAskNova }: { onAskNova?: (message: string) => void }) {
  const { data, loading, error, reload, setError } = useResource(() => ordresApi.list(), [])
  const articles = useResource(() => articlesApi.list(), [])
  const lignes = useResource(() => lignesApi.list(), [])

  // Modale de gestion & détails de l'OF
  const [selectedOf, setSelectedOf] = useState<OrdreFabrication | null>(null)
  const [stopOf, setStopOf] = useState<OrdreFabrication | null>(null)
  const [stoppingId, setStoppingId] = useState<number | null>(null)

  // Onglet actif : Tout le monde comprend 4 onglets simples
  const [activeTab, setActiveTab] = useState<TabFilter>("tous")
  const [ligneFilter, setLigneFilter] = useState<string>("all")
  const [ligneDropdownOpen, setLigneDropdownOpen] = useState(false)
  const ligneDropdownRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState("")

  // Fermer le menu déroulant de ligne au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ligneDropdownRef.current && !ligneDropdownRef.current.contains(e.target as Node)) {
        setLigneDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Temps réel WebSocket
  const { lastMessage } = useWebSocket()
  useEffect(() => {
    if (lastMessage?.type !== "ordres_update") return
    void reload()
  }, [lastMessage, reload])

  // Animation douce quand un ordre est mis à jour
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set())
  const prevRowsRef = useRef<Map<number, string>>(new Map())
  useEffect(() => {
    if (!data) return
    const empreinte = (o: OrdreFabrication) =>
      `${o.date_debut_prevue}|${o.date_fin_prevue}|${o.date_echeance}|${o.ligne_production_id}|${o.statut}`
    const prev = prevRowsRef.current
    const next = new Map(data.map((o) => [o.id, empreinte(o)]))
    prevRowsRef.current = next
    if (prev.size === 0) return
    const changes = new Set<number>()
    for (const [id, e] of next) {
      const avant = prev.get(id)
      if (avant === undefined || avant !== e) changes.add(id)
    }
    if (changes.size === 0) return
    setChangedIds(changes)
    const timer = window.setTimeout(() => setChangedIds(new Set()), 2600)
    return () => window.clearTimeout(timer)
  }, [data])

  // Création d'un nouvel ordre
  const [openCreate, setOpenCreate] = useState(false)
  const [articleId, setArticleId] = useState("")
  const [quantite, setQuantite] = useState("")
  const [faisa, setFaisa] = useState<Faisabilite | null>(null)
  const [checking, setChecking] = useState(false)
  const [echeance, setEcheance] = useState("")
  const [ligneId, setLigneId] = useState("")
  const [creating, setCreating] = useState(false)

  function handleOpenCreate() {
    setArticleId("")
    setQuantite("")
    setFaisa(null)
    setEcheance("")
    setLigneId("")
    setOpenCreate(true)
  }

  async function verifierFaisabilite() {
    setError(null)
    setFaisa(null)
    if (!articleId || !quantite || Number(quantite) <= 0) {
      setError("Veuillez choisir un médicament et indiquer la quantité à fabriquer.")
      return
    }
    setChecking(true)
    try {
      setFaisa(await ordresApi.faisabilite(Number(articleId), Number(quantite)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la vérification")
    } finally {
      setChecking(false)
    }
  }

  async function creerOrdre() {
    setCreating(true)
    try {
      await ordresApi.create({
        article_id: Number(articleId),
        quantite: Number(quantite),
        date_echeance: echeance || null,
        ligne_production_id: ligneId ? Number(ligneId) : null,
      })
      setOpenCreate(false)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création")
    } finally {
      setCreating(false)
    }
  }

  async function changerStatut(of: OrdreFabrication, statut: StatutOF) {
    try {
      await ordresApi.setStatut(of.id, statut)
      if (selectedOf?.id === of.id) {
        setSelectedOf({ ...selectedOf, statut })
      }
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du changement de statut")
    }
  }

  async function changerLigne(of: OrdreFabrication, ligne: string) {
    try {
      const newLineId = ligne ? Number(ligne) : null
      await ordresApi.setLigne(of.id, newLineId)
      if (selectedOf?.id === of.id) {
        setSelectedOf({ ...selectedOf, ligne_production_id: newLineId })
      }
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'affectation de ligne")
    }
  }

  // Lancement
  const [busyOf, setBusyOf] = useState<OrdreFabrication | null>(null)
  const [busyCtx, setBusyCtx] = useState<ContexteLigne | null>(null)
  const [chooseLineOf, setChooseLineOf] = useState<OrdreFabrication | null>(null)
  const [launchingId, setLaunchingId] = useState<number | null>(null)

  async function lancerOrdre(of: OrdreFabrication, explicitLigneId?: number) {
    const targetLigneId = explicitLigneId ?? of.ligne_production_id
    if (targetLigneId == null) {
      setChooseLineOf(of)
      return
    }
    setLaunchingId(of.id)
    setError(null)
    try {
      if (explicitLigneId != null && explicitLigneId !== of.ligne_production_id) {
        await ordresApi.setLigne(of.id, explicitLigneId)
      }
      await ordresApi.lancer(of.id)
      setChooseLineOf(null)
      void reload()
    } catch (e) {
      try {
        const ctx = await ordresApi.contexteLigne(targetLigneId)
        setBusyOf(of)
        setBusyCtx(ctx)
        setChooseLineOf(null)
      } catch {
        setError(e instanceof Error ? e.message : "Erreur")
      }
    } finally {
      setLaunchingId(null)
    }
  }

  async function arreterOrdre(of: OrdreFabrication, nouveauStatut: "PLANIFIE" | "TERMINE") {
    setStoppingId(of.id)
    setError(null)
    try {
      await ordresApi.setStatut(of.id, nouveauStatut)
      setStopOf(null)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'arrêt de l'ordre")
    } finally {
      setStoppingId(null)
    }
  }

  async function preempterEtLancer(disposition: DispositionPreemption) {
    if (!busyOf) return
    setLaunchingId(busyOf.id)
    try {
      await ordresApi.lancer(busyOf.id, disposition)
      setBusyOf(null)
      setBusyCtx(null)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setLaunchingId(null)
    }
  }

  async function mettreEnFile() {
    if (!busyOf || busyOf.ligne_production_id == null) return
    setLaunchingId(busyOf.id)
    try {
      await ordresApi.mettreEnFile(busyOf.id, busyOf.ligne_production_id)
      setBusyOf(null)
      setBusyCtx(null)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setLaunchingId(null)
    }
  }

  function annulerOrdre(of: OrdreFabrication) {
    if (!confirm(`Voulez-vous vraiment annuler l'ordre ${of.numero} ?`)) return
    void changerStatut(of, "ANNULE")
  }

  function demanderNova() {
    const article = articleList.find((a) => String(a.id) === articleId)
    const ligne = ligneList.find((l) => String(l.id) === ligneId)
    const parts = [
      article
        ? `Crée un ordre de fabrication pour ${article.designation}`
        : "Aide-moi à créer un ordre de fabrication",
      quantite ? `pour une quantité de ${quantite} unités` : "",
      echeance ? `avec une échéance au ${echeance}` : "",
      ligne ? `sur la ligne ${ligne.code}` : "recommande-moi la meilleure ligne disponible",
      ". Vérifie la disponibilité des matières et demande ma confirmation.",
    ]
    onAskNova?.(parts.filter(Boolean).join(" "))
    setOpenCreate(false)
  }

  const rows = data ?? []
  const articleList: Article[] = articles.data ?? []
  const ligneList: LigneProduction[] = lignes.data ?? []

  const ligneMap = useMemo(() => {
    const map = new Map<number, LigneProduction>()
    for (const l of ligneList) map.set(l.id, l)
    return map
  }, [ligneList])

  // Compteurs simples pour les onglets
  const counts = useMemo(() => {
    const tous = rows.length
    const enCours = rows.filter((o) => o.statut === "EN_COURS").length
    const aFaire = rows.filter((o) => o.statut === "PLANIFIE" || o.statut === "BROUILLON").length
    const termines = rows.filter((o) => o.statut === "TERMINE").length
    const retard = rows.filter((o) => estEnRetard(o)).length
    return { tous, enCours, aFaire, termines, retard }
  }, [rows])

  // Filtrage ultra-simple
  const filteredRows = useMemo(() => {
    return rows.filter((of) => {
      // Filtre onglet
      if (activeTab === "en_cours" && of.statut !== "EN_COURS") return false
      if (activeTab === "a_faire" && of.statut !== "PLANIFIE" && of.statut !== "BROUILLON")
        return false
      if (activeTab === "termines" && of.statut !== "TERMINE") return false
      if (activeTab === "retard" && !estEnRetard(of)) return false

      // Filtre ligne
      if (ligneFilter !== "all") {
        if (ligneFilter === "none" && of.ligne_production_id !== null) return false
        if (ligneFilter !== "none" && String(of.ligne_production_id) !== ligneFilter) return false
      }

      // Recherche simple par nom de médicament ou n° OF
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = of.designation_article.toLowerCase().includes(q)
        const matchNum = of.numero.toLowerCase().includes(q)
        const matchCode = of.code_article.toLowerCase().includes(q)
        if (!matchName && !matchNum && !matchCode) return false
      }

      return true
    })
  }, [rows, activeTab, ligneFilter, search])

  return (
    <Page fullHeight className="bg-background">
      <div className="flex h-full w-full min-w-0 flex-col">
        {/* =========================================================================
            1. En-tête limpide et épuré (Style Nova & Sidebar)
           ========================================================================= */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Ordres de Fabrication
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length} {rows.length > 1 ? "médicaments programmés" : "médicament programmé"}{" "}
              pour la production.
            </p>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="h-10 gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="size-4.5" /> Créer un ordre
          </Button>
        </header>

        <ErrorBanner message={error ?? lignes.error} />

        {/* =========================================================================
            2. Barre de Navigation par Onglets (Clair et intuitif)
           ========================================================================= */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Onglets simples */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-border/80 bg-card p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("tous")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeTab === "tous"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              Tous
              <span className="rounded-md bg-muted/60 px-1.5 py-0.2 text-[11px]">
                {counts.tous}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("en_cours")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeTab === "en_cours"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              En cours
              <span className="rounded-md bg-muted/60 px-1.5 py-0.2 text-[11px]">
                {counts.enCours}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("a_faire")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeTab === "a_faire"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              À fabriquer
              <span className="rounded-md bg-muted/60 px-1.5 py-0.2 text-[11px]">
                {counts.aFaire}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("termines")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeTab === "termines"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              Terminés
              <span className="rounded-md bg-muted/60 px-1.5 py-0.2 text-[11px]">
                {counts.termines}
              </span>
            </button>

            {counts.retard > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("retard")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  activeTab === "retard"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-600 hover:bg-rose-500/10",
                )}
              >
                <AlertTriangle className="size-3" />
                En retard
                <span className="rounded-md bg-rose-500/20 px-1.5 py-0.2 text-[11px]">
                  {counts.retard}
                </span>
              </button>
            )}
          </div>

          {/* Recherche & Filtre de Ligne */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un médicament…"
                className="h-9 w-full rounded-xl border border-border/80 bg-card pl-8.5 pr-8 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Menu Déroulant Élégant pour Filtrer par Ligne */}
            <div className="relative" ref={ligneDropdownRef}>
              <button
                type="button"
                onClick={() => setLigneDropdownOpen(!ligneDropdownOpen)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-xs font-medium text-foreground shadow-2xs transition-all",
                  "hover:bg-accent/40 hover:border-border",
                  ligneDropdownOpen && "border-primary/50 ring-1 ring-primary/20",
                  ligneFilter !== "all" && "border-primary/40 bg-primary/[0.04] text-foreground font-semibold",
                )}
              >
                <Factory className="size-3.5 text-muted-foreground" />
                <span className="max-w-[150px] truncate">
                  {ligneFilter === "all"
                    ? "Toutes les lignes"
                    : ligneFilter === "none"
                      ? "Sans ligne"
                      : (ligneMap.get(Number(ligneFilter))?.code ?? "Ligne")}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3 text-muted-foreground transition-transform duration-200",
                    ligneDropdownOpen && "rotate-180",
                  )}
                />
              </button>

              {ligneDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-64 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Filtrer par ligne
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLigneFilter("all")
                      setLigneDropdownOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors",
                      ligneFilter === "all"
                        ? "bg-accent font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Factory className="size-3.5" />
                      Toutes les lignes
                    </span>
                    {ligneFilter === "all" && <Check className="size-3.5 text-primary" />}
                  </button>

                  <div className="my-1 h-px bg-border/60" />

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {ligneList.map((l) => {
                      const isSelected = ligneFilter === String(l.id)
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setLigneFilter(String(l.id))
                            setLigneDropdownOpen(false)
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors",
                            isSelected
                              ? "bg-accent font-semibold text-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                              {l.code}
                            </span>
                            <span className="truncate text-foreground font-medium">
                              {l.designation}
                            </span>
                          </div>
                          {isSelected && <Check className="size-3.5 shrink-0 text-primary ml-2" />}
                        </button>
                      )
                    })}
                  </div>

                  <div className="my-1 h-px bg-border/60" />

                  <button
                    type="button"
                    onClick={() => {
                      setLigneFilter("none")
                      setLigneDropdownOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors",
                      ligneFilter === "none"
                        ? "bg-accent font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <span className="text-muted-foreground">Sans ligne assignée</span>
                    {ligneFilter === "none" && <Check className="size-3.5 text-primary" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. Liste des Cartes d'Ordres (Propre, Compréhensible par tous)
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto pr-1 pb-8 space-y-3">
          {loading && rows.length === 0 ? (
            <EmptyState message="Chargement des ordres de fabrication…" />
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40">
              <Package className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                Aucun ordre dans cette catégorie
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search
                  ? "Aucun résultat ne correspond à votre recherche."
                  : "Cliquez sur « Créer un ordre » pour programmer une nouvelle fabrication."}
              </p>
            </div>
          ) : (
            filteredRows.map((of) => {
              const ligne = of.ligne_production_id ? ligneMap.get(of.ligne_production_id) : null
              const isLate = estEnRetard(of)
              const quantiteCible = Number(of.quantite_planifiee) || 1
              const quantiteFaite = Number(of.quantite_bonne) + Number(of.quantite_rejetee)
              const pct = Math.min(100, Math.round((quantiteFaite / quantiteCible) * 100))
              const restant = resteAProduire(of)

              const isEnCours = of.statut === "EN_COURS"
              const isTermine = of.statut === "TERMINE"
              const isPret = of.statut === "PLANIFIE" || of.statut === "BROUILLON"

              return (
                <div
                  key={of.id}
                  className={cn(
                    "relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5",
                    "rounded-2xl border bg-card transition-all duration-200 shadow-xs",
                    isEnCours
                      ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                      : isLate
                        ? "border-rose-500/30"
                        : "border-border/80 hover:border-border hover:shadow-sm",
                    changedIds.has(of.id) && "ring-2 ring-amber-500/50",
                  )}
                >
                  {/* BLOC 1 : Médicament, Statut et Ligne */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Statut & Ligne */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isEnCours && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                          En cours de fabrication
                        </span>
                      )}

                      {isPret && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                          <Clock className="size-3" />
                          Prêt à démarrer
                        </span>
                      )}

                      {isTermine && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          <Check className="size-3 text-emerald-500" />
                          Terminé
                        </span>
                      )}

                      {of.statut === "ANNULE" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-600">
                          Annulé
                        </span>
                      )}

                      {isLate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="size-3" />
                          En retard
                        </span>
                      )}

                      {/* Ligne */}
                      <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <Factory className="size-3 text-muted-foreground" />
                        {ligne ? ligne.code : "Aucune ligne assignée"}
                      </span>

                      {/* N° d'ordre */}
                      <span className="text-xs font-mono text-muted-foreground">
                        {of.numero}
                      </span>
                    </div>

                    {/* Nom du médicament en grand et en gras */}
                    <h2
                      onClick={() => setSelectedOf(of)}
                      className="cursor-pointer text-base sm:text-lg font-bold tracking-tight text-foreground hover:text-primary transition-colors"
                    >
                      {of.designation_article}
                    </h2>

                    {/* Échéance simple */}
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      Échéance : <strong className="font-medium text-foreground">{formatDateSimple(of.date_echeance)}</strong>
                      {of.date_debut_prevue && (
                        <span className="text-muted-foreground/70">
                          · Créneau : {formatHeureSimple(of.date_debut_prevue)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* BLOC 2 : Quantité & Barre de progression */}
                  <div className="flex shrink-0 flex-col gap-1.5 sm:min-w-[240px] md:min-w-[280px]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Quantité</span>
                      <span className="text-sm font-bold text-foreground">
                        {Number(of.quantite_planifiee).toLocaleString("fr-FR")} {of.unite}
                      </span>
                    </div>

                    {/* Barre de progression simple */}
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isTermine
                            ? "bg-emerald-500"
                            : isEnCours
                              ? "bg-emerald-500"
                              : "bg-sky-500",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{pct}% réalisé</span>
                      {!isTermine && restant > 0 && (
                        <span>Reste {restant.toLocaleString("fr-FR")}</span>
                      )}
                    </div>
                  </div>

                  {/* BLOC 3 : Boutons d'Action (Clair et net) */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0">
                    {/* Bouton Démarrer pour ordres prêts */}
                    {isPret && (
                      <button
                        type="button"
                        onClick={() => lancerOrdre(of)}
                        disabled={launchingId === of.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Play className="size-3.5 fill-current" />
                        <span>{launchingId === of.id ? "Démarrage…" : "Démarrer"}</span>
                      </button>
                    )}

                    {/* Bouton Arrêter pour ordres en cours de fabrication */}
                    {isEnCours && (
                      <button
                        type="button"
                        onClick={() => setStopOf(of)}
                        disabled={stoppingId === of.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-2xs hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Square className="size-3 fill-current" />
                        <span>{stoppingId === of.id ? "Arrêt…" : "Arrêter"}</span>
                      </button>
                    )}

                    {/* Bouton Détails & Suivi */}
                    <button
                      type="button"
                      onClick={() => setSelectedOf(of)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-accent active:scale-95 transition-all"
                    >
                      <span>Détails</span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* =========================================================================
            4. Modale Détails & Gestion (Largeur étendue, zéro scroll, 2 colonnes)
           ========================================================================= */}
        <Modal
          open={selectedOf !== null}
          onClose={() => setSelectedOf(null)}
          title={`Détails de fabrication — ${selectedOf?.numero ?? ""}`}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between w-full">
              {selectedOf && selectedOf.statut !== "ANNULE" && selectedOf.statut !== "TERMINE" ? (
                <button
                  type="button"
                  onClick={() => {
                    annulerOrdre(selectedOf)
                    setSelectedOf(null)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
                >
                  <Ban className="size-3.5" /> Annuler cet ordre
                </button>
              ) : (
                <div />
              )}
              <Button
                onClick={() => setSelectedOf(null)}
                className="h-9 rounded-xl px-5 text-xs font-semibold"
              >
                Fermer
              </Button>
            </div>
          }
        >
          {selectedOf && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* COLONNE GAUCHE (7 cols) : Infos produit, Ligne, Statut, Quantité */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Carte produit */}
                <div className="rounded-2xl border border-border/80 bg-muted/25 p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Médicament programmé
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5">
                    {selectedOf.designation_article}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                      Code : {selectedOf.code_article}
                    </span>
                    {selectedOf.numero_lot_produit && (
                      <span className="rounded-md bg-muted px-2 py-0.5">
                        Lot : {selectedOf.numero_lot_produit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sélecteurs : Ligne & Statut */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/80 bg-card p-3">
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Ligne de fabrication
                    </label>
                    <select
                      value={selectedOf.ligne_production_id ?? ""}
                      onChange={(e) => changerLigne(selectedOf, e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">— Aucune ligne —</option>
                      {ligneList
                        .filter((l) => l.actif)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code} · {l.designation}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card p-3">
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Statut de l'ordre
                    </label>
                    <select
                      value={selectedOf.statut}
                      onChange={(e) => changerStatut(selectedOf, e.target.value as StatutOF)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-ring"
                    >
                      {STATUTS_OF.map((s) => (
                        <option key={s} value={s}>
                          {s === "EN_COURS"
                            ? "En cours de fabrication"
                            : s === "PLANIFIE"
                              ? "Planifié (prêt)"
                              : s === "TERMINE"
                                ? "Terminé"
                                : s === "BROUILLON"
                                  ? "Brouillon"
                                  : "Annulé"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Métriques : Quantité & Échéance */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/70 bg-card p-3">
                    <p className="text-xs text-muted-foreground">Quantité totale</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {Number(selectedOf.quantite_planifiee).toLocaleString("fr-FR")} {selectedOf.unite}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3">
                    <p className="text-xs text-muted-foreground">Échéance client</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {formatDateSimple(selectedOf.date_echeance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* COLONNE DROITE (5 cols) : Traçabilité Matières FEFO */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="flex-1 rounded-2xl border border-border/80 bg-card p-4 flex flex-col">
                  <h4 className="text-xs font-semibold text-foreground mb-0.5">
                    Matières premières utilisées
                  </h4>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Traçabilité FEFO des lots consommés
                  </p>

                  {selectedOf.consommations.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                      <Package className="size-8 text-muted-foreground/40 mb-1.5" />
                      Aucune matière enregistrée pour cet ordre.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-border/70 flex-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                            <th className="px-3 py-2 text-left font-medium">Matière</th>
                            <th className="px-3 py-2 text-left font-medium">N° Lot</th>
                            <th className="px-3 py-2 text-right font-medium">Quantité</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-mono">
                          {selectedOf.consommations.map((c, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-semibold text-foreground">{c.code_mp}</td>
                              <td className="px-3 py-2 text-muted-foreground">{c.numero_lot}</td>
                              <td className="px-3 py-2 text-right font-bold text-foreground">
                                {Number(c.quantite_consommee).toLocaleString("fr-FR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* =========================================================================
            5. Modale Nouvel Ordre (Largeur étendue, 2 colonnes, zéro scroll)
           ========================================================================= */}
        <Modal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          title="Créer un ordre de fabrication"
          maxWidth="max-w-3xl"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setOpenCreate(false)}
                className="h-9 rounded-xl px-4 text-xs"
              >
                Annuler
              </Button>
              {onAskNova && (
                <Button
                  variant="outline"
                  onClick={demanderNova}
                  disabled={!articleId || !quantite}
                  className="h-9 gap-1.5 rounded-xl border-purple-500/30 bg-purple-500/10 px-4 text-xs font-semibold text-purple-600 hover:bg-purple-500/20 dark:text-purple-400"
                >
                  <Sparkles className="size-3.5" /> Créer avec Nova
                </Button>
              )}
              {faisa?.faisable ? (
                <Button
                  onClick={creerOrdre}
                  disabled={creating}
                  className="h-9 gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  <CheckCircle2 className="size-3.5" />
                  {creating ? "Création…" : "Confirmer et lancer l'ordre"}
                </Button>
              ) : (
                <Button
                  onClick={verifierFaisabilite}
                  disabled={checking}
                  className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  {checking ? "Vérification…" : "Vérifier la disponibilité"}
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            {/* Formulaire 2 colonnes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Médicament à fabriquer">
                <Select
                  value={articleId}
                  onChange={(e) => {
                    setArticleId(e.target.value)
                    setFaisa(null)
                  }}
                  className="rounded-xl text-xs"
                >
                  <option value="">— Choisir un médicament —</option>
                  {articleList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.designation} ({a.code})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Quantité à produire">
                <TextInput
                  type="number"
                  step="any"
                  placeholder="Exemple : 5000"
                  value={quantite}
                  onChange={(e) => {
                    setQuantite(e.target.value)
                    setFaisa(null)
                  }}
                  className="rounded-xl text-xs font-mono"
                />
              </Field>

              <Field label="Ligne de production (optionnel)">
                <Select
                  value={ligneId}
                  onChange={(e) => setLigneId(e.target.value)}
                  className="rounded-xl text-xs"
                >
                  <option value="">— Choisir une ligne —</option>
                  {ligneList
                    .filter((l) => l.actif)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} · {l.designation}
                      </option>
                    ))}
                </Select>
              </Field>

              <Field label="Date d'échéance demandée">
                <TextInput
                  type="date"
                  value={echeance}
                  onChange={(e) => setEcheance(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </Field>
            </div>

            {/* Faisabilité MP si vérifiée */}
            {faisa && (
              <div className="rounded-2xl border border-border/80 bg-card p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      Disponibilité des matières premières (FEFO)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Vérification automatique des stocks magasin
                    </p>
                  </div>
                  {faisa.faisable ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Matières disponibles
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <XCircle className="size-3.5" /> Stock insuffisant
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-border/60">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Matière</th>
                        <th className="px-3 py-2 text-right font-medium">Requis</th>
                        <th className="px-3 py-2 text-right font-medium">Disponible</th>
                        <th className="px-3 py-2 text-right font-medium">État</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                      {faisa.besoins.map((b) => (
                        <tr key={b.matiere_premiere_id} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-bold text-foreground">{b.code}</td>
                          <td className="px-3 py-2 text-right">
                            {Number(b.quantite_requise).toLocaleString("fr-FR")} {b.unite}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-foreground">
                            {Number(b.quantite_disponible).toLocaleString("fr-FR")}
                          </td>
                          <td className="px-3 py-2 text-right font-sans">
                            {b.suffisant ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                ✓ Suffisant
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                                Manque {Number(b.manquant).toLocaleString("fr-FR")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* =========================================================================
            6. Modale Ligne Occupée (Préemption / File d'attente)
           ========================================================================= */}
        <Modal
          open={busyOf !== null}
          onClose={() => {
            setBusyOf(null)
            setBusyCtx(null)
          }}
          title="Ligne déjà occupée"
          footer={
            <Button
              variant="outline"
              onClick={() => {
                setBusyOf(null)
                setBusyCtx(null)
              }}
              className="rounded-xl text-xs"
            >
              Fermer
            </Button>
          }
        >
          {busyOf && busyCtx && (
            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Une fabrication est déjà en cours sur cette ligne. Que souhaitez-vous faire pour{" "}
                <strong className="text-foreground">{busyOf.designation_article}</strong> ?
              </p>

              <div className="space-y-2.5 rounded-xl border border-border/80 bg-card p-3">
                <p className="font-semibold text-foreground">Option 1 : Démarrer maintenant</p>
                <p className="text-muted-foreground">
                  Met en pause la fabrication actuelle pour lancer celle-ci immédiatement.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    onClick={() => preempterEtLancer("requeue")}
                    disabled={launchingId === busyOf.id}
                    className="rounded-lg text-xs"
                  >
                    Mettre en pause et démarrer
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/80 bg-card p-3">
                <p className="font-semibold text-foreground">Option 2 : Mettre en attente</p>
                <p className="text-muted-foreground">
                  Cet ordre démarrera automatiquement dès que la ligne sera libre.
                </p>
                <Button
                  variant="outline"
                  onClick={mettreEnFile}
                  disabled={launchingId === busyOf.id}
                  className="mt-1 rounded-lg text-xs"
                >
                  Mettre en file d'attente
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* =========================================================================
            7. Modale Choix de la Ligne avant Lancement
           ========================================================================= */}
        <Modal
          open={chooseLineOf !== null}
          onClose={() => setChooseLineOf(null)}
          title="Choisir une ligne de fabrication"
          maxWidth="max-w-2xl"
          footer={
            <Button
              variant="outline"
              onClick={() => setChooseLineOf(null)}
              className="rounded-xl text-xs"
            >
              Annuler
            </Button>
          }
        >
          {chooseLineOf && (
            <div className="space-y-4 text-xs">
              <div>
                <p className="text-muted-foreground">
                  Sur quelle ligne souhaitez-vous lancer la fabrication de :
                </p>
                <p className="mt-1 text-base font-bold text-foreground">
                  {chooseLineOf.designation_article}
                </p>
                <p className="font-mono text-muted-foreground mt-0.5">
                  {chooseLineOf.numero} · Quantité : {Number(chooseLineOf.quantite_planifiee).toLocaleString("fr-FR")} {chooseLineOf.unite}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {ligneList.filter((l) => l.actif).map((ligne) => (
                  <button
                    key={ligne.id}
                    type="button"
                    onClick={() => lancerOrdre(chooseLineOf, ligne.id)}
                    disabled={launchingId === chooseLineOf.id}
                    className="group flex w-full items-center justify-between rounded-xl border border-border/80 bg-card p-3.5 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/[0.04] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-foreground group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        <Factory className="size-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{ligne.code}</span>
                          <span className="text-xs text-muted-foreground">· {ligne.designation}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Ligne de production active
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                      {launchingId === chooseLineOf.id ? "Démarrage…" : "Démarrer ici"}
                      <ChevronRight className="size-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>

        {/* =========================================================================
            8. Modale Arrêt / Pause de Fabrication
           ========================================================================= */}
        <Modal
          open={stopOf !== null}
          onClose={() => setStopOf(null)}
          title="Arrêter la production"
          maxWidth="max-w-lg"
          footer={
            <Button
              variant="outline"
              onClick={() => setStopOf(null)}
              className="rounded-xl text-xs"
            >
              Annuler
            </Button>
          }
        >
          {stopOf && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-border/80 bg-muted/25 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ordre en cours de fabrication
                </span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {stopOf.designation_article}
                </p>
                <p className="font-mono text-muted-foreground mt-0.5">
                  {stopOf.numero} · Ligne : {stopOf.ligne_production_id ? ligneMap.get(stopOf.ligne_production_id)?.code : "—"}
                </p>
              </div>

              <p className="text-muted-foreground">
                Que souhaitez-vous faire pour cet ordre de fabrication ?
              </p>

              <div className="space-y-2.5">
                {/* Option 1 : Mettre en pause */}
                <button
                  type="button"
                  onClick={() => arreterOrdre(stopOf, "PLANIFIE")}
                  disabled={stoppingId === stopOf.id}
                  className="group flex w-full flex-col gap-1 rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:border-amber-500/50 hover:bg-amber-500/[0.04] active:scale-[0.99]"
                >
                  <span className="font-bold text-sm text-foreground flex items-center gap-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    <span className="size-2 rounded-full bg-amber-500" />
                    Mettre en pause (conserver l'avancement)
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Arrête la production sur la machine. Les {Number(stopOf.quantite_bonne).toLocaleString("fr-FR")} {stopOf.unite} déjà produites sont conservées et l'ordre pourra être redémarré plus tard.
                  </p>
                </button>

                {/* Option 2 : Clôturer et terminer */}
                <button
                  type="button"
                  onClick={() => arreterOrdre(stopOf, "TERMINE")}
                  disabled={stoppingId === stopOf.id}
                  className="group flex w-full flex-col gap-1 rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/[0.04] active:scale-[0.99]"
                >
                  <span className="font-bold text-sm text-foreground flex items-center gap-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <Check className="size-3.5 text-emerald-500" />
                    Terminer et clôturer l'ordre
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Déclare ce lot comme complètement achevé. L'ordre passera au statut « Terminé » et libérera la ligne de production.
                  </p>
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Page>
  )
}
