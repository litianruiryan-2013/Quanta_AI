-- QUANTA AI — watchlist table.
-- RLS is enabled with NO policies: this blocks every anon/authenticated
-- client request outright. Only the backend's service-role key (which
-- bypasses RLS) can read/write — same posture as `conversations`.
-- Run this in the Supabase SQL editor.

CREATE TABLE watchlist (
    id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    text NOT NULL,
    ticker     text NOT NULL,
    label      text,
    created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX watchlist_user_ticker_idx
    ON watchlist (user_id, ticker);

CREATE INDEX watchlist_user_id_idx
    ON watchlist (user_id, created_at);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
-- No policies created on purpose — see note above.
