import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type StageUp, type User } from './api'

const KEY = 'hashling_user'

function readActive(): string {
  const q = new URLSearchParams(window.location.search).get('user')
  if (q) { try { localStorage.setItem(KEY, q) } catch { /* ignore */ } return q }
  try { return localStorage.getItem(KEY) || 'maya' } catch { return 'maya' }
}

interface Ctx {
  users: User[]
  user: User | null
  userId: string
  error: string | null
  setUserId: (id: string) => void
  refresh: () => Promise<void>
  setUser: (u: User) => void
  stageUp: StageUp | null
  celebrate: (s: StageUp | null) => void
}

const UserCtx = createContext<Ctx | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserIdState] = useState(readActive)
  const [error, setError] = useState<string | null>(null)
  const [stageUp, setStageUp] = useState<StageUp | null>(null)

  const refresh = useCallback(async () => {
    try {
      setUsers(await api.users())
      setError(null)
    } catch {
      setError('Can’t reach the Hashling backend at localhost:8000. Is uvicorn running?')
    }
  }, [])

  useEffect(() => {
    refresh()
    // Points can change outside this page (the extension logs warnings), so refresh whenever the user comes back.
    const onFocus = () => refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('popstate', onFocus)
    window.addEventListener('pageshow', onFocus)
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(refresh, 15000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('popstate', onFocus)
      window.removeEventListener('pageshow', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(t)
    }
  }, [refresh])

  const setUserId = useCallback((id: string) => {
    try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
    setUserIdState(id)
    // tell the extension (if installed) via a DOM event it can listen to
    window.postMessage({ source: 'hashling-web', type: 'active-user', userId: id }, window.location.origin)
  }, [])

  const setUser = useCallback((u: User) => setUsers(prev => prev.map(x => (x.id === u.id ? u : x))), [])

  const value = useMemo<Ctx>(() => ({
    users, userId, error, setUserId, refresh, setUser,
    user: users.find(u => u.id === userId) ?? null,
    stageUp, celebrate: setStageUp,
  }), [users, userId, error, setUserId, refresh, setUser, stageUp])

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>
}

export function useUser() {
  const c = useContext(UserCtx)
  if (!c) throw new Error('useUser outside provider')
  return c
}
