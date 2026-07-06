import { useCallback, useEffect, useRef, useState } from "react"
import { voiceApi } from "@/lib/api"

/**
 * Conversation vocale TEMPS RÉEL avec micro ouvert en continu (full-duplex simulé) :
 *
 * - le micro reste ouvert pendant TOUTE la session (pas de tap-to-talk) ;
 * - la détection d'activité vocale (VAD) segmente vos phrases toute seule :
 *   vous parlez → silence → la phrase part en transcription → `onUtterance` ;
 * - pendant que Nova parle, le micro écoute toujours : si vous parlez par-dessus
 *   (barge-in), sa voix se coupe immédiatement et votre phrase est capturée —
 *   comme au téléphone ;
 * - l'écho est géré par l'annulation d'écho du navigateur (echoCancellation) +
 *   un seuil de barge-in plus élevé et soutenu pour éviter les faux positifs.
 *
 * `levelRef` expose le niveau audio à animer : voix de Nova pendant qu'elle
 * parle, votre micro sinon (lire dans une boucle rAF, pas de re-render).
 */

// Seuils VAD (RMS 0..1). Micro normal ~0.02 en bruit de fond, ~0.1+ en parole.
const SEUIL_VOIX = 0.045
// Barge-in : seuil PLUS HAUT et SOUTENU pendant que Nova parle. Si l'annulation
// d'écho du navigateur fuit (haut-parleurs), sa propre voix repasse dans le
// micro : un seuil sensible ici ferait que Nova s'interrompt elle-même, capture
// son écho, se répond… en boucle. Quand elle est silencieuse, SEUIL_VOIX
// s'applique et la détection reste très réactive.
const SEUIL_BARGE_IN = 0.09
const TICKS_BARGE_IN = 3 // ~180 ms soutenus avant d'interrompre Nova
const SILENCE_FIN_MS = 1300 // silence qui clôt une phrase
const DUREE_MAX_MS = 30000
// Une phrase n'est transcrite que si elle contient assez de voix réelle :
// élimine les captures fantômes (résidu d'écho après un barge-in, bruit bref).
const MIN_TICKS_VOIX = 4 // ~240 ms de voix cumulée minimum

export type EtatVoiceLive = "inactif" | "ecoute" | "capture" | "transcription" | "parole"

export function useVoiceLive(onUtterance: (texte: string) => void) {
  const [live, setLive] = useState(false)
  const [etat, setEtat] = useState<EtatVoiceLive>("inactif")

  const levelRef = useRef(0)

  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const micDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null)
  const ttsDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const monitorRef = useRef<number | null>(null)

  const speakingRef = useRef(false)
  const busyRef = useRef(false) // transcription ou tour agent en cours : on ne capture pas
  const bargeTicksRef = useRef(0)
  const voixTicksRef = useRef(0) // ticks de voix réelle cumulés pendant la capture
  const jeterCaptureRef = useRef(false) // capture à jeter (raccrochage, pas assez de voix)
  const captureRef = useRef<{ debut: number; dernierSon: number } | null>(null)
  const onUtteranceRef = useRef(onUtterance)
  onUtteranceRef.current = onUtterance

  const rms = (analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>) => {
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    return Math.sqrt(sum / data.length)
  }

  const finirCapture = useCallback((jeter = false) => {
    jeterCaptureRef.current = jeter
    captureRef.current = null
    recorderRef.current?.stop()
    recorderRef.current = null
  }, [])

  const commencerCapture = useCallback(() => {
    const stream = streamRef.current
    if (!stream || recorderRef.current) return
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" })
      if (jeterCaptureRef.current || blob.size === 0) {
        jeterCaptureRef.current = false
        return
      }
      busyRef.current = true
      setEtat("transcription")
      try {
        const texte = await voiceApi.transcribe(blob)
        if (texte.trim()) onUtteranceRef.current(texte.trim())
        else busyRef.current = false
      } catch {
        busyRef.current = false
      }
    }
    recorder.start()
    recorderRef.current = recorder
    jeterCaptureRef.current = false
    voixTicksRef.current = 0
    captureRef.current = { debut: Date.now(), dernierSon: Date.now() }
    setEtat("capture")
  }, [])

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    try {
      ttsAnalyserRef.current?.disconnect()
    } catch {
      // déjà déconnecté
    }
    ttsAnalyserRef.current = null
    speakingRef.current = false
  }, [])

  /** Boucle de supervision (~60 ms) : niveaux, VAD, barge-in. */
  const demarrerMonitor = useCallback(() => {
    if (monitorRef.current != null) return
    monitorRef.current = window.setInterval(() => {
      const micAnalyser = micAnalyserRef.current
      const micData = micDataRef.current
      if (!micAnalyser || !micData) return
      const micLevel = rms(micAnalyser, micData)

      // Niveau exposé à l'UI : voix de Nova quand elle parle, sinon le micro.
      if (speakingRef.current && ttsAnalyserRef.current && ttsDataRef.current) {
        levelRef.current = rms(ttsAnalyserRef.current, ttsDataRef.current)
      } else {
        levelRef.current = micLevel
      }

      // Barge-in : l'utilisateur parle par-dessus Nova → on coupe et on capture.
      if (speakingRef.current) {
        if (micLevel > SEUIL_BARGE_IN) {
          bargeTicksRef.current += 1
          if (bargeTicksRef.current >= TICKS_BARGE_IN) {
            bargeTicksRef.current = 0
            stopSpeaking()
            busyRef.current = false
            commencerCapture()
          }
        } else {
          bargeTicksRef.current = 0
        }
        return
      }

      // Occupé (transcription / réponse en cours) : on ne capture pas de phrase.
      if (busyRef.current) return

      const capture = captureRef.current
      if (capture == null) {
        if (micLevel > SEUIL_VOIX) commencerCapture()
        setEtat((e) => (e === "capture" || e === "transcription" || e === "parole" ? e : "ecoute"))
        return
      }
      const maintenant = Date.now()
      if (micLevel > SEUIL_VOIX) {
        capture.dernierSon = maintenant
        voixTicksRef.current += 1
      }
      if (
        maintenant - capture.dernierSon > SILENCE_FIN_MS ||
        maintenant - capture.debut > DUREE_MAX_MS
      ) {
        // Trop peu de voix réelle : capture fantôme (écho, bruit) → on jette.
        finirCapture(voixTicksRef.current < MIN_TICKS_VOIX)
      }
    }, 60)
  }, [commencerCapture, finirCapture, stopSpeaking])

  const arreterMonitor = useCallback(() => {
    if (monitorRef.current != null) window.clearInterval(monitorRef.current)
    monitorRef.current = null
  }, [])

  /** Ouvre la session : micro permanent + supervision. */
  const start = useCallback(async () => {
    if (streamRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      const ctx = (ctxRef.current ??= new AudioContext())
      if (ctx.state === "suspended") await ctx.resume().catch(() => {})
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      micAnalyserRef.current = analyser
      micDataRef.current = new Uint8Array(analyser.fftSize)
      busyRef.current = false
      setLive(true)
      setEtat("ecoute")
      demarrerMonitor()
    } catch {
      // micro refusé / indisponible
    }
  }, [demarrerMonitor])

  /** Ferme tout : micro, synthèse, supervision. */
  const stop = useCallback(() => {
    arreterMonitor()
    stopSpeaking()
    // Raccrochage : la capture en cours est jetée, pas transcrite ni envoyée.
    jeterCaptureRef.current = true
    recorderRef.current?.stop()
    recorderRef.current = null
    captureRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    micAnalyserRef.current = null
    busyRef.current = false
    levelRef.current = 0
    setLive(false)
    setEtat("inactif")
  }, [arreterMonitor, stopSpeaking])

  /** Nova parle ; résout à la fin de la lecture (ou dès qu'on l'interrompt).
   *  Ne rejette jamais : si la synthèse échoue, on rend simplement le micro. */
  const speak = useCallback(async (texte: string) => {
    stopSpeaking()
    try {
      speakingRef.current = true
      setEtat("parole")
      const blob = await voiceApi.speak(texte)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      try {
        const ctx = (ctxRef.current ??= new AudioContext())
        if (ctx.state === "suspended") await ctx.resume().catch(() => {})
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        const source = ctx.createMediaElementSource(audio)
        source.connect(analyser)
        analyser.connect(ctx.destination)
        ttsAnalyserRef.current = analyser
        ttsDataRef.current = new Uint8Array(analyser.fftSize)
      } catch {
        // metering indisponible : l'audio sort quand même
      }
      await new Promise<void>((resolve) => {
        const finir = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onended = finir
        audio.onerror = finir
        audio.onpause = finir // barge-in : pause = interruption volontaire
        audio.play().catch(finir)
      })
    } catch {
      // synthèse indisponible : pas de voix, mais la conversation continue
    } finally {
      speakingRef.current = false
      busyRef.current = false
      setEtat((e) => (e === "parole" ? "ecoute" : e))
    }
  }, [stopSpeaking])

  /** À appeler quand le tour de l'agent est fini côté texte (libère la capture). */
  const libererTour = useCallback(() => {
    busyRef.current = false
    setEtat((e) => (e === "transcription" ? "ecoute" : e))
  }, [])

  useEffect(() => () => stop(), [stop])

  return { live, etat, levelRef, start, stop, speak, stopSpeaking, libererTour }
}
