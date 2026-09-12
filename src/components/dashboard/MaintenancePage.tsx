import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertOctagon,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatDureeHHMMSS } from "@/lib/utils"
import {
  maintenanceApi,
  machinesApi,
  type RisqueMachine,
} from "@/lib/api"
import type { Machine, MaintenanceEventRead } from "@/lib/types"

const TYPE_CONFIG: Record<
  string,
  { label: string; badge: string; icon: typeof Wrench; color: string }
> = {
  PREVENTIVE: {
    label: "Préventive",
    badge:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    icon: ShieldCheck,
    color: "#2563eb",
  },
  CORRECTIVE: {
    label: "Corrective",
    badge:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    icon: Wrench,
    color: "#d97706",
  },
  URGENCE: {
    label: "Urgence",
    badge:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800 font-black",
    icon: AlertOctagon,
    color: "#dc2626",
  },
}

function getTypeMeta(type: string) {
  return (
    TYPE_CONFIG[type] ?? {
      label: type,
      badge: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200",
      icon: Wrench,
      color: "#475569",
    }
  )
}

export function MaintenancePage() {
  const [events, setEvents] = useState<MaintenanceEventRead[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [risques, setRisques] = useState<RisqueMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"registre" | "sante">("registre")

  // Filtres
  const [machineFilter, setMachineFilter] = useState<number | "ALL">("ALL")
  const [typeFilter, setTypeFilter] = useState<string | "ALL">("ALL")
  const [statutFilter, setStatutFilter] = useState<"ALL" | "EN_COURS" | "TERMINEE">("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modal Déclenchement intervention
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMachineId, setModalMachineId] = useState<number>(1)
  const [modalType, setModalType] = useState<string>("PREVENTIVE")
  const [modalDesc, setModalDesc] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Clôture rapide intervention
  const [closingId, setClosingId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([
      maintenanceApi.list().catch(() => [] as MaintenanceEventRead[]),
      machinesApi.list().catch(() => [] as Machine[]),
      maintenanceApi.risques().catch(() => [] as RisqueMachine[]),
    ])
      .then(([mEvents, mMachines, mRisques]) => {
        if (!active) return
        setEvents(mEvents)
        setMachines(mMachines)
        setRisques(mRisques)
        if (mMachines.length > 0 && !modalMachineId) {
          setModalMachineId(mMachines[0].id)
        }
        setErreur(null)
      })
      .catch((err) => {
        if (!active) return
        setErreur(err instanceof Error ? err.message : "Erreur de chargement.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshKey])

  // Filtrage des événements
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (machineFilter !== "ALL" && e.machine_id !== machineFilter) return false
      if (typeFilter !== "ALL" && e.type !== typeFilter) return false
      if (statutFilter === "EN_COURS" && e.end_time !== null) return false
      if (statutFilter === "TERMINEE" && e.end_time === null) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchCode = (e.code_machine || "").toLowerCase().includes(q)
        const matchDesc = (e.description || "").toLowerCase().includes(q)
        const matchType = (e.type || "").toLowerCase().includes(q)
        if (!matchCode && !matchDesc && !matchType) return false
      }
      return true
    })
  }, [events, machineFilter, typeFilter, statutFilter, searchQuery])

  // Calcul des statistiques
  const stats = useMemo(() => {
    const total = events.length
    const enCours = events.filter((e) => e.end_time === null)
    const urgences = events.filter((e) => e.type === "URGENCE").length
    const preventives = events.filter((e) => e.type === "PREVENTIVE").length
    const correctives = events.filter((e) => e.type === "CORRECTIVE").length

    const ratioPreventif = total > 0 ? Math.round((preventives / total) * 100) : 0
    const machinesEnMaint = machines.filter((m) => m.statut === "MAINTENANCE")

    return {
      total,
      enCoursCount: enCours.length,
      urgences,
      preventives,
      correctives,
      ratioPreventif,
      machinesEnMaint,
    }
  }, [events, machines])

  // Déclencher une maintenance
  async function handleLancerMaintenance(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await maintenanceApi.demarrer({
        machine_id: modalMachineId,
        type_maintenance: modalType,
        description: modalDesc.trim() || undefined,
      })
      setModalOpen(false)
      setModalDesc("")
      setRefreshKey((k) => k + 1)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Impossible de lancer la maintenance.")
    } finally {
      setSubmitting(false)
    }
  }

  // Clôturer une maintenance
  async function handleResoudre(machineId: number) {
    if (!window.confirm("Confirmez-vous la fin de cette maintenance et la remise en service de la machine ?")) {
      return
    }
    setClosingId(machineId)
    try {
      await maintenanceApi.resoudre({
        machine_id: machineId,
        commentaire: "Intervention terminée avec succès",
      })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erreur lors de la clôture.")
    } finally {
      setClosingId(null)
    }
  }

  // Ouvrir modal pré-rempli pour une machine spécifique
  function openModalForMachine(mId: number, type = "PREVENTIVE") {
    setModalMachineId(mId)
    setModalType(type)
    setModalOpen(true)
  }

  return (
    <div className="h-full w-full min-h-0 flex flex-col p-3 sm:p-5 gap-3 overflow-y-auto select-none bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ----------------- EN-TÊTE PROFESSIONNEL ----------------- */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="size-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-black dark:text-white leading-none">
              Maintenance & Santé des Équipements
            </h1>
          </div>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1">
            Interventions préventives, correctives, urgences et surveillance de l'état de santé du parc machines
          </p>
        </div>

        {/* Actions principales */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5 mr-1" /> Déclencher une intervention
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Actualiser les données"
            className="border-zinc-300 dark:border-zinc-700 text-black dark:text-white font-bold text-xs h-8 px-2.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin text-blue-600")} />
          </Button>
        </div>
      </div>

      {/* ----------------- 4 CARTES KPI CLAIRES & IMPACTANTES ----------------- */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Interventions */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Total Interventions</div>
            <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">
              {stats.total}
            </div>
            <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
              {stats.preventives} préventives • {stats.correctives} correctives
            </div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Wrench className="size-4.5" />
          </div>
        </div>

        {/* En Cours Actives */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">En Cours Actives</div>
            <div
              className={cn(
                "text-xl sm:text-2xl font-black mt-0.5",
                stats.machinesEnMaint.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
              )}
            >
              {stats.machinesEnMaint.length} machine(s)
            </div>
            <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
              {stats.machinesEnMaint.length > 0
                ? `${stats.machinesEnMaint.map((m) => m.code).join(", ")} à l'arrêt`
                : "Toutes machines opérationnelles"}
            </div>
          </div>
          <div
            className={cn(
              "p-2 rounded-lg",
              stats.machinesEnMaint.length > 0
                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600"
            )}
          >
            <Activity className="size-4.5" />
          </div>
        </div>

        {/* Urgences Déclenchées */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Urgences Critiques</div>
            <div className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
              {stats.urgences}
            </div>
            <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
              Interventions non planifiées
            </div>
          </div>
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600">
            <AlertOctagon className="size-4.5" />
          </div>
        </div>

        {/* Ratio Préventif */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Taux Préventif</div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
              {stats.ratioPreventif}%
            </div>
            <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
              Anticipation des pannes
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600">
            <ShieldCheck className="size-4.5" />
          </div>
        </div>
      </div>

      {erreur && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {erreur}
        </div>
      )}

      {/* ----------------- ONGLETS ET BARRE DE FILTRES ----------------- */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 pt-1">
        {/* Boutons d'onglets */}
        <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("registre")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "registre"
                ? "bg-white dark:bg-zinc-900 text-black dark:text-white shadow-xs font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Clock className="size-3.5" />
            Registre des interventions ({filteredEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sante")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "sante"
                ? "bg-white dark:bg-zinc-900 text-black dark:text-white shadow-xs font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <ShieldAlert className="size-3.5 text-amber-500" />
            Santé & Risques Machines ({risques.length})
          </button>
        </div>

        {/* Filtres contextuels pour le registre */}
        {activeTab === "registre" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Recherche textuelle */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-500" />
              <Input
                type="text"
                placeholder="Rechercher description, code…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7.5 h-8 text-xs font-bold bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Filtre Machine */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-black dark:text-white shadow-2xs">
              <Cpu className="size-3.5 text-zinc-600 dark:text-zinc-400" />
              <select
                value={machineFilter}
                onChange={(e) =>
                  setMachineFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                }
                className="bg-transparent text-black dark:text-white font-bold focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  Toutes machines
                </option>
                {machines.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold"
                  >
                    {m.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre Type */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-black dark:text-white shadow-2xs">
              <Filter className="size-3.5 text-zinc-600 dark:text-zinc-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-black dark:text-white font-bold focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  Tous les types
                </option>
                <option value="PREVENTIVE" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  Préventive
                </option>
                <option value="CORRECTIVE" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  Corrective
                </option>
                <option value="URGENCE" className="bg-white dark:bg-zinc-900 text-black dark:text-white font-bold">
                  Urgence
                </option>
              </select>
            </div>

            {/* Filtre Statut */}
            <div className="flex items-center bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 p-0.5 rounded-lg text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setStatutFilter("ALL")}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer",
                  statutFilter === "ALL"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-700 dark:text-zinc-300 hover:text-black"
                )}
              >
                Toutes
              </button>
              <button
                type="button"
                onClick={() => setStatutFilter("EN_COURS")}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer",
                  statutFilter === "EN_COURS"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-700 dark:text-zinc-300 hover:text-black"
                )}
              >
                En cours
              </button>
              <button
                type="button"
                onClick={() => setStatutFilter("TERMINEE")}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer",
                  statutFilter === "TERMINEE"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-700 dark:text-zinc-300 hover:text-black"
                )}
              >
                Terminées
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- CONTENU PRINCIPAL PAR ONGLET ----------------- */}
      {activeTab === "registre" ? (
        /* TABLEAU DU REGISTRE DES INTERVENTIONS */
        <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12 text-xs font-bold text-zinc-500">
              <Loader2 className="size-5 animate-spin text-blue-600 mr-2" /> Chargement du registre…
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-500">
              <Wrench className="size-10 stroke-[1.5] text-zinc-400 mb-2" />
              <div className="text-xs font-black text-black dark:text-white">
                Aucune intervention ne correspond aux critères
              </div>
              <p className="text-[11px] font-semibold text-zinc-400 mt-1">
                Modifiez vos filtres ou déclenchez une nouvelle intervention.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/60 font-black text-black dark:text-white uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3.5">Machine</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3">Description du motif</th>
                    <th className="py-2.5 px-3">Date Début</th>
                    <th className="py-2.5 px-3">Date Fin / Durée</th>
                    <th className="py-2.5 px-3">Prochaine Échéance</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredEvents.map((e) => {
                    const typeMeta = getTypeMeta(e.type)
                    const TypeIcon = typeMeta.icon
                    const isEnCours = e.end_time === null
                    const startDate = new Date(e.start_time)
                    const endDate = e.end_time ? new Date(e.end_time) : null
                    const dureeSec = endDate
                      ? Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000))
                      : Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 1000))

                    return (
                      <tr
                        key={e.id}
                        className={cn(
                          "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                          isEnCours && "bg-amber-50/50 dark:bg-amber-950/20"
                        )}
                      >
                        {/* Machine */}
                        <td className="py-2.5 px-3.5 font-black text-black dark:text-white font-mono text-xs">
                          {e.code_machine}
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase",
                              typeMeta.badge
                            )}
                          >
                            <TypeIcon className="size-3" />
                            {typeMeta.label}
                          </span>
                        </td>

                        {/* Statut */}
                        <td className="py-2.5 px-3">
                          {isEnCours ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-black animate-pulse">
                              <Activity className="size-3" /> EN COURS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold">
                              <Check className="size-3 text-emerald-600" /> Terminée
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-3 max-w-xs font-semibold text-black dark:text-zinc-200 truncate">
                          {e.description || "Intervention de routine"}
                        </td>

                        {/* Date Début */}
                        <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                          {startDate.toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          <span className="text-[11px] font-bold text-black dark:text-white">
                            {startDate.toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        {/* Date Fin / Durée */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {endDate ? (
                            <div>
                              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                                {endDate.toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="ml-1.5 font-bold font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                                ({formatDureeHHMMSS(dureeSec)})
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold font-mono text-[11px] text-amber-600 dark:text-amber-400">
                              En cours ({formatDureeHHMMSS(dureeSec)})
                            </span>
                          )}
                        </td>

                        {/* Prochaine Échéance */}
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">
                          {e.prochaine_maintenance
                            ? new Date(e.prochaine_maintenance).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {isEnCours && (
                            <Button
                              size="sm"
                              onClick={() => handleResoudre(e.machine_id)}
                              disabled={closingId === e.machine_id}
                              className="h-7 px-2 text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                            >
                              {closingId === e.machine_id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3 mr-1" />
                              )}
                              Clôturer
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ONGLET SANTÉ DES MACHINES & RISQUES PRÉDICTIFS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {risques.map((r) => {
            const machineObj = machines.find((m) => m.id === r.machine_id)
            const isMaintenance = machineObj?.statut === "MAINTENANCE"
            const isPanne = machineObj?.statut === "PANNE"
            const isMarche = machineObj?.statut === "MARCHE"

            // Niveau de risque
            const scorePct = Math.round(r.score * 100)
            const isEleve = r.niveau === "eleve" || r.score >= 0.6
            const isModere = r.niveau === "modere" || (r.score >= 0.3 && r.score < 0.6)

            return (
              <div
                key={r.machine_id}
                className={cn(
                  "flex flex-col justify-between p-4 rounded-xl border-2 bg-white dark:bg-zinc-900 shadow-xs transition-all",
                  isEleve
                    ? "border-red-300 dark:border-red-900/60"
                    : isModere
                    ? "border-amber-300 dark:border-amber-900/60"
                    : "border-zinc-200 dark:border-zinc-800"
                )}
              >
                {/* En-tête machine */}
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-black text-black dark:text-white">
                          {r.code}
                        </span>
                        {isMaintenance ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 uppercase">
                            En maintenance
                          </span>
                        ) : isPanne ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 uppercase">
                            En arrêt / panne
                          </span>
                        ) : isMarche ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase">
                            En marche
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 uppercase">
                            {machineObj?.statut || "Attente"}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {r.nom}
                      </h3>
                    </div>

                    {/* Score de risque */}
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-xs font-black uppercase px-2 py-0.5 rounded border inline-block",
                          isEleve
                            ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400"
                            : isModere
                            ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400"
                        )}
                      >
                        Risque {r.niveau} ({scorePct}%)
                      </div>
                    </div>
                  </div>

                  {/* Indicateurs clés */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-b border-zinc-200 dark:border-zinc-800 text-center">
                    <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="text-[10px] font-bold text-zinc-500">Pannes 7j</div>
                      <div className="text-sm font-black text-black dark:text-white mt-0.5">
                        {r.nb_pannes_7j}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="text-[10px] font-bold text-zinc-500">Temps arrêt 7j</div>
                      <div className="text-xs font-black text-black dark:text-white mt-0.5 font-mono">
                        {formatDureeHHMMSS(Math.floor(r.duree_arret_7j_s))}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="text-[10px] font-bold text-zinc-500">Dernière maint.</div>
                      <div className="text-xs font-black text-black dark:text-white mt-0.5">
                        {r.jours_depuis_maintenance !== null
                          ? `${r.jours_depuis_maintenance} j`
                          : "Jamais"}
                      </div>
                    </div>
                  </div>

                  {/* Recommandation IA */}
                  <div className="py-2.5">
                    <div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1">
                      <Shield className="size-3 text-blue-600" /> Recommandation IA Nova
                    </div>
                    <p className="text-xs font-bold text-black dark:text-white mt-1 leading-snug">
                      {r.recommandation}
                    </p>
                  </div>
                </div>

                {/* Bouton d'action */}
                <div className="pt-2">
                  {isMaintenance ? (
                    <Button
                      onClick={() => handleResoudre(r.machine_id)}
                      disabled={closingId === r.machine_id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-8 cursor-pointer shadow-xs"
                    >
                      {closingId === r.machine_id ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="size-3.5 mr-1" />
                      )}
                      Clôturer et redémarrer
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openModalForMachine(r.machine_id, isEleve ? "PREVENTIVE" : "PREVENTIVE")}
                      className="w-full bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black font-black text-xs h-8 cursor-pointer shadow-xs"
                    >
                      <Plus className="size-3.5 mr-1" /> Planifier maintenance
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ----------------- MODAL PLANIFIER / LANCER INTERVENTION ----------------- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl text-black dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Wrench className="size-5 text-blue-600" />
                <h3 className="text-base font-black">Déclencher une maintenance</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleLancerMaintenance} className="space-y-4 pt-3">
              {/* Machine cible */}
              <div>
                <label className="block text-xs font-bold mb-1 text-zinc-700 dark:text-zinc-300">
                  Machine concernée
                </label>
                <select
                  value={modalMachineId}
                  onChange={(e) => setModalMachineId(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 text-xs font-bold text-black dark:text-white cursor-pointer focus:outline-hidden"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id} className="bg-white dark:bg-zinc-950 font-bold">
                      {m.code} — {m.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type d'intervention */}
              <div>
                <label className="block text-xs font-bold mb-1 text-zinc-700 dark:text-zinc-300">
                  Type d'intervention
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["PREVENTIVE", "CORRECTIVE", "URGENCE"] as const).map((t) => {
                    const isSel = modalType === t
                    const meta = getTypeMeta(t)
                    const Icon = meta.icon
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setModalType(t)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 text-xs font-black transition-all cursor-pointer",
                          isSel
                            ? "border-black dark:border-white bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white shadow-2xs"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                        )}
                      >
                        <Icon className="size-4" style={{ color: meta.color }} />
                        <span>{meta.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold mb-1 text-zinc-700 dark:text-zinc-300">
                  Description / Motif des travaux
                </label>
                <Input
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  placeholder="Ex: Remplacement joints étanchéité & graissage"
                  className="h-9 text-xs font-bold border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="text-xs font-bold h-8.5 px-3 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-8.5 px-4 cursor-pointer shadow-xs"
                >
                  {submitting ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Check className="size-3.5 mr-1.5" />
                  )}
                  Valider et démarrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
