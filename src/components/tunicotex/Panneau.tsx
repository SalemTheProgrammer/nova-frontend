import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Carte d'écran : en-tête sur une ligne, corps qui défile dans la carte à partir
 * de `lg` (la page, elle, ne défile plus). En dessous de `lg`, le corps est plafonné
 * à 70 % de la hauteur d'écran pour que les longues listes ne déroulent pas la page.
 */
export function Panneau({
  titre,
  compteur,
  action,
  extra,
  className,
  corpsClassName,
  children,
}: {
  titre: ReactNode
  compteur?: number
  action?: { libelle: string; to: string }
  extra?: ReactNode
  className?: string
  corpsClassName?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card",
        className,
      )}
    >
      <header className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2">
        <h2 className="min-w-0 truncate text-sm font-medium">{titre}</h2>
        {compteur != null && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {compteur}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {extra}
          {action && (
            <Link
              to={action.to}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {action.libelle}
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </header>
      <div className={cn("min-h-0 flex-1 overflow-auto max-lg:max-h-[70dvh]", corpsClassName)}>{children}</div>
    </section>
  )
}
