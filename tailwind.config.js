/** JustHome design tokens. Build: npm run build:css */
const brand = {
  50: "#eef4ff", 100: "#dae6ff", 200: "#bdd3ff", 300: "#90b6fd", 400: "#5c8ef9",
  500: "#3769f2", 600: "#2150e0", 700: "#1a3fbf", 800: "#1b369b", 900: "#1c327a", 950: "#152049",
};
// Warm neutral ("stone" leaning) used everywhere grey was.
const ink = {
  50: "#f8f7f4", 100: "#f1efea", 200: "#e4e1d9", 300: "#cfcbc0", 400: "#a7a294",
  500: "#6a655a", 600: "#5f5a50", 700: "#4a463e", 800: "#2f2c27", 900: "#1e1c19", 950: "#121110",
};
module.exports = {
  content: ["./*.html", "./js/**/*.js", "!./js/admin/**"],
  theme: {
    extend: {
      colors: { brand, ink, blue: brand, gray: ink },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(30 28 25 / .04), 0 4px 12px -2px rgb(30 28 25 / .06)",
        lift: "0 1px 2px rgb(30 28 25 / .05), 0 8px 24px -6px rgb(30 28 25 / .12), 0 24px 48px -16px rgb(30 28 25 / .14)",
        ring: "0 0 0 1px rgb(30 28 25 / .06)",
      },
      borderRadius: { "4xl": "2rem" },
      maxWidth: { site: "76rem" },
    },
  },
  plugins: [],
};
