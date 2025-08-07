import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pet Love Community Brand Colors
        coral: {
          DEFAULT: '#FF6B6B',
          light: '#FF8E8E',
          dark: '#E55555',
        },
        teal: {
          DEFAULT: '#4ECDC4',
          light: '#6ED4CC', 
          dark: '#3BB5B0',
          bg: '#E8F8F7',
        },
        midnight: '#1A535C',
        beige: '#F7FFF7',
        
        // Extended palette
        'text-secondary': '#2C6B73',
        'text-tertiary': '#6C757D',
        
        // Semantic colors
        success: '#00B894',
        warning: '#FDCB6E',
        error: '#E74C3C',
        info: '#74B9FF',
        
        // Component colors
        white: '#FFFFFF',
        border: '#E8F8F7',
        
        // Legacy support
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow: {
        card: '0 2px 8px rgba(26, 83, 92, 0.08)',
        'card-hover': '0 4px 16px rgba(26, 83, 92, 0.12)',
        button: '0 2px 4px rgba(26, 83, 92, 0.1)',
        fab: '0 8px 24px rgba(255, 107, 107, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      },
    },
  },
  plugins: [],
};
export default config;
