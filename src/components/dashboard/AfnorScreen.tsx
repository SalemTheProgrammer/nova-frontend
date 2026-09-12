import { useEffect, useState, useMemo } from "react"
import { RefreshCw, Box } from "lucide-react"
import { cn } from "@/lib/utils"
import { kpiApi, ordresApi } from "@/lib/api"
import type { OrdreFabrication, TRSRead } from "@/lib/types"

/** Formate une durée en secondes en texte lisible */
function formatDuree(secondesStr: string | number | undefined | null): string {
  const s = Math.max(0, Number(secondesStr || 0))
  if (s === 0) return "0s"
  if (s < 60) return `${Math.round(s)}s`
  if (s < 3600) {
    const min = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`
  }
  const h = Math.floor(s / 3600)
  const min = Math.round((s % 3600) / 60)
  return min > 0 ? `${h}h ${min}m` : `${h}h`
}

/** Formate un taux décimal en pourcentage */
function formatPct(val: string | number | undefined | null): string {
  const n = Number(val || 0)
  return `${(n * 100).toFixed(1)}%`
}

export function AfnorScreen({ initialOfId }: { initialOfId?: number | null }) {
  const [ordres, setOrdres] = useState<OrdreFabrication[]>([])
  const [selectedOfId, setSelectedOfId] = useState<number | null>(initialOfId ?? null)
  const [trs, setTrs] = useState<TRSRead | null>(null)
  const [loading, setLoading] = useState(false)

  // Chargement des OFs disponibles
  useEffect(() => {
    ordresApi
      .list()
      .then((data) => {
        setOrdres(data)
        if (data.length > 0 && selectedOfId == null) {
          const enCours = data.find((o) => o.statut === "EN_COURS")
          setSelectedOfId(enCours ? enCours.id : data[0].id)
        }
      })
      .catch(() => {})
  }, [selectedOfId])

  // Chargement du TRS AFNOR pour l'OF sélectionné
  const fetchOfTrs = (ofId: number) => {
    setLoading(true)
    kpiApi
      .trs("of", ofId)
      .then((data) => setTrs(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (selectedOfId != null) {
      fetchOfTrs(selectedOfId)
    }
  }, [selectedOfId])

  const selectedOF = useMemo(
    () => ordres.find((o) => o.id === selectedOfId) ?? null,
    [ordres, selectedOfId],
  )

  // Ratios calculés
  const tsVal = useMemo(() => {
    if (!trs || !trs.tre || !trs.trg) return 1.0
    const trgNum = Number(trs.trg)
    return trgNum > 0 ? Number(trs.tre) / trgNum : 1.0
  }, [trs])

  const tcVal = useMemo(() => {
    if (!trs || !trs.trg || !trs.trs) return 1.0
    const trsNum = Number(trs.trs)
    return trsNum > 0 ? Number(trs.trg) / trsNum : 1.0
  }, [trs])

  const doVal = trs?.do ? Number(trs.do) : 1.0
  const tpVal = trs?.tp ? Number(trs.tp) : 1.0
  const tqVal = trs?.tq ? Number(trs.tq) : 1.0
  const trsVal = trs?.trs ? Number(trs.trs) : 1.0
  const trgVal = trs?.trg ? Number(trs.trg) : 1.0
  const treVal = trs?.tre ? Number(trs.tre) : 1.0

  // Durées formatées
  const ttStr = formatDuree(trs?.temps.tt)
  const toStr = formatDuree(trs?.temps.to)
  const trStr = formatDuree(trs?.temps.tr)
  const tfStr = formatDuree(trs?.temps.tf)
  const tnStr = formatDuree(trs?.temps.tn)
  const tuStr = formatDuree(trs?.temps.tu)
  const dispoPerteStr = formatDuree(trs?.pertes.disponibilite_s)
  const perfPerteStr = formatDuree(trs?.pertes.performance_s)
  const qualPerteStr = formatDuree(trs?.pertes.qualite_s)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-zinc-950 p-1 sm:p-2 text-zinc-900 dark:text-zinc-100 select-none">
      {/* Barre compacte d'en-tête et sélection d'OF */}
      <div className="mb-1 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <Box className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 shrink-0">
            Ordre de fabrication :
          </span>
          <select
            value={selectedOfId ?? ""}
            onChange={(e) => setSelectedOfId(e.target.value ? Number(e.target.value) : null)}
            className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[260px] truncate"
          >
            {ordres.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero} · {o.designation_article || o.code_article} ({o.statut})
              </option>
            ))}
          </select>

          {selectedOF && (
            <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
              <span className="rounded bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 font-bold text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                {selectedOF.statut}
              </span>
              <span>
                Prévu : <strong className="text-zinc-900 dark:text-zinc-100">{selectedOF.quantite_planifiee} {selectedOF.unite}</strong>
              </span>
              <span>
                Bonnes : <strong className="text-emerald-600 dark:text-emerald-400">{trs?.quantite_bonne ?? selectedOF.quantite_bonne}</strong>
              </span>
              <span>
                Rebuts : <strong className="text-red-600 dark:text-red-400">{trs?.quantite_rejetee ?? selectedOF.quantite_rejetee}</strong>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => selectedOfId != null && fetchOfTrs(selectedOfId)}
          disabled={loading || selectedOfId == null}
          className="flex h-7 items-center gap-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95 shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", loading && "animate-spin text-sky-600")} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Le Diagramme Exact AFNOR NF E 60-182 rendu avec plus de hauteur sur chaque élément */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-1 shadow-sm">
        <svg
          viewBox="0 0 1000 456"
          className="h-full w-full max-h-full max-w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Dégradés pour un rendu identique à l'affiche */}
            <linearGradient id="blueCardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00b0ff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>

            <linearGradient id="orangeCardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff8000" />
              <stop offset="100%" stopColor="#e65100" />
            </linearGradient>

            <linearGradient id="yellowCardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffeb3b" />
              <stop offset="100%" stopColor="#ffd600" />
            </linearGradient>

            <linearGradient id="grayCardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cfd8dc" />
              <stop offset="100%" stopColor="#b0bec5" />
            </linearGradient>

            <linearGradient id="greenCardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#65a30d" />
            </linearGradient>
          </defs>

          {/* ========================================================
              COLONNE GAUCHE (LES 5 RATIOS + 3 FORMULES SYNTHÈSE)
             ======================================================== */}

          {/* Carte 1 : Taux Stratégique */}
          <g>
            <rect x="8" y="8" width="186" height="58" rx="8" fill="url(#blueCardGrad)" />
            <text x="14" y="27" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff">
              Taux Stratégique
            </text>
            <text x="14" y="49" fontFamily="Courier New, monospace" fontSize="11" fontWeight="bold" fill="#e0f2fe">
              TS = TO / TT <tspan fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" fill="#ffffff">({formatPct(tsVal)})</tspan>
            </text>
            {/* Icône Speedometer */}
            <circle cx="166" cy="37" r="13" fill="#005b9f" opacity="0.3" />
            <path d="M 156 43 A 11 11 0 0 1 176 43" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="166" y1="43" x2="170" y2="34" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            {/* Flèche droite grise vers niveau 1 */}
            <polygon points="196,37 203,32 203,35 210,35 210,39 203,39 203,42" fill="#94a3b8" />
          </g>

          {/* Carte 2 : Taux de Charge */}
          <g>
            <rect x="8" y="72" width="186" height="58" rx="8" fill="url(#orangeCardGrad)" />
            <text x="14" y="91" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff">
              Taux de Charge
            </text>
            <text x="14" y="113" fontFamily="Courier New, monospace" fontSize="11" fontWeight="bold" fill="#ffedd5">
              TC = TR / TO <tspan fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" fill="#ffffff">({formatPct(tcVal)})</tspan>
            </text>
            {/* Icône Formation/Equipe */}
            <circle cx="166" cy="101" r="13" fill="#8f3000" opacity="0.3" />
            <rect x="157" y="93" width="18" height="11" rx="1" fill="#ffffff" />
            <path d="M 166 104 L 166 110 M 161 110 L 171 110" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            {/* Flèche droite grise vers niveau 2 */}
            <polygon points="196,101 203,96 203,99 210,99 210,103 203,103 203,106" fill="#94a3b8" />
          </g>

          {/* Carte 3 : Disponibilité Opérationnelle */}
          <g>
            <rect x="8" y="136" width="186" height="58" rx="8" fill="url(#yellowCardGrad)" />
            <text x="14" y="155" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#18181b">
              Disponibilité Opérationnelle
            </text>
            <text x="14" y="177" fontFamily="Courier New, monospace" fontSize="11" fontWeight="bold" fill="#27272a">
              DO = TF / TR <tspan fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" fill="#18181b">({formatPct(doVal)})</tspan>
            </text>
            {/* Icône Feu tricolore */}
            <circle cx="166" cy="165" r="13" fill="#b45309" opacity="0.2" />
            <rect x="160" y="154" width="12" height="22" rx="2" fill="#18181b" />
            <circle cx="166" cy="159" r="2.2" fill="#ef4444" />
            <circle cx="166" cy="165" r="2.2" fill="#f59e0b" />
            <circle cx="166" cy="171" r="2.2" fill="#22c55e" />
            {/* Flèche droite grise vers niveau 3 */}
            <polygon points="196,165 203,160 203,163 210,163 210,167 203,167 203,170" fill="#94a3b8" />
          </g>

          {/* Carte 4 : Taux de Performance */}
          <g>
            <rect x="8" y="200" width="186" height="58" rx="8" fill="url(#grayCardGrad)" />
            <text x="14" y="219" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#0f172a">
              Taux de Performance
            </text>
            <text x="14" y="241" fontFamily="Courier New, monospace" fontSize="11" fontWeight="bold" fill="#1e293b">
              TP = TN / TF <tspan fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" fill="#0f172a">({formatPct(tpVal)})</tspan>
            </text>
            {/* Icône Tortue / Vitesse */}
            <circle cx="166" cy="229" r="13" fill="#475569" opacity="0.2" />
            <ellipse cx="166" cy="229" rx="8" ry="5.5" fill="#0f172a" />
            <circle cx="175" cy="229" r="2.5" fill="#0f172a" />
            {/* Flèche droite grise vers niveau 4 */}
            <polygon points="196,229 203,224 203,227 210,227 210,231 203,231 203,234" fill="#94a3b8" />
          </g>

          {/* Carte 5 : Taux de Qualité */}
          <g>
            <rect x="8" y="264" width="186" height="58" rx="8" fill="url(#greenCardGrad)" />
            <text x="14" y="283" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#052e16">
              Taux de Qualité
            </text>
            <text x="14" y="305" fontFamily="Courier New, monospace" fontSize="11" fontWeight="bold" fill="#052e16">
              TQ = TU / TN <tspan fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" fill="#052e16">({formatPct(tqVal)})</tspan>
            </text>
            {/* Icône Poubelle / Rebut */}
            <circle cx="166" cy="293" r="13" fill="#14532d" opacity="0.2" />
            <path d="M 159 286 L 173 286 M 162 286 L 163 301 L 169 301 L 170 286" stroke="#052e16" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {/* Flèche droite grise vers niveau 5 */}
            <polygon points="196,293 203,288 203,291 210,291 210,295 203,295 203,298" fill="#94a3b8" />
          </g>

          {/* Formules de synthèse en bas à gauche */}
          <rect x="8" y="340" width="186" height="30" rx="5" fill="#ffd600" />
          <text x="101" y="359" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#000000">
            TRS = TQ * TP * DO  ({formatPct(trsVal)})
          </text>

          <rect x="8" y="378" width="186" height="30" rx="5" fill="#ff6d00" />
          <text x="101" y="397" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#ffffff">
            TRG = TRS * TC  ({formatPct(trgVal)})
          </text>

          <rect x="8" y="416" width="186" height="30" rx="5" fill="#0091ea" />
          <text x="101" y="435" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#ffffff">
            TRE = TRG * TS  ({formatPct(treVal)})
          </text>


          {/* ========================================================
              3. CASCADE CENTRALE DES 5 NIVEAUX DE TEMPS
             ======================================================== */}

          {/* Lignes de guide verticales tombant vers les flèches du bas */}
          <line x1="745" y1="74" x2="745" y2="361" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          <line x1="875" y1="8" x2="875" y2="399" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          <line x1="992" y1="8" x2="992" y2="437" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />

          {/* ----------------- NIVEAU 1 : TT & TO ----------------- */}
          {/* Barre TT (Bleu Foncé) */}
          <rect x="214" y="8" width="778" height="28" rx="4" fill="#1976d2" stroke="#1565c0" strokeWidth="1" />
          <text x="603" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#ffffff">
            Temps Total (24h / 24h) - TT  {trs && `(${ttStr})`}
          </text>

          {/* Sous-barre TO (Bleu Ciel) */}
          <rect x="214" y="39" width="661" height="28" rx="4" fill="#00b0ff" stroke="#0091ea" strokeWidth="1" />
          <text x="544" y="57" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#ffffff">
            Temps d'Ouverture - TO  {trs && `(${toStr})`}
          </text>

          {/* Bloc Fermeture */}
          <rect x="878" y="39" width="114" height="28" rx="4" fill="#e1f5fe" stroke="#0288d1" strokeWidth="1.2" />
          <text x="935" y="57" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#01579b">
            Fermeture
          </text>

          {/* Flèche vers boîte fermeture */}
          <polygon points="935,69 931,73 939,73" fill="#0288d1" />

          {/* Boîte explicative Fermeture en 2*8h (Colonne extrême droite) */}
          <rect x="880" y="75" width="112" height="82" rx="6" fill="#e1f5fe" stroke="#0288d1" strokeWidth="1.2" />
          <text x="888" y="95" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#01579b">
            En 2 * 8h :
          </text>
          <text x="888" y="112" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#01579b">
            Temps de
          </text>
          <text x="888" y="128" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#01579b">
            Fermeture est
          </text>
          <text x="888" y="145" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#01579b">
            de 8h
          </text>


          {/* ----------------- NIVEAU 2 : TO & TR ----------------- */}
          {/* Rappel TO */}
          <rect x="214" y="74" width="661" height="28" rx="4" fill="#00b0ff" stroke="#0091ea" strokeWidth="1" />
          <text x="544" y="92" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#ffffff">
            Temps d'Ouverture - TO
          </text>

          {/* Sous-barre TR (Orange) */}
          <rect x="214" y="105" width="531" height="28" rx="4" fill="#ff6d00" stroke="#e65100" strokeWidth="1" />
          <text x="479" y="123" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#ffffff">
            Temps Requis - TR  {trs && `(${trStr})`}
          </text>

          {/* Bloc Arrêts Planifiés */}
          <rect x="748" y="105" width="127" height="28" rx="4" fill="#d50000" stroke="#b71c1c" strokeWidth="1" />
          <text x="811" y="123" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11.5" fontWeight="bold" fill="#ffffff">
            Arrêts Planifiés
          </text>

          {/* Flèche vers boîte rouge */}
          <polygon points="811,135 807,139 815,139" fill="#d50000" />

          {/* Boîte ROUGE détaillée Arrêts Planifiés */}
          <rect x="752" y="141" width="123" height="152" rx="8" fill="#d50000" stroke="#b71c1c" strokeWidth="1.2" />
          <text x="760" y="162" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Pauses</text>
          <text x="760" y="182" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Réunions</text>
          <text x="760" y="202" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Maintenance</text>
          <text x="768" y="217" fontFamily="Arial, sans-serif" fontSize="10" fill="#fecaca">préventive</text>
          <text x="760" y="237" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Essais</text>
          <text x="760" y="257" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Sous charge</text>
          <text x="760" y="277" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Nettoyage</text>


          {/* ----------------- NIVEAU 3 : TR & TF ----------------- */}
          {/* Rappel TR */}
          <rect x="214" y="140" width="531" height="28" rx="4" fill="#ff6d00" stroke="#e65100" strokeWidth="1" />
          <text x="479" y="158" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="bold" fill="#ffffff">
            Temps Requis - TR
          </text>

          {/* Sous-barre TF (Jaune) */}
          <rect x="214" y="171" width="380" height="28" rx="4" fill="#ffd600" stroke="#fbc02d" strokeWidth="1" />
          <text x="404" y="189" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#18181b">
            Temps de Fonctionnement - TF  {trs && `(${tfStr})`}
          </text>

          {/* Bloc Arrêts Non Planifiés */}
          <rect x="597" y="171" width="148" height="28" rx="4" fill="#ff3d00" stroke="#dd2c00" strokeWidth="1" />
          <text x="671" y="183" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10.5" fontWeight="bold" fill="#ffffff">
            Arrêts Non Planifiés
          </text>
          {trs && (
            <text x="671" y="194" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9.5" fontWeight="bold" fill="#ffffff">
              ({dispoPerteStr})
            </text>
          )}

          {/* Flèche vers boîte orange */}
          <polygon points="671,201 667,205 675,205" fill="#ff3d00" />

          {/* Boîte ORANGE détaillée Arrêts Non Planifiés */}
          <rect x="600" y="207" width="144" height="98" rx="8" fill="#ff3d00" stroke="#dd2c00" strokeWidth="1.2" />
          <text x="608" y="227" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Pannes</text>
          <text x="608" y="246" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Changements de</text>
          <text x="616" y="261" fontFamily="Arial, sans-serif" fontSize="10" fill="#ffedd5">production</text>
          <text x="608" y="280" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Réglages</text>
          <text x="608" y="297" fontFamily="Arial, sans-serif" fontSize="10.5" fill="#ffffff">• Attentes</text>


          {/* ----------------- NIVEAU 4 : TF & TN ----------------- */}
          {/* Rappel TF */}
          <rect x="214" y="206" width="380" height="28" rx="4" fill="#ffd600" stroke="#fbc02d" strokeWidth="1" />
          <text x="404" y="224" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#18181b">
            Temps de Fonctionnement - TF
          </text>

          {/* Sous-barre TN (Gris clair) */}
          <rect x="214" y="237" width="246" height="28" rx="4" fill="#cfd8dc" stroke="#b0bec5" strokeWidth="1" />
          <text x="337" y="255" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#18181b">
            Temps Net - TN  {trs && `(${tnStr})`}
          </text>

          {/* Bloc Écart de cadence */}
          <rect x="463" y="237" width="131" height="28" rx="4" fill="#607d8b" stroke="#455a64" strokeWidth="1" />
          <text x="528" y="249" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10.5" fontWeight="bold" fill="#ffffff">
            Écart de cadence
          </text>
          {trs && (
            <text x="528" y="260" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9.5" fontWeight="bold" fill="#ffffff">
              ({perfPerteStr})
            </text>
          )}


          {/* ----------------- NIVEAU 5 : TN & TU ----------------- */}
          {/* Rappel TN */}
          <rect x="214" y="272" width="246" height="28" rx="4" fill="#cfd8dc" stroke="#b0bec5" strokeWidth="1" />
          <text x="337" y="290" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#18181b">
            Temps Net - TN
          </text>

          {/* Sous-barre TU (Vert Vif) */}
          <rect x="214" y="303" width="131" height="28" rx="4" fill="#76ff03" stroke="#64dd17" strokeWidth="1" />
          <text x="279" y="315" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10.5" fontWeight="900" fill="#000000">
            Temps Utile - TU
          </text>
          {trs && (
            <text x="279" y="326" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9.5" fontWeight="bold" fill="#000000">
              ({tuStr})
            </text>
          )}

          {/* Bloc Non Qualité */}
          <rect x="348" y="303" width="112" height="28" rx="4" fill="#dcedc8" stroke="#8bc34a" strokeWidth="1.2" />
          <text x="404" y="315" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10.5" fontWeight="bold" fill="#2e7d32">
            Non Qualité
          </text>
          {trs && (
            <text x="404" y="326" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9.5" fontWeight="bold" fill="#2e7d32">
              ({qualPerteStr})
            </text>
          )}


          {/* ========================================================
              4. FLÈCHES HORIZONTALES DOUBLES DES RAPPORTS DE SYNTHÈSE
             ======================================================== */}

          {/* Ligne 1 : TRS = TU / TR */}
          <g>
            <rect x="214" y="340" width="130" height="30" rx="5" fill="#ffd600" />
            <text x="279" y="359" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#000000">
              TRS = TU / TR
            </text>

            {/* Flèche horizontale double Jaune (de 348 à 745) */}
            <path
              d="M 358 343 L 344 355 L 358 367 L 358 360 L 731 360 L 731 367 L 745 355 L 731 343 L 731 350 L 358 350 Z"
              fill="#ffd600"
              stroke="#eab308"
              strokeWidth="0.8"
            />
            <text x="546" y="359" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#000000">
              {formatPct(trsVal)}
            </text>
          </g>

          {/* Ligne 2 : TRG = TU / TO */}
          <g>
            <rect x="214" y="378" width="130" height="30" rx="5" fill="#ff6d00" />
            <text x="279" y="397" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff">
              TRG = TU / TO
            </text>

            {/* Flèche horizontale double Orange (de 348 à 875) */}
            <path
              d="M 358 381 L 344 393 L 358 405 L 358 398 L 861 398 L 861 405 L 875 393 L 861 381 L 861 388 L 358 388 Z"
              fill="#ff6d00"
              stroke="#ea580c"
              strokeWidth="0.8"
            />
            <text x="611" y="397" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff">
              {formatPct(trgVal)}
            </text>
          </g>

          {/* Ligne 3 : TRE = TU / TT */}
          <g>
            <rect x="214" y="416" width="130" height="30" rx="5" fill="#0091ea" />
            <text x="279" y="435" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff">
              TRE = TU / TT
            </text>

            {/* Flèche horizontale double Bleue (de 348 à 992) */}
            <path
              d="M 358 419 L 344 431 L 358 443 L 358 436 L 978 436 L 978 443 L 992 431 L 978 419 L 978 426 L 358 426 Z"
              fill="#0091ea"
              stroke="#0284c7"
              strokeWidth="0.8"
            />
            <text x="670" y="435" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff">
              {formatPct(treVal)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
