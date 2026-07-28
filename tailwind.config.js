/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "Cambria", "serif"],
      },
      colors: {
        forest: "#3D5A40",
        sage: "#8BA888",
        leaf: "#A8E063",
        charcoal: "#1A1F1A",
        mist: "#F5F5F0",
      },
      boxShadow: {
        glass: "0 24px 70px rgba(0, 0, 0, 0.34)",
      },
    },
  },
  plugins: [],
};
