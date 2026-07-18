import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, MessageCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"

type Etape = "telephone" | "code"

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [etape, setEtape] = useState<Etape>("telephone")
  const [telephone, setTelephone] = useState("")
  const [code, setCode] = useState("")
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  // Hors production, le backend renvoie le code (dépannage) : on l'affiche.
  const [devCode, setDevCode] = useState<string | null>(null)

  async function demanderCode(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)
    try {
      const { dev_code } = await authApi.requestCode(telephone.trim())
      if (dev_code) {
        setDevCode(dev_code)
        setCode(dev_code)
      }
      setEtape("code")
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Échec de l'envoi du code.")
    } finally {
      setChargement(false)
    }
  }

  async function verifierCode(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)
    try {
      const { token, user } = await authApi.verifyCode(telephone.trim(), code.trim())
      login(token, user)
      navigate("/app/dashboard", { replace: true })
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Code incorrect.")
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-violet-50 via-background to-background p-4 dark:from-violet-950/30">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/r.png" alt="Nova Data Analytics" className="mb-3 h-12 w-auto object-contain" />
          <p className="mt-1 text-sm text-muted-foreground">
            {etape === "telephone"
              ? "Connectez-vous avec votre numéro de téléphone."
              : "Saisissez le code reçu sur WhatsApp."}
          </p>
        </div>

        {etape === "telephone" ? (
          <form onSubmit={demanderCode} className="space-y-4">
            <div>
              <label htmlFor="tel" className="mb-1.5 block text-sm font-medium">
                Numéro de téléphone
              </label>
              <Input
                id="tel"
                type="tel"
                autoComplete="tel"
                placeholder="+216 XX XXX XXX"
                value={telephone}
                onChange={(ev) => setTelephone(ev.target.value)}
                required
                className="h-10"
              />
            </div>
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={chargement}>
              {chargement ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              Recevoir le code par WhatsApp
            </Button>
          </form>
        ) : (
          <form onSubmit={verifierCode} className="space-y-4">
            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm font-medium">
                Code de vérification
              </label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                required
                maxLength={6}
                className="h-10 text-center text-lg tracking-[0.4em]"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">Envoyé au {telephone}.</p>
              {devCode && (
                <p className="mt-1.5 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Mode dev — code : <span className="font-mono font-semibold">{devCode}</span>
                </p>
              )}
            </div>
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={chargement}>
              {chargement ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Se connecter
            </Button>
            <button
              type="button"
              onClick={() => {
                setEtape("telephone")
                setCode("")
                setErreur(null)
                setDevCode(null)
              }}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Changer de numéro
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
