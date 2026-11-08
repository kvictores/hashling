import { useEffect, useState } from 'react'
import { Card } from '../components/ui'
import {
  crackTime, estimateStrength, generatePassphrase, generatePassword, passphraseEntropy, passwordEntropy, pwnedCount, sha1Hex,
  type CharOpts, type PhraseOpts,
} from '../lib/passwords'

const METER = ['#D9463B', '#D9734E', '#F2B33D', '#6FAF6B', '#3E8E5A']

export default function Passwords() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Password Tools</h1>
        <p className="mt-2 max-w-3xl text-lg text-muted">Make strong, unique passwords and check whether one has shown up in a data breach.</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-leaf/10 px-4 py-2 text-[15px] font-semibold text-leaf">
          🔒 Your password never leaves this device. Generation and strength checks run entirely in your browser.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Generator />
        <BreachCheck />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button className="btn btn-primary !py-2" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) } catch { /* ignore */ } }}>
      {ok ? 'Copied!' : 'Copy'}
    </button>
  )
}

function Generator() {
  const [mode, setMode] = useState<'phrase' | 'chars'>('phrase')
  const [co, setCo] = useState<CharOpts>({ length: 20, lower: true, upper: true, digits: true, symbols: true })
  const [po, setPo] = useState<PhraseOpts>({ words: 5, sep: '-', capitalize: true, number: true })
  const [value, setValue] = useState('')
  const regen = () => setValue(mode === 'chars' ? generatePassword(co) : generatePassphrase(po))
  useEffect(regen, [mode, co, po]) // eslint-disable-line react-hooks/exhaustive-deps
  const bits = Math.round(mode === 'chars' ? passwordEntropy(co) : passphraseEntropy(po))
  const score = bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4

  return (
    <Card vines>
      <h2 className="text-2xl font-bold">Generator</h2>
      <div className="mt-3 inline-flex rounded-full bg-ink/5 p-1" role="tablist">
        {([['phrase', 'Passphrase'], ['chars', 'Random characters']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${mode === k ? 'bg-leaf text-white' : ''}`}>{l}</button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-leaf/20 bg-white/90 p-2 pl-4">
        <code className="data flex-1 break-all text-lg">{value}</code>
        <button className="btn btn-ghost !px-3 !py-2" onClick={regen} aria-label="Generate another">↻</button>
        <CopyButton text={value} />
      </div>
      <div className="mt-3">
        <div className="flex h-2.5 gap-1">{[1, 2, 3, 4].map(i => <span key={i} className="flex-1 rounded-full" style={{ background: i <= score ? METER[score] : 'rgba(35,51,42,.1)' }} />)}</div>
        <p className="mt-1 text-sm text-muted"><span className="data font-semibold text-ink">{bits} bits</span> of randomness · about <b>{crackTime(bits)}</b> to guess at 10 billion tries/second</p>
      </div>

      {mode === 'chars' ? (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="flex justify-between text-sm font-medium"><span>Length</span><span className="data">{co.length}</span></span>
            <input type="range" min={10} max={40} value={co.length} onChange={e => setCo({ ...co, length: +e.target.value })} className="w-full accent-[#3E8E5A]" />
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['lower', 'upper', 'digits', 'symbols'] as const).map(k => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={co[k]} onChange={e => setCo({ ...co, [k]: e.target.checked })} className="accent-[#3E8E5A]" />{k}</label>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="flex justify-between text-sm font-medium"><span>Words</span><span className="data">{po.words}</span></span>
            <input type="range" min={3} max={8} value={po.words} onChange={e => setPo({ ...po, words: +e.target.value })} className="w-full accent-[#3E8E5A]" />
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">Separator
              <select value={po.sep} onChange={e => setPo({ ...po, sep: e.target.value })} className="rounded-lg border border-ink/15 bg-white px-2 py-1">
                <option value="-">-</option><option value=".">.</option><option value="_">_</option><option value=" ">space</option>
              </select>
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={po.capitalize} onChange={e => setPo({ ...po, capitalize: e.target.checked })} className="accent-[#3E8E5A]" />Capitalize</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={po.number} onChange={e => setPo({ ...po, number: e.target.checked })} className="accent-[#3E8E5A]" />Add a number</label>
          </div>
          <p className="text-sm text-muted">Passphrases are long, random and easy to type. Use a different one for every account, ideally saved in a password manager.</p>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Randomness comes from your browser’s <code>crypto.getRandomValues</code> (cryptographically secure).</p>
    </Card>
  )
}

function BreachCheck() {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ count: number; prefix: string; suffix: string; returned: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [preview, setPreview] = useState('')
  const s = estimateStrength(pw)

  useEffect(() => {
    setRes(null)
    if (!pw) { setPreview(''); return }
    let alive = true
    sha1Hex(pw).then(h => { if (alive) setPreview(h) })
    return () => { alive = false }
  }, [pw])

  const check = async () => {
    setBusy(true); setErr(null)
    try { setRes(await pwnedCount(pw)) } catch (e) { setErr(`Couldn’t reach the breach service (${(e as Error).message}). Are you online?`) } finally { setBusy(false) }
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold">Strength &amp; breach check</h2>
      <label className="mt-4 block">
        <span className="text-sm font-medium text-muted">Type a password to test</span>
        <div className="mt-1 flex gap-2">
          <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} autoComplete="off" spellCheck={false}
            className="data w-full rounded-xl border border-ink/15 bg-white/90 px-3 py-2.5 outline-none focus:border-cyan" />
          <button className="btn btn-ghost !px-3 !py-2 text-sm" onClick={() => setShow(v => !v)}>{show ? 'Hide' : 'Show'}</button>
        </div>
      </label>
      {pw && (
        <div className="mt-3">
          <div className="flex h-2.5 gap-1">{[0, 1, 2, 3, 4].map(i => <span key={i} className="flex-1 rounded-full" style={{ background: i <= s.score ? METER[s.score] : 'rgba(35,51,42,.1)' }} />)}</div>
          <p className="mt-1 text-sm"><b style={{ color: METER[s.score] }}>{s.label}</b> · <span className="data">~{s.bits} bits</span> · could be guessed in about <b>{s.crack}</b></p>
          {s.tips.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">{s.tips.map(t => <li key={t}>{t}</li>)}</ul>}
        </div>
      )}
      <button className="btn btn-primary mt-4" disabled={!pw || busy} onClick={check}>{busy ? 'Checking…' : 'Check known breaches'}</button>

      {err && <p className="mt-3 text-risk-red">{err}</p>}
      {res && (
        <div className={`fade-up mt-4 rounded-2xl border-l-4 p-4 ${res.count ? 'border-risk-red bg-risk-red/10' : 'border-leaf bg-leaf/10'}`}>
          {res.count ? (
            <><p className="font-display text-xl font-bold text-risk-red">Found in {res.count.toLocaleString()} breaches</p>
              <p className="mt-1 text-[15px]">Attackers already have this password in their lists. Don’t use it anywhere, and change it wherever you have.</p></>
          ) : (
            <><p className="font-display text-xl font-bold text-leaf">Not found in known breaches</p>
              <p className="mt-1 text-[15px]">Good sign, but still use it on only one site.</p></>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-sky/30 p-4 text-[15px]">
        <h3 className="font-display text-lg font-bold">How this stays private (k-anonymity)</h3>
        <ol className="mt-2 space-y-1">
          <li><b>1.</b> Your browser turns the password into a SHA-1 fingerprint.</li>
          <li><b>2.</b> Only the <b>first 5 characters</b> are sent to the Have I Been Pwned range API. Hundreds of unrelated passwords share them.</li>
          <li><b>3.</b> The service returns every matching fingerprint ending, and your browser compares them locally.</li>
        </ol>
        {preview && (
          <p className="data mt-3 break-all text-xs leading-relaxed">
            sent: <span className="rounded bg-cyan/25 px-1 font-bold text-ink">{preview.slice(0, 5)}</span>
            <span className="text-muted"> · kept on device: {preview.slice(5)}</span>
            {res && <span className="text-muted"> · {res.returned} suffixes compared locally</span>}
          </p>
        )}
      </div>
    </Card>
  )
}
