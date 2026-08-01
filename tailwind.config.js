/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        military: {
          50: '#f2f6f4',
          100: '#e1ebd6',
          200: '#c5d8b3',
          300: '#a2be8a',
          400: '#7f9f64',
          500: '#5e7d44',
          600: '#486333',
          700: '#384d28',
          800: '#2c3b20',
          900: '#1b2414',
          950: '#0d130a',
        },
        navy: {
          800: '#0f172a',
          900: '#090d16',
          950: '#05070d',
        },
        tactical: {
          blue: '#1e3a8a',
          cyan: '#06b6d4',
          gold: '#eab308',
          red: '#ef4444',
          green: '#22c55e'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
