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
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
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
            "size-12 sm:size-14 rounded-2xl border text-center text-xl sm:text-2xl font-bold shadow-sm transition-all outline-none",
            "bg-slate-50 dark:bg-zinc-900 text-foreground",
            digit
              ? "border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-4 ring-violet-500/15"
              : "border-slate-200 dark:border-zinc-800 hover:border-violet-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-500/15",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          aria-label={`Chiffre OTP ${idx + 1}`}
        />
      ))}
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [etape, setEtape] = useState<Etape>("telephone")
  const [telephone, setTelephone] = useState("")
  const [code, setCode] = useState("")
  const [seSouvenir, setSeSouvenir] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    document.title = "Connexion — Nova MES"
  }, [])

  async function demanderCode(e?: FormEvent) {
    if (e) e.preventDefault()
    if (!telephone.trim()) {
      setErreur("Veuillez saisir votre numéro de téléphone.")
      return
    }
    setErreur(null)
    setChargement(true)
    try {
      await authApi.requestCode(telephone.trim())
      setEtape("code")
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Échec de l'envoi du code.")
    } finally {
      setChargement(false)
    }
  }

  async function verifierCode(codeAValider?: string) {
    const codeFinal = (codeAValider ?? code).trim()
    if (codeFinal.length !== 6) {
      setErreur("Veuillez saisir le code complet à 6 chiffres.")
      return
    }
    setErreur(null)
    setChargement(true)
    try {
      const { token, user } = await authApi.verifyCode(telephone.trim(), codeFinal)
      login(token, user)
      navigate("/app/dashboard", { replace: true })
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Code incorrect ou expiré.")
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Colonne Gauche : Formulaire de connexion épuré avec branding Nova */}
      <div className="flex h-full w-full flex-col justify-between p-6 sm:p-10 lg:w-1/2 lg:p-12 xl:p-16 overflow-y-auto bg-white dark:bg-zinc-950">
        {/* En-tête : Logo Nova */}
        <div className="flex items-center">
          <img
            src="/r.png"
            alt="Nova"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>

        {/* Corps central du formulaire */}
        <div className="my-auto w-full max-w-md py-6">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2">
              <Sparkles className="size-3.5" />
              <span>Portail d'accès sécurisé</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Bonjour,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-300">
                Bienvenue sur Nova
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {etape === "telephone"
                ? "Saisissez votre numéro professionnel pour recevoir votre code d'accès par WhatsApp."
                : "Entrez le code de vérification à 6 chiffres envoyé sur votre WhatsApp pour vous connecter."}
            </p>
          </div>

          {etape === "telephone" ? (
            <form onSubmit={demanderCode} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="tel"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Numéro de téléphone professionnel
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                    <Phone className="size-4" />
                  </div>
                  <Input
                    id="tel"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+216 55 516 823"
                    value={telephone}
                    onChange={(ev) => setTelephone(ev.target.value)}
                    required
                    className="h-12 pl-10 text-base rounded-xl border-slate-200 dark:border-zinc-800 focus:border-violet-600 focus:ring-4 focus:ring-violet-500/15 transition-all"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Format international E.164. Votre code de session à usage unique vous sera envoyé
                  instantanément.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={seSouvenir}
                    onChange={(e) => setSeSouvenir(e.target.checked)}
                    className="size-4 rounded-md border-slate-300 text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
                  />
                  <span>Se souvenir de cet appareil</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Pour toute assistance ou demande d'accès, veuillez contacter votre responsable d'atelier ou l'administrateur Nova.",
                    )
                  }
                  className="text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium hover:underline"
                >
                  Besoin d'aide ?
                </button>
              </div>

              {erreur && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {erreur}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-semibold shadow-lg shadow-violet-600/25 transition-all text-base"
                disabled={chargement}
              >
                {chargement ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" /> Envoi en cours…
                  </>
                ) : (
                  <>
                    <MessageCircle className="size-4 mr-2" /> Recevoir le code par WhatsApp
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                verifierCode()
              }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Code de vérification (OTP)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEtape("telephone")
                      setCode("")
                      setErreur(null)
                    }}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline"
                  >
                    Changer de numéro
                  </button>
                </div>

                <OtpInput
                  value={code}
                  onChange={setCode}
                  onComplete={(completedCode) => verifierCode(completedCode)}
                  disabled={chargement}
                />

                <p className="text-xs text-muted-foreground pt-1">
                  Code à 6 chiffres envoyé au{" "}
                  <span className="font-semibold text-foreground">{telephone}</span>.
                </p>
              </div>

              {erreur && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {erreur}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-semibold shadow-lg shadow-violet-600/25 transition-all text-base"
                disabled={chargement || code.length !== 6}
              >
                {chargement ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" /> Validation…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4 mr-2" /> Valider et se connecter
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setEtape("telephone")
                  setCode("")
                  setErreur(null)
                }}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Revenir à la saisie du numéro
              </button>
            </form>
          )}
        </div>

        {/* Pied de page colonne gauche */}
        <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Vous n'avez pas d'accès ?{" "}
          <span className="font-semibold text-foreground">
            Contactez votre responsable d'atelier ou administrateur
          </span>
        </div>
      </div>

      {/* Colonne Droite : Showcase visuel Nova avec photographie industrielle ultra-réaliste */}
      <div className="relative hidden h-full w-1/2 overflow-hidden bg-gradient-to-br from-[#120726] via-[#200b3f] to-[#0a0314] lg:flex flex-col justify-end p-8 xl:p-12">
        {/* Photographie ultra-réaliste d'usine intelligente */}
        <img
          src="/login-illustration.jpg"
          alt="Nova Smart Factory & Automation"
          className="absolute inset-0 h-full w-full object-cover object-center transform scale-[1.02] hover:scale-105 transition-transform duration-1000 ease-out"
        />

        {/* Overlay sombre progressif pour lisibilité parfaite des textes et badges */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />



        {/* Bas de page droit : Témoignage épuré dans l'esprit SoftQA (sans boîte opaque) */}
        <div className="relative z-10 max-w-lg space-y-3 text-white">
          <span className="text-3xl font-serif text-violet-300 leading-none select-none block">“</span>
          <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed drop-shadow-sm">
            « Nova MES a transformé le pilotage de nos lignes de conditionnement. La détection des anomalies et le calcul TRS se font en temps réel avec une précision chirurgicale. »
          </p>
          <div className="flex items-center gap-3 pt-1">
            <div className="size-9 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
              MC
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white drop-shadow-sm">Marc Collet</p>
              <p className="text-xs text-violet-200/80 drop-shadow-sm">
                Directeur des Opérations Industrielles · Usine Agro & Pharma
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
