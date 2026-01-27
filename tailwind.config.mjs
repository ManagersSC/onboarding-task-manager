/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
	  "./pages/**/*.{js,jsx}",
	  "./components/**/*.{js,jsx}",
	  "./app/**/*.{js,jsx}",
	  "./src/**/*.{js,jsx}",
	  "*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
    	extend: {
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			},
    			// Semantic status colors
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))',
    				muted: 'hsl(var(--success-muted))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))',
    				muted: 'hsl(var(--warning-muted))'
    			},
    			error: {
    				DEFAULT: 'hsl(var(--error))',
    				foreground: 'hsl(var(--error-foreground))',
    				muted: 'hsl(var(--error-muted))'
    			},
    			info: {
    				DEFAULT: 'hsl(var(--info))',
    				foreground: 'hsl(var(--info-foreground))',
    				muted: 'hsl(var(--info-muted))'
    			}
    		},
    		backgroundColor: {
    			subtle: 'hsl(var(--background-subtle))',
    			elevated: 'hsl(var(--background-elevated))'
    		},
    		borderColor: {
    			subtle: 'hsl(var(--border-subtle))',
    			strong: 'hsl(var(--border-strong))'
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		// Typography scale
    		fontSize: {
    			'display': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
    			'headline': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
    			'title-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
    			'title': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
    			'title-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
    			'body-lg': ['1.125rem', { lineHeight: '1.6' }],
    			'body': ['1rem', { lineHeight: '1.6' }],
    			'body-sm': ['0.875rem', { lineHeight: '1.5' }],
    			'caption': ['0.75rem', { lineHeight: '1.4' }],
    			'overline': ['0.75rem', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }]
    		},
    		// Custom animations
    		keyframes: {
    			'fade-in': {
    				'0%': { opacity: '0' },
    				'100%': { opacity: '1' }
    			},
    			'fade-in-up': {
    				'0%': { opacity: '0', transform: 'translateY(8px)' },
    				'100%': { opacity: '1', transform: 'translateY(0)' }
    			},
    			'slide-up': {
    				'0%': { opacity: '0', transform: 'translateY(16px)' },
    				'100%': { opacity: '1', transform: 'translateY(0)' }
    			},
    			'slide-down': {
    				'0%': { opacity: '0', transform: 'translateY(-16px)' },
    				'100%': { opacity: '1', transform: 'translateY(0)' }
    			},
    			'scale-in': {
    				'0%': { opacity: '0', transform: 'scale(0.95)' },
    				'100%': { opacity: '1', transform: 'scale(1)' }
    			},
    			'shimmer': {
    				'0%': { backgroundPosition: '-200% 0' },
    				'100%': { backgroundPosition: '200% 0' }
    			},
    			'pulse-subtle': {
    				'0%, 100%': { opacity: '1' },
    				'50%': { opacity: '0.7' }
    			},
    			'pulse-ring': {
    				'0%, 100%': { transform: 'scale(1)', opacity: '1' },
    				'50%': { transform: 'scale(1.05)', opacity: '0.8' }
    			},
    			'count-up': {
    				'0%': { transform: 'translateY(100%)', opacity: '0' },
    				'100%': { transform: 'translateY(0)', opacity: '1' }
    			},
    			'spin-slow': {
    				'0%': { transform: 'rotate(0deg)' },
    				'100%': { transform: 'rotate(360deg)' }
    			}
    		},
    		animation: {
    			'fade-in': 'fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    			'fade-in-up': 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    			'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    			'slide-down': 'slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    			'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    			'shimmer': 'shimmer 2s linear infinite',
    			'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
    			'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
    			'count-up': 'count-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    			'spin-slow': 'spin-slow 3s linear infinite'
    		},
    		// Custom transition timing
    		transitionTimingFunction: {
    			'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
    			'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)'
    		},
    		transitionDuration: {
    			'fast': '150ms',
    			'base': '200ms',
    			'slow': '300ms',
    			'slower': '500ms'
    		},
    		// Extended spacing
    		spacing: {
    			'18': '4.5rem',
    			'22': '5.5rem',
    			'26': '6.5rem',
    			'30': '7.5rem'
    		},
    		// Box shadows
    		boxShadow: {
    			'elevated': '0 4px 6px -1px hsl(var(--foreground) / 0.05), 0 2px 4px -2px hsl(var(--foreground) / 0.05), 0 0 0 1px hsl(var(--border) / 0.5)',
    			'elevated-lg': '0 10px 15px -3px hsl(var(--foreground) / 0.08), 0 4px 6px -4px hsl(var(--foreground) / 0.05), 0 0 0 1px hsl(var(--border) / 0.5)',
    			'glow': '0 0 0 3px hsl(var(--primary) / 0.15)',
    			'glow-success': '0 0 0 3px hsl(var(--success) / 0.15)',
    			'glow-warning': '0 0 0 3px hsl(var(--warning) / 0.15)',
    			'glow-error': '0 0 0 3px hsl(var(--error) / 0.15)',
    			'glow-info': '0 0 0 3px hsl(var(--info) / 0.15)'
    		}
    	}
    },
	plugins: [],
  }
  