import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Sparkles } from "lucide-react"
import { Button, Card, Page, Select, TextInput } from "@/components/shared/primitives"
import { KpiTiles } from "@/components/tunicotex/KpiTiles"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { Chargement, ErreurDivatex, Vide } from "@/components/tunicotex/EtatsDonnees"
import { useReference } from "@/components/tunicotex/useReference"
import { aiChatBus } from "@/lib/aiChatBus"
import { useResource } from "@/lib/useResource"
import {
  formatDateFr,
  tunicotexApi,
  type ProductionLigne,
  type Tuile,
} from "@/lib/tunicotex"

const ROUGE = "var(--destructive)"
const NEUTRE = "var(--chart-2)"
const OBJECTIF = "var(--chart-1)"

const pct = (f: number | null): string => (f == null ? "—" : `${Math.round(f * 100)} %`)
const jjmm = (iso: string): string => formatDateFr(iso).slice(0, 5)

function sousObjectif(l: ProductionLigne): boolean {
  return l.objectif != null && l.objectif > 0 && l.sortie < l.objectif
}

function messageErreur(erreur: string | null): string | undefined {
  if (!erreur || /DIVA injoignable/i.test(erreur)) return undefined
  return erreur
}

function ListeClassement({ titre, lignes }: { titre: string; lignes: ProductionLigne[] }) {
  return (
    <Card className="min-w-0 p-4">
      <h3 className="mb-2 text-sm font-medium">{titre}</h3>
      {lignes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune chaîne.</p>
      ) : (
        <ol className="space-y-1.5 text-sm">
          {lignes.map((l) => (
            <li key={l.ligne.id} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate">{l.ligne.nom}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {l.sortie}
                {l.objectif != null && ` / ${l.objectif}`} · {pct(l.taux)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

export function AtelierPage() {
  const ref = useReference()
  const [dateChoisie, setDateChoisie] = useState("")
  const [groupe, setGroupe] = useState("")
  const jour = dateChoisie || ref.dateReference

  const atelier = useResource(
    () => (jour ? tunicotexApi.atelier(jour) : Promise.resolve(null)),
    [jour],
  )
  const retards = useResource(
    () => tunicotexApi.commandesARisque().then((r) => r.filter((o) => o.statut === "en_retard")),
    [],
  )

  const donnees = atelier.data
  const toutes = useMemo(() => donnees?.lignes ?? [], [donnees])
  const lignes = useMemo(
    () => (groupe ? toutes.filter((l) => String(l.ligne.groupe?.id ?? "") === groupe) : toutes),
    [toutes, groupe],
  )
  const avecLectures = useMemo(() => lignes.filter((l) => l.a_des_lectures), [lignes])
  const sansLectures = lignes.filter((l) => !l.a_des_lectures)

  const tuiles = useMemo<Tuile[]>(() => {
    if (!donnees) return []
    const s = donnees.situation
    let sortie = s.sortie
    let sortieCible = s.sortie_avec_objectif
    let objectif = s.objectif
    let taux = s.taux
    let rendement = s.rendement_moyen
    let sous = s.lignes_sous_objectif.length
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
      sous = ciblees.filter(sousObjectif).length
    }
    const suffixe = ref.calibre ? "" : " (estimé)"
    return [
      { libelle: "Pièces sorties", valeur: sortie },
      { libelle: "Objectif", valeur: objectif > 0 ? objectif : null },
      {
        libelle: "Taux d'atteinte",
        valeur: taux == null ? null : Math.round(taux * 100),
        unite: taux == null ? undefined : "%",
        etat: taux == null ? "neutre" : taux >= 1 ? "ok" : "alerte",
        note: objectif > 0 ? `${sortieCible} / ${objectif} (chaînes avec objectif)` : undefined,
      },
      {
        libelle: `Rendement moyen${suffixe}`,
        valeur: rendement == null ? null : Math.round(rendement * 100),
        unite: rendement == null ? undefined : "%",
      },
      { libelle: "Chaînes sous objectif", valeur: sous, etat: sous > 0 ? "alerte" : "ok" },
      {
        libelle: "OF en retard",
        valeur: s.nb_of_en_retard,
        etat: s.nb_of_en_retard > 0 ? "alerte" : "ok",
        note: groupe ? "tout l'atelier" : undefined,
      },
    ]
  }, [donnees, groupe, lignes, ref.calibre])

  const classement = useMemo(() => {
    const tri = avecLectures
      .filter((l) => l.taux != null)
      .sort((a, b) => (b.taux ?? 0) - (a.taux ?? 0))
    const meilleurs = tri.slice(0, 3)
    const ids = new Set(meilleurs.map((l) => l.ligne.id))
    const pires = tri
      .slice(-3)
      .reverse()
      .filter((l) => !ids.has(l.ligne.id))
    return { meilleurs, pires }
  }, [avecLectures])

  const donneesBarres = avecLectures.map((l) => ({
    id: l.ligne.id,
    nom: l.ligne.code || l.ligne.nom,
    sortie: l.sortie,
    objectif: l.objectif ?? 0,
    alerte: sousObjectif(l),
  }))

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
    <Page title="Tableau de bord" description="Production de l'atelier" actions={actions}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
      </div>

      {ref.loading || atelier.loading ? (
        <Chargement />
      ) : atelier.error || ref.error ? (
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
        <div className="space-y-4">
          <KpiTiles tuiles={tuiles} />

          <Card className="min-w-0 p-4">
            <h3 className="mb-3 text-sm font-medium">Sortie vs objectif</h3>
            {donneesBarres.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">aucune lecture</p>
            ) : (
              <div className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={donneesBarres}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nom" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sortie" name="Sortie" fill={NEUTRE}>
                      {donneesBarres.map((d) => (
                        <Cell key={d.id} fill={d.alerte ? ROUGE : NEUTRE} />
                      ))}
                    </Bar>
                    <Bar dataKey="objectif" name="Objectif" fill={OBJECTIF} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {sansLectures.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Aucune lecture : {sansLectures.map((l) => l.ligne.nom).join(", ")}
              </p>
            )}
            {lignes.some((l) => l.objectif_perime && l.objectif_date) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {lignes
                  .filter((l) => l.objectif_perime && l.objectif_date)
                  .map((l) => `${l.ligne.nom} : objectif du ${jjmm(l.objectif_date!)}`)
                  .join(" · ")}
              </p>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <ListeClassement titre="3 meilleures chaînes" lignes={classement.meilleurs} />
            <ListeClassement titre="3 chaînes les plus en retard" lignes={classement.pires} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="min-w-0 p-4">
              <h3 className="mb-3 text-sm font-medium">Tendance sur 7 jours</h3>
              <div className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(donnees.tendance ?? []).map((p) => ({ ...p, j: jjmm(p.jour) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="j" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sortie" name="Sortie" stroke={NEUTRE} strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="objectif"
                      name="Objectif"
                      stroke={OBJECTIF}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="min-w-0 p-4">
              <h3 className="mb-3 text-sm font-medium">OF en retard</h3>
              {retards.loading ? (
                <Chargement />
              ) : retards.error ? (
                <ErreurDivatex
                  onRetry={() => void retards.reload()}
                  message={messageErreur(retards.error)}
                />
              ) : (retards.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun OF en retard.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {(retards.data ?? []).map((r) => (
                    <li key={r.of.id} className="flex items-baseline justify-between gap-2">
                      <Link
                        to={`/app/of?id=${r.of.id}`}
                        className="min-w-0 truncate font-medium hover:underline"
                      >
                        {r.of.numero}
                        {r.of.client && (
                          <span className="ml-2 font-normal text-muted-foreground">{r.of.client}</span>
                        )}
                      </Link>
                      <span className="shrink-0 tabular-nums text-destructive">
                        {r.jours} j de retard
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </Page>
  )
}
