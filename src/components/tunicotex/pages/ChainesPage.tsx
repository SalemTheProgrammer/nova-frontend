import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react"
import { Page, Select, TextInput } from "@/components/shared/primitives"
import { ChaineDetailPanneau } from "@/components/tunicotex/ChaineDetail"
import { DateDonnees } from "@/components/tunicotex/DateDonnees"
import { MaitreDetail } from "@/components/tunicotex/MaitreDetail"
import { Panneau } from "@/components/tunicotex/Panneau"
import { Chargement, ErreurDivatex, Vide } from "@/components/tunicotex/EtatsDonnees"
import { useReference } from "@/components/tunicotex/useReference"
import { comparerValeurs, messageErreur, pct } from "@/components/tunicotex/format"
import { useResource } from "@/lib/useResource"
import { tunicotexApi, type ProductionLigne } from "@/lib/tunicotex"
import { cn } from "@/lib/utils"

type Cle =
  | "code"
  | "groupe"
  | "nature"
  | "objectif"
  | "sortie"
  | "taux"
  | "effectif"
  | "rendement"
  | "statut"

type Statut = { libelle: string; classe: string; rang: number }

function statutDe(l: ProductionLigne): Statut {
  if (!l.a_des_lectures) return { libelle: "aucune lecture", classe: "bg-muted text-muted-foreground", rang: 0 }
  if (l.objectif == null || l.objectif <= 0 || l.taux == null)
    return { libelle: "sans objectif", classe: "bg-muted text-muted-foreground", rang: 0 }
  if (l.taux >= 1)
    return {
      libelle: "objectif atteint",
      classe: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      rang: 3,
    }
  if (l.taux >= 0.8)
    return { libelle: "proche", classe: "bg-amber-500/15 text-amber-700 dark:text-amber-400", rang: 2 }
  return { libelle: "en retard", classe: "bg-destructive/10 text-destructive", rang: 1 }
}

function rendementDe(l: ProductionLigne): number | null {
  return l.ligne.nature === "confection" ? l.rendement : null
}

function valeur(l: ProductionLigne, cle: Cle): string | number | null {
  switch (cle) {
    case "code":
      return l.ligne.code || l.ligne.nom
    case "groupe":
      return l.ligne.groupe?.nom ?? null
    case "nature":
      return l.ligne.nature
    case "objectif":
      return l.objectif
    case "sortie":
      return l.sortie
    case "taux":
      return l.taux
    case "effectif":
      return l.effectif
    case "rendement":
      return rendementDe(l)
    case "statut":
      return statutDe(l).rang
  }
}

function LigneChaine({
  l,
  active,
  onChoisir,
}: {
  l: ProductionLigne
  active: boolean
  onChoisir: (id: number) => void
}) {
  const s = statutDe(l)
  return (
    <tr
      tabIndex={0}
      aria-selected={active}
      onClick={() => onChoisir(l.ligne.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onChoisir(l.ligne.id)
        }
      }}
      className={cn(
        "cursor-pointer border-t border-border/60 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
        active && "bg-accent/70",
      )}
    >
      <td className="max-w-40 truncate px-3 py-1.5 font-medium" title={l.ligne.nom}>
        {l.ligne.code || l.ligne.nom}
      </td>
      <td className="hidden max-w-32 truncate px-3 py-1.5 2xl:table-cell">{l.ligne.groupe?.nom ?? "—"}</td>
      <td className="hidden px-3 py-1.5 2xl:table-cell">{l.ligne.nature}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{l.objectif ?? "—"}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{l.sortie}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{pct(l.taux)}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{l.effectif}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{pct(rendementDe(l))}</td>
      <td className="px-3 py-1.5">
        <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", s.classe)}>
          {s.libelle}
        </span>
      </td>
    </tr>
  )
}

export function ChainesPage() {
  const ref = useReference()
  const [dateChoisie, setDateChoisie] = useState("")
  const [groupe, setGroupe] = useState("")
  // Par défaut : les chaînes les plus en retard en premier.
  const [tri, setTri] = useState<{ cle: Cle; asc: boolean }>({ cle: "taux", asc: true })
  const [sansLectureOuvert, setSansLectureOuvert] = useState(false)
  const [params, setParams] = useSearchParams()
  const jour = dateChoisie || ref.dateReference

  const chaines = useResource(
    () =>
      jour
        ? tunicotexApi.chaines(jour, groupe ? Number(groupe) : undefined)
        : Promise.resolve(null),
    [jour, groupe],
  )

  const lignes = useMemo(() => {
    const copie = [...(chaines.data ?? [])]
    copie.sort((a, b) => {
      return comparerValeurs(valeur(a, tri.cle), valeur(b, tri.cle), tri.asc)
    })
    return copie
  }, [chaines.data, tri])
  const avecLectures = lignes.filter((l) => l.a_des_lectures)
  const sansLecture = lignes.filter((l) => !l.a_des_lectures)

  const idParam = Number(params.get("id"))
  const choisie =
    Number.isFinite(idParam) && idParam > 0 && lignes.some((l) => l.ligne.id === idParam)
      ? idParam
      : // Défaut : la chaîne au plus faible taux parmi celles qui ont un objectif.
        ([...avecLectures]
          .filter((l) => l.taux != null)
          .sort((a, b) => (a.taux ?? 0) - (b.taux ?? 0))[0]?.ligne.id ??
        avecLectures[0]?.ligne.id ??
        null)

  function choisir(id: number) {
    setParams({ id: String(id) }, { replace: true })
  }

  function trier(cle: Cle) {
    setTri((t) => (t.cle === cle ? { cle, asc: !t.asc } : { cle, asc: true }))
  }

  const suffixe = ref.calibre ? "" : " (estimé)"
  // `large` : colonne masquée sous 1536 px (le groupe se lit déjà dans le code de la chaîne).
  const colonnes: { cle: Cle; titre: string; droite?: boolean; large?: boolean }[] = [
    { cle: "code", titre: "Code" },
    { cle: "groupe", titre: "Groupe", large: true },
    { cle: "nature", titre: "Nature", large: true },
    { cle: "objectif", titre: "Objectif", droite: true },
    { cle: "sortie", titre: "Sortie", droite: true },
    { cle: "taux", titre: "Taux", droite: true },
    { cle: "effectif", titre: "Effectif", droite: true },
    { cle: "rendement", titre: `Rendement${suffixe}`, droite: true },
    { cle: "statut", titre: "Statut" },
  ]

  return (
    <Page fullHeight title="Chaînes" description="Production par chaîne" meta={<DateDonnees />}>
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
          <option value="">Tous les groupes</option>
          {ref.groupes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </Select>
      </div>

      {ref.loading || chaines.loading ? (
        <Chargement />
      ) : chaines.error || ref.error ? (
        <ErreurDivatex
          onRetry={() => {
            ref.reload()
            void chaines.reload()
          }}
          message={messageErreur(chaines.error ?? ref.error)}
        />
      ) : lignes.length === 0 ? (
        <Vide raison="Aucune chaîne pour ce jour." />
      ) : (
        <MaitreDetail
          maitre={
            <Panneau titre="Chaînes" compteur={lignes.length} corpsClassName="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
                  <tr>
                    {colonnes.map((c) => (
                      <th
                        key={c.cle}
                        scope="col"
                        aria-sort={tri.cle === c.cle ? (tri.asc ? "ascending" : "descending") : "none"}
                        className={cn(
                          "whitespace-nowrap px-3 py-2 font-medium",
                          c.droite && "text-right",
                          c.large && "hidden 2xl:table-cell",
                        )}
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
                  {avecLectures.map((l) => (
                    <LigneChaine
                      key={l.ligne.id}
                      l={l}
                      active={l.ligne.id === choisie}
                      onChoisir={choisir}
                    />
                  ))}
                  {sansLecture.length > 0 && (
                    <tr className="border-t border-border/60">
                      <td colSpan={colonnes.length} className="px-3 py-1.5">
                        <button
                          type="button"
                          aria-expanded={sansLectureOuvert}
                          onClick={() => setSansLectureOuvert((o) => !o)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          {sansLectureOuvert ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                          Sans lecture ({sansLecture.length})
                        </button>
                      </td>
                    </tr>
                  )}
                  {sansLectureOuvert &&
                    sansLecture.map((l) => (
                      <LigneChaine
                        key={l.ligne.id}
                        l={l}
                        active={l.ligne.id === choisie}
                        onChoisir={choisir}
                      />
                    ))}
                </tbody>
              </table>
            </Panneau>
          }
          detail={
            choisie != null ? (
              <ChaineDetailPanneau key={choisie} id={choisie} jour={jour} calibre={ref.calibre} />
            ) : undefined
          }
        />
      )}
    </Page>
  )
}
