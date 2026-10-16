import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Page, Select, TextInput } from "@/components/shared/primitives"
import { ChaineDetail } from "@/components/tunicotex/ChaineDetail"
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

export function ChainesPage() {
  const ref = useReference()
  const [dateChoisie, setDateChoisie] = useState("")
  const [groupe, setGroupe] = useState("")
  const [tri, setTri] = useState<{ cle: Cle; asc: boolean }>({ cle: "code", asc: true })
  const [ouverte, setOuverte] = useState<number | null>(null)
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

  function trier(cle: Cle) {
    setTri((t) => (t.cle === cle ? { cle, asc: !t.asc } : { cle, asc: true }))
  }

  const suffixe = ref.calibre ? "" : " (estimé)"
  const colonnes: { cle: Cle; titre: string; droite?: boolean }[] = [
    { cle: "code", titre: "Code" },
    { cle: "groupe", titre: "Groupe" },
    { cle: "nature", titre: "Nature" },
    { cle: "objectif", titre: "Objectif", droite: true },
    { cle: "sortie", titre: "Sortie", droite: true },
    { cle: "taux", titre: "Taux", droite: true },
    { cle: "effectif", titre: "Effectif", droite: true },
    { cle: "rendement", titre: `Rendement${suffixe}`, droite: true },
    { cle: "statut", titre: "Statut" },
  ]

  return (
    <Page title="Chaînes" description="Production par chaîne">
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
              {lignes.map((l) => {
                const s = statutDe(l)
                return (
                  <tr
                    key={l.ligne.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setOuverte(l.ligne.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setOuverte(l.ligne.id)
                      }
                    }}
                    className="cursor-pointer border-t border-border/60 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                  >
                    <td className="px-3 py-2 font-medium">{l.ligne.code || l.ligne.nom}</td>
                    <td className="px-3 py-2">{l.ligne.groupe?.nom ?? "—"}</td>
                    <td className="px-3 py-2">{l.ligne.nature}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.objectif ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.sortie}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(l.taux)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.effectif}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(rendementDe(l))}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.classe)}>
                        {s.libelle}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ChaineDetail
        id={ouverte}
        jour={jour}
        calibre={ref.calibre}
        onFermer={() => setOuverte(null)}
      />
    </Page>
  )
}
