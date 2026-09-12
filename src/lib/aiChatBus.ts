/**
 * Canal « page → Assistant Nova » : permet à n'importe quelle page de préremplir
 * et d'envoyer un message à Nova (ex. « Créer avec Nova » sur la page Ordres),
 * sans faire remonter tout l'état du chat jusqu'à App.tsx.
 *
 * Le panneau IA n'est monté que lorsqu'il est ouvert : si un message est émis
 * juste avant (ouverture + émission dans le même geste), on le tamponne et on
 * le rejoue dès que le panneau enregistre son handler.
 */
type Handler = (texte: string) => void
type OpenHandler = () => void

let handler: Handler | null = null
let openHandler: OpenHandler | null = null
const pending: string[] = []

export const aiChatBus = {
  setHandler(h: Handler | null) {
    handler = h
    if (h) {
      while (pending.length) h(pending.shift()!)
    }
  },
  setOpenHandler(oh: OpenHandler | null) {
    openHandler = oh
  },
  open() {
    if (openHandler) openHandler()
  },
  emit(texte: string) {
    if (openHandler) openHandler()
    if (handler) handler(texte)
    else pending.push(texte)
  },
}
