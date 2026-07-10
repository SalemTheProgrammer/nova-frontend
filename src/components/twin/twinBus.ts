/**
 * Canal de commandes « Nova → Jumeau numérique ».
 *
 * Le jumeau n'a plus de pupitre de réglages manuels : c'est l'assistant Nova qui
 * le pilote. Quand un outil de l'agent renvoie un artifact `twin_command`, le
 * panneau IA (toujours monté) l'émet ici ; la page du jumeau (montée seulement
 * quand on la regarde) s'abonne et applique la commande au moteur de simulation.
 *
 * Comme Nova ouvre souvent la page du jumeau ET envoie la commande dans le même
 * flux, la commande peut arriver AVANT que la page ne soit montée : on tamponne
 * alors les commandes en attente et on les rejoue dès qu'un handler s'abonne.
 */
export interface TwinCommand {
  action:
    | "demarrer"
    | "pause"
    | "arreter"
    | "panne"
    | "resoudre"
    | "vitesse"
    | "cadence"
    | "defauts"
    | "publier"
    | "annotations"
    | "vue"
    | "reset"
  /** Poste ciblé ('blistereuse' | 'trieuse' | 'vignetteuse' | 'tout') ou préréglage caméra. */
  cible?: string
  /** Valeur numérique (vitesse, cadence, fraction de défauts) ou booléen (publier/annotations). */
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
