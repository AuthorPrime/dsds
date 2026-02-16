/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
      // Golden Ratio Spacing Scale (Fibonacci)
      spacing: {
        'phi-1': '0.25rem',    // 4px
        'phi-2': '0.5rem',     // 8px  
        'phi-3': '0.8125rem',  // 13px
        'phi-4': '1.3125rem',  // 21px
        'phi-5': '2.125rem',   // 34px
        'phi-6': '3.4375rem',  // 55px
        'phi-7': '5.5625rem',  // 89px
        'phi-8': '9rem',       // 144px
      },
      // Golden Ratio Typography
      fontSize: {
        'phi-xs': '0.618rem',   // 1/φ
        'phi-sm': '0.75rem',
        'phi-base': '1rem',
        'phi-md': '1.125rem',
        'phi-lg': '1.618rem',   // φ
        'phi-xl': '2.618rem',   // φ²
        'phi-2xl': '4.236rem',  // φ³
      },
      // Golden Ratio Border Radius
      borderRadius: {
        'phi-sm': '0.375rem',
        'phi-md': '0.618rem',   // 1/φ
        'phi-lg': '1rem',
        'phi-xl': '1.618rem',   // φ
        'phi-2xl': '2.618rem',  // φ²
      },
      // Enhanced Color Palette with Harmonious Gradients
      colors: {
        'sacred': {
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',  // Primary purple
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
          },
          cyan: {
            50: '#ecfeff',
            100: '#cffafe',
            200: '#a5f3fc',
            300: '#67e8f9',
            400: '#22d3ee',  // Primary cyan
            500: '#06b6d4',
            600: '#0891b2',
            700: '#0e7490',
            800: '#155e75',
            900: '#164e63',
          },
        },
      },
      // Sacred Geometry Shadows
      boxShadow: {
        'phi-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'phi-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'phi-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'phi-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(168, 85, 247, 0.1)',
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.3), 0 0 40px rgba(34, 211, 238, 0.1)',
      },
    },
  },
  plugins: [],
}
