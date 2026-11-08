import { useId, type ReactNode } from 'react'
import { assetUrl } from './geometry'

// Background layer for Hashling's den. Greenhouse is the default (free) background and uses the supplied den artwork;
// rooftop and neon are SVG environments drawn in the same soft, dimensional style (no PNG was supplied for them).
export function SceneBackground({ id = 'bg_greenhouse' }: { id?: string }) {
  const B = BACKGROUNDS[id] ?? Greenhouse
  return <B />
}

export const BACKGROUNDS: Record<string, () => ReactNode> = {
  bg_greenhouse: Greenhouse,
  bg_rooftop: Rooftop,
  bg_neon: NeonDusk,
}

function Greenhouse() {
  return (
    <img src={assetUrl('den-greenhouse', 'jpg')} alt="" aria-hidden draggable={false}
      className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: '50% 78%' }} />
  )
}

/** Soft elliptical stage the pet stands on (shared by the SVG scenes). */
function Platform({ cx = 200, cy = 262, rx = 150, ry = 26, rim = '#E5B452', top = '#F7EEDA', side = '#E3D3B0', uid }: {
  cx?: number; cy?: number; rx?: number; ry?: number; rim?: string; top?: string; side?: string; uid: string
}) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + 9} rx={rx + 6} ry={ry + 3} fill="#1F3D2F" opacity="0.16" />
      <path d={`M${cx - rx} ${cy} v7 a${rx} ${ry} 0 0 0 ${rx * 2} 0 v-7 z`} fill={side} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-plat)`} stroke={rim} strokeWidth="2.2" />
      <ellipse cx={cx} cy={cy - 3} rx={rx * 0.82} ry={ry * 0.62} fill={top} opacity="0.55" />
      <defs>
        <radialGradient id={`${uid}-plat`} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={side} />
        </radialGradient>
      </defs>
    </g>
  )
}

function Rooftop() {
  const u = 'rt' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${u}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A9DCE6" />
          <stop offset="55%" stopColor="#FCEBCB" />
          <stop offset="100%" stopColor="#FFF6E2" />
        </linearGradient>
        <radialGradient id={`${u}-sun`} cx="80%" cy="20%" r="45%">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}-bld`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B7D3C8" />
          <stop offset="100%" stopColor="#8FB4A6" />
        </linearGradient>
        <linearGradient id={`${u}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0E0C4" />
          <stop offset="100%" stopColor="#E0C99F" />
        </linearGradient>
        <linearGradient id={`${u}-pot`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D08A5C" />
          <stop offset="100%" stopColor="#A35F3A" />
        </linearGradient>
        <linearGradient id={`${u}-pv`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3F78AD" />
          <stop offset="100%" stopColor="#15304D" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${u}-sky)`} />
      <rect width="400" height="300" fill={`url(#${u}-sun)`} />
      {/* soft clouds */}
      <g fill="#fff" opacity="0.7">
        <ellipse cx="70" cy="46" rx="34" ry="9" /><ellipse cx="92" cy="40" rx="22" ry="9" />
        <ellipse cx="230" cy="28" rx="30" ry="8" /><ellipse cx="248" cy="23" rx="18" ry="8" />
      </g>
      {/* skyline: hazy, with green roofs */}
      <g fill={`url(#${u}-bld)`} opacity="0.85">
        <rect x="0" y="130" width="46" height="130" rx="4" /><rect x="52" y="100" width="38" height="160" rx="4" /><rect x="96" y="140" width="54" height="120" rx="4" />
        <rect x="250" y="116" width="44" height="144" rx="4" /><rect x="300" y="146" width="40" height="114" rx="4" /><rect x="346" y="106" width="54" height="154" rx="4" />
      </g>
      <g fill="#7FB783">
        <path d="M52 100 q19 -16 38 0 z" /><path d="M250 116 q22 -16 44 0 z" /><path d="M346 106 q27 -18 54 0 z" />
      </g>
      <g fill="#FFFEF9" opacity="0.75">
        {[[60, 114], [74, 114], [60, 132], [74, 132], [258, 132], [272, 132], [354, 122], [370, 122], [386, 122], [10, 146], [24, 146]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" rx="2" />)}
      </g>
      {/* wind turbine */}
      <g stroke="#FFFEF9" strokeWidth="3" strokeLinecap="round">
        <path d="M326 176 V96" />
        <g className="hl-tail" style={{ transformOrigin: '326px 96px' }}><path d="M326 96 L326 70 M326 96 L348 108 M326 96 L304 108" /></g>
      </g>
      <circle cx="326" cy="96" r="3.5" fill="#E5B452" />
      {/* string lights */}
      <path d="M0 40 Q100 70 200 44 T400 46" fill="none" stroke="#52675E" strokeWidth="1" opacity="0.45" />
      {[30, 70, 110, 150, 250, 290, 330, 370].map((x, i) => <circle key={x} cx={x} cy={i < 4 ? 46 + Math.sin(i) * 8 + 8 : 48} r="3.4" fill={i % 2 ? '#E5B452' : '#22D3C5'} className="hl-glow" />)}
      {/* rooftop floor with railing + planters + solar panel */}
      <rect x="0" y="238" width="400" height="62" fill={`url(#${u}-floor)`} />
      <rect x="0" y="232" width="400" height="9" fill="#C97B55" opacity="0.8" />
      <path d="M0 232 H400" stroke="#FFFEF9" strokeWidth="1.5" opacity="0.6" />
      <g>
        <ellipse cx="50" cy="238" rx="42" ry="5" fill="#1F3D2F" opacity="0.14" />
        <rect x="14" y="206" width="72" height="32" rx="7" fill={`url(#${u}-pot)`} />
        <path d="M20 206 c4 -26 14 -28 16 0 M40 206 c2 -32 16 -32 14 0 M60 206 c4 -22 16 -22 14 0" fill="#4E9A58" />
        <circle cx="30" cy="194" r="4.5" fill="#E5604F" /><circle cx="64" cy="190" r="4.5" fill="#E5604F" />
        <ellipse cx="350" cy="238" rx="42" ry="5" fill="#1F3D2F" opacity="0.14" />
        <rect x="314" y="206" width="72" height="32" rx="7" fill={`url(#${u}-pot)`} />
        <path d="M322 206 c2 -30 18 -30 14 0 M344 206 c4 -24 18 -24 16 0 M366 206 c0 -28 14 -28 12 0" fill="#7BB872" />
        <g transform="rotate(-12 292 190)"><rect x="256" y="176" width="64" height="34" rx="4" fill={`url(#${u}-pv)`} stroke="#E5B452" strokeWidth="2" /><path d="M272 176 v34 M288 176 v34 M304 176 v34 M256 193 h64" stroke="#22D3C5" strokeWidth="1" opacity="0.7" /></g>
        <path d="M288 214 v22" stroke="#52675E" strokeWidth="3" />
      </g>
      <Platform uid={u} cx={200} cy={262} rx={118} ry={20} rim="#E5B452" top="#FFF8E6" side="#E8D5AA" />
    </svg>
  )
}

function NeonDusk() {
  const u = 'nd' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${u}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A2D66" />
          <stop offset="50%" stopColor="#8A4C86" />
          <stop offset="100%" stopColor="#F4A06A" />
        </linearGradient>
        <filter id={`${u}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id={`${u}-halo`} cx="50%" cy="85%" r="60%">
          <stop offset="0%" stopColor="#22D3C5" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#22D3C5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3C2E5C" />
          <stop offset="100%" stopColor="#241A3F" />
        </linearGradient>
        <linearGradient id={`${u}-plant`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F5B46" />
          <stop offset="100%" stopColor="#1B3A2C" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${u}-sky)`} />
      <circle cx="80" cy="56" r="17" fill="#FFF3D6" opacity="0.95" />
      <circle cx="87" cy="51" r="14.5" fill="#4A3A78" />
      {[[30, 30], [140, 24], [210, 50], [260, 20], [350, 40], [380, 80], [170, 80]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" fill="#fff" opacity="0.85" />)}
      <rect width="400" height="300" fill={`url(#${u}-halo)`} />
      {/* neon greenhouse frame */}
      <g fill="none" stroke="#5CEBDD" strokeWidth="2.4" filter={`url(#${u}-glow)`} opacity="0.95" strokeLinecap="round">
        <path d="M10 250 V140 Q200 10 390 140 V250" />
        <path d="M60 250 V150 Q200 50 340 150 V250" opacity="0.55" />
        {[110, 160, 200, 240, 290].map(x => <path key={x} d={`M${x} 250 V${x === 200 ? 74 : 100 + Math.abs(200 - x) * 0.4}`} opacity="0.5" />)}
      </g>
      <path d="M10 250 V140 Q200 10 390 140 V250 Z" fill="#22D3C5" opacity="0.07" />
      {/* plant silhouettes */}
      <g fill={`url(#${u}-plant)`}>
        <path d="M0 250 C10 190 40 180 50 250 Z" /><path d="M40 250 C46 200 80 200 76 250 Z" />
        <path d="M330 250 C334 196 368 190 372 250 Z" /><path d="M360 250 C374 210 400 214 400 250 Z" />
        <path d="M130 250 C124 222 146 214 150 250 Z" /><path d="M262 250 C262 220 284 218 282 250 Z" />
      </g>
      <rect x="0" y="246" width="400" height="54" fill={`url(#${u}-floor)`} />
      <path d="M0 248 H400" stroke="#E5B452" strokeWidth="1.6" opacity="0.7" filter={`url(#${u}-glow)`} />
      {/* fireflies */}
      {[[60, 200], [120, 170], [300, 180], [350, 214], [200, 150], [250, 210], [90, 226]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="#FFD166" className="hl-glow" style={{ animationDelay: `${i * 0.35}s` }} filter={`url(#${u}-glow)`} />
      ))}
      <Platform uid={u} cx={200} cy={262} rx={118} ry={20} rim="#5CEBDD" top="#5A4A86" side="#2E2350" />
      <ellipse cx="200" cy="262" rx="118" ry="20" fill="none" stroke="#5CEBDD" strokeWidth="1.2" opacity="0.7" filter={`url(#${u}-glow)`} />
    </svg>
  )
}

/** Where each background's floor/platform sits (fraction of the scene height from the top), so the pet's paws land on it. */
const GROUND: Record<string, number> = { bg_greenhouse: 0.775, bg_rooftop: 0.875, bg_neon: 0.875 }

/**
 * Frames a background and stands the children (the pet) on its platform.
 * Children should be a box whose bottom edge is the pet's ground line: use <PetStand> for that.
 */
export function Scene({ background, children, className = '' }: { background?: string; children: ReactNode; className?: string }) {
  const ground = GROUND[background ?? 'bg_greenhouse'] ?? GROUND.bg_greenhouse
  return (
    <div className={`relative isolate overflow-hidden rounded-[2rem] border border-leaf/10 shadow-[0_18px_40px_-22px_rgba(32,61,53,0.45)] ${className}`}>
      <SceneBackground id={background} />
      <div className="relative flex h-full w-full items-end justify-center" style={{ paddingBottom: `${(1 - ground) * 100}%` }}>{children}</div>
    </div>
  )
}

/**
 * A square box for a Hashling whose paws sit exactly on the bottom edge of the layout (the SVG keeps ~5% below the paws
 * for its shadow, so the box is nudged down by that amount). Draws a separate soft CSS contact shadow under the pet.
 */
export function PetStand({ children, widthPct, maxWidth, className = '' }: { children: ReactNode; widthPct?: number; maxWidth?: number; className?: string }) {
  return (
    <div className={`relative translate-y-[5%] ${className}`} style={widthPct ? { width: `${widthPct}%`, maxWidth } : { maxWidth }}>
      {children}
      <div aria-hidden className="pointer-events-none absolute left-1/2 h-[5.5%] w-[52%] -translate-x-1/2 rounded-[50%]"
        style={{ bottom: '3.4%', background: 'radial-gradient(ellipse at center, rgba(31,61,47,.34) 0%, rgba(31,61,47,.12) 55%, transparent 72%)', filter: 'blur(1.5px)' }} />
    </div>
  )
}
