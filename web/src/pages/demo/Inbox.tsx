import { useEffect, useState } from 'react'
import { api, type Analysis } from '../../api'
import { DemoBanner, RISK_META } from '../../components/ui'
import { EMAILS, type DemoEmail } from './inboxData'

/** Generic webmail-style inbox for testing the extension's email banners. Not modeled on any real provider. */
export default function Inbox() {
  const [openId, setOpenId] = useState<string>('e1')
  const [ext, setExt] = useState(false)
  const email = EMAILS.find(e => e.id === openId)!

  useEffect(() => {
    document.title = 'Leafbox Mail · Demo inbox'
    const check = () => setExt(document.documentElement.dataset.hashlingExtension === '1')
    check()
    const t = setInterval(check, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#EEF2EF] font-sans text-[#1f2a24]">
      <DemoBanner />
      <div className="flex items-center gap-3 border-b border-black/10 bg-white px-5 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5b7f6e] font-bold text-white">L</div>
        <span className="text-xl font-semibold">Leafbox Mail</span>
        <input className="ml-6 hidden w-96 rounded-lg bg-black/5 px-3 py-2 text-sm md:block" placeholder="Search mail" disabled />
        <span className="ml-auto text-sm text-black/50">maya@leafbox.example</span>
      </div>
      <div className="mx-auto grid max-w-7xl gap-0 md:grid-cols-[360px_1fr]">
        <ul className="border-r border-black/10 bg-white md:min-h-[calc(100vh-90px)]" aria-label="Inbox">
          <li className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-black/40">Inbox · {EMAILS.length}</li>
          {EMAILS.map(e => (
            <li key={e.id}>
              <button onClick={() => setOpenId(e.id)} data-email-row={e.id}
                className={`block w-full border-b border-black/5 px-4 py-3 text-left hover:bg-black/[0.03] ${openId === e.id ? 'bg-[#e3ece6]' : ''}`}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{e.from}</span><span className="text-black/40">{e.time}</span></div>
                <div className="truncate text-sm">{e.subject}</div>
                <div className="truncate text-xs text-black/50">{e.preview}</div>
              </button>
            </li>
          ))}
        </ul>
        <EmailView key={email.id} email={email} ext={ext} />
      </div>
    </div>
  )
}

function EmailView({ email, ext }: { email: DemoEmail; ext: boolean }) {
  const [fallback, setFallback] = useState<Analysis | null>(null)
  const links = email.body.filter(b => b.link).map(b => b.link!.href)
  const bodyText = email.body.map(b => b.p ?? b.link?.text ?? '').join('\n') + (email.attachment ? `\nAttachment: ${email.attachment}` : '')

  const checkWithoutExtension = async () => {
    setFallback(await api.analyzeEmail(`${email.from} <${email.address}>`, email.subject, bodyText, links))
  }

  return (
    <article className="bg-white p-6 md:p-8" data-hashling-email="1" data-email-id={email.id} aria-label="Open email">
      <div data-hashling-banner-slot="" />
      {fallback && <FallbackBanner a={fallback} />}
      <h1 className="text-2xl font-semibold" data-email-subject="">{email.subject}</h1>
      <div className="mt-3 flex items-center gap-3 border-b border-black/10 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c9d8cf] font-semibold">{email.from[0]}</div>
        <div className="text-sm">
          <div data-email-sender=""><span className="font-semibold">{email.from}</span> <span className="text-black/50">&lt;{email.address}&gt;</span></div>
          <div className="text-black/40">to me · {email.time}</div>
        </div>
      </div>
      <div className="mt-5 max-w-2xl space-y-4 text-[15px] leading-relaxed" data-email-body="">
        {email.body.map((b, i) => b.p
          ? <p key={i}>{b.p}</p>
          : <p key={i}><a href={b.link!.href} onClick={e => e.preventDefault()} className="inline-block rounded-md bg-[#2f6fb3] px-4 py-2 font-semibold text-white no-underline">{b.link!.text}</a></p>)}
        {email.attachment && <p className="inline-flex items-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-sm">📎 {email.attachment}</p>}
      </div>
      {!ext && !fallback && (
        <div className="mt-10 rounded-xl border border-dashed border-black/20 p-4 text-sm text-black/60">
          The Hashling extension isn’t detected on this page. Install it to see automatic banners, or
          <button className="ml-1 font-semibold text-[#3E8E5A] underline" onClick={checkWithoutExtension}>check this email without the extension</button>.
        </div>
      )}
      <p className="mt-10 text-xs text-black/40">Links in this demo inbox are disabled.</p>
    </article>
  )
}

function FallbackBanner({ a }: { a: Analysis }) {
  const m = RISK_META[a.risk]
  return (
    <div className="mb-5 rounded-xl border-l-4 p-4" style={{ borderColor: m.color, background: m.bg }}>
      <div className="font-bold" style={{ color: m.color }}>{m.icon} Hashling: {m.label} · {a.category_label} · {Math.round(a.confidence * 100)}% confidence</div>
      <ul className="mt-2 list-disc pl-5 text-sm">{a.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}</ul>
      <p className="mt-2 text-sm"><b>Next:</b> {a.next_steps.join(' · ')}</p>
    </div>
  )
}
