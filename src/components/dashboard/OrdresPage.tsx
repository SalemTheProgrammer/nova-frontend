import { Fragment, useEffect, useRef, useState } from "react"
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  Plus,
  Sparkles,
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
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Page,
  Select,
  Table,
  Td,
  Th,
  TextInput,
} from "@/components/dashboard/primitives"

const PAGE_SIZE = 10

const statutTone: Record<StatutOF, "neutral" | "blue" | "amber" | "green" | "red"> = {
  BROUILLON: "neutral",
  PLANIFIE: "blue",
  EN_COURS: "amber",
  TERMINE: "green",
  ANNULE: "red",
}

/** « 2026-07-15 » en Date LOCALE : `new Date("2026-07-15")` parserait minuit UTC,
 * ce qui décale le jour affiché selon le fuseau. */
function parseJour(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Créneau calculé par l'ordonnanceur (date-heure) : « 14/07 20:04 ». */
function formatCreneau(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Échéance client : un jour, sans heure. */
function formatEcheance(iso: string | null): string {
  if (!iso) return "—"
  return parseJour(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

/** Reste à produire = planifié − bonnes − rejetées (même formule que
 * l'ordonnanceur : c'est cette quantité qu'il séquence, pas le planifié). */
function aProduire(of: OrdreFabrication): number {
  return Math.max(
    0,
    Number(of.quantite_planifiee) - Number(of.quantite_bonne) - Number(of.quantite_rejetee),
  )
}

/** Le créneau calculé dépasse-t-il l'échéance ? Même règle qu'au backend : on
 * compare des JOURS, un OF fini le soir de son échéance est dans les temps. */
function enRetard(of: OrdreFabrication): boolean {
  if (!of.date_fin_prevue || !of.date_echeance) return false
  const fin = new Date(of.date_fin_prevue)
  const jourFin = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
  return jourFin.getTime() > parseJour(of.date_echeance).getTime()
}

export function OrdresPage({ onAskNova }: { onAskNova?: (message: string) => void }) {
  const { data, loading, error, reload, setError } = useResource(() => ordresApi.list(), [])
  const articles = useResource(() => articlesApi.list(), [])
  const lignes = useResource(() => lignesApi.list(), [])

  const [detail, setDetail] = useState<OrdreFabrication | null>(null)
  const [page, setPage] = useState(1)

  // Temps réel : quand Nova ordonnance (ou crée un OF), le backend diffuse
  // `ordres_update` une fois la transaction commitée — on recharge la table sans
  // que l'opérateur ait à rafraîchir la page.
  const { lastMessage } = useWebSocket()
  useEffect(() => {
    if (lastMessage?.type !== "ordres_update") return
    void reload()
  }, [lastMessage, reload])

  // Surbrillance des lignes modifiées : on mémorise ce qui était affiché, et à
  // chaque rechargement les OF dont le créneau / la ligne / le statut a changé
  // (ou qui viennent d'apparaître) clignotent — l'opérateur voit ce que Nova a
  // touché sans comparer les dates à l'œil.
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set())
  const prevRowsRef = useRef<Map<number, string>>(new Map())
  useEffect(() => {
    if (!data) return
    const empreinte = (o: OrdreFabrication) =>
      `${o.date_debut_prevue}|${o.date_fin_prevue}|${o.date_echeance}|${o.ligne_production_id}|${o.statut}`
    const prev = prevRowsRef.current
    const next = new Map(data.map((o) => [o.id, empreinte(o)]))
    prevRowsRef.current = next
    if (prev.size === 0) return // premier chargement : rien à signaler
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

  // Create wizard
  const [open, setOpen] = useState(false)
  const [articleId, setArticleId] = useState("")
  const [quantite, setQuantite] = useState("")
  const [faisa, setFaisa] = useState<Faisabilite | null>(null)
  const [checking, setChecking] = useState(false)
  const [echeance, setEcheance] = useState("")
  const [ligneId, setLigneId] = useState("")
  const [creating, setCreating] = useState(false)

  function openCreate() {
    setArticleId("")
    setQuantite("")
    setFaisa(null)
    setEcheance("")
    setLigneId("")
    setOpen(true)
  }

  async function verifier() {
    setError(null)
    setFaisa(null)
    if (!articleId || !quantite || Number(quantite) <= 0) {
      setError("Choisissez un article et une quantité.")
      return
    }
    setChecking(true)
    try {
      setFaisa(await ordresApi.faisabilite(Number(articleId), Number(quantite)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setChecking(false)
    }
  }

  async function creer() {
    setCreating(true)
    try {
      await ordresApi.create({
        article_id: Number(articleId),
        quantite: Number(quantite),
        date_echeance: echeance || null,
        ligne_production_id: ligneId ? Number(ligneId) : null,
      })
      setOpen(false)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setCreating(false)
    }
  }

  async function changerStatut(of: OrdreFabrication, statut: StatutOF) {
    try {
      await ordresApi.setStatut(of.id, statut)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  async function changerLigne(of: OrdreFabrication, ligne: string) {
    try {
      await ordresApi.setLigne(of.id, ligne ? Number(ligne) : null)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  // Lancement d'un OF sur sa ligne. Si la ligne est pleine, le backend renvoie
  // 409 : on ouvre alors une boîte de dialogue (préempter / mettre en file).
  const [busyOf, setBusyOf] = useState<OrdreFabrication | null>(null)
  const [busyCtx, setBusyCtx] = useState<ContexteLigne | null>(null)
  const [launching, setLaunching] = useState<number | null>(null)

  async function lancer(of: OrdreFabrication) {
    if (of.ligne_production_id == null) {
      setError(`Affectez d'abord une ligne à ${of.numero} avant de le lancer.`)
      return
    }
    setLaunching(of.id)
    setError(null)
    try {
      await ordresApi.lancer(of.id)
      void reload()
    } catch (e) {
      // Ligne pleine (409) : on récupère le contexte et on ouvre le dialogue.
      try {
        const ctx = await ordresApi.contexteLigne(of.ligne_production_id)
        setBusyOf(of)
        setBusyCtx(ctx)
      } catch {
        setError(e instanceof Error ? e.message : "Erreur")
      }
    } finally {
      setLaunching(null)
    }
  }

  async function preempterEtLancer(disposition: DispositionPreemption) {
    if (!busyOf) return
    setLaunching(busyOf.id)
    try {
      await ordresApi.lancer(busyOf.id, disposition)
      setBusyOf(null)
      setBusyCtx(null)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setLaunching(null)
    }
  }

  async function mettreEnFile() {
    if (!busyOf || busyOf.ligne_production_id == null) return
    setLaunching(busyOf.id)
    try {
      await ordresApi.mettreEnFile(busyOf.id, busyOf.ligne_production_id)
      setBusyOf(null)
      setBusyCtx(null)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setLaunching(null)
    }
  }

  function annuler(of: OrdreFabrication) {
    if (!confirm(`Annuler l'ordre ${of.numero} ?`)) return
    void changerStatut(of, "ANNULE")
  }

  /** Alternative à la création manuelle : demande à Nova de vérifier la
   * faisabilité, recommander une ligne si besoin, puis créer l'OF après
   * confirmation dans le chat (même outil agent que la création manuelle). */
  function demanderNova() {
    const article = articleList.find((a) => String(a.id) === articleId)
    const ligne = ligneList.find((l) => String(l.id) === ligneId)
    const parts = [
      article
        ? `Crée un ordre de fabrication pour l'article ${article.code} (${article.designation})`
        : "Aide-moi à créer un ordre de fabrication",
      quantite ? `pour une quantité de ${quantite} unités` : "",
      echeance ? `avec une échéance client au ${echeance}` : "",
      ligne
        ? `sur la ligne ${ligne.code}`
        : "recommande-moi la meilleure ligne de production disponible",
      ". Vérifie d'abord la faisabilité (stock MP), présente-moi le résultat, puis demande ma confirmation avant de créer l'OF.",
    ]
    onAskNova?.(parts.filter(Boolean).join(" "))
    setOpen(false)
  }

  const rows = data ?? []
  const articleList: Article[] = articles.data ?? []
  const ligneList: LigneProduction[] = lignes.data ?? []
  const ligneCodeById = new Map(ligneList.map((l) => [l.id, l.code]))

  // Vue « plan de production » : les OF sont REGROUPÉS PAR LIGNE, et dans chaque
  // ligne classés dans l'ordre de passage calculé par l'ordonnanceur (créneau de
  // début). C'est ainsi que le plan s'exécute réellement — #1, #2, #3 sur chaque
  // ligne — au lieu d'un simple tri global par date qui entremêle les lignes.
  // Les OF sans ligne sont rejetés dans un groupe final, du plus récent au plus ancien.
  const AUCUNE_LIGNE = -1
  const groupOrder = (id: number) => (id === AUCUNE_LIGNE ? Number.MAX_SAFE_INTEGER : id)
  const groupCode = (id: number) => (id === AUCUNE_LIGNE ? "— Aucune ligne —" : ligneCodeById.get(id) ?? `Ligne ${id}`)

  const groups = new Map<number, OrdreFabrication[]>()
  for (const of of rows) {
    const key = of.ligne_production_id ?? AUCUNE_LIGNE
    const bucket = groups.get(key)
    if (bucket) bucket.push(of)
    else groups.set(key, [of])
  }

  const seqInLine = new Map<number, number>() // of.id -> rang #n dans sa ligne
  const sortedRows: OrdreFabrication[] = []
  const groupSizes = new Map<number, number>()
  for (const lineId of [...groups.keys()].sort((a, b) => groupOrder(a) - groupOrder(b))) {
    const bucket = groups.get(lineId)!
    bucket.sort((a, b) => {
      const da = a.date_debut_prevue ? Date.parse(a.date_debut_prevue) : null
      const db = b.date_debut_prevue ? Date.parse(b.date_debut_prevue) : null
      if (da !== null && db !== null) return da - db || a.id - b.id
      if (da !== null) return -1 // un OF daté passe avant un OF non daté
      if (db !== null) return 1
      return b.id - a.id // aucun n'est daté : du plus récent au plus ancien
    })
    groupSizes.set(lineId, bucket.length)
    bucket.forEach((of, i) => {
      seqInLine.set(of.id, i + 1)
      sortedRows.push(of)
    })
  }

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <Page
      title="Ordres de Fabrication"
      description="Lancement et suivi des OF. La création consomme les MP en FEFO. Demandez l'ordonnancement à Nova : « ordonnance les OF en EDD », « quelle règle est la meilleure ? », « passe l'OF-2026-00007 en premier »."
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nouvel OF
        </Button>
      }
    >
      <ErrorBanner message={error ?? lignes.error} />
      {/* « Chargement… » au premier affichage seulement : un rechargement temps
          réel garde la table à l'écran (sinon elle clignote à chaque mise à jour). */}
      {loading && rows.length === 0 ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucun ordre de fabrication." />
      ) : (
        <>
        {/* Flash ambré des lignes que Nova vient de modifier (voir changedIds). */}
        <style>{"@keyframes ofChange{0%{background-color:rgba(245,158,11,.28)}60%{background-color:rgba(245,158,11,.14)}100%{background-color:transparent}}"}</style>
        <Table>
          <thead>
            <tr>
              <Th>N° OF</Th>
              <Th>Article</Th>
              <Th className="text-right">Quantité</Th>
              <Th className="text-right">À produire</Th>
              <Th>Lot produit</Th>
              <Th>Échéance</Th>
              <Th>Début prévu</Th>
              <Th>Fin prévue</Th>
              <Th>Ligne</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((of, idx) => {
              const lineKey = of.ligne_production_id ?? AUCUNE_LIGNE
              const prev = idx > 0 ? pageRows[idx - 1] : null
              const prevKey = prev ? prev.ligne_production_id ?? AUCUNE_LIGNE : null
              const showHeader = lineKey !== prevKey
              const seq = seqInLine.get(of.id)
              return (
              <Fragment key={of.id}>
              {showHeader && (
                <tr className="bg-muted/50">
                  <td
                    colSpan={11}
                    className="border-b border-border px-4 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {groupCode(lineKey)}
                    <span className="ml-2 font-normal normal-case text-muted-foreground/70">
                      {groupSizes.get(lineKey) ?? 0} OF · ordre de passage
                    </span>
                  </td>
                </tr>
              )}
              <tr
                className="hover:bg-muted/30"
                style={
                  changedIds.has(of.id)
                    ? { animation: "ofChange 2.5s ease-out both" }
                    : undefined
                }
              >
                <Td className="font-mono text-xs">
                  {lineKey !== AUCUNE_LIGNE && seq != null && (
                    <span className="mr-1.5 inline-flex size-4 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      {seq}
                    </span>
                  )}
                  {of.numero}
                </Td>
                <Td>{of.code_article}</Td>
                <Td className="text-right">
                  {of.quantite_planifiee} {of.unite}
                </Td>
                <Td className="text-right">
                  {of.statut === "TERMINE" || of.statut === "ANNULE" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={aProduire(of) > 0 ? "font-medium" : "text-muted-foreground"}>
                      {aProduire(of)} {of.unite}
                    </span>
                  )}
                </Td>
                <Td className="font-mono text-xs">{of.numero_lot_produit ?? "—"}</Td>
                <Td className="text-xs">{formatEcheance(of.date_echeance)}</Td>
                <Td className="text-xs">{formatCreneau(of.date_debut_prevue)}</Td>
                <Td className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className={enRetard(of) ? "font-medium text-destructive" : undefined}>
                      {formatCreneau(of.date_fin_prevue)}
                    </span>
                    {enRetard(of) && <Badge tone="red">retard</Badge>}
                  </div>
                </Td>
                <Td>
                  <Select
                    value={of.ligne_production_id ?? ""}
                    onChange={(e) => changerLigne(of, e.target.value)}
                    className="h-7 w-36 text-xs"
                  >
                    <option value="">— aucune —</option>
                    {ligneList.filter((l) => l.actif).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <Select
                    value={of.statut}
                    onChange={(e) => changerStatut(of, e.target.value as StatutOF)}
                    className="h-7 w-32 text-xs"
                  >
                    {STATUTS_OF.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => setDetail(of)}>
                      <Eye className="size-4" /> Généalogie
                    </Button>
                    {(of.statut === "BROUILLON" || of.statut === "PLANIFIE") && (
                      <Button
                        variant="ghost"
                        onClick={() => lancer(of)}
                        disabled={launching === of.id}
                      >
                        <Play className="size-4" /> {launching === of.id ? "Lancement…" : "Lancer"}
                      </Button>
                    )}
                    {of.statut !== "ANNULE" && of.statut !== "TERMINE" && (
                      <Button variant="ghost" onClick={() => annuler(of)}>
                        <Ban className="size-4" /> Annuler
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
              </Fragment>
              )
            })}
          </tbody>
        </Table>
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {rows.length} OF · page {currentPage} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" /> Page précédente
              </Button>
              <Button
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Page suivante <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Détail / généalogie */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`Généalogie — ${detail?.numero ?? ""}`}
      >
        {detail && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Article</p>
                <p>{detail.designation_article}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lot produit</p>
                <p className="font-mono text-xs">{detail.numero_lot_produit}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantité</p>
                <p>
                  {detail.quantite_planifiee} {detail.unite}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge tone={statutTone[detail.statut]}>{detail.statut}</Badge>
              </div>
            </div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Matières premières consommées (FEFO)
            </p>
            {detail.consommations.length === 0 ? (
              <EmptyState message="Aucune consommation." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>MP</Th>
                    <Th>Lot</Th>
                    <Th className="text-right">Quantité</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.consommations.map((c, i) => (
                    <tr key={i}>
                      <Td className="font-mono text-xs">{c.code_mp}</Td>
                      <Td className="font-mono text-xs">{c.numero_lot}</Td>
                      <Td className="text-right">{c.quantite_consommee}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        )}
      </Modal>

      {/* Création */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouvel ordre de fabrication"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            {onAskNova && (
              <Button variant="outline" onClick={demanderNova} disabled={!articleId || !quantite}>
                <Sparkles className="size-4" /> Créer avec Nova
              </Button>
            )}
            {faisa?.faisable ? (
              <Button onClick={creer} disabled={creating}>
                <CheckCircle2 className="size-4" />
                {creating ? "Création…" : "Confirmer et créer l'OF"}
              </Button>
            ) : (
              <Button onClick={verifier} disabled={checking}>
                {checking ? "Vérification…" : "Vérifier la disponibilité"}
              </Button>
            )}
          </>
        }
      >
        <Field label="Article">
          <Select
            value={articleId}
            onChange={(e) => {
              setArticleId(e.target.value)
              setFaisa(null)
            }}
          >
            <option value="">— choisir —</option>
            {articleList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.designation}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantité à produire">
          <TextInput
            type="number"
            step="any"
            value={quantite}
            onChange={(e) => {
              setQuantite(e.target.value)
              setFaisa(null)
            }}
          />
        </Field>
        <Field label="Ligne de production (optionnel)">
          <Select value={ligneId} onChange={(e) => setLigneId(e.target.value)}>
            <option value="">— aucune —</option>
            {ligneList.filter((l) => l.actif).map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} · {l.designation}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Échéance client (optionnel)">
          <TextInput type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">
            La date due au client. Le créneau de production (début/fin prévus) est
            calculé par Nova lors de l'ordonnancement.
          </p>
        </Field>

        {faisa && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              {faisa.faisable ? (
                <Badge tone="green">
                  <CheckCircle2 className="mr-1 size-3" /> Fabrication possible
                </Badge>
              ) : (
                <Badge tone="red">
                  <XCircle className="mr-1 size-3" /> Stock insuffisant
                </Badge>
              )}
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>MP</Th>
                  <Th className="text-right">Requis</Th>
                  <Th className="text-right">Dispo.</Th>
                  <Th className="text-right">Manque</Th>
                </tr>
              </thead>
              <tbody>
                {faisa.besoins.map((b) => (
                  <tr key={b.matiere_premiere_id}>
                    <Td className="font-mono text-xs">{b.code}</Td>
                    <Td className="text-right">
                      {b.quantite_requise} {b.unite}
                    </Td>
                    <Td className="text-right">{b.quantite_disponible}</Td>
                    <Td className="text-right">
                      {b.suffisant ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-destructive">{b.manquant}</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal>

      {/* Ligne occupée : préempter un OF en cours ou mettre celui-ci en file */}
      <Modal
        open={busyOf !== null}
        onClose={() => {
          setBusyOf(null)
          setBusyCtx(null)
        }}
        title={`Ligne occupée — ${busyOf?.numero ?? ""}`}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setBusyOf(null)
              setBusyCtx(null)
            }}
          >
            Fermer
          </Button>
        }
      >
        {busyOf && busyCtx && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Aucune machine libre sur la ligne. Choisissez comment lancer{" "}
              <span className="font-mono">{busyOf.numero}</span>.
            </p>

            {busyCtx.occupations.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">OF en cours</p>
                <ul className="space-y-1">
                  {busyCtx.occupations.map((o) => (
                    <li key={o.machine_id} className="rounded-lg bg-muted/60 px-3 py-1.5">
                      <span className="font-mono text-xs">{o.machine_code}</span> · OF{" "}
                      <span className="font-mono text-xs">{o.of_numero}</span> ({o.code_article}) ·
                      reste {o.reste_a_produire}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-xs font-semibold">Préempter (démarrer maintenant)</p>
              <p className="text-xs text-muted-foreground">
                Arrête l'OF le moins urgent en cours. Que faire de l'OF interrompu ?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => preempterEtLancer("requeue")}
                  disabled={launching === busyOf.id}
                >
                  Remettre en file (reprend son reliquat)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => preempterEtLancer("pause")}
                  disabled={launching === busyOf.id}
                >
                  Mettre en pause (hors ligne)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => preempterEtLancer("cancel")}
                  disabled={launching === busyOf.id}
                >
                  Annuler l'OF interrompu
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-xs font-semibold">Mettre en file</p>
              <p className="text-xs text-muted-foreground">
                {busyOf.numero} attendra que la ligne se libère (file triée par échéance).
                {busyCtx.file_attente.length > 0 &&
                  ` ${busyCtx.file_attente.length} OF déjà en attente.`}
              </p>
              <Button
                variant="outline"
                onClick={mettreEnFile}
                disabled={launching === busyOf.id}
              >
                Mettre {busyOf.numero} en file
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  )
}
