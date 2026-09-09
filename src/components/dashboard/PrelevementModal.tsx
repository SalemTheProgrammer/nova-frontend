import React, { useEffect, useState } from "react"
import {
  AlertCircle,
  Beaker,
  CheckCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react"
import { prelevementApi } from "@/lib/api"
import type { LotQuarantaine, PrelevementMP, Unite } from "@/lib/types"

interface PrelevementModalProps {
  open: boolean
  onClose: () => void
  onActionComplete?: () => void
}

export const PrelevementModal: React.FC<PrelevementModalProps> = ({
  open,
  onClose,
  onActionComplete,
}) => {
  const [activeTab, setActiveTab] = useState<"quarantaine" | "prelevements">("quarantaine")
  const [lotsQuarantaine, setLotsQuarantaine] = useState<LotQuarantaine[]>([])
  const [prelevements, setPrelevements] = useState<PrelevementMP[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  // Dialog pour prélever
  const [selectedLot, setSelectedLot] = useState<LotQuarantaine | null>(null)
  const [quantitePrelevee, setQuantitePrelevee] = useState("25")
  const [unitePrelevee, setUnitePrelevee] = useState<Unite>("G")
  const [preleveur, setPreleveur] = useState("Sami Ben Ali (Agent CQ)")

  // Dialog pour valider CQ
  const [selectedPrelevement, setSelectedPrelevement] = useState<PrelevementMP | null>(null)
  const [analyste, setAnalyste] = useState("Dr. Nadia Mansour")
  const [bulletinRef, setBulletinRef] = useState("BA-2026-0814")
  const [commentaire, setCommentaire] = useState("Conforme aux spécifications pharmacopée")

  const chargerDonnees = async () => {
    try {
      const [lots, prels] = await Promise.all([
        prelevementApi.lotsQuarantaine(),
        prelevementApi.lister(),
      ])
      setLotsQuarantaine(lots)
      setPrelevements(prels)
    } catch (err) {
      console.error("Erreur chargement données prélèvement", err)
    }
  }

  useEffect(() => {
    if (open) {
      void chargerDonnees()
    }
  }, [open])

  if (!open) return null

  const handleCreerPrelevement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLot) return
    try {
      const res = await prelevementApi.creer({
        lot_id: selectedLot.id,
        quantite_prelevee: quantitePrelevee,
        unite: unitePrelevee,
        preleveur,
        zone_prelevement: "SAS Prélèvement MP - Flux Laminaire ISO 5",
      })
      setFeedback(`Prélèvement ${res.numero} enregistré sous flux ISO 5. Lot placé en quarantaine BPF.`)
      setSelectedLot(null)
      await chargerDonnees()
      onActionComplete?.()
    } catch (err) {
      console.error(err)
      setFeedback("Erreur lors de la création du prélèvement")
    }
  }

  const handleValiderAnalyse = async (conforme: boolean) => {
    if (!selectedPrelevement) return
    try {
      const res = await prelevementApi.valider(selectedPrelevement.id, {
        conforme,
        analyste,
        bulletin_analyse_ref: bulletinRef,
        commentaire,
      })
      if (conforme) {
        setFeedback(
          `Lot ${res.numero_lot ?? ""} libéré avec succès (Statut: DISPONIBLE) ! Bulletin ${bulletinRef}.`
        )
      } else {
        setFeedback(`Lot ${res.numero_lot ?? ""} rejeté et maintenu sous séquestre BPF.`)
      }
      setSelectedPrelevement(null)
      await chargerDonnees()
      onActionComplete?.()
    } catch (err) {
      console.error(err)
      setFeedback("Erreur lors de la validation du contrôle qualité")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Prélèvements Matières Premières & Libération CQ
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 border border-blue-200/60">
                  BPF / DPM Tunisie
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Traçabilité stérile, échantillonnage SAS ISO 5 & conformité réglementaire avant pesée
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200/60 bg-white px-6 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("quarantaine")}
            className={`py-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "quarantaine"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Lots en Quarantaine ({lotsQuarantaine.length})
          </button>
          <button
            onClick={() => setActiveTab("prelevements")}
            className={`py-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "prelevements"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Fiches de Prélèvements & Validation ({prelevements.length})
          </button>
        </div>

        {/* Notification pill */}
        {feedback && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between shadow-sm animate-in fade-in">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {feedback}
            </span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-2">
              ×
            </button>
          </div>
        )}

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "quarantaine" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Lots MP sous Quarantaine (En attente de libération BPF)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Selon les BPF, aucune matière première ne peut être pesée sans analyse conforme du laboratoire.
                  </p>
                </div>
                <button
                  onClick={chargerDonnees}
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">N° de Lot</th>
                      <th className="py-2.5 px-4 font-semibold">Matière Première</th>
                      <th className="py-2.5 px-4 font-semibold">Stock Reçu</th>
                      <th className="py-2.5 px-4 font-semibold">Statut</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Action CQ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {lotsQuarantaine.length > 0 ? (
                      lotsQuarantaine.map((lot) => (
                        <tr key={lot.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {lot.numero_lot}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{lot.nom_matiere}</span>
                            <span className="block text-[11px] text-slate-400 font-mono">
                              {lot.code_matiere}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium">
                            {lot.quantite_actuelle} {lot.unite}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                              BLOQUÉ (QUARANTAINE)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedLot(lot)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                            >
                              <Beaker className="w-3.5 h-3.5" />
                              Prélever
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Aucun lot en quarantaine pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Fiches de Prélèvements & Bulletins d&apos;Analyses
                  </h4>
                  <p className="text-xs text-slate-500">
                    Validation des critères physico-chimiques et libération du lot en fabrication.
                  </p>
                </div>
                <button
                  onClick={chargerDonnees}
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">N° Prélèvement</th>
                      <th className="py-2.5 px-4 font-semibold">Lot & Matière</th>
                      <th className="py-2.5 px-4 font-semibold">Échantillon</th>
                      <th className="py-2.5 px-4 font-semibold">Statut CQ</th>
                      <th className="py-2.5 px-4 font-semibold">Bulletin CQ</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {prelevements.length > 0 ? (
                      prelevements.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {p.numero}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900">{p.numero_lot}</span>
                            <span className="block text-[11px] text-slate-500">{p.nom_matiere}</span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {p.quantite_prelevee} {p.unite}
                          </td>
                          <td className="py-3 px-4">
                            {p.statut === "CONFORME" ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                CONFORME (LIBÉRÉ)
                              </span>
                            ) : p.statut === "NON_CONFORME" ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" />
                                REJETÉ
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" />
                                EN ATTENTE LABO
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                            {p.bulletin_analyse_ref || "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {p.statut === "EN_ATTENTE_CQ" ? (
                              <button
                                onClick={() => setSelectedPrelevement(p)}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1"
                              >
                                Valider CQ
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Clôturé</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Aucun prélèvement enregistré.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal dialogue de prélèvement */}
          {selectedLot && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40">
              <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-md space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Prélèvement d&apos;Échantillon — {selectedLot.numero_lot}
                  </h3>
                  <button onClick={() => setSelectedLot(null)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreerPrelevement} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Matière Première</label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedLot.nom_matiere} (${selectedLot.code_matiere})`}
                      className="w-full p-2 border rounded-xl bg-slate-50 text-slate-600 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Quantité prélevée</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={quantitePrelevee}
                        onChange={(e) => setQuantitePrelevee(e.target.value)}
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Unité</label>
                      <select
                        value={unitePrelevee}
                        onChange={(e) => setUnitePrelevee(e.target.value as Unite)}
                        className="w-full p-2 border rounded-xl bg-white"
                      >
                        <option value="G">Grammes (G)</option>
                        <option value="KG">Kilogrammes (KG)</option>
                        <option value="ML">Millilitres (ML)</option>
                        <option value="L">Litres (L)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Préleveur certifié</label>
                    <input
                      type="text"
                      required
                      value={preleveur}
                      onChange={(e) => setPreleveur(e.target.value)}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
                    📍 Emplacement standard : <strong>SAS Prélèvement MP - Flux Laminaire ISO 5</strong>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLot(null)}
                      className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm"
                    >
                      Confirmer le Prélèvement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal dialogue de validation CQ */}
          {selectedPrelevement && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40">
              <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-md space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Validation Laboratoire CQ — {selectedPrelevement.numero}
                  </h3>
                  <button onClick={() => setSelectedPrelevement(null)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500">Lot rattaché :</span>{" "}
                    <strong className="text-slate-900">{selectedPrelevement.numero_lot}</strong>{" "}
                    ({selectedPrelevement.nom_matiere})
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pharmacien / Responsable CQ
                    </label>
                    <input
                      type="text"
                      value={analyste}
                      onChange={(e) => setAnalyste(e.target.value)}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Référence Bulletin d&apos;Analyse
                    </label>
                    <input
                      type="text"
                      value={bulletinRef}
                      onChange={(e) => setBulletinRef(e.target.value)}
                      className="w-full p-2 border rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Commentaire / Conclusion</label>
                    <textarea
                      rows={2}
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => handleValiderAnalyse(false)}
                      className="flex-1 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter Lot
                    </button>
                    <button
                      type="button"
                      onClick={() => handleValiderAnalyse(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Libérer le Lot (DISPONIBLE)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Normes : BPF Européennes & Circulaires DPM Tunisie
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
