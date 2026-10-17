import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Document, Page } from "react-pdf"
import "@/lib/pdfWorker"
import { Eye, Search, X } from "lucide-react"
import {
  Button,
  Card,
  Field,
  Page as PageLayout,
  Select,
  TextInput,
} from "@/components/shared/primitives"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { useReference } from "@/components/tunicotex/useReference"
import { useDebounce } from "@/lib/useDebounce"
import { useResource } from "@/lib/useResource"
import { tunicotexApi, type OFResume, type ParametresRapport } from "@/lib/tunicotex"

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

/** Aperçu : première page du PDF, rendue à partir du blob (aucune URL d'objet à révoquer). */
function ApercuPremierePage({
  type,
  parametres,
  prete,
}: {
  type: string
  parametres: ParametresRapport
  prete: boolean
}) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [etat, setEtat] = useState<"repos" | "chargement" | "erreur">("repos")
  const requete = useRef(0)
  const cle = JSON.stringify(parametres)

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

  return (
    <>
      <Button
        variant="outline"
        onClick={() => void charger()}
        disabled={!prete || etat === "chargement"}
      >
        <Eye className="size-4" />
        Aperçu
      </Button>
      {(etat !== "repos" || blob) && (
        <div className="basis-full">
          {etat === "chargement" && (
            <p className="text-sm text-muted-foreground">Chargement de l'aperçu…</p>
          )}
          {etat === "erreur" && <p className="text-sm text-muted-foreground">Aperçu indisponible</p>}
          {blob && (
            <Document
              file={blob}
              onLoadError={() => {
                setBlob(null)
                setEtat("erreur")
              }}
              loading={<p className="text-sm text-muted-foreground">Ouverture…</p>}
              className="flex justify-center"
            >
              <Page
                pageNumber={1}
                width={420}
                className="overflow-hidden rounded-md border border-border shadow-sm [&_canvas]:!h-auto [&_canvas]:!max-w-full"
              />
            </Document>
          )}
        </div>
      )}
    </>
  )
}

function CarteRapport({
  type,
  titre,
  description,
  parametres,
  prete = true,
  libelles,
  children,
}: {
  type: string
  titre: string
  description: string
  parametres: ParametresRapport
  prete?: boolean
  libelles?: Partial<Record<keyof ParametresRapport, string>>
  children: ReactNode
}) {
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-base font-semibold">{titre}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
      <div className="flex flex-wrap items-center gap-2">
        <ApercuPremierePage type={type} parametres={parametres} prete={prete} />
        <RapportActions
          type={type}
          parametres={parametres}
          libelle={titre}
          desactive={!prete}
          libelles={libelles}
        />
      </div>
    </Card>
  )
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

export function RapportsPage() {
  const { dateReference, groupes, lignes } = useReference()

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

  return (
    <PageLayout
      title="Rapports"
      description="Rapports PDF de l'atelier : aperçu, téléchargement ou envoi sur WhatsApp"
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <CarteRapport
          type="R1"
          titre="Production du jour"
          description="Production, objectif et rendement par chaîne pour une journée."
          parametres={{
            jour: jourEffectif || undefined,
            groupe_id: groupeR1 ? Number(groupeR1) : undefined,
          }}
          prete={!!jourEffectif}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <TextInput
                type="date"
                value={jourEffectif}
                onChange={(e) => setJour(e.target.value)}
              />
            </Field>
            <Field label="Groupe">
              <Select value={groupeR1} onChange={(e) => setGroupeR1(e.target.value)}>
                <OptionsGroupes groupes={groupes} />
              </Select>
            </Field>
          </div>
        </CarteRapport>

        <CarteRapport
          type="R2"
          titre="Pièces par phase"
          description="Pièces passées par phase, jour par jour, sur une période."
          parametres={{
            du: periodeR2.du || undefined,
            au: periodeR2.au || undefined,
            of_id: ofR2?.id,
          }}
          libelles={ofR2 ? { of_id: ofR2.numero } : undefined}
          prete={!!periodeR2.du}
        >
          <ChampsPeriode periode={periodeR2} />
          <RechercheOf of={ofR2} onChange={setOfR2} />
        </CarteRapport>

        <CarteRapport
          type="R3"
          titre="Classement des opérateurs"
          description="Classement des opérateurs sur une période."
          parametres={{
            du: periodeR3.du || undefined,
            au: periodeR3.au || undefined,
            groupe_id: groupeR3 ? Number(groupeR3) : undefined,
            ligne_id: ligneR3 ? Number(ligneR3) : undefined,
          }}
          prete={!!periodeR3.du}
        >
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
        </CarteRapport>

        <CarteRapport
          type="R4"
          titre="Commandes à risque"
          description="OF en retard ou à risque sur la date d'export, par client."
          parametres={{ horizon_jours: horizon }}
        >
          <Field label="Horizon">
            <Select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
              {[7, 14, 30].map((h) => (
                <option key={h} value={h}>
                  {h} jours
                </option>
              ))}
            </Select>
          </Field>
        </CarteRapport>

        <CarteRapport
          type="R5"
          titre="Avancement d'un OF"
          description="Avancement d'un OF par phase et par taille."
          parametres={{ of_id: ofR5?.id }}
          libelles={ofR5 ? { of_id: ofR5.numero } : undefined}
          prete={!!ofR5}
        >
          <RechercheOf of={ofR5} onChange={setOfR5} obligatoire />
        </CarteRapport>
      </div>
    </PageLayout>
  )
}
