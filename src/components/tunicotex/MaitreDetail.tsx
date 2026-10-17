import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Liste à gauche, détail à droite. Bascule sur une colonne quand la zone fait moins
 * de 900 px (petit écran ou panneau Nova ouvert) : les deux moitiés se partagent alors
 * la hauteur. `detail` absent → la liste prend toute la largeur.
 */
export function MaitreDetail({
  maitre,
  detail,
  selection,
  colonnes = "@min-[900px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
}: {
  maitre: ReactNode
  detail?: ReactNode
  /** Élément choisi : quand il change et que le détail est sous la liste, on le fait défiler à l'écran. */
  selection?: string | number | null
  /** Classe de grille deux colonnes (requête de conteneur). */
  colonnes?: string
}) {
  const refDetail = useRef<HTMLDivElement | null>(null)
  const precedente = useRef(selection)
  useEffect(() => {
    if (precedente.current === selection) return
    precedente.current = selection
    const el = refDetail.current
    const grille = el?.parentElement
    if (!el || !grille || selection == null) return
    // Détail sous la liste (une seule colonne) : sinon l'utilisateur ne voit rien changer.
    if (el.getBoundingClientRect().top > grille.getBoundingClientRect().top + 8) {
      el.scrollIntoView({ block: "start" })
    }
  }, [selection])

  return (
    <div className="@container min-w-0 lg:min-h-0 lg:flex-1">
      <div
        className={cn(
          "grid min-w-0 gap-3 lg:h-full lg:auto-rows-[minmax(0,1fr)]",
          detail != null && colonnes,
        )}
      >
        {maitre}
        {detail != null && (
          <div ref={refDetail} className="flex min-h-0 min-w-0 flex-col scroll-mt-3 [&>*]:flex-1">
            {detail}
          </div>
        )}
      </div>
    </div>
  )
}
