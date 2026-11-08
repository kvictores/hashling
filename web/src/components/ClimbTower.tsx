import { useEffect, useRef, useState } from 'react'
import type { Mood, User } from '../api'
import { Hashling } from '../hashling/Hashling'

interface Props { user: User; results: (boolean | null)[]; pop: { key: number; pts: number } | null }

// Ledges from the ground (0) to the sunlit top (3). x/y are % of the tower box.
const LEDGES = [
  { x: 50, y: 3 },
  { x: 30, y: 29 },
  { x: 70, y: 54 },
  { x: 48, y: 79 },
]

function positionAfter(results: (boolean | null)[]) {
  let p = 0
  for (const r of results) {
    if (r === true) p = Math.min(LEDGES.length - 1, p + 1)
    else if (r === false) p = Math.max(0, p - 1)
  }
  return p
}

/**
 * Solarpunk vine tower beside the quiz. Correct answer -> Hashling climbs one ledge and a coin pops.
 * Wrong answer -> she slips down a ledge with a little tumble. Purely visual: no points are lost.
 */
export function ClimbTower({ user, results, pop }: Props) {
  const answered = results.filter(r => r !== null)
  const pos = positionAfter(answered)
  const [anim, setAnim] = useState<'climb' | 'fall' | 'bump' | null>(null)
  const [mood, setMood] = useState<Mood>('happy')
  const prevCount = useRef(answered.length)
  const prevPos = useRef(pos)

  useEffect(() => {
    if (answered.length > prevCount.current) {
      const last = answered[answered.length - 1]
      const kind = last ? 'climb' : pos === prevPos.current ? 'bump' : 'fall'
      setAnim(kind)
      setMood(last ? 'happy' : 'sad')
      const t = setTimeout(() => { setAnim(null); setMood('happy') }, 1400)
      prevCount.current = answered.length
      prevPos.current = pos
      return () => clearTimeout(t)
    }
    prevCount.current = answered.length
    prevPos.current = pos
  }, [answered.length, pos]) // eslint-disable-line react-hooks/exhaustive-deps

  const atTop = pos === LEDGES.length - 1
  const L = LEDGES[pos]
  const stage = user.stage

  return (
    <div className="relative mx-auto h-[540px] w-full max-w-[320px] select-none" aria-label={`Climbing tower: ledge ${pos} of ${LEDGES.length - 1}`} role="img">
      <TowerArt lit={pos} />

      {/* Hashling: outer box moves horizontally, inner box vertically -> arcing hop */}
      <div className="absolute inset-0">
        <div className="absolute transition-[left] duration-[900ms] ease-in-out" style={{ left: `${L.x}%`, bottom: 0, top: 0 }}>
          <div className={`absolute -translate-x-1/2 transition-[bottom] ${anim === 'fall' ? 'duration-[900ms] ease-in' : 'duration-[900ms] ease-[cubic-bezier(.3,1.5,.5,1)]'}`}
            style={{ bottom: `${L.y + 3.2}%`, width: stage === 'egg' ? 74 : 96 }}>
            <div className={anim === 'climb' ? 'tower-hop' : anim === 'fall' ? 'tower-tumble' : anim === 'bump' ? 'tower-bump' : ''}>
              <Hashling stage={stage} mood={atTop && !anim ? 'happy' : mood} equipped={user.equipped} size="100%" />
            </div>
            {pop && anim === 'climb' && (
              <div key={pop.key} className="coin-pop pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap">
                <svg width="26" height="26" viewBox="0 0 20 20" aria-hidden><circle cx="10" cy="10" r="9" fill="#F2B33D" stroke="#B7801A" strokeWidth="1.5" /><path d="M10 5 C12 7 13 9 10 15 C7 9 8 7 10 5 Z" fill="#3E8E5A" /></svg>
                <span className="data font-bold text-leaf">+{pop.pts}</span>
              </div>
            )}
            {anim === 'fall' && <div className="data fade-up absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-terra">oops!</div>}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[-28px] text-center">
        <span className="data text-sm text-muted">{atTop ? '☀️ Reached the sunny top!' : `ledge ${pos} / ${LEDGES.length - 1}`}</span>
      </div>
    </div>
  )
}

function TowerArt({ lit }: { lit: number }) {
  return (
    <svg viewBox="0 0 300 540" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="tw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCE9C8" />
          <stop offset="45%" stopColor="#DFF1F0" />
          <stop offset="100%" stopColor="#EAF4EC" />
        </linearGradient>
        <radialGradient id="tw-sun" cx="50%" cy="0%" r="60%">
          <stop offset="0%" stopColor="#F2B33D" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F2B33D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="300" height="540" rx="28" fill="url(#tw-sky)" />
      <rect x="0" y="0" width="300" height="300" rx="28" fill="url(#tw-sun)" />
      <circle cx="150" cy="22" r="18" fill="#F2B33D" opacity="0.9" />
      {/* greenhouse frame */}
      <path d="M28 540 V120 Q150 40 272 120 V540" fill="none" stroke="#9CC9B5" strokeWidth="2" opacity="0.6" />
      {/* circuit trace that turns into the vine */}
      <path d="M150 540 V500 H120 V470" fill="none" stroke="#22D3C5" strokeWidth="2" opacity="0.7" />
      <circle cx="120" cy="470" r="3.5" fill="#22D3C5" className="hl-glow" />
      {/* main climbing vine */}
      <path d="M150 530 C80 480 230 420 150 360 C70 300 230 240 150 180 C90 135 200 110 150 70"
        fill="none" stroke="#3E8E5A" strokeWidth="7" strokeLinecap="round" />
      <path d="M150 530 C80 480 230 420 150 360 C70 300 230 240 150 180 C90 135 200 110 150 70"
        fill="none" stroke="#6FAF6B" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 12" />
      <g fill="#6FAF6B" stroke="#2C6B42" strokeWidth="1.2">
        {[[118, 470, -30], [192, 420, 30], [110, 330, -40], [196, 260, 35], [120, 200, -25], [180, 130, 30], [128, 96, -20]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="12" ry="6" transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </g>
      {/* ledges: planters with solar strips, lighting up as she climbs */}
      {LEDGES.map((l, i) => {
        const cx = (l.x / 100) * 300
        const cy = 540 - (l.y / 100) * 540
        const on = i <= lit
        return (
          <g key={i}>
            <rect x={cx - 52} y={cy - 4} width="104" height="16" rx="8" fill={i === 0 ? '#D9C9A3' : '#B5764F'} stroke="#4A4A55" strokeWidth="2" />
            {i > 0 && <rect x={cx - 40} y={cy + 1} width="80" height="5" rx="2" fill={on ? '#22D3C5' : '#1E3A5F'} className={on ? 'hl-glow' : ''} />}
            {i > 0 && <path d={`M${cx - 46} ${cy - 4} c3 -14 10 -14 10 0 M${cx + 36} ${cy - 4} c3 -12 10 -12 10 0`} fill="#3E8E5A" />}
            {i === LEDGES.length - 1 && <path d={`M${cx + 30} ${cy - 4} V${cy - 46} l18 7 l-18 7`} fill={on ? '#F2B33D' : '#D8D3C8'} stroke="#4A4A55" strokeWidth="1.5" />}
          </g>
        )
      })}
    </svg>
  )
}
