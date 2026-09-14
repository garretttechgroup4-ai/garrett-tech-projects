import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1e293b",
        muted: "#64748b",
        border: "#e2e8f0",
        blue: {
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
          light: "#eff6ff",
        },
        good: "#16a34a",
        bad: "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
