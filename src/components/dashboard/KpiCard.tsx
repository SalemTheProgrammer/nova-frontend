import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/dashboard/primitives"

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "neutral",
}: {
  label: string
  value: string
  sublabel?: string
  icon?: LucideIcon
  tone?: "neutral" | "green" | "amber" | "red"
}) {
  const toneClass = {
    neutral: "text-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-destructive",
  }[tone]

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p className={cn("text-2xl font-semibold tabular-nums", toneClass)}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
    </Card>
  )
}
