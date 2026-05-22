/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#06060c",
          panel: "#0f0f1c",
          card: "#14142b",
          border: "#1f1f3e",
          green: "#00ff66",
          pink: "#ff007f",
          blue: "#00e5ff",
          yellow: "#ffdf00",
          text: "#c4c4e2",
          dim: "#62628a"
        },
        "neon-green":  "#00ff66",
        "neon-pink":   "#ff007f",
        "neon-blue":   "#00e5ff",
        "neon-yellow": "#ffdf00",
      },
      fontFamily: {
        arcade: ["'Press Start 2P'", "monospace"],
        cyber: ["'Orbitron'", "sans-serif"],
        sans: ["'Inter'", "sans-serif"]
      },
      boxShadow: {
        "neon-green": "0 0 8px rgba(0, 255, 102, 0.4), 0 0 20px rgba(0, 255, 102, 0.2)",
        "neon-pink": "0 0 8px rgba(255, 0, 127, 0.4), 0 0 20px rgba(255, 0, 127, 0.2)",
        "neon-blue": "0 0 8px rgba(0, 229, 255, 0.4), 0 0 20px rgba(0, 229, 255, 0.2)",
        "neon-yellow": "0 0 8px rgba(255, 223, 0, 0.4), 0 0 20px rgba(255, 223, 0, 0.2)"
      },
      animation: {
        "scanline": "scanline 8s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-green": "glow-green 2s ease-in-out infinite alternate"
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" }
        },
        "glow-green": {
          "0%": { boxShadow: "0 0 4px rgba(0, 255, 102, 0.2), inset 0 0 4px rgba(0, 255, 102, 0.1)" },
          "100%": { boxShadow: "0 0 16px rgba(0, 255, 102, 0.6), inset 0 0 8px rgba(0, 255, 102, 0.3)" }
        }
      }
    },
  },
  plugins: [],
}
