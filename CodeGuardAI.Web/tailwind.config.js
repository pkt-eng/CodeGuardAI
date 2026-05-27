/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#080B11",
          card: "rgba(13, 18, 29, 0.65)",
          border: "rgba(255, 255, 255, 0.06)",
        },
        cyber: {
          blue: "#3B82F6",
          cyan: "#06B6D4",
          purple: "#8B5CF6",
          pink: "#EC4899",
          green: "#10B981",
          yellow: "#F59E0B",
          red: "#EF4444",
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px rgba(59, 130, 246, 0.25)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.3)',
        'glow-green': '0 0 25px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 25px rgba(239, 68, 68, 0.3)',
        'glow-purple': '0 0 25px rgba(139, 92, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
