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
    },
  },
  plugins: [],
};
