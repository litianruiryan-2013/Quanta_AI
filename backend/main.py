"""
QUANTA — Local Code & Strategy Studio: FastAPI backend (v3).

Changes in v3:
  * Files are now read in the BROWSER (drag-drop / folder picker) and sent here
    as content, so there is no absolute-path coupling and no disk scanning.
      - /api/chat       accepts attached files as {name, content}
      - /api/analyze-csv accepts a multipart file upload (CSV/TSV/Excel)
  * /api/quotes — live batch quotes for a portfolio (yfinance fast_info)
  * /api/market-data and Strategy Mode unchanged from v2

Everything still runs locally and free. The only outbound calls are the
optional market/quote fetches to Yahoo Finance.
"""

import io
import json
import math
import os
from typing import Dict, List, Optional

import httpx
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "llama3")

# AI provider: "ollama" (local, default), "groq" or "gemini" (cloud), or "auto"
# (prefers Groq, then Gemini, then Ollama, based on which key is set).
AI_PROVIDER = os.environ.get("AI_PROVIDER", "auto").lower()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FREE_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"]

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_FREE_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]


def resolve_provider() -> str:
    if AI_PROVIDER in ("groq", "gemini", "ollama"):
        return AI_PROVIDER
    if GROQ_API_KEY:
        return "groq"
    if GEMINI_API_KEY:
        return "gemini"
    return "ollama"

DATA_EXTENSIONS = {".csv", ".tsv", ".xlsx", ".xls"}
MAX_FILE_CHARS = 200_000           # per attached code file
MAX_DATA_FILE_BYTES = 25_000_000   # spreadsheet upload cap
PREVIEW_ROWS = 100
VALID_PERIODS = {"5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"}
VALID_INTERVALS = {"1h", "1d", "1wk", "1mo"}

app = FastAPI(title="QUANTA — Local Code & Strategy Studio", version="3.0.0")

# CORS: localhost for dev, plus any production frontend URLs from the
# ALLOWED_ORIGINS env var (comma-separated). e.g.
#   ALLOWED_ORIGINS=https://quanta.vercel.app,https://www.mydomain.com
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional per-IP rate limiting (so one visitor can't drain your cloud quota).
# Gracefully no-ops if slowapi isn't installed, so local dev never breaks.
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address, default_limits=[])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    def ratelimit(spec):
        return limiter.limit(spec)
except ImportError:  # slowapi not installed → limits become no-ops
    def ratelimit(spec):
        def deco(fn):
            return fn
        return deco

# --------------------------------------------------------------------------
# Prompt orchestrator
# --------------------------------------------------------------------------

CODE_SYSTEM_PROMPT = (
    "You are a precise senior software engineer acting as a local code assistant. "
    "Be direct, cite file names when referencing attached code, and prefer minimal, "
    "correct diffs over rewrites. Use fenced code blocks with language tags."
)

STRATEGY_SYSTEM_PROMPT = """You are an elite strategy consultant and Wall Street equity analyst \
(ex-McKinsey, ex-Goldman) producing board-ready business intelligence. You are running locally \
and privately, so be candid and unhedged in your analysis.

OUTPUT DISCIPLINE — always respond in clean, well-structured Markdown:
- Use `##` section headings, Markdown tables, and bold key figures.
- Quantify whenever the user has supplied data (market data, spreadsheets, portfolio); never \
invent precise numbers that were not given — mark estimates clearly as *(est.)*.
- End every analysis with a short "Key Takeaways" section of 3-5 bullets.

FRAMEWORK TEMPLATES — when the user asks for one of these (or it clearly fits), use the exact structure:

1. BUSINESS MODEL CANVAS — render as a Markdown table with these 9 rows:
   | Block | Details |
   covering: Key Partners, Key Activities, Key Resources, Value Propositions, \
Customer Relationships, Channels, Customer Segments, Cost Structure, Revenue Streams.

2. SWOT MATRIX — render as a 2x2 Markdown table:
   | | Helpful | Harmful |
   | **Internal** | Strengths: … | Weaknesses: … |
   | **External** | Opportunities: … | Threats: … |
   followed by a "Strategic Implications" paragraph.

3. COMPETITOR TEARDOWN — for each competitor: `## <Name>` then a table of \
Positioning, Target Segment, Pricing/Model, Moat, Weak Points, then a final \
"Head-to-Head Comparison" table across all competitors and a "Where to Attack" section.

If the conversation includes a DATASET CONTEXT, MARKET DATA CONTEXT or PORTFOLIO CONTEXT block, \
treat it as the primary evidence base: reference concrete figures, trends, and anomalies from it."""


SUPPLY_CHAIN_SYSTEM_PROMPT = """You are a supply-chain risk analyst and procurement intelligence specialist \
with deep expertise in commodity markets, vendor due-diligence, and operational resilience. \
You are running locally and privately.

OUTPUT DISCIPLINE — always respond in clean, well-structured Markdown:
- Use `##` section headings and **Markdown tables** for all matrices and risk rankings.
- Quantify only from data the user has supplied (CSV rows, ticker prices, context blocks). \
Mark any figure you have inferred or estimated as *(est.)*.
- Never invent supplier names, prices, or volumes that are not in the provided data.
- End every analysis with a **Key Findings** section of 3–5 bullets.

CORE DELIVERABLES — when the evidence supports it, produce these:

1. SUPPLIER RISK MATRIX — a Markdown table with columns:
   | Supplier | Commodity / Input | Spend Share % | Single-Source? | Price Volatility (YoY) | Risk Score |
   Derive figures strictly from the uploaded CSV and market data.

2. COMMODITY EXPOSURE TABLE — map each key input to its traded benchmark ticker, \
current price, period change %, and % of total input cost (where determinable).

3. CONCENTRATION FLAGS — call out any supplier that represents >30 % of a category \
spend or where there is no disclosed alternative source.

If the conversation includes a DATASET CONTEXT or MARKET DATA CONTEXT block, treat it \
as the primary evidence base. Reference specific row values, column names, and price levels."""

FX_TREASURY_SYSTEM_PROMPT = """You are a treasury and FX risk analyst with expertise in cash-flow hedging, \
currency exposure management, and margin analysis for multinational operations. \
You are running locally and privately.

OUTPUT DISCIPLINE — always respond in clean, well-structured Markdown:
- Use `##` section headings and **Markdown tables** for all exposure and margin tables.
- Quantify only from data the user has supplied (cash-flow sheets, FX ticker prices, context blocks). \
Mark any figure you have inferred or estimated as *(est.)*.
- Never invent exchange rates, revenue figures, or hedge ratios that are not in the provided data.
- End every analysis with a **Key Findings** section of 3–5 bullets.

CORE DELIVERABLES — when the evidence supports it, produce these:

1. MARGIN-LEAK TABLE — a Markdown table with columns:
   | Currency Pair | Exposed Cash Flow | Current Rate | Entry / Budget Rate | FX Drag ($ or %) | Hedged? |
   Derive figures strictly from the uploaded data and ticker prices.

2. EXPOSURE SUMMARY — rank currency pairs by absolute exposure size; flag any pair \
where a 1 % adverse move exceeds a material threshold (use % of revenue or operating income if provided).

3. HEDGE RECOMMENDATION — for each exposed pair, suggest instrument type \
(forward, option, natural hedge) and indicative tenor. Mark all cost/premium figures as *(est.)* \
unless the user has provided them.

If the conversation includes a DATASET CONTEXT or MARKET DATA CONTEXT block, treat it \
as the primary evidence base. Reference specific column values, dates, and rate levels."""

COMMODITY_ARBITRAGE_SYSTEM_PROMPT = """You are a commodity trading analyst specializing in cross-regional \
price arbitrage, basis trading, and spread analysis across physical and financial markets. \
You are running locally and privately.

OUTPUT DISCIPLINE — always respond in clean, well-structured Markdown:
- Use `##` section headings and **Markdown tables** for all spread and opportunity tables.
- Quantify only from data the user has supplied (regional price CSVs, benchmark ticker prices, context blocks). \
Mark any figure you have inferred or estimated as *(est.)*.
- Never invent prices, transport costs, or volumes that are not in the provided data.
- End every analysis with a **Key Findings** section of 3–5 bullets.

CORE DELIVERABLES — when the evidence supports it, produce these:

1. SPREAD TABLE — a Markdown table with columns:
   | Region / Venue | Local Price | Benchmark Price | Gross Spread | Est. Transport / Transaction Cost | Net Spread | Signal |
   Signal values: LONG, SHORT, NEUTRAL, or WATCH. Derive all figures from supplied data.

2. OPPORTUNITY RANKING — rank all identified spreads by net spread size (descending); \
highlight any spread that has widened or narrowed by more than 10 % in the supplied period.

3. BASIS RISK NOTE — identify any spread that may reflect quality, grade, or delivery-point \
differences rather than a true arbitrage gap; flag with ⚠.

If the conversation includes a DATASET CONTEXT or MARKET DATA CONTEXT block, treat it \
as the primary evidence base. Reference specific dates, regional identifiers, and price levels."""

_SYSTEM_PROMPTS = {
    "code":                  CODE_SYSTEM_PROMPT,
    "strategy":              STRATEGY_SYSTEM_PROMPT,
    "supply_chain":          SUPPLY_CHAIN_SYSTEM_PROMPT,
    "fx_treasury":           FX_TREASURY_SYSTEM_PROMPT,
    "commodity_arbitrage":   COMMODITY_ARBITRAGE_SYSTEM_PROMPT,
}


class AttachedFile(BaseModel):
    name: str
    content: str


def build_system_messages(
    mode: str, attached_files: List[AttachedFile], data_context: Optional[str]
) -> List[dict]:
    """Assemble the system-message stack for a chat request."""
    system_parts = [_SYSTEM_PROMPTS.get(mode, STRATEGY_SYSTEM_PROMPT)]

    if attached_files:
        file_parts = []
        for f in attached_files:
            content = f.content[:MAX_FILE_CHARS]
            file_parts.append(f"### File: {f.name}\n```\n{content}\n```")
        system_parts.append(
            "The user has attached the following project files as the source of truth:\n\n"
            + "\n\n".join(file_parts)
        )

    if data_context:
        system_parts.append(data_context)

    return [{"role": "system", "content": "\n\n---\n\n".join(system_parts)}]


# --------------------------------------------------------------------------
# Request models
# --------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = DEFAULT_MODEL
    messages: List[ChatMessage]
    attached_files: List[AttachedFile] = []
    mode: str = Field("strategy", pattern="^(code|strategy|supply_chain|fx_treasury|commodity_arbitrage)$")
    data_context: Optional[str] = None
    temperature: Optional[float] = None


class MarketDataRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    period: str = "6mo"
    interval: str = "1d"


class QuotesRequest(BaseModel):
    tickers: List[str] = Field(..., max_length=50)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _clean_number(value):
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return str(value)
    if math.isnan(f) or math.isinf(f):
        return None
    return round(f, 6)


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    provider = resolve_provider()
    if provider == "groq":
        ready = bool(GROQ_API_KEY)
        models = list(dict.fromkeys([GROQ_MODEL, *GROQ_FREE_MODELS]))
        return {"backend": "ok", "provider": "groq", "ready": ready, "ollama": ready, "models": models}
    if provider == "gemini":
        ready = bool(GEMINI_API_KEY)
        models = list(dict.fromkeys([GEMINI_MODEL, *GEMINI_FREE_MODELS]))
        # `ollama` key kept for backwards compatibility with older clients.
        return {"backend": "ok", "provider": "gemini", "ready": ready, "ollama": ready, "models": models}

    ollama_ok, models = False, []
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                ollama_ok = True
                models = [m["name"] for m in resp.json().get("models", [])]
    except httpx.HTTPError:
        pass
    return {"backend": "ok", "provider": "ollama", "ready": ollama_ok, "ollama": ollama_ok, "models": models}


# --------------------------------------------------------------------------
# Market data (yfinance)
# --------------------------------------------------------------------------

@app.post("/api/market-data")
@ratelimit("30/minute")
async def market_data(request: Request, req: MarketDataRequest):
    if req.period not in VALID_PERIODS:
        raise HTTPException(400, f"period must be one of {sorted(VALID_PERIODS)}")
    if req.interval not in VALID_INTERVALS:
        raise HTTPException(400, f"interval must be one of {sorted(VALID_INTERVALS)}")

    ticker_symbol = req.ticker.strip().upper()

    def fetch():
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period=req.period, interval=req.interval, auto_adjust=True)
        try:
            fast = dict(ticker.fast_info)
        except Exception:
            fast = {}
        return hist, fast

    try:
        hist, fast = await run_in_threadpool(fetch)
    except Exception as exc:
        raise HTTPException(502, f"Failed to fetch data for {ticker_symbol}: {exc}") from exc

    if hist is None or hist.empty:
        raise HTTPException(
            404,
            f"No data returned for '{ticker_symbol}'. Check the symbol "
            "(FX pairs use the form EURUSD=X, indices ^GSPC, crypto BTC-USD).",
        )

    hist = hist.reset_index()
    date_col = "Datetime" if "Datetime" in hist.columns else "Date"

    points = []
    for _, row in hist.iterrows():
        points.append({
            "date": row[date_col].strftime("%Y-%m-%d %H:%M" if req.interval == "1h" else "%Y-%m-%d"),
            "open": _clean_number(row.get("Open")),
            "high": _clean_number(row.get("High")),
            "low": _clean_number(row.get("Low")),
            "close": _clean_number(row.get("Close")),
            "volume": _clean_number(row.get("Volume")),
        })

    closes = [p["close"] for p in points if p["close"] is not None]
    first, last = closes[0], closes[-1]
    change_pct = ((last - first) / first * 100) if first else 0.0
    high, low = max(closes), min(closes)
    returns = [(closes[i] - closes[i - 1]) / closes[i - 1]
               for i in range(1, len(closes)) if closes[i - 1]]
    vol = (pd.Series(returns).std() * (252 ** 0.5) * 100) if len(returns) > 2 else 0.0

    stats = {
        "last": _clean_number(last), "first": _clean_number(first),
        "change_pct": _clean_number(change_pct), "high": _clean_number(high),
        "low": _clean_number(low), "annualized_vol_pct": _clean_number(vol),
        "currency": fast.get("currency"), "points": len(points),
    }

    sampled = points if len(points) <= 60 else points[:: max(1, len(points) // 60)]
    series_lines = "\n".join(f"{p['date']}: {p['close']}" for p in sampled)
    ai_summary = (
        f"MARKET DATA CONTEXT — {ticker_symbol} ({req.period}, {req.interval} bars, "
        f"source: Yahoo Finance via yfinance)\n"
        f"Last: {stats['last']} {stats['currency'] or ''} | Period change: {stats['change_pct']:+.2f}% | "
        f"High: {stats['high']} | Low: {stats['low']} | Annualized vol: {stats['annualized_vol_pct']:.1f}%\n"
        f"Close-price series (sampled):\n{series_lines}"
    )

    return {"ticker": ticker_symbol, "period": req.period, "interval": req.interval,
            "stats": stats, "points": points, "ai_summary": ai_summary}


@app.post("/api/quotes")
@ratelimit("60/minute")
async def quotes(request: Request, req: QuotesRequest):
    """Live-ish batch quotes for a portfolio. Uses yfinance fast_info."""
    symbols = [t.strip().upper() for t in req.tickers if t.strip()]
    if not symbols:
        return {"quotes": {}, "errors": {}}

    def fetch_all():
        out, errs = {}, {}
        for sym in symbols:
            try:
                t = yf.Ticker(sym)
                # Use history (the same reliable path as the charts) rather than
                # fast_info, which often returns no price (esp. when markets are closed).
                hist = t.history(period="1mo", interval="1d", auto_adjust=False)
                closes = hist["Close"].dropna() if hist is not None and not hist.empty else None
                if closes is None or closes.empty:
                    errs[sym] = "no data (check the symbol — FX is EURUSD=X, crypto BTC-USD)"
                    continue
                last = float(closes.iloc[-1])
                prev = float(closes.iloc[-2]) if len(closes) >= 2 else last
                change = last - prev
                change_pct = (change / prev * 100) if prev else None
                currency = None
                try:
                    currency = t.fast_info.get("currency")
                except Exception:
                    pass
                out[sym] = {
                    "price": _clean_number(last),
                    "prev_close": _clean_number(prev),
                    "change": _clean_number(change),
                    "change_pct": _clean_number(change_pct),
                    "currency": currency,
                }
            except Exception as exc:
                errs[sym] = str(exc)
        return out, errs

    out, errs = await run_in_threadpool(fetch_all)
    return {"quotes": out, "errors": errs}


# --------------------------------------------------------------------------
# Spreadsheet analysis (pandas) — now via file upload
# --------------------------------------------------------------------------

def _load_dataframe(raw: bytes, filename: str) -> pd.DataFrame:
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    buf = io.BytesIO(raw)
    if ext in {".xlsx", ".xls"}:
        return pd.read_excel(buf)
    sep = "\t" if ext == ".tsv" else ","
    try:
        return pd.read_csv(buf, sep=sep)
    except UnicodeDecodeError:
        buf.seek(0)
        return pd.read_csv(buf, sep=sep, encoding="latin-1")


@app.post("/api/analyze-csv")
@ratelimit("20/minute")
async def analyze_csv(request: Request, file: UploadFile = File(...), name: str = Form(None)):
    filename = name or file.filename or "data.csv"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in DATA_EXTENSIONS:
        raise HTTPException(400, "Only .csv, .tsv, .xlsx and .xls files can be analyzed.")

    raw = await file.read()
    if len(raw) > MAX_DATA_FILE_BYTES:
        raise HTTPException(413, "Spreadsheet exceeds 25 MB.")

    try:
        df = await run_in_threadpool(_load_dataframe, raw, filename)
    except Exception as exc:
        raise HTTPException(422, f"Could not parse spreadsheet: {exc}") from exc

    if df.empty:
        raise HTTPException(422, "The spreadsheet parsed but contains no rows.")

    df.columns = [str(c) for c in df.columns]
    row_count, col_count = df.shape

    preview_df = df.head(PREVIEW_ROWS)
    preview = [
        {col: (None if pd.isna(v) else (_clean_number(v) if isinstance(v, (int, float)) else str(v)))
         for col, v in row.items()}
        for row in preview_df.to_dict(orient="records")
    ]

    columns = []
    for col in df.columns:
        series = df[col]
        info = {"name": col, "dtype": str(series.dtype),
                "nulls": int(series.isna().sum()), "unique": int(series.nunique(dropna=True))}
        if pd.api.types.is_numeric_dtype(series):
            info.update({
                "min": _clean_number(series.min()), "max": _clean_number(series.max()),
                "mean": _clean_number(series.mean()), "median": _clean_number(series.median()),
                "std": _clean_number(series.std()),
            })
        columns.append(info)

    sample_md = df.head(15).to_markdown(index=False)
    numeric_lines = [
        f"- {c['name']}: min {c['min']}, median {c['median']}, mean {c['mean']}, "
        f"max {c['max']}, std {c['std']}, nulls {c['nulls']}"
        for c in columns if "mean" in c
    ]
    categorical_lines = [
        f"- {c['name']} ({c['dtype']}): {c['unique']} unique values, {c['nulls']} nulls"
        for c in columns if "mean" not in c
    ]
    ai_summary = (
        f"DATASET CONTEXT — {filename} ({row_count} rows × {col_count} columns)\n\n"
        + ("Numeric columns:\n" + "\n".join(numeric_lines) + "\n\n" if numeric_lines else "")
        + ("Other columns:\n" + "\n".join(categorical_lines) + "\n\n" if categorical_lines else "")
        + f"First 15 rows:\n{sample_md}"
    )

    return {"path": filename, "rows": row_count, "cols": col_count,
            "columns": columns, "preview": preview, "preview_rows": len(preview),
            "ai_summary": ai_summary}


# --------------------------------------------------------------------------
# Chat (streaming, mode-aware)
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# Chat (streaming, mode-aware, multi-provider)
# --------------------------------------------------------------------------

async def stream_ollama(model: str, messages: list, temperature: float):
    """Stream NDJSON deltas from a local Ollama instance."""
    payload = {"model": model, "messages": messages, "stream": True,
               "options": {"temperature": temperature}}
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as response:
                if response.status_code != 200:
                    body = (await response.aread()).decode("utf-8", "replace")
                    yield json.dumps({"error": f"Ollama error {response.status_code}: {body}"}) + "\n"
                    return
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if "error" in chunk:
                        yield json.dumps({"error": chunk["error"]}) + "\n"
                        return
                    delta = chunk.get("message", {}).get("content", "")
                    if delta:
                        yield json.dumps({"delta": delta}) + "\n"
                    if chunk.get("done"):
                        yield json.dumps({"done": True}) + "\n"
                        return
    except httpx.ConnectError:
        yield json.dumps({
            "error": "Could not reach Ollama at " + OLLAMA_BASE_URL +
                     ". Is it running? Start it with: ollama serve"
        }) + "\n"


async def stream_groq(model: str, messages: list, temperature: float):
    """Stream NDJSON deltas from Groq's OpenAI-compatible chat completions API."""
    url = f"{GROQ_BASE_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    body = {"model": model, "messages": messages, "stream": True, "temperature": temperature}
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, headers=headers, json=body) as response:
                if response.status_code != 200:
                    err = (await response.aread()).decode("utf-8", "replace")
                    hint = " (a 429 means you hit the free-tier rate limit — wait a moment)" if response.status_code == 429 else ""
                    yield json.dumps({"error": f"Groq error {response.status_code}{hint}: {err[:500]}"}) + "\n"
                    return
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data:
                        continue
                    if data == "[DONE]":
                        yield json.dumps({"done": True}) + "\n"
                        return
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    for choice in chunk.get("choices", []):
                        delta = choice.get("delta", {}).get("content")
                        if delta:
                            yield json.dumps({"delta": delta}) + "\n"
                yield json.dumps({"done": True}) + "\n"
    except httpx.ConnectError:
        yield json.dumps({"error": "Could not reach the Groq API. Check the server's internet connection."}) + "\n"


async def stream_gemini(model: str, system_text: str, history: list, temperature: float):
    """Stream NDJSON deltas from the Google Gemini API (SSE)."""
    # Gemini uses roles "user"/"model" and a separate systemInstruction.
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
        for m in history
    ]
    body = {"contents": contents, "generationConfig": {"temperature": temperature}}
    if system_text:
        body["systemInstruction"] = {"parts": [{"text": system_text}]}

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        ":streamGenerateContent?alt=sse"
    )
    headers = {"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, headers=headers, json=body) as response:
                if response.status_code != 200:
                    err = (await response.aread()).decode("utf-8", "replace")
                    hint = " (a 429 means you hit the free-tier rate limit — wait a minute)" if response.status_code == 429 else ""
                    yield json.dumps({"error": f"Gemini error {response.status_code}{hint}: {err[:500]}"}) + "\n"
                    return
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    feedback = chunk.get("promptFeedback", {})
                    if feedback.get("blockReason"):
                        yield json.dumps({"error": f"Gemini blocked the request ({feedback['blockReason']})."}) + "\n"
                        return
                    for cand in chunk.get("candidates", []):
                        parts = cand.get("content", {}).get("parts", [])
                        text = "".join(p.get("text", "") for p in parts)
                        if text:
                            yield json.dumps({"delta": text}) + "\n"
                yield json.dumps({"done": True}) + "\n"
    except httpx.ConnectError:
        yield json.dumps({"error": "Could not reach the Gemini API. Check the server's internet connection."}) + "\n"


@app.post("/api/chat")
@ratelimit("30/minute")
async def chat(request: Request, req: ChatRequest):
    system = build_system_messages(req.mode, req.attached_files, req.data_context)
    history = [m.model_dump() for m in req.messages]
    temperature = req.temperature if req.temperature is not None else (
        0.5 if req.mode == "strategy" else
        0.3 if req.mode in ("supply_chain", "fx_treasury", "commodity_arbitrage") else
        0.2
    )
    provider = resolve_provider()

    if provider == "groq":
        if not GROQ_API_KEY:
            async def missing_groq():
                yield json.dumps({"error": "GROQ_API_KEY is not set on the server."}) + "\n"
            return StreamingResponse(missing_groq(), media_type="application/x-ndjson")
        model = req.model if req.model in (GROQ_FREE_MODELS + [GROQ_MODEL]) else GROQ_MODEL
        return StreamingResponse(
            stream_groq(model, system + history, temperature),
            media_type="application/x-ndjson",
        )

    if provider == "gemini":
        if not GEMINI_API_KEY:
            async def missing_key():
                yield json.dumps({"error": "GEMINI_API_KEY is not set on the server."}) + "\n"
            return StreamingResponse(missing_key(), media_type="application/x-ndjson")
        model = req.model if req.model.startswith("gemini") else GEMINI_MODEL
        return StreamingResponse(
            stream_gemini(model, system[0]["content"], history, temperature),
            media_type="application/x-ndjson",
        )

    return StreamingResponse(
        stream_ollama(req.model, system + history, temperature),
        media_type="application/x-ndjson",
    )


if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 so phones on the same Wi-Fi can reach it (see README).
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
