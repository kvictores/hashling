// Wearable layers, driven by the registry in items.json (v2): isolated PNG artwork + a mount per item.
// Layer order, back to front: behindPet, [pet], frontStraps, frontAccessory, collar, hat (Hashling.tsx draws the pet).
import type { Equipped, Stage } from '../api'
import { anchorTransform, assetUrl, imageTransform, mountFor, STRAP_SVG, WEARABLES, wearableTransform, wearableUrl, type AnchorName, type Layer, type Placement, type Region, type WorldAnchor } from './geometry'

type Anchors = Record<AnchorName, WorldAnchor> | null

/** Equipped ids (one per slot) whose registry layer is `layer`. */
const idsFor = (equipped: Equipped, layer: Layer) =>
  [equipped.accessory, equipped.collar, equipped.hat].filter((id): id is string => !!id && WEARABLES[id]?.layer === layer)

const regionD = (r: Region, stage: Stage) => r.byStage?.[stage] ?? r.d

export function WearLayer({ layer, equipped, anchors, stage, uid, pet }: { layer: Layer; equipped: Equipped; anchors: Anchors; stage: Stage; uid: string; pet: Placement }) {
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
        const k = `${uid}-${id}`
        const art = (extra?: { clip?: string; mask?: string; filter?: string; opacity?: number }) => (
          <image href={wearableUrl(w.file)} x={0} y={0} width={w.width} height={w.height} aria-hidden
            mask={extra?.mask} filter={extra?.filter} opacity={extra?.opacity} clipPath={extra?.clip} />
        )
        const clipA = w.clip && anchors[w.clip.anchor as AnchorName]
        const tShadow = w.shadow ? wearableTransform(w, stage, anchors, w.shadow.dy) : null
        const mk = mountFor(w, stage)
        const unit = anchors[(mk.anchor ?? 'crown') as AnchorName]?.unit ?? 1
        const kItem = (mk.w / (x1 - x0)) * unit // SVG units per source px of the item art
        return (
          <g key={id} data-wearable={id}>
            <defs>
              {w.clip && clipA ? <clipPath id={`${k}-clip`} transform={anchorTransform(clipA)}><path d={regionD(w.clip, stage)} /></clipPath> : null}
              {w.shadow ? (
                <filter id={`${k}-shf`} x="-10%" y="-20%" width="120%" height="160%" colorInterpolationFilters="sRGB">
                  <feColorMatrix type="matrix" values="0 0 0 0 0.10  0 0 0 0 0.19  0 0 0 0 0.15  0 0 0 0.9 0" />
                  <feGaussianBlur stdDeviation={(w.shadow.blur * unit) / kItem / 1} />
                </filter>
              ) : null}
              {/* fur patches use a very narrow feathered mask (about half a unit) so the tuft edge blends, it is not an opacity fade */}
              {(w.fur ?? []).map((r, i) => anchors[r.anchor as AnchorName] ? (
                <g key={i}>
                  <filter id={`${k}-ff${i}`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.45" /></filter>
                  <mask id={`${k}-fm${i}`} maskUnits="userSpaceOnUse" x="-50" y="-50" width="300" height="300">
                    <g transform={anchorTransform(anchors[r.anchor as AnchorName])}><path d={regionD(r, stage)} fill="#fff" filter={`url(#${k}-ff${i})`} /></g>
                  </mask>
                </g>
              ) : null)}
              {fade ? (
                <>
                  <linearGradient id={`${k}-mg`} gradientUnits="userSpaceOnUse" x1={x0} x2={x1} y1="0" y2="0">
                    <stop offset="0" stopColor="#000" /><stop offset={fade} stopColor="#fff" /><stop offset={1 - fade} stopColor="#fff" /><stop offset="1" stopColor="#000" />
                  </linearGradient>
                  <mask id={`${k}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width={w.width} height={w.height}><rect width={w.width} height={w.height} fill={`url(#${k}-mg)`} /></mask>
                </>
              ) : null}
              {w.detail ? (
                <>
                  <filter id={`${k}-df`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={w.detail.feather} /></filter>
                  <mask id={`${k}-det`} maskUnits="userSpaceOnUse" x="0" y="0" width={w.width} height={w.height}>
                    <g transform={`translate(${x0} ${w.alphaBounds[1]}) scale(${x1 - x0} ${w.alphaBounds[3] - w.alphaBounds[1]})`}>
                      <path d={w.detail.d} fill="#fff" filter={`url(#${k}-df)`} />
                    </g>
                  </mask>
                </>
              ) : null}
            </defs>
            {/* 1+2. the wearable body, clipped to where it is actually visible. A code-native band carries its own contact shadow. */}
            {w.band && anchors[w.band.anchor] ? (
              <g clipPath={w.clip && clipA ? `url(#${k}-clip)` : undefined}>
                <g transform={anchorTransform(anchors[w.band.anchor])} dangerouslySetInnerHTML={{ __html: w.band.markup.split('{{uid}}').join(k) }} />
              </g>
            ) : (
              <>
                {tShadow ? (
                  <g clipPath={w.clip && clipA ? `url(#${k}-clip)` : undefined}>
                    <g transform={tShadow}>{art({ filter: `url(#${k}-shf)`, opacity: w.shadow!.opacity })}</g>
                  </g>
                ) : null}
                <g clipPath={w.clip && clipA ? `url(#${k}-clip)` : undefined}>
                  <g transform={t}>{art({ mask: fade ? `url(#${k}-m)` : undefined })}</g>
                </g>
              </>
            )}
            {/* 3. local foreground fur: the selected pet image itself, clipped to small tuft-shaped regions */}
            {(w.fur ?? []).map((r, i) => anchors[r.anchor as AnchorName] ? (
              <g key={i} mask={`url(#${k}-fm${i})`}>
                <g transform={imageTransform(pet)}>
                  <image href={assetUrl(pet.file)} x={pet.x} y={pet.y} width={pet.size} height={pet.size} preserveAspectRatio="xMidYMid meet" aria-hidden />
                </g>
              </g>
            ) : null)}
            {/* 4. exposed pendant / ornament drawn above the fur */}
            {w.detail ? (
              <g transform={t}><g mask={`url(#${k}-det)`}>{art()}</g></g>
            ) : null}
          </g>
        )
      })}
    </>
  )
}
