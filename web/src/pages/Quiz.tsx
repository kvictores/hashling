import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type AnswerResult, type QuizToday } from '../api'
import { useUser } from '../UserContext'
import { Card, Coin, ProtectionShield, StreakFlame } from '../components/ui'
import { QuestionView } from '../components/QuestionView'
import { ClimbTower } from '../components/ClimbTower'

export default function Quiz() {
  const { user, userId, setUser, celebrate } = useUser()
  const [quiz, setQuiz] = useState<QuizToday | null>(null)
  const [idx, setIdx] = useState(0)
  const [res, setRes] = useState<AnswerResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [earned, setEarned] = useState<{ label: string; points: number }[]>([])
  const [pop, setPop] = useState<{ key: number; pts: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const q = await api.quizToday(userId)
      setQuiz(q)
      const first = q.questions.findIndex(x => !x.answered)
      setIdx(first === -1 ? q.questions.length : first)
      setRes(null)
      setEarned([])
      setErr(null)
    } catch (e) { setErr((e as Error).message) }
  }, [userId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const h = () => load()
    window.addEventListener('hashling:refresh', h)
    return () => window.removeEventListener('hashling:refresh', h)
  }, [load])

  if (err) return <Card><p className="text-risk-red">{err}</p></Card>
  if (!quiz || !user) return <Card><p>Loading today’s questions…</p></Card>

  const q = quiz.questions[idx]
  const results: (boolean | null)[] = quiz.questions.map((x, i) => (i < idx || (i === idx && res)) ? (i === idx && res ? res.correct : x.correct ?? null) : null)
  const done = idx >= quiz.questions.length

  const submit = async (answer: unknown) => {
    setBusy(true)
    try {
      const r = await api.answer(userId, q.id, answer)
      setRes(r)
      setEarned(e => [...e, ...r.breakdown])
      if (r.points_awarded > 0) setPop({ key: Date.now(), pts: r.points_awarded })
      setUser(r.user)
      if (r.stage_up) setTimeout(() => celebrate(r.stage_up), 900)
      if (r.completed) setQuiz(qz => qz && { ...qz, share: r.share, completed: true })
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const next = () => {
    if (res) {
      setQuiz(qz => qz && { ...qz, questions: qz.questions.map((x, i) => i === idx ? { ...x, answered: true, correct: res.correct } : x) })
    }
    setRes(null)
    setIdx(i => i + 1)
  }

  return (
    // block layout on phones (so the climb strip can stay sticky while you answer), 2 columns from lg
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-8">
      <div className="sticky top-[68px] z-30 -mx-4 mb-4 px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:mb-0 lg:px-0">
        <Card className="!rounded-[1.8rem] !p-2.5 lg:!p-3">
          <ClimbTower user={user} results={results} pop={pop} done={done} />
        </Card>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="data text-sm uppercase tracking-widest text-muted">Hashling Daily #{quiz.day_number}</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Today’s 3 questions</h1>
          </div>
          <LeafNodes results={results} idx={idx} done={done} />
        </div>

        {!done && q && (
          <Card className="!p-5 sm:!p-6">
            <QuestionView key={q.id} q={q} onSubmit={submit} busy={busy} reveal={res?.reveal} correct={res?.correct} explanation={res?.explanation}
              pet={{ stage: user.stage, equipped: user.equipped }} />
            {res && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {res.breakdown.length === 0 && <span className="data rounded-full bg-ink/5 px-3 py-1 text-sm">+0 · no penalty</span>}
                  {res.breakdown.map((b, i) => (
                    <span key={i} className="data pop-in inline-flex items-center gap-1.5 rounded-full bg-sun/25 px-3 py-1 text-sm font-semibold" style={{ animationDelay: `${i * 0.12}s` }}>
                      <Coin size={18} />+{b.points} {b.label}
                    </span>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={next}>{idx < quiz.questions.length - 1 ? 'Next question →' : 'See results →'}</button>
              </div>
            )}
          </Card>
        )}

        {done && <Results quiz={quiz} earned={earned} streak={user.streak} />}
      </div>
    </div>
  )
}

/** Numbered leaf nodes: number + state in text (never colour alone). */
function LeafNodes({ results, idx, done }: { results: (boolean | null)[]; idx: number; done: boolean }) {
  return (
    <ol className="flex items-start gap-1.5" aria-label="Quiz progress">
      {results.map((r, i) => {
        const state = r === true ? 'correct' : r === false ? 'missed' : i === idx && !done ? 'now' : 'next'
        const tone = state === 'correct' ? 'border-leaf bg-leaf text-white'
          : state === 'missed' ? 'border-risk-red/70 bg-risk-red/10 text-risk-red'
          : state === 'now' ? 'border-cyan bg-cyan/15 text-ink shadow-[0_0_0_3px_rgba(34,211,197,.25)]'
          : 'border-ink/15 bg-panel text-muted'
        return (
          <li key={i} className="flex items-center gap-1.5" aria-current={state === 'now' ? 'step' : undefined}>
            <span className="flex w-14 flex-col items-center gap-1">
              <span className={`data relative flex h-10 w-10 items-center justify-center border-2 text-base font-bold transition ${tone}`}
                style={{ borderRadius: '70% 12% 70% 12%' }}>
                <span aria-hidden>{i + 1}</span>
                {state === 'correct' && <span aria-hidden className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] leading-none text-leaf shadow">✓</span>}
                {state === 'missed' && <span aria-hidden className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] leading-none text-risk-red shadow">✕</span>}
                <span className="sr-only">Question {i + 1}: {state === 'now' ? 'current question' : state === 'next' ? 'not answered yet' : state === 'correct' ? 'answered correctly' : 'missed'}</span>
              </span>
              <span aria-hidden className={`text-[11px] font-semibold uppercase tracking-wide ${state === 'correct' ? 'text-leaf' : state === 'missed' ? 'text-risk-red' : state === 'now' ? 'text-ink' : 'text-muted'}`}>{state}</span>
            </span>
            {i < results.length - 1 && <span aria-hidden className="mb-4 h-0.5 w-3 rounded-full bg-leaf/25" />}
          </li>
        )
      })}
    </ol>
  )
}

function Results({ quiz, earned, streak }: { quiz: QuizToday; earned: { label: string; points: number }[]; streak: number }) {
  const [copied, setCopied] = useState(false)
  const results = quiz.questions.map(q => !!q.correct)
  const share = quiz.share ?? `Hashling Daily #${quiz.day_number} ${results.map(c => (c ? '🟩' : '🟥')).join('')} 🔥${streak}`
  const total = earned.reduce((s, b) => s + b.points, 0)
  const copy = async () => {
    try { await navigator.clipboard.writeText(share); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }
  return (
    <Card className="fade-up text-center">
      {/* quiz completion (not "reached the top"): the shield is decorative, the text says how many were correct */}
      <ProtectionShield size={64} className="mx-auto" />
      <div className="mt-2 text-5xl tracking-[0.3em]" aria-label={`${results.filter(Boolean).length} of 3 correct`}>{results.map(c => (c ? '🟩' : '🟥')).join('')}</div>
      <p className="data mt-2 text-sm text-muted">{results.filter(Boolean).length} of {results.length} correct</p>
      <h2 className="mt-4 text-3xl font-bold">{results.every(Boolean) ? 'Perfect day!' : results.some(Boolean) ? 'Nice work today!' : 'Every miss is a lesson.'}</h2>
      <div className="mt-3 flex items-center justify-center gap-2 text-lg"><StreakFlame streak={streak} /> day streak</div>
      {earned.length > 0 && (
        <div className="mx-auto mt-5 max-w-sm space-y-1 text-left">
          {earned.map((b, i) => (
            <div key={i} className="flex justify-between border-b border-ink/5 py-1 text-[15px]"><span>{b.label}</span><span className="data font-semibold text-leaf">+{b.points}</span></div>
          ))}
          <div className="flex justify-between pt-1 font-bold"><span>Total today</span><span className="data text-leaf">+{total}</span></div>
        </div>
      )}
      <div className="mx-auto mt-6 flex max-w-lg items-center gap-2 rounded-2xl bg-white/80 p-2 pl-4 text-left">
        <code className="flex-1 truncate font-mono text-sm">{share}</code>
        <button className="btn btn-primary !py-2" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <p className="mt-6 text-lg font-semibold">Come back tomorrow for 3 new questions 🌱</p>
      <p className="mt-1 text-muted"><Countdown /></p>
      <Link to="/" className="btn btn-ghost mt-5">Back to the Den</Link>
    </Card>
  )
}

function Countdown() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const mid = new Date(now); mid.setHours(24, 0, 0, 0)
  const s = Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0'), mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0')
  return <>Next questions in <span className="data font-semibold text-ink">{hh}:{mm}:{ss}</span></>
}
