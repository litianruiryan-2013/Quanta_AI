-- QUANTA Business — portfolio holdings table.
-- RLS is enabled with NO policies: this blocks every anon/authenticated
-- client request outright. Only the backend's service-role key (which
-- bypasses RLS) can read/write — same posture as `conversations`/`watchlist`.
-- Run this in the Supabase SQL editor.

CREATE TABLE portfolio_holdings (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     text NOT NULL,
    ticker      text NOT NULL,
    quantity    numeric NOT NULL CHECK (quantity > 0),
    cost_basis  numeric NOT NULL CHECK (cost_basis > 0),  -- price per unit paid
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX portfolio_holdings_user_id_idx
    ON portfolio_holdings (user_id, created_at);

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
-- No policies created on purpose — see note above.
