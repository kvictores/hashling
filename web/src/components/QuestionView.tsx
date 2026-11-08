import { useState } from 'react'
import type { Equipped, Question, Region, Reveal, Stage } from '../api'
import { Hashling } from '../hashling/Hashling'

interface Props {
  q: Question
  onSubmit: (answer: unknown) => Promise<void> | void
  reveal?: Reveal | null
  correct?: boolean | null
  explanation?: string | null
  busy?: boolean
  /** the player's pet, shown as a small portrait beside the explanation */
  pet?: { stage: Stage; equipped?: Equipped }
}

const TYPE_LABEL = { multiple_choice: 'Multiple choice', true_false: 'True or false', spot_the_phish: 'Spot the phish' }

export function QuestionView({ q, onSubmit, reveal, correct, explanation, busy, pet }: Props) {
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
        <span className="data rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#0b7a72]">{TYPE_LABEL[q.type]}</span>
        <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-medium text-leaf">{q.topic}</span>
      </div>
      <h2 className="!font-sans text-xl font-semibold leading-snug tracking-normal sm:text-[22px]">{q.prompt}</h2>

      {q.type === 'multiple_choice' && (
        <div className="grid gap-2.5" role="group" aria-label="Answer choices">
          {q.options!.map((o, i) => {
            const isAns = answered && reveal!.answer === i
            const isWrongPick = answered && picked === i && !isAns
            const isPending = !answered && picked === i
            return (
              <button key={i} disabled={answered || busy} onClick={() => choose(i)}
                className={`cyber-glow group flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left text-base leading-snug transition disabled:cursor-default
                  ${isAns ? 'border-leaf bg-leaf/10' : isWrongPick ? 'border-risk-red bg-risk-red/10' : isPending ? 'border-cyan bg-cyan/10' : answered ? 'border-ink/5 bg-panel opacity-70' : 'border-ink/10 bg-panel hover:-translate-y-px hover:border-cyan/70'}`}>
                <span className={`data flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition
                  ${isAns ? 'bg-leaf text-white' : isWrongPick ? 'bg-risk-red text-white' : isPending ? 'bg-cyan text-ink' : 'bg-leaf/10 text-leaf group-hover:bg-cyan/20'}`}>
                  {isAns ? '✓' : isWrongPick ? '✕' : 'ABCD'[i]}
                </span>
                <span className="flex-1">{o}</span>
                {isAns && <span className="text-xs font-semibold uppercase tracking-wide text-leaf">Correct answer</span>}
                {isWrongPick && <span className="text-xs font-semibold uppercase tracking-wide text-risk-red">Your pick</span>}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'true_false' && (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="True or false">
          {[true, false].map(v => {
            const isAns = answered && reveal!.answer === v
            const isWrongPick = answered && picked === v && !isAns
            const isPending = !answered && picked === v
            return (
              <button key={String(v)} disabled={answered || busy} onClick={() => choose(v)}
                className={`cyber-glow flex items-center justify-center gap-3 rounded-2xl border-2 py-5 text-xl font-bold transition disabled:cursor-default
                  ${isAns ? 'border-leaf bg-leaf/10 text-leaf' : isWrongPick ? 'border-risk-red bg-risk-red/10 text-risk-red' : isPending ? 'border-cyan bg-cyan/10' : answered ? 'border-ink/5 bg-panel opacity-70' : 'border-ink/10 bg-panel hover:-translate-y-px hover:border-cyan/70'}`}>
                <span aria-hidden className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ${isAns ? 'bg-leaf text-white' : isWrongPick ? 'bg-risk-red text-white' : 'bg-leaf/10 text-leaf'}`}>
                  {isAns ? '✓' : isWrongPick ? '✕' : v ? 'T' : 'F'}
                </span>
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
        <div className={`fade-up flex items-start gap-3 rounded-2xl border px-3 py-3 ${correct ? 'border-leaf/30 bg-leaf/10' : 'border-terra/30 bg-terra/10'}`} role="status">
          {pet && (
            <span className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl ${correct ? 'bg-leaf/10' : 'bg-terra/10'}`}>
              <Hashling stage={pet.stage} mood={correct ? 'happy' : 'alert'} equipped={pet.equipped} size={72} animated={false} focus="head" shadow={false}
                title={correct ? 'Hashling is happy' : 'Hashling is paying attention'} />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">{correct ? 'Nice catch!' : 'Not quite, but now you know.'}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{explanation}</p>
          </div>
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
    let style = sel ? 'ring-2 ring-terra bg-terra/15' : 'hover:bg-sun/25 ring-1 ring-transparent hover:ring-sun'
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

  // Message-like insets: the suspicious message sits in a soft tray, clearly "a message you received".
  if (q.message?.channel === 'sms') {
    return (
      <div className="rounded-3xl border border-leaf/10 bg-sky/60 p-4 shadow-inner">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span className="font-semibold uppercase tracking-widest">Text message</span><span>Today</span>
        </div>
        {by('sender').map(r => <div key={r.id} className="mb-2 text-sm font-semibold"><R r={r} /></div>)}
        <div className="max-w-[94%] space-y-1 rounded-2xl rounded-bl-md bg-panel px-3.5 py-3 text-[15px] leading-relaxed shadow-sm">
          {regions.filter(r => r.part !== 'sender').map(r => (
            <div key={r.id}><R r={r} className={r.part === 'link' ? 'text-[#1a62b8] underline' : ''} /></div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-leaf/15 bg-panel shadow-sm">
      <div className="border-b border-ink/10 bg-sky/50 px-4 py-3 text-sm">
        {by('sender').map(r => <div key={r.id}><span className="text-muted">From: </span><R r={r} className="font-semibold" /></div>)}
        {by('subject').map(r => <div key={r.id} className="mt-1"><span className="text-muted">Subject: </span><R r={r} className="font-semibold" /></div>)}
      </div>
      <div className="space-y-2 px-4 py-4 text-[15px] leading-relaxed">
        {by('body').concat(by('link')).map(r => (
          <div key={r.id}><R r={r} className={r.part === 'link' ? 'text-[#1a62b8] underline' : ''} /></div>
        ))}
        {by('attachment').map(r => (
          <div key={r.id} className="pt-2"><span className="mr-1" aria-hidden>📎</span><R r={r} className="rounded-lg border border-ink/15 bg-ink/[0.03] px-2 font-mono text-sm" /></div>
        ))}
      </div>
    </div>
  )
}
