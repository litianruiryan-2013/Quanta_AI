-- QUANTA Business — payables table.
-- RLS is enabled with NO policies: this blocks every anon/authenticated
-- client request outright. Only the backend's service-role key (which
-- bypasses RLS) can read/write — the same posture as `conversations`.
-- Run this in the Supabase SQL editor.

CREATE TABLE payables (
    id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           text NOT NULL,
    ref               text NOT NULL,
    supplier          text NOT NULL,
    supplier_country  text NOT NULL,
    category          text NOT NULL,
    currency          text NOT NULL,
    amount            numeric NOT NULL CHECK (amount > 0),
    order_date        date NOT NULL,
    order_rate        numeric NOT NULL CHECK (order_rate > 0),
    due_date          date NOT NULL,
    status            text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'paid', 'overdue')),
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

CREATE INDEX payables_user_id_idx
    ON payables (user_id, due_date);

ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
-- No policies created on purpose — see note above.
