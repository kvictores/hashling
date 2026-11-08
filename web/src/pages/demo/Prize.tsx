import { useEffect, useState } from 'react'
import { DemoBanner } from '../../components/ui'

/** Fake "you won a gift card" page for the fictional "MegaMart Rewards".
 * Escalates: YELLOW toast on arrival, RED modal once the card form + countdown appear after "Spin to claim". */
export default function Prize() {
  const [left, setLeft] = useState(9 * 60 + 58)
  const [spun, setSpun] = useState(false)
  const [sent, setSent] = useState(false)
  useEffect(() => { document.title = 'MegaMart Rewards – Congratulations, you won!' }, [])
  useEffect(() => { const t = setInterval(() => setLeft(x => (x > 0 ? x - 1 : 598)), 1000); return () => clearInterval(t) }, [])
  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#6a1b9a] to-[#c2185b] font-sans text-white">
      <DemoBanner />
      <main className="mx-auto max-w-3xl px-5 py-10 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#ffd54f]">MegaMart Rewards · Customer Appreciation Week</p>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">🎉 Congratulations! You’ve been selected!</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg opacity-90">
          You are today’s lucky winner of a <b>$500 MegaMart gift card</b>. Spin the wheel to reveal your reward!
        </p>

        <div className="mx-auto mt-8 flex h-56 w-56 items-center justify-center">
          <svg viewBox="0 0 100 100" className={`h-full w-full ${spun ? 'transition-transform duration-[2500ms]' : ''}`} style={{ transform: spun ? 'rotate(1845deg)' : 'none' }} aria-hidden>
            {['#ffd54f', '#ef5350', '#66bb6a', '#42a5f5', '#ab47bc', '#ffa726'].map((c, i) => (
              <path key={i} d={`M50 50 L${50 + 48 * Math.cos((i * Math.PI) / 3)} ${50 + 48 * Math.sin((i * Math.PI) / 3)} A48 48 0 0 1 ${50 + 48 * Math.cos(((i + 1) * Math.PI) / 3)} ${50 + 48 * Math.sin(((i + 1) * Math.PI) / 3)} Z`} fill={c} />
            ))}
            <circle cx="50" cy="50" r="10" fill="#fff" />
          </svg>
        </div>
        {!spun ? (
          <button onClick={() => setSpun(true)} className="mt-4 rounded-full bg-[#ffd54f] px-8 py-3 text-lg font-extrabold text-[#6a1b9a]">SPIN TO CLAIM</button>
        ) : (
          <form className="mx-auto mt-6 max-w-md rounded-2xl bg-white p-6 text-left text-[#1b1f2a]" onSubmit={e => { e.preventDefault(); setSent(true) }} autoComplete="off">
            <h2 className="text-xl font-bold">You won $500! Confirm your details</h2>
            <p className="text-sm text-black/60">Just cover the $2.95 shipping &amp; processing fee to receive your gift card. Only <b>3 rewards left</b>!</p>
            <p className="mb-4 mt-2 inline-block rounded-lg bg-[#c2185b]/10 px-3 py-1 font-mono text-lg font-bold text-[#c2185b]" data-countdown="">Offer expires in {mmss}</p>
            <label className="mb-3 block text-sm">Full name<input className="mt-1 w-full rounded border px-3 py-2" /></label>
            <label className="mb-3 block text-sm">Email<input type="email" className="mt-1 w-full rounded border px-3 py-2" /></label>
            <label className="mb-3 block text-sm">Card number<input name="card-number" autoComplete="cc-number" className="mt-1 w-full rounded border px-3 py-2 font-mono" /></label>
            <button className="w-full rounded-lg bg-[#6a1b9a] py-3 font-bold text-white">Claim my $500</button>
            {sent && <p className="mt-3 rounded bg-[#fff4d6] p-2 text-sm">Demo only: nothing was sent anywhere.</p>}
          </form>
        )}
        <p className="mt-10 text-xs opacity-60">*Winners selected at random from MegaMart shoppers. Reward subject to verification.</p>
      </main>
    </div>
  )
}
