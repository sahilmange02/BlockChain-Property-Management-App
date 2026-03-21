import tailwindForms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0A1628",
        accent: "#10B981",
        secondary: "#F59E0B",
        background: "#0D1B2A",
        surface: "#1B2838",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        grid: `linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
               linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        grid: "24px 24px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(16, 185, 129, 0.15)",
      },
    },
  },
  plugins: [tailwindForms],
};
