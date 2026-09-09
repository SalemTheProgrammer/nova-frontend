import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { kpiApi, lignesApi, machinesApi, ordresApi, simulatorApi } from "@/lib/api"
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
  const [isResetting, setIsResetting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleReset() {
    if (!window.confirm("Voulez-vous vraiment réinitialiser toutes les métriques de production et compteurs à zéro ?")) {
      return
    }
    try {
      setIsResetting(true)
      setError(null)
      await simulatorApi.reset()
      setSuccessMsg("Atelier et compteurs remis à 0 avec succès.")
      setTimeout(() => setSuccessMsg(null), 4000)

      const [mList, lList, oList] = await Promise.all([
        machinesApi.list(ligneId ?? undefined),
        lignesApi.list(),
        ordresApi.list(),
      ])
      setMachines(mList)
      setLignes(lList)
      setOrdres(oList)
      if (id != null) {
        const r = await kpiApi.trs(scope, id)
        setTrs(r)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la remise à zéro.")
    } finally {
      setIsResetting(false)
    }
  }


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
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
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

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200/90 bg-red-50/80 px-3.5 py-2 text-xs font-bold text-red-700 shadow-xs hover:bg-red-100 hover:border-red-300 transition disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 cursor-pointer"
          title="Réinitialiser tous les compteurs, arrêts et événements de l'atelier à 0"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
          <span>{isResetting ? "Réinitialisation…" : "Remise à zéro (Reset)"}</span>
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          ✓ {successMsg}
        </div>
      )}

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
