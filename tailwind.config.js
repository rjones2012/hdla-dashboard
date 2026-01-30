/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        hdla: {
          magenta: '#E00087',
          bg: '#fbfbfa',
          text: '#111111',
          muted: 'rgba(17,17,17,0.62)',
          card: '#ffffff',
        },
        status: {
          healthy: '#22c55e',
          watch: '#eab308',
          hire: '#ef4444',
        }
      },
      fontFamily: {
        flecha: ['Flecha M', 'Georgia', 'serif'],
        body: ['system-ui', 'sans-serif'],
      },
      borderRadius: {
        hdla: '14px',
      }
    },
  },
  plugins: [],
}
