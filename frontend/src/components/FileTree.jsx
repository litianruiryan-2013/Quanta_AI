import { useRef, useState } from "react";
import {
  pickDirectory,
  readDroppedItems,
  readInputFiles,
  supportsDirectoryPicker,
} from "../folderReader.js";

const FILE_ICONS = {
  js: "🟨", jsx: "🟨", ts: "🟦", tsx: "🟦", py: "🐍", json: "🧾",
  md: "📝", css: "🎨", html: "🌐", yml: "⚙️", yaml: "⚙️", toml: "⚙️",
  sh: "💲", sql: "🗄️", go: "🐹", rs: "🦀", java: "☕", rb: "💎",
  csv: "📊", tsv: "📊", xlsx: "📊", xls: "📊",
};
const fileIcon = (name) => FILE_ICONS[name.split(".").pop()?.toLowerCase()] || "📄";
const formatSize = (b) =>
  b == null ? "" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

function TreeNode({ node, depth, attached, onToggleFile, onOpenData }) {
  const [open, setOpen] = useState(depth < 1);
  const pad = { paddingLeft: `${depth * 14 + 8}px` };

  if (node.type === "dir") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={pad}
          className="flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-[13px] text-ink-300 hover:bg-ink-800 hover:text-ink-100 focus:outline-none focus:ring-1 focus:ring-ember-500"
        >
          <span className={`inline-block w-3 text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          <span>📁</span>
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1}
              attached={attached} onToggleFile={onToggleFile} onOpenData={onOpenData} />
          ))}
      </div>
    );
  }

  if (node.kind === "data") {
    return (
      <button
        onClick={() => onOpenData(node)}
        style={pad}
        title="Click to preview this spreadsheet"
        className="flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-[13px] text-mint-400 hover:bg-ink-800 focus:outline-none focus:ring-1 focus:ring-ember-500"
      >
        <span className="inline-block w-3" />
        <span>{fileIcon(node.name)}</span>
        <span className="flex-1 truncate">{node.name}</span>
        <span className="font-mono text-[10px] text-ink-500">{formatSize(node.size)}</span>
      </button>
    );
  }

  const isAttached = attached.has(node.path);
  return (
    <button
      onClick={() => onToggleFile(node)}
      style={pad}
      title={isAttached ? "Click to detach from chat context" : "Click to attach to chat context"}
      className={`flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-[13px] focus:outline-none focus:ring-1 focus:ring-ember-500 ${
        isAttached ? "bg-ember-600/15 text-ember-500" : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
      }`}
    >
      <span className="inline-block w-3" />
      <span>{fileIcon(node.name)}</span>
      <span className="flex-1 truncate">{node.name}</span>
      {isAttached ? (
        <span className="font-mono text-[10px]">✓ ctx</span>
      ) : (
        <span className="font-mono text-[10px] text-ink-500">{formatSize(node.size)}</span>
      )}
    </button>
  );
}

/**
 * Left panel: drag a folder in (or pick one) — no path typing. Code files
 * toggle as chat context; .csv/.xlsx files open the data preview.
 */
export default function FileTree({ tree, root, attached, onToggleFile, onOpenData, onFolder }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleResult = (promise) => {
    setBusy(true);
    setError(null);
    promise
      .then((result) => onFolder(result))
      .catch((err) => {
        if (err?.name !== "AbortError") setError(err.message || "Could not read that folder.");
      })
      .finally(() => setBusy(false));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.items?.length) handleResult(readDroppedItems(e.dataTransfer.items));
  };

  const onPick = () => {
    if (supportsDirectoryPicker()) handleResult(pickDirectory());
    else inputRef.current?.click(); // fallback for Firefox/Safari
  };

  return (
    <div className="flex h-full flex-col">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`m-3 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
          dragOver ? "border-ember-500 bg-ember-600/10" : "border-ink-700 bg-ink-950"
        }`}
      >
        <p className="text-xs text-ink-300">
          {busy ? "Reading folder…" : "Drag a project folder here"}
        </p>
        <p className="mb-2 mt-0.5 font-mono text-[10px] text-ink-500">or</p>
        <button
          onClick={onPick}
          disabled={busy}
          className="rounded-lg bg-ember-600 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-ember-500 disabled:opacity-40"
        >
          Choose folder
        </button>
        <input
          ref={inputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          hidden
          onChange={(e) => e.target.files?.length && handleResult(Promise.resolve().then(() => readInputFiles(e.target.files)))}
        />
        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
        {root && (
          <p className="mt-2 truncate font-mono text-[11px] text-mint-400" title={root}>
            ● {root}
          </p>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {!tree && !busy && (
          <div className="mt-6 px-4 text-center text-xs leading-relaxed text-ink-500">
            Code files attach to the chat as context.
            <br />
            <span className="text-mint-400">Green</span> spreadsheets (.csv / .xlsx) open a live preview.
            <br />
            <br />
            <span className="text-ink-300">Nothing is uploaded</span> — files are read
            in your browser and only sent to the local model when you attach or analyze them.
          </div>
        )}
        {tree?.children?.map((child) => (
          <TreeNode key={child.path} node={child} depth={0}
            attached={attached} onToggleFile={onToggleFile} onOpenData={onOpenData} />
        ))}
        {tree?.truncated && (
          <p className="px-3 py-2 text-[11px] text-ink-500">Tree truncated — folder is very large.</p>
        )}
      </div>
    </div>
  );
}
