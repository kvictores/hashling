import { useEffect, useRef, useState } from 'react'
import type { Mood, User } from '../api'
import { Hashling } from '../hashling/Hashling'
import { assetUrl } from '../hashling/geometry'

interface Props { user: User; results: (boolean | null)[]; pop: { key: number; pts: number } | null; done?: boolean }

// Ledges from the start platform (0) to the sunlit top (3). x = % of the box width (ledge centre),
// y = % of the box height measured from the bottom (the line Hashling's paws stand on).
// positionAfter() below is the single source of movement: correct = up one ledge, wrong = down one (never below 0).
const LEDGES = [
  { x: 50, y: 12 },
  { x: 28, y: 33 },
  { x: 67, y: 54 },
  { x: 38, y: 75 },
]
// Same four ledges for the compact mobile strip (a short, wide crop of the same scene).
const LEDGES_STRIP = [
  { x: 11, y: 14 },
  { x: 34, y: 27 },
  { x: 57, y: 40 },
  { x: 80, y: 53 },
]

/**
 * One coordinate system per layout, in container-query units (1cqw = 1% of the climb box width), so platforms, paws and
 * the hop all scale together. `ledgeStand` = how far below the top of a ledge image its walking surface lies (the PNG has
 * transparent margins + the grass thickness); calibrated from the supplied quiz-garden-ledge.png (aspect 3:1).
 */
const LAYOUT = {
  tower: { ratio: '720 / 1350', ledges: LEDGES, ledgeW: 50, pet: 35, egg: 25, reward: { x: 76, y: 86, w: 21 } },
  strip: { ratio: '358 / 172', ledges: LEDGES_STRIP, ledgeW: 22, pet: 22, egg: 16, reward: { x: 93, y: 68, w: 14 } },
} as const
const LEDGE_ASPECT = 3
const LEDGE_STAND = 0.4 // walking surface sits 40% down the ledge image (0.6 of its height remains below the paws)

function positionAfter(results: (boolean | null)[]) {
  let p = 0
  for (const r of results) {
    if (r === true) p = Math.min(LEDGES.length - 1, p + 1)
    else if (r === false) p = Math.max(0, p - 1)
  }
  return p
}

function useMedia(query: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = () => setM(mq.matches)
    h()
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return m
}

/**
 * Greenhouse climb beside the quiz. Correct answer -> Hashling hops up one ledge, a sun coin pops with the real points and
 * the ledge pulses cyan. Wrong answer -> a gentle slip/bump (no points are lost). Reaching the top lights the gold shield;
 * finishing the quiz is shown separately so a run with misses never claims the top was reached.
 */
export function ClimbTower({ user, results, pop, done = false }: Props) {
  const desktop = useMedia('(min-width: 1024px)')
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const lay = LAYOUT[desktop ? 'tower' : 'strip']
  const answered = results.filter(r => r !== null)
  const pos = positionAfter(answered)
  const [anim, setAnim] = useState<'climb' | 'fall' | 'bump' | null>(null)
  const [mood, setMood] = useState<Mood>('happy')
  const [note, setNote] = useState<string | null>(null)
  const [pulse, setPulse] = useState<{ i: number; key: number } | null>(null)
  const prevCount = useRef(answered.length)
  const prevPos = useRef(pos)

  useEffect(() => {
    if (answered.length > prevCount.current) {
      const last = answered[answered.length - 1]
      const kind = last ? 'climb' : pos === prevPos.current ? 'bump' : 'fall'
      setAnim(reduced ? null : kind) // reduced motion: jump straight to the new ledge, feedback is the static note + coin chip
      setMood(last ? 'happy' : 'sad')
      setNote(last ? `Nice hop!${pop ? ` +${pop.pts} points` : ''}` : 'Not quite. No points lost, that’s how we learn.')
      if (last) setPulse({ i: pos, key: Date.now() })
      const t = setTimeout(() => { setAnim(null); setMood('happy') }, 1400)
      const n = setTimeout(() => setNote(null), 4200)
      prevCount.current = answered.length
      prevPos.current = pos
      return () => { clearTimeout(t); clearTimeout(n) }
    }
    prevCount.current = answered.length
    prevPos.current = pos
  }, [answered.length, pos]) // eslint-disable-line react-hooks/exhaustive-deps

  const top = LEDGES.length - 1
  const atTop = pos === top
  const L = lay.ledges[pos]
  const stage = user.stage
  const petW = stage === 'egg' ? lay.egg : lay.pet
  const showCoin = pop && (anim === 'climb' || (reduced && note?.startsWith('Nice')))
  const caption = atTop ? 'Reached the sunny top!' : done ? `Quiz complete · reached ledge ${pos} of ${top}` : note ?? `ledge ${pos} / ${top}`

  return (
    <div className="mx-auto w-full max-w-[360px] select-none lg:max-w-[340px]">
      <div className="relative w-full overflow-hidden rounded-[1.6rem] border border-leaf/15 bg-[#E3F2FB] shadow-[0_10px_26px_-16px_rgba(32,61,53,0.5)]"
        style={{ aspectRatio: lay.ratio, containerType: 'inline-size' }}
        role="img" aria-label={`Greenhouse climb: ledge ${pos} of ${top}${atTop ? ', reached the top' : done ? ', quiz complete' : ''}`}>
        {/* simple airy sky: soft pale-blue gradient + a few subtle clouds (no arch, buildings or foliage) */}
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="climb-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#CFE8F8" />
              <stop offset="0.6" stopColor="#E3F2FB" />
              <stop offset="1" stopColor="#F4FAFD" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#climb-sky)" />
          <g fill="#fff" opacity="0.8">
            <ellipse cx="22" cy="14" rx="10" ry="2.6" /><ellipse cx="29" cy="12" rx="6" ry="2.6" />
            <ellipse cx="78" cy="38" rx="11" ry="2.8" /><ellipse cx="71" cy="36.4" rx="6" ry="2.4" />
            <ellipse cx="30" cy="62" rx="9" ry="2.4" /><ellipse cx="36" cy="60.6" rx="5" ry="2.2" />
            <ellipse cx="74" cy="86" rx="10" ry="2.4" />
          </g>
        </svg>

        {/* gold shield / sun reward: lit only once the top ledge is reached */}
        <img src={assetUrl('protection-shield')} alt="" aria-hidden draggable={false}
          className={`absolute -translate-x-1/2 -translate-y-1/2 object-contain transition-[filter,opacity] duration-700 ${atTop ? 'reward-lit' : ''}`}
          style={{ left: `${lay.reward.x}%`, bottom: `${lay.reward.y}%`, width: `${lay.reward.w}cqw`, transform: 'translate(-50%, 50%)',
            filter: atTop ? undefined : 'grayscale(0.85) opacity(0.55)' }} />

        {/* four separate ledge platforms (start + 3 climb ledges) */}
        {lay.ledges.map((l, i) => (
          <div key={i} className="absolute" style={{ left: `${l.x}%`, bottom: `calc(${l.y}% - ${((lay.ledgeW / LEDGE_ASPECT) * (1 - LEDGE_STAND)).toFixed(2)}cqw)`, width: `${lay.ledgeW}cqw`, transform: 'translateX(-50%)' }}>
            <img src={assetUrl('quiz-garden-ledge')} alt="" draggable={false} aria-hidden className="block w-full" />
            {i > 0 && i <= pos && (
              <span aria-hidden className="pointer-events-none absolute left-1/2 top-[60%] h-[16%] w-[34%] -translate-x-1/2 rounded-full"
                style={{ background: 'radial-gradient(ellipse, rgba(34,211,197,.75), rgba(34,211,197,0) 70%)', opacity: 0.55 }} />
            )}
            {pulse && pulse.i === i && (
              <span key={pulse.key} aria-hidden className="ledge-pulse pointer-events-none absolute left-1/2 top-[52%] h-[40%] w-[70%] -translate-x-1/2 rounded-full" />
            )}
          </div>
        ))}

        {/* Hashling: outer box moves horizontally, inner box vertically -> arcing hop */}
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 transition-[left] duration-[700ms] ease-in-out" style={{ left: `${L.x}%` }}>
            <div className={`absolute transition-[bottom] ${anim === 'fall' ? 'duration-[700ms] ease-in' : 'duration-[700ms] ease-[cubic-bezier(.3,1.5,.5,1)]'}`}
              style={{ bottom: `${L.y}%`, width: `${petW}cqw`, transform: 'translate(-50%, 5%)' }}>
              <div className={anim === 'climb' ? 'tower-hop' : anim === 'fall' ? 'tower-tumble' : anim === 'bump' ? 'tower-bump' : ''}>
                <Hashling stage={stage} mood={atTop && !anim ? 'happy' : mood} equipped={user.equipped} size="100%" />
              </div>
              {showCoin && pop && (
                <div key={pop.key} className={`pointer-events-none absolute left-1/2 top-[-6%] flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-panel/90 px-1.5 py-0.5 shadow ${reduced ? '' : 'coin-pop'}`}>
                  <img src={assetUrl('sun-coin')} alt="" aria-hidden width={22} height={22} className="h-[22px] w-[22px] object-contain" />
                  <span className="data text-sm font-bold text-leaf">+{pop.pts}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="data mt-2 min-h-[1.5rem] text-center text-sm text-muted" aria-live="polite">{caption}</p>
    </div>
  )
}
