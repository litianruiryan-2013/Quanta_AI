import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileSpreadsheet, X } from "lucide-react";

const DATA_ACCEPT = ".csv,.tsv,.xlsx,.xls";
const DATA_EXTS   = new Set(["csv", "tsv", "xlsx", "xls"]);

const formatSize = (b) =>
  b == null ? "" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const isDataFile = (name) => DATA_EXTS.has(name.split(".").pop()?.toLowerCase());

const ease = [0.16, 1, 0.3, 1];

export default function DataPanel({ onOpenData, activeFile }) {
  const [files, setFiles]       = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError]       = useState(null);
  const inputRef     = useRef(null);
  const shouldReduce = useReducedMotion();

  const addFiles = (fileList) => {
    setError(null);
    const incoming = Array.from(fileList).filter((f) => isDataFile(f.name));
    if (!incoming.length) {
      setError("Only .csv, .tsv, .xlsx, and .xls files are supported.");
      return;
    }
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const next = [...prev];
      for (const f of incoming) {
        if (!names.has(f.name)) next.push({ name: f.name, size: f.size, file: f });
      }
      return next;
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const items = Array.from(e.dataTransfer.files);
    if (items.length) addFiles(items);
  };

  const remove = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  return (
    <div className="flex h-full flex-col">
      {/* Drop zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        animate={dragOver ? { borderColor: "rgb(var(--ember-500))", backgroundColor: "rgb(var(--ember-600) / 0.08)" } : {}}
        className="m-3 rounded-xl border-2 border-dashed border-ink-700 bg-ink-950 p-4 text-center transition-colors"
      >
        <p className="text-xs text-ink-300">Drop data files here</p>
        <p className="mb-2 mt-0.5 font-mono text-[10px] text-ink-500">.csv · .tsv · .xlsx · .xls</p>
        <motion.button
          onClick={() => inputRef.current?.click()}
          whileHover={shouldReduce ? {} : { scale: 1.04 }}
          whileTap={shouldReduce ? {} : { scale: 0.96 }}
          className="rounded-lg bg-ember-600 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-ember-500"
        >
          Choose files
        </motion.button>
        <input
          ref={inputRef}
          type="file"
          accept={DATA_ACCEPT}
          multiple
          hidden
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      </motion.div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {files.length === 0 ? (
          <div className="mt-6 px-4 text-center text-xs leading-relaxed text-ink-500">
            Upload a spreadsheet to attach it as evidence for any analysis mode.
            <br /><br />
            <span className="text-ink-300">Files are read in your browser</span> — nothing
            is uploaded until you analyze or send.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {files.map((f) => {
              const active = f.name === activeFile;
              return (
                <motion.div
                  key={f.name}
                  layout
                  initial={shouldReduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? {} : { opacity: 0, x: -12 }}
                  transition={shouldReduce ? { duration: 0 } : { duration: 0.25, ease }}
                  whileHover={shouldReduce ? {} : { x: 3 }}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                    active
                      ? "bg-mint-400/10 text-mint-400"
                      : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                  }`}
                >
                  <button
                    onClick={() => onOpenData({ file: f.file, path: f.name, name: f.name, size: f.size })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none"
                    title="Click to preview and analyze"
                  >
                    <FileSpreadsheet
                      size={14}
                      strokeWidth={1.75}
                      className={active ? "text-mint-400" : "text-ink-500"}
                    />
                    <span className="flex-1 truncate font-medium">{f.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-500">
                      {active ? "● active" : formatSize(f.size)}
                    </span>
                  </button>
                  <motion.button
                    onClick={() => remove(f.name)}
                    aria-label="Remove file"
                    whileTap={shouldReduce ? {} : { scale: 0.85 }}
                    className="shrink-0 text-ink-700 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
