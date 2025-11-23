/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './{constants,data,services,types}/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './**/*.mdx?',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
