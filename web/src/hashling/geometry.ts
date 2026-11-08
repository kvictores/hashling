// Placement maths shared by every Hashling render (the extension's hashling.js mirrors this file).
// pets.json holds the measured numbers; this turns them into SVG-space transforms.
import PETS from './pets.json'
import type { Mood, Stage } from '../api'

export type AnchorName = 'crown' | 'neck' | 'chest' | 'shoulders' | 'paw'
interface SrcAnchor { x: number; y: number; s: number; r: number }
export interface WorldAnchor { x: number; y: number; unit: number; rot: number }

const CANVAS = PETS.canvas
const SRC = PETS.source
const GROUND = PETS.ground

/** Browser-safe URL for any exported Hashling art file (works under any Vite base path). */
export const assetUrl = (file: string, ext: 'png' | 'jpg' = 'png') => `${import.meta.env.BASE_URL}assets/hashling/${file}.${ext}`

export interface Placement {
  file: string
  /** top-left + size of the (square) source image in SVG units */
  x: number; y: number; size: number
  /** registration of fur variants: scale about the image centre + shift (SVG units) */
  corr: { s: number; dx: number; dy: number }
  anchors: Record<AnchorName, WorldAnchor> | null
}

type StageKey = keyof typeof PETS.stages
type AnchorSet = Record<AnchorName, SrcAnchor>

export function placement(stage: Stage, mood: Mood, fur: string | undefined): Placement {
  const st = PETS.stages[stage as StageKey] as {
    file: string; height: number; bbox: number[]; anchors?: AnchorSet
    alert?: { file: string; anchors: AnchorSet }
    furs?: Record<string, { file: string; corr: number[] }>
  }
  const [x0, y0, x1, y1] = st.bbox
  const k = st.height / (y1 - y0)
  const size = SRC * k
  const x = CANVAS / 2 - k * ((x0 + x1) / 2)
  const y = GROUND - k * y1

  let file = st.file
  let src: AnchorSet | undefined = st.anchors
  let corr = { s: 1, dx: 0, dy: 0 }
  if (stage === 'adult' && st.furs) {
    const f = st.furs[fur ?? 'fur_classic'] ?? st.furs.fur_classic
    file = f.file
    corr = { s: f.corr[0], dx: f.corr[1] * k, dy: f.corr[2] * k }
  }
  if (stage === 'cub' && mood === 'alert' && st.alert) {
    file = st.alert.file
    src = st.alert.anchors
  }
  let anchors: Placement['anchors'] = null
  if (src) {
    anchors = {} as Record<AnchorName, WorldAnchor>
    for (const n of Object.keys(src) as AnchorName[]) {
      const a = src[n]
      anchors[n] = { x: x + k * a.x, y: y + k * a.y, unit: k * a.s, rot: a.r }
    }
  }
  return { file, x, y, size, corr, anchors }
}

export const anchorTransform = (a: WorldAnchor) =>
  `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${a.rot}) scale(${a.unit.toFixed(4)})`

export const imageTransform = (p: Placement) => {
  const cx = p.x + p.size / 2, cy = p.y + p.size / 2
  const { s, dx, dy } = p.corr
  return s === 1 && !dx && !dy ? undefined : `translate(${(dx + cx).toFixed(2)} ${(dy + cy).toFixed(2)}) scale(${s}) translate(${-cx.toFixed(2)} ${-cy.toFixed(2)})`
}

export const CANVAS_SIZE = CANVAS
export const GROUND_Y = GROUND
