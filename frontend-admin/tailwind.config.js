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

        // Page Innovations brand colors (token names kept for white-label
        // compatibility — see WHITE-LABEL-SETUP.md; only hexes change).
        // 'brand-blue' = brand ink (deep charcoal) from the PI design system.
        'brand-blue': {
          DEFAULT: '#191c1e',  // Primary brand color (ink)
          light: '#2e3438',
          dark: '#0e1011',
          50: '#f7f9fb',
          100: '#e6e8ea',
          200: '#cdd2d6',
          300: '#9aa3aa',
          400: '#5c666e',
          500: '#191c1e',
          600: '#141719',
          700: '#0f1214',
          800: '#0b0d0e',
          900: '#060708',
        },

        'brand-red': {
          DEFAULT: '#df0d0d',  // Accent/CTA color
          light: '#f52e2e',
          dark: '#b80a0a',
          50: '#fef2f2',
          100: '#fde3e3',
          200: '#fac5c5',
          300: '#f59b9b',
          400: '#ec5252',
          500: '#df0d0d',
          600: '#b80a0a',
          700: '#920808',
          800: '#6d0606',
          900: '#4a0404',
        },

        // 'brand-purple' = PI warm brown (secondary text / supporting accents).
        'brand-purple': {
          DEFAULT: '#5e3f3a',  // Secondary actions
          light: '#7a554f',
          dark: '#462e2a',
          50: '#faf6f5',
          100: '#f2e9e8',
          200: '#e0cdca',
          300: '#c4a29d',
          400: '#8f6b64',
          500: '#5e3f3a',
          600: '#4c322e',
          700: '#3b2723',
          800: '#2b1c19',
          900: '#1c1210',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
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
