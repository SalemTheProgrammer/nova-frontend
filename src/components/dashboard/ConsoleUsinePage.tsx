import { SIMULATOR_CONSOLE_URL } from "@/lib/api"

/**
 * La console usine (flux des lignes façon n8n + pupitre de simulation) est
 * servie par le backend (`/simulateur`, page HTML autonome) : une seule
 * implémentation, embarquée ici en iframe pour rester accessible depuis
 * l'application — notamment quand Nova navigue vers la page « simulateur ».
 */
export function ConsoleUsinePage() {
  return (
    <iframe
      src={SIMULATOR_CONSOLE_URL}
      title="Console usine — flux des lignes et simulateur"
      className="h-full w-full flex-1 border-0"
    />
  )
}
