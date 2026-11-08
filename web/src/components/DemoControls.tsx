import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { useUser } from '../UserContext'

const KEY = 'hashling_demo'

/** Hidden judge/demo panel. Turn on with ?demo=1 (remembered), off with ?demo=0. */
export function DemoControls() {
  const loc = useLocation()
  const { userId, setUser, refresh, celebrate } = useUser()
  const [on, setOn] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(loc.search).get('demo')
    if (q === '1' || q === '0') {
      setOn(q === '1')
      try { localStorage.setItem(KEY, q) } catch { /* ignore */ }
    }
  }, [loc.search])

  if (!on) return null

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true)
    try { await fn(); setMsg(label) } catch (e) { setMsg(String((e as Error).message)) }
    setBusy(false)
    setTimeout(() => setMsg(''), 2000)
    window.dispatchEvent(new Event('hashling:refresh'))
  }

  return (
    <div className="glass fixed bottom-4 left-4 z-[90] w-60 rounded-2xl border-2 border-dashed !border-cyan/60 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="data text-xs font-bold uppercase tracking-widest text-cyan">Demo controls</span>
        <button className="text-xs text-muted hover:text-ink" onClick={() => { setOn(false); try { localStorage.setItem(KEY, '0') } catch { /* ignore */ } }}>hide</button>
      </div>
      <div className="grid gap-2">
        <button disabled={busy} className="btn btn-ghost !py-1.5" onClick={() => run('+50 points', async () => {
          const r = await api.demoPoints(userId, 50); setUser(r.user); if (r.stage_up) celebrate(r.stage_up)
        })}>+50 points</button>
        <button disabled={busy} className="btn btn-ghost !py-1.5" onClick={() => run('Advanced one day', async () => {
          const r = await api.nextDay(userId); setUser(r.user)
        })}>Next day</button>
        <button disabled={busy} className="btn btn-ghost !py-1.5 !text-risk-red" onClick={() => run('User reset', async () => {
          await api.reset(userId); await refresh()
        })}>Reset user</button>
      </div>
      {msg && <p className="data mt-2 text-center text-xs text-leaf">{msg}</p>}
    </div>
  )
}
