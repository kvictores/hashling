import { useEffect, useMemo } from 'react'
import { useUser } from '../UserContext'
import { Hashling } from '../hashling/Hashling'

const COPY: Record<string, { title: string; body: string }> = {
  kitten: { title: 'Hashling hatched!', body: 'Your egg cracked open. Say hi to a tiny snow-leopard kitten!' },
  cub: { title: 'Hashling grew into a cub!', body: 'Bigger paws, bigger brain. Your scam-spotting is paying off.' },
  adult: { title: 'Hashling is all grown up!', body: 'Fully grown, and the customization shop is now unlocked.' },
}

export function Celebration() {
  const { stageUp, celebrate, user } = useUser()
  const leaves = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.9, dx: (Math.random() - 0.5) * 160,
    color: ['#6FAF6B', '#3E8E5A', '#F2B33D', '#22D3C5', '#D9734E'][i % 5], size: 10 + Math.random() * 12,
  })), [stageUp])

  useEffect(() => {
    if (!stageUp) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') celebrate(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stageUp, celebrate])

  if (!stageUp) return null
  const c = COPY[stageUp.to] ?? COPY.kitten
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {leaves.map((l, i) => (
          <svg key={i} className="leaf-fall absolute top-0" style={{ left: `${l.left}%`, animationDelay: `${l.delay}s`, ['--dx' as string]: `${l.dx}px` }}
            width={l.size} height={l.size} viewBox="0 0 10 10" aria-hidden>
            <path d="M1 9 C1 3 5 1 9 1 C9 5 7 9 1 9 Z" fill={l.color} />
          </svg>
        ))}
      </div>
      <div className="pop-in relative max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex items-end justify-center gap-2">
          <div className="opacity-50"><Hashling stage={stageUp.from} size={90} equipped={user?.equipped} /></div>
          <span className="pb-8 text-2xl text-leaf" aria-hidden>→</span>
          <Hashling stage={stageUp.to} size={170} equipped={user?.equipped} />
        </div>
        <h2 className="mt-2 text-3xl font-bold text-leaf">{c.title}</h2>
        <p className="mt-2 text-muted">{c.body}</p>
        <button className="btn btn-primary mt-6" onClick={() => celebrate(null)} autoFocus>Yay!</button>
      </div>
    </div>
  )
}
