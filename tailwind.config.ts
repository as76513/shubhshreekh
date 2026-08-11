import type { Config } from "tailwindcss";

// Brand palette — see globals.css for how these back the shadcn/ui semantic
// tokens (--primary, --border, etc.), and README/architecture.md for why
// blue + gold: navy reads as trustworthy/financial, gold signals premium.
const config: Config = {
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef3fb",
          100: "#dbe7f6",
          200: "#b9d0ec",
          300: "#8fb0dd",
          400: "#5c87c8",
          500: "#3c67ab",
          600: "#2c4f8a",
          700: "#223e6d",
          800: "#1a2f54",
          900: "#14243f",
          950: "#0b1526",
        },
        gold: {
          50: "#fdf8ec",
          100: "#f9edc9",
          200: "#f3e0a0",
          300: "#ecd073",
          400: "#ddba49",
          500: "#c9a227",
          600: "#a9861a",
          700: "#8a6d15",
          800: "#6d5511",
          900: "#55420d",
          950: "#332707",
        },
      },
    },
  },
};

export default config;
