# QUANTA — AI Financial Intelligence Platform

QUANTA is a cloud-based AI financial platform: chat with a research agent about
markets, run strategy analysis on your own data, and paper-trade against live
prices. It runs on Groq-hosted models and needs an internet connection — there
is no offline or local-only mode.

## What's in it

- 🤖 **Agent** — tool-calling AI that can look up **live quotes**, pull
  **market history**, and **search the web** (via Tavily) to answer questions
  with real, current data instead of guessing.
- ♟ **Strategy Mode** — Business Model Canvases, SWOT matrices, and competitor
  teardowns grounded in whatever data, ticker, or file you give it.
- 🌐 **Supply Chain / 📈 FX Treasury / 💎 Commodity Arbitrage** — focused
  analysis modes for vendor risk, currency exposure, and price-spread
  opportunities.
- 💹 **Paper-trading simulator** — trade with virtual cash at live prices,
  track P&L, and ask the agent to review your account.
- 📊 **Data upload** — drop in a `.csv`/`.xlsx` file and analyze it with AI.
- 🔐 **Sign in with Google or email** (one-time code, no password) via
  Supabase.
- 🕐 **Conversation history** — signed-in chats are saved and can be reopened
  later.
- 🔗 **Shareable reports** — turn any AI reply into a public link or export it
  as a PDF.

## Project layout

```
quanta/
├── backend/               # FastAPI: chat, agent tool-calling, market data,
│                          # quotes, auth-backed conversations & reports
└── frontend/
    └── src/
        ├── App.jsx                 # app shell, module switching, layout
        ├── Home.jsx                # landing page
        ├── AuthContext.jsx         # Supabase session + sign-in modal
        ├── api.js                  # backend fetch helpers
        └── components/
            ├── Chat.jsx            # chat UI, mode switching, share/export
            ├── ConversationList.jsx
            ├── MarketDashboard.jsx / FXTreasuryChart.jsx / ...
            └── Simulator.jsx       # paper-trading account
```

## Running it locally

### 1. Backend (Python 3.10+)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 main.py                    # listens on 0.0.0.0:8000
```

Set at least `GROQ_API_KEY` (free key at <https://console.groq.com/keys>) —
the app defaults to Groq. Set `TAVILY_API_KEY` to enable the agent's web
search tool. See `backend/.env.example` for the full list.

### 2. Frontend (Node 18+)

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Auth and conversation/report persistence need Supabase project credentials —
see `frontend/.env.example`.

## A note on the analysis

The agent is useful for structuring thinking and surfacing patterns in
real market data — it is not a licensed financial advisor, and quotes/search
results can be delayed or incomplete. Don't trade real money on its output
alone.
