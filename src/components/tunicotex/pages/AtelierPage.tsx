import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button, Page, Select, TextInput } from "@/components/shared/primitives"
import { DateDonnees } from "@/components/tunicotex/DateDonnees"
import { DonneesAVerifier } from "@/components/tunicotex/DonneesAVerifier"
import { BadgeObjectif } from "@/components/tunicotex/BadgeObjectif"
import { exclueDuGraphique } from "@/components/tunicotex/format"
import { KpiTiles } from "@/components/tunicotex/KpiTiles"
import { Panneau } from "@/components/tunicotex/Panneau"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { Chargement, ErreurDivatex, Vide } from "@/components/tunicotex/EtatsDonnees"
import { oublierReference, useReference } from "@/components/tunicotex/useReference"
import { aiChatBus } from "@/lib/aiChatBus"
import { useResource } from "@/lib/useResource"
import {
  formatDateFr,
  tunicotexApi,
  type OFRisque,
  type ProductionLigne,
  type Tuile,
} from "@/lib/tunicotex"
import { cn } from "@/lib/utils"

const ROUGE = "var(--destructive)"
const NEUTRE = "var(--chart-2)"
const OBJECTIF = "var(--chart-1)"
const RAFRAICHISSEMENT_MS = 5 * 60_000

const pct = (f: number | null): string => (f == null ? "—" : `${Math.round(f * 100)} %`)
const jjmm = (iso: string): string => formatDateFr(iso).slice(0, 5)

/** Seuils de la tuile Taux d'atteinte (décision de design, spec § 9). */
function etatTaux(taux: number | null): Tuile["etat"] {
  if (taux == null) return "neutre"
  if (taux >= 0.95) return "ok"
  if (taux >= 0.8) return "attention"
  return "alerte"
}

/** Chaîne comparable sortie / objectif : lectures, objectif, taux crédible. */
function comparable(l: ProductionLigne): boolean {
  return l.objectif != null && l.objectif > 0 && !exclueDuGraphique(l)
}

function messageErreur(erreur: string | null): string | undefined {
  if (!erreur || /DIVA injoignable/i.test(erreur)) return undefined
  return erreur
}

/** 5 éléments par liste, 10 quand la fenêtre est haute. */
function useTailleListe(): number {
  const requete = "(min-height: 900px)"
  const [haute, setHaute] = useState(() => window.matchMedia(requete).matches)
  useEffect(() => {
    const mq = window.matchMedia(requete)
    const suivre = () => setHaute(mq.matches)
    mq.addEventListener("change", suivre)
    return () => mq.removeEventListener("change", suivre)
  }, [])
  return haute ? 10 : 5
}

function SousListe({
  titre,
  lien,
  vide,
  children,
}: {
  titre: string
  lien: string
  vide: string | null
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{titre}</h3>
        <Link
          to={lien}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Voir tout
          <ArrowRight className="size-3" />
        </Link>
      </div>
      {vide ? <p className="py-2 text-sm text-muted-foreground">{vide}</p> : <ol>{children}</ol>}
    </div>
  )
}

export function AtelierPage() {
  const navigate = useNavigate()
  const ref = useReference()
  const [dateChoisie, setDateChoisie] = useState("")
  const [groupe, setGroupe] = useState("")
  const [onglet, setOnglet] = useState<"chaines" | "traiter">("chaines")
  const [majA, setMajA] = useState<Date | null>(null)
  const taille = useTailleListe()
  const jour = dateChoisie || ref.dateReference

  const atelier = useResource(
    () => (jour ? tunicotexApi.atelier(jour) : Promise.resolve(null)),
    [jour],
  )
  // Même jour que la tuile « OF en retard » : la date choisie, pas la référence.
  const retards = useResource(
    () =>
      jour
        ? tunicotexApi
            .commandesARisque(undefined, undefined, jour)
            .then((r) => r.filter((o) => o.statut === "en_retard"))
        : Promise.resolve([] as OFRisque[]),
    [jour],
  )

  const { reload: rechargerRef } = ref
  const { reload: rechargerAtelier } = atelier
  const { reload: rechargerRetards } = retards
  // Écran laissé allumé : on relit la référence puis les données toutes les 5 minutes.
  useEffect(() => {
    const t = setInterval(() => {
      oublierReference()
      rechargerRef()
      void rechargerAtelier()
      void rechargerRetards()
    }, RAFRAICHISSEMENT_MS)
    return () => clearInterval(t)
  }, [rechargerRef, rechargerAtelier, rechargerRetards])

  const donnees = atelier.data
  useEffect(() => {
    if (donnees) setMajA(new Date())
  }, [donnees])

  const toutes = useMemo(() => donnees?.lignes ?? [], [donnees])
  const lignes = useMemo(
    () => (groupe ? toutes.filter((l) => String(l.ligne.groupe?.id ?? "") === groupe) : toutes),
    [toutes, groupe],
  )
  const comparables = useMemo(
    () => lignes.filter(comparable).sort((a, b) => (a.taux ?? 0) - (b.taux ?? 0)),
    [lignes],
  )
  const sousObjectif = comparables.filter((l) => (l.taux ?? 0) < 1)

  const tuiles = useMemo<Tuile[]>(() => {
    if (!donnees) return []
    const s = donnees.situation
    let sortie = s.sortie
    let sortieCible = s.sortie_avec_objectif
    let objectif = s.objectif
    let taux = s.taux
    let rendement = s.rendement_moyen
    if (groupe) {
      const ciblees = lignes.filter(
        (l) => l.ligne.nature === "confection" && l.objectif != null && l.a_des_lectures,
      )
      sortie = lignes
        .filter((l) => l.ligne.nature === "confection")
        .reduce((a, l) => a + l.sortie, 0)
      sortieCible = ciblees.reduce((a, l) => a + l.sortie, 0)
      objectif = ciblees.reduce((a, l) => a + (l.objectif ?? 0), 0)
      taux = objectif > 0 ? sortieCible / objectif : null
      const presence = lignes.reduce((a, l) => a + l.minutes_presence, 0)
      rendement =
        presence > 0 ? lignes.reduce((a, l) => a + l.minutes_produites, 0) / presence : null
    }
    const suffixe = ref.calibre ? "" : " (estimé)"
    // La tendance couvre tout l'atelier : pas de mini-courbe quand un groupe est filtré.
    const courbe = groupe
      ? undefined
      : (donnees.tendance ?? []).map((p) => (p.objectif > 0 ? p.sortie / p.objectif : 0))
    return [
      {
        libelle: "Taux d'atteinte",
        valeur: taux == null ? null : Math.round(taux * 100),
        unite: taux == null ? undefined : "%",
        etat: etatTaux(taux),
        note: objectif > 0 ? `${sortieCible} / ${objectif} (chaînes avec objectif)` : "aucun objectif",
        principale: true,
        courbe,
      },
      {
        libelle: "Pièces sorties",
        valeur: sortie,
        note: objectif > 0 ? `objectif ${objectif}` : undefined,
      },
      {
        libelle: `Rendement moyen${suffixe}`,
        valeur: rendement == null ? null : Math.round(rendement * 100),
        unite: rendement == null ? undefined : "%",
      },
      {
        libelle: "OF en retard",
        valeur: s.nb_of_en_retard,
        etat: s.nb_of_en_retard > 0 ? "alerte" : "ok",
        note: groupe ? "7 derniers jours, tout l'atelier" : "7 derniers jours",
      },
    ]
  }, [donnees, groupe, lignes, ref.calibre])

  const donneesBarres = comparables.map((l) => ({
    id: l.ligne.id,
    nom: l.ligne.code || l.ligne.nom,
    sortie: l.sortie,
    objectif: l.objectif ?? 0,
    alerte: (l.taux ?? 0) < 1,
  }))
  const pireRetards = useMemo(
    () => [...(retards.data ?? [])].sort((a, b) => b.jours - a.jours).slice(0, taille),
    [retards.data, taille],
  )

  const jourAffiche = jjmm(jour || "")

  function demanderANova() {
    aiChatBus.emit(`Fais-moi le point sur l'atelier du ${jourAffiche}`)
  }

  const actions = (
    <>
      <Button variant="outline" onClick={demanderANova}>
        <Sparkles className="size-4" />
        Demander à Nova
      </Button>
      <RapportActions
        type="R1"
        libelle="Rapport atelier"
        parametres={{ jour: jour || null, groupe_id: groupe ? Number(groupe) : null }}
      />
    </>
  )

  return (
    <Page
      fullHeight
      title="Tableau de bord"
      description="Production de l'atelier"
      meta={<DateDonnees />}
      actions={actions}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <TextInput
          type="date"
          aria-label="Date"
          className="w-auto"
          value={jour}
          onChange={(e) => setDateChoisie(e.target.value)}
        />
        <Select
          aria-label="Groupe"
          className="w-auto"
          value={groupe}
          onChange={(e) => setGroupe(e.target.value)}
        >
          <option value="">Tout l'atelier</option>
          {ref.groupes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </Select>
        {majA && (
          <span className="ml-auto text-xs text-muted-foreground">
            Mis à jour à{" "}
            {majA.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Premier chargement seulement : un rafraîchissement garde les données affichées. */}
      {(ref.loading && !ref.dateReference) || (atelier.loading && !donnees) ? (
        <Chargement />
      ) : (atelier.error || ref.error) && !donnees ? (
        <ErreurDivatex
          onRetry={() => {
            ref.reload()
            void atelier.reload()
          }}
          message={messageErreur(atelier.error ?? ref.error)}
        />
      ) : !donnees || !donnees.situation.a_des_lectures ? (
        <Vide raison="Aucune lecture DIVA ce jour-là." />
      ) : (
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1">
          <div className="shrink-0">
            <KpiTiles tuiles={tuiles} colonnes={4} />
          </div>

          <div className="flex gap-1 rounded-lg bg-muted p-1 md:hidden" role="tablist">
            {(
              [
                ["chaines", "Chaînes"],
                ["traiter", "À traiter"],
              ] as const
            ).map(([id, lib]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={onglet === id}
                onClick={() => setOnglet(id)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-sm font-medium text-muted-foreground",
                  onglet === id && "bg-background text-foreground shadow-sm",
                )}
              >
                {lib}
              </button>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12">
            <Panneau
              titre="Sortie vs objectif par chaîne"
              compteur={comparables.length}
              extra={<DonneesAVerifier lignes={lignes} />}
              className={cn("lg:col-span-7", onglet !== "chaines" && "max-md:hidden")}
              corpsClassName="p-2"
            >
              {donneesBarres.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Aucune chaîne avec un objectif et des lectures
                  {groupe ? " dans ce groupe" : ""}.
                </p>
              ) : (
                <div
                  className="h-full min-h-0"
                  style={{ minHeight: Math.max(220, donneesBarres.length * 26) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={donneesBarres}
                      layout="vertical"
                      barGap={2}
                      margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="nom"
                        width={72}
                        tick={{ fontSize: 11 }}
                        interval={0}
                      />
                      <Tooltip />
                      <Legend verticalAlign="top" height={22} iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        dataKey="sortie"
                        name="Sortie"
                        fill={NEUTRE}
                        cursor="pointer"
                        isAnimationActive={false}
                        onClick={(d) => {
                          const id = (d as { payload?: { id?: number } }).payload?.id
                          if (id != null) navigate(`/app/chaines?id=${id}`)
                        }}
                      >
                        {donneesBarres.map((d) => (
                          <Cell key={d.id} fill={d.alerte ? ROUGE : NEUTRE} />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="objectif"
                        name="Objectif"
                        fill={OBJECTIF}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panneau>

            <Panneau
              titre="À traiter"
              className={cn("lg:col-span-5", onglet !== "traiter" && "max-md:hidden")}
              corpsClassName="divide-y divide-border/70"
            >
              <SousListe
                titre={`Chaînes sous l'objectif (${sousObjectif.length})`}
                lien="/app/chaines"
                vide={
                  comparables.length === 0
                    ? `Aucune chaîne avec un objectif${groupe ? " dans ce groupe" : ""}.`
                    : sousObjectif.length === 0
                      ? "Toutes les chaînes sont dans l'objectif."
                      : null
                }
              >
                {sousObjectif.slice(0, taille).map((l) => (
                  <li key={l.ligne.id}>
                    <Link
                      to={`/app/chaines?id=${l.ligne.id}`}
                      className="-mx-2 flex items-baseline justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-accent/50"
                    >
                      <span className="min-w-0 truncate font-medium" title={l.ligne.nom}>
                        {l.ligne.code || l.ligne.nom}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {l.sortie} / {l.objectif} ·{" "}
                        <span className="text-destructive">{pct(l.taux)}</span>
                        <BadgeObjectif l={l} />
                      </span>
                    </Link>
                  </li>
                ))}
              </SousListe>
              <SousListe
                titre={`OF en retard (${retards.data?.length ?? 0})`}
                lien="/app/commandes"
                vide={
                  retards.loading
                    ? "Chargement…"
                    : retards.error
                      ? "Retards indisponibles."
                      : pireRetards.length === 0
                        ? "Aucun OF en retard sur les 7 derniers jours."
                        : null
                }
              >
                {pireRetards.map((r) => (
                  <li key={r.of.id}>
                    <Link
                      to={`/app/of?id=${r.of.id}`}
                      className="-mx-2 flex items-baseline justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-accent/50"
                    >
                      <span className="min-w-0 truncate" title={r.of.numero}>
                        <span className="font-medium">{r.of.numero}</span>
                        {r.of.client && (
                          <span className="ml-2 text-muted-foreground">{r.of.client}</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-destructive">{r.jours} j</span>
                    </Link>
                  </li>
                ))}
              </SousListe>
            </Panneau>
          </div>
        </div>
      )}
    </Page>
  )
}
