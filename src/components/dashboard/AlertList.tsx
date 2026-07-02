import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import type { AlertRead } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

const SEVERITY_ICON = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: AlertCircle,
}

const SEVERITY_CLASS = {
  INFO: "text-blue-600 dark:text-blue-400",
  WARNING: "text-amber-600 dark:text-amber-400",
  CRITICAL: "text-destructive",
}

export function AlertList({ alerts }: { alerts: AlertRead[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Alertes en direct</h3>
      {alerts.length === 0 ? (
        <EmptyState message="Aucune alerte active." />
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => {
            const Icon = SEVERITY_ICON[a.severity]
            return (
              <li key={a.id} className="flex items-start gap-2 text-xs">
                <Icon className={`mt-0.5 size-3.5 shrink-0 ${SEVERITY_CLASS[a.severity]}`} />
                <div>
                  <p className="text-foreground/90">{a.message}</p>
                  <p className="text-muted-foreground">
                    {new Date(a.created_at).toLocaleTimeString("fr-FR")}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
