/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './popup.html',
    './popup.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:  '#24243e',
          mid:   '#302b63',
          light: '#0f0c29',
        },
      },
    },
  },
  plugins: [],
};
