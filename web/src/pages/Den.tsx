import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../UserContext'
import { Hashling } from '../hashling/Hashling'
import { Scene } from '../hashling/Scene'
import { Card, ProgressBar, StreakFlame } from '../components/ui'
import { Coin } from '../components/Layout'
import { BonusCard } from '../components/BonusCard'
import type { User } from '../api'

function speech(u: User): string {
  if (u.mood === 'sad') return 'You skipped one of my warnings… I was worried! Let’s be careful together.'
  if (u.stage === 'egg') return u.quiz_done_today ? 'I’m warm and cozy in here. Almost ready to hatch!' : 'Answer today’s questions to help me hatch!'
  if (!u.quiz_done_today) return 'Three new questions today. Let’s get scam-smart!'
  if (u.stats.blocked_today > 0) return `We dodged ${u.stats.blocked_today} threat${u.stats.blocked_today > 1 ? 's' : ''} today. High paw!`
  return 'All done for today. I’ll keep watch while you browse.'
}

export default function Den() {
  const { user, refresh } = useUser()
  useEffect(() => { refresh() }, [refresh])
  if (!user) return <LoadingDen />
  const mood = user.mood === 'sad' ? 'sad' : user.quiz_done_today || user.stage === 'egg' ? 'happy' : 'happy'

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-6">
        <Scene background={user.equipped.background} className="aspect-[4/3] min-h-[340px] w-full">
          <div className="glass pop-in absolute right-[4%] top-[5%] z-10 w-52 rounded-2xl rounded-bl-sm px-4 py-3 text-[15px] font-medium sm:w-60">
            {speech(user)}
          </div>
          <div className="relative mb-[6%] w-[58%] max-w-[420px]">
            <Hashling stage={user.stage} mood={mood} equipped={user.equipped} size="100%" />
          </div>
        </Scene>
        <div className="flex flex-wrap items-center justify-between gap-4 px-1">
          <div>
            <h1 className="text-4xl font-bold">{user.name}’s Hashling</h1>
            <p className="mt-1 text-lg capitalize text-muted">Stage: <span className="font-semibold text-leaf">{user.stage}</span></p>
          </div>
          {user.quiz_done_today ? (
            <Link to="/quiz" className="btn btn-ghost text-lg">✓ Today’s quiz done · see results</Link>
          ) : (
            <Link to="/quiz" className="btn btn-primary px-7 py-4 text-lg">Today’s 3 questions →</Link>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card vines>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="flex justify-center"><StreakFlame streak={user.streak} size="lg" /></div>
              <div className="mt-1 text-sm text-muted">day streak</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5"><Coin size={26} /><span className="data text-3xl font-semibold">{user.wallet}</span></div>
              <div className="mt-1 text-sm text-muted">wallet</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="font-semibold capitalize">{user.stage}{user.next_stage ? ` → ${user.next_stage}` : ''}</span>
              <span className="text-muted">{user.next_stage ? 'growing…' : 'fully grown ✨'}</span>
            </div>
            <ProgressBar value={user.progress} />
            <StageTrack stage={user.stage} />
          </div>
        </Card>

        {user.bonus_available > 0 && <BonusCard />}

        <Card>
          <h2 className="text-xl font-bold">Protection this week</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-leaf/10">
              <ShieldIcon />
            </div>
            <div>
              <p className="text-2xl font-bold"><span className="data">{user.stats.threats_blocked_week}</span> threat{user.stats.threats_blocked_week === 1 ? '' : 's'} blocked this week</p>
              <p className="text-sm text-muted">
                <span className="data">{user.stats.warnings_week}</span> warnings shown · <span className="data">{user.stats.blocked_today}</span> blocked today
                {user.stats.ignored_week > 0 && <> · <span className="data">{user.stats.ignored_week}</span> ignored</>}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">Every “Back to safety” earns <span className="data font-semibold text-leaf">+5</span> (up to 3 a day) and unlocks a bonus question.</p>
        </Card>

        <Card>
          <h2 className="text-xl font-bold">Got a weird text?</h2>
          <p className="mt-1 text-muted">Paste it into Scam Check and Hashling will explain the risk.</p>
          <Link to="/scam-check" className="btn btn-ghost mt-4">Open Scam Check</Link>
        </Card>
      </div>
    </div>
  )
}

function StageTrack({ stage }: { stage: string }) {
  const stages = [['egg'], ['kitten'], ['cub'], ['adult']] as const
  const idx = stages.findIndex(s => s[0] === stage)
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {stages.map(([s], i) => (
        <div key={s} className={`flex flex-col items-center rounded-xl py-2 ${i === idx ? 'bg-leaf/10 ring-1 ring-leaf/30' : ''} ${i > idx ? 'opacity-40 grayscale' : ''}`}>
          <Hashling stage={s} size={48} animated={false} />
          <span className="text-xs font-semibold capitalize">{s}</span>
        </div>
      ))}
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" aria-hidden>
      <path d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z" fill="#3E8E5A" />
      <path d="M11 16 L15 20 L22 12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="27" cy="7" r="2" fill="#22D3C5" />
    </svg>
  )
}

function LoadingDen() {
  return <div className="flex h-96 items-center justify-center"><Hashling stage="egg" mood="sleepy" size={180} /></div>
}
