import { useEffect, useState } from 'react'
import { DemoBanner } from '../../components/ui'

function useCountdown(start: number) {
  const [s, setS] = useState(start)
  useEffect(() => { const t = setInterval(() => setS(x => (x > 0 ? x - 1 : start)), 1000); return () => clearInterval(t) }, [start])
  const hh = String(Math.floor(s / 3600)).padStart(2, '0'), mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/** Fake package-fee phishing page for the fictional brand "SwiftShip Parcel". Should trigger a RED warning. */
export default function Parcel() {
  const left = useCountdown(23 * 3600 + 59 * 60 + 41)
  const [sent, setSent] = useState(false)
  useEffect(() => { document.title = 'SwiftShip Parcel – Redelivery fee required' }, [])

  return (
    <div className="min-h-screen bg-[#f3f4f7] font-sans text-[#1b1f2a]">
      <DemoBanner />
      <header className="bg-[#0b5563] text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden><rect x="4" y="9" width="24" height="17" rx="2" fill="#f25f5c" /><path d="M4 13 L16 18 L28 13" stroke="#0b5563" strokeWidth="2" fill="none" /></svg>
          <span className="text-2xl font-extrabold tracking-tight">SwiftShip <span className="font-light">Parcel</span></span>
          <nav className="ml-auto hidden gap-6 text-sm opacity-80 sm:flex"><span>Track</span><span>Ship</span><span>Locations</span><span>Support</span></nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-6 px-5 py-8 md:grid-cols-[1fr_380px]">
        <section className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#c0392b]">Delivery attempt failed</p>
          <h1 className="mt-1 text-3xl font-bold">Your package is on hold</h1>
          <p className="mt-3 text-[15px] text-black/70">
            We attempted to deliver your SwiftShip Parcel shipment but a <b>$1.99 redelivery fee</b> is unpaid.
            Verify your account and pay the fee within 24 hours or your package will be returned to sender.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-[#eef7f8] p-4 text-sm">
            <div><div className="text-black/50">Tracking number</div><div className="font-mono font-semibold">SS-48213-US</div></div>
            <div><div className="text-black/50">Status</div><div className="font-semibold text-[#c0392b]">On hold: fee unpaid</div></div>
            <div><div className="text-black/50">Amount due</div><div className="font-semibold">$1.99</div></div>
            <div><div className="text-black/50">Time left</div><div className="font-mono text-lg font-bold text-[#c0392b]" data-countdown="">{left}</div></div>
          </div>
          <ol className="mt-6 flex gap-2 text-xs">
            {['Shipped', 'In transit', 'Out for delivery', 'On hold'].map((s, i) => (
              <li key={s} className={`flex-1 rounded-full px-2 py-1 text-center ${i === 3 ? 'bg-[#c0392b] text-white' : 'bg-[#0b5563]/10'}`}>{s}</li>
            ))}
          </ol>
        </section>

        <form className="rounded-xl bg-white p-6 shadow" onSubmit={e => { e.preventDefault(); setSent(true) }} autoComplete="off">
          <h2 className="text-xl font-bold">Pay redelivery fee</h2>
          <p className="mb-4 text-sm text-black/60">Secure payment · Expires in <span className="font-mono">{left}</span></p>
          <label className="mb-3 block text-sm">Full name<input name="name" className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="mb-3 block text-sm">Delivery address<input name="address" className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="mb-3 block text-sm">Card number<input name="cardnumber" autoComplete="cc-number" inputMode="numeric" placeholder="1234 5678 9012 3456" className="mt-1 w-full rounded border px-3 py-2 font-mono" /></label>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="block text-sm">Expiry<input name="exp" autoComplete="cc-exp" placeholder="MM/YY" className="mt-1 w-full rounded border px-3 py-2 font-mono" /></label>
            <label className="block text-sm">CVV<input name="cvv" autoComplete="cc-csc" placeholder="123" className="mt-1 w-full rounded border px-3 py-2 font-mono" /></label>
          </div>
          <button className="w-full rounded-lg bg-[#f25f5c] py-3 font-bold text-white">Pay $1.99 and reschedule</button>
          {sent && <p className="mt-3 rounded bg-[#fff4d6] p-2 text-sm">Demo only: nothing was sent anywhere. In real life, this is where your card would be stolen.</p>}
        </form>
      </main>
    </div>
  )
}
