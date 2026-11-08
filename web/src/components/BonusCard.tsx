import { useEffect, useState } from 'react'
import { api, type AnswerResult, type Question } from '../api'
import { useUser } from '../UserContext'
import { Card } from './ui'
import { QuestionView } from './QuestionView'

const CAT_LABEL: Record<string, string> = {
  package_delivery: 'package delivery scams', bank_impersonation: 'bank impersonation', toll_fee: 'toll fee scams',
  prize_giveaway: 'prize scams', job_offer: 'fake job offers', tech_support: 'tech support scams',
  account_verification: 'account phishing', gift_card_request: 'gift card scams', romance: 'romance scams',
  crypto_investment: 'investment scams',
}

/** Bonus question offered after Hashling blocked a threat (+10 if correct). */
export function BonusCard() {
  const { user, setUser, celebrate } = useUser()
  const [q, setQ] = useState<Question | null>(null)
  const [res, setRes] = useState<AnswerResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => { setQ(null); setRes(null); setOpen(false) }, [user?.id])

  if (!user) return null
  const start = async () => {
    const r = await api.bonus(user.id, user.bonus_category ?? undefined)
    if (r.available && r.question) { setQ(r.question); setOpen(true) }
  }
  const submit = async (answer: unknown) => {
    if (!q) return
    setBusy(true)
    try {
      const r = await api.answer(user.id, q.id, answer, 'bonus')
      setRes(r)
      if (r.stage_up) celebrate(r.stage_up)
    } finally { setBusy(false) }
  }
  const close = () => { if (res) setUser(res.user); setOpen(false); setQ(null); setRes(null) }

  return (
    <>
      <Card className="!border-2 !border-sun/60">
        <div className="flex items-start gap-4">
          <span className="text-4xl" aria-hidden>🛡️</span>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Bonus question unlocked!</h2>
            <p className="mt-1 text-muted">
              Hashling blocked a threat{user.bonus_category ? <> ({CAT_LABEL[user.bonus_category] ?? user.bonus_category})</> : ''}.
              Answer one question about it for <span className="data font-semibold text-leaf">+10</span>.
            </p>
            <button className="btn btn-primary mt-3" onClick={start}>Answer bonus question</button>
          </div>
        </div>
      </Card>
      {open && q && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="glass pop-in max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl p-6">
            <QuestionView key={q.id} q={q} onSubmit={submit} busy={busy} reveal={res?.reveal} correct={res?.correct} explanation={res?.explanation} />
            {res && (
              <div className="mt-5 flex items-center justify-between">
                <span className="data text-lg font-bold text-leaf">{res.points_awarded > 0 ? `+${res.points_awarded} points` : '+0 (no penalty)'}</span>
                <button className="btn btn-primary" onClick={close}>Done</button>
              </div>
            )}
            {!res && <button className="mt-4 text-sm text-muted underline" onClick={() => setOpen(false)}>Maybe later</button>}
          </div>
        </div>
      )}
    </>
  )
}
