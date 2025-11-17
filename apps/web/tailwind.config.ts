import type { Config } from 'tailwindcss';
import { getTailwindColorTokens, getTailwindSpacingTokens, getTailwindContentBlockTokens, getTailwindTypographyTokens } from './design-tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: getTailwindColorTokens(),
      spacing: getTailwindSpacingTokens(),
      borderRadius: getTailwindContentBlockTokens(),
      fontSize: {
        ...getTailwindTypographyTokens(),
        // Оставляем стандартные Tailwind размеры, но переопределяем основные
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)'
      },
      lineHeight: {
        'tight': 'var(--line-height-tight)',
        'normal': 'var(--line-height-normal)',
        'relaxed': 'var(--line-height-relaxed)'
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'Inter',
          'SF Pro Display',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        heading: [
          'var(--font-sans)',
          'Inter',
          'SF Pro Display',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      }
    }
  },
  darkMode: 'class',
  plugins: []
};
export default config;
