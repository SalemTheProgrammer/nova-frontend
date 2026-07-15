import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Machine } from "@/lib/types"
import { Card, EmptyState, SectionLabel } from "@/components/dashboard/primitives"
import { RingGauge } from "@/components/dashboard/RingGauge"
import { cn } from "@/lib/utils"

const STATUS: Record<string, { label: string; classes: string; priority: number }> = {
  PANNE: { label: "En panne", classes: "bg-red-500/10 text-red-600", priority: 0 },
  MAINTENANCE: { label: "Maintenance", classes: "bg-blue-500/10 text-blue-600", priority: 1 },
  MARCHE: { label: "En marche", classes: "bg-emerald-500/10 text-emerald-600", priority: 2 },
  PAUSE: { label: "En pause", classes: "bg-amber-500/10 text-amber-600", priority: 3 },
  ARRET: { label: "À l'arrêt", classes: "bg-muted text-muted-foreground", priority: 4 },
}

const PAGE_SIZE = 4

/** Vue démo volontairement concise : quatre machines prioritaires à la fois. */
export function ActiveMachinesRow({ machines }: { machines: Machine[] }) {
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [machines])

  const visibleMachines = [...machines].sort(
    (a, b) => (STATUS[a.statut]?.priority ?? 9) - (STATUS[b.statut]?.priority ?? 9),
  )
  const pageCount = Math.max(1, Math.ceil(visibleMachines.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pagedMachines = visibleMachines.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )

  return (
    <Card className="dashboard-panel flex h-full min-h-0 flex-col p-3 shadow-sm">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div>
          <SectionLabel>Machines prioritaires</SectionLabel>
          <p className="dashboard-card-subtitle -mt-1 text-xs text-muted-foreground">
            Anomalies d'abord, puis machines en marche
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            aria-label="Page précédente"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-35"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="min-w-10 text-center text-[11px] text-muted-foreground">
            {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label="Page suivante"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-35"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {visibleMachines.length === 0 ? (
        <EmptyState message="Aucune machine sur ce périmètre." />
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
          {pagedMachines.map((machine) => {
            const trs = Number(machine.trs ?? "0")
            const status = STATUS[machine.statut] ?? {
              label: machine.statut,
              classes: "bg-muted text-muted-foreground",
            }
            return (
              <div
                key={machine.id}
                className="flex min-w-0 flex-col items-center justify-between rounded-xl border border-border p-2"
              >
                <div className="w-full text-center">
                  <p
                    className="truncate text-sm font-semibold text-foreground/90"
                    title={machine.nom}
                  >
                    {machine.nom}
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                      status.classes,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                <RingGauge value={trs} label="TRS" compact className="mt-1 min-h-0 flex-1" />
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
