import type { ReactNode } from 'react'
import type { Analysis, Risk } from '../api'

export function Card({ children, className = '', vines = false }: { children: ReactNode; className?: string; vines?: boolean }) {
  return (
    <section className={`glass relative rounded-3xl p-6 ${className}`}>
      {vines && <VineCorner />}
      {children}
    </section>
  )
}

export function VineCorner() {
  return (
    <svg className="vine-sway pointer-events-none absolute -top-7 right-6 h-12 w-20" viewBox="0 0 96 64" aria-hidden>
      <path d="M4 2 C30 8 50 2 92 6" stroke="#3E8E5A" strokeWidth="2" fill="none" />
      <path d="M30 6 C28 22 34 34 30 50" stroke="#3E8E5A" strokeWidth="1.8" fill="none" />
      <path d="M70 4 C72 16 68 24 70 34" stroke="#3E8E5A" strokeWidth="1.8" fill="none" />
      <g fill="#6FAF6B">
        <ellipse cx="26" cy="22" rx="6" ry="3.5" transform="rotate(-30 26 22)" />
        <ellipse cx="34" cy="36" rx="6" ry="3.5" transform="rotate(30 34 36)" />
        <ellipse cx="29" cy="50" rx="5" ry="3" transform="rotate(-20 29 50)" />
        <ellipse cx="74" cy="18" rx="5" ry="3" transform="rotate(30 74 18)" />
        <ellipse cx="67" cy="32" rx="5" ry="3" transform="rotate(-30 67 32)" />
      </g>
      <circle cx="92" cy="6" r="2.5" fill="#22D3C5" className="hl-glow" />
      <circle cx="4" cy="2" r="2.5" fill="#22D3C5" className="hl-glow" />
    </svg>
  )
}

export function StreakFlame({ streak, size = 'md' }: { streak: number; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 44 : size === 'sm' ? 18 : 26
  const lit = streak > 0
  return (
    <span className="inline-flex items-center gap-1.5" title={`${streak}-day streak`}>
      <svg width={px} height={px} viewBox="0 0 32 32" aria-hidden>
        <path d="M16 2 C18 9 26 12 26 20 A10 10 0 0 1 6 20 C6 14 10 12 11 7 C13 10 14 12 16 12 C16 8 15 5 16 2 Z"
          fill={lit ? '#F2B33D' : '#D8D3C8'} />
        <path d="M16 14 C17 18 21 19 21 23 A5 5 0 0 1 11 23 C11 20 13 19 13 17 C14 18 15 18 16 18 Z" fill={lit ? '#D9734E' : '#BDB6A8'} />
      </svg>
      <span className={`data font-semibold ${size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-lg'}`}>{streak}</span>
    </span>
  )
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full bg-leaf/10 ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-moss to-leaf transition-[width] duration-700"
        style={{ width: `${Math.max(3, value * 100)}%`, boxShadow: '0 0 12px rgba(34,211,197,.45)' }} />
    </div>
  )
}

export const RISK_META: Record<Risk, { label: string; color: string; bg: string; icon: string }> = {
  red: { label: 'High risk', color: '#D9463B', bg: 'rgba(217,70,59,.1)', icon: '⛔' },
  yellow: { label: 'Suspicious', color: '#B7801A', bg: 'rgba(242,179,61,.16)', icon: '⚠️' },
  safe: { label: 'Looks safe', color: '#3E8E5A', bg: 'rgba(62,142,90,.12)', icon: '✅' },
}

export function RiskBadge({ risk }: { risk: Risk }) {
  const m = RISK_META[risk]
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide"
      style={{ color: m.color, background: m.bg, border: `1.5px solid ${m.color}` }}>
      <span aria-hidden>{m.icon}</span>{m.label}
    </span>
  )
}

export function ScoreGauge({ score, risk }: { score: number; risk: Risk }) {
  const r = 46, c = 2 * Math.PI * r
  const color = RISK_META[risk].color
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`Risk score ${score} out of 100`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(62,142,90,.12)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .8s ease' }} />
      <text x="60" y="62" textAnchor="middle" className="data" fontSize="30" fontWeight="700" fill={color}>{score}</text>
      <text x="60" y="82" textAnchor="middle" className="data" fontSize="10" fill="#5F6F64">/ 100</text>
    </svg>
  )
}

export function AnalysisReport({ a }: { a: Analysis }) {
  const m = RISK_META[a.risk]
  return (
    <div className="fade-up space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <ScoreGauge score={a.score} risk={a.risk} />
        <div className="min-w-0 flex-1 space-y-2">
          <RiskBadge risk={a.risk} />
          <h3 className="text-2xl font-bold" style={{ color: m.color }}>{a.category_label}</h3>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm text-muted">
              <span>Confidence</span><span className="data font-semibold text-ink">{Math.round(a.confidence * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${a.confidence * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-display text-lg font-bold">Why Hashling thinks so</h4>
        <ul className="space-y-2">
          {a.reasons.map((r, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-white/70 px-3 py-2 text-[15px]">
              <span className="data mt-0.5 text-xs font-bold" style={{ color: m.color }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-dashed border-ink/20 bg-sky/30 px-4 py-3 text-[15px]">
        <span className="font-semibold">Honest uncertainty: </span>{a.uncertainty}
      </div>

      <div>
        <h4 className="mb-2 font-display text-lg font-bold">What to do next</h4>
        <ol className="space-y-2">
          {a.next_steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="data text-xs text-muted">engine: {a.engine} · score {a.score}/100 · safe &lt; 30 ≤ suspicious &lt; 65 ≤ high risk</p>
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 bg-[repeating-linear-gradient(45deg,#F2B33D,#F2B33D_12px,#F6C766_12px,#F6C766_24px)] px-4 py-1.5 text-center text-sm font-bold text-ink">
      Demo page — fictional brand for testing. Not a real company or a real payment page.
    </div>
  )
}
