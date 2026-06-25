import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient.js";

const ease = [0.16, 1, 0.3, 1];

// ---------------- Google "G" SVG icon ----------------
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.1 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.27l7.08 5.5C12.4 13.32 17.72 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.55c0-1.63-.15-3.2-.42-4.71H24v8.91h12.42c-.54 2.87-2.17 5.3-4.62 6.93l7.1 5.52C43.22 37.16 46.1 31.27 46.1 24.55z"/>
      <path fill="#FBBC05" d="M10.72 28.44A14.6 14.6 0 0 1 9.5 24c0-1.55.27-3.05.72-4.44l-7.08-5.5A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.56 10.76l8.16-6.32z"/>
      <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.49-4.95l-7.1-5.52C28.6 38.1 26.42 39 24 39c-6.28 0-11.6-3.82-13.28-9.26l-8.16 6.32C6.07 43.52 14.82 47 24 47z"/>
    </svg>
  );
}

export default function AuthModal({ onClose }) {
  const [step, setStep]       = useState("choose"); // "choose" | "email" | "otp"
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [resent, setResent]   = useState(false);

  const emailRef = useRef(null);
  const codeRef  = useRef(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "otp")   codeRef.current?.focus();
  }, [step]);

  // Close on Escape key.
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
    // On success the browser navigates away — no cleanup needed.
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep("otp");
    setResent(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("expired")
          ? "Code expired — request a new one below."
          : error.message.toLowerCase().includes("invalid")
          ? "Invalid code — double-check or request a new one."
          : error.message
      );
    }
    // On success AuthContext closes the modal via the session effect.
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResent(true);
    setCode("");
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to QUANTA"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.22, ease }}
        className="relative w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-900 p-7 shadow-2xl"
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-600 font-mono text-base font-bold text-ink-950">
            Q
          </div>
          <h2 className="font-mono text-sm font-bold tracking-[0.12em] text-ink-100">
            Sign in to QUANTA
          </h2>
          <p className="text-center text-xs text-ink-500">
            Save your analyses and access them anywhere.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step: choose ── */}
          {step === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {/* Google */}
              <div className="relative">
                <span
                  aria-hidden
                  className="animate-glow-pulse pointer-events-none absolute inset-0 rounded-xl bg-ember-500/30 blur-md"
                />
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-ember-600 py-2.5 font-mono text-sm font-bold text-ink-950 shadow-ember-glow transition-colors hover:bg-ember-500 disabled:opacity-60"
                >
                  <GoogleIcon />
                  {loading ? "Redirecting…" : "Sign in with Google"}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-ink-700" />
                <span className="font-mono text-[10px] text-ink-500">or</span>
                <div className="h-px flex-1 bg-ink-700" />
              </div>

              {/* Email option */}
              <button
                onClick={() => { setStep("email"); setError(null); }}
                className="w-full rounded-xl border border-ink-700 py-2.5 font-mono text-sm font-semibold text-ink-300 transition-colors hover:border-ember-500/50 hover:text-ink-100"
              >
                Sign in with email code
              </button>

              {error && <p className="text-center text-xs text-red-400">{error}</p>}
            </motion.div>
          )}

          {/* ── Step: email ── */}
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <form onSubmit={handleSendCode} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[11px] text-ink-500">Email address</span>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-100 placeholder-ink-500 focus:border-ember-500 focus:outline-none"
                  />
                </label>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="rounded-xl bg-ember-600 py-2.5 font-mono text-sm font-bold text-ink-950 shadow-ember-glow transition-colors hover:bg-ember-500 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send code →"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("choose"); setError(null); }}
                  className="text-center text-xs text-ink-500 hover:text-ink-300"
                >
                  ← Back
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step: otp ── */}
          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <p className="mb-4 text-center text-xs text-ink-300">
                We sent a 6-digit code to{" "}
                <span className="font-mono text-ember-500">{email}</span>
              </p>

              <form onSubmit={handleVerify} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[11px] text-ink-500">6-digit code</span>
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-ink-100 placeholder-ink-700 focus:border-ember-500 focus:outline-none"
                  />
                </label>

                {error && <p className="text-xs text-red-400">{error}</p>}
                {resent && <p className="text-xs text-mint-400">New code sent — check your inbox.</p>}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="rounded-xl bg-ember-600 py-2.5 font-mono text-sm font-bold text-ink-950 shadow-ember-glow transition-colors hover:bg-ember-500 disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify →"}
                </button>

                <div className="flex items-center justify-between text-xs text-ink-500">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="hover:text-ink-300 disabled:opacity-50"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setCode(""); setError(null); }}
                    className="hover:text-ink-300"
                  >
                    Change email
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
