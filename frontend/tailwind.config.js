/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Manrope", "ui-sans-serif", "system-ui"],
        body: ["Outfit", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "#122018",
        moss: "#174032",
        fern: "#2f6f4f",
        oat: "#f3eadb",
        shell: "#fbf7ef",
        ember: "#ef8a45",
        lagoon: "#0e7490",
        line: "rgba(18, 32, 24, 0.10)",
      },
      boxShadow: {
        card: "0 16px 40px rgba(18, 32, 24, 0.08)",
        raised: "0 8px 20px rgba(18, 32, 24, 0.10)",
        glow: "0 12px 28px rgba(47, 111, 79, 0.22)",
        pop: "0 22px 60px rgba(18, 32, 24, 0.16)",
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgba(239, 138, 69, 0.14), transparent 32%), radial-gradient(circle at top right, rgba(14, 116, 144, 0.12), transparent 32%), linear-gradient(135deg, #fbf7ef 0%, #f4efe3 55%, #ecf1e6 100%)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        slideIn: "slideIn 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        fadeIn: "fadeIn 200ms ease-out both",
      },
    },
  },
  plugins: [],
};
