/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#23323B",
        navy: "#415A68",
        steel: "#516878",
        slate: "#667E8E",
        panel: "#FFFFFF",
        canvas: "#F5F5F5",
        warm: "#F1EBE3",
        line: "rgba(143,162,175,0.25)",
        healthy: "#11845B",
        warn: "#FDBA31",
        danger: "#C2413D",
        brand: "#F47322",
        accent: "#FDBA31",
        deep: "#D9541F"
      },
      boxShadow: {
        card: "0 2px 0 rgba(35,50,59,0.04), 0 12px 24px -16px rgba(35,50,59,0.18)",
        lift: "0 2px 0 rgba(35,50,59,0.04), 0 24px 48px -28px rgba(35,50,59,0.25)"
      }
    }
  },
  plugins: []
};
