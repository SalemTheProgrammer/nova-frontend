import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Factory, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboardData } from "@/hooks/useDashboardData"
import { kpiApi, lignesApi } from "@/lib/api"
import type { LigneProduction } from "@/lib/types"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { ErrorBanner } from "@/components/dashboard/primitives"
import { AnalogGaugesRow } from "@/components/dashboard/AnalogGauge"
import { TrsEvolutionChart } from "@/components/dashboard/TrsEvolutionChart"
import { ArretsDistributionCard } from "@/components/dashboard/ArretsDistributionCard"

const nombre = (v: number, decimales = 0) =>
  v.toLocaleString("fr-FR", { maximumFractionDigits: decimales })

/** Tableau de bord MES : uniquement des valeurs mesurées, aucune donnée de repli. */
export function MesDashboardPage({
  ligneId,
  onChangeLigne,
}: {
  ligneId: number | null
  onChangeLigne?: (id: number | null) => void
}) {
  const { resume, loading, error } = useDashboardData(ligneId)
  const [lignes, setLignes] = useState<LigneProduction[]>([])

  useEffect(() => {
    document.title = "Supervision — Nova"
    lignesApi.list().then(setLignes).catch(() => {})
  }, [])

  const ofActif = resume?.of_actif ?? null

  const bonnes = Number(resume?.quantite_bonne ?? 0)
  const rejets = Number(resume?.quantite_rejetee ?? 0)
  const cible = Number(resume?.production_cible ?? 0)
  const reste = Number(resume?.reste_a_produire ?? 0)
  const avancement = cible > 0 ? Math.min(100, Math.round(((bonnes + rejets) / cible) * 100)) : null
  const tauxRejet = bonnes + rejets > 0 ? (rejets / (bonnes + rejets)) * 100 : 0
  const cadence = Number(resume?.cadence_actuelle_par_min ?? 0)
  const cadenceNominale = Number(resume?.cadence_nominale_par_min ?? 0)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [downloadingBilan, setDownloadingBilan] = useState(false)
  const [bilanSuccess, setBilanSuccess] = useState(false)
  const [bilanError, setBilanError] = useState<string | null>(null)

  const selectedLigne = useMemo(() => lignes.find((l) => l.id === ligneId), [lignes, ligneId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        document.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [isDropdownOpen])

  const handleDownloadBilan = async () => {
    try {
      setDownloadingBilan(true)
      setBilanError(null)
      await kpiApi.downloadBilanPdf(ligneId, ofActif?.id ?? null)
      setBilanSuccess(true)
      setTimeout(() => setBilanSuccess(false), 2500)
    } catch (err) {
      setBilanError(err instanceof Error ? err.message : "Erreur lors de la génération du bilan PDF")
      setTimeout(() => setBilanError(null), 6000)
    } finally {
      setDownloadingBilan(false)
    }
  }

  return (
    // Écran de supervision 100vh sans défilement inutile
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-2.5 p-3 sm:p-4">
        <header className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border/60 pb-3 pt-0.5 min-w-0">
          {/* Ligne & Ordre de fabrication actif */}
          <div className="flex min-w-0 items-center gap-2.5 shrink">
            {/* Sélecteur de ligne haute précision */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-label="Ligne de production"
                className={cn(
                  "group inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-3.5 text-sm font-medium shadow-2xs transition-all",
                  "hover:bg-accent/70 hover:border-border active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-ring/30",
                  isDropdownOpen && "border-ring ring-2 ring-ring/20 bg-accent/60"
                )}
              >
                <Factory className="size-4 text-muted-foreground transition-colors group-hover:text-foreground shrink-0" />
                {selectedLigne ? (
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {selectedLigne.code}
                    </span>
                    <span className="truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px] text-foreground font-medium">
                      {selectedLigne.designation}
                    </span>
                  </span>
                ) : (
                  <span className="text-foreground font-medium whitespace-nowrap">Toutes les lignes</span>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-200 ml-0.5 shrink-0",
                    isDropdownOpen && "rotate-180 text-foreground"
                  )}
                />
              </button>

              {isDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full mt-1.5 z-50 min-w-[260px] sm:min-w-[290px] rounded-xl border border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150"
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    Ligne de production
                  </div>

                  <button
                    type="button"
                    role="option"
                    aria-selected={ligneId === null}
                    onClick={() => {
                      onChangeLigne?.(null)
                      setIsDropdownOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      ligneId === null
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-muted/70 text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500/80" />
                      <span>Toutes les lignes</span>
                    </span>
                    {ligneId === null && <Check className="size-4 text-primary shrink-0" />}
                  </button>

                  {lignes.length > 0 && <div className="my-1 h-px bg-border/60" />}

                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {lignes.map((l) => {
                      const isSelected = l.id === ligneId
                      return (
                        <button
                          key={l.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onChangeLigne?.(l.id)
                            setIsDropdownOpen(false)
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                            isSelected
                              ? "bg-accent text-accent-foreground font-medium"
                              : "hover:bg-muted/70 text-foreground"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {l.code}
                            </span>
                            <span className="truncate text-sm">{l.designation}</span>
                          </div>
                          {isSelected && <Check className="size-4 text-primary shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* OF & Article */}
            {ofActif ? (
              <div className="flex items-center gap-2 min-w-0 shrink">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/25 shrink-0">
                  {ofActif.numero}
                </span>
                <span
                  className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[130px] md:max-w-[200px] lg:max-w-[280px] xl:max-w-[400px]"
                  title={ofActif.article_designation}
                >
                  {ofActif.article_designation}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground font-normal whitespace-nowrap">
                Aucun ordre de fabrication en cours
              </span>
            )}
          </div>

          {/* Indicateurs de flux & production compacts alignés sur une seule ligne */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 whitespace-nowrap">
            {/* Pièces bonnes */}
            <div
              className="flex h-10 items-center gap-1.5 sm:gap-2 rounded-xl border border-border/80 bg-card/90 px-3 sm:px-3.5 text-xs shadow-2xs shrink-0"
              title={ofActif && reste > 0 ? `Reste à produire : ${nombre(reste)}` : undefined}
            >
              <span className="text-muted-foreground text-xs font-medium">Bonnes :</span>
              <span className="font-bold text-foreground tabular-nums text-sm">
                {nombre(bonnes)}
              </span>
              {cible > 0 && (
                <span className="text-muted-foreground font-mono text-xs">/ {nombre(cible)}</span>
              )}
              {avancement != null && (
                <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                  {avancement}%
                </span>
              )}
            </div>

            {/* Cadence */}
            <div className="flex h-10 items-center gap-1.5 sm:gap-2 rounded-xl border border-border/80 bg-card/90 px-3 sm:px-3.5 text-xs shadow-2xs shrink-0">
              <span className="text-muted-foreground text-xs font-medium">Cadence :</span>
              <span className="font-bold text-foreground tabular-nums text-sm">
                {nombre(cadence, 1)}
              </span>
              <span className="text-muted-foreground text-xs">u/min</span>
              {cadenceNominale > 0 && (
                <span className="text-muted-foreground font-mono text-[10.5px]">
                  ({Math.round((cadence / cadenceNominale) * 100)}%)
                </span>
              )}
            </div>

            {/* Rejets */}
            <div className="flex h-10 items-center gap-1.5 sm:gap-2 rounded-xl border border-border/80 bg-card/90 px-3 sm:px-3.5 text-xs shadow-2xs shrink-0">
              <span className="text-muted-foreground text-xs font-medium">Rejets :</span>
              <span className="font-bold text-foreground tabular-nums text-sm">
                {nombre(rejets)}
              </span>
              <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-rose-600 dark:text-rose-400">
                {nombre(tauxRejet, 1)}%
              </span>
            </div>

            {/* Bouton Bilan OF */}
            <button
              type="button"
              onClick={handleDownloadBilan}
              disabled={downloadingBilan}
              title={
                ofActif
                  ? `Générer le Bilan Ordre de Fabrication officiel pour ${ofActif.numero}`
                  : "Générer le Bilan Ordre de Fabrication officiel (PDF)"
              }
              className={cn(
                "group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/90 px-3.5 text-sm font-medium shadow-2xs transition-all",
                "hover:bg-accent/70 hover:border-border active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-ring/30",
                "disabled:pointer-events-none disabled:opacity-50",
                bilanSuccess && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {downloadingBilan ? (
                <>
                  <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                  <span>Génération...</span>
                </>
              ) : bilanSuccess ? (
                <>
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Téléchargé</span>
                </>
              ) : (
                <>
                  <FileText className="size-4 text-muted-foreground transition-colors group-hover:text-foreground shrink-0" />
                  <span>Bilan OF</span>
                </>
              )}
            </button>
          </div>
        </header>

        <ErrorBanner message={bilanError ?? error} />

        {loading && !resume ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* 1. 5 Jauges Analogiques Alignées (TRS, Disponibilité, Performance, TRG, TRE) */}
            <section className="shrink-0">
              <AnalogGaugesRow resume={resume} />
            </section>

            {/* 3. Évolution TRS temps réel (devices) & Distribution des arrêts */}
            <section className="min-h-0 flex-1 grid grid-cols-1 gap-2.5 lg:grid-cols-2 pb-1">
              <TrsEvolutionChart
                ligneId={ligneId}
                trsGlobalActuel={resume?.trs_global}
                disponibiliteActuelle={resume?.disponibilite}
                performanceActuelle={resume?.performance}
                qualiteActuelle={resume?.qualite}
                className="h-full min-h-0"
              />

              <ArretsDistributionCard resume={resume} className="h-full min-h-0" />
            </section>
          </>
        )}
      </div>
    </div>
  )
}
