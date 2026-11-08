import { useRef, useState } from 'react'
import { api } from '../api'
import { Card } from '../components/ui'
import { Hashling } from '../hashling/Hashling'
import { useUser } from '../UserContext'

type Status = 'known_malicious' | 'clean' | 'unknown'
interface Result { name: string; size: number; sha256: string; status: Status; detail: string; source: string; match?: string; extWarning?: string }

// The industry-standard, harmless antivirus test string (built in memory for the demo; never written to disk).
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

async function sha256Hex(buf: ArrayBuffer) {
  const d = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function extensionWarning(name: string): string | undefined {
  const n = name.toLowerCase()
  if (/\.(pdf|docx?|xlsx?|jpe?g|png|txt)\.(exe|scr|js|vbs|bat|cmd|msi|lnk)$/.test(n)) return 'Double extension: this is a program pretending to be a document.'
  if (/\.(exe|scr|js|vbs|bat|cmd|msi|jar|apk|lnk|iso)$/.test(n)) return 'This is a program or script. Only run it if you downloaded it from a source you trust.'
  if (/\.(html?|svg)$/.test(n)) return 'HTML/SVG attachments can open fake login pages in your browser.'
  if (/\.(zip|rar|7z)$/.test(n)) return 'Archives can hide malware inside; the fingerprint only covers the archive itself.'
  return undefined
}

const META: Record<Status, { title: string; color: string; bg: string; mood: 'alert' | 'happy' | 'sleepy' }> = {
  known_malicious: { title: 'Known malicious file', color: '#D9463B', bg: 'rgba(217,70,59,.1)', mood: 'alert' },
  clean: { title: 'Known clean file', color: '#3E8E5A', bg: 'rgba(62,142,90,.1)', mood: 'happy' },
  unknown: { title: 'Not in our lists', color: '#B7801A', bg: 'rgba(242,179,61,.14)', mood: 'sleepy' },
}

export default function FileCheck() {
  const { user } = useUser()
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Result | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const check = async (name: string, buf: ArrayBuffer) => {
    setBusy(true); setErr(null); setRes(null)
    try {
      const h = await sha256Hex(buf) // computed locally; the file itself is never uploaded
      const r = await api.hashCheck(h)
      setRes({ name, size: buf.byteLength, sha256: h, status: r.status, detail: r.detail, source: r.source, match: r.name, extWarning: extensionWarning(name) })
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const onFiles = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (f.size > 512 * 1024 * 1024) { setErr('That file is over 512 MB. Try a smaller one for this demo.'); return }
    await check(f.name, await f.arrayBuffer())
  }

  const stage = user?.stage === 'egg' || !user ? 'kitten' : user.stage
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">File Check</h1>
        <p className="mt-2 max-w-3xl text-lg text-muted">Got an unexpected attachment? Drop it here. Hashling fingerprints it and checks the fingerprint against known malware.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card vines>
          <div
            onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files) }}
            onClick={() => input.current?.click()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') input.current?.click() }}
            role="button" tabIndex={0} aria-label="Choose or drop a file to check"
            className={`cyber-glow flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${over ? 'border-cyan bg-cyan/10' : 'border-leaf/30 bg-white/60 hover:border-cyan'}`}>
            <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden><path d="M12 6h16l10 10v26H12z" fill="#fff" stroke="#3E8E5A" strokeWidth="2.5" strokeLinejoin="round" /><path d="M28 6v10h10" fill="none" stroke="#3E8E5A" strokeWidth="2.5" /><path d="M18 28h14M18 34h10" stroke="#22D3C5" strokeWidth="2.5" strokeLinecap="round" /></svg>
            <p className="mt-3 text-xl font-semibold">{busy ? 'Fingerprinting…' : 'Drop a file here, or click to choose'}</p>
            <p className="mt-1 text-sm text-muted">Any file type · up to 512 MB</p>
            <input ref={input} type="file" className="hidden" onChange={e => onFiles(e.target.files)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="btn btn-ghost" onClick={() => check('eicar-test-file.com', new TextEncoder().encode(EICAR).buffer as ArrayBuffer)}>Try the EICAR test file</button>
            <span className="text-sm text-muted">The harmless industry-standard file antivirus tools use for testing. Built in memory.</span>
          </div>
          <div className="mt-6 rounded-2xl border border-leaf/20 bg-leaf/5 p-4">
            <h2 className="font-display text-lg font-bold">🔒 Your file never leaves your device</h2>
            <ol className="mt-2 space-y-1 text-[15px]">
              <li><b>1.</b> Your browser computes the file’s SHA-256 fingerprint locally (Web Crypto).</li>
              <li><b>2.</b> Only that 64-character fingerprint is sent to Hashling. The file itself is never uploaded.</li>
              <li><b>3.</b> Hashling checks its local list of known-bad fingerprints, then VirusTotal (by fingerprint only) if configured.</li>
            </ol>
          </div>
        </Card>

        <Card className="min-h-[360px]">
          {err && <p className="text-risk-red">{err}</p>}
          {!res && !err && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              <Hashling stage={stage} mood="sleepy" equipped={user?.equipped} size={160} />
              <p className="text-muted">Waiting for a file to sniff…</p>
            </div>
          )}
          {res && (
            <div className="fade-up space-y-4">
              <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: META[res.status].bg }}>
                <Hashling stage={stage} mood={META[res.status].mood} equipped={user?.equipped} size={90} />
                <div>
                  <p className="font-display text-2xl font-bold" style={{ color: META[res.status].color }}>{META[res.status].title}</p>
                  {res.match && <p className="data text-sm">{res.match}</p>}
                  <p className="text-[15px]">{res.detail}</p>
                </div>
              </div>
              {res.extWarning && <p className="rounded-xl border-l-4 border-sun bg-sun/10 px-3 py-2 text-[15px]">⚠️ {res.extWarning}</p>}
              <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[15px]">
                <dt className="text-muted">File</dt><dd className="truncate font-semibold">{res.name}</dd>
                <dt className="text-muted">Size</dt><dd className="data">{res.size.toLocaleString()} bytes</dd>
                <dt className="text-muted">SHA-256</dt><dd className="data break-all text-xs leading-relaxed text-[#0f8f86]">{res.sha256}</dd>
                <dt className="text-muted">Checked by</dt><dd>{res.source === 'virustotal' ? 'VirusTotal (fingerprint only)' : 'Hashling local list'}</dd>
              </dl>
              {res.status === 'unknown' && <p className="text-sm text-muted">“Unknown” doesn’t mean safe: brand-new malware won’t be in any list yet. Only open files you were expecting.</p>}
              {res.status === 'known_malicious' && (
                <ul className="list-disc space-y-1 pl-5 text-[15px]"><li>Don’t open or run it.</li><li>Delete it (and empty the trash).</li><li>If you already opened it, disconnect from the internet and run a trusted security scan.</li></ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
