/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // VS Code Dark Modern-inspired palette
        bg: {
          base: "#1e1e1e",
          panel: "#181818",
          elevated: "#252526",
          hover: "#2a2d2e",
          active: "#37373d",
        },
        border: {
          DEFAULT: "#2b2b2b",
          subtle: "#3c3c3c",
        },
        accent: {
          DEFAULT: "#0078d4",
          hover: "#1a86d9",
        },
        text: {
          primary: "#cccccc",
          secondary: "#9d9d9d",
          muted: "#6a6a6a",
        },
        status: {
          error: "#f14c4c",
          warning: "#cca700",
          success: "#3fb950",
          info: "#3794ff",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "Consolas", "monospace"],
        sans: ["Inter", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        xs: "12px",
        sm: "13px",
        base: "13px",
      },
    },
  },
  plugins: [],
};
