/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 👈 INDISPENSABLE pour que le toggle Dark/Light fonctionne
  theme: {
    extend: {},
  },
  plugins: [],
}