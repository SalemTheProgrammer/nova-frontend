import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Liste à gauche, détail à droite. Bascule sur une colonne quand la zone fait moins
 * de 900 px (petit écran ou panneau Nova ouvert) : les deux moitiés se partagent alors
 * la hauteur. `detail` absent → la liste prend toute la largeur.
 */
export function MaitreDetail({
  maitre,
  detail,
  colonnes = "@min-[900px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
}: {
  maitre: ReactNode
  detail?: ReactNode
  /** Classe de grille deux colonnes (requête de conteneur). */
  colonnes?: string
}) {
  return (
    <div className="@container min-w-0 lg:min-h-0 lg:flex-1">
      <div
        className={cn(
          "grid min-w-0 gap-3 lg:h-full lg:auto-rows-[minmax(0,1fr)]",
          detail != null && colonnes,
        )}
      >
        {maitre}
        {detail}
      </div>
    </div>
  )
}
