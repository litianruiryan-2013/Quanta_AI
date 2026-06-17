# QUANTA — Local Code & Strategy Studio

A 100% free, local-first AI assistant: a code helper that grew into a
**Strategic Business & Market Intelligence Engine**.

- 🧑‍💻 **Code Mode** — drag in a project folder, attach files, debug with Ollama
- ♟ **Strategy Mode** — Business Model Canvases, SWOT matrices, competitor
  teardowns in clean Markdown
- 📈 **Market dashboard** — free historical data (yfinance) as animated, glowing
  charts; compare two stocks side by side
- 💹 **Paper-trading simulator** — a full Trading workspace: start with virtual
  cash, buy & sell stocks at live prices, track positions, realized/unrealized
  P&L and a trade blotter — then have the Strategy AI review your account
- 📊 **One-click data view** — click any `.csv` / `.xlsx` to preview it (pandas),
  then **Analyze with AI**
- 🌗 **Dark / light theme** and 📱 **works on your phone** over Wi-Fi

The LLM runs locally via Ollama and chat never leaves your machine. Your project
files are read **in the browser** — nothing is uploaded. The only outbound
network calls are the optional market/quote fetches to Yahoo Finance.

```
local-code-assistant/
├── backend/
│   ├── main.py            # /api/health /api/chat /api/market-data
│   │                      # /api/quotes (live)  /api/analyze-csv (upload)
│   └── requirements.txt
└── frontend/
    ├── vite.config.js     # host:true + proxy /api → 127.0.0.1:8000
    └── src/
        ├── App.jsx                 # responsive shell (desktop split / mobile tabs)
        ├── api.js                  # fetch helpers + NDJSON stream
        ├── folderReader.js         # drag-drop / picker folder reading (browser)
        ├── useMediaQuery.js        # responsive breakpoint hook
        └── components/
            ├── FileTree.jsx        # drag a folder in — no path typing
            ├── Simulator.jsx       # paper-trading account (cash, orders, P&L)
            ├── MarketDashboard.jsx # 1 or 2 tickers, glowing chart
            ├── DataPreview.jsx     # pandas table + Analyze with AI
            ├── Chat.jsx            # Code/Strategy toggle, evidence chips
            ├── Message.jsx         # markdown rendering
            └── CodeBlock.jsx       # syntax highlighting + Copy code
```

---

## 1. Install Ollama (free local LLM runtime)

macOS / Windows: download from <https://ollama.com/download>
Linux: `curl -fsSL https://ollama.com/install.sh | sh`

Pull a model, then make sure Ollama is running (`ollama serve` if needed):
```bash
ollama pull llama3        # or: ollama pull mistral  /  ollama pull llama3.2:3b
```

## 2. Backend (Python 3.10+)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 main.py                    # listens on 0.0.0.0:8000
```
> Use `python3` (the `python` command often doesn't exist). After activating the
> venv, plain `python` works too.

## 3. Frontend (Node 18+)

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Open **http://localhost:5173**.

## 4. Use it on your phone 📱

Both servers already listen on all interfaces, so any phone on the **same Wi-Fi**
can use QUANTA:

1. Find your computer's local IP:
   - macOS: `ipconfig getifaddr en0`  (e.g. `192.168.1.42`)
   - Windows: `ipconfig` → "IPv4 Address"
   - Linux: `hostname -I`
2. On your phone's browser go to **`http://<that-ip>:5173`** (e.g.
   `http://192.168.1.42:5173`). The page proxies its `/api` calls back to the
   backend on your computer automatically.
3. The layout switches to a phone-friendly **bottom tab bar**: Files · Market ·
   Trade · Chat.

If it won't connect, allow Node/Python through your computer's firewall for
private networks. Folder drag-drop is a desktop feature (phones have no folders),
but Chat, Market and the Trading simulator all work great on mobile.

## 5. Workflows

### Load a project — just drag it in
Drag a folder onto the **Files** panel, or click **Choose folder**. No path
typing. Files are read in your browser; `node_modules`, `.git`, build dirs and
binaries are skipped. Click code files to attach them as chat context (orange);
click a **green** `.csv` / `.xlsx` to preview and analyze it.

### Compare two stocks (📈 Market dashboard)
Toggle the dashboard, type a ticker, optionally a second one in the `vs` field,
and **Load**. Two stocks are rebased to % return so different price levels stay
comparable (ember = first, sky-blue = second). Stocks `AAPL`, indices `^GSPC`,
FX `EURUSD=X` / `USDSGD=X`, crypto `BTC-USD`. **Send to AI** hands the model the
series and stats.

### Paper-trade with virtual money (💹 Trading)
Switch to the **Trading** workspace (header on desktop, bottom tab on mobile).
You start with **$100,000 of virtual cash** (editable via Reset). In the trade
ticket, type a ticker — its live price appears — enter a share count, and hit
**Buy** or **Sell**. Orders fill at the latest live price as simulated market
orders; the app blocks buys you can't afford and sells of shares you don't hold.

The account tracks **total equity (cash + holdings), total return, today's
change, buying power, and realized + unrealized P&L**, with a positions table
(average cost, market value, per-position P&L) and a full trade blotter. Quotes
refresh live every 20s and everything persists in your browser.

Hit **♟ Ask the Strategy AI to review** to send a live snapshot of your account
(positions, cost basis, P&L, recent trades) into the chat in Strategy Mode — it
will assess diversification, risk and your P&L and suggest adjustments. It's told
this is a learning simulation, not real money.

The Trading workspace also shows an **equity curve** (a glowing line chart of your
account value over time, recorded as prices update and on every trade), **buying
power**, **total + annualized return**, and a **🔎 Research** panel: look up any
symbol to see a 6-month price chart with key stats (last, period change, high/low,
annualized volatility), then **Trade this** to load it into the ticket or **Ask AI**
for a research brief. Click any position's symbol to research/trade it instantly.

### Strategy Mode (♟)
The chat toolbar toggles between "senior engineer" and "strategy consultant /
equity analyst". Ask for a Business Model Canvas, SWOT, or competitor teardown;
any attached files, dataset, market data or portfolio become the evidence base.

## Run on a free cloud model (optional)

By default the AI runs locally on Ollama — free and fully offline. If you'd rather
use a free **cloud** model (so the app doesn't depend on your computer, e.g. for
deploying), point it at **Groq** (recommended — it's fast and OpenAI-compatible):

1. Get a free API key (no credit card) at <https://console.groq.com/keys>.
2. Set it in the backend environment (or copy `backend/.env.example` to `.env`):
   ```bash
   export GROQ_API_KEY=your_key_here
   python3 main.py
   ```
3. The toolbar will show "● Groq connected" and the model dropdown lists the free
   Groq models (Llama 3.3 70B Versatile / Llama 3.1 8B Instant).

Switch engines anytime with `AI_PROVIDER` (`auto` | `ollama` | `groq` | `gemini`).
With `auto` (the default), the app prefers Groq, then Gemini, then Ollama, based on
which key is set — so the **same code** runs locally and deployed. Google Gemini is
still supported as an alternative (`GEMINI_API_KEY`).

Heads-up on free tiers: they're rate-limited (Groq is roughly 30 requests/minute,
14,400/day) and providers may use free-tier inputs to improve their products — fine
for this simulator, but don't send anything sensitive. A 429 error in chat just
means you hit the per-minute limit; wait a moment.

### Deploying publicly
The code is deploy-ready: the frontend reads its backend URL from `VITE_API_URL`,
the backend's CORS reads `ALLOWED_ORIGINS`, and per-IP rate limiting (slowapi) is
built in. Steps:

1. **Push to GitHub.**
2. **Backend → Render** (free): New Web Service from your repo, Root Directory
   `backend`, Build `pip install -r requirements.txt`, Start
   `uvicorn main:app --host 0.0.0.0 --port $PORT`. Env vars: `GROQ_API_KEY`,
   `AI_PROVIDER=groq`. Visit `/api/health` to confirm `"ready":true`.
   (Free tier sleeps when idle, so the first request after a pause is slow.)
3. **Frontend → Vercel** (free): New Project from your repo, Root Directory
   `frontend` (Vite auto-detected). Env var:
   `VITE_API_URL=https://your-backend.onrender.com`.
4. **Lock CORS**: back on Render set `ALLOWED_ORIGINS=https://your-frontend.vercel.app`
   and redeploy.

Per-IP limits default to 30 chat req/min, 60 quote req/min. Watch your Groq usage
in its console the first few days. The file-drop feature is a local convenience;
the paper-trading simulator is safe to expose (virtual money).

## Troubleshooting

| Symptom                              | Fix                                                                |
|--------------------------------------|---------------------------------------------------------------------|
| `python` not found                   | Use `python3` (see step 2)                                          |
| "Ollama offline"                     | Run `ollama serve` / open the Ollama app                            |
| Market data / quotes fail            | Needs internet; check symbols (FX `EURUSD=X`, index `^GSPC`)        |
| Phone can't connect                  | Same Wi-Fi? Allow Node/Python through the firewall (private network) |
| "Choose folder" does nothing in Firefox/Safari | They lack the directory picker — use **drag-drop** instead |
| Excel preview shows one sheet        | Multi-sheet files load the first sheet                              |
| Strategy output skips the framework  | Small models drift; retry or use llama3 8B+                         |

## Security notes

- Project files are read in the browser and only sent to the **local** model
  when you attach or analyze them — never to any cloud.
- The servers bind to `0.0.0.0` so phones on your LAN can connect; this also
  means others on the same network can reach it. Keep it to trusted networks and
  don't expose it to the public internet.

## A note on the analysis

Free Yahoo data + a local LLM is excellent for structuring thinking and spotting
patterns in your own numbers — but it is not a licensed financial advisor and
quotes can be delayed. Don't trade real money on its output.
