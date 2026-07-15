/**
 * Canal de commandes « Nova → Jumeau numérique ».
 *
 * Le jumeau est un miroir temps réel du MES : Nova ne pilote plus la ligne à
 * travers lui, seulement son AFFICHAGE (caméra, annotations). Quand un outil de
 * l'agent renvoie un artifact `twin_command`, le panneau IA (toujours monté)
 * l'émet ici ; la page du jumeau (montée seulement quand on la regarde)
 * s'abonne et applique la commande.
 *
 * Comme Nova ouvre souvent la page du jumeau ET envoie la commande dans le même
 * flux, la commande peut arriver AVANT que la page ne soit montée : on tamponne
 * alors les commandes en attente et on les rejoue dès qu'un handler s'abonne.
 */
export interface TwinCommand {
  action: "vue" | "annotations" | "ligne"
  /** Préréglage caméra ('ensemble' | 'blistereuse' | 'trieuse' | 'vignetteuse' | 'rejets'). */
  cible?: string
  /** Booléen d'affichage (annotations on/off). Pour `ligne`, cible contient le code, l'id ou le nom. */
  valeur?: number | boolean
}

type Handler = (cmd: TwinCommand) => void

let handler: Handler | null = null
const pending: TwinCommand[] = []

export const twinBus = {
  /** La page du jumeau enregistre son handler au montage (null au démontage). */
  setHandler(h: Handler | null) {
    handler = h
    if (h) {
      while (pending.length) h(pending.shift()!)
    }
  },
  /** Le panneau IA émet une commande reçue de Nova. */
  emit(cmd: TwinCommand) {
    if (handler) handler(cmd)
    else pending.push(cmd)
  },
}
