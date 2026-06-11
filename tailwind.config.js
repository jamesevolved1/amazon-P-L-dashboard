/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        navy: "#1E293B",
        steel: "#475569",
        slate: "#64748B",
        mute: "#94A3B8",
        panel: "#FFFFFF",
        canvas: "#F8FAFC",
        warm: "#F1F5F9",
        line: "#E2E8F0",
        soft: "#EEF2F6",
        healthy: "#16A34A",
        warn: "#F59E0B",
        danger: "#DC2626",
        brand: "#F47322",
        accent: "#FDBA31",
        deep: "#D9541F",
        indigo: "#4F46E5",
        sky: "#0EA5E9",
        emerald: "#10B981"
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem"
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -16px rgba(15,23,42,0.12)",
        lift: "0 4px 8px rgba(15,23,42,0.04), 0 24px 48px -28px rgba(15,23,42,0.18)",
        chip: "0 1px 2px rgba(15,23,42,0.06)"
      },
      fontFamily: {
        display: ["Montserrat", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
