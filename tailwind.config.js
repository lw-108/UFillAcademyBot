/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        prime: {
          DEFAULT: '#ff4500', // high contrast reddish orange
          light: '#ff6b35',
          dark: '#e03a00',
        },
        futuristic: {
          bg: '#0d0f12',
          surface: '#161a1f',
          panel: '#1b2027',
          border: '#262c35',
          borderLight: '#39424e',
          textMuted: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['var(--font-satoshi)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
    screens: {
      xxs: '0',
      xs: '320px',
      sm: '420px',
      md: '640px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  plugins: [],
};

