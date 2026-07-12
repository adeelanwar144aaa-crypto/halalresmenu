import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Brand / tenant scale — RGB channels from CSS vars so opacity
         * modifiers (e.g. bg-halal-600/80) work. Defaults = brand green;
         * restaurant subdomains override --halal-* on <html>.
         */
        halal: {
          50: "rgb(var(--halal-50) / <alpha-value>)",
          100: "rgb(var(--halal-100) / <alpha-value>)",
          200: "rgb(var(--halal-200) / <alpha-value>)",
          300: "rgb(var(--halal-300) / <alpha-value>)",
          400: "rgb(var(--halal-400) / <alpha-value>)",
          500: "rgb(var(--halal-500) / <alpha-value>)",
          600: "rgb(var(--halal-600) / <alpha-value>)",
          700: "rgb(var(--halal-700) / <alpha-value>)",
          800: "rgb(var(--halal-800) / <alpha-value>)",
          900: "rgb(var(--halal-900) / <alpha-value>)",
          950: "rgb(var(--halal-950) / <alpha-value>)",
        },
        brand: {
          50: "rgb(var(--halal-50) / <alpha-value>)",
          100: "rgb(var(--halal-100) / <alpha-value>)",
          500: "rgb(var(--halal-500) / <alpha-value>)",
          700: "rgb(var(--halal-600) / <alpha-value>)",
          900: "rgb(var(--halal-900) / <alpha-value>)",
        },
        /** Explicit theme tokens for headlines / page wash */
        theme: {
          primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          bg: "rgb(var(--color-bg-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Switzer",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "Switzer",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover":
          "0 10px 40px -10px rgb(var(--halal-600) / 0.12), 0 4px 12px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
