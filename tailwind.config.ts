import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wsc: {
          ink: '#0b1220',
          paper: '#fffdf6',
          accent: '#ff6b6b',
          calm: '#4cc9f0',
          gold: '#ffd166'
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
export default config;
