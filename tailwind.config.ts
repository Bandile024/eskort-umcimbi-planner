import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Eskort Brand Colors
        eskort: {
          red: "#CC0000",
          "red-dark": "#AA0000",
          yellow: "#F5A800",
          "yellow-light": "#FFB800",
          gold: "#D4A017",
          black: "#1A1A1A",
          "dark-bg": "#111111",
          "dark-card": "#222222",
          "dark-card-2": "#2A2A2A",
          cream: "#F5EDD6",
          "cream-light": "#FAF5E9",
          green: "#2D7A3A",
          "green-dark": "#1E5C29",
          blue: "#1E3A8A",
          "blue-dark": "#152A6B",
          white: "#FFFFFF",
          gray: "#9CA3AF",
          "gray-dark": "#4B5563",
          "progress-red": "#EF4444",
          "progress-yellow": "#F5A800",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-bebas)", "Impact", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(to right, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.3) 100%)",
        "card-gradient": "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        "section-gradient": "linear-gradient(to bottom, #1A1A1A 0%, #111111 100%)",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.6)",
        btn: "0 2px 8px rgba(0,0,0,0.3)",
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "progress-fill": "progressFill 2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        progressFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width, 50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
