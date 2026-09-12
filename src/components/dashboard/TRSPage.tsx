import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Layers } from "lucide-react"
import { kpiApi, lignesApi, machinesApi, ordresApi } from "@/lib/api"
import type { LigneProduction, Machine, OrdreFabrication, TRSRead } from "@/lib/types"
import { EmptyState, ErrorBanner, Field, Page, Select } from "@/components/dashboard/primitives"
import { TRSBreakdown } from "@/components/dashboard/TRSBreakdown"

type Scope = "machine" | "ligne" | "of"

export function TRSPage({ ligneId }: { ligneId: number | null }) {
  const [scope, setScope] = useState<Scope>("machine")
  const [machines, setMachines] = useState<Machine[]>([])
  const [lignes, setLignes] = useState<LigneProduction[]>([])
  const [ordres, setOrdres] = useState<OrdreFabrication[]>([])
  const [id, setId] = useState<number | null>(null)
  const [trs, setTrs] = useState<TRSRead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    machinesApi.list(ligneId ?? undefined).then(setMachines).catch(() => {})
    lignesApi.list().then(setLignes).catch(() => {})
    ordresApi.list().then(setOrdres).catch(() => {})
  }, [ligneId])

  useEffect(() => {
    const options =
      scope === "machine" ? machines.map((m) => m.id) : scope === "ligne" ? lignes.map((l) => l.id) : ordres.map((o) => o.id)
    setId((current) => (current != null && options.includes(current) ? current : (options[0] ?? null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, machines, lignes, ordres])

  useEffect(() => {
    if (id == null) {
      setTrs(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    kpiApi
      .trs(scope, id)
      .then((r) => !cancelled && setTrs(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [scope, id])

  const options =
    scope === "machine"
      ? machines.map((m) => ({ id: m.id, label: `${m.code} — ${m.nom}` }))
      : scope === "ligne"
        ? lignes.map((l) => ({ id: l.id, label: `${l.code} — ${l.designation}` }))
        : ordres.map((o) => ({ id: o.id, label: `${o.numero} · ${o.code_article}` }))

  return (
    <Page
      title="TRS & Pertes de Rendement"
      description="Taux de Rendement Synthétique (AFNOR NF E60-182) — calculé à la demande depuis le journal d'événements."
      actions={
        <Link
          to="/app/afnor"
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors shadow-xs"
        >
          <Layers className="size-3.5" />
          Décomposition Norme AFNOR (NF E 60-182)
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Périmètre">
          <Select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="w-40">
            <option value="machine">Par machine</option>
            <option value="ligne">Par ligne</option>
            <option value="of">Par ordre de fabrication</option>
          </Select>
        </Field>
        <Field label="Sélection">
          <Select
            value={id ?? ""}
            onChange={(e) => setId(e.target.value ? Number(e.target.value) : null)}
            className="w-64"
          >
            {options.length === 0 && <option value="">Aucune option</option>}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Calcul en cours…" />
      ) : !trs ? (
        <EmptyState message="Aucune donnée TRS disponible pour cette sélection." />
      ) : (
        <TRSBreakdown trs={trs} />
      )}
    </Page>
  )
}
