import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Primary halal green — #1a7a4a */
        halal: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#228f5e",
          600: "#1a7a4a",
          700: "#155e3d",
          800: "#124a31",
          900: "#0f3d29",
          950: "#052e1a",
        },
        /** Alias for legacy `brand-*` utilities */
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#228f5e",
          700: "#1a7a4a",
          900: "#0f3d29",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover":
          "0 10px 40px -10px rgb(26 122 74 / 0.12), 0 4px 12px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
