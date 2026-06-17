/**
 * Full-width overlay panel that previews a CSV/TSV/Excel file (parsed by
 * pandas on the backend) and offers one-click "Analyze with AI".
 */
export default function DataPreview({ data, loading, error, onClose, onAnalyze }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-ink-950/97 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-ink-700 bg-ink-900 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
          Data preview
        </span>
        {data && (
          <>
            <span className="truncate font-mono text-xs text-ink-100">{data.path}</span>
            <span className="rounded-full border border-ink-700 px-2 py-0.5 font-mono text-[10px] text-ink-300">
              {data.rows.toLocaleString()} rows × {data.cols} cols
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {data && (
            <button
              onClick={() => onAnalyze(data)}
              className="rounded-lg bg-ember-600 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-ember-500"
            >
              ✦ Analyze with AI
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-500">
          Parsing spreadsheet with pandas…
        </div>
      )}

      {error && (
        <div className="m-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {data && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
          {/* Column profile */}
          <div className="shrink-0 overflow-x-auto rounded-lg border border-ink-700">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-ink-800 text-ink-300">
                <tr>
                  {["Column", "Type", "Nulls", "Unique", "Min", "Median", "Mean", "Max"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-1.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.columns.map((c) => (
                  <tr key={c.name} className="border-t border-ink-800 text-ink-100">
                    <td className="max-w-[180px] truncate px-3 py-1 text-ember-500">{c.name}</td>
                    <td className="px-3 py-1 text-ink-300">{c.dtype}</td>
                    <td className="px-3 py-1">{c.nulls}</td>
                    <td className="px-3 py-1">{c.unique}</td>
                    <td className="px-3 py-1">{c.min ?? "—"}</td>
                    <td className="px-3 py-1">{c.median ?? "—"}</td>
                    <td className="px-3 py-1">{c.mean ?? "—"}</td>
                    <td className="px-3 py-1">{c.max ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Row preview */}
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-ink-700">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="sticky top-0 bg-ink-800 text-ink-300">
                <tr>
                  <th className="px-3 py-1.5 font-semibold text-ink-500">#</th>
                  {data.columns.map((c) => (
                    <th key={c.name} className="whitespace-nowrap px-3 py-1.5 font-semibold">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.preview.map((row, i) => (
                  <tr key={i} className="border-t border-ink-800 text-ink-100 odd:bg-ink-900/40">
                    <td className="px-3 py-1 text-ink-500">{i + 1}</td>
                    {data.columns.map((c) => (
                      <td key={c.name} className="max-w-[240px] truncate whitespace-nowrap px-3 py-1">
                        {row[c.name] ?? <span className="text-ink-700">∅</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="shrink-0 font-mono text-[10px] text-ink-500">
            Showing first {data.preview_rows} of {data.rows.toLocaleString()} rows.
            "Analyze with AI" sends the statistical profile + a 15-row sample to the model — not the whole file.
          </p>
        </div>
      )}
    </div>
  );
}
