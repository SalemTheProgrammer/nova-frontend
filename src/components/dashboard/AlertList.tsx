import { AlertCircle, AlertTriangle, BellOff, Info } from "lucide-react"
import type { AlertRead } from "@/lib/types"
import { Card } from "@/components/dashboard/primitives"

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
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Alertes en direct</h3>
        {alerts.length > 0 && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{alerts.length}</span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {alerts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <BellOff className="size-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs">Aucune alerte active — tout est nominal.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {alerts.map((a) => {
              const Icon = SEVERITY_ICON[a.severity]
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-xs hover:bg-accent/50"
                >
                  <Icon className={`mt-0.5 size-3.5 shrink-0 ${SEVERITY_CLASS[a.severity]}`} />
                  <div className="min-w-0">
                    <p className="text-foreground/90">{a.message}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleTimeString("fr-FR")}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
