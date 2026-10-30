import { useState } from "react";

const CURRENCIES = ["USD", "CNY", "JPY", "EUR", "GBP", "AUD", "MYR", "IDR", "VND", "KRW", "THB"];
const STATUSES = ["pending", "paid", "overdue"];

const blank = {
  ref: "", supplier: "", supplier_country: "", category: "",
  currency: "USD", amount: "", order_date: "", order_rate: "",
  due_date: "", status: "pending",
};

/** Create/edit modal for a payable, styled to match the manifest skin. */
export default function PayableFormModal({ initial, onSave, onClose, saving, error }) {
  const [form, setForm] = useState(() => (initial ? { ...blank, ...initial } : blank));
  const isEdit = Boolean(initial?.id);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      amount: Number(form.amount),
      order_rate: Number(form.order_rate),
    });
  };

  const inputClass =
    "w-full border-[1.5px] border-manifest-ink bg-manifest-panel px-2.5 py-1.5 font-mono text-sm text-manifest-ink outline-none focus:border-manifest-rust";
  const labelClass = "mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-manifest-muted";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-manifest-ink/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-[1.5px] border-manifest-ink bg-manifest-bg p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.12em]">
            {isEdit ? "Edit payable" : "New payable"}
          </h2>
          <button type="button" onClick={onClose} className="font-mono text-sm text-manifest-muted hover:text-manifest-ink">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 border-[1.5px] border-manifest-rust px-3 py-2 font-mono text-xs text-manifest-rust">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Invoice ref</label>
            <input required className={inputClass} value={form.ref} onChange={set("ref")} placeholder="PO-24001" />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>Supplier</label>
            <input required className={inputClass} value={form.supplier} onChange={set("supplier")} />
          </div>

          <div>
            <label className={labelClass}>Supplier country</label>
            <input required className={inputClass} value={form.supplier_country} onChange={set("supplier_country")} />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <input required className={inputClass} value={form.category} onChange={set("category")} placeholder="Raw materials" />
          </div>

          <div>
            <label className={labelClass}>Currency</label>
            <select required className={inputClass} value={form.currency} onChange={set("currency")}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Amount (invoice currency)</label>
            <input required type="number" min="0.01" step="0.01" className={inputClass} value={form.amount} onChange={set("amount")} />
          </div>

          <div>
            <label className={labelClass}>Order date</label>
            <input required type="date" className={inputClass} value={form.order_date} onChange={set("order_date")} />
          </div>

          <div>
            <label className={labelClass}>Order rate (SGD per 1 unit)</label>
            <input required type="number" min="0.0001" step="0.0001" className={inputClass} value={form.order_rate} onChange={set("order_rate")} />
          </div>

          <div>
            <label className={labelClass}>Due date</label>
            <input required type="date" className={inputClass} value={form.due_date} onChange={set("due_date")} />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select required className={inputClass} value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-[1.5px] border-manifest-ink px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide hover:bg-manifest-ink hover:text-manifest-panel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="border-[1.5px] border-manifest-ink bg-manifest-ink px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-manifest-panel disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add payable"}
          </button>
        </div>
      </form>
    </div>
  );
}
