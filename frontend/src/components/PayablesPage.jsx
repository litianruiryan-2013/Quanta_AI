import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { getDashboard, getDemoDashboard, createPayable, updatePayable, deletePayable } from "../api.js";
import ManifestShell from "./ManifestShell.jsx";
import PayableFormModal from "./PayableFormModal.jsx";
import {
  Panel, Label, RefTag, StatusStamp,
  fmtSGD, fmtAmount, fmtRate, fmtDate, impactColorClass,
} from "./ManifestKit.jsx";

function PayableRow({ inv, readOnly, onEdit, onDelete }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b-[1.5px] border-dashed border-manifest-dash py-3 last:border-b-0 sm:grid-cols-[100px_1.4fr_110px_1fr_110px_110px_100px_90px] sm:items-center sm:gap-3">
      <RefTag>{inv.ref}</RefTag>

      <div className="min-w-0">
        <div className="truncate font-sans text-sm font-medium">{inv.supplier}</div>
        <div className="font-mono text-[10px] uppercase tracking-wide text-manifest-muted">
          {inv.supplier_country} · {inv.category}
        </div>
      </div>

      <div className="font-mono text-xs text-manifest-muted">{inv.currency}</div>

      <div className="font-mono text-sm tabular-nums">
        {fmtAmount(inv.amount, inv.currency)}
        <span className="ml-1 text-manifest-muted">{inv.currency}</span>
        <div className="font-mono text-[10px] text-manifest-muted">
          order @ {fmtRate(inv.order_rate)} → today @ {fmtRate(inv.rate_today)}
        </div>
      </div>

      <div className={`font-mono text-sm font-semibold tabular-nums ${impactColorClass(inv.fx_impact_sgd)}`}>
        {fmtSGD(inv.fx_impact_sgd, { signed: true })}
      </div>

      <div className="font-mono text-xs text-manifest-muted">
        Due {fmtDate(inv.due_date)}
        {inv.days_until_due < 0 && inv.status !== "paid" && (
          <span className="ml-1 text-manifest-rust">({Math.abs(inv.days_until_due)}d late)</span>
        )}
      </div>

      <div><StatusStamp status={inv.status} /></div>

      <div className="flex gap-2 sm:justify-end">
        {!readOnly && (
          <>
            <button onClick={() => onEdit(inv)} className="font-mono text-[11px] font-semibold uppercase text-manifest-ink underline">
              Edit
            </button>
            <button onClick={() => onDelete(inv)} className="font-mono text-[11px] font-semibold uppercase text-manifest-rust underline">
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PayablesPage() {
  const { session, ready, openModal } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      if (session?.access_token && !demoMode) {
        const d = await getDashboard(session.access_token);
        setInvoices(d.invoices);
      } else {
        const d = await getDemoDashboard();
        setInvoices(d.invoices);
        setDemoMode(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, ready, demoMode]);

  useEffect(() => { load(); }, [load]);

  const readOnly = demoMode;

  const handleAdd = () => {
    if (!session?.access_token) { openModal(); return; }
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleEdit = (inv) => {
    setEditing(inv);
    setFormError(null);
    setModalOpen(true);
  };

  const handleDelete = async (inv) => {
    if (!session?.access_token) return;
    if (!window.confirm(`Delete ${inv.ref}?`)) return;
    try {
      await deletePayable(inv.id, session.access_token);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async (form) => {
    if (!session?.access_token) return;
    setSaving(true);
    setFormError(null);
    const body = {
      ref: form.ref,
      supplier: form.supplier,
      supplier_country: form.supplier_country,
      category: form.category,
      currency: form.currency,
      amount: form.amount,
      order_date: form.order_date,
      order_rate: form.order_rate,
      due_date: form.due_date,
      status: form.status,
    };
    try {
      if (editing?.id) {
        await updatePayable(editing.id, body, session.access_token);
      } else {
        await createPayable(body, session.access_token);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const exitDemo = () => setDemoMode(false);

  return (
    <ManifestShell active="payables" demoMode={demoMode} onExitDemo={exitDemo}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Payables manifest</Label>
          <h1 className="font-sans text-xl font-semibold">What you owe overseas suppliers</h1>
        </div>
        <button
          onClick={handleAdd}
          title={readOnly ? "Sign in to add your own invoices" : undefined}
          className="border-[1.5px] border-manifest-ink bg-manifest-ink px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-manifest-panel hover:opacity-85 disabled:opacity-40"
        >
          + New payable
        </button>
      </div>

      {loading && <div className="font-mono text-sm text-manifest-muted">Loading manifest…</div>}

      {error && !loading && (
        <Panel className="mb-4 px-4 py-3 text-manifest-rust">
          <Label className="text-manifest-rust">Error</Label>
          <div className="mt-1 font-mono text-sm">{error}</div>
        </Panel>
      )}

      {!loading && (
        <Panel className="px-4">
          {invoices.length === 0 ? (
            <div className="py-6 font-mono text-sm text-manifest-muted">No payables yet — add your first invoice.</div>
          ) : (
            invoices.map((inv) => (
              <PayableRow key={inv.id} inv={inv} readOnly={readOnly} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          )}
        </Panel>
      )}

      {modalOpen && (
        <PayableFormModal
          initial={editing}
          saving={saving}
          error={formError}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </ManifestShell>
  );
}
