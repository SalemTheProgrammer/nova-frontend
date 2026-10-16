import { useState } from "react"
import { Download, Send } from "lucide-react"
import { Button, Field, Modal, TextInput } from "@/components/shared/primitives"
import { useToast } from "@/components/shared/Toast"
import { getStoredUser } from "@/lib/api"
import { formatDateFr, tunicotexApi, type ParametresRapport } from "@/lib/tunicotex"

const LIBELLES_PARAMETRES: Record<keyof ParametresRapport, string> = {
  jour: "Jour",
  du: "Du",
  au: "Au",
  groupe_id: "Groupe",
  ligne_id: "Chaîne",
  of_id: "OF",
  client_id: "Client",
  horizon_jours: "Horizon (jours)",
}

function resumeParametres(parametres: ParametresRapport): string[] {
  return (Object.keys(LIBELLES_PARAMETRES) as (keyof ParametresRapport)[])
    .filter((k) => parametres[k] !== undefined && parametres[k] !== null)
    .map((k) => {
      const v = parametres[k]
      const texte = typeof v === "string" ? formatDateFr(v) : String(v)
      return `${LIBELLES_PARAMETRES[k]} : ${texte}`
    })
}

export function RapportActions({
  type,
  parametres,
  libelle,
}: {
  type: string
  parametres: ParametresRapport
  libelle?: string
}) {
  const toast = useToast()
  const [ouvert, setOuvert] = useState(false)
  const [destinataire, setDestinataire] = useState("")
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const titre = libelle ?? `Rapport ${type}`

  async function telecharger() {
    setOccupe(true)
    try {
      await tunicotexApi.telechargerRapport(type, parametres)
    } catch (e) {
      toast(e instanceof Error ? e.message : "Téléchargement impossible.", "erreur")
    } finally {
      setOccupe(false)
    }
  }

  function ouvrir() {
    setDestinataire(getStoredUser()?.telephone ?? "")
    setErreur(null)
    setOuvert(true)
  }

  async function envoyer() {
    const numero = destinataire.trim()
    if (!numero) {
      setErreur("Indiquez un numéro.")
      return
    }
    setOccupe(true)
    setErreur(null)
    try {
      await tunicotexApi.envoyerRapport(type, {
        canal: "whatsapp",
        destinataire: numero,
        parametres,
      })
      setOuvert(false)
      toast(`Rapport envoyé à ${numero}.`)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.")
    } finally {
      setOccupe(false)
    }
  }

  const lignes = resumeParametres(parametres)

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={telecharger} disabled={occupe}>
          <Download className="size-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={ouvrir}>
          <Send className="size-4" />
          Envoyer sur WhatsApp
        </Button>
      </div>
      <Modal
        open={ouvert}
        onClose={() => setOuvert(false)}
        title="Envoyer sur WhatsApp"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button onClick={envoyer} disabled={occupe}>
              Envoyer
            </Button>
          </>
        }
      >
        <Field label="Destinataire">
          <TextInput
            value={destinataire}
            onChange={(e) => setDestinataire(e.target.value)}
            inputMode="tel"
            placeholder="+216…"
          />
        </Field>
        <p className="text-sm font-medium">{titre}</p>
        {lignes.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {lignes.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        {erreur && <p className="mt-3 text-sm text-destructive">{erreur}</p>}
      </Modal>
    </>
  )
}
