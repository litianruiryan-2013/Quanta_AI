import ReactMarkdown from "react-markdown";
import CodeBlock from "./CodeBlock.jsx";

/**
 * Renders one chat message. Assistant messages are parsed as Markdown so
 * fenced code blocks get syntax highlighting + copy buttons.
 */
export default function Message({ role, content, streaming }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-ember-600/15 border border-ember-600/30 text-ink-100"
            : "bg-ink-900 border border-ink-700 text-ink-100"
        }`}
      >
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-500">
          {isUser ? "You" : "Assistant"}
        </div>

        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="markdown-body space-y-2">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const text = String(children).replace(/\n$/, "");
                  if (inline || (!match && !text.includes("\n"))) {
                    return (
                      <code
                        className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[12px] text-ember-500"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return <CodeBlock language={match?.[1]} value={text} />;
                },
                p: ({ children }) => <p className="my-1.5">{children}</p>,
                ul: ({ children }) => (
                  <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>
                ),
                h1: ({ children }) => (
                  <h1 className="mt-3 text-base font-semibold">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-3 text-base font-semibold">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-2 text-sm font-semibold">{children}</h3>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ember-500 underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-ember-500 align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
