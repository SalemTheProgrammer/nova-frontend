import React, { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CreditCard,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  X,
  Zap,
} from "lucide-react"
import { sparkplugApi } from "@/lib/api"
import type {
  SparkplugDevice,
  SparkplugTagMapping,
  TagTransformation,
  TargetKpi,
} from "@/lib/types"

interface SparkplugStudioModalProps {
  open: boolean
  onClose: () => void
  onActionComplete?: () => void
}

const CARTE_OPTIONS = [
  {
    code: "CARTE_REGLAGE",
    label: "Réglage Machine",
    icon: "🔧",
    cause: "REGLAGE_MACHINE",
    color: "border-amber-400/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20",
  },
  {
    code: "CARTE_PANNE_MECA",
    label: "Panne Mécanique",
    icon: "⚙️",
    cause: "PANNE_MECANIQUE",
    color: "border-rose-400/40 bg-rose-500/10 text-rose-900 hover:bg-rose-500/20",
  },
  {
    code: "CARTE_PANNE_ELEC",
    label: "Panne Électrique",
    icon: "⚡",
    cause: "PANNE_ELECTRIQUE",
    color: "border-purple-400/40 bg-purple-500/10 text-purple-900 hover:bg-purple-500/20",
  },
  {
    code: "CARTE_CHANGEMENT_SERIE",
    label: "Changement Série",
    icon: "🔄",
    cause: "CHANGEMENT_SERIE",
    color: "border-blue-400/40 bg-blue-500/10 text-blue-900 hover:bg-blue-500/20",
  },
  {
    code: "CARTE_NETTOYAGE",
    label: "Nettoyage BPF",
    icon: "🧹",
    cause: "NETTOYAGE",
    color: "border-teal-400/40 bg-teal-500/10 text-teal-900 hover:bg-teal-500/20",
  },
  {
    code: "CARTE_REPRISE",
    label: "Reprise Production",
    icon: "▶️",
    cause: "FIN_ARRET",
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 hover:bg-emerald-500/20 font-bold",
  },
]

const TARGET_KPI_OPTIONS: { value: TargetKpi; label: string }[] = [
  { value: "BONNES_PIECES", label: "Bonnes pièces produites" },
  { value: "REJETS", label: "Rejets / rebuts" },
  { value: "CADENCE", label: "Cadence (coups / min)" },
  { value: "STATUT_MACHINE", label: "Statut machine (Marche/Arrêt)" },
  { value: "TEMPERATURE", label: "Température capteur (°C)" },
  { value: "VIBRATION", label: "Vibration capteur (mm/s)" },
  { value: "OPERATOR_CARD", label: "Badge RFID Opérateur (Arret/Reprise)" },
]

const TRANSFORMATION_OPTIONS: { value: TagTransformation; label: string }[] = [
  { value: "DIRECT", label: "Directe (valeur brute)" },
  { value: "SCALE_FACTOR", label: "Facteur d'échelle (multiplication)" },
  { value: "THRESHOLD_STATE", label: "Seuil binaire (supérieur à X -> Marche)" },
  { value: "OPERATOR_CARD", label: "Code carte opérateur RFID" },
]

export const SparkplugStudioModal: React.FC<SparkplugStudioModalProps> = ({
  open,
  onClose,
  onActionComplete,
}) => {
  const [activeTab, setActiveTab] = useState<"demo" | "mappings">("demo")
  const [device, setDevice] = useState<SparkplugDevice | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const [editingMapping, setEditingMapping] = useState<Partial<SparkplugTagMapping> | null>(null)

  const chargerDevice = async () => {
    try {
      const devices = await sparkplugApi.getDevices()
      if (devices && devices.length > 0) {
        setDevice(devices[0])
      }
      const st = await sparkplugApi.status()
      setIsStreaming(st.is_streaming)
    } catch (err) {
      console.error("Erreur chargement device Sparkplug B", err)
    }
  }

  useEffect(() => {
    if (open) {
      void chargerDevice()
    }
  }, [open])

  if (!open) return null

  const handleToggleStream = async () => {
    try {
      if (isStreaming) {
        await sparkplugApi.stopStream()
        setIsStreaming(false)
        setLastFeedback("Flux de télémétrie Sparkplug B arrêté")
      } else {
        await sparkplugApi.startStream()
        setIsStreaming(true)
        setLastFeedback("Flux continu actif : émission DDATA toutes les 2s")
      }
      onActionComplete?.()
    } catch {
      setLastFeedback("Erreur lors de la modification du flux")
    }
  }

  const handleTriggerUnplannedStop = async () => {
    try {
      await sparkplugApi.unplannedStop()
      setLastFeedback(
        `Arrêt non planifié détecté ! Cadence: 0 CPM -> Statut: ARRET (MICRO_ARRET)`
      )
      await chargerDevice()
      onActionComplete?.()
    } catch {
      setLastFeedback("Erreur lors du déclenchement de l'arrêt")
    }
  }

  const handleSwipeCard = async (cardCode: string, cardLabel: string) => {
    try {
      await sparkplugApi.swipeCard(cardCode)
      setLastFeedback(`Carte "${cardLabel}" scannée via MQTT tag DigitalIn/OperatorCard`)
      await chargerDevice()
      onActionComplete?.()
    } catch {
      setLastFeedback("Erreur lors du scan de la carte")
    }
  }

  const handleSendDbirth = async () => {
    try {
      await sparkplugApi.birth()
      setLastFeedback("Trame DBIRTH envoyée : catalogue de métriques ISO/IEC 20237 synchronisé")
      await chargerDevice()
      onActionComplete?.()
    } catch {
      setLastFeedback("Erreur envoi DBIRTH")
    }
  }

  const handleSaveMapping = async (m: SparkplugTagMapping) => {
    if (!device) return
    try {
      await sparkplugApi.updateMapping(device.id, {
        tag_name: m.tag_name,
        target_kpi: m.target_kpi,
        transformation: m.transformation,
        formula_param: m.formula_param,
        actif: m.actif,
      })
      setLastFeedback(`Règle pour "${m.tag_name}" mise à jour`)
      setEditingMapping(null)
      await chargerDevice()
    } catch {
      setLastFeedback("Erreur enregistrement de la règle")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Sparkplug B MQTT Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-orange-100 text-orange-700 border border-orange-200/60">
                  ISO/IEC 20237
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connecté
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Node:{" "}
                <span className="font-mono text-slate-700">
                  {device?.edge_node_id ?? "Edge_Ligne_01"}
                </span>{" "}
                | Device:{" "}
                <span className="font-mono text-slate-700">
                  {device?.device_id ?? "Automate_Blister_01"}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200/60 bg-white px-6 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("demo")}
            className={`py-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "demo"
                ? "border-orange-600 text-orange-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Zap className="w-4 h-4" />
            Télémétrie Live & Cartes Opérateurs
          </button>
          <button
            onClick={() => setActiveTab("mappings")}
            className={`py-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "mappings"
                ? "border-orange-600 text-orange-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Configuration & Mappage des Tags
          </button>
        </div>

        {/* Notification pill */}
        {lastFeedback && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between shadow-sm animate-in fade-in">
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              {lastFeedback}
            </span>
            <button
              onClick={() => setLastFeedback(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "demo" ? (
            <>
              {/* Live Streaming Controller */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/70 to-amber-50/40 border border-orange-200/60 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                      isStreaming
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Activity className={`w-5 h-5 ${isStreaming ? "animate-pulse" : ""}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Flux Télémétrie Continu (2s)
                    </h3>
                    <p className="text-xs text-slate-600">
                      {isStreaming
                        ? "Émission continue de trames DDATA vers le bus Sparkplug B"
                        : "Le flux automatique est en pause"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendDbirth}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition"
                  >
                    Trame DBIRTH
                  </button>
                  <button
                    onClick={handleToggleStream}
                    className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition ${
                      isStreaming
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-orange-600 hover:bg-orange-700 text-white"
                    }`}
                  >
                    {isStreaming ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Arrêter Flux
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Démarrer Flux
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Unplanned Stoppage Trigger */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Scénario : Détection Arrêt Non Planifié
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl">
                      Simule la situation où le moteur tourne sous tension mais aucune pièce n&apos;est
                      détectée sur le convoyeur. L&apos;IA bascule automatiquement la machine en{" "}
                      <span className="font-semibold text-rose-600">Arrêt Non Planifié</span>.
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerUnplannedStop}
                    className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Simuler Cadence = 0
                  </button>
                </div>
              </div>

              {/* RFID Operator Card Swipes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-700" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Cartes Opérateurs RFID (Qualification Immédiate)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Tag MQTT: <code className="font-mono text-slate-700">DigitalIn/OperatorCard</code>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CARTE_OPTIONS.map((carte) => (
                    <button
                      key={carte.code}
                      onClick={() => handleSwipeCard(carte.code, carte.label)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between group shadow-sm ${carte.color}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xl">{carte.icon}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          RFID
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold">{carte.label}</div>
                        <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">
                          {carte.code}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Mappings Studio */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Règles de Traduction Tags MQTT ➔ KPIs MES
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configurez comment chaque tag Sparkplug B met à jour le cockpit MES.
                  </p>
                </div>
                <button
                  onClick={chargerDevice}
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                  title="Actualiser les métriques"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Tag Automate (MQTT)</th>
                      <th className="py-2.5 px-4 font-semibold">KPI MES Cible</th>
                      <th className="py-2.5 px-4 font-semibold">Transformation</th>
                      <th className="py-2.5 px-4 font-semibold">Paramètre</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {device?.mappings && device.mappings.length > 0 ? (
                      device.mappings.map((m) => {
                        const isEditing = editingMapping?.id === m.id
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-mono font-medium text-slate-900">
                              {m.tag_name}
                            </td>
                            <td className="py-3 px-4">
                              {isEditing ? (
                                <select
                                  value={editingMapping.target_kpi ?? m.target_kpi}
                                  onChange={(e) =>
                                    setEditingMapping({
                                      ...editingMapping,
                                      target_kpi: e.target.value as TargetKpi,
                                    })
                                  }
                                  className="w-full p-1 border rounded text-xs bg-white"
                                >
                                  {TARGET_KPI_OPTIONS.map((kpi) => (
                                    <option key={kpi.value} value={kpi.value}>
                                      {kpi.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-800">
                                  {TARGET_KPI_OPTIONS.find((k) => k.value === m.target_kpi)
                                    ?.label ?? m.target_kpi}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {isEditing ? (
                                <select
                                  value={editingMapping.transformation ?? m.transformation}
                                  onChange={(e) =>
                                    setEditingMapping({
                                      ...editingMapping,
                                      transformation: e.target.value as TagTransformation,
                                    })
                                  }
                                  className="w-full p-1 border rounded text-xs bg-white"
                                >
                                  {TRANSFORMATION_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-600 font-mono text-[11px]">
                                  {m.transformation}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingMapping.formula_param ?? ""}
                                  onChange={(e) =>
                                    setEditingMapping({
                                      ...editingMapping,
                                      formula_param: e.target.value,
                                    })
                                  }
                                  placeholder="ex: 1.0"
                                  className="w-20 p-1 border rounded text-xs"
                                />
                              ) : (
                                m.formula_param || "—"
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveMapping(editingMapping as SparkplugTagMapping)}
                                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingMapping(null)}
                                    className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingMapping(m)}
                                  className="text-orange-600 hover:text-orange-800 font-semibold"
                                >
                                  Modifier
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Aucun mapping configuré. Envoyez une trame DBIRTH pour découvrir les tags.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Broker Sparkplug B: In-Memory / MQTT Port 1883
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
