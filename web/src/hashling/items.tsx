// Wearable layers (pixel look), driven by the shared registry in items.json (v3): isolated pixel PNGs + a mount per item.
// Layer order, back to front: behindPet, [pet], frontStraps, frontAccessory, collar, hat (Hashling.tsx draws the pet).
import type { Equipped, Mood, Stage } from '../api'
import { mountFor, PIXELATED, WEARABLES, wearableTransform, wearableUrl, type AnchorName, type Layer, type WorldAnchor } from './geometry'

type Anchors = Record<AnchorName, WorldAnchor> | null

/** Equipped ids (one per slot) whose registry layer is `layer`. */
const idsFor = (equipped: Equipped, layer: Layer) =>
  [equipped.accessory, equipped.collar, equipped.hat].filter((id): id is string => !!id && WEARABLES[id]?.layer === layer)

export function WearLayer({ layer, equipped, anchors, stage, mood, uid }: { layer: Layer; equipped: Equipped; anchors: Anchors; stage: Stage; mood: Mood; uid: string }) {
  if (!anchors) return null // egg: no gear
  return (
    <>
      {idsFor(equipped, layer).map(id => {
        const w = WEARABLES[id]
        const t = wearableTransform(w, stage, anchors, 0, mood)
        if (!t) return null
        const fade = mountFor(w, stage).mask
        const [x0, , x1] = w.alphaBounds
        const k = `${uid}-${id}`
        return (
          <g key={id} data-wearable={id} transform={t}>
            {fade ? (
              <defs>
                <linearGradient id={`${k}-g`} gradientUnits="userSpaceOnUse" x1={x0} x2={x1} y1="0" y2="0">
                  <stop offset="0" stopColor="#000" /><stop offset={fade} stopColor="#fff" /><stop offset={1 - fade} stopColor="#fff" /><stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={`${k}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width={w.width} height={w.height}><rect width={w.width} height={w.height} fill={`url(#${k}-g)`} /></mask>
              </defs>
            ) : null}
            {w.crop ? (
              <defs>
                <clipPath id={`${k}-c`}>
                  <rect x={x0 + w.crop[0] * (x1 - x0)} y={w.alphaBounds[1] + w.crop[1] * (w.alphaBounds[3] - w.alphaBounds[1])}
                    width={(w.crop[2] - w.crop[0]) * (x1 - x0)} height={(w.crop[3] - w.crop[1]) * (w.alphaBounds[3] - w.alphaBounds[1]) + 1} />
                </clipPath>
              </defs>
            ) : null}
            <image href={wearableUrl(w.file)} x={0} y={0} width={w.width} height={w.height} aria-hidden style={PIXELATED}
              mask={fade ? `url(#${k}-m)` : undefined} clipPath={w.crop ? `url(#${k}-c)` : undefined} />
          </g>
        )
      })}
    </>
  )
}
