import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Machine, OFActif } from "@/lib/types"

interface MachineStatusStripProps {
  selectedMachine: Machine | null
  machines: Machine[]
  ofActif: OFActif | null
  onSelectMachine: (machine: Machine) => void
  ligneId: number | null
  className?: string
}

export function MachineStatusStrip({
  selectedMachine,
  machines,
  ofActif,
  onSelectMachine,
  ligneId,
  className,
}: MachineStatusStripProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const machineName = selectedMachine?.nom ?? "Compteuse-remplisseuse"
  const machineCode = selectedMachine?.code ?? "Poste 1"
  const isRunning = selectedMachine ? selectedMachine.statut === "MARCHE" : true
  const statusText = isRunning ? "EN PRODUCTION" : (selectedMachine?.statut === "PANNE" ? "EN PANNE" : "À L'ARRÊT")

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/85 bg-white px-3.5 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.03)] shrink-0 dark:border-zinc-800 dark:bg-zinc-900/90",
        className,
      )}
    >
      {/* Gauche : Code Machine + Nom + Mini Vague Sparkline */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-mono text-sm sm:text-base font-black tracking-tight text-amber-500 dark:text-amber-400 shrink-0">
            {machineCode}
          </h2>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200 truncate">
            {machineName}
          </span>
        </div>

        {/* Mini icône de télémétrie oscillante */}
        <div className="hidden sm:flex items-center justify-center rounded-md bg-sky-500/10 px-1.5 py-0.5 border border-sky-500/20">
          <svg width="36" height="14" viewBox="0 0 36 14" fill="none" className="text-sky-500">
            <path
              d="M1 7L5 7L8 1L11 13L15 4L18 10L22 7L27 7L30 3L33 11L35 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Centre : Métadonnées industrielles en ligne avec séparateurs */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
        {/* Statut */}
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 font-bold">|</span>
          <span className="text-slate-400 font-semibold text-[11px]">Statut</span>
          <span
            className={cn(
              "font-black tracking-wider uppercase text-[11px]",
              isRunning ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
            )}
          >
            {statusText}
          </span>
        </div>

        {/* Âge */}
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 font-bold">|</span>
          <span className="text-slate-400 font-semibold text-[11px]">Âge</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
            {selectedMachine ? "18 Mois" : "23 Mois"}
          </span>
        </div>

        {/* Taux de vie / TRS */}
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 font-bold">|</span>
          <span className="text-slate-400 font-semibold text-[11px]">Vie</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
            {selectedMachine?.trs ? `${Math.round(Number(selectedMachine.trs) * 100)}%` : "99.4%"}
          </span>
        </div>

        {/* Dernier Contrôle */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-amber-500 font-bold">|</span>
          <span className="text-slate-400 font-semibold text-[11px]">Dernier Contrôle</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">12-04-2026</span>
        </div>

        {/* Prochaine Inspection */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-amber-500 font-bold">|</span>
          <span className="text-slate-400 font-semibold text-[11px]">Prochaine Insp.</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">21-06-2026</span>
        </div>

        {/* OF Actif */}
        {ofActif && (
          <div className="hidden xl:flex items-center gap-1.5">
            <span className="text-amber-500 font-bold">|</span>
            <span className="text-slate-400 font-semibold text-[11px]">OF</span>
            <span className="font-bold text-sky-600 dark:text-sky-400 text-[11px]">
              {ofActif.numero}
            </span>
          </div>
        )}
      </div>

      {/* Droite : Bouton sélecteur de machine / poste */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all cursor-pointer"
        >
          <span>{selectedMachine ? selectedMachine.code : (ligneId ? `Ligne ${ligneId}` : "Atelier 1")}</span>
          <ChevronDown className={cn("size-3 text-slate-300 transition-transform", dropdownOpen && "rotate-180")} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Sélectionner le poste
            </div>
            {machines.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectMachine(m)
                  setDropdownOpen(false)
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
                  selectedMachine?.id === m.id
                    ? "bg-slate-100 font-bold text-slate-900 dark:bg-zinc-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60",
                )}
              >
                <span className="truncate">
                  <span className="font-mono font-bold mr-1.5 text-amber-500">{m.code}</span>
                  {m.nom}
                </span>
                <span
                  className={cn(
                    "size-1.5 rounded-full ml-2 shrink-0",
                    m.statut === "MARCHE" ? "bg-emerald-500" : "bg-slate-300",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
