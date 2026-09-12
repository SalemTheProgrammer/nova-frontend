/**
 * Base WebSocket : même origine que la page par défaut (`/ws/...`), relayée
 * vers le backend par le proxy Vite en développement et par nginx en
 * production. `VITE_WS_BASE` permet de viser un autre hôte si besoin.
 */
function defaultWsBase(): string {
  const protocole = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocole}//${window.location.host}`
}

const WS_BASE = import.meta.env.VITE_WS_BASE ?? defaultWsBase()

export function connectDashboardSocket(
  onMessage: (data: unknown) => void,
  onStatusChange: (connected: boolean) => void,
): () => void {
  let socket: WebSocket | null = null
  let closedByClient = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    socket = new WebSocket(`${WS_BASE}/ws/dashboard`)

    socket.onopen = () => onStatusChange(true)

    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data))
      } catch {
        // ignore malformed frames
      }
    }

    socket.onclose = () => {
      onStatusChange(false)
      if (!closedByClient) {
        retryTimer = setTimeout(connect, 2000)
      }
    }

    socket.onerror = () => {
      socket?.close()
    }
  }

  connect()

  return () => {
    closedByClient = true
    if (retryTimer) clearTimeout(retryTimer)
    socket?.close()
  }
}
