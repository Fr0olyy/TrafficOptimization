/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Основные цвета UrbanQ
        'urban-dark': '#15256D',     // Pantone 2756 C
        'urban-blue': '#003274',     // Pantone 7687 C  
        'urban-accent': '#4495D1',   // Pantone 2925 C
        'urban-gray': '#333333',     // 90% Black
        'urban-light': '#D3D3D3',    // Pantone 427 C
        
        // Дополнительные акцентные цвета
        'urban-yellow': '#FCC30B',   // Pantone 7409 C
        'urban-magenta': '#E20072',  // Pantone Process Magenta C
        'urban-green': '#56C02B',    // Pantone 7738 C
        'urban-orange': '#FD6925',   // Pantone 7578 C
        'urban-teal': '#259789',     // Pantone 7473 C
      },
      backgroundImage: {
        'urban-gradient': 'linear-gradient(135deg, #15256D 0%, #003274 50%, #4495D1 100%)',
        'icon-gradient': 'linear-gradient(135deg, #4495D1 0%, #15256D 100%)',
        'card-gradient': 'linear-gradient(135deg, #15256D 0%, #003274 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'count-up': 'countUp 0.8s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}