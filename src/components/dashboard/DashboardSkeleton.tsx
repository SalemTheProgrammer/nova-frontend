import { Card } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

function Bone({ className }: { className: string }) {
  return <div className={cn("rounded-md bg-muted", className)} />
}

export function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" role="status" aria-label="Chargement du tableau de bord">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="space-y-4 p-5">
            <Bone className="h-4 w-24" />
            <Bone className="h-9 w-32" />
            <Bone className="h-4 w-40" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <Bone className="h-5 w-44" />
          <Bone className="mt-4 h-64 w-full" />
        </Card>
        <Card className="space-y-4 p-5">
          <Bone className="h-5 w-28" />
          {[0, 1, 2].map((item) => (
            <Bone key={item} className="h-11 w-full" />
          ))}
        </Card>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
