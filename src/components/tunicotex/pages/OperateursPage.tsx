import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowDown, ArrowUp, Search, X } from "lucide-react"
import { Button, Page, Select, TextInput } from "@/components/shared/primitives"
import { Chargement, ErreurDivatex, Vide } from "@/components/tunicotex/EtatsDonnees"
import { DateDonnees } from "@/components/tunicotex/DateDonnees"
import { MaitreDetail } from "@/components/tunicotex/MaitreDetail"
import { Panneau } from "@/components/tunicotex/Panneau"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { comparerValeurs, messageErreur, pct } from "@/components/tunicotex/format"
import { useReference } from "@/components/tunicotex/useReference"
import { useDebounce } from "@/lib/useDebounce"
import { useResource } from "@/lib/useResource"
import { formatDateFr, tunicotexApi, type RendementOperateur } from "@/lib/tunicotex"
import { cn } from "@/lib/utils"

const JOURS_MAX = 31
const MS_JOUR = 86_400_000
const MESSAGE_PERIODE = "Période limitée à 31 jours."
/** Lignes affichées d'un coup ; « Afficher plus » ajoute la page suivante. */
const PAGE = 50

function ajouterJours(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setTime(d.getTime() + n * MS_JOUR)
  return d.toISOString().slice(0, 10)
}

function ecartJours(du: string, au: string): number {
  return Math.round((Date.parse(`${au}T00:00:00Z`) - Date.parse(`${du}T00:00:00Z`)) / MS_JOUR)
}

/** Erreur 400 du serveur sur la durée de la période (affichée sous le sélecteur). */
const estErreurPeriode = (e: string | null): boolean => !!e && /p[ée]riode/i.test(e)

/** Minuscules sans accents, pour une recherche tolérante. */
const normaliser = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

type Cle = "rang" | "matricule" | "nom" | "chaine" | "pieces" | "minutes" | "presence" | "rendement"

const nomComplet = (o: RendementOperateur): string =>
  `${o.operateur.prenom} ${o.operateur.nom}`.trim()

function valeur(o: RendementOperateur, rang: number, cle: Cle): string | number | null {
  switch (cle) {
    case "rang":
      return rang
    case "matricule":
      return o.operateur.matricule
    case "nom":
      return nomComplet(o)
    case "chaine":
      return o.ligne
    case "pieces":
      return o.pieces_operations
    case "minutes":
      return o.minutes_produites
    case "presence":
      return o.minutes_presence
    case "rendement":
      return o.rendement
  }
}

const minutes = (m: number): string => `${Math.round(m)} min`

/** Tranches de 10 % : 0–10 … 140–150, puis ≥ 150 %. */
function histogramme(ops: RendementOperateur[]): { tranche: string; operateurs: number }[] {
  const nb = 16
  const compte = Array.from({ length: nb }, () => 0)
  for (const o of ops) {
    if (o.rendement == null) continue
    compte[Math.min(nb - 1, Math.max(0, Math.floor(o.rendement * 10)))] += 1
  }
  return compte.map((operateurs, i) => ({
    tranche: i === nb - 1 ? "≥ 150 %" : `${i * 10}–${(i + 1) * 10} %`,
    operateurs,
  }))
}

/** Graduations lisibles de l'histogramme : 0, 50, 100, ≥ 150 %. */
const GRADUATIONS: Record<number, string> = { 0: "0 %", 5: "50 %", 10: "100 %", 15: "≥ 150 %" }

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">{titre}</h3>
      {children}
    </div>
  )
}

function Fiche({
  id,
  du,
  au,
  calibre,
  onFermer,
}: {
  id: number
  du: string
  au: string
  calibre: boolean
  onFermer: () => void
}) {
  const fiche = useResource(() => tunicotexApi.operateur(id, du, au), [id, du, au])
  const f = fiche.data
  const suffixe = calibre ? "" : " (estimé)"
  const courbe = (f?.par_jour ?? []).map(([date, r]) => ({
    jour: formatDateFr(date).slice(0, 5),
    rendement: r == null ? null : Math.round(r * 100),
  }))
  const top = [...(f?.operations ?? [])].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxQte = top.reduce((m, [, q]) => Math.max(m, q), 0)

  return (
    <Panneau
      titre={f ? nomComplet(f.total) : "Opérateur"}
      extra={
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer la fiche"
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      }
      corpsClassName="space-y-5 px-4 py-3"
    >
      {fiche.loading ? (
        <Chargement />
      ) : fiche.error ? (
        <ErreurDivatex onRetry={() => void fiche.reload()} message={messageErreur(fiche.error)} />
      ) : f ? (
        <>
          <div className="space-y-0.5 text-sm tabular-nums text-muted-foreground">
            <p>
              {f.operateur.matricule}
              {f.total.ligne ? ` · ${f.total.ligne}` : ""} · du {formatDateFr(du)} au{" "}
              {formatDateFr(au)}
            </p>
            <p>
              {f.total.pieces_operations} opérations · {minutes(f.total.minutes_produites)}{" "}
              produites · présence {minutes(f.total.minutes_presence)}
              {f.total.presence_estimee && " (estimée)"} · Rendement{suffixe}{" "}
              <span className="font-medium text-foreground">{pct(f.total.rendement)}</span>
            </p>
          </div>

          <Section titre={`Rendement${suffixe} par jour`}>
            {courbe.every((p) => p.rendement == null) ? (
              <p className="py-4 text-sm text-muted-foreground">Aucune lecture sur la période.</p>
            ) : (
              <div className="h-36 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={courbe}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={44} unit=" %" />
                    <Tooltip formatter={(v) => (v == null ? "—" : `${v} %`)} />
                    <Line
                      type="monotone"
                      dataKey="rendement"
                      name="Rendement"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <Section titre="Opérations réalisées">
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune opération sur la période.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {top.map(([libelle, qte]) => (
                  <li key={libelle}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate" title={libelle}>
                        {libelle}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{qte}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--chart-2)]"
                        style={{ width: `${maxQte > 0 ? (qte / maxQte) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : null}
    </Panneau>
  )
}

export function OperateursPage() {
  const ref = useReference()
  const [params, setParams] = useSearchParams()
  const idParam = Number(params.get("id"))
  const ouvert = Number.isFinite(idParam) && idParam > 0 ? idParam : null

  const [duChoisi, setDuChoisi] = useState("")
  const [auChoisi, setAuChoisi] = useState("")
  const [groupe, setGroupe] = useState("")
  const [chaine, setChaine] = useState("")
  const [saisie, setSaisie] = useState("")
  const recherche = useDebounce(normaliser(saisie.trim()), 200)
  const [visibles, setVisibles] = useState(PAGE)
  const [tri, setTri] = useState<{ cle: Cle; asc: boolean }>({ cle: "rang", asc: true })

  const au = auChoisi || ref.dateReference
  const du = duChoisi || (ref.dateReference ? ajouterJours(ref.dateReference, -6) : "")
  const ecart = du && au ? ecartJours(du, au) : 0
  const erreurLocale =
    du && au && ecart < 0
      ? "La date de début doit précéder la date de fin."
      : ecart + 1 > JOURS_MAX
        ? MESSAGE_PERIODE
        : null
  const periodeValide = !!du && !!au && !erreurLocale

  const ops = useResource(
    () =>
      periodeValide
        ? tunicotexApi.operateurs({
            du,
            au,
            chaine: chaine ? Number(chaine) : undefined,
            groupe: groupe ? Number(groupe) : undefined,
          })
        : Promise.resolve(null),
    [du, au, chaine, groupe, periodeValide],
  )

  const periodeRefusee = periodeValide && estErreurPeriode(ops.error) ? ops.error : null
  const messagePeriode = erreurLocale ?? periodeRefusee

  // Rang fixe = position par rendement décroissant (indépendant du tri d'affichage).
  const classes = useMemo(() => {
    const liste = [...(ops.data ?? [])]
    const avec = liste
      .filter((o) => o.rendement != null)
      .sort((a, b) => (b.rendement ?? 0) - (a.rendement ?? 0))
    const sans = liste.filter((o) => o.rendement == null)
    return [...avec, ...sans].map((o, i) => ({ o, rang: i + 1 }))
  }, [ops.data])

  const lignes = useMemo(() => {
    const filtrees = recherche
      ? classes.filter(({ o }) =>
          normaliser(`${nomComplet(o)} ${o.operateur.matricule}`).includes(recherche),
        )
      : classes
    return [...filtrees].sort((a, b) =>
      comparerValeurs(valeur(a.o, a.rang, tri.cle), valeur(b.o, b.rang, tri.cle), tri.asc),
    )
  }, [classes, tri, recherche])

  // Nouvelle période, recherche ou tri : on repart des premières lignes.
  useEffect(() => setVisibles(PAGE), [ops.data, recherche, tri])

  const histo = useMemo(() => histogramme(ops.data ?? []), [ops.data])

  function trier(cle: Cle) {
    setTri((t) => (t.cle === cle ? { cle, asc: !t.asc } : { cle, asc: cle !== "rendement" }))
  }

  function ouvrir(id: number | null) {
    const p = new URLSearchParams(params)
    if (id == null) p.delete("id")
    else p.set("id", String(id))
    setParams(p, { replace: id == null })
  }

  const suffixe = ref.calibre ? "" : " (estimé)"
  const colonnes: { cle: Cle; titre: string; droite?: boolean }[] = [
    { cle: "rang", titre: "Rang" },
    { cle: "matricule", titre: "Matricule" },
    { cle: "nom", titre: "Nom" },
    { cle: "chaine", titre: "Chaîne" },
    { cle: "pieces", titre: "Pièces", droite: true },
    { cle: "minutes", titre: "Minutes produites", droite: true },
    { cle: "presence", titre: "Présence", droite: true },
    { cle: "rendement", titre: `Rendement${suffixe}`, droite: true },
  ]

  return (
    <Page
      fullHeight
      title="Opérateurs"
      description="Rendement des opérateurs sur une période"
      meta={<DateDonnees />}
      actions={
        periodeValide && !messagePeriode ? (
          <RapportActions
            type="R3"
            libelle="Rendement opérateurs"
            parametres={{
              du,
              au,
              ligne_id: chaine ? Number(chaine) : null,
              groupe_id: groupe ? Number(groupe) : null,
            }}
          />
        ) : undefined
      }
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <TextInput
          type="date"
          aria-label="Du"
          className="w-auto"
          value={du}
          onChange={(e) => setDuChoisi(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">au</span>
        <TextInput
          type="date"
          aria-label="Au"
          className="w-auto"
          value={au}
          onChange={(e) => setAuChoisi(e.target.value)}
        />
        <Select
          aria-label="Groupe"
          className="w-auto"
          value={groupe}
          onChange={(e) => {
            setGroupe(e.target.value)
            setChaine("")
          }}
        >
          <option value="">Tous les groupes</option>
          {ref.groupes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Chaîne"
          className="w-auto"
          value={chaine}
          onChange={(e) => {
            setChaine(e.target.value)
            setGroupe("")
          }}
        >
          <option value="">Toutes les chaînes</option>
          {ref.lignes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code || l.nom}
            </option>
          ))}
        </Select>
        <div className="relative min-w-48 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            type="search"
            aria-label="Rechercher un opérateur"
            placeholder="Nom ou matricule…"
            className="pl-9"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
        </div>
        {messagePeriode && (
          <p role="alert" className="basis-full text-sm text-destructive">
            {messagePeriode}
          </p>
        )}
      </div>

      {ref.loading || (ops.loading && periodeValide) ? (
        <Chargement />
      ) : messagePeriode ? (
        <Vide raison="Choisissez une période valide pour afficher le classement." />
      ) : ops.error || ref.error ? (
        <ErreurDivatex
          onRetry={() => {
            ref.reload()
            void ops.reload()
          }}
          message={messageErreur(ops.error ?? ref.error)}
        />
      ) : classes.length === 0 ? (
        <Vide raison="Aucun opérateur sur cette période." />
      ) : (
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1">
          <section className="shrink-0 rounded-xl border border-border bg-card px-4 pb-1 pt-2">
            <h2 className="text-xs font-medium text-muted-foreground">
              Répartition des rendements{suffixe}
            </h2>
            <div className="h-24 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histo} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="tranche"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    tickFormatter={(_v, i) => GRADUATIONS[i] ?? ""}
                    height={16}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="operateurs" name="Opérateurs" fill="var(--chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <MaitreDetail
            detail={
              ouvert != null && du && au ? (
                <Fiche
                  key={`${ouvert}-${du}-${au}`}
                  id={ouvert}
                  du={du}
                  au={au}
                  calibre={ref.calibre}
                  onFermer={() => ouvrir(null)}
                />
              ) : undefined
            }
            maitre={
              <Panneau titre="Classement" compteur={lignes.length} corpsClassName="overflow-x-auto">
                {lignes.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Aucun opérateur ne correspond à « {saisie.trim()} ».
                  </p>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
                        <tr>
                          {colonnes.map((c) => (
                            <th
                              key={c.cle}
                              scope="col"
                              aria-sort={
                                tri.cle === c.cle ? (tri.asc ? "ascending" : "descending") : "none"
                              }
                              className={cn(
                                "whitespace-nowrap px-3 py-2 font-medium",
                                c.droite && "text-right",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => trier(c.cle)}
                                className="inline-flex items-center gap-1 hover:text-foreground"
                              >
                                {c.titre}
                                {tri.cle === c.cle &&
                                  (tri.asc ? (
                                    <ArrowUp className="size-3" />
                                  ) : (
                                    <ArrowDown className="size-3" />
                                  ))}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lignes.slice(0, visibles).map(({ o, rang }) => (
                          <tr
                            key={o.operateur.id}
                            tabIndex={0}
                            aria-selected={o.operateur.id === ouvert}
                            onClick={() => ouvrir(o.operateur.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                ouvrir(o.operateur.id)
                              }
                            }}
                            className={cn(
                              "cursor-pointer border-t border-border/60 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
                              o.operateur.id === ouvert && "bg-accent/70",
                            )}
                          >
                            <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{rang}</td>
                            <td className="px-3 py-1.5 tabular-nums">{o.operateur.matricule}</td>
                            <td className="max-w-48 truncate px-3 py-1.5 font-medium" title={nomComplet(o)}>
                              {nomComplet(o)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5">{o.ligne ?? "—"}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{o.pieces_operations}</td>
                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                              {minutes(o.minutes_produites)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                              {minutes(o.minutes_presence)}
                              {o.presence_estimee && (
                                <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                  estimée
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{pct(o.rendement)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {visibles < lignes.length && (
                      <div className="border-t border-border/60 p-2 text-center">
                        <Button variant="ghost" onClick={() => setVisibles((v) => v + PAGE)}>
                          Afficher {Math.min(PAGE, lignes.length - visibles)} de plus
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Panneau>
            }
          />
        </div>
      )}
    </Page>
  )
}
