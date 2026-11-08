export const API = (import.meta.env.VITE_API as string | undefined) ?? 'http://localhost:8000'

export type Stage = 'egg' | 'kitten' | 'cub' | 'adult'
export type Mood = 'happy' | 'alert' | 'sad' | 'sleepy'
export type Slot = 'fur' | 'hat' | 'collar' | 'accessory' | 'background'
export type Equipped = Partial<Record<Slot, string>>
export type Risk = 'red' | 'yellow' | 'safe'

export interface User {
  id: string
  name: string
  lifetime_points: number
  wallet: number
  streak: number
  stage: Stage
  next_stage: Stage | null
  next_threshold: number | null
  stage_threshold: number
  progress: number
  mood: Mood
  today: string
  day_offset: number
  quiz_answered_today: number
  quiz_done_today: boolean
  bonus_available: number
  bonus_category: string | null
  shop_unlocked: boolean
  equipped: Equipped
  stats: { threats_blocked_week: number; warnings_week: number; blocked_today: number; warnings_today: number; ignored_week: number }
}

export interface StageUp { from: Stage; to: Stage }

export interface Analysis {
  risk: Risk
  score: number
  category: string
  category_label: string
  confidence: number
  reasons: string[]
  uncertainty: string
  next_steps: string[]
  engine: string
}

export interface Region { id: string; part: 'sender' | 'subject' | 'body' | 'link' | 'attachment'; text: string }
export interface RegionReveal { id: string; flag: boolean; required: boolean; why: string }

export interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'spot_the_phish'
  scam_category: string
  topic: string
  prompt: string
  options?: string[]
  message?: { channel: 'sms' | 'email' }
  regions?: Region[]
  required_count?: number
  answered?: boolean
  correct?: boolean | null
  reveal?: Reveal
  explanation?: string
}

export interface Reveal { answer?: number | boolean; regions?: RegionReveal[] }

export interface QuizToday {
  day: string
  day_number: number
  questions: Question[]
  completed: boolean
  results: boolean[]
  share: string | null
}

export interface AnswerResult {
  correct: boolean
  reveal: Reveal
  explanation: string
  points_awarded: number
  breakdown: { label: string; points: number }[]
  completed: boolean
  share: string | null
  stage_up: StageUp | null
  user: User
}

export interface ShopItem { id: string; slot: Slot; name: string; price: number; owned: boolean; equipped: boolean }

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!r.ok) {
    let detail = r.statusText
    try { detail = (await r.json()).detail ?? detail } catch { /* ignore */ }
    throw new Error(detail)
  }
  return r.json() as Promise<T>
}

const post = <T,>(path: string, body?: unknown) => req<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })

export const api = {
  users: () => req<User[]>('/users'),
  user: (id: string) => req<User>(`/users/${id}`),
  reset: (id: string) => post<{ user: User }>(`/users/${id}/reset`),
  demoPoints: (id: string, amount = 50) => post<{ user: User; stage_up: StageUp | null }>(`/users/${id}/demo/points`, { amount }),
  nextDay: (id: string) => post<{ user: User }>(`/users/${id}/demo/next-day`),
  quizToday: (id: string) => req<QuizToday>(`/quiz/today?user_id=${encodeURIComponent(id)}`),
  bonus: (id: string, category?: string) =>
    req<{ available: boolean; question?: Question }>(`/quiz/bonus?user_id=${encodeURIComponent(id)}${category ? `&category=${category}` : ''}`),
  answer: (user_id: string, question_id: string, answer: unknown, kind: 'daily' | 'bonus' = 'daily') =>
    post<AnswerResult>('/quiz/answer', { user_id, question_id, answer, kind }),
  analyzeText: (text: string, channel: 'sms' | 'email', sender = '', subject = '') =>
    post<Analysis>('/analyze/text', { text, channel, sender, subject }),
  analyzeEmail: (sender: string, subject: string, body: string, links: string[]) =>
    post<Analysis>('/analyze/email', { sender, subject, body, links }),
  shop: (id: string) => req<{ unlocked: boolean; items: ShopItem[]; equipped: Equipped }>(`/shop?user_id=${encodeURIComponent(id)}`),
  buy: (user_id: string, item_id: string) => post<{ user: User }>('/shop/buy', { user_id, item_id }),
  equip: (user_id: string, item_id: string, equip: boolean) => post<{ user: User }>('/shop/equip', { user_id, item_id, equip }),
  hashCheck: (sha256: string) => post<{ status: 'known_malicious' | 'clean' | 'unknown'; source: string; detail: string; name?: string }>('/hash/check', { sha256 }),
  evalResults: () => req<{ markdown: string | null; summary: EvalSummary | null }>('/eval'),
}

export interface EvalSummary {
  dataset_size: number
  hybrid: Metrics
  baseline: Metrics
  holdout?: { size: number; hybrid: Metrics; baseline: Metrics }
  generated_at: string
}
export interface Metrics { accuracy: number; precision: number; recall: number; f1: number; confusion: { tp: number; fp: number; tn: number; fn: number } }
