/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Light mode backgrounds
        light: {
          50: '#ffffff',   // Pure white
          100: '#f8f9fa',  // Main background (very light gray)
          200: '#f1f3f5',  // Card background
          300: '#e9ecef',  // Elevated elements
          400: '#dee2e6',  // Border colors
          500: '#ced4da',  // Dividers
        },

        // Background colors for dark mode
        dark: {
          900: '#0a0e1a',  // Main background (deepest)
          800: '#0f1425',  // Card background
          700: '#1a1f35',  // Elevated elements
          600: '#242b45',  // Hover states
          500: '#2f3654',  // Interactive elements
        },

        // TekyPro brand colors
        'brand-blue': {
          DEFAULT: '#0e2b5c',  // Primary brand color
          light: '#1a3d7a',
          dark: '#081b3d',
          50: '#f0f5fa',
          100: '#d9e5f2',
          200: '#a8c5e3',
          300: '#6f9dd1',
          400: '#3b74bc',
          500: '#0e2b5c',
          600: '#0b2249',
          700: '#081b3d',
          800: '#051430',
          900: '#030d1f',
        },

        'brand-red': {
          DEFAULT: '#eb1c22',  // Accent/CTA color
          light: '#ff3940',
          dark: '#c21419',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#eb1c22',
          600: '#c21419',
          700: '#991014',
          800: '#7f0d11',
          900: '#65090d',
        },

        'brand-purple': {
          DEFAULT: '#2e3192',  // Secondary actions
          light: '#4548b8',
          dark: '#1f2267',
          50: '#f5f5ff',
          100: '#ebebff',
          200: '#d4d4ff',
          300: '#a8a9ff',
          400: '#7b7dff',
          500: '#2e3192',
          600: '#1f2267',
          700: '#18194d',
          800: '#111338',
          900: '#0a0b1f',
        },

        // Text colors (works for both light and dark mode)
        text: {
          primary: '#1a202c',    // Main text (dark) for light mode
          secondary: '#4a5568',  // Secondary text for light mode
          muted: '#718096',      // Muted text for light mode
          'dark-primary': '#e8eaed',    // Main text for dark mode
          'dark-secondary': '#9ca3af',  // Secondary text for dark mode
          'dark-muted': '#6b7280',      // Muted text for dark mode
        },

        // Border colors
        border: {
          DEFAULT: '#e5e7eb',    // Light mode border
          light: '#f3f4f6',      // Lighter border
          dark: '#1e293b',       // Dark mode border
          'dark-light': '#334155',
          'dark-lighter': '#475569',
        },

        // Semantic colors
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
        },
      },

      fontFamily: {
        sans: ['Rubik', 'system-ui', 'sans-serif'],
        heading: ['Rubik', 'system-ui', 'sans-serif'],
        body: ['Rubik', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-1': ['3rem', { lineHeight: '1.2', fontWeight: '500' }],
        'display-2': ['2.25rem', { lineHeight: '1.3', fontWeight: '500' }],
        'heading-1': ['2rem', { lineHeight: '1.4', fontWeight: '500' }],
        'heading-2': ['1.5rem', { lineHeight: '1.4', fontWeight: '500' }],
        'heading-3': ['1.25rem', { lineHeight: '1.5', fontWeight: '500' }],
        'body-lg': ['1.125rem', { lineHeight: '1.625' }],
        'body': ['1rem', { lineHeight: '1.625' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6' }],
      },

      boxShadow: {
        // Light mode shadows
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

        // Dark mode shadows
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'indeterminate': 'indeterminate 1.5s infinite ease-in-out',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out infinite',
        'scale-in': 'scaleIn 0.5s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(250%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}
