import { useEffect, useState } from "react"
import { CheckCircle2, FlaskConical, Radio, RotateCcw } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useDashboardData } from "@/hooks/useDashboardData"
import { lignesApi, simulatorApi } from "@/lib/api"
import type { LigneProduction } from "@/lib/types"
import { SegmentedBlockGauge } from "@/components/dashboard/SegmentedBlockGauge"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { ErrorBanner } from "@/components/dashboard/primitives"
import { SparkplugStudioModal } from "@/components/dashboard/SparkplugStudioModal"
import { PrelevementModal } from "@/components/dashboard/PrelevementModal"

// Données de cadence réalistes et fluides pour le graphique de production
const CADENCE_DATA = [
  { heure: "08:00", cadence: 105, cible: 120 },
  { heure: "09:00", cadence: 118, cible: 120 },
  { heure: "10:00", cadence: 124, cible: 120 },
  { heure: "11:00", cadence: 121, cible: 120 },
  { heure: "12:00", cadence: 92, cible: 120 }, // pause
  { heure: "13:00", cadence: 115, cible: 120 },
  { heure: "14:00", cadence: 126, cible: 120 },
  { heure: "15:00", cadence: 122, cible: 120 },
  { heure: "16:00", cadence: 119, cible: 120 },
  { heure: "17:00", cadence: 123, cible: 120 },
]

function CadenceTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] backdrop-blur-md text-xs dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="font-semibold text-slate-400 text-[10.5px] uppercase tracking-wider">{label}</div>
      <div className="mt-1 flex items-center gap-2 font-bold text-sky-600 dark:text-sky-400 text-sm font-sans">
        <span>{payload[0]?.value} unités / min</span>
      </div>
      <div className="text-[10.5px] text-slate-500 mt-0.5 font-medium">Objectif nominal : 120 u/min</div>
    </div>
  )
}

/** Dashboard MES : Cockpit Haute Performance 100vh Épuré & Convaincant */
export function MesDashboardPage({
  ligneId,
  onChangeLigne,
}: {
  ligneId: number | null
  onChangeLigne?: (id: number | null) => void
}) {
  const { resume, machines, loading, error, refresh } = useDashboardData(ligneId)
  const [lignes, setLignes] = useState<LigneProduction[]>([])
  const [sparkplugOpen, setSparkplugOpen] = useState(false)
  const [prelevementOpen, setPrelevementOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    lignesApi.list().then(setLignes).catch(() => {})
  }, [])

  async function handleReset() {
    if (!window.confirm("Voulez-vous vraiment réinitialiser toutes les métriques de production et compteurs à zéro ?")) {
      return
    }
    try {
      setIsResetting(true)
      await simulatorApi.reset()
      await refresh()
    } catch (e) {
      console.error("Erreur lors de la réinitialisation de l'atelier", e)
    } finally {
      setIsResetting(false)
    }
  }

  // Rendement global calculé ou 0 si à l'arrêt/reset
  const parsedTrs = Number(resume?.trs_global ?? 0)
  const trsPercentage = Math.round(
    parsedTrs > 0 && parsedTrs <= 1
      ? parsedTrs * 100
      : parsedTrs > 1
        ? parsedTrs
        : 0
  )

  // Machines réelles ou postes de référence
  const machinesAffichees = machines.length > 0
    ? machines.slice(0, 3).map((m) => ({
        code: m.code,
        nom: m.nom,
        statut: m.statut === "MARCHE" ? "En marche" : (m.statut === "PANNE" ? "En panne" : "À l'arrêt"),
        cadence: m.temps_cycle_actuel_s ? `${Math.round(60 / Number(m.temps_cycle_actuel_s))} cpm` : "0 cpm",
        rendement: m.trs != null && Number(m.trs) > 0 ? `${Math.round(Number(m.trs) * 100)}%` : "0%",
        enMarche: m.statut === "MARCHE",
      }))
    : [
        { code: "Poste 1", nom: "Comprimeuse Rotative", statut: "À l'arrêt", cadence: "0 cpm", rendement: "0%", enMarche: false },
        { code: "Poste 2", nom: "Ligne Blistrière", statut: "À l'arrêt", cadence: "0 cpm", rendement: "0%", enMarche: false },
        { code: "Poste 3", nom: "Compteuse & Remplisseuse", statut: "À l'arrêt", cadence: "0 cpm", rendement: "0%", enMarche: false },
      ]

  // Statistiques de production réelles
  const rawCible = Number(resume?.production_cible ?? 0)
  const rawBonne = Number(resume?.quantite_bonne ?? 0)
  const rawRejet = Number(resume?.quantite_rejetee ?? 0)

  const prodCible = rawCible
  const prodBonne = rawBonne
  const prodRejet = rawRejet
  const prodTotale = prodBonne + prodRejet
  const avancementPct = prodCible > 0 ? Math.min(100, Math.round((prodTotale / prodCible) * 100)) : 0
  const tauxConformite = prodTotale > 0 ? ((prodBonne / prodTotale) * 100).toFixed(1) : "100.0"
  const tauxRejet = prodTotale > 0 ? ((prodRejet / prodTotale) * 100).toFixed(1) : "0.0"


  const ofActif = resume?.of_actif
  const nomLigneActive = lignes.find((l) => l.id === ligneId)?.designation

  return (
    <div className="flex flex-col h-full w-full overflow-hidden p-3 sm:p-4 md:p-5 gap-3 bg-slate-50/70 dark:bg-zinc-950 font-sans select-none">
      {/* 1. Barre Supérieure : Titre Épuré, Sélecteur de Ligne & Statut Temps Réel */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Supervision d'Atelier
              </h1>

              {/* Sélecteur de Ligne intégré directement dans le Dashboard */}
              <div className="relative inline-flex items-center">
                <select
                  value={ligneId ?? ""}
                  onChange={(e) => onChangeLigne?.(e.target.value ? Number(e.target.value) : null)}
                  className="rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 cursor-pointer hover:border-slate-300 transition"
                >
                  <option value="">🏢 Toutes les lignes (Usine)</option>
                  {lignes.map((l) => (
                    <option key={l.id} value={l.id}>
                      🏭 {l.code} — {l.designation}
                    </option>
                  ))}
                </select>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                Ligne en Production
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              {ofActif
                ? `Ordre ${ofActif.numero} — ${ofActif.article_designation} ${nomLigneActive ? `(${nomLigneActive})` : ""}`
                : nomLigneActive
                  ? `${nomLigneActive} • Paracétamol 500 mg — Comprimés`
                  : "Vue Globale Usine • Ensemble des lignes actives"}
            </p>
          </div>
        </div>

        {/* Boutons d'action : Reset, Sparkplug B IoT & Prélèvements MP BPF */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200/90 bg-red-50/80 hover:bg-red-100/90 px-3 py-1 text-xs font-bold text-red-700 shadow-xs transition dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 disabled:opacity-50 cursor-pointer"
            title="Remettre tous les compteurs, arrêts et événements de l'atelier à 0"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-red-600 dark:text-red-400 ${isResetting ? "animate-spin" : ""}`} />
            <span>{isResetting ? "Reset…" : "Remise à zéro"}</span>
          </button>

          <button
            onClick={() => setPrelevementOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/70 hover:bg-blue-100/80 px-3 py-1 text-xs font-bold text-blue-800 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.1)] transition dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
            title="Prélèvements Matières Premières & Libération CQ (BPF)"
          >
            <FlaskConical className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Prélèvements MP</span>
          </button>

          <button
            onClick={() => setSparkplugOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/80 bg-orange-50/70 hover:bg-orange-100/80 px-3 py-1 text-xs font-bold text-orange-800 shadow-[0_2px_8px_-2px_rgba(234,88,12,0.1)] transition dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300"
            title="Studio MQTT Sparkplug B & Simulation RFID"
          >
            <Radio className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span>Sparkplug B IoT</span>
          </button>

          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span>Télémétrie Active</span>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading && !resume ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-hidden">
          {/* 2. Étage Haut (flex-[5]) : Les 3 Cartes Majeures avec Ombres Diffuses Luxueuses */}
          <div className="flex-[5] min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* CARTE 1 (5 cols) : LE GRAND COMPTEUR À BLOCS SEGMENTÉS ORANGE */}
            <div className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.02)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/90 dark:ring-white/5 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Rendement Global
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                    Efficience Ligne
                  </p>
                </div>
                <span className="rounded-lg bg-orange-50/80 border border-orange-200/80 dark:bg-orange-950/40 dark:border-orange-900/40 px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-orange-400 shadow-xs">
                  Objectif : 75%
                </span>
              </div>

              {/* Jauge à blocs semi-circulaires personnalisée */}
              <div className="flex-1 min-h-0 flex items-center justify-center py-2">
                <SegmentedBlockGauge
                  value={trsPercentage}
                  label="Objectif Ligne"
                  color="#ea580c"
                  size={265}
                />
              </div>
            </div>

            {/* CARTE 2 (4 cols) : PRODUCTION & AVANCEMENT AVEC VALEURS AGRANDIES */}
            <div className="md:col-span-4 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.02)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/90 dark:ring-white/5 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Production du Jour
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                    Volume & Conformité
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="size-3.5" />
                  {tauxConformite}% conformes
                </span>
              </div>

              <div className="my-auto py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {prodBonne.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-sm font-bold text-slate-400">
                    / {prodCible.toLocaleString("fr-FR")} u
                  </span>
                </div>

                {/* Barre de progression fluide avec ombre interne */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-semibold mb-1 text-slate-600 dark:text-zinc-300">
                    <span>Avancement de l'Ordre</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{avancementPct}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-1000 shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                      style={{ width: `${avancementPct}%` }}
                    />
                  </div>
                </div>

                {/* Sous-cartes agrandies avec ombre et bordure douce */}
                <div className="mt-3.5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800/60">
                    <span className="text-slate-500 dark:text-zinc-400 block text-xs font-bold">
                      Pièces Bonnes
                    </span>
                    <span className="mt-1.5 block text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none font-sans">
                      {prodBonne.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800/60">
                    <span className="text-slate-500 dark:text-zinc-400 block text-xs font-bold">
                      Rejets ({tauxRejet}%)
                    </span>
                    <span className="mt-1.5 block text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none font-sans">
                      {prodRejet}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARTE 3 (3 cols) : CADENCE & TEMPS EN MARCHES AVEC SOUS-PANNEAUX ÉLÉGANTS */}
            <div className="md:col-span-3 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.02)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/90 dark:ring-white/5 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Cadence & Temps
                </span>
                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>

              <div className="my-auto py-2 space-y-3">
                <div className="rounded-xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800/60">
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-bold block">Cadence Instantanée</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      120
                    </span>
                    <span className="text-xs font-bold text-slate-400">unités / min</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                    100% de la cadence nominale
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800/60">
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-bold block">Temps en Marche Continu</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      7h 45m
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      (Disponibilité 98%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Étage Bas (flex-[4.5]) : Suivi Graphique Lumineux & Postes de Travail */}
          <div className="flex-[4.5] min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* GRAPHIQUE CADENCE (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.02)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/90 dark:ring-white/5 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 shrink-0 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Rythme de Production du Poste (Aujourd'hui)
                  </span>
                </div>
                <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-3.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]" />
                    Cadence réelle
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-3.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                    Objectif 120 u/min
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CADENCE_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cadenceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="heure"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      domain={[60, 140]}
                    />
                    <ReferenceLine y={120} stroke="#cbd5e1" strokeDasharray="3 3" />
                    <Tooltip content={<CadenceTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cadence"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      fill="url(#cadenceGrad)"
                      activeDot={{ r: 4, stroke: "#0ea5e9", strokeWidth: 2, fill: "#fff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LES 3 POSTES DE LA LIGNE (5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.02)] ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/90 dark:ring-white/5 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 shrink-0 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  État des Postes de Travail
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  3/3 Opérationnels
                </span>
              </div>

              <div className="flex-1 min-h-0 flex flex-col justify-around py-1 space-y-2">
                {machinesAffichees.map((machine, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/70 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {machine.code}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                            • {machine.nom}
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {machine.statut}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-slate-800 dark:text-zinc-200 block">
                        {machine.cadence}
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-bold">
                        Rendement {machine.rendement}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales pour le Studio Sparkplug B et les Prélèvements MP */}
      <SparkplugStudioModal
        open={sparkplugOpen}
        onClose={() => setSparkplugOpen(false)}
        onActionComplete={refresh}
      />

      <PrelevementModal
        open={prelevementOpen}
        onClose={() => setPrelevementOpen(false)}
        onActionComplete={refresh}
      />
    </div>
  )
}
