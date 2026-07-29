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
        forest: "#1B2B45",
        sage: "#5B9BD5",
        leaf: "#2B6CB0",
        charcoal: "#22314A",
        mist: "#F5F9FD",
      },
      boxShadow: {
        glass: "0 24px 70px rgba(43, 108, 176, 0.16)",
      },
    },
  },
  plugins: [],
};
