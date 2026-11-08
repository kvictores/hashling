import { Hashling } from '../../hashling/Hashling'
import { anchorTransform, placement } from '../../hashling/geometry'
import type { Equipped, Mood, Slot, Stage } from '../../api'

const STAGES: Stage[] = ['egg', 'kitten', 'cub', 'adult']
const MOODS: Mood[] = ['happy', 'alert', 'sad', 'sleepy']
const ITEMS: [Slot, string][] = [
  ['hat', 'hat_sprout'], ['hat', 'hat_visor'], ['hat', 'hat_flower'], ['hat', 'hat_antenna'],
  ['collar', 'collar_bell'], ['collar', 'collar_vine'], ['collar', 'collar_led'],
  ['accessory', 'acc_solar'], ['accessory', 'acc_glass'], ['accessory', 'acc_shield'],
  ['fur', 'fur_moss'], ['fur', 'fur_amber'], ['fur', 'fur_cyan'],
]

/** Hidden dev page. /dev/hashling = stage x mood grid; /dev/hashling?items=1 = every item on kitten/cub/adult. */
export default function Gallery() {
  const q = new URLSearchParams(window.location.search)
  const parseEq = (str: string | null) => {
    const eq: Equipped = {}
    for (const id of (str ?? '').split(',').filter(Boolean)) {
      const slot = id.startsWith('fur') ? 'fur' : id.startsWith('hat') ? 'hat' : id.startsWith('collar') ? 'collar' : id.startsWith('acc') ? 'accessory' : 'background'
      eq[slot] = id
    }
    return eq
  }
  if (q.get('fit')) {
    // Development-only fitting view: /dev/hashling?fit=1  (every wearable alone, the four combos, all furs, compact popup size)
    const ALL = ['hat_sprout', 'hat_visor', 'hat_flower', 'hat_antenna', 'collar_bell', 'collar_vine', 'collar_led', 'acc_solar', 'acc_glass', 'acc_shield']
    const COMBOS = [
      ['fur_classic', 'hat_sprout', 'collar_bell', 'acc_glass'], ['fur_moss', 'hat_flower', 'collar_vine', 'acc_shield'],
      ['fur_cyan', 'hat_visor', 'collar_led', 'acc_solar'], ['fur_amber', 'hat_antenna', 'collar_bell', 'acc_shield'],
    ]
    const stage = (q.get('stage') as Stage) ?? 'adult'
    return (
      <div className="space-y-4 bg-white p-3" id="fit">
        <div className="grid grid-cols-5 gap-1">{ALL.map(id => (
          <div key={id} className="text-center"><Hashling stage={stage} equipped={parseEq(id)} size={300} animated={false} /><div className="data text-[10px]">{id}</div></div>
        ))}</div>
        <div className="grid grid-cols-4 gap-1">{COMBOS.map((c, i) => <Hashling key={i} stage={stage} equipped={parseEq(c.join(','))} size={340} animated={false} />)}</div>
        <div className="flex flex-wrap items-end gap-2">
          {['fur_classic', 'fur_moss', 'fur_amber', 'fur_cyan'].flatMap(f => ['hat_antenna,collar_led,acc_solar', 'hat_visor,collar_bell,acc_glass'].map(g =>
            <Hashling key={f + g} stage={stage} equipped={parseEq(`${f},${g}`)} size={170} animated={false} />))}
        </div>
      </div>
    )
  }
  const one = q.get('one')
  if (one) {
    // /dev/hashling?one=adult&mood=happy&size=600&eq=hat_visor,collar_led -> one large pet (for alignment checks)
    return (
      <div className="relative inline-block bg-white p-2" id="one">
        <Hashling stage={one as Stage} mood={(q.get('mood') as Mood) ?? 'happy'} equipped={parseEq(q.get('eq'))} size={Number(q.get('size') ?? 600)} animated={false} />
        {/* ?dots=1 : the pet's anchors (crown, ears, neck, chest, shoulders, paw) drawn as labelled dots */}
        {q.get('dots') && (() => {
          const an = placement(one as Stage, (q.get('mood') as Mood) ?? 'happy', parseEq(q.get('eq')).fur).anchors
          if (!an) return null
          const size = Number(q.get('size') ?? 600)
          return <svg viewBox="0 0 200 200" width={size} height={size} className="pointer-events-none absolute left-2 top-2">
            {Object.entries(an).map(([n, a]) => <g key={n}><circle cx={a.x} cy={a.y} r={1.3} fill="#e0007a" /><text x={a.x + 1.8} y={a.y - 1} fontSize={3.4} fill="#e0007a" fontWeight={700}>{n}</text></g>)}
          </svg>
        })()}
        {/* ?grid=neck|crown|chest ... : canonical-unit grid in that anchor's frame (10 units per line) for designing clips / fur patches */}
        {q.get('grid') && (() => {
          const a = placement(one as Stage, 'happy', parseEq(q.get('eq')).fur).anchors?.[q.get('grid') as 'neck']
          if (!a) return null
          const size = Number(q.get('size') ?? 600)
          const lines = []
          for (let v = -100; v <= 100; v += 10) {
            const strong = v % 50 === 0
            lines.push(<line key={'x' + v} x1={v} x2={v} y1={-100} y2={100} stroke={strong ? '#e00' : '#06c'} strokeWidth={strong ? 0.35 : 0.15} opacity={0.7} />)
            lines.push(<line key={'y' + v} y1={v} y2={v} x1={-100} x2={100} stroke={strong ? '#e00' : '#06c'} strokeWidth={strong ? 0.35 : 0.15} opacity={0.7} />)
            if (strong) lines.push(<text key={'t' + v} x={v + 0.5} y={-1} fontSize={3} fill="#e00">{v}</text>, <text key={'u' + v} x={0.5} y={v - 0.5} fontSize={3} fill="#e00">{v}</text>)
          }
          return <svg viewBox="0 0 200 200" width={size} height={size} className="pointer-events-none absolute left-2 top-2"><g transform={anchorTransform(a)}>{lines}</g></svg>
        })()}
      </div>
    )
  }
  if (q.get('items')) {
    return (
      <div className="grid grid-cols-3 gap-2 p-4 md:grid-cols-6">
        {ITEMS.map(([slot, id]) => (['kitten', 'cub', 'adult'] as Stage[]).map(st => (
          <div key={id + st} className="glass rounded-xl p-1 text-center">
            <Hashling stage={st} mood="happy" equipped={{ [slot]: id }} size={230} animated={false} />
            <div className="data text-[10px]">{id} · {st}</div>
          </div>
        )))}
      </div>
    )
  }
  const eq: Equipped = {}
  for (const id of (q.get('eq') ?? '').split(',').filter(Boolean)) {
    const slot = id.startsWith('fur') ? 'fur' : id.startsWith('hat') ? 'hat' : id.startsWith('collar') ? 'collar' : id.startsWith('acc') ? 'accessory' : 'background'
    eq[slot] = id
  }
  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-4">
        {STAGES.map(s => MOODS.map(m => (
          <div key={s + m} className="glass rounded-2xl p-2 text-center">
            <Hashling stage={s} mood={m} equipped={eq} size={200} animated={false} />
            <div className="data text-xs">{s} · {m}</div>
          </div>
        )))}
      </div>
    </div>
  )
}
