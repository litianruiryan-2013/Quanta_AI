import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * Fenced code block with language label and a "Copy code" button.
 * Used by Message via react-markdown's `code` renderer.
 */
export default function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API can fail on non-secure contexts; fall back.
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-ink-700">
      <div className="flex items-center justify-between bg-ink-800 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-300">
          {language || "code"}
        </span>
        <button
          onClick={copy}
          className="rounded px-2 py-0.5 font-mono text-[11px] text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100 focus:outline-none focus:ring-1 focus:ring-ember-500"
        >
          {copied ? "✓ Copied" : "Copy code"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: "#0d1117",
          fontSize: "13px",
          padding: "14px",
        }}
        codeTagProps={{ style: { fontFamily: "JetBrains Mono, monospace" } }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
