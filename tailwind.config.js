/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171927",
        navy: "#25283A",
        steel: "#53586B",
        slate: "#70768A",
        mute: "#9CA2B3",
        panel: "#FFFFFF",
        canvas: "#F8F9FC",
        warm: "#F4F5F9",
        line: "#E9EAF0",
        soft: "#F0F2F8",
        healthy: "#4F9E82",
        warn: "#C89C57",
        danger: "#C86868",
        brand: "#5966C8",
        accent: "#95A5E8",
        deep: "#414CA4",
        indigo: "#5966C8",
        sky: "#7FA7E8",
        emerald: "#79BBA4"
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
