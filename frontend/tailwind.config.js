/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fadeSlideIn': 'fadeSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        fadeSlideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-8px) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
}
