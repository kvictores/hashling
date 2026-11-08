import { Hashling } from '../../hashling/Hashling'
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
  if (q.get('items')) {
    return (
      <div className="grid grid-cols-6 gap-2 p-4">
        {ITEMS.map(([slot, id]) => (['kitten', 'cub', 'adult'] as Stage[]).map(st => (
          <div key={id + st} className="glass rounded-xl p-1 text-center">
            <Hashling stage={st} mood={id === 'hat_antenna' ? 'alert' : 'happy'} equipped={{ [slot]: id }} size={150} animated={false} />
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
