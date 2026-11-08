import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Equipped, type ShopItem, type Slot } from '../api'
import { useUser } from '../UserContext'
import { Hashling } from '../hashling/Hashling'
import { Scene, SceneBackground } from '../hashling/Scene'
import { FUR } from '../hashling/palettes'
import { Card, ProgressBar } from '../components/ui'
import { Coin } from '../components/Layout'

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'hat', label: 'Hats' },
  { slot: 'collar', label: 'Collars' },
  { slot: 'accessory', label: 'Accessories' },
  { slot: 'fur', label: 'Fur colors' },
  { slot: 'background', label: 'Backgrounds' },
]
const DEFAULTS: Partial<Record<Slot, string>> = { fur: 'fur_classic', background: 'bg_greenhouse' }

export default function Shop() {
  const { user, userId, setUser } = useUser()
  const [items, setItems] = useState<ShopItem[]>([])
  const [unlocked, setUnlocked] = useState(false)
  const [preview, setPreview] = useState<ShopItem | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    const r = await api.shop(userId)
    setItems(r.items)
    setUnlocked(r.unlocked)
  }, [userId])
  useEffect(() => { load() }, [load, user?.stage, user?.wallet])

  const equipped: Equipped = useMemo(() => {
    const eq: Equipped = { ...(user?.equipped ?? {}) }
    if (preview) eq[preview.slot] = preview.id
    return eq
  }, [user?.equipped, preview])

  if (!user) return null

  const act = async (it: ShopItem, kind: 'buy' | 'equip' | 'unequip') => {
    setBusy(it.id)
    try {
      const r = kind === 'buy' ? await api.buy(userId, it.id) : await api.equip(userId, it.id, kind === 'equip')
      setUser(r.user)
      setMsg({ text: kind === 'buy' ? `Bought ${it.name}! It’s equipped.` : kind === 'equip' ? `${it.name} equipped.` : `${it.name} removed.`, ok: true })
      await load()
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false })
    } finally {
      setBusy(null)
      setTimeout(() => setMsg(null), 2500)
    }
  }

  const stageForPreview = user.stage === 'egg' ? 'kitten' : user.stage

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Hashling’s Shop</h1>
          <p className="mt-1 text-lg text-muted">Spend your wallet points on hats, collars, gadgets, fur and dens. Hover an item to try it on.</p>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-lg">
          <Coin size={22} /> <span className="data font-semibold">{user.wallet}</span> <span className="text-sm text-muted">to spend</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Scene background={equipped.background} className="aspect-square w-full">
            <div className="mb-[5%] w-[78%]">
              <Hashling stage={stageForPreview} mood="happy" equipped={equipped} size="100%" />
            </div>
          </Scene>
          <div className="mt-3 min-h-[3rem] text-center">
            {preview ? (
              <p className="text-lg"><span className="font-semibold">Trying on:</span> {preview.name}</p>
            ) : (
              <p className="text-muted">Wearing: {Object.entries(user.equipped).filter(([s, id]) => DEFAULTS[s as Slot] !== id).map(([, id]) => items.find(i => i.id === id)?.name).filter(Boolean).join(', ') || 'nothing yet'}</p>
            )}
            {msg && <p className={`fade-up mt-1 font-semibold ${msg.ok ? 'text-leaf' : 'text-risk-red'}`} role="status">{msg.text}</p>}
          </div>
        </div>

        <div className="relative">
          {!unlocked && <LockedOverlay />}
          <div className={`space-y-6 ${!unlocked ? 'pointer-events-none select-none opacity-50 blur-[1.5px]' : ''}`} aria-hidden={!unlocked}>
            {SLOTS.map(({ slot, label }) => (
              <Card key={slot} className="!p-5">
                <h2 className="mb-3 text-xl font-bold">{label}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {items.filter(i => i.slot === slot).map(it => (
                    <ItemCard key={it.id} it={it} stage={stageForPreview} wallet={user.wallet} busy={busy === it.id}
                      onPreview={setPreview} onAct={act} isDefault={DEFAULTS[slot] === it.id} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ItemCard({ it, stage, wallet, busy, onPreview, onAct, isDefault }: {
  it: ShopItem; stage: 'kitten' | 'cub' | 'adult'; wallet: number; busy: boolean; isDefault: boolean
  onPreview: (i: ShopItem | null) => void; onAct: (i: ShopItem, k: 'buy' | 'equip' | 'unequip') => void
}) {
  const afford = wallet >= it.price
  return (
    <div
      className={`group flex flex-col rounded-2xl border-2 bg-white/80 p-3 transition ${it.equipped ? 'border-leaf shadow-[0_0_18px_rgba(34,211,197,.35)]' : 'border-transparent hover:border-cyan/60'}`}
      onMouseEnter={() => onPreview(it)} onMouseLeave={() => onPreview(null)} onFocus={() => onPreview(it)} onBlur={() => onPreview(null)}>
      <div className="relative mx-auto flex aspect-square w-full items-end justify-center overflow-hidden rounded-xl bg-sky/30">
        <Thumb it={it} stage={stage} />
        {it.equipped && <span className="data absolute left-1.5 top-1.5 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold uppercase text-white">equipped</span>}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight">{it.name}</span>
        <span className="data flex shrink-0 items-center gap-1 text-sm">{it.price === 0 ? 'free' : <><Coin size={13} />{it.price}</>}</span>
      </div>
      <div className="mt-2">
        {!it.owned ? (
          <button className="btn btn-primary w-full !py-1.5 text-sm" disabled={!afford || busy} onClick={() => onAct(it, 'buy')}
            title={afford ? '' : 'Not enough points yet'}>{afford ? 'Buy' : `Need ${it.price - wallet} more`}</button>
        ) : it.equipped ? (
          <button className="btn btn-ghost w-full !py-1.5 text-sm" disabled={busy || isDefault} onClick={() => onAct(it, 'unequip')}>
            {isDefault ? 'Default' : 'Unequip'}
          </button>
        ) : (
          <button className="btn btn-ghost w-full !py-1.5 text-sm" disabled={busy} onClick={() => onAct(it, 'equip')}>Equip</button>
        )}
      </div>
    </div>
  )
}

function Thumb({ it, stage }: { it: ShopItem; stage: 'kitten' | 'cub' | 'adult' }) {
  if (it.slot === 'background') {
    return <div className="absolute inset-0"><SceneBackground id={it.id} /></div>
  }
  if (it.slot === 'fur') {
    const p = FUR[it.id]
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Hashling stage={stage} mood="happy" equipped={{ fur: it.id }} size="90%" animated={false} />
        <span className="absolute bottom-2 right-2 flex gap-1">{[p.base, p.shade, p.spot].map(c => <i key={c} className="h-3 w-3 rounded-full border border-ink/20" style={{ background: c }} />)}</span>
      </div>
    )
  }
  return <Hashling stage={stage} mood="happy" equipped={{ [it.slot]: it.id }} size="92%" animated={false} />
}

function LockedOverlay() {
  const { user } = useUser()
  if (!user) return null
  const toAdult = Math.max(0, 250 - user.lifetime_points)
  return (
    <div className="absolute inset-x-0 top-10 z-10 flex justify-center px-4">
      <Card className="max-w-md text-center !bg-white/95">
        <div className="text-5xl" aria-hidden>🔒</div>
        <h2 className="mt-2 text-2xl font-bold">Grow Hashling to unlock</h2>
        <p className="mt-2 text-muted">The shop opens when Hashling becomes an <b>adult</b> (250 lifetime points). You’re a <b className="capitalize">{user.stage}</b> with <span className="data">{user.lifetime_points}</span> points.</p>
        <ProgressBar value={Math.min(1, user.lifetime_points / 250)} className="mt-4" />
        <p className="data mt-2 text-sm text-muted">{toAdult} points to go</p>
        <Link to="/quiz" className="btn btn-primary mt-4">Earn points in today’s quiz</Link>
      </Card>
    </div>
  )
}
