/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Colores Inforysk basados en el logo
        inforysk: {
          red: {
            50: '#fef2f3',
            100: '#fde6e8',
            200: '#fbd0d5',
            300: '#f7aab3',
            400: '#f1788a',
            500: '#e64a63',
            600: '#C41E3A', // Color principal rojo del logo
            700: '#a51831',
            800: '#89172d',
            900: '#76172b',
          },
          navy: {
            50: '#f4f6f8',
            100: '#e3e8ed',
            200: '#c9d3dc',
            300: '#a3b4c4',
            400: '#768ea5',
            500: '#5b728b',
            600: '#4c5f76',
            700: '#425062',
            800: '#3a4553',
            900: '#1B3A57', // Color principal azul del logo
            950: '#0f1f2e',
          }
        }
      }
    },
  },
  plugins: [],
}
