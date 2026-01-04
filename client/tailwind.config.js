/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. Integramos los colores de tu guía VTM
      colors: {
        blood: {
          DEFAULT: '#8B0000', // Rojo sangre base
          light: '#a11717',
          bright: '#dc2626',
          glow: '#ef4444'
        },
        shadow: '#0f172a',
        veil: '#1e1b1b',
      },
      // 2. Tus animaciones ya configuradas
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.2s ease-in forwards',
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        'slide-in-right': {
          'from': { transform: 'translateX(120%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        'slide-out-right': {
          'from': { transform: 'translateX(0)', opacity: '1' },
          'to': { transform: 'translateX(120%)', opacity: '0' }
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        'scale-in': {
          'from': { transform: 'scale(0.9)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' }
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(220, 38, 38, 0.5)' },
          '50%': { 
            boxShadow: '0 0 20px rgba(220, 38, 38, 0.8), 0 0 30px rgba(220, 38, 38, 0.6)' 
          }
        }
      }
    },
  },
  plugins: [],
}