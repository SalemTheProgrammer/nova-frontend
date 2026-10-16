import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Dialog } from "radix-ui"
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
import { ArrowDown, ArrowUp, X } from "lucide-react"
import { Card, Page, Select, TextInput } from "@/components/shared/primitives"
import { Chargement, ErreurDivatex, Vide } from "@/components/tunicotex/EtatsDonnees"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { comparerValeurs, messageErreur, pct } from "@/components/tunicotex/format"
import { useReference } from "@/components/tunicotex/useReference"
import { useResource } from "@/lib/useResource"
import { formatDateFr, tunicotexApi, type RendementOperateur } from "@/lib/tunicotex"
import { cn } from "@/lib/utils"

const JOURS_MAX = 31
const MS_JOUR = 86_400_000
const MESSAGE_PERIODE = "Période limitée à 31 jours."

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
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border/80 px-5 py-4">
        <div className="min-w-0">
          <Dialog.Title className="truncate text-base font-bold tracking-tight">
            {f ? nomComplet(f.total) : "Opérateur"}
          </Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            {f ? `${f.operateur.matricule}${f.total.ligne ? ` · ${f.total.ligne}` : ""} · ` : ""}
            Du {formatDateFr(du)} au {formatDateFr(au)}
          </Dialog.Description>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {fiche.loading ? (
          <Chargement />
        ) : fiche.error ? (
          <ErreurDivatex onRetry={() => void fiche.reload()} message={messageErreur(fiche.error)} />
        ) : f ? (
          <>
            <p className="text-sm tabular-nums text-muted-foreground">
              {f.total.pieces_operations} opérations · {minutes(f.total.minutes_produites)} produites
              · présence {minutes(f.total.minutes_presence)}
              {f.total.presence_estimee && " (estimée)"} · Rendement{suffixe} {pct(f.total.rendement)}
            </p>

            <Card className="min-w-0 p-4">
              <h3 className="mb-3 text-sm font-medium">Rendement{suffixe} par jour</h3>
              {courbe.every((p) => p.rendement == null) ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucune lecture sur la période.
                </p>
              ) : (
                <div className="h-48 min-w-0">
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
            </Card>

            <Card className="min-w-0 p-4">
              <h3 className="mb-2 text-sm font-medium">Opérations réalisées</h3>
              {top.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune opération sur la période.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {top.map(([libelle, qte]) => (
                    <li key={libelle}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate">{libelle}</span>
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
            </Card>
          </>
        ) : null}
      </div>
    </>
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
    const copie = [...classes]
    copie.sort((a, b) => {
      return comparerValeurs(valeur(a.o, a.rang, tri.cle), valeur(b.o, b.rang, tri.cle), tri.asc)
    })
    return copie
  }, [classes, tri])

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
    <Page title="Opérateurs" description="Rendement des opérateurs sur une période">
      <div className="mb-1 flex flex-wrap items-center gap-3">
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
        {periodeValide && !messagePeriode && (
          <div className="ml-auto">
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
          </div>
        )}
      </div>
      <p
        role="alert"
        className={cn("mb-4 min-h-5 text-sm text-destructive", !messagePeriode && "invisible")}
      >
        {messagePeriode ?? " "}
      </p>

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
      ) : lignes.length === 0 ? (
        <Vide raison="Aucun opérateur sur cette période." />
      ) : (
        <div className="space-y-4">
          <Card className="min-w-0 p-4">
            <h3 className="mb-3 text-sm font-medium">Répartition des rendements{suffixe}</h3>
            <div className="h-52 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="tranche"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="operateurs" name="Opérateurs" fill="var(--chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  {colonnes.map((c) => (
                    <th
                      key={c.cle}
                      scope="col"
                      aria-sort={tri.cle === c.cle ? (tri.asc ? "ascending" : "descending") : "none"}
                      className={cn("px-3 py-2 font-medium", c.droite && "text-right")}
                    >
                      <button
                        type="button"
                        onClick={() => trier(c.cle)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.titre}
                        {tri.cle === c.cle &&
                          (tri.asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ o, rang }) => (
                  <tr
                    key={o.operateur.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => ouvrir(o.operateur.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        ouvrir(o.operateur.id)
                      }
                    }}
                    className="cursor-pointer border-t border-border/60 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                  >
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{rang}</td>
                    <td className="px-3 py-2 tabular-nums">{o.operateur.matricule}</td>
                    <td className="px-3 py-2 font-medium">{nomComplet(o)}</td>
                    <td className="px-3 py-2">{o.ligne ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{o.pieces_operations}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{minutes(o.minutes_produites)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {minutes(o.minutes_presence)}
                      {o.presence_estimee && (
                        <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          estimée
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(o.rendement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog.Root open={ouvert != null} onOpenChange={(o) => !o && ouvrir(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border/80 bg-card shadow-2xl outline-none">
            {ouvert != null && du && au && (
              <Fiche id={ouvert} du={du} au={au} calibre={ref.calibre} onFermer={() => ouvrir(null)} />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Page>
  )
}
