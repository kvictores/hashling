import { useState } from 'react'
import { api, type Analysis } from '../api'
import { AnalysisReport, Card } from '../components/ui'
import { Hashling } from '../hashling/Hashling'
import { useUser } from '../UserContext'

const SAMPLES: { label: string; channel: 'sms' | 'email'; sender?: string; subject?: string; text: string }[] = [
  { label: 'Toll fee text', channel: 'sms', sender: '+1 (945) 555-0131',
    text: 'MetroToll: Final notice! You have an unpaid toll of $4.35. Pay within 12 hours to avoid a $50 late fee: https://metrotoll-pay.icu/pay' },
  { label: 'Bank "fraud team"', channel: 'sms', sender: '+1 (682) 555-0164',
    text: 'This is the Northbridge Bank fraud team. We stopped a $940 charge on your card. To cancel it, reply with the 6-digit code we just sent you.' },
  { label: 'Boss gift-card email', channel: 'email', sender: 'Dana Whitfield <dana.whitfield.ceo@gmail.com>', subject: 'Quick favor',
    text: "Hi, are you available? I need you to buy 5 gift cards for a client today, $200 each. Scratch off the codes and email me photos. Keep this between us, I'm in a meeting and can't talk." },
  { label: 'Real 2FA code', channel: 'sms', sender: '88021',
    text: "Your Northbridge Bank verification code is 482913. Don't share it with anyone. Northbridge will never call or text to ask for this code." },
  { label: 'Real delivery notice', channel: 'sms', sender: '72345',
    text: 'SwiftShip: Your package 1Z48K is out for delivery today between 2-6 PM. Track: https://swiftship.com/track/1Z48K Reply STOP to opt out.' },
]

export default function ScamCheck() {
  const { user } = useUser()
  const [channel, setChannel] = useState<'sms' | 'email'>('sms')
  const [text, setText] = useState('')
  const [sender, setSender] = useState('')
  const [subject, setSubject] = useState('')
  const [res, setRes] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    if (!text.trim()) return
    setBusy(true); setErr(null)
    try { setRes(await api.analyzeText(text, channel, sender, channel === 'email' ? subject : '')) }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }
  const load = (s: typeof SAMPLES[number]) => {
    setChannel(s.channel); setText(s.text); setSender(s.sender ?? ''); setSubject(s.subject ?? ''); setRes(null)
  }

  const mood = res ? (res.risk === 'red' ? 'alert' : res.risk === 'yellow' ? 'alert' : 'happy') : 'happy'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Scam Check</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">Got a text or email that feels off? Paste it here. Hashling explains the risk, how sure it is, and what to do next.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card vines>
          <div className="mb-4 inline-flex rounded-full bg-ink/5 p-1" role="tablist" aria-label="Message type">
            {(['sms', 'email'] as const).map(c => (
              <button key={c} role="tab" aria-selected={channel === c} onClick={() => setChannel(c)}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${channel === c ? 'bg-leaf text-white' : 'text-ink'}`}>
                {c === 'sms' ? 'Text message' : 'Email'}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            <label className="block">
              <span className="text-sm font-medium text-muted">{channel === 'sms' ? 'From (number or name), optional' : 'From (sender), optional'}</span>
              <input value={sender} onChange={e => setSender(e.target.value)} placeholder={channel === 'sms' ? '+1 (555) 555-0100' : 'Name <address@example.com>'}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white/90 px-3 py-2.5 outline-none focus:border-cyan" />
            </label>
            {channel === 'email' && (
              <label className="block">
                <span className="text-sm font-medium text-muted">Subject, optional</span>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white/90 px-3 py-2.5 outline-none focus:border-cyan" />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium text-muted">Message</span>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={8} placeholder="Paste the suspicious message here…"
                className="mt-1 w-full resize-y rounded-xl border border-ink/15 bg-white/90 px-3 py-2.5 text-[16px] leading-relaxed outline-none focus:border-cyan" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="btn btn-primary px-7" onClick={run} disabled={busy || !text.trim()}>{busy ? 'Checking…' : 'Check with Hashling'}</button>
            <button className="btn btn-ghost" onClick={() => { setText(''); setSender(''); setSubject(''); setRes(null) }}>Clear</button>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-muted">Try an example (all fictional):</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map(s => (
                <button key={s.label} onClick={() => load(s)} className="cyber-glow rounded-full border border-leaf/20 bg-white/70 px-3 py-1.5 text-sm hover:border-cyan">{s.label}</button>
              ))}
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-leaf/5 px-3 py-2 text-sm text-muted">
            🔒 Your message is analyzed and then discarded. Hashling never stores message content. If AI review is enabled, names, emails, phone and card numbers are redacted first.
          </p>
        </Card>

        <Card className="min-h-[420px]">
          {!res && !err && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
              <Hashling stage={user?.stage === 'egg' ? 'kitten' : user?.stage ?? 'kitten'} mood="sleepy" equipped={user?.equipped} size={180} />
              <p className="text-lg text-muted">Hashling is ready to sniff out scams.</p>
            </div>
          )}
          {err && <p className="text-risk-red">{err}</p>}
          {res && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Hashling stage={user?.stage === 'egg' ? 'kitten' : user?.stage ?? 'kitten'} mood={mood} equipped={user?.equipped} size={84} />
                <p className="font-display text-xl font-bold">
                  {res.risk === 'red' ? 'Hashling’s fur is standing up. This looks like a scam.' : res.risk === 'yellow' ? 'Hashling is suspicious. Be careful with this one.' : 'Hashling doesn’t smell anything fishy.'}
                </p>
              </div>
              <AnalysisReport a={res} />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
