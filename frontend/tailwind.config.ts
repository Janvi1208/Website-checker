import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0E14",
        surface: "#1C232E",
        "surface-raised": "#242C39",
        border: "#2C3543",
        signal: "#3DDC84",
        "signal-dim": "#2A9E5F",
        alert: "#FF6B5E",
        data: "#5B8DEF",
        ivory: "#E8ECF1",
        muted: "#8893A3",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "scan-gradient":
          "linear-gradient(180deg, transparent 0%, rgba(61,220,132,0.12) 50%, transparent 100%)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse_dot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        scan: "scan 2.5s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out forwards",
        pulse_dot: "pulse_dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
