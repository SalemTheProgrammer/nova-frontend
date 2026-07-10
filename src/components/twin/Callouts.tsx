import { Html } from "@react-three/drei"

/**
 * Étiquettes d'annotation flottantes reproduisant les encadrés bleus de
 * l'image de référence : pastille de titre bleue + lignes descriptives,
 * reliées à la machine par un trait vertical.
 */

interface CalloutDef {
  position: [number, number, number]
  titre: string
  lignes: string[]
  petite?: boolean
}

const CALLOUTS: CalloutDef[] = [
  {
    position: [-8.7, 3.35, 0],
    titre: "Blistéreuse",
    lignes: ["Formage - Remplissage - Scellage", "Avec système de rejet intégré"],
  },
  {
    position: [-0.05, 3.15, -0.85],
    titre: "Trieuse Pondérale",
    lignes: ["Contrôle pondéral dynamique", "Éjection par soufflage pneumatique"],
  },
  {
    position: [5.1, 3.15, -0.6],
    titre: "Vignetteuse",
    lignes: ["Pose d'étiquettes / vignettes", "Éjection des erreurs par poussoir pneumatique"],
  },
  {
    position: [-4.55, 1.35, 1.05],
    titre: "Rejet Blistéreuse",
    lignes: ["Trappe de rejet des blisters non conformes"],
    petite: true,
  },
  {
    position: [2.05, 1.35, 1.15],
    titre: "Rejet Trieuse",
    lignes: ["Éjection des boîtes sous le poids minimum"],
    petite: true,
  },
  {
    position: [7.6, 1.35, 1.2],
    titre: "Rejet Vignetteuse",
    lignes: ["Poussoir pneumatique — étiquette incorrecte"],
    petite: true,
  },
]

export function Callouts({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <group>
      {CALLOUTS.map((c) => (
        <Html
          key={c.titre}
          position={c.position}
          center
          distanceFactor={9}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex w-max max-w-72 flex-col items-center">
            <div className="rounded-lg border border-blue-200/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
              <span
                className={
                  c.petite
                    ? "inline-block rounded-md bg-[#1049b8] px-2 py-0.5 text-[11px] font-bold text-white"
                    : "inline-block rounded-md bg-[#1049b8] px-2.5 py-1 text-sm font-bold text-white"
                }
              >
                {c.titre}
              </span>
              {c.lignes.map((l) => (
                <p
                  key={l}
                  className={
                    c.petite
                      ? "mt-1 text-[10px] leading-tight text-slate-600"
                      : "mt-1 text-xs leading-tight text-slate-700"
                  }
                >
                  {l}
                </p>
              ))}
            </div>
            {/* Trait de rappel vers la machine */}
            <div className="h-6 w-px bg-[#1049b8]/70" />
            <div className="size-1.5 rounded-full bg-[#1049b8]" />
          </div>
        </Html>
      ))}
    </group>
  )
}
