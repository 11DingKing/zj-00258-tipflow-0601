/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          50: "#F0F6FF",
          100: "#D9E6FF",
          300: "#5C88DA",
          500: "#2563EB",
          700: "#1E40AF",
          800: "#0F2747",
          900: "#0A1A33",
        },
        brand: {
          50: "#FFF4EC",
          100: "#FFE4D1",
          300: "#FFA97D",
          500: "#FF6B35",
          700: "#E05320",
        },
        level: {
          normal: "#10B981",
          urgent: "#FF6B35",
          critical: "#EF4444",
        },
        status: {
          pending: "#6366F1",
          verifying: "#F59E0B",
          resolved: "#10B981",
          returned: "#EF4444",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"PingFang SC"', '"Helvetica Neue"', "Helvetica", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 12px -2px rgba(15, 39, 71, 0.08), 0 2px 4px -2px rgba(15, 39, 71, 0.04)",
        "card-hover":
          "0 8px 24px -4px rgba(15, 39, 71, 0.12), 0 4px 8px -4px rgba(15, 39, 71, 0.06)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "count-up": "countUp 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
