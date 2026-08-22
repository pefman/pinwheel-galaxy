import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cosmos: {
          depth: "#05010f",
          violet: "#7c3aed",
          indigo: "#4f46e5",
          magenta: "#ec4899",
          cyan: "#22d3ee",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
      },
      animationDelay: {
        100: "100ms",
        200: "200ms",
        300: "300ms",
        400: "400ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
