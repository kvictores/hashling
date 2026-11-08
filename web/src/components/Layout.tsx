import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useUser } from '../UserContext'
import { Hashling } from '../hashling/Hashling'
import { StreakFlame } from './ui'
import { Celebration } from './Celebration'
import { DemoControls } from './DemoControls'

export const NAV = [
  { to: '/', label: 'Den' },
  { to: '/quiz', label: 'Daily Quiz' },
  { to: '/scam-check', label: 'Scam Check' },
  { to: '/shop', label: 'Shop' },
  { to: '/file-check', label: 'File Check' },
  { to: '/passwords', label: 'Passwords' },
  { to: '/about', label: 'About & Privacy' },
]

function UserSwitcher() {
  const { users, user, setUserId } = useUser()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-ghost cyber-glow !py-1.5 !pl-1.5" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-sky/60">
          {user && <Hashling stage={user.stage} mood={user.mood} equipped={user.equipped} size={40} animated={false} />}
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-bold">{user?.name ?? '…'}</span>
          <span className="block text-[11px] capitalize text-muted">{user?.stage ?? ''}</span>
        </span>
        <span aria-hidden className="text-muted">▾</span>
      </button>
      {open && (
        <ul role="listbox" className="glass pop-in absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl p-1.5">
          <li className="data px-3 pb-1 pt-1.5 text-[10px] uppercase tracking-widest text-muted">Demo users</li>
          {users.map(u => (
            <li key={u.id}>
              <button role="option" aria-selected={u.id === user?.id}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-leaf/10 ${u.id === user?.id ? 'bg-leaf/10' : ''}`}
                onClick={() => { setUserId(u.id); setOpen(false) }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky/50">
                  <Hashling stage={u.stage} mood={u.mood} equipped={u.equipped} size={40} animated={false} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{u.name}</span>
                  <span className="block text-xs capitalize text-muted">{u.stage}</span>
                </span>
                <StreakFlame streak={u.streak} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Layout() {
  const { user, error } = useUser()
  const [menu, setMenu] = useState(false)
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-leaf/10 bg-cream/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-2xl font-bold text-leaf">Hashling</span>
          </NavLink>
          <nav className="ml-2 hidden items-center gap-0.5 xl:flex" aria-label="Main">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}
                className={({ isActive }) => `rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap transition ${isActive ? 'bg-leaf text-white' : 'text-ink hover:bg-leaf/10'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <div className="hidden items-center gap-3 rounded-full bg-white/70 px-3 py-1.5 sm:flex">
                <StreakFlame streak={user.streak} size="sm" />
                <span className="h-4 w-px bg-ink/15" />
                <span className="flex items-center gap-1 text-sm" title="Wallet (spendable points)">
                  <Coin /> <span className="data font-semibold">{user.wallet}</span>
                </span>
              </div>
            )}
            <UserSwitcher />
            <button className="btn btn-ghost !px-3 !py-2 xl:hidden" onClick={() => setMenu(m => !m)} aria-label="Menu" aria-expanded={menu}>☰</button>
          </div>
        </div>
        {menu && (
          <nav className="flex flex-wrap gap-1 border-t border-leaf/10 px-4 py-2 xl:hidden" aria-label="Main mobile">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMenu(false)}
                className={({ isActive }) => `rounded-full px-3 py-1.5 text-sm ${isActive ? 'bg-leaf text-white' : 'bg-white/60'}`}>{n.label}</NavLink>
            ))}
          </nav>
        )}
      </header>
      {error && <div className="bg-risk-red px-4 py-2 text-center text-sm font-semibold text-white">{error}</div>}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-6 pb-10 pt-4 text-center text-sm text-muted">
        Hashling · HackUTD Safe Signal demo · all brands and data are fictional
      </footer>
      <Celebration />
      <DemoControls />
    </div>
  )
}

export function Coin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="9" fill="#F2B33D" stroke="#B7801A" strokeWidth="1.5" />
      <path d="M10 5 C12 7 13 9 10 15 C7 9 8 7 10 5 Z" fill="#3E8E5A" />
    </svg>
  )
}
