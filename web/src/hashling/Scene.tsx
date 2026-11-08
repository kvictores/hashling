import type { ReactNode } from 'react'
import { backgroundUrl, PIXELATED } from './geometry'

// Habitats (pixel look). Backend IDs are unchanged; the art + display names are the pixel pack's:
//   bg_greenhouse -> Glasshouse Garden, bg_rooftop -> Solarpunk Rooftops, bg_neon -> Canal Garden.
// The images are pet-free; the live pet is drawn as its own sprite with its own contact shadow (see PetStand).
const FILES: Record<string, string> = { bg_greenhouse: 'bg-glasshouse', bg_rooftop: 'bg-rooftop', bg_neon: 'bg-canal' }
export const BACKGROUND_NAMES: Record<string, string> = { bg_greenhouse: 'Glasshouse Garden', bg_rooftop: 'Solarpunk Rooftops', bg_neon: 'Canal Garden' }

/**
 * Where each habitat's foreground landing area is, as a fraction of the scene height from the top (the pet's paws rest here), and
 * the focus point for cropping. Measured from the images.
 */
const GROUND: Record<string, number> = { bg_greenhouse: 0.80, bg_rooftop: 0.80, bg_neon: 0.80 }
const FOCUS: Record<string, string> = { bg_greenhouse: '50% 70%', bg_rooftop: '50% 70%', bg_neon: '50% 70%' }

export function SceneBackground({ id = 'bg_greenhouse' }: { id?: string }) {
  const key = FILES[id] ? id : 'bg_greenhouse'
  return (
    <img src={backgroundUrl(FILES[key])} alt="" aria-hidden draggable={false}
      className="absolute inset-0 h-full w-full select-none object-cover" style={{ ...PIXELATED, objectPosition: FOCUS[key] }} />
  )
}

/**
 * Frames a habitat and stands the children (the pet) on its landing area. Any growth stage works in any habitat.
 * Children should be a <PetStand> (a box whose bottom edge is the pet's ground line).
 */
export function Scene({ background, children, className = '' }: { background?: string; children: ReactNode; className?: string }) {
  const ground = GROUND[background ?? 'bg_greenhouse'] ?? GROUND.bg_greenhouse
  return (
    <div className={`relative isolate overflow-hidden rounded-[1.4rem] border-2 border-ink/70 shadow-[0_6px_0_0_rgba(32,61,53,0.35)] ${className}`}>
      <SceneBackground id={background} />
      <div className="relative flex h-full w-full items-end justify-center" style={{ paddingBottom: `${(1 - ground) * 100}%` }}>{children}</div>
    </div>
  )
}

/**
 * A square box for a Hashling whose paws sit on the bottom edge of the layout (the SVG keeps ~5% below the paws for its own shadow,
 * so the box is nudged down by that amount). Draws a separate, hard-edged contact shadow under the pet (the habitat has none).
 */
export function PetStand({ children, widthPct, maxWidth, className = '' }: { children: ReactNode; widthPct?: number; maxWidth?: number; className?: string }) {
  return (
    <div className={`relative translate-y-[5%] ${className}`} style={widthPct ? { width: `${widthPct}%`, maxWidth } : { maxWidth }}>
      {children}
      <div aria-hidden className="pointer-events-none absolute left-1/2 h-[4%] w-[46%] -translate-x-1/2 rounded-[50%]"
        style={{ bottom: '4.2%', background: 'radial-gradient(ellipse at center, rgba(28,36,32,.38) 0%, rgba(28,36,32,.14) 60%, transparent 72%)' }} />
    </div>
  )
}
