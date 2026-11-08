import type { ReactNode } from 'react'

// Background layer for Hashling's den. Greenhouse is the default (free) background.
export function SceneBackground({ id = 'bg_greenhouse' }: { id?: string }) {
  const B = BACKGROUNDS[id] ?? Greenhouse
  return <B />
}

export const BACKGROUNDS: Record<string, () => ReactNode> = {
  bg_greenhouse: Greenhouse,
  bg_rooftop: Rooftop,
  bg_neon: NeonDusk,
}

function Rooftop() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="rt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFE3E8" />
          <stop offset="70%" stopColor="#FCE9C8" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#rt-sky)" />
      <circle cx="320" cy="58" r="26" fill="#F2B33D" opacity="0.85" />
      <circle cx="320" cy="58" r="40" fill="#F2B33D" opacity="0.18" />
      {/* skyline with green roofs */}
      <g fill="#9DBDB4">
        <rect x="0" y="120" width="46" height="130" /><rect x="52" y="90" width="38" height="160" /><rect x="96" y="132" width="54" height="120" />
        <rect x="250" y="110" width="44" height="140" /><rect x="300" y="140" width="40" height="110" /><rect x="346" y="100" width="54" height="150" />
      </g>
      <g fill="#6FAF6B">
        <path d="M52 90 q19 -14 38 0 z" /><path d="M250 110 q22 -14 44 0 z" /><path d="M346 100 q27 -16 54 0 z" />
      </g>
      <g fill="#FBF7EE" opacity="0.7">
        {[[60, 104], [74, 104], [60, 122], [74, 122], [258, 126], [272, 126], [354, 116], [370, 116], [386, 116], [10, 136], [24, 136]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" rx="1" />)}
      </g>
      {/* wind turbine */}
      <g stroke="#FBF7EE" strokeWidth="2.5" strokeLinecap="round">
        <path d="M200 160 V70" />
        <g className="hl-tail" style={{ transformOrigin: '200px 70px' }}><path d="M200 70 L200 44 M200 70 L222 82 M200 70 L178 82" /></g>
      </g>
      {/* string lights */}
      <path d="M0 40 Q100 70 200 44 T400 46" fill="none" stroke="#4A4A55" strokeWidth="1" opacity="0.5" />
      {[30, 70, 110, 150, 250, 290, 330, 370].map((x, i) => <circle key={x} cx={x} cy={i < 4 ? 46 + Math.sin(i) * 8 + 8 : 48} r="3" fill={i % 2 ? '#F2B33D' : '#22D3C5'} className="hl-glow" />)}
      {/* rooftop floor + planters + solar panel */}
      <rect x="0" y="236" width="400" height="64" fill="#E7D3B5" />
      <rect x="0" y="230" width="400" height="10" fill="#D9734E" opacity="0.75" />
      <g>
        <rect x="14" y="204" width="70" height="30" rx="4" fill="#B5764F" /><path d="M20 204 c4 -24 14 -26 16 0 M40 204 c2 -30 16 -30 14 0 M60 204 c4 -20 16 -20 14 0" fill="#3E8E5A" />
        <circle cx="30" cy="194" r="4" fill="#D9463B" /><circle cx="64" cy="190" r="4" fill="#D9463B" />
        <rect x="316" y="204" width="70" height="30" rx="4" fill="#B5764F" /><path d="M322 204 c2 -28 18 -28 14 0 M344 204 c4 -22 18 -22 16 0 M366 204 c0 -26 14 -26 12 0" fill="#6FAF6B" />
        <g transform="rotate(-12 300 190)"><rect x="262" y="176" width="64" height="34" rx="2" fill="#1E3A5F" stroke="#4A4A55" strokeWidth="2" /><path d="M278 176 v34 M294 176 v34 M310 176 v34 M262 193 h64" stroke="#22D3C5" strokeWidth="1" opacity="0.7" /></g>
        <path d="M292 214 v20" stroke="#4A4A55" strokeWidth="3" />
      </g>
    </svg>
  )
}

function NeonDusk() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="nd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2B1F4A" />
          <stop offset="55%" stopColor="#7A3D7A" />
          <stop offset="100%" stopColor="#F2915D" />
        </linearGradient>
        <filter id="nd-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="300" fill="url(#nd-sky)" />
      <circle cx="80" cy="56" r="16" fill="#FBF7EE" opacity="0.9" />
      <circle cx="87" cy="51" r="14" fill="#3A2A5A" />
      {[[30, 30], [140, 24], [210, 50], [260, 20], [350, 40], [380, 80], [170, 80]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="#fff" opacity="0.8" />)}
      {/* neon greenhouse frame */}
      <g fill="none" stroke="#22D3C5" strokeWidth="2.2" filter="url(#nd-glow)" opacity="0.95">
        <path d="M10 250 V140 Q200 10 390 140 V250" />
        <path d="M60 250 V150 Q200 50 340 150 V250" opacity="0.6" />
        {[110, 160, 200, 240, 290].map(x => <path key={x} d={`M${x} 250 V${x === 200 ? 74 : 100 + Math.abs(200 - x) * 0.4}`} opacity="0.55" />)}
      </g>
      <path d="M10 250 V140 Q200 10 390 140 V250 Z" fill="#22D3C5" opacity="0.06" />
      {/* plant silhouettes */}
      <g fill="#1F3B2D">
        <path d="M0 250 C10 190 40 180 50 250 Z" /><path d="M40 250 C46 200 80 200 76 250 Z" />
        <path d="M330 250 C334 196 368 190 372 250 Z" /><path d="M360 250 C374 210 400 214 400 250 Z" />
        <path d="M130 250 C124 222 146 214 150 250 Z" /><path d="M262 250 C262 220 284 218 282 250 Z" />
      </g>
      <rect x="0" y="246" width="400" height="54" fill="#2A2140" />
      <path d="M0 248 H400" stroke="#F2B33D" strokeWidth="1.5" opacity="0.6" filter="url(#nd-glow)" />
      {/* fireflies */}
      {[[60, 200], [120, 170], [300, 180], [350, 214], [200, 150], [250, 210], [90, 226]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill="#F2B33D" className="hl-glow" style={{ animationDelay: `${i * 0.35}s` }} filter="url(#nd-glow)" />
      ))}
    </svg>
  )
}

function Greenhouse() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="gh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DFF1F0" />
          <stop offset="100%" stopColor="#F7F1DF" />
        </linearGradient>
        <radialGradient id="gh-sun" cx="80%" cy="10%" r="50%">
          <stop offset="0%" stopColor="#F2B33D" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F2B33D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#gh-sky)" />
      <rect width="400" height="300" fill="url(#gh-sun)" />
      {/* glass panels */}
      <g stroke="#9CC9B5" strokeWidth="2" fill="none" opacity="0.7">
        <path d="M0 120 Q200 -30 400 120" />
        <path d="M0 160 Q200 10 400 160" />
        {[40, 100, 160, 200, 240, 300, 360].map(x => <path key={x} d={`M${x} 300 L${x} ${x === 200 ? 45 : 90 + Math.abs(200 - x) * 0.3}`} />)}
      </g>
      <path d="M0 120 Q200 -30 400 120 L400 300 L0 300 Z" fill="#FFFFFF" opacity="0.18" />
      {/* hanging vines */}
      <g className="vine-sway" stroke="#3E8E5A" strokeWidth="2" fill="#6FAF6B">
        <path d="M70 60 C72 90 64 110 70 140" fill="none" />
        <ellipse cx="66" cy="88" rx="7" ry="4" transform="rotate(-30 66 88)" />
        <ellipse cx="73" cy="112" rx="7" ry="4" transform="rotate(25 73 112)" />
        <ellipse cx="68" cy="136" rx="6" ry="3.5" transform="rotate(-20 68 136)" />
        <path d="M330 70 C326 100 334 120 328 150" fill="none" />
        <ellipse cx="333" cy="96" rx="7" ry="4" transform="rotate(30 333 96)" />
        <ellipse cx="326" cy="124" rx="7" ry="4" transform="rotate(-25 326 124)" />
      </g>
      {/* planters + leaves */}
      <rect x="0" y="250" width="400" height="50" fill="#E9DFC7" />
      <rect x="0" y="246" width="400" height="8" fill="#D9C9A3" />
      <g fill="#6FAF6B">
        <path d="M20 250 C10 220 30 200 40 250 Z" /><path d="M40 250 C40 215 62 210 58 250 Z" fill="#3E8E5A" />
        <path d="M350 250 C345 210 372 205 368 250 Z" /><path d="M372 250 C380 222 398 228 388 250 Z" fill="#3E8E5A" />
        <path d="M120 250 C112 232 126 226 132 250 Z" fill="#3E8E5A" />
        <path d="M280 250 C276 228 294 226 292 250 Z" />
      </g>
      <circle cx="110" cy="232" r="4" fill="#D9734E" /><circle cx="292" cy="226" r="4" fill="#F2B33D" />
    </svg>
  )
}

export function Scene({ background, children, className = '' }: { background?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] ${className}`}>
      <SceneBackground id={background} />
      <div className="relative flex h-full w-full items-end justify-center">{children}</div>
    </div>
  )
}
