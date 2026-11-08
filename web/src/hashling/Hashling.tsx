import { useId } from 'react'
import type { Equipped, Mood, Stage } from '../api'
import { WearLayer } from './items'
import { GROUND_Y, PIXELATED, pixelUrl, placement, type WorldAnchor } from './geometry'

/** Crop the canvas to the part of the pet an item sits on (shop thumbnails use the same renderer, just zoomed in). */
export type Focus = 'hat' | 'collar' | 'chest' | 'paw' | 'head'

export interface HashlingProps {
  stage: Stage
  mood?: Mood
  equipped?: Equipped
  size?: number | string
  className?: string
  title?: string
  animated?: boolean
  /** draw the soft ground shadow inside the SVG (turn off when the page draws its own contact shadow) */
  shadow?: boolean
  /** zoom the viewBox onto one anchor (used for shop item thumbnails) */
  focus?: Focus
}

/**
 * The shared mascot. Layer order (back to front):
 *   contact shadow -> behind-accessory (backpack panels) -> pet PNG -> front accessory (straps / shield / magnifier)
 *   -> collar -> hat -> mood cue.
 * Wearables are SVG fragments mapped onto the PNG's anatomy anchors (pets.json), so the same equipment renders on
 * every stage, every fur and every instance (shop thumbnails, den, quiz, switcher).
 *
 * The pixel art is static: happy = the waving sprite, sleepy = the sleeping sprite, sad/alert = the idle sprite with restrained
 * whole-image motion plus a small labelled cue badge. Nothing pretends the faces move independently.
 */
export function Hashling({ stage, mood = 'happy', equipped = {}, size = 200, className, title, animated = true, shadow = true, focus }: HashlingProps) {
  const uid = 'hl' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const warn = mood === 'alert' ? ', on alert: warning' : ''
  const label = title ?? `Hashling the ${stage === 'egg' ? 'egg' : `snow-leopard ${stage}`}, feeling ${mood}${warn}`
  const pl = placement(stage, mood, equipped.fur)
  const a = pl.anchors
  const anim = animated

  // whole-image pose per mood (static art -> restrained motion + a labelled cue badge)
  const bodyClass = !anim ? undefined
    : stage === 'egg' ? (mood === 'alert' ? 'hl-shake' : mood === 'sleepy' ? 'hl-breathe-slow' : 'hl-wobble')
    : mood === 'alert' ? 'hl-alert-bob' // no alert sprite: same stage + gear, restrained bob and the labelled warning badge
    : mood === 'sleepy' ? 'hl-breathe-slow'
    : mood === 'sad' ? 'hl-sad-sway'
    : 'hl-breathe'
  const pivot = `translate(100 ${GROUND_Y}) `
  const unpivot = ` translate(-100 -${GROUND_Y})`
  const pose = stage === 'egg' ? ''
    : mood === 'sad' ? `${pivot}scale(1 0.965)${unpivot}`
    : mood === 'sleepy' ? `${pivot}scale(1 0.985)${unpivot}`
    : ''
  const tone = mood === 'sad' ? 'saturate(0.82) brightness(0.97)' : mood === 'sleepy' ? 'brightness(0.97) saturate(0.95)' : undefined
  const cueAt = a ? { x: a.crown.x + 31, y: a.crown.y - 3 } : { x: 154, y: 58 }
  const shadowRx = stage === 'egg' ? 40 : stage === 'kitten' ? 48 : stage === 'cub' ? 54 : 62

  let viewBox = '0 0 200 200'
  if (focus && a) {
    const box = { head: [a.crown.x, a.crown.y + 24, 80], hat: [a.crown.x, a.crown.y + 10, 78], collar: [a.neck.x, a.neck.y - 6, 84], chest: [a.chest.x, a.chest.y, 80], paw: [a.paw.x + 10, a.paw.y - 22, 86] }[focus]
    viewBox = `${(box[0] - box[2] / 2).toFixed(1)} ${(box[1] - box[2] / 2).toFixed(1)} ${box[2]} ${box[2]}`
  }

  return (
    <svg viewBox={viewBox} width={size} height={size} className={className} role="img" aria-label={label} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${uid}-sh`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1F3D2F" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#1F3D2F" stopOpacity="0" />
        </radialGradient>
      </defs>
      {shadow && <ellipse cx={100} cy={GROUND_Y + 1} rx={shadowRx} ry={6.5} fill={`url(#${uid}-sh)`} />}
      <g className={bodyClass}>
        <g transform={pose || undefined}>
          <g style={tone ? { filter: tone } : undefined}>
            <WearLayer layer="behindPet" equipped={equipped} anchors={a} stage={stage} mood={mood} uid={uid} />
            <image href={pixelUrl(pl.file)} x={pl.x} y={pl.y} width={pl.w} height={pl.h} preserveAspectRatio="xMidYMid meet" aria-hidden style={PIXELATED} />
            <WearLayer layer="frontStraps" equipped={equipped} anchors={a} stage={stage} mood={mood} uid={uid} />
            <WearLayer layer="frontAccessory" equipped={equipped} anchors={a} stage={stage} mood={mood} uid={uid} />
            <WearLayer layer="collar" equipped={equipped} anchors={a} stage={stage} mood={mood} uid={uid} />
            <WearLayer layer="hat" equipped={equipped} anchors={a} stage={stage} mood={mood} uid={uid} />
          </g>
        </g>
      </g>
      <MoodCue mood={mood} at={cueAt} anim={anim} />
    </svg>
  )
}

/** Small labelled badge so the mood reads even though the PNG's face is static. */
function MoodCue({ mood, at, anim }: { mood: Mood; at: Pick<WorldAnchor, 'x' | 'y'>; anim: boolean }) {
  if (mood === 'happy') return null
  return (
    <g transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`} aria-hidden>
      {mood === 'alert' && (
        <g className={anim ? 'hl-cue-pop' : undefined}>
          <circle r={9.5} fill="#D9463B" stroke="#fff" strokeWidth={2} />
          <rect x={-1.5} y={-5.6} width={3} height={7} rx={1.5} fill="#fff" />
          <circle cy={4.6} r={1.7} fill="#fff" />
        </g>
      )}
      {mood === 'sad' && (
        <g className={anim ? 'hl-cue-pop' : undefined}>
          <path d="M0 -10 C6 -2 8 2 8 5 A8 8 0 0 1 -8 5 C-8 2 -6 -2 0 -10Z" fill="#7FC4E0" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M-3.4 3 A4 4 0 0 0 -1.2 7.2" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity={0.85} />
        </g>
      )}
      {mood === 'sleepy' && (
        <g fill="#52675E" fontFamily="Fraunces, Georgia, serif" fontWeight={700} stroke="#FFFEF9" strokeWidth={0.8} paintOrder="stroke">
          <text x={-2} y={4} fontSize={16} className={anim ? 'hl-z' : undefined}>z</text>
          <text x={8} y={-8} fontSize={11} className={anim ? 'hl-z hl-z2' : undefined}>z</text>
        </g>
      )}
    </g>
  )
}
