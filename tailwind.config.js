export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#1a1a1a',
        surface: '#222222',
        card:    '#1e1e1e',
        border:  '#2e2e2e',
        ink:     '#ede6dc',
        muted:   '#a09890',
        dim:     '#706a64',
        accent:  '#c9b99a',
        danger:  '#8b4545',
        ok:      '#4a6b4a',
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
