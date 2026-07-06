import { useCallback, useEffect, useRef, useState } from "react"
import { voiceApi } from "@/lib/api"

/**
 * Entrée vocale (micro → OpenAI STT) et sortie vocale (OpenAI TTS → haut-parleur).
 * `startRecording`/`stopRecording` pilotent le micro ; à l'arrêt, l'audio est
 * transcrit et passé à `onTranscript`. `speak` lit un texte à voix haute et
 * RÉSOUT quand la lecture est TERMINÉE (utile pour enchaîner une conversation).
 *
 * `levelRef` expose en continu le niveau audio courant (0..~1) — micro pendant
 * l'enregistrement, haut-parleur pendant la synthèse — pour animer une bulle
 * réactive à la voix sans re-render (lire dans une boucle rAF).
 */
export function useVoice(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Vu-mètre partagé micro / synthèse.
  const levelRef = useRef(0)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const meterSourceRef = useRef<AudioNode | null>(null)
  const rafRef = useRef<number | null>(null)

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    try {
      meterSourceRef.current?.disconnect()
      analyserRef.current?.disconnect()
    } catch {
      // déjà déconnecté
    }
    meterSourceRef.current = null
    analyserRef.current = null
    levelRef.current = 0
  }, [])

  const startMeter = useCallback(
    (source: AudioNode, toDestination: boolean) => {
      stopMeter()
      const ctx = ctxRef.current!
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      if (toDestination) analyser.connect(ctx.destination)
      analyserRef.current = analyser
      meterSourceRef.current = source
      const data = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        levelRef.current = Math.sqrt(sum / data.length)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    },
    [stopMeter],
  )

  const ensureCtx = useCallback(async () => {
    ctxRef.current ??= new AudioContext()
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume().catch(() => {})
    return ctxRef.current
  }, [])

  useEffect(
    () => () => {
      stopMeter()
      void ctxRef.current?.close().catch(() => {})
      ctxRef.current = null
    },
    [stopMeter],
  )

  const startRecording = useCallback(async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        stopMeter()
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        if (blob.size === 0) return
        setTranscribing(true)
        try {
          const text = await voiceApi.transcribe(blob)
          if (text.trim()) onTranscript(text.trim())
        } catch {
          // transcription échouée : l'utilisateur peut retaper sa question
        } finally {
          setTranscribing(false)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      // Vu-mètre micro (pas de connexion à la sortie : pas d'écho).
      const ctx = await ensureCtx()
      startMeter(ctx.createMediaStreamSource(stream), false)
    } catch {
      // micro refusé / indisponible
    }
  }, [recording, onTranscript, ensureCtx, startMeter, stopMeter])

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }, [])

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    stopMeter()
    setSpeaking(false)
  }, [stopMeter])

  const speak = useCallback(
    async (text: string) => {
      stopSpeaking()
      try {
        setSpeaking(true)
        const blob = await voiceApi.speak(text)
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        // Vu-mètre sur la synthèse : source élément → analyser → sortie.
        try {
          const ctx = await ensureCtx()
          startMeter(ctx.createMediaElementSource(audio), true)
        } catch {
          // metering indisponible : l'audio sort quand même
        }
        await new Promise<void>((resolve) => {
          const finir = () => {
            URL.revokeObjectURL(url)
            stopMeter()
            setSpeaking(false)
            resolve()
          }
          audio.onended = finir
          audio.onerror = finir
          audio.play().catch(finir)
        })
      } catch {
        setSpeaking(false)
      }
    },
    [stopSpeaking, ensureCtx, startMeter, stopMeter],
  )

  return {
    recording,
    transcribing,
    speaking,
    levelRef,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
  }
}
