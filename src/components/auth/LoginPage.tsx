import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, MessageCircle, Phone, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { authApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"

type Etape = "telephone" | "code"

/**
 * Composant OTP à 6 blocs distincts avec navigation automatique,
 * gestion du collage (paste), retour arrière (backspace) et touches fléchées.
 */
function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string
  onChange: (val: string) => void
  onComplete?: (val: string) => void
  disabled?: boolean
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = useMemo(() => {
    const arr = value.split("").slice(0, 6)
    while (arr.length < 6) arr.push("")
    return arr
  }, [value])

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "")
    if (!raw) {
      const newDigits = [...digits]
      newDigits[index] = ""
      onChange(newDigits.join(""))
      return
    }

    if (raw.length > 1) {
      const pasted = raw.slice(0, 6).split("")
      const newDigits = [...digits]
      for (let i = 0; i < pasted.length && index + i < 6; i++) {
        newDigits[index + i] = pasted[i]
      }
      const newVal = newDigits.join("")
      onChange(newVal)
      const nextFocus = Math.min(index + pasted.length, 5)
      inputRefs.current[nextFocus]?.focus()
      if (newVal.length === 6 && onComplete) {
        onComplete(newVal)
      }
      return
    }

    const newDigits = [...digits]
    newDigits[index] = raw[raw.length - 1]
    const newVal = newDigits.join("")
    onChange(newVal)

    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    if (newVal.length === 6 && onComplete) {
      onComplete(newVal)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    onChange(pasted)
    const targetIdx = Math.min(pasted.length, 5)
    inputRefs.current[targetIdx]?.focus()
    if (pasted.length === 6 && onComplete) {
      onComplete(pasted)
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className={cn(
            "size-12 rounded-lg border bg-background text-center text-2xl font-semibold tabular-nums outline-none transition-colors sm:size-14",
            digit ? "border-foreground/50" : "border-border hover:border-foreground/30",
            "focus:border-foreground focus:ring-2 focus:ring-ring/20",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label={`Chiffre ${idx + 1} du code`}
        />
      ))}
    </div>
  )
}

const BOUTON_PRINCIPAL =
  "h-12 w-full rounded-lg bg-foreground text-base font-medium text-background transition-colors hover:bg-foreground/90 active:scale-[0.99]"

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [etape, setEtape] = useState<Etape>("telephone")
  const [telephone, setTelephone] = useState("")
  const [code, setCode] = useState("")
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  // Délai avant de pouvoir redemander un code (s) : évite les rafales de renvois.
  const [renvoiDans, setRenvoiDans] = useState(0)
  const [codeRenvoye, setCodeRenvoye] = useState(false)
  useEffect(() => {
    if (renvoiDans <= 0) return
    const t = window.setTimeout(() => setRenvoiDans((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [renvoiDans])
  useEffect(() => {
    document.title = "Connexion — Nova Opsis · Tunicotex"
  }, [])

  async function demanderCode(e?: FormEvent) {
    if (e) e.preventDefault()
    if (!telephone.trim()) {
      setErreur("Saisissez votre numéro de téléphone.")
      return
    }
    setErreur(null)
    setChargement(true)
    try {
      await authApi.requestCode(telephone.trim())
      setEtape("code")
      setRenvoiDans(30)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Le code n'a pas pu être envoyé.")
    } finally {
      setChargement(false)
    }
  }

  async function verifierCode(codeAValider?: string) {
    const codeFinal = (codeAValider ?? code).trim()
    if (codeFinal.length !== 6) {
      setErreur("Saisissez les 6 chiffres du code.")
      return
    }
    setErreur(null)
    setChargement(true)
    try {
      const { token, user } = await authApi.verifyCode(telephone.trim(), codeFinal)
      login(token, user)
      navigate("/app/atelier", { replace: true })
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Code incorrect ou expiré.")
    } finally {
      setChargement(false)
    }
  }

  /** Redemande un code sans quitter l'écran de saisie (le précédent reste valable jusqu'à expiration). */
  async function renvoyerCode() {
    if (renvoiDans > 0 || chargement) return
    setCode("")
    setCodeRenvoye(false)
    await demanderCode()
    setCodeRenvoye(true)
  }

  function revenirAuNumero() {
    setEtape("telephone")
    setCode("")
    setErreur(null)
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Formulaire */}
      <div className="flex h-full w-full flex-col justify-between overflow-y-auto p-6 sm:p-10 lg:w-1/2 lg:p-14">
        <div className="flex items-center gap-3 self-start">
          <img src="/r.png" alt="Nova" className="h-10 w-auto object-contain" />
          <span className="text-sm font-medium text-muted-foreground">Nova Opsis · Tunicotex</span>
        </div>

        <div className="my-auto w-full max-w-md py-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Connexion à Nova</h1>
          <p className="mt-3 text-base text-muted-foreground">
            {etape === "telephone"
              ? "Saisissez votre numéro professionnel : un code d'accès vous est envoyé par WhatsApp."
              : "Entrez le code à 6 chiffres reçu sur WhatsApp."}
          </p>

          {etape === "telephone" ? (
            <form onSubmit={demanderCode} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="tel" className="block text-sm font-medium">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="tel"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+216 XX XXX XXX"
                    value={telephone}
                    onChange={(ev) => setTelephone(ev.target.value)}
                    required
                    className="h-12 rounded-lg pl-10 text-base focus:border-foreground focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <p className="text-sm text-muted-foreground">Format international, indicatif compris.</p>
              </div>

              {erreur && (
                <div className="rounded-lg bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{erreur}</div>
              )}

              <Button type="submit" className={BOUTON_PRINCIPAL} disabled={chargement}>
                {chargement ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Envoi en cours…
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 size-4" /> Recevoir le code par WhatsApp
                  </>
                )}
              </Button>

            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void verifierCode()
              }}
              className="mt-8 space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Code de vérification</span>
                  <button
                    type="button"
                    onClick={revenirAuNumero}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Changer de numéro
                  </button>
                </div>
                <OtpInput
                  value={code}
                  onChange={setCode}
                  onComplete={(complet) => void verifierCode(complet)}
                  disabled={chargement}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <p>
                    {codeRenvoye && !erreur ? "Nouveau code envoyé au " : "Envoyé au "}
                    <span className="font-medium text-foreground">{telephone}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => void renvoyerCode()}
                    disabled={renvoiDans > 0 || chargement}
                    className="font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                  >
                    {renvoiDans > 0 ? `Renvoyer le code (${renvoiDans} s)` : "Renvoyer le code"}
                  </button>
                </div>
              </div>

              {erreur && (
                <div className="rounded-lg bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{erreur}</div>
              )}

              <Button type="submit" className={BOUTON_PRINCIPAL} disabled={chargement || code.length !== 6}>
                {chargement ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Validation…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 size-4" /> Se connecter
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={revenirAuNumero}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Revenir au numéro
              </button>
            </form>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pas encore d'accès ? Demandez-le à votre responsable d'atelier ou à l'administrateur Nova.
          </p>
          <p className="text-xs text-muted-foreground">
            Vos échanges avec Nova (web et WhatsApp) sont enregistrés et peuvent être consultés par
            l'administrateur.
          </p>
        </div>
      </div>

      {/* Visuel */}
      <div className="relative hidden h-full w-1/2 flex-col justify-start overflow-hidden bg-zinc-900 p-12 lg:flex">
        <img
          src="/tunicotex-login.jpg"
          alt="Tunicotex Group"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        <div className="relative z-10 max-w-md text-white">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
            Nova Opsis · Tunicotex
          </p>
          <p className="text-2xl font-semibold leading-snug">Pilotage de la production de l'atelier.</p>
          <p className="mt-2 text-base text-white/80">
            Rendement des chaînes, effectif, ordres de fabrication et livraisons, au même endroit.
          </p>
        </div>
      </div>
    </div>
  )
}
