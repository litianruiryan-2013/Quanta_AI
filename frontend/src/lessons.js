// QUANTA Learn — static lesson content. No backend involved; progress is
// tracked client-side (see useLearnProgress.js).

export const CATEGORIES = [
  { id: "fundamentals", label: "Fundamentals" },
  { id: "reading",      label: "Reading the Market" },
  { id: "strategy",     label: "Strategy & Risk" },
];

export const LESSONS = [
  {
    slug: "what-is-a-stock",
    category: "fundamentals",
    icon: "Layers",
    title: "What Is a Stock?",
    summary: "Ownership, not just a ticker symbol.",
    readTime: "3 min",
    body: `
A stock is a small slice of ownership in a company. When you buy one share of
Apple, you own a tiny fraction of Apple itself — its factories, its cash, its
future profits — proportional to how many shares exist in total.

## Why companies sell stock

Companies sell shares to raise money without taking on debt. In exchange,
shareholders get two things: a claim on the company's future profits (paid
out as **dividends**, or simply reflected in a rising share price), and in
most cases a vote on major company decisions.

## Why the price moves

A stock's price is just what the last buyer and seller agreed on. It moves
constantly because investors are continuously re-estimating how much the
company's *future* profits are worth today — based on earnings reports,
industry trends, interest rates, or just shifting sentiment. Nobody sets the
price directly; it emerges from everyone trading at once.

## Shares outstanding vs. market cap

A company's **market cap** (price × total shares outstanding) tells you the
market's current estimate of the whole company's value — not how "expensive"
a share is. A $3 share and a $300 share can belong to equally large companies;
it just depends on how many shares each has issued.
    `.trim(),
  },
  {
    slug: "market-cap",
    category: "fundamentals",
    icon: "PieChart",
    title: "Market Cap & Why Size Matters",
    summary: "What \"big tech\" and \"small cap\" actually mean.",
    readTime: "3 min",
    body: `
Market capitalization — share price multiplied by shares outstanding — is
the market's running estimate of what an entire company is worth. It's the
single number investors use to compare companies of wildly different share
prices on equal footing.

## The rough tiers

- **Mega cap**: >$200B (Apple, Microsoft, Nvidia)
- **Large cap**: $10B–$200B
- **Mid cap**: $2B–$10B
- **Small cap**: $300M–$2B

## Why it matters

Size correlates with behavior. Larger companies tend to be more stable —
diversified revenue, easier access to credit, more analyst coverage — so
their stocks usually move less violently day to day. Smaller companies carry
more risk but also more room to grow quickly, since doubling a $500M company
is a much smaller feat than doubling a $2T one.

Market cap also shapes how much influence a stock has on an index. The
S&P 500 is cap-weighted, so Apple's daily move affects the index far more
than a company a hundredth its size — even though both are "one stock" in
the index.
    `.trim(),
  },
  {
    slug: "pe-ratio",
    category: "fundamentals",
    icon: "Calculator",
    title: "P/E Ratio: Is a Stock \"Expensive\"?",
    summary: "Price alone tells you nothing. This ratio tells you more.",
    readTime: "4 min",
    body: `
The price-to-earnings (P/E) ratio divides a company's share price by its
earnings per share. A P/E of 25 means investors are paying $25 for every $1
of the company's current annual profit.

## What it's really measuring

P/E is a proxy for *expectations*. A high P/E means the market expects
profits to grow substantially — investors are paying up front for growth
that hasn't happened yet. A low P/E can mean a stock is undervalued, or it
can mean the market expects profits to shrink. The ratio alone doesn't tell
you which.

## Context is everything

A P/E only means something next to a reference point:

- **Its own history** — is this company trading rich or cheap versus its
  own past?
- **Its sector** — software companies routinely trade at higher P/Es than
  utilities, because investors expect faster growth from software.
- **Interest rates** — when borrowing is cheap, investors tolerate higher
  P/Es across the board, because future profits are discounted less harshly.

## The trap

A stock with no P/E at all (because the company has no profit yet) isn't
automatically safer — it just means this particular tool doesn't apply.
Growth companies are often valued on revenue or user growth instead, with
their own trade-offs.
    `.trim(),
  },
  {
    slug: "reading-a-price-chart",
    category: "reading",
    icon: "LineChart",
    title: "Reading a Price Chart",
    summary: "Lines, candles, and what they're hiding.",
    readTime: "4 min",
    body: `
Every price chart is a time series of trades compressed into a shape. The
simplest version — a line chart — just connects the closing price of each
period (day, hour, minute). It's clean, but it hides how *volatile* that
period actually was.

## Candlesticks add the missing detail

A candlestick shows four numbers per period: open, high, low, and close. The
"body" spans open-to-close; the thin "wicks" show the full high-low range.
A green candle closed higher than it opened; a red one closed lower — the
same up/down convention you'll see throughout QUANTA.

## What a trend actually is

A trend is just a sustained pattern of higher highs and higher lows (uptrend)
or lower highs and lower lows (downtrend). Short, choppy wiggles inside a
longer trend are normal — zooming out usually matters more than reacting to
any single day.

## A live example

Below is the same kind of sparkline QUANTA uses throughout the app — the line
on the left is rising (green), the one on the right is falling (rose). The
shape is the same information as a line chart, just compressed.
    `.trim(),
  },
  {
    slug: "how-currency-pairs-work",
    category: "reading",
    icon: "Coins",
    title: "How Currency Pairs Work",
    summary: "Why USD/SGD means what it means.",
    readTime: "3 min",
    body: `
Currencies are always quoted in pairs, because a currency's value only makes
sense relative to something else. **USD/SGD = 1.28** means 1 US dollar buys
1.28 Singapore dollars. The first currency listed is the "base"; the second
is the "quote."

## Why rates move

An exchange rate moves with relative supply and demand for the two
currencies — driven by trade flows, interest rate differences (money tends
to flow toward higher-yielding currencies), and investors' risk appetite
(in uncertain times, money often flows toward currencies seen as "safe,"
like the US dollar or Swiss franc).

## Direct vs. cross rates

Most currencies are quoted directly against the US dollar. A "cross rate"
like EUR/JPY is derived from two dollar rates (EUR/USD and USD/JPY)
multiplied together — Yahoo Finance and QUANTA's Currency page compute these
the same way under the hood.

Try it yourself on the [Currency converter](/business/currency) — pick any
two currencies and watch the live rate.
    `.trim(),
  },
  {
    slug: "52-week-range",
    category: "reading",
    icon: "BarChart3",
    title: "52-Week Range & Volatility",
    summary: "What that low–high number is really telling you.",
    readTime: "3 min",
    body: `
A stock's 52-week range is simply its lowest and highest closing price over
the trailing year. It's a quick, if crude, gauge of how much a stock has
moved — and where the current price sits inside that range.

## Near the high vs. near the low

A stock trading near its 52-week high suggests sustained demand or a strong
recent run; one near its low suggests the opposite, or a specific setback.
Neither position predicts what happens next — plenty of stocks near their
highs keep climbing, and plenty near their lows keep falling.

## Range width as a volatility signal

A narrow 52-week range (say, low to high within 15%) suggests a stable,
low-volatility stock. A wide range — the low at half the high — suggests a
name that swings hard on news, earnings, or sentiment shifts. That's not
inherently good or bad; it's a trade-off between stability and the size of
potential moves in either direction.
    `.trim(),
  },
  {
    slug: "diversification",
    category: "strategy",
    icon: "Shield",
    title: "Diversification: Don't Put All Your Eggs in One Basket",
    summary: "The one free lunch in investing.",
    readTime: "4 min",
    body: `
Diversification means holding assets that don't all move for the same
reasons, so a shock to one doesn't sink your whole portfolio. It's often
called the only "free lunch" in investing — you can reduce risk without
necessarily reducing expected return.

## Why it works

If you own one stock, a company-specific disaster (a failed product, an
accounting scandal) can wipe out a huge chunk of your wealth. If you own
twenty unrelated stocks, that same disaster barely dents your total — the
other nineteen aren't exposed to it. The risk that diversification removes
is the risk specific to *one* company; it can't remove risk that affects
the whole market at once.

## Diversifying across more than stocks

The same logic extends across asset classes — equities, bonds, commodities,
cash, different currencies — and across geographies. Assets that respond
differently to the same event (say, rising interest rates) smooth out your
portfolio's overall ride, even if each individual piece is still volatile
on its own.

## The trade-off

Diversification caps your downside, but it also caps the chance of
extreme upside from a single lucky pick. That's the deal: smoother, more
predictable outcomes in exchange for giving up the lottery-ticket tail.
    `.trim(),
  },
  {
    slug: "dollar-cost-averaging",
    category: "strategy",
    icon: "Repeat",
    title: "Dollar-Cost Averaging vs. Timing the Market",
    summary: "A simple habit that beats most people's best guesses.",
    readTime: "4 min",
    body: `
Dollar-cost averaging (DCA) means investing a fixed amount on a fixed
schedule — say, $500 every month — regardless of what the price is doing
that day. "Timing the market" means trying to buy only at the lows and sell
only at the highs.

## Why timing is harder than it looks

Markets don't announce their tops and bottoms in advance. Studies of
professional fund managers consistently find most underperform a simple
buy-and-hold index over long periods, after fees — and that's with full-time
research staff. Missing just a handful of the market's best days (which tend
to cluster right around its worst days) can meaningfully drag down long-term
returns.

## What DCA actually buys you

DCA doesn't guarantee a better price than lump-sum investing — on average,
investing a lump sum immediately tends to outperform, simply because markets
rise more often than they fall over long periods. What DCA buys you is
**discipline and lower regret**: you're never the person who put everything
in the day before a crash, and you remove the temptation to guess.

## When it fits

DCA suits money arriving over time anyway — a paycheck, a bonus schedule —
more than it suits a lump sum sitting in cash. For a lump sum, the honest
trade-off is smoother entry (DCA) versus statistically higher expected
return (investing it now).
    `.trim(),
  },
];

export const getLesson = (slug) => LESSONS.find((l) => l.slug === slug);
export const getLessonsByCategory = (categoryId) => LESSONS.filter((l) => l.category === categoryId);
