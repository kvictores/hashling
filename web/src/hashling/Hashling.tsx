import { useId } from 'react'
import type { Equipped, Mood, Stage } from '../api'
import { FUR, LINE, type Palette } from './palettes'
import { AccessoryBehind, AccessoryLayer, CollarLayer, HatLayer } from './items'

export interface HashlingProps {
  stage: Stage
  mood?: Mood
  equipped?: Equipped
  size?: number | string
  className?: string
  title?: string
  animated?: boolean
}

// Spiky "puffed fur" outline around an ellipse (alert pose)
function spiky(cx: number, cy: number, rx: number, ry: number, n: number, amp: number) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n
    const k = i % 2 === 0 ? 1 + amp : 1 - amp * 0.2
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)},${(cy + Math.sin(a) * ry * k).toFixed(1)}`)
  }
  return `M${pts.join(' L')} Z`
}

function Rosette({ x, y, r = 5, p }: { x: number; y: number; r?: number; p: Palette }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 0.55} fill={p.shade} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={p.spot} strokeWidth={r * 0.5} strokeDasharray={`${r * 1.6} ${r * 0.7}`} strokeLinecap="round" />
    </g>
  )
}

const TAIL = 'M118 176 C164 184 190 154 178 124 C172 108 176 98 184 97'

const STAGE_GEOM: Record<Exclude<Stage, 'egg'>, { bs: number; hs: number; dy: number; ts: number; all: number }> = {
  kitten: { bs: 0.72, hs: 0.95, dy: 19, ts: 0.72, all: 0.98 },
  cub: { bs: 0.86, hs: 0.95, dy: 10, ts: 0.88, all: 1.04 },
  adult: { bs: 1.0, hs: 0.9, dy: 0, ts: 1.0, all: 1.1 },
}

function Egg({ p, mood, anim }: { p: Palette; mood: Mood; anim: boolean }) {
  return (
    <g className={anim ? (mood === 'alert' ? 'hl-shake' : 'hl-wobble') : undefined}>
      <path d="M100 38 C140 38 158 108 152 140 C146 175 122 188 100 188 C78 188 54 175 48 140 C42 108 60 38 100 38 Z"
        fill={p.belly} stroke={LINE} strokeWidth={3} />
      <path d="M100 38 C140 38 158 108 152 140 C150 152 146 162 140 170 C146 140 132 70 100 52 Z" fill={p.shade} opacity={0.55} />
      <Rosette x={78} y={78} r={7} p={p} />
      <Rosette x={120} y={66} r={5} p={p} />
      <Rosette x={132} y={140} r={7} p={p} />
      <Rosette x={70} y={150} r={6} p={p} />
      <Rosette x={104} y={160} r={5} p={p} />
      <circle cx={96} cy={86} r={2.5} fill={p.spot} />
      <circle cx={140} cy={98} r={2.5} fill={p.spot} />
      <path d="M60 112 L72 104 L82 116 L94 101 L106 116 L118 103 L130 114 L141 106" fill="none" stroke={LINE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {mood === 'happy' && (
        <g>
          {/* peeking eyes in the crack */}
          <ellipse cx={89} cy={109} rx={3.6} ry={4.2} fill={LINE} className={anim ? 'hl-blink' : undefined} />
          <ellipse cx={111} cy={109} rx={3.6} ry={4.2} fill={LINE} className={anim ? 'hl-blink' : undefined} />
        </g>
      )}
      {mood === 'alert' && <text x={160} y={60} fontSize={36} fontWeight={800} fill="#D9463B" fontFamily="sans-serif">!</text>}
      {mood === 'sad' && <path d="M112 124 q3 6 0 9 q-3 -3 0 -9z" fill="#7FC4E0" />}
    </g>
  )
}

function Eyes({ mood, anim }: { mood: Mood; anim: boolean }) {
  if (mood === 'sleepy') {
    return (
      <g fill="none" stroke={LINE} strokeWidth={3} strokeLinecap="round">
        <path d="M69 94 Q80 101 91 94" />
        <path d="M109 94 Q120 101 131 94" />
      </g>
    )
  }
  if (mood === 'alert') {
    return (
      <g>
        {[80, 120].map(x => (
          <g key={x}>
            <circle cx={x} cy={91} r={14} fill="#fff" stroke={LINE} strokeWidth={2.5} />
            <circle cx={x} cy={92} r={6} fill="#1F2A24" />
            <circle cx={x + 2} cy={89.5} r={2} fill="#fff" />
          </g>
        ))}
        <path d="M66 74 L90 79 M134 74 L110 79" stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      </g>
    )
  }
  return (
    <g>
      {[80, 120].map(x => (
        <g key={x} className={anim && mood === 'happy' ? 'hl-blink' : undefined}>
          <circle cx={x} cy={92} r={12.5} fill="#7DB87A" />
          <circle cx={x} cy={92.5} r={9} fill="#1F2A24" />
          <circle cx={x + 4} cy={88} r={3.6} fill="#fff" />
          <circle cx={x - 3.5} cy={96.5} r={1.7} fill="#fff" />
        </g>
      ))}
      {mood === 'sad' && (
        <g>
          {/* heavy lids + worried brows + tear */}
          <path d="M67 88 Q80 80 93 86 L93 80 L67 80 Z" fill="currentColor" style={{ color: 'var(--hl-base)' }} />
          <path d="M107 86 Q120 80 133 88 L133 80 L107 80 Z" fill="currentColor" style={{ color: 'var(--hl-base)' }} />
          <path d="M68 78 L88 72 M132 78 L112 72" stroke={LINE} strokeWidth={2.6} strokeLinecap="round" />
          <path d="M72 104 q3 6 0 9 q-3 -3 0 -9z" fill="#7FC4E0" />
        </g>
      )}
    </g>
  )
}

function Mouth({ mood }: { mood: Mood }) {
  const nose = <path d="M94 105 Q100 103 106 105 Q103 111 100 112 Q97 111 94 105 Z" fill="#E8918A" stroke={LINE} strokeWidth={1.5} />
  if (mood === 'alert') return <g>{nose}<ellipse cx={100} cy={120} rx={4.5} ry={5.5} fill="#7A3B3B" stroke={LINE} strokeWidth={2} /></g>
  if (mood === 'sad') return <g>{nose}<path d="M91 121 Q100 114 109 121" fill="none" stroke={LINE} strokeWidth={2.4} strokeLinecap="round" /></g>
  return (
    <g>
      {nose}
      <path d="M100 112 Q96 119 90 116 M100 112 Q104 119 110 116" fill="none" stroke={LINE} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  )
}

export function Hashling({ stage, mood = 'happy', equipped = {}, size = 200, className, title, animated = true }: HashlingProps) {
  const uid = useId().replace(/:/g, '')
  const p = FUR[equipped.fur ?? 'fur_classic'] ?? FUR.fur_classic
  const label = title ?? `Hashling the ${stage === 'egg' ? 'egg' : `snow-leopard ${stage}`}, feeling ${mood}`
  const anim = animated

  if (stage === 'egg') {
    return (
      <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label={label}>
        <ellipse cx={100} cy={190} rx={46} ry={6} fill="#23332A" opacity={0.12} />
        <path d="M44 186 C60 170 78 178 88 188 Z M156 186 C140 170 122 178 112 188 Z" fill="#6FAF6B" />
        <Egg p={p} mood={mood} anim={anim} />
        {mood === 'sleepy' && <SleepyZ anim={anim} />}
      </svg>
    )
  }

  const g = STAGE_GEOM[stage]
  const puffed = mood === 'alert'
  const earRot = mood === 'alert' ? 32 : mood === 'sad' ? 58 : mood === 'sleepy' ? 14 : 0
  const earDy = mood === 'sad' ? 8 : 0

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label={label}
      style={{ ['--hl-base' as string]: p.base, overflow: 'visible' }}>
      <defs>
        <radialGradient id={`belly-${uid}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor={p.belly} />
        </radialGradient>
        {p.glow && (
          <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>
      <ellipse cx={100} cy={191} rx={52 * g.all} ry={6} fill="#23332A" opacity={0.12} />

      <g transform={`translate(100 192) scale(${g.all}) translate(-100 -192)`} className={puffed && anim ? 'hl-shake' : undefined}
        filter={p.glow ? `url(#glow-${uid})` : undefined}>
        {/* accessory parts that sit behind everything (e.g. backpack panels) */}
        <g transform={`translate(100 186) scale(${g.bs}) translate(-100 -186)`}><AccessoryBehind item={equipped.accessory} /></g>
        {/* tail (behind) */}
        <g transform={`translate(122 172) scale(${g.ts}) translate(-122 -172)`}>
          <g className={anim && mood === 'happy' ? 'hl-tail' : undefined} style={{ transformOrigin: '122px 172px' }}>
            <path d={TAIL} fill="none" stroke={LINE} strokeWidth={puffed ? 31 : 25} strokeLinecap="round" />
            <path d={TAIL} fill="none" stroke={p.base} strokeWidth={puffed ? 26 : 20} strokeLinecap="round" />
            <path d={TAIL} fill="none" stroke={p.spot} strokeWidth={puffed ? 18 : 13} strokeDasharray="4 13" strokeDashoffset={-14} opacity={0.75} />
            <circle cx={184} cy={97} r={puffed ? 12 : 9.5} fill={p.spot} stroke={LINE} strokeWidth={2.5} />
          </g>
        </g>

        {/* body */}
        <g transform={`translate(100 186) scale(${g.bs}) translate(-100 -186)`}>
          <g className={anim && mood !== 'alert' ? 'hl-breathe' : undefined}>
            {puffed && <path d={spiky(100, 150, 46, 41, 18, 0.12)} fill={p.base} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />}
            <ellipse cx={100} cy={150} rx={40} ry={37} fill={p.base} stroke={puffed ? 'none' : LINE} strokeWidth={3} />
            <ellipse cx={100} cy={158} rx={24} ry={25} fill={`url(#belly-${uid})`} />
            <Rosette x={70} y={140} r={5.5} p={p} />
            <Rosette x={130} y={138} r={5.5} p={p} />
            <Rosette x={72} y={164} r={4.5} p={p} />
            <Rosette x={129} y={163} r={4.5} p={p} />
            <circle cx={84} cy={124} r={2.3} fill={p.spot} />
            <circle cx={117} cy={124} r={2.3} fill={p.spot} />
            {/* paws */}
            {[83, 117].map(x => (
              <g key={x}>
                <ellipse cx={x} cy={183} rx={13} ry={8.5} fill={p.belly} stroke={LINE} strokeWidth={2.6} />
                <path d={`M${x - 4} 180 v5 M${x + 4} 180 v5`} stroke={LINE} strokeWidth={1.8} strokeLinecap="round" />
              </g>
            ))}
          </g>
          <AccessoryLayer item={equipped.accessory} anim={anim} />
        </g>

        {/* head */}
        <g transform={`translate(0 ${g.dy}) translate(100 90) scale(${g.hs}) translate(-100 -90)`}>
          {/* ears */}
          <g transform={`translate(0 ${earDy}) rotate(${-earRot} 72 62)`}>
            <path d="M56 74 C50 46 60 32 86 52 Z" fill={p.base} stroke={LINE} strokeWidth={3} strokeLinejoin="round" />
            <path d="M62 66 C59 50 64 44 79 54 Z" fill="#F4B6B0" />
          </g>
          <g transform={`translate(0 ${earDy}) rotate(${earRot} 128 62)`}>
            <path d="M144 74 C150 46 140 32 114 52 Z" fill={p.base} stroke={LINE} strokeWidth={3} strokeLinejoin="round" />
            <path d="M138 66 C141 50 136 44 121 54 Z" fill="#F4B6B0" />
          </g>
          {puffed && <path d={spiky(100, 92, 55, 46, 16, 0.1)} fill={p.base} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />}
          {/* fluffy cheeks */}
          <path d="M54 98 L40 106 L54 110 L44 118 L60 116 Z" fill={p.base} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M146 98 L160 106 L146 110 L156 118 L140 116 Z" fill={p.base} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />
          <ellipse cx={100} cy={92} rx={50} ry={42} fill={p.base} stroke={puffed ? 'none' : LINE} strokeWidth={3} />
          <ellipse cx={100} cy={110} rx={26} ry={17} fill={p.belly} />
          {/* head spots */}
          <circle cx={91} cy={60} r={2.6} fill={p.spot} />
          <circle cx={100} cy={56} r={3} fill={p.spot} />
          <circle cx={109} cy={60} r={2.6} fill={p.spot} />
          <circle cx={96} cy={68} r={1.8} fill={p.spot} />
          <circle cx={105} cy={68} r={1.8} fill={p.spot} />
          <Rosette x={64} y={80} r={5} p={p} />
          <Rosette x={136} y={80} r={5} p={p} />
          {/* blush */}
          <ellipse cx={69} cy={109} rx={7.5} ry={4.2} fill="#F4A7A0" opacity={mood === 'sad' ? 0.25 : 0.55} />
          <ellipse cx={131} cy={109} rx={7.5} ry={4.2} fill="#F4A7A0" opacity={mood === 'sad' ? 0.25 : 0.55} />
          <Eyes mood={mood} anim={anim} />
          <Mouth mood={mood} />
          {/* whiskers */}
          <g stroke={LINE} strokeWidth={1.4} strokeLinecap="round" opacity={0.7}>
            <path d="M74 112 L50 108 M74 116 L52 120" />
            <path d="M126 112 L150 108 M126 116 L148 120" />
          </g>
          <CollarLayer item={equipped.collar} anim={anim} />
          <HatLayer item={equipped.hat} anim={anim} />
        </g>
      </g>
      {mood === 'sleepy' && <SleepyZ anim={anim} />}
    </svg>
  )
}

function SleepyZ({ anim }: { anim: boolean }) {
  return (
    <g fill="#5F6F64" fontFamily="Fraunces, serif" fontWeight={700}>
      <text x={150} y={52} fontSize={18} className={anim ? 'hl-z' : undefined}>z</text>
      <text x={162} y={38} fontSize={13} className={anim ? 'hl-z hl-z2' : undefined}>z</text>
    </g>
  )
}
