import { Card } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

function Bone({ className }: { className: string }) {
  return <div className={cn("rounded-md bg-muted", className)} />
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-layout animate-pulse" role="status" aria-label="Chargement du tableau de bord">
      <section className="dashboard-production">
        <div className="dashboard-production-toolbar">
          <div className="space-y-1.5">
            <Bone className="h-3 w-28" />
            <Bone className="h-2.5 w-48" />
          </div>
          <Bone className="h-9 w-full sm:w-80" />
        </div>
        <Card className="dashboard-of-card p-3">
          <Bone className="h-11 w-full" />
          <Bone className="h-9 w-full" />
          <Bone className="h-11 w-full" />
        </Card>
      </section>

      <div className="dashboard-overview-grid">
        {[0, 1].map((item) => (
          <Card key={item} className="dashboard-panel flex h-full min-h-0 flex-col p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Bone className="h-3 w-28" />
                <Bone className="h-2.5 w-40" />
              </div>
              <Bone className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center gap-4">
              <Bone className="size-28 rounded-full" />
              <div className="flex flex-1 gap-2">
                <Bone className="aspect-square flex-1 rounded-full" />
                <Bone className="aspect-square flex-1 rounded-full" />
                <Bone className="aspect-square flex-1 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-secondary-grid">
        <Card className="dashboard-panel flex h-full min-h-0 flex-col p-3">
          <Bone className="mb-3 h-3 w-36" />
          <div className="grid min-h-0 flex-1 grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <Bone key={item} className="h-full min-h-20 rounded-xl" />
            ))}
          </div>
        </Card>
        <Card className="dashboard-panel flex h-full min-h-0 flex-col p-3">
          <Bone className="mb-3 h-3 w-28" />
          <div className="space-y-2">
            <Bone className="h-9 w-full" />
            <Bone className="h-9 w-full" />
            <Bone className="h-9 w-full" />
          </div>
        </Card>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
