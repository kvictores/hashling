import { useState } from 'react'
import type { Question, Region, Reveal } from '../api'

interface Props {
  q: Question
  onSubmit: (answer: unknown) => Promise<void> | void
  reveal?: Reveal | null
  correct?: boolean | null
  explanation?: string | null
  busy?: boolean
}

const TYPE_LABEL = { multiple_choice: 'Multiple choice', true_false: 'True or false', spot_the_phish: 'Spot the phish' }

export function QuestionView({ q, onSubmit, reveal, correct, explanation, busy }: Props) {
  const [picked, setPicked] = useState<unknown>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const answered = reveal != null

  const choose = (v: unknown) => {
    if (answered || busy) return
    setPicked(v)
    onSubmit(v)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="data rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#0f8f86]">{TYPE_LABEL[q.type]}</span>
        <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-medium text-leaf">{q.topic}</span>
      </div>
      <h2 className="text-2xl font-bold leading-snug sm:text-[28px]">{q.prompt}</h2>

      {q.type === 'multiple_choice' && (
        <div className="grid gap-3">
          {q.options!.map((o, i) => {
            const isAns = answered && reveal!.answer === i
            const isWrongPick = answered && picked === i && !isAns
            return (
              <button key={i} disabled={answered || busy} onClick={() => choose(i)}
                className={`cyber-glow flex items-center gap-3 rounded-2xl border-2 bg-white/80 px-4 py-3.5 text-left text-[17px] transition
                  ${isAns ? 'border-leaf bg-leaf/10' : isWrongPick ? 'border-risk-red bg-risk-red/10' : 'border-transparent hover:border-cyan/60'}`}>
                <span className={`data flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isAns ? 'bg-leaf text-white' : isWrongPick ? 'bg-risk-red text-white' : 'bg-ink/5'}`}>
                  {isAns ? '✓' : isWrongPick ? '✕' : 'ABCD'[i]}
                </span>
                {o}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'true_false' && (
        <div className="grid grid-cols-2 gap-4">
          {[true, false].map(v => {
            const isAns = answered && reveal!.answer === v
            const isWrongPick = answered && picked === v && !isAns
            return (
              <button key={String(v)} disabled={answered || busy} onClick={() => choose(v)}
                className={`cyber-glow rounded-2xl border-2 bg-white/80 py-6 text-2xl font-bold transition
                  ${isAns ? 'border-leaf bg-leaf/10 text-leaf' : isWrongPick ? 'border-risk-red bg-risk-red/10 text-risk-red' : 'border-transparent hover:border-cyan/60'}`}>
                {v ? 'True' : 'False'}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'spot_the_phish' && (
        <SpotThePhish q={q} selected={selected} setSelected={setSelected} reveal={reveal ?? null} />
      )}
      {q.type === 'spot_the_phish' && !answered && (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" disabled={busy || selected.size === 0} onClick={() => onSubmit([...selected])}>
            I found the red flags
          </button>
          <span className="text-sm text-muted">Tap every suspicious part. Avoid tapping safe parts. <span className="data">{selected.size}</span> selected</span>
        </div>
      )}

      {answered && (
        <div className={`fade-up rounded-2xl border-l-4 px-4 py-3 ${correct ? 'border-leaf bg-leaf/10' : 'border-terra bg-terra/10'}`}>
          <p className="font-display text-lg font-bold">{correct ? 'Nice catch!' : 'Not quite, but now you know.'}</p>
          <p className="mt-1 text-[15px]">{explanation}</p>
        </div>
      )}
    </div>
  )
}

function SpotThePhish({ q, selected, setSelected, reveal }: {
  q: Question; selected: Set<string>; setSelected: (s: Set<string>) => void; reveal: Reveal | null
}) {
  const regions = q.regions!
  const info = Object.fromEntries((reveal?.regions ?? []).map(r => [r.id, r]))
  const toggle = (id: string) => {
    if (reveal) return
    const s = new Set(selected)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSelected(s)
  }
  const by = (part: Region['part']) => regions.filter(r => r.part === part)
  const R = ({ r, className = '' }: { r: Region; className?: string }) => {
    const sel = selected.has(r.id)
    const meta = info[r.id]
    let style = sel ? 'ring-2 ring-terra bg-terra/15' : 'hover:bg-sun/20 ring-1 ring-transparent hover:ring-sun'
    if (meta) style = meta.flag ? (sel ? 'ring-2 ring-leaf bg-leaf/15' : 'ring-2 ring-risk-red/60 bg-risk-red/10') : (sel ? 'ring-2 ring-risk-red bg-risk-red/10' : 'opacity-80')
    return (
      <span className="group relative inline">
        <button type="button" onClick={() => toggle(r.id)} disabled={!!reveal} aria-pressed={sel}
          className={`rounded-md px-1 py-0.5 text-left transition ${style} ${className}`}>
          {r.text}
        </button>
        {meta && (
          <span className={`mt-1 block text-xs ${meta.flag ? 'text-risk-red' : 'text-muted'}`}>
            {meta.flag ? (sel ? '✓ Red flag found: ' : '⚑ Missed red flag: ') : (sel ? '✕ This part was safe: ' : '')}{(meta.flag || sel) && meta.why}
          </span>
        )}
      </span>
    )
  }

  if (q.message?.channel === 'sms') {
    return (
      <div className="mx-auto max-w-md rounded-[2rem] border-[6px] border-ink/80 bg-[#F4F6F5] p-4 shadow-xl">
        <div className="mb-3 text-center text-xs text-muted">Text Message · Today</div>
        {by('sender').map(r => <div key={r.id} className="mb-3 text-center text-sm font-semibold"><R r={r} /></div>)}
        <div className="max-w-[92%] space-y-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 text-[15px] leading-relaxed shadow-sm">
          {regions.filter(r => r.part !== 'sender').map(r => (
            <div key={r.id}><R r={r} className={r.part === 'link' ? 'text-[#1a6fd1] underline' : ''} /></div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-lg">
      <div className="border-b border-ink/10 bg-ink/[0.03] px-4 py-3 text-sm">
        {by('sender').map(r => <div key={r.id}><span className="text-muted">From: </span><R r={r} className="font-semibold" /></div>)}
        {by('subject').map(r => <div key={r.id} className="mt-1"><span className="text-muted">Subject: </span><R r={r} className="font-semibold" /></div>)}
      </div>
      <div className="space-y-2 px-4 py-4 text-[15px] leading-relaxed">
        {by('body').concat(by('link')).map(r => (
          <div key={r.id}><R r={r} className={r.part === 'link' ? 'text-[#1a6fd1] underline' : ''} /></div>
        ))}
        {by('attachment').map(r => (
          <div key={r.id} className="pt-2"><span className="mr-1" aria-hidden>📎</span><R r={r} className="rounded-lg border border-ink/15 bg-ink/[0.03] px-2 font-mono text-sm" /></div>
        ))}
      </div>
    </div>
  )
}
