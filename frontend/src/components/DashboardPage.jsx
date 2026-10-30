import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { getDashboard, getDemoDashboard } from "../api.js";
import ManifestShell from "./ManifestShell.jsx";
import {
  Panel, Label, DashedDivider, RefTag, StatusStamp,
  fmtSGD, fmtAmount, fmtRate, fmtDate, impactColorClass,
} from "./ManifestKit.jsx";

function Headline({ totalFxImpact }) {
  const favourable = totalFxImpact < 0;
  const amount = fmtSGD(Math.abs(totalFxImpact || 0));
  return (
    <h1 className="max-w-2xl font-sans text-2xl font-semibold leading-snug sm:text-3xl">
      Currency moves have{" "}
      <span className={favourable ? "text-manifest-forest" : "text-manifest-rust"}>
        {favourable ? "saved" : "added"} {amount}
      </span>{" "}
      {favourable ? "on" : "to"} what you owe.
    </h1>
  );
}

function StatTile({ label, value, valueClassName = "" }) {
  return (
    <Panel className="flex flex-col gap-1.5 px-4 py-3">
      <Label>{label}</Label>
      <div className={`font-mono text-xl font-bold tabular-nums ${valueClassName}`}>{value}</div>
    </Panel>
  );
}

function ExposureRow({ row }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2.5 sm:grid-cols-[80px_1fr_140px_140px]">
      <RefTag>{row.currency}</RefTag>
      <div className="font-mono text-xs text-manifest-muted">
        {row.invoice_count} invoice{row.invoice_count === 1 ? "" : "s"} · rate {fmtRate(row.rate_today)}
      </div>
      <div className="text-right font-mono text-sm font-semibold tabular-nums">{fmtSGD(row.sgd_today)}</div>
      <div className={`text-right font-mono text-sm font-semibold tabular-nums ${impactColorClass(row.fx_impact_sgd)}`}>
        {fmtSGD(row.fx_impact_sgd, { signed: true })}
      </div>
    </div>
  );
}

function InvoiceImpactRow({ inv }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2.5 sm:grid-cols-[110px_1fr_160px_120px]">
      <RefTag>{inv.ref}</RefTag>
      <div className="min-w-0">
        <div className="truncate font-sans text-sm">{inv.supplier}</div>
        <div className="font-mono text-[10px] uppercase tracking-wide text-manifest-muted">
          {fmtAmount(inv.amount, inv.currency)} {inv.currency} · due {fmtDate(inv.due_date)}
        </div>
      </div>
      <div className={`text-right font-mono text-sm font-semibold tabular-nums ${impactColorClass(inv.fx_impact_sgd)}`}>
        {fmtSGD(inv.fx_impact_sgd, { signed: true })}
      </div>
      <div className="flex justify-end">
        <StatusStamp status={inv.status} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { session, ready } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      if (session?.access_token && !demoMode) {
        setData(await getDashboard(session.access_token));
      } else {
        setData(await getDemoDashboard());
        setDemoMode(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, ready, demoMode]);

  useEffect(() => { load(); }, [load]);

  const exitDemo = () => { setDemoMode(false); };

  return (
    <ManifestShell active="dashboard" demoMode={demoMode} onExitDemo={exitDemo}>
      {loading && <div className="font-mono text-sm text-manifest-muted">Loading manifest…</div>}

      {error && !loading && (
        <Panel className="px-4 py-3 text-manifest-rust">
          <Label className="text-manifest-rust">Error</Label>
          <div className="mt-1 font-mono text-sm">{error}</div>
        </Panel>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-6">
          <div>
            <Label>As of {fmtDate(data.as_of)}</Label>
            <Headline totalFxImpact={data.total_fx_impact_sgd} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="Total payables (SGD, today's rates)" value={fmtSGD(data.total_owed_sgd)} />
            <StatTile
              label="Net FX impact vs. order rate"
              value={fmtSGD(data.total_fx_impact_sgd, { signed: true })}
              valueClassName={impactColorClass(data.total_fx_impact_sgd)}
            />
            <StatTile label="Due within 14 days" value={fmtSGD(data.due_in_14_days_sgd)} />
          </div>

          <div>
            <Label>Exposure by currency</Label>
            <Panel className="mt-2 divide-y-[1.5px] divide-dashed divide-manifest-dash px-4">
              {data.exposure_by_currency.length === 0 ? (
                <div className="py-4 font-mono text-sm text-manifest-muted">No open payables.</div>
              ) : (
                data.exposure_by_currency.map((row) => <ExposureRow key={row.currency} row={row} />)
              )}
            </Panel>
          </div>

          <div>
            <Label>FX impact per invoice</Label>
            <Panel className="mt-2 divide-y-[1.5px] divide-dashed divide-manifest-dash px-4">
              {data.invoices.length === 0 ? (
                <div className="py-4 font-mono text-sm text-manifest-muted">No payables yet.</div>
              ) : (
                data.invoices.map((inv) => <InvoiceImpactRow key={inv.id} inv={inv} />)
              )}
            </Panel>
          </div>

          <DashedDivider className="mt-2" />
          <div className="font-mono text-[10px] uppercase tracking-wide text-manifest-muted">
            Rates via Yahoo Finance ({Object.keys(data.rates).join(", ")}→SGD) · computed, not AI-estimated.
          </div>
        </div>
      )}
    </ManifestShell>
  );
}
