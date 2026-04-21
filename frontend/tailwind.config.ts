import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff0f6",
          100: "#ffd6e5",
          200: "#ffadc9",
          300: "#ff7ba8",
          400: "#ff4587",
          500: "#e91e63",
          600: "#c2185b",
          700: "#9c1248",
          800: "#7a0e39",
          900: "#5c0a2b",
        },
      },
      keyframes: {
        pulseCell: {
          "0%, 100%": { backgroundColor: "var(--tw-bg-opacity-start, transparent)" },
          "50%": { backgroundColor: "rgba(255, 206, 86, 0.6)" },
        },
      },
      animation: {
        cell: "pulseCell 1.2s ease-in-out 2",
      },
    },
  },
  plugins: [],
};
export default config;
