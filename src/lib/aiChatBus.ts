/**
 * Canal « page → Assistant Nova » : permet à n'importe quelle page de préremplir
 * et d'envoyer un message à Nova (ex. « Créer avec Nova » sur la page Ordres),
 * sans faire remonter tout l'état du chat jusqu'à App.tsx.
 *
 * Le panneau IA n'est monté que lorsqu'il est ouvert : si un message est émis
 * juste avant (ouverture + émission dans le même geste), on le tamponne et on
 * le rejoue dès que le panneau enregistre son handler (même pattern que twinBus).
 */
type Handler = (texte: string) => void

let handler: Handler | null = null
const pending: string[] = []

export const aiChatBus = {
  setHandler(h: Handler | null) {
    handler = h
    if (h) {
      while (pending.length) h(pending.shift()!)
    }
  },
  emit(texte: string) {
    if (handler) handler(texte)
    else pending.push(texte)
  },
}
