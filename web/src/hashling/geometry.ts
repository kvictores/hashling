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

// ---------------------------------------------------------------- wearables (registry v2, see items.json)
import ITEMS from './items.json'

export type Layer = 'behindPet' | 'frontStraps' | 'frontAccessory' | 'collar' | 'hat'
export interface Mount {
  anchor?: AnchorName | 'earL' | 'earR'
  span?: [string, string]
  at: [number, number]; w: number; dx: number; dy: number; rot?: number; mask?: number
  byStage?: Partial<Record<Stage, Partial<Mount>>>
}
/** A region authored in an anchor's canonical frame (SVG path data), used for clips and foreground fur patches. */
export interface Region { anchor: AnchorName | 'earL' | 'earR'; d: string; byStage?: Partial<Record<Stage, string>> }
export interface Wearable {
  slot: string; layer: Layer; file: string; width: number; height: number
  alphaBounds: [number, number, number, number]; mount: Mount; straps?: string
  /** hard visibility region for the art (hides curled tips etc.) */
  clip?: Region
  /** foreground patches of the SELECTED pet image drawn over the wearable (fur tufts overlapping its edges) */
  fur?: Region[]
  /** contact shadow generated from the item's own alpha, confined to the clip */
  shadow?: { dy: number; blur: number; opacity: number }
  /**
   * Pendant drawn at its own scale: the art is split at `cut` (fraction of the alpha height). Above it = the band (mount scale),
   * below it, within `xr` (fractions of the alpha width) = the pendant, scaled to `w` units for the full art width and hung from
   * the band's cut line (`dy` nudges it). The pendant is drawn above the foreground fur.
   */
  pendant?: { cut: number; xr: [number, number]; w: number; dy?: number }
}
export const WEARABLES = ITEMS.wearables as unknown as Record<string, Wearable>
export const STRAP_SVG = ITEMS.svg as unknown as Record<string, { layer: Layer; anchor: AnchorName; markup: string }>

export const wearableUrl = (file: string) => `${import.meta.env.BASE_URL}assets/hashling/wearables/${file}.png`

type Frames = Record<string, WorldAnchor>

/** Resolve a mount's origin frame in SVG space (a single anchor, or the midpoint of two for items that span the head). */
export function mountOrigin(m: Mount, anchors: Frames): WorldAnchor | null {
  if (m.span) {
    const a = anchors[m.span[0]], b = anchors[m.span[1]]
    if (!a || !b) return null
    const dx = b.x - a.x, dy = b.y - a.y
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, unit: Math.hypot(dx, dy) / 100, rot: (Math.atan2(dy, dx) * 180) / Math.PI }
  }
  return (m.anchor && anchors[m.anchor]) || null
}

/**
 * SVG transform that places a wearable's source-pixel image (drawn at 0,0,width,height) on the pet:
 * the `at` fraction of its physical-content (alpha) box lands on the anchor, scaled so that box spans `w` canonical units.
 */
export function wearableTransform(w: Wearable, stage: Stage, anchors: Frames, extraDy = 0): string | null {
  const m: Mount = { ...w.mount, ...(w.mount.byStage?.[stage] ?? {}) }
  const o = mountOrigin(m, anchors)
  if (!o) return null
  const [x0, y0, x1, y1] = w.alphaBounds
  const aw = x1 - x0, ah = y1 - y0
  const k = m.w / aw
  const px = x0 + m.at[0] * aw, py = y0 + m.at[1] * ah
  return `translate(${o.x.toFixed(2)} ${o.y.toFixed(2)}) rotate(${(o.rot + (m.rot ?? 0)).toFixed(2)}) scale(${o.unit.toFixed(4)}) translate(${m.dx} ${m.dy + extraDy}) scale(${k.toFixed(5)}) translate(${-px.toFixed(1)} ${-py.toFixed(1)})`
}
/** Numbers behind wearableTransform (for items that need a second, related transform such as a pendant). */
export function mountParts(w: Wearable, stage: Stage, anchors: Frames) {
  const m: Mount = { ...w.mount, ...(w.mount.byStage?.[stage] ?? {}) }
  const o = mountOrigin(m, anchors)
  if (!o) return null
  const [x0, y0, x1, y1] = w.alphaBounds
  const aw = x1 - x0, ah = y1 - y0
  return { o, m, k: m.w / aw, px: x0 + m.at[0] * aw, py: y0 + m.at[1] * ah, x0, y0, aw, ah }
}
/** Transform for the pendant portion of the art (see Wearable.pendant). */
export function pendantTransform(w: Wearable, stage: Stage, anchors: Frames): string | null {
  const P = w.pendant, mp = mountParts(w, stage, anchors)
  if (!P || !mp) return null
  const cx = mp.x0 + 0.5 * mp.aw, cy = mp.y0 + P.cut * mp.ah // joint: centre of the cut line, in source px
  const px = mp.m.dx + mp.k * (cx - mp.px), py = mp.m.dy + mp.k * (cy - mp.py) + (P.dy ?? 0) // where the band puts it (neck units)
  const kp = P.w / mp.aw
  return `translate(${mp.o.x.toFixed(2)} ${mp.o.y.toFixed(2)}) rotate(${(mp.o.rot + (mp.m.rot ?? 0)).toFixed(2)}) scale(${mp.o.unit.toFixed(4)}) translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${kp.toFixed(5)}) translate(${-cx.toFixed(1)} ${-cy.toFixed(1)})`
}
export const mountFor = (w: Wearable, stage: Stage): Mount => ({ ...w.mount, ...(w.mount.byStage?.[stage] ?? {}) })
