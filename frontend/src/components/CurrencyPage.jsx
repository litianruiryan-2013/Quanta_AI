import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import TopNav from "./TopNav.jsx";
import PulseLine from "./PulseLine.jsx";
import usePriceFlash from "../usePriceFlash.js";
import { Label, ChangePill, fmtPrice } from "./ManifestUI.jsx";
import { fetchQuotes, fetchSparkline } from "../api.js";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "SGD", "CNY", "AUD", "CHF", "HKD", "INR"];

// Major pairs against SGD, for the rates table — same Yahoo `{CCY}SGD=X`
// convention used elsewhere in the app (direct SGD-per-unit, no cross-math).
const SGD_PAIRS = ["USD", "EUR", "GBP", "JPY", "CNY", "AUD"];

function RateRow({ ccy }) {
  const symbol = `${ccy}SGD=X`;
  const [quote, setQuote] = useState(null);
  const [spark, setSpark] = useState([]);
  const flash = usePriceFlash(quote?.price);

  useEffect(() => {
    let active = true;
    fetchQuotes([symbol]).then(({ quotes }) => { if (active) setQuote(quotes?.[symbol] || null); }).catch(() => {});
    fetchSparkline(symbol, "1mo").then((s) => { if (active) setSpark(s); });
    return () => { active = false; };
  }, [symbol]);

  return (
    <div className="card flex items-center gap-3 p-3.5">
      <div className="w-16 shrink-0 font-mono text-xs font-bold uppercase tracking-wide text-ink-500">{ccy}/SGD</div>
      <div className={`w-20 shrink-0 rounded px-1 font-mono text-sm font-bold tabular-nums ${flash}`}>
        {quote ? fmtPrice(quote.price, { digits: 4 }) : "—"}
      </div>
      {quote ? <ChangePill value={quote.change_pct} /> : <span className="font-mono text-[11px] text-ink-700">—</span>}
      {spark.length > 1 && <div className="ml-auto"><PulseLine data={spark} width={100} height={26} glow={false} /></div>}
    </div>
  );
}

export default function CurrencyPage() {
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("SGD");
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (from === to) { setRate(1); return; }
    const symbol = `${from}${to}=X`;
    let active = true;
    setLoading(true);
    setError(null);
    fetchQuotes([symbol])
      .then(({ quotes, errors }) => {
        if (!active) return;
        if (quotes?.[symbol]) setRate(quotes[symbol].price);
        else { setRate(null); setError(errors?.[symbol] || "Rate unavailable for this pair."); }
      })
      .catch((err) => { if (active) { setRate(null); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  const numericAmount = Number(amount) || 0;
  const converted = rate != null ? numericAmount * rate : null;

  const swap = () => { setFrom(to); setTo(from); };

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="fade-rise">
          <Label>QUANTA Business</Label>
          <h1 className="mt-2 font-display text-3xl font-bold">Currency</h1>
          <p className="mt-1 font-sans text-sm text-ink-500">Live FX conversion and exposure, powered by Yahoo Finance.</p>
        </div>

        <div className="fade-rise card-raised mt-8 max-w-xl p-6" style={{ animationDelay: "80ms" }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <Label>Amount</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="focus-glow w-full rounded-xl border border-line/10 bg-ink-900 px-3 py-2.5 font-mono text-lg font-bold tabular-nums text-ink-100 outline-none"
                />
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="focus-glow rounded-xl border border-line/10 bg-ink-900 px-2.5 py-2.5 font-mono text-sm font-bold uppercase text-ink-100 outline-none"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={swap}
              title="Swap"
              className="focus-glow mb-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-line/10 text-ink-500 hover:text-ember-500"
            >
              <ArrowLeftRight size={15} strokeWidth={2} />
            </button>

            <div>
              <Label>Converted</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex h-[46px] w-full items-center rounded-xl border border-line/10 bg-ink-900 px-3 font-mono text-lg font-bold tabular-nums text-ember-500">
                  {loading ? "…" : converted != null ? fmtPrice(converted) : "—"}
                </div>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="focus-glow rounded-xl border border-line/10 bg-ink-900 px-2.5 py-2.5 font-mono text-sm font-bold uppercase text-ink-100 outline-none"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 font-mono text-xs text-ink-500">
            {rate != null && from !== to ? `1 ${from} = ${fmtPrice(rate, { digits: 4 })} ${to}` : " "}
            {error && <span className="text-down"> {error}</span>}
          </div>
        </div>

        <div className="mt-10">
          <Label>Rates vs. SGD</Label>
          <div className="mt-3 flex flex-col gap-2.5">
            {SGD_PAIRS.map((ccy) => <RateRow key={ccy} ccy={ccy} />)}
          </div>
        </div>
      </main>
    </div>
  );
}
