import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Gauge,
  LayoutGrid,
  ListChecks,
  ShieldCheck,
  Table2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { KpiTiles } from "@/components/tunicotex/KpiTiles"
import { PhasePipeline } from "@/components/tunicotex/PhasePipeline"
import {
  tunicotexApi,
  type ParametresRapport,
  type PhasePipelineItem,
  type TaillesPipeline,
  type Tuile,
} from "@/lib/tunicotex"
import { ChartCard } from "@/components/agent/ChartCard"
import { Gauge as GaugeDial } from "@/components/shared/Gauge"
import type { AgentArtifact } from "@/lib/types"

/** Rend l'artifact structuré d'un outil sous forme de carte riche.
 *
 * `onQuickReply` (optionnel) permet aux cartes d'action (confirmation en
 * attente) d'offrir un vrai bouton « Oui »/« Non » plutôt que de forcer
 * l'opérateur à retaper sa réponse : cliquer envoie le même message qu'il
 * aurait tapé, la conversation continue normalement.
 */
export function ArtifactCard({
  artifact,
  onQuickReply,
}: {
  artifact: AgentArtifact
  onQuickReply?: (text: string) => void
}) {
  switch (artifact.kind) {
    case "documents":
      return <DocumentsCard artifact={artifact} />
    case "gauge":
      return <GaugeArtifactCard artifact={artifact} />
    case "navigation":
      return <NavigationCard artifact={artifact} />
    case "chart":
      return <ChartCard artifact={artifact} />
    case "kpi_tiles":
      return <KpiTilesCard artifact={artifact} />
    case "table":
      return <TableCard artifact={artifact} />
    case "phase_pipeline":
      return <PhasePipelineCard artifact={artifact} />
    case "document":
      return <RapportCard artifact={artifact} />
    case "confirmation_attente":
      return <ConfirmationAttenteCard artifact={artifact} onQuickReply={onQuickReply} />
    case "action_executee":
      return <ActionExecuteeCard artifact={artifact} />
    default:
      return null
  }
}

function Shell({
  icon: Icon,
  title,
  tone = "neutral",
  children,
}: {
  icon: typeof CheckCircle2
  title: string
  tone?: "neutral" | "green" | "red" | "amber"
  children: React.ReactNode
}) {
  const tones = {
    neutral: "border-border",
    green: "border-emerald-500/40",
    red: "border-destructive/40",
    amber: "border-amber-500/40",
  }
  const iconTones = {
    neutral: "text-muted-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-destructive",
    amber: "text-amber-600 dark:text-amber-400",
  }
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", tones[tone])}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <Icon className={cn("size-3.5 shrink-0", iconTones[tone])} />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  )
}

function DocumentsCard({ artifact }: { artifact: AgentArtifact }) {
  const passages =
    (artifact.passages as {
      document_nom: string
      page: number | string | null
      citation: string
      score: number
    }[]) ?? []
  return (
    <Shell icon={BookOpen} title="Sources documentaires">
      <ul className="space-y-2">
        {passages.slice(0, 3).map((p, i) => (
          <li key={i} className="text-xs">
            <p className="line-clamp-3 italic text-foreground/80">« {p.citation} »</p>
            <p className="mt-0.5 font-medium text-muted-foreground">
              {p.document_nom}
              {p.page != null && `, p. ${p.page}`}
            </p>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

function GaugeArtifactCard({ artifact }: { artifact: AgentArtifact }) {
  const pct = Number(artifact.valeur_pct ?? 0)
  const objectif = artifact.objectif_pct != null ? Number(artifact.objectif_pct) : null
  return (
    <Shell icon={Gauge} title={String(artifact.title ?? "Jauge")}>
      <div className="flex flex-col items-center gap-1">
        <GaugeDial value={pct / 100} label="" size={140} />
        {objectif != null && (
          <p className="text-xs text-muted-foreground">Objectif {objectif.toFixed(0)} %</p>
        )}
        {artifact.sous_titre != null && (
          <p className="text-xs text-muted-foreground">{String(artifact.sous_titre)}</p>
        )}
      </div>
    </Shell>
  )
}

function NavigationCard({ artifact }: { artifact: AgentArtifact }) {
  const raison = artifact.raison ? String(artifact.raison) : null
  return (
    <Shell icon={Compass} title="Redirection" tone="neutral">
      <p className="text-xs">
        Page ouverte : <span className="font-medium">{String(artifact.label)}</span>
        {raison && <span className="text-muted-foreground"> — {raison}</span>}
      </p>
    </Shell>
  )
}

/**
 * Nova propose une action réelle (création d'OF, envoi) mais ne l'a PAS
 * exécutée : le backend refuse tant que l'opérateur n'a pas répondu depuis un
 * message séparé (voir `agent/tools/confirmation_gate.py`, ce n'est pas qu'une
 * formule de politesse). Rendu volontairement chaleureux et jamais vert : ça
 * n'a rien fait, ça attend un humain.
 */
function ConfirmationAttenteCard({
  artifact,
  onQuickReply,
}: {
  artifact: AgentArtifact
  onQuickReply?: (text: string) => void
}) {
  return (
    <Shell icon={Clock} title="En attente de votre feu vert" tone="amber">
      <div className="space-y-2.5 text-xs">
        <p className="text-foreground/85">{String(artifact.libelle ?? "")}</p>
        <p className="italic text-muted-foreground">Rien n'a été modifié pour l'instant.</p>
        {onQuickReply && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => onQuickReply("Oui, confirme.")}
              className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            >
              <ThumbsUp className="size-3" />
              Oui, vas-y
            </button>
            <button
              onClick={() => onQuickReply("Non, annule.")}
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ThumbsDown className="size-3" />
              Non
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}

/** Une action irréversible/sortante vient réellement de s'exécuter — rendu
 * distinct d'une simple lecture pour que l'opérateur voie que quelque chose
 * de réel vient de se passer sur l'atelier. */
function ActionExecuteeCard({ artifact }: { artifact: AgentArtifact }) {
  return (
    <Shell icon={ShieldCheck} title="Action exécutée" tone="green">
      <p className="text-xs text-foreground/85">{String(artifact.libelle ?? "")}</p>
    </Shell>
  )
}

// --------------------------- Atelier Tunicotex --------------------------- //

const MAX_LIGNES_TABLEAU = 8

function titreAvecDate(artifact: AgentArtifact, defaut: string): string {
  const titre = String(artifact.titre ?? defaut)
  return artifact.date_reference ? `${titre} · ${String(artifact.date_reference)}` : titre
}

function KpiTilesCard({ artifact }: { artifact: AgentArtifact }) {
  const tuiles = (artifact.tuiles as Tuile[] | undefined) ?? []
  return (
    <Shell icon={LayoutGrid} title={titreAvecDate(artifact, "Indicateurs")}>
      <KpiTiles tuiles={tuiles} />
    </Shell>
  )
}

type Cellule = string | number | null

/** Colonne numérique : toutes les cellules sont des nombres, « — » ou commencent par un chiffre. */
function colonneNumerique(lignes: Cellule[][], i: number): boolean {
  const valeurs = lignes.map((l) => l[i]).filter((v) => v != null && v !== "—")
  return valeurs.length > 0 && valeurs.every((v) => typeof v === "number" || /^[-–]?\d/.test(String(v)))
}

function TableCard({ artifact }: { artifact: AgentArtifact }) {
  const colonnes = (artifact.colonnes as string[] | undefined) ?? []
  const lignes = (artifact.lignes as Cellule[][] | undefined) ?? []
  const page = typeof artifact.page === "string" ? artifact.page : null
  const chart = artifact.chart as AgentArtifact | undefined
  const visibles = lignes.slice(0, MAX_LIGNES_TABLEAU)
  const cachees = lignes.length - visibles.length
  const numeriques = colonnes.map((_, i) => colonneNumerique(lignes, i))
  return (
    <Shell icon={Table2} title={titreAvecDate(artifact, "Tableau")}>
      <div className="space-y-2.5">
        {chart && <ChartCard artifact={chart} />}
        {lignes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune ligne.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {colonnes.map((c, i) => (
                    <th
                      key={c}
                      className={cn("px-2 py-1.5 font-medium", numeriques[i] ? "text-right" : "text-left")}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((l, r) => (
                  <tr key={r} className="border-t border-border">
                    {colonnes.map((_, i) => {
                      const texte = l[i] == null ? "—" : String(l[i])
                      return (
                        <td
                          key={i}
                          title={texte}
                          className={cn(
                            "max-w-[9rem] truncate px-2 py-1",
                            numeriques[i] ? "text-right tabular-nums" : "text-left",
                          )}
                        >
                          {texte}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cachees > 0 && <p className="text-xs text-muted-foreground">+{cachees} lignes</p>}
        {page && (
          <Link
            to={`/app/${page}`}
            className="inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Voir l'écran
          </Link>
        )}
      </div>
    </Shell>
  )
}

function PhasePipelineCard({ artifact }: { artifact: AgentArtifact }) {
  const phases = (artifact.phases as PhasePipelineItem[] | undefined) ?? []
  const tailles = artifact.tailles as TaillesPipeline | undefined
  const of = artifact.of as
    | {
        client?: string | null
        article?: string | null
        quantite?: number
        date_export_prevue?: string | null
      }
    | undefined
  const resume = of
    ? [
        of.client,
        of.article,
        of.quantite != null ? `${of.quantite} pièces` : null,
        of.date_export_prevue ? `export ${of.date_export_prevue}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : ""
  return (
    <Shell icon={ListChecks} title={titreAvecDate(artifact, "Avancement")}>
      <div className="space-y-2.5">
        {resume && <p className="text-xs text-muted-foreground">{resume}</p>}
        <PhasePipeline phases={phases} tailles={tailles} />
      </div>
    </Shell>
  )
}

function RapportCard({ artifact }: { artifact: AgentArtifact }) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  async function telecharger() {
    setEnCours(true)
    setErreur(null)
    try {
      await tunicotexApi.telechargerRapport(
        String(artifact.rapport),
        (artifact.parametres as ParametresRapport | undefined) ?? {},
      )
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le téléchargement a échoué.")
    } finally {
      setEnCours(false)
    }
  }
  return (
    <Shell icon={FileText} title="Rapport PDF" tone="green">
      <div className="space-y-2">
        <p className="text-xs font-medium">{String(artifact.titre ?? "Rapport")}</p>
        {artifact.nom_fichier != null && (
          <p className="truncate text-xs text-muted-foreground" title={String(artifact.nom_fichier)}>
            {String(artifact.nom_fichier)}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void telecharger()}
            disabled={enCours}
            className="inline-flex h-7 flex-1 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
          >
            {enCours ? "Téléchargement…" : "Télécharger"}
          </button>
          <Link
            to="/app/rapports"
            className="inline-flex h-7 items-center justify-center rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Ouvrir
          </Link>
        </div>
        {erreur && <p className="text-xs text-destructive">{erreur}</p>}
      </div>
    </Shell>
  )
}
