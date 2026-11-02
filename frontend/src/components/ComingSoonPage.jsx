import TopNav from "./TopNav.jsx";
import { Label } from "./ManifestUI.jsx";

/** Generic placeholder for a section that isn't built yet. */
export default function ComingSoonPage({ eyebrow, title, body }) {
  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-16">
        <div className="fade-rise">
          <Label>{eyebrow}</Label>
          <h1 className="mt-2 font-display text-3xl font-bold">{title}</h1>
          <div className="card-raised mt-6 max-w-lg p-5">
            <p className="font-sans text-sm leading-relaxed text-ink-500">{body}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
