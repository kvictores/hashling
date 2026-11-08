import { useEffect, useState } from 'react'
import { API, api, type EvalSummary, type Metrics } from '../api'
import { Card } from '../components/ui'

const PRIVACY = [
  { icon: '🗂️', title: 'No content is stored', body: 'Hashling never saves pages, texts or emails. It only logs event metadata: warning type, risk level, scam category and domain.' },
  { icon: '✂️', title: 'Redacted before any AI', body: 'An LLM is only consulted when local heuristics already found risk. Names, emails, phone numbers, codes and card numbers are replaced with placeholders first, and only up to 1,500 characters are sent.' },
  { icon: '📁', title: 'Files stay on your device', body: 'File Check computes a SHA-256 fingerprint in your browser. Only the fingerprint is checked; the file is never uploaded.' },
  { icon: '🔑', title: 'Passwords stay on your device', body: 'Breach checks use k-anonymity: only the first 5 characters of the password’s SHA-1 hash leave the browser.' },
  { icon: '🧪', title: 'Synthetic data, fictional brands', body: 'Every demo message, page and brand in Hashling is invented for testing. No real customer data is used.' },
  { icon: '🏠', title: 'Local first', body: 'Everything works with no API keys: heuristics and the local hash list run on your own machine. Keys only add extra checks.' },
]

const SAMPLE = 'Hi Maya, this is Northbridge Bank. Call 469-555-0142 or email help@northbridge-secure.icu. Your code is 482913 and card 4111 1111 1111 1111 is locked.\nThanks,\nDana'

export default function About() {
  const [ev, setEv] = useState<EvalSummary | null>(null)
  const [evErr, setEvErr] = useState(false)
  const [prompt, setPrompt] = useState<{ prompt: string; llm_enabled: boolean; model: string } | null>(null)

  useEffect(() => {
    api.evalResults().then(r => (r.summary ? setEv(r.summary) : setEvErr(true))).catch(() => setEvErr(true))
    fetch(API + '/privacy/redact-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: SAMPLE, channel: 'sms', sender: '+1 (469) 555-0142' }) })
      .then(r => r.json()).then(setPrompt).catch(() => { /* backend offline */ })
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <div>
          <h1 className="text-4xl font-bold">About Hashling</h1>
          <p className="mt-3 max-w-3xl text-lg">
            Hashling is a cyber-pet that lives in your browser. She catches scams, phishing and malware, and grows as you get smarter about security.
            Warnings come from Hashling herself instead of a generic red box, heeding them earns points, and every blocked threat becomes a quick lesson.
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-3xl font-bold">Privacy by design</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PRIVACY.map(p => (
            <Card key={p.title} className="!p-5">
              <div className="text-3xl" aria-hidden>{p.icon}</div>
              <h3 className="mt-2 text-xl font-bold">{p.title}</h3>
              <p className="mt-1 text-[15px] text-muted">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {prompt && (
        <Card>
          <h2 className="text-2xl font-bold">See the redaction for yourself</h2>
          <p className="mt-1 text-muted">
            This is exactly what Hashling would send for review ({prompt.llm_enabled ? <>AI review is <b>on</b>, model <code className="data">{prompt.model}</code></> : <>AI review is currently <b>off</b>: no API key, so nothing leaves this machine</>}).
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold text-muted">Original message</p>
              <pre className="data whitespace-pre-wrap rounded-2xl bg-risk-red/5 p-4 text-sm">{SAMPLE}</pre>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-muted">What the AI would see</p>
              <pre className="data whitespace-pre-wrap rounded-2xl bg-leaf/10 p-4 text-sm">{prompt.prompt.split('Content (redacted, truncated):\n')[1]?.replace(/<<<\n|\n>>>/g, '') ?? prompt.prompt}</pre>
            </div>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-4 text-3xl font-bold">Detection accuracy</h2>
        {evErr && <Card><p className="text-muted">No results yet. Run <code className="data">python eval.py</code> in <code className="data">backend/</code>.</p></Card>}
        {ev && <EvalCard ev={ev} />}
      </section>
    </div>
  )
}

function Bar({ label, h, b }: { label: string; h: number; b: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="data"><b className="text-leaf">{(h * 100).toFixed(1)}%</b> <span className="text-muted">vs {(b * 100).toFixed(1)}%</span></span></div>
      <div className="relative mt-1 h-3 rounded-full bg-ink/10">
        <div className="absolute inset-y-0 left-0 rounded-full bg-terra/50" style={{ width: `${b * 100}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-leaf" style={{ width: `${h * 100}%`, height: '50%', top: '25%' }} />
      </div>
    </div>
  )
}

function Matrix({ m }: { m: Metrics }) {
  const c = m.confusion
  return (
    <table className="data w-full text-center text-sm">
      <thead><tr><th></th><th className="pb-1 font-normal text-muted">pred. scam</th><th className="pb-1 font-normal text-muted">pred. legit</th></tr></thead>
      <tbody>
        <tr><th className="pr-2 text-right font-normal text-muted">scam</th><td className="rounded-lg bg-leaf/15 py-2 font-bold">{c.tp}</td><td className="rounded-lg bg-risk-red/10 py-2 font-bold">{c.fn}</td></tr>
        <tr><th className="pr-2 text-right font-normal text-muted">legit</th><td className="rounded-lg bg-risk-red/10 py-2 font-bold">{c.fp}</td><td className="rounded-lg bg-leaf/15 py-2 font-bold">{c.tn}</td></tr>
      </tbody>
    </table>
  )
}

function EvalCard({ ev }: { ev: EvalSummary & { category_accuracy?: number; engine?: string } }) {
  const sets = [{ name: 'Held-out set (not used for tuning)', size: ev.holdout?.size, h: ev.holdout?.hybrid, b: ev.holdout?.baseline, primary: true },
    { name: 'Main set (rules built alongside it)', size: ev.dataset_size, h: ev.hybrid, b: ev.baseline, primary: false }].filter(s => s.h)
  return (
    <Card vines>
      <div className="grid gap-6 lg:grid-cols-2">
        {sets.map(s => (
          <div key={s.name} className={`rounded-2xl p-4 ${s.primary ? 'bg-white/80 ring-2 ring-cyan/40' : 'bg-white/50'}`}>
            <h3 className="text-lg font-bold">{s.name} <span className="data text-sm font-normal text-muted">· {s.size} msgs</span></h3>
            <div className="mt-3 space-y-3">
              <Bar label="Accuracy" h={s.h!.accuracy} b={s.b!.accuracy} />
              <Bar label="Precision" h={s.h!.precision} b={s.b!.precision} />
              <Bar label="Recall" h={s.h!.recall} b={s.b!.recall} />
              <Bar label="F1" h={s.h!.f1} b={s.b!.f1} />
            </div>
            <div className="mt-4"><Matrix m={s.h!} /></div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        <span className="mr-3 inline-flex items-center gap-1"><i className="inline-block h-2 w-4 rounded bg-leaf" /> Hashling hybrid engine</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-4 rounded bg-terra/50" /> keyword-only baseline</span>
      </p>
      <p className="mt-2 text-sm text-muted">
        All messages are synthetic and written by our team. The main set was written while building the rules, so its score is optimistic;
        the held-out set is the more honest number. Engine: <code className="data">{ev.engine ?? 'heuristic'}</code> · generated {ev.generated_at}. Full report: <code className="data">backend/eval_results.md</code>.
      </p>
    </Card>
  )
}
