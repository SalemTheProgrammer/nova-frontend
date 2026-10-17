import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Search } from "lucide-react"
import { Card, Page, Select, TextInput } from "@/components/shared/primitives"
import { PhasePipeline } from "@/components/tunicotex/PhasePipeline"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { Chargement, ErreurDivatex, Vide } from "@/components/tunicotex/EtatsDonnees"
import { useDebounce } from "@/lib/useDebounce"
import { useResource } from "@/lib/useResource"
import {
  formatDateFr,
  tunicotexApi,
  type AvancementOF,
  type OFResume,
  type OFRisque,
} from "@/lib/tunicotex"
import { cn } from "@/lib/utils"

const pct = (f: number): string => `${Math.round(f * 100)} %`

function messageErreur(erreur: string | null): string | undefined {
  if (!erreur || /DIVA injoignable/i.test(erreur)) return undefined
  return erreur
}

function BadgeRisque({ risque }: { risque: OFRisque | undefined }) {
  if (!risque) return null
  const retard = risque.statut === "en_retard"
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        retard
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      )}
    >
      {retard ? "en retard" : "à risque"}
    </span>
  )
}

function MatriceTailles({ d }: { d: AvancementOF }) {
  if (d.tailles.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune lecture par taille.</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Taille
            </th>
            {d.phases.map((p) => (
              <th key={p.phase_id} scope="col" className="px-3 py-2 text-right font-medium">
                {p.nom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.tailles.map(([taille, parPhase]) => (
            <tr key={taille} className="border-t border-border">
              <th scope="row" className="px-3 py-1.5 text-left font-medium">
                {taille}
              </th>
              {d.phases.map((p) => (
                <td key={p.phase_id} className="px-3 py-1.5 text-right tabular-nums">
                  {parPhase[String(p.phase_id)] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailOf({ id, risque }: { id: number; risque: OFRisque | undefined }) {
  const detail = useResource(() => tunicotexApi.of(id), [id])
  const d = detail.data

  if (detail.loading) return <Chargement />
  if (detail.error)
    return (
      <ErreurDivatex onRetry={() => void detail.reload()} message={messageErreur(detail.error)} />
    )
  if (!d) return null
  const o = d.of

  return (
    <div className="space-y-4">
      <Card className="min-w-0 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-all text-base font-bold tracking-tight">{o.numero}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[o.client, o.article].filter(Boolean).join(" · ") || "Client et article inconnus"}
            </p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              {o.quantite} pièces · export prévu {formatDateFr(o.date_export_prevue)} ·{" "}
              {o.ouvert ? "ouvert" : "clos"} · finale {pct(o.avancement_final)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dernière lecture :{" "}
              {d.derniere_lecture ? formatDateFr(d.derniere_lecture) : "aucune lecture"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <BadgeRisque risque={risque} />
            <RapportActions
              type="R5"
              libelle="Rapport OF"
              parametres={{ of_id: o.id }}
              libelles={{ of_id: o.numero }}
            />
          </div>
        </div>
      </Card>

      <Card className="min-w-0 p-4">
        <h3 className="mb-3 text-sm font-medium">Avancement par phase</h3>
        {d.phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune phase.</p>
        ) : (
          <PhasePipeline
            phases={d.phases.map((p) => ({ nom: p.nom, quantite: p.quantite, pct: p.pct }))}
          />
        )}
      </Card>

      <Card className="min-w-0 p-4">
        <h3 className="mb-3 text-sm font-medium">Taille × phase</h3>
        <MatriceTailles d={d} />
      </Card>

      <Card className="min-w-0 p-4">
        <h3 className="mb-2 text-sm font-medium">Chaînes ayant travaillé dessus</h3>
        {d.lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune chaîne.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {d.lignes.map((l) => (
              <li key={l} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                {l}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function OfPage() {
  const [params, setParams] = useSearchParams()
  const idParam = Number(params.get("id"))
  const selection = Number.isFinite(idParam) && idParam > 0 ? idParam : null

  const [saisie, setSaisie] = useState("")
  const q = useDebounce(saisie.trim(), 300)
  const [ouverts, setOuverts] = useState(true)
  const [client, setClient] = useState("")
  const [retardSeul, setRetardSeul] = useState(false)

  // Une seule fois par chargement de page : pas d'appel par ligne.
  const risques = useResource(() => tunicotexApi.commandesARisque(), [])
  const parId = useMemo(() => {
    const m = new Map<number, OFRisque>()
    for (const r of risques.data ?? []) m.set(r.of.id, r)
    return m
  }, [risques.data])

  const resultats = useResource(() => tunicotexApi.rechercherOf(q, ouverts), [q, ouverts])

  const clients = useMemo(() => {
    const noms = new Set<string>()
    for (const o of resultats.data ?? []) if (o.client) noms.add(o.client)
    return [...noms].sort((a, b) => a.localeCompare(b, "fr"))
  }, [resultats.data])

  const risquesIndispo = !!risques.error
  const clientEffectif = clients.includes(client) ? client : ""
  useEffect(() => {
    if (client && !resultats.loading && !clients.includes(client)) setClient("")
  }, [client, clients, resultats.loading])

  const liste = useMemo<OFResume[]>(
    () =>
      (resultats.data ?? []).filter(
        (o) =>
          (!clientEffectif || o.client === clientEffectif) &&
          (!retardSeul || risquesIndispo || parId.get(o.id)?.statut === "en_retard"),
      ),
    [resultats.data, clientEffectif, retardSeul, parId],
  )

  function choisir(id: number) {
    setParams({ id: String(id) })
  }

  return (
    <Page title="Ordres de fabrication" description="Recherche et avancement par phase">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            type="search"
            aria-label="Rechercher un OF"
            placeholder="Numéro d'OF, client, article…"
            className="pl-9"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
        </div>
        <Select
          aria-label="Client"
          className="w-auto max-w-56"
          value={clientEffectif}
          onChange={(e) => setClient(e.target.value)}
        >
          <option value="">Tous les clients</option>
          {clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ouverts} onChange={(e) => setOuverts(e.target.checked)} />
          OF ouverts seulement
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={retardSeul}
            disabled={risques.loading || risquesIndispo}
            onChange={(e) => setRetardSeul(e.target.checked)}
          />
          En retard seulement
        </label>
        {risquesIndispo && (
          <span className="text-xs text-muted-foreground">Statuts de retard indisponibles</span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0">
          {resultats.loading ? (
            <Chargement />
          ) : resultats.error ? (
            <ErreurDivatex
              onRetry={() => void resultats.reload()}
              message={messageErreur(resultats.error)}
            />
          ) : liste.length === 0 ? (
            <Vide raison="Aucun OF ne correspond à la recherche." />
          ) : (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
              {liste.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => choisir(o.id)}
                    aria-current={o.id === selection ? "true" : undefined}
                    className={cn(
                      "block w-full px-3 py-2.5 text-left hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
                      o.id === selection && "bg-accent/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span title={o.numero} className="min-w-0 truncate text-sm font-medium">
                        {o.numero}
                      </span>
                      <BadgeRisque risque={parId.get(o.id)} />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span
                        title={[o.client, o.article].filter(Boolean).join(" · ")}
                        className="min-w-0 truncate"
                      >
                        {[o.client, o.article].filter(Boolean).join(" · ") || "—"}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {o.quantite} p. · {formatDateFr(o.date_export_prevue)} ·{" "}
                        {pct(o.avancement_final)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {selection != null ? (
            <DetailOf id={selection} risque={parId.get(selection)} />
          ) : (
            <Vide raison="Sélectionnez un OF pour voir son avancement." />
          )}
        </div>
      </div>
    </Page>
  )
}
