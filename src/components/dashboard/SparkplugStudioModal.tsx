import { useCallback, useEffect, useState } from "react"
import { Link2, Radio, RefreshCw, Save, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { machinesApi, sparkplugApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type {
  Machine,
  SparkplugDevice,
  SparkplugStatus,
  SparkplugTagMapping,
  TagTransformation,
  TargetKpi,
} from "@/lib/types"

interface SparkplugStudioModalProps {
  open: boolean
  onClose: () => void
  onActionComplete?: () => void
}

const TARGET_KPI_OPTIONS: { value: TargetKpi; label: string }[] = [
  { value: "STATUT_MACHINE", label: "État machine" },
  { value: "CAUSE_ARRET", label: "Cause d'arrêt" },
  { value: "BONNES_PIECES", label: "Compteur de pièces bonnes (total)" },
  { value: "REJETS", label: "Compteur de rebuts (total)" },
  { value: "CAUSE_REBUT", label: "Cause de rebut" },
  { value: "CADENCE", label: "Cadence (unités / min)" },
  { value: "TEMPERATURE", label: "Température (°C)" },
  { value: "PUISSANCE", label: "Puissance (kW)" },
  { value: "OPERATOR_CARD", label: "Badge opérateur (qualification d'arrêt)" },
]

const TRANSFORMATION_OPTIONS: { value: TagTransformation; label: string }[] = [
  { value: "DIRECT", label: "Directe (valeur brute)" },
  { value: "SCALE_FACTOR", label: "Facteur d'échelle (× paramètre)" },
  { value: "THRESHOLD_STATE", label: "Seuil (> paramètre → MARCHE)" },
  { value: "OPERATOR_CARD", label: "Code badge opérateur" },
]

/** Les dates backend sont en UTC naïf (sans « Z ») : on les lit comme UTC. */
function formatHeure(value: string | null): string {
  if (!value) return "—"
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })
}

function formatValeur(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "number") return value.toLocaleString("fr-FR")
  if (typeof value === "boolean") return value ? "vrai" : "faux"
  return String(value)
}

/** Studio des automates Sparkplug B : état du broker, registre des devices,
 * rattachement aux machines MES et règles tag → KPI. Lecture pour tous les
 * utilisateurs de la supervision ; modifications réservées à l'administrateur. */
export function SparkplugStudioModal({ open, onClose, onActionComplete }: SparkplugStudioModalProps) {
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false
  const [status, setStatus] = useState<SparkplugStatus | null>(null)
  const [devices, setDevices] = useState<SparkplugDevice[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<SparkplugTagMapping | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Chargements indépendants : l'échec du registre des devices ne doit pas
      // masquer l'état du broker (et inversement).
      const [st, devs, machs] = await Promise.allSettled([
        sparkplugApi.status(),
        sparkplugApi.getDevices(),
        machinesApi.list(),
      ])
      if (st.status === "fulfilled") setStatus(st.value)
      if (machs.status === "fulfilled") setMachines(machs.value)
      if (devs.status === "fulfilled") {
        const liste = devs.value
        setDevices(liste)
        setSelectedId((current) =>
          current != null && liste.some((d) => d.id === current) ? current : (liste[0]?.id ?? null),
        )
      }
      const echec = [st, devs, machs].find((r) => r.status === "rejected")
      if (echec?.status === "rejected") {
        const e = echec.reason
        setFeedback({
          ok: false,
          text: `Chargement partiel : ${e instanceof Error ? e.message : "erreur inconnue"}`,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  if (!open) return null

  const device = devices.find((d) => d.id === selectedId) ?? null
  const machinesLibres = machines.filter(
    (m) => m.id === device?.machine_id || !devices.some((d) => d.machine_id === m.id),
  )

  async function run(action: () => Promise<unknown>, succes: string) {
    try {
      await action()
      setFeedback({ ok: true, text: succes })
      setEditing(null)
      await load()
      onActionComplete?.()
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : "Action impossible" })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* En-tête : état réel de la connexion au broker */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-600">
              <Radio className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Automates Sparkplug B</h2>
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
                    status?.connected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700",
                  )}
                >
                  <span className={cn("size-2 rounded-full", status?.connected ? "bg-emerald-500" : "bg-rose-500")} />
                  {status == null ? "État inconnu" : status.connected ? "Broker connecté" : "Broker déconnecté"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {status?.broker ?? "Broker non configuré"} · groupe{" "}
                <span className="font-mono">{status?.group_id ?? "—"}</span> · hôte{" "}
                <span className="font-mono">{status?.host_id ?? "—"}</span>
                {status?.last_error && <span className="text-rose-600"> · {status.last_error}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={cn(
              "mx-6 mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-xs",
              feedback.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800",
            )}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="ml-2 opacity-60 hover:opacity-100" aria-label="Masquer">
              ×
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Registre des devices */}
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-100 p-3 dark:border-zinc-800">
            <p className="px-2 pb-2 text-xs font-semibold text-slate-500">
              Devices ({devices.length})
            </p>
            {devices.length === 0 && (
              <p className="px-2 text-xs text-slate-500">
                Aucun automate n'a encore publié de naissance (DBIRTH) sur ce broker.
              </p>
            )}
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedId(d.id)
                  setEditing(null)
                }}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition",
                  d.id === selectedId ? "bg-orange-50 text-orange-900" : "hover:bg-slate-50 dark:hover:bg-zinc-900",
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", d.online ? "bg-emerald-500" : "bg-slate-300")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono font-semibold">{d.device_id}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {d.edge_node_id} · {d.machine_code ?? "non rattaché"}
                  </span>
                </span>
              </button>
            ))}
          </aside>

          {/* Détail du device sélectionné */}
          <div className="min-w-0 flex-1 space-y-5 overflow-y-auto p-6">
            {!device ? (
              <p className="text-sm text-slate-500">
                Démarrez l'usine simulée (<span className="font-mono">python -m nova_sim run</span>) ou
                raccordez un automate au broker : il apparaîtra ici à sa première naissance.
              </p>
            ) : (
              <>
                <section className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <Info label="Statut" value={device.online ? "En ligne" : "Hors ligne"} />
                  <Info label="Topic" value={`${device.group_id}/${device.edge_node_id}/${device.device_id}`} mono />
                  <Info label="Dernière naissance" value={formatHeure(device.last_birth_at)} />
                  <Info label="Dernière donnée" value={formatHeure(device.last_data_at)} />
                </section>

                <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 p-4 dark:border-zinc-800">
                  <Link2 className="size-4 text-slate-500" />
                  <span className="text-sm font-semibold">Machine MES pilotée</span>
                  {isAdmin ? (
                    <select
                      value={device.machine_id ?? ""}
                      onChange={(e) => {
                        const machineId = e.target.value ? Number(e.target.value) : null
                        void run(
                          () => sparkplugApi.bindMachine(device.id, machineId),
                          machineId == null ? "Automate détaché." : "Automate rattaché.",
                        )
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="">— aucune —</option>
                      {machinesLibres.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.nom}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-sm">{device.machine_code ?? "aucune"}</span>
                  )}
                  <span className="text-xs text-slate-500">
                    Convention : un device nommé comme le code machine est rattaché automatiquement.
                  </span>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">Dernières valeurs reçues</h3>
                  <div className="grid grid-cols-1 gap-1 rounded-xl border border-slate-200/80 p-3 text-xs sm:grid-cols-2 dark:border-zinc-800">
                    {Object.entries(device.last_values ?? {})
                      .filter(([nom]) => !nom.startsWith("Command/Action") && !nom.startsWith("Command/Id"))
                      .map(([nom, valeur]) => (
                        <div key={nom} className="flex justify-between gap-3 border-b border-slate-50 py-1 dark:border-zinc-900">
                          <span className="font-mono text-slate-600 dark:text-zinc-400">{nom}</span>
                          <span className="font-mono font-semibold">{formatValeur(valeur)}</span>
                        </div>
                      ))}
                    {!device.last_values && <p className="text-slate-500">Aucune donnée reçue.</p>}
                  </div>
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold">Règles tag → KPI MES</h3>
                  <p className="mb-2 text-xs text-slate-500">
                    Les compteurs sont des totaux : le MES compte la différence depuis la dernière valeur reçue.
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-800 dark:bg-zinc-900">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Tag automate</th>
                          <th className="px-3 py-2 font-semibold">KPI MES</th>
                          <th className="px-3 py-2 font-semibold">Transformation</th>
                          <th className="px-3 py-2 font-semibold">Paramètre</th>
                          <th className="px-3 py-2 font-semibold">Active</th>
                          {isAdmin && <th className="px-3 py-2 text-right font-semibold">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                        {device.mappings.map((m) =>
                          editing?.id === m.id ? (
                            <tr key={m.id} className="bg-orange-50/40">
                              <td className="px-3 py-2 font-mono">{m.tag_name}</td>
                              <td className="px-3 py-2">
                                <select
                                  value={editing.target_kpi}
                                  onChange={(e) => setEditing({ ...editing, target_kpi: e.target.value as TargetKpi })}
                                  className="w-full rounded border bg-white p-1"
                                >
                                  {TARGET_KPI_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={editing.transformation}
                                  onChange={(e) =>
                                    setEditing({ ...editing, transformation: e.target.value as TagTransformation })
                                  }
                                  className="w-full rounded border bg-white p-1"
                                >
                                  {TRANSFORMATION_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={editing.formula_param ?? ""}
                                  onChange={(e) => setEditing({ ...editing, formula_param: e.target.value || null })}
                                  placeholder="ex. 1.0"
                                  className="w-20 rounded border p-1"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={editing.actif}
                                  onChange={(e) => setEditing({ ...editing, actif: e.target.checked })}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() =>
                                    void run(
                                      () =>
                                        sparkplugApi.updateMapping(device.id, {
                                          tag_name: editing.tag_name,
                                          target_kpi: editing.target_kpi,
                                          transformation: editing.transformation,
                                          formula_param: editing.formula_param,
                                          description: editing.description,
                                          actif: editing.actif,
                                        }),
                                      `Règle « ${editing.tag_name} » enregistrée.`,
                                    )
                                  }
                                  className="mr-1 rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                                  aria-label="Enregistrer"
                                >
                                  <Save className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditing(null)}
                                  className="rounded bg-slate-200 p-1 text-slate-700 hover:bg-slate-300"
                                  aria-label="Annuler"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={m.id} className={cn(!m.actif && "opacity-50")}>
                              <td className="px-3 py-2 font-mono font-medium">{m.tag_name}</td>
                              <td className="px-3 py-2">
                                {TARGET_KPI_OPTIONS.find((o) => o.value === m.target_kpi)?.label ?? m.target_kpi}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-slate-600">{m.transformation}</td>
                              <td className="px-3 py-2 font-mono text-slate-500">{m.formula_param || "—"}</td>
                              <td className="px-3 py-2">{m.actif ? "oui" : "non"}</td>
                              {isAdmin && (
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={() => setEditing(m)}
                                    className="mr-2 font-semibold text-orange-600 hover:text-orange-800"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() =>
                                      void run(
                                        () => sparkplugApi.deleteMapping(device.id, m.id),
                                        `Règle « ${m.tag_name} » supprimée.`,
                                      )
                                    }
                                    className="text-slate-400 hover:text-rose-600"
                                    aria-label={`Supprimer la règle ${m.tag_name}`}
                                  >
                                    <Trash2 className="inline size-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ),
                        )}
                        {device.mappings.length === 0 && (
                          <tr>
                            <td colSpan={isAdmin ? 6 : 5} className="py-6 text-center text-slate-400">
                              Aucune règle : le device n'alimente aucun KPI.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-xs text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/40">
          <span>
            {status ? `${status.edge_nodes} edge node(s) · ${status.commandes_en_attente} commande(s) en attente d'accusé` : ""}
          </span>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() =>
                  void run(
                    async () => {
                      const r = await sparkplugApi.rebirth()
                      return r
                    },
                    "Re-naissance demandée à tous les edge nodes.",
                  )
                }
                disabled={!status?.connected}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                title="NCMD « Node Control/Rebirth » : chaque automate republie son état complet"
              >
                Resynchroniser
              </button>
            )}
            <button
              onClick={() => void load()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Actualiser
            </button>
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-zinc-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("truncate font-semibold", mono && "font-mono")}>{value}</p>
    </div>
  )
}
