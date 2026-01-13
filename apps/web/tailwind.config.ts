import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f8fafc",
        steel: "#64748b",
        ocean: "#0ea5e9"
      }
    }
  },
  plugins: []
} satisfies Config;
