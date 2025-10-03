import type { Config } from 'tailwindcss';

const config: Config = {
  content: {
    files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    extract: {
      // Enhanced extraction for dynamic classes and CSS custom properties
      js: (content: string) => {
        const matches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        return matches.filter(match => 
          match.includes('bg-') || 
          match.includes('text-') || 
          match.includes('border-') ||
          match.includes('hover:') ||
          match.includes('dark:') ||
          match.includes('@') ||
          match.includes('primary') ||
          match.includes('surface') ||
          match.includes('animate-') ||
          match.includes('transition-')
        );
      }
    },
    transform: {
      // Transform dynamic class generation
      js: (content: string) => {
        // Extract classes from template literals and dynamic generation
        return content.replace(/`([^`]*)`/g, (_, match) => match);
      }
    }
  },
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"', '"Helvetica Neue"', 'sans-serif'],
      },
      colors: {
        // Enhanced color system using CSS custom properties
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          secondary: 'rgb(var(--color-surface-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-surface-tertiary) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-text-tertiary) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          secondary: 'rgb(var(--color-border-secondary) / <alpha-value>)',
        },
        // Keep existing stone colors for backward compatibility
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'theme-transition': 'theme-transition 0.3s ease-in-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'theme-transition': {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      containers: {
        'xs': '20rem',
        'sm': '24rem', 
        'md': '28rem',
        'lg': '32rem',
        'xl': '36rem',
        '2xl': '42rem',
        '3xl': '48rem',
        '4xl': '56rem',
        '5xl': '64rem',
        '6xl': '72rem',
        '7xl': '80rem',
      },
      transitionDuration: {
        '400': '400ms',
      },

    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
  corePlugins: {
    // Optimize bundle size by disabling unused core plugins
    preflight: true,
    container: false, // Using container queries instead
    accessibility: true,
    // Keep essential plugins enabled
    backgroundColor: true,
    textColor: true,
    borderColor: true,
    animation: true,
    transform: true,
    transition: true,
  },
  // Advanced purging configuration
  safelist: [
    // Preserve dynamic classes that might be generated at runtime
    'animate-shimmer',
    'animate-theme-transition',
    'animate-fade-in',
    'animate-slide-up',
    'bg-primary-50',
    'bg-primary-500',
    'bg-surface',
    'bg-surface-secondary',
    'text-text-primary',
    'text-text-secondary',
    'border-border',
    'hover:bg-primary-600',
    'dark:bg-surface',
    'dark:text-text-primary',
    // Container query classes
    '@xs:grid-cols-2',
    '@sm:grid-cols-3',
    '@md:grid-cols-4',
    '@lg:grid-cols-5',
    '@xl:grid-cols-6',
    // Responsive grid patterns
    {
      pattern: /grid-cols-(1|2|3|4|5|6)/,
      variants: ['sm', 'md', 'lg', 'xl', '2xl'],
    },
    {
      pattern: /@(xs|sm|md|lg|xl):grid-cols-(1|2|3|4|5|6)/,
    },
    {
      pattern: /bg-(primary|surface|text)-(50|100|200|300|400|500|600|700|800|900|950)/,
      variants: ['hover', 'focus', 'dark'],
    },
  ],
};

export default config;
