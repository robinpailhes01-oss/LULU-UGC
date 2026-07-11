import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        limestone: "#F2EBE0",
        cream: "#FBF7F0",
        espresso: "#241D17",
        chestnut: "#8B5E34",
        honey: "#C98A3C",
        muted: "#6B5E50",
      },
      borderColor: {
        line: "rgba(36,29,23,.12)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 22px 50px rgba(36,29,23,.18)",
        soft: "0 10px 30px rgba(36,29,23,.10)",
      },
      maxWidth: {
        container: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
