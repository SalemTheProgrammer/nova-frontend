import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Document, Page } from "react-pdf"
import "@/lib/pdfWorker"
import { Eye, Search, X } from "lucide-react"
import { Button, Field, Page as PageLayout, Select, TextInput } from "@/components/shared/primitives"
import { DateDonnees } from "@/components/tunicotex/DateDonnees"
import { MaitreDetail } from "@/components/tunicotex/MaitreDetail"
import { Panneau } from "@/components/tunicotex/Panneau"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { useReference } from "@/components/tunicotex/useReference"
import { useDebounce } from "@/lib/useDebounce"
import { useResource } from "@/lib/useResource"
import { tunicotexApi, type OFResume, type ParametresRapport } from "@/lib/tunicotex"
import { cn } from "@/lib/utils"

const PERIODE_MAX_JOURS = 31
const JOUR_MS = 86_400_000

function decaler(iso: string, jours: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setTime(d.getTime() + jours * JOUR_MS)
  return d.toISOString().slice(0, 10)
}

function ecartJours(du: string, au: string): number {
  return Math.round((Date.parse(`${au}T00:00:00Z`) - Date.parse(`${du}T00:00:00Z`)) / JOUR_MS)
}

interface Periode {
  du: string
  au: string
  changer: (borne: "du" | "au", valeur: string) => void
}

/** Période (du, au) bornée à 31 jours : modifier une borne ramène l'autre dans la limite. */
function usePeriode(dateReference: string): Periode {
  const [choix, setChoix] = useState<{ du: string; au: string } | null>(null)
  const effective = choix ?? {
    du: dateReference ? decaler(dateReference, -6) : "",
    au: dateReference,
  }

  function changer(borne: "du" | "au", valeur: string) {
    if (!valeur) return
    let { du, au } = effective
    const max = PERIODE_MAX_JOURS - 1
    if (borne === "du") {
      du = valeur
      if (au < du) au = du
      else if (ecartJours(du, au) > max) au = decaler(du, max)
    } else {
      au = valeur
      if (du > au) du = au
      else if (ecartJours(du, au) > max) du = decaler(au, -max)
    }
    setChoix({ du, au })
  }
  return { ...effective, changer }
}

function ChampsPeriode({ periode }: { periode: Periode }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Du">
        <TextInput
          type="date"
          value={periode.du}
          onChange={(e) => periode.changer("du", e.target.value)}
        />
      </Field>
      <Field label="Au">
        <TextInput
          type="date"
          value={periode.au}
          onChange={(e) => periode.changer("au", e.target.value)}
        />
      </Field>
    </div>
  )
}

function RechercheOf({
  of,
  onChange,
  obligatoire,
}: {
  of: OFResume | null
  onChange: (of: OFResume | null) => void
  obligatoire?: boolean
}) {
  const [saisie, setSaisie] = useState("")
  const q = useDebounce(saisie.trim(), 300)
  const resultats = useResource(
    async () => ({ q, items: q ? await tunicotexApi.rechercherOf(q) : ([] as OFResume[]) }),
    [q],
  )
  // Seuls les résultats de la requête courante comptent (jamais ceux d'une saisie précédente).
  const actuels =
    !resultats.loading && !resultats.error && resultats.data?.q === q ? resultats.data.items : null
  const liste = (actuels ?? []).slice(0, 8)

  useEffect(() => {
    // Un seul résultat pour la saisie courante : il est choisi d'office.
    if (!of && q && q === saisie.trim() && actuels?.length === 1) {
      onChange(actuels[0])
    }
  }, [of, q, saisie, actuels, onChange])

  const libelleChamp = obligatoire ? "OF (obligatoire)" : "OF (facultatif)"

  if (of) {
    return (
      <Field label={libelleChamp}>
        <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm">
          <span className="truncate">
            <span className="font-medium">{of.numero}</span>
            {of.client ? ` · ${of.client}` : ""}
          </span>
          <button
            type="button"
            aria-label="Retirer l'OF"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSaisie("")
              onChange(null)
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      </Field>
    )
  }

  return (
    <Field label={libelleChamp}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <TextInput
          type="search"
          className="pl-9"
          placeholder="Numéro d'OF, client, article…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
        />
      </div>
      {q && !resultats.loading && (resultats.error || (actuels && liste.length === 0)) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {resultats.error ? "Recherche indisponible." : "Aucun OF trouvé."}
        </p>
      )}
      {liste.length > 1 && (
        <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-border text-sm">
          {liste.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent"
                onClick={() => onChange(o)}
              >
                <span className="font-medium">{o.numero}</span>
                <span className="truncate text-xs text-muted-foreground">{o.client ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}

type EtatApercu = "repos" | "chargement" | "erreur"

/** Aperçu PDF d'un rapport : chargé à la demande, oublié dès que les paramètres changent. */
function useApercu(type: string, parametres: ParametresRapport) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [etat, setEtat] = useState<EtatApercu>("repos")
  const requete = useRef(0)
  const cle = `${type}:${JSON.stringify(parametres)}`

  // Les paramètres changent : l'aperçu affiché n'est plus celui du formulaire.
  useEffect(() => {
    requete.current++
    setBlob(null)
    setEtat("repos")
  }, [cle])
  useEffect(
    () => () => {
      requete.current++
    },
    [],
  )

  async function charger() {
    const id = ++requete.current
    setEtat("chargement")
    setBlob(null)
    try {
      const b = await tunicotexApi.apercuRapport(type, parametres)
      if (id !== requete.current) return
      setBlob(b)
      setEtat("repos")
    } catch {
      if (id !== requete.current) return
      setEtat("erreur")
    }
  }

  return {
    blob,
    etat,
    charger,
    echec: () => {
      setBlob(null)
      setEtat("erreur")
    },
  }
}

/** Largeur disponible d'un élément (pour rendre la page PDF à la taille du panneau). */
function useLargeur<T extends HTMLElement>() {
  // Ref par callback : l'élément peut apparaître après le premier rendu.
  const [el, ref] = useState<T | null>(null)
  const [largeur, setLargeur] = useState(0)
  useEffect(() => {
    if (!el) return
    // Mesure immédiate (largeur intérieure, sans le padding), puis suivi des changements.
    const style = getComputedStyle(el)
    setLargeur(
      Math.floor(el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)),
    )
    const obs = new ResizeObserver(([e]) => setLargeur(Math.floor(e.contentRect.width)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [el])
  return { ref, largeur }
}

function OptionsGroupes({ groupes }: { groupes: { id: number; nom: string }[] }) {
  return (
    <>
      <option value="">Tous les groupes</option>
      {groupes.map((g) => (
        <option key={g.id} value={g.id}>
          {g.nom}
        </option>
      ))}
    </>
  )
}

type TypeRapport = "R1" | "R2" | "R3" | "R4" | "R5"

const RAPPORTS: { type: TypeRapport; titre: string; description: string }[] = [
  {
    type: "R1",
    titre: "Production du jour",
    description: "Production, objectif et rendement par chaîne pour une journée.",
  },
  {
    type: "R2",
    titre: "Pièces par phase",
    description: "Pièces passées par phase, jour par jour, sur une période.",
  },
  {
    type: "R3",
    titre: "Classement des opérateurs",
    description: "Classement des opérateurs sur une période.",
  },
  {
    type: "R4",
    titre: "Commandes à risque",
    description: "OF en retard ou à risque sur la date d'export, par client.",
  },
  { type: "R5", titre: "Avancement d'un OF", description: "Avancement d'un OF par phase et par taille." },
]

/** Plafond de largeur de l'aperçu : au-delà, la page A4 devient inutilement grande. */
const LARGEUR_APERCU_MAX = 720

export function RapportsPage() {
  const { dateReference, groupes, lignes } = useReference()

  const [choisi, setChoisi] = useState<TypeRapport>("R1")
  const [jour, setJour] = useState("")
  const [groupeR1, setGroupeR1] = useState("")
  const periodeR2 = usePeriode(dateReference)
  const [ofR2, setOfR2] = useState<OFResume | null>(null)
  const periodeR3 = usePeriode(dateReference)
  const [groupeR3, setGroupeR3] = useState("")
  const [ligneR3, setLigneR3] = useState("")
  const [horizon, setHorizon] = useState(7)
  const [ofR5, setOfR5] = useState<OFResume | null>(null)

  const jourEffectif = jour || dateReference
  const lignesR3 = useMemo(
    () => lignes.filter((l) => !groupeR3 || String(l.groupe_id ?? "") === groupeR3),
    [lignes, groupeR3],
  )

  const config: Record<
    TypeRapport,
    {
      parametres: ParametresRapport
      prete: boolean
      libelles?: Partial<Record<keyof ParametresRapport, string>>
      champs: ReactNode
    }
  > = {
    R1: {
      parametres: {
        jour: jourEffectif || undefined,
        groupe_id: groupeR1 ? Number(groupeR1) : undefined,
      },
      prete: !!jourEffectif,
      champs: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <TextInput type="date" value={jourEffectif} onChange={(e) => setJour(e.target.value)} />
          </Field>
          <Field label="Groupe">
            <Select value={groupeR1} onChange={(e) => setGroupeR1(e.target.value)}>
              <OptionsGroupes groupes={groupes} />
            </Select>
          </Field>
        </div>
      ),
    },
    R2: {
      parametres: {
        du: periodeR2.du || undefined,
        au: periodeR2.au || undefined,
        of_id: ofR2?.id,
      },
      libelles: ofR2 ? { of_id: ofR2.numero } : undefined,
      prete: !!periodeR2.du,
      champs: (
        <>
          <ChampsPeriode periode={periodeR2} />
          <RechercheOf of={ofR2} onChange={setOfR2} />
        </>
      ),
    },
    R3: {
      parametres: {
        du: periodeR3.du || undefined,
        au: periodeR3.au || undefined,
        groupe_id: groupeR3 ? Number(groupeR3) : undefined,
        ligne_id: ligneR3 ? Number(ligneR3) : undefined,
      },
      prete: !!periodeR3.du,
      champs: (
        <>
          <ChampsPeriode periode={periodeR3} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Groupe">
              <Select
                value={groupeR3}
                onChange={(e) => {
                  setGroupeR3(e.target.value)
                  setLigneR3("")
                }}
              >
                <OptionsGroupes groupes={groupes} />
              </Select>
            </Field>
            <Field label="Chaîne">
              <Select value={ligneR3} onChange={(e) => setLigneR3(e.target.value)}>
                <option value="">Toutes les chaînes</option>
                {lignesR3.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      ),
    },
    R4: {
      parametres: { horizon_jours: horizon },
      prete: true,
      champs: (
        <Field label="Horizon">
          <Select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
            {[7, 14, 30].map((h) => (
              <option key={h} value={h}>
                {h} jours
              </option>
            ))}
          </Select>
        </Field>
      ),
    },
    R5: {
      parametres: { of_id: ofR5?.id },
      libelles: ofR5 ? { of_id: ofR5.numero } : undefined,
      prete: !!ofR5,
      champs: <RechercheOf of={ofR5} onChange={setOfR5} obligatoire />,
    },
  }

  const actif = config[choisi]
  const infos = RAPPORTS.find((r) => r.type === choisi)!
  const apercu = useApercu(choisi, actif.parametres)
  const zone = useLargeur<HTMLDivElement>()
  const largeurPage = Math.max(240, Math.min(LARGEUR_APERCU_MAX, zone.largeur))

  return (
    <PageLayout
      fullHeight
      title="Rapports"
      description="Aperçu, téléchargement ou envoi sur WhatsApp"
      meta={<DateDonnees />}
    >
      <MaitreDetail
        colonnes="@min-[900px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
        maitre={
          <Panneau titre="Rapports" compteur={RAPPORTS.length} corpsClassName="p-2">
            <ul className="space-y-1">
              {RAPPORTS.map((r) => {
                const ouvert = r.type === choisi
                return (
                  <li
                    key={r.type}
                    className={cn("rounded-lg", ouvert && "border border-border bg-muted/30")}
                  >
                    <button
                      type="button"
                      aria-expanded={ouvert}
                      onClick={() => setChoisi(r.type)}
                      className={cn(
                        "block w-full rounded-lg px-3 py-2 text-left hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
                      )}
                    >
                      <span className="block text-sm font-medium">{r.titre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.description}
                      </span>
                    </button>
                    {ouvert && (
                      <div className="space-y-1 px-3 pb-3">
                        {actif.champs}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            onClick={() => void apercu.charger()}
                            disabled={!actif.prete || apercu.etat === "chargement"}
                          >
                            <Eye className="size-4" />
                            Aperçu
                          </Button>
                          <RapportActions
                            type={r.type}
                            parametres={actif.parametres}
                            libelle={r.titre}
                            desactive={!actif.prete}
                            libelles={actif.libelles}
                          />
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panneau>
        }
        detail={
          <Panneau titre={`Aperçu · ${infos.titre}`} corpsClassName="bg-muted/30">
            <div ref={zone.ref} className="flex min-h-full justify-center p-4">
              {apercu.etat === "chargement" ? (
                <p className="self-center text-sm text-muted-foreground">Chargement de l'aperçu…</p>
              ) : apercu.etat === "erreur" ? (
                <p className="self-center text-sm text-muted-foreground">Aperçu indisponible.</p>
              ) : apercu.blob ? (
                <Document
                  file={apercu.blob}
                  onLoadError={apercu.echec}
                  loading={<p className="text-sm text-muted-foreground">Ouverture…</p>}
                >
                  <Page
                    pageNumber={1}
                    width={largeurPage}
                    className="overflow-hidden rounded-md border border-border shadow-sm [&_canvas]:!h-auto [&_canvas]:!max-w-full"
                  />
                </Document>
              ) : (
                <p className="self-center text-center text-sm text-muted-foreground">
                  {actif.prete
                    ? "Cliquez sur Aperçu pour afficher le rapport."
                    : "Complétez les champs du rapport pour l'afficher."}
                </p>
              )}
            </div>
          </Panneau>
        }
      />
    </PageLayout>
  )
}
