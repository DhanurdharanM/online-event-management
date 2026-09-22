/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        harbor: { DEFAULT: '#14282E', 700: '#1F3A42', 500: '#4A6169', 300: '#8FA1A6' },
        brand: { DEFAULT: '#0F766E', dark: '#0B5A54', light: '#D6EFEC' },
        marigold: { DEFAULT: '#F5B82E', dark: '#D99A0B', light: '#FDF0CC' },
        chalk: '#F4F5F0',
        mist: '#DCE3E0',
        danger: { DEFAULT: '#C8402D', light: '#FBE4DF' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
