/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ush: {
          pink: 'var(--ush-pink)',
          pinkDark: 'var(--ush-pink-dark)',
          pinkHover: 'var(--ush-pink-hover)',
          pinkLight: 'var(--ush-pink-light)',
          pinkSoft: 'var(--ush-pink-soft)',
          navy: 'var(--ush-navy)',
          navyDark: 'var(--ush-navy-dark)',
          card: 'var(--ush-card)',
          accent: 'var(--ush-accent)',
        }
      },
      fontFamily: {
        sans: ['Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}