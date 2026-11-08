// Wearable layers, driven by the registry in items.json (v2): isolated PNG artwork + a mount per item.
// Layer order, back to front: behindPet, [pet], frontStraps, frontAccessory, collar, hat (Hashling.tsx draws the pet).
import type { Equipped, Stage } from '../api'
import { anchorTransform, mountFor, STRAP_SVG, WEARABLES, wearableTransform, wearableUrl, type AnchorName, type Layer, type WorldAnchor } from './geometry'

type Anchors = Record<AnchorName, WorldAnchor> | null

/** Equipped ids (one per slot) whose registry layer is `layer`. */
const idsFor = (equipped: Equipped, layer: Layer) =>
  [equipped.accessory, equipped.collar, equipped.hat].filter((id): id is string => !!id && WEARABLES[id]?.layer === layer)

export function WearLayer({ layer, equipped, anchors, stage, uid }: { layer: Layer; equipped: Equipped; anchors: Anchors; stage: Stage; uid: string }) {
  if (!anchors) return null
  // code-native straps live on their own layer and are generated from the same shared anchors
  if (layer === 'frontStraps') {
    return (
      <>
        {[equipped.accessory].filter(Boolean).map(id => {
          const sid = id && WEARABLES[id]?.straps
          const s = sid ? STRAP_SVG[sid] : undefined
          return s && anchors[s.anchor] ? (
            <g key={sid} transform={anchorTransform(anchors[s.anchor])} dangerouslySetInnerHTML={{ __html: s.markup.split('{{uid}}').join(`${uid}s`) }} />
          ) : null
        })}
      </>
    )
  }
  return (
    <>
      {idsFor(equipped, layer).map(id => {
        const w = WEARABLES[id]
        const t = wearableTransform(w, stage, anchors)
        if (!t) return null
        const fade = mountFor(w, stage).mask
        const [x0, , x1] = w.alphaBounds
        const mid = `${uid}-${id}-m`
        return (
          <g key={id} data-wearable={id} transform={t}>
            {fade ? (
              <defs>
                <linearGradient id={`${mid}g`} gradientUnits="userSpaceOnUse" x1={x0} x2={x1} y1="0" y2="0">
                  <stop offset="0" stopColor="#000" />
                  <stop offset={fade} stopColor="#fff" />
                  <stop offset={1 - fade} stopColor="#fff" />
                  <stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={mid} maskUnits="userSpaceOnUse" x="0" y="0" width={w.width} height={w.height}>
                  <rect x="0" y="0" width={w.width} height={w.height} fill={`url(#${mid}g)`} />
                </mask>
              </defs>
            ) : null}
            <image href={wearableUrl(w.file)} x={0} y={0} width={w.width} height={w.height} mask={fade ? `url(#${mid})` : undefined} aria-hidden />
          </g>
        )
      })}
    </>
  )
}
