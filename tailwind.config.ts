import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        bg:        '#0f0f11',
        surface:   '#18181b',
        card:      '#1c1c1f',
        'card-hover': '#222226',
        border:    '#2a2a2e',
        'border-light': '#333338',
        accent: {
          DEFAULT: '#7c3aed',
          light:   '#8b5cf6',
          glow:    'rgba(124,58,237,0.15)',
        },
      },
      animation: {
        'breathe':  'breathe 2.5s ease-in-out infinite',
        'card-in':  'cardIn 0.25s ease both',
        'slide-in': 'slideIn 0.2s ease',
        'fade-in':  'fadeIn 0.15s ease',
      },
      keyframes: {
        breathe:  { '0%,100%': {opacity:'1'}, '50%': {opacity:'0.4'} },
        cardIn:   { from: {opacity:'0',transform:'translateY(8px)'}, to: {opacity:'1',transform:'translateY(0)'} },
        slideIn:  { from: {opacity:'0',transform:'translateY(-8px)'}, to: {opacity:'1',transform:'translateY(0)'} },
        fadeIn:   { from: {opacity:'0'}, to: {opacity:'1'} },
      },
    },
  },
  plugins: [],
}
export default config
