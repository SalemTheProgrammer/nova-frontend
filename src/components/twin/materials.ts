import * as THREE from "three"

/**
 * Matériaux partagés du jumeau numérique — instanciés une seule fois pour que
 * tous les modules de la ligne partagent les mêmes programmes GPU.
 * La palette copie l'image de référence : inox brossé, verre de protection,
 * liserés LED bleus, bacs REJET à fond bleu lumineux.
 */

function std(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(params)
}

export const M = {
  /** Inox poli des carters principaux. */
  inox: std({ color: "#dde2e7", metalness: 0.9, roughness: 0.24, envMapIntensity: 1.15 }),
  /** Inox satiné (piètements, châssis). */
  inoxSatin: std({ color: "#c6ccd3", metalness: 0.82, roughness: 0.42 }),
  /** Panneaux de portes inférieures, un ton plus sombre. */
  inoxDoor: std({ color: "#b4bbc3", metalness: 0.85, roughness: 0.36 }),
  /** Acier foncé (pieds, supports, mécanismes). */
  steelDark: std({ color: "#59616a", metalness: 0.75, roughness: 0.45 }),
  /** Profilés de cadres (portes vitrées, tunnels). */
  frame: std({ color: "#9aa3ac", metalness: 0.88, roughness: 0.3 }),
  /** Capot supérieur aluminium clair. */
  alu: std({ color: "#eef1f4", metalness: 0.55, roughness: 0.32 }),
  /** Bobine de film aluminium. */
  foil: std({ color: "#e8ebf0", metalness: 1, roughness: 0.14, envMapIntensity: 1.3 }),
  /** Blisters argentés (PVC/Alu). */
  blister: std({ color: "#dfe4ea", metalness: 0.95, roughness: 0.2 }),
  /** Étuis carton blancs. */
  boxWhite: std({ color: "#f7f9fc", metalness: 0.02, roughness: 0.55 }),
  /** Plastiques sombres (écrans, boutons, gaines). */
  plasticDark: std({ color: "#2c3136", metalness: 0.2, roughness: 0.6 }),
  /** Contour d'écran quasi noir. */
  bezel: std({ color: "#15181c", metalness: 0.4, roughness: 0.35 }),
  /** Bande LED bleue (liserés sous convoyeurs et guides). */
  blueLed: std({ color: "#0b2a66", emissive: "#2f7dff", emissiveIntensity: 2.6, roughness: 0.4 }),
  /** Fond bleu lumineux des bacs REJET. */
  binInner: std({ color: "#0a2f66", emissive: "#1450d6", emissiveIntensity: 1.0, roughness: 0.55 }),
  /** Bouton d'arrêt d'urgence. */
  redBtn: std({ color: "#c81e1e", metalness: 0.1, roughness: 0.35 }),
  /** Bouton marche. */
  greenBtn: std({ color: "#18a34a", metalness: 0.1, roughness: 0.35 }),
  /** Collerette jaune de l'arrêt d'urgence. */
  yellow: std({ color: "#f0b90b", metalness: 0.2, roughness: 0.45 }),
  /** Bande transporteuse (sans texture — les bandes texturées sont créées par convoyeur). */
  rubber: std({ color: "#23262a", metalness: 0, roughness: 0.9 }),
  /** Rouleau d'étiquettes blanc. */
  labelRoll: std({ color: "#f2f4f7", metalness: 0.05, roughness: 0.5 }),
}

/** Verre de protection (portes de la blistéreuse, tunnel de la trieuse). */
export const GLASS = new THREE.MeshPhysicalMaterial({
  color: "#d7e7f4",
  transparent: true,
  opacity: 0.16,
  roughness: 0.06,
  metalness: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
  envMapIntensity: 1.3,
})

// --------------------------- Textures dessinées --------------------------- //

export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (ctx) draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Texture de texte centré sur fond transparent (marquages REJET, PHARMA TECH…). */
export function textTexture(
  text: string,
  opts: { w?: number; h?: number; size?: number; color?: string; weight?: string } = {},
): THREE.Texture {
  const { w = 512, h = 128, size = 72, color = "#3d434a", weight = "700" } = opts
  return canvasTexture(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h)
    ctx.font = `${weight} ${size}px "Geist Variable", Arial, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = color
    ctx.fillText(text, w / 2, h / 2)
  })
}

/** Bande transporteuse rayée — chaque convoyeur clone la sienne pour défiler indépendamment. */
export function beltTexture(repeats: number): THREE.CanvasTexture {
  const tex = canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#2e3237"
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = "#3b4046"
    ctx.fillRect(0, 0, 7, h)
    ctx.fillStyle = "#282c30"
    ctx.fillRect(32, 0, 3, h)
  })
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(Math.max(1, Math.round(repeats)), 1)
  return tex
}

/** Matériau d'écran émissif construit sur une texture canvas (HMI, afficheur de pesée). */
export function screenMaterial(tex: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    emissive: "#ffffff",
    emissiveMap: tex,
    emissiveIntensity: 0.9,
    color: "#0c0f13",
    roughness: 0.35,
    metalness: 0,
  })
}
