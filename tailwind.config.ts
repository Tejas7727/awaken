import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'accent-cyan': 'var(--accent-cyan)',
        'accent-magenta': 'var(--accent-magenta)',
        'accent-gold': 'var(--accent-gold)',
        'stat-str': 'var(--stat-str)',
        'stat-agi': 'var(--stat-agi)',
        'stat-vit': 'var(--stat-vit)',
        'stat-int': 'var(--stat-int)',
        'stat-wis': 'var(--stat-wis)',
        'stat-cha': 'var(--stat-cha)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
