import type { ActiviteEvenement } from "@/lib/types"
import { EVENT_LABEL, EVENT_TONE } from "@/lib/eventLabels"
import { Card, EmptyState } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

const DOT_CLASS: Record<string, string> = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  neutral: "bg-muted-foreground/50",
}

function resume(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  )
  if (entries.length === 0) return ""
  return entries.map(([k, v]) => `${k} = ${v}`).join(" · ")
}

export function ActivityFeed({ evenements }: { evenements: ActiviteEvenement[] }) {
  const items = evenements ?? []
  return (
    <Card className="flex h-full min-h-[420px] flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold">Journal d'activité — toute l'usine</h3>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          En direct
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <EmptyState message="Aucune activité pour le moment." />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((e) => (
              <li
                key={e.id}
                className="animate-in fade-in slide-in-from-top-1 flex items-start gap-3 px-4 py-2.5 text-sm duration-300"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    DOT_CLASS[EVENT_TONE[e.type] ?? "neutral"],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      <span className="text-muted-foreground">{e.code_machine}</span>{" "}
                      {EVENT_LABEL[e.type] ?? e.type}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleTimeString("fr-FR")}
                    </span>
                  </div>
                  {resume(e.payload) && (
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {resume(e.payload)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
