import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Compass,
  Factory,
  FileText,
  FlaskConical,
  Gauge,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ChartCard } from "@/components/agent/ChartCard"
import type {
  AgentArtifact,
  BesoinArtifact,
  LigneScoreArtifact,
  RisqueMachineArtifact,
} from "@/lib/types"

/** Rend l'artifact structuré d'un outil sous forme de carte riche. */
export function ArtifactCard({ artifact }: { artifact: AgentArtifact }) {
  switch (artifact.kind) {
    case "faisabilite":
      return <FaisabiliteCard artifact={artifact} />
    case "of_cree":
      return <OFCreeCard artifact={artifact} />
    case "documents":
      return <DocumentsCard artifact={artifact} />
    case "trs":
      return <TRSCard artifact={artifact} />
    case "lignes_score":
      return <LignesScoreCard artifact={artifact} />
    case "rapport":
      return <RapportCard artifact={artifact} />
    case "risque":
      return <RisqueCard artifact={artifact} />
    case "navigation":
      return <NavigationCard artifact={artifact} />
    case "chart":
      return <ChartCard artifact={artifact} />
    case "whatif":
      return <WhatifCard artifact={artifact} />
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

function FaisabiliteCard({ artifact }: { artifact: AgentArtifact }) {
  const faisable = Boolean(artifact.faisable)
  const besoins = (artifact.besoins as BesoinArtifact[] | undefined) ?? []
  return (
    <Shell
      icon={faisable ? CheckCircle2 : XCircle}
      title={faisable ? "Fabrication possible" : "Stock insuffisant"}
      tone={faisable ? "green" : "red"}
    >
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-1.5 pr-2 font-medium">Matière</th>
            <th className="pb-1.5 pr-2 text-right font-medium">Requis</th>
            <th className="pb-1.5 pr-2 text-right font-medium">Dispo</th>
            <th className="pb-1.5 text-right font-medium">Manque</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {besoins.map((b) => (
            <tr key={b.code} className="border-t border-border/60">
              <td className="py-1.5 pr-2">
                <span className="font-medium">{b.code}</span>
                <span className="ml-1 hidden text-muted-foreground sm:inline">
                  {b.designation}
                </span>
              </td>
              <td className="py-1.5 pr-2 text-right">
                {b.requis} {b.unite}
              </td>
              <td className="py-1.5 pr-2 text-right">{b.disponible}</td>
              <td
                className={cn(
                  "py-1.5 text-right",
                  b.suffisant ? "text-emerald-600 dark:text-emerald-400" : "font-semibold text-destructive",
                )}
              >
                {b.suffisant ? "—" : b.manquant}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  )
}

function OFCreeCard({ artifact }: { artifact: AgentArtifact }) {
  const consommations =
    (artifact.consommations as { code_mp: string; numero_lot: string; quantite: string }[]) ?? []
  return (
    <Shell icon={ClipboardList} title={`Ordre de fabrication ${artifact.numero}`} tone="green">
      <div className="space-y-1.5 text-xs">
        <p>
          <span className="text-muted-foreground">Lot produit : </span>
          <span className="font-mono font-medium">{String(artifact.lot_produit ?? "—")}</span>
        </p>
        {artifact.date_fin_prevue != null && (
          <p>
            <span className="text-muted-foreground">Fin prévue : </span>
            {String(artifact.date_fin_prevue)}
          </p>
        )}
        {consommations.length > 0 && (
          <div>
            <p className="mb-1 text-muted-foreground">Généalogie (FEFO) :</p>
            <ul className="space-y-0.5 font-mono">
              {consommations.map((c, i) => (
                <li key={i}>
                  {c.code_mp} ← lot {c.numero_lot} : {c.quantite}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Shell>
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

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  const tone = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right font-medium tabular-nums">{pct}%</span>
    </div>
  )
}

function TRSCard({ artifact }: { artifact: AgentArtifact }) {
  return (
    <Shell icon={Gauge} title={`TRS — ${String(artifact.libelle ?? "")}`}>
      <div className="space-y-1.5">
        <MetricBar label="TRS" value={Number(artifact.trs ?? 0)} />
        <MetricBar label="Disponibilité" value={Number(artifact.do ?? 0)} />
        <MetricBar label="Performance" value={Number(artifact.tp ?? 0)} />
        <MetricBar label="Qualité" value={Number(artifact.tq ?? 0)} />
      </div>
    </Shell>
  )
}

function LignesScoreCard({ artifact }: { artifact: AgentArtifact }) {
  const lignes = (artifact.lignes as LigneScoreArtifact[] | undefined) ?? []
  return (
    <Shell icon={Factory} title="Classement des lignes de production">
      <ul className="space-y-2">
        {lignes.map((l, i) => (
          <li key={l.ligne_id} className="text-xs">
            <div className="mb-0.5 flex items-center justify-between">
              <span className={cn("font-medium", i === 0 && "text-emerald-600 dark:text-emerald-400")}>
                {i === 0 && "★ "}
                {l.code} — {l.designation}
              </span>
              <span className="font-semibold tabular-nums">{Math.round(l.score * 100)}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className={cn("h-1.5 rounded-full", i === 0 ? "bg-emerald-500" : "bg-primary/50")}
                style={{ width: `${Math.round(l.score * 100)}%` }}
              />
            </div>
            <p className="mt-0.5 text-muted-foreground">{l.raison}</p>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

function RapportCard({ artifact }: { artifact: AgentArtifact }) {
  const markdown = String(artifact.markdown ?? "")
  return (
    <Shell icon={FileText} title="Rapport de production">
      <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
        {markdown.replace(/^#{1,3} /gm, "").replace(/\*\*/g, "")}
      </pre>
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

function WhatifCard({ artifact }: { artifact: AgentArtifact }) {
  const of = artifact.of as { numero: string; restant: number } | null
  const repli = artifact.repli as { code: string; designation: string; machines_libres: number } | null
  const retard = artifact.retard ? String(artifact.retard) : null
  const depasse = retard?.includes("DÉPASSÉE") ?? false
  return (
    <Shell
      icon={FlaskConical}
      title={`Simulation — panne ${String(artifact.machine)} (${String(artifact.duree_minutes)} min)`}
      tone={depasse ? "amber" : "neutral"}
    >
      <div className="space-y-1.5 text-xs">
        {artifact.pieces_perdues != null && (
          <p>
            <span className="text-muted-foreground">Production perdue : </span>
            <span className="font-semibold">≈ {String(artifact.pieces_perdues)} pièce(s)</span>
          </p>
        )}
        {of && (
          <p>
            <span className="text-muted-foreground">OF impacté : </span>
            {of.numero} ({of.restant} restantes)
          </p>
        )}
        {retard && (
          <p className={cn(depasse && "font-medium text-amber-600 dark:text-amber-400")}>
            {retard.replace("⚠ ", "")}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Repli : </span>
          {repli
            ? `${repli.code} — ${repli.designation} (${repli.machines_libres} machine(s) libre(s))`
            : "aucune ligne disponible"}
        </p>
        <p className="italic text-muted-foreground">Hypothèse — rien n'a été modifié.</p>
      </div>
    </Shell>
  )
}

function RisqueCard({ artifact }: { artifact: AgentArtifact }) {
  const machines = (artifact.machines as RisqueMachineArtifact[] | undefined) ?? []
  const toneFor = (niveau: string) =>
    niveau === "eleve" ? "text-destructive" : niveau === "modere" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
  return (
    <Shell icon={AlertTriangle} title="Risque de panne (7 jours)">
      <ul className="space-y-2">
        {machines.map((m) => (
          <li key={m.machine_id} className="text-xs">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="font-medium">
                {m.code} <span className="text-muted-foreground">{m.nom}</span>
              </span>
              <span className={cn("font-semibold tabular-nums", toneFor(m.niveau))}>
                {Math.round(m.score * 100)}/100
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  m.niveau === "eleve"
                    ? "bg-red-500"
                    : m.niveau === "modere"
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
                style={{ width: `${Math.round(m.score * 100)}%` }}
              />
            </div>
            <p className="mt-0.5 text-muted-foreground">{m.recommandation}</p>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
