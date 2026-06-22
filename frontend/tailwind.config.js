/** @type {import('tailwindcss').Config} */

// Colors reference CSS variables holding space-separated RGB channels
// (e.g. "11 14 20"), so Tailwind opacity modifiers like bg-ember-600/15
// keep working. The actual values are defined per-theme in index.css.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: v("--ink-950"), // app background
          900: v("--ink-900"), // panels
          800: v("--ink-800"), // raised surfaces
          700: v("--ink-700"), // borders / hovers
          500: v("--ink-500"),
          300: v("--ink-300"),
          100: v("--ink-100"), // primary text
        },
        ember: {
          500: v("--ember-500"), // primary accent
          600: v("--ember-600"),
        },
        mint: {
          400: v("--mint-400"), // success / "local & free" signal
        },
        sky: {
          400: v("--sky-400"), // second series in stock comparison
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Consolas", "monospace"],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        wordmarkReveal: {
          from: { opacity: "0", transform: "translateY(52px) scale(0.88)", filter: "blur(10px)" },
          to:   { opacity: "1", transform: "translateY(0)    scale(1)",    filter: "blur(0px)"  },
        },
        glowDrift: {
          "0%, 100%": { transform: "translateX(-8rem) scale(1)",    opacity: "0.55" },
          "50%":      { transform: "translateX(4rem)  scale(1.45)", opacity: "0.9"  },
        },
        glowDrift2: {
          "0%, 100%": { transform: "translateX(8rem)  scale(1)",    opacity: "0.45" },
          "50%":      { transform: "translateX(-3rem) scale(1.35)", opacity: "0.8"  },
        },
      },
      animation: {
        "fade-up":         "fadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both",
        "wordmark-reveal": "wordmarkReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "glow-drift":      "glowDrift  6s ease-in-out infinite",
        "glow-drift2":     "glowDrift2 7s ease-in-out infinite",
      },
      boxShadow: {
        "ember-glow": "0 8px 32px 0 rgba(255, 138, 61, 0.22)",
        "sky-glow":   "0 8px 32px 0 rgba(91, 200, 255, 0.2)",
        "mint-glow":  "0 8px 32px 0 rgba(94, 230, 168, 0.2)",
      },
    },
  },
  plugins: [],
};
