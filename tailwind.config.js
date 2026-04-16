/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'storybook-base': '#fefce8',    // Light ivory
        'storybook-green': '#5e7a54',   // Sage green
        'storybook-yellow': '#fcd34d',  // Warm pebble
        'storybook-blue': '#bae6fd',    // Cool pebble
        'storybook-text': '#2d4a22',    // Deep forest
        'storybook-dark': '#3d2b1f',    // Soft dark brown
      },
      borderRadius: {
        'blob': '40% 60% 70% 30% / 40% 50% 60% 50%',
        'squircle': '2rem',
      },
      fontFamily: {
        display: ['"Fraunces"', '"Instrument Serif"', 'Georgia', 'serif'],
        body: ['"Inter"', '"DM Mono"', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-1deg)' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
