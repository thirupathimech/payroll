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
      },
      boxShadow: {
        card: "0 24px 70px rgba(18, 32, 24, 0.12)",
        glow: "0 18px 45px rgba(47, 111, 79, 0.25)",
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgba(239, 138, 69, 0.2), transparent 30%), radial-gradient(circle at top right, rgba(14, 116, 144, 0.18), transparent 30%), linear-gradient(135deg, #fbf7ef 0%, #f3eadb 48%, #e7f0df 100%)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        rise: "rise 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};
