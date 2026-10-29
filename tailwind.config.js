import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '.never'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
        popover: 'rgb(var(--popover) / <alpha-value>)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        input: 'var(--border)',
        ring: 'rgb(var(--primary) / 1)',
        primary: { DEFAULT: 'rgb(var(--primary) / <alpha-value>)', foreground: '#04141a' },
        destructive: { DEFAULT: '#f87171', foreground: '#fff' }
      },
      borderColor: { DEFAULT: 'var(--border)' },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', '"Cascadia Mono"', 'Consolas', 'monospace']
      },
      keyframes: {
        indeterminate: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(260%)' } }
      },
      animation: { indeterminate: '1.4s ease-in-out infinite indeterminate' }
    }
  },
  plugins: [animate]
}
