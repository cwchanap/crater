import type { Config } from 'tailwindcss'
import type { PluginAPI } from 'tailwindcss/types/config'

const config: Config = {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            colors: {
                // Sci-fi neon color palette
                'neon-blue': {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                    DEFAULT: '#0ea5e9',
                    glow: '#38bdf8',
                },
                'neon-cyan': {
                    50: '#ecfeff',
                    100: '#cffafe',
                    200: '#a5f3fc',
                    300: '#67e8f9',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    800: '#155e75',
                    900: '#164e63',
                    950: '#083344',
                    DEFAULT: '#06b6d4',
                    glow: '#22d3ee',
                },
                'neon-purple': {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#a855f7',
                    600: '#9333ea',
                    700: '#7c3aed',
                    800: '#6b21a8',
                    900: '#581c87',
                    950: '#3b0764',
                    DEFAULT: '#a855f7',
                    glow: '#c084fc',
                },
                'neon-green': {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                    950: '#052e16',
                    DEFAULT: '#22c55e',
                    glow: '#4ade80',
                },
                'neon-pink': {
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#ec4899',
                    600: '#db2777',
                    700: '#be185d',
                    800: '#9d174d',
                    900: '#831843',
                    950: '#500724',
                    DEFAULT: '#ec4899',
                    glow: '#f472b6',
                },
                'neon-orange': {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                    DEFAULT: '#f97316',
                    glow: '#fb923c',
                },
                // Dark background colors for sci-fi theme
                space: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                    DEFAULT: '#0f172a',
                },
            },
            fontFamily: {
                cyber: ['Orbitron', 'monospace'],
                digital: ['Share Tech Mono', 'monospace'],
            },
            animation: {
                glow: 'glow 2s ease-in-out infinite alternate',
                'pulse-glow':
                    'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'neon-flicker': 'neon-flicker 1.5s infinite linear',
                'data-stream': 'data-stream 3s linear infinite',
                'scan-line': 'scan-line 2s linear infinite',
            },
            keyframes: {
                glow: {
                    '0%': {
                        'box-shadow':
                            '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
                        'text-shadow': '0 0 5px currentColor',
                    },
                    '100%': {
                        'box-shadow':
                            '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
                        'text-shadow': '0 0 10px currentColor',
                    },
                },
                'pulse-glow': {
                    '0%, 100%': {
                        opacity: '1',
                        'box-shadow': '0 0 20px currentColor',
                    },
                    '50%': {
                        opacity: '.8',
                        'box-shadow':
                            '0 0 40px currentColor, 0 0 60px currentColor',
                    },
                },
                'neon-flicker': {
                    '0%, 100%': { opacity: '1' },
                    '1%': { opacity: '0.8' },
                    '2%': { opacity: '1' },
                    '8%': { opacity: '0.8' },
                    '9%': { opacity: '1' },
                    '12%': { opacity: '0.8' },
                    '20%': { opacity: '1' },
                    '25%': { opacity: '0.8' },
                    '30%': { opacity: '1' },
                },
                'data-stream': {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' },
                },
                'scan-line': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100vw)' },
                },
            },
            backgroundImage: {
                'cyber-grid':
                    'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
                'neon-gradient':
                    'linear-gradient(45deg, #0ea5e9, #06b6d4, #a855f7, #ec4899)',
                'space-gradient':
                    'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                'terminal-gradient':
                    'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
            },
            backgroundSize: {
                grid: '20px 20px',
            },
            boxShadow: {
                neon: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
                'neon-lg':
                    '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
                'neon-xl':
                    '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor',
                'inner-glow': 'inset 0 0 10px rgba(6, 182, 212, 0.3)',
                cyber: '0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
            },
            textShadow: {
                neon: '0 0 5px currentColor, 0 0 10px currentColor',
                'neon-lg':
                    '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            },
            backdropBlur: {
                cyber: '10px',
            },
        },
    },
    plugins: [
        // Custom plugin for text-shadow utilities
        function ({ matchUtilities, theme }: PluginAPI) {
            matchUtilities(
                {
                    'text-shadow': (value: string) => ({
                        textShadow: value,
                    }),
                },
                { values: theme('textShadow') }
            )
        },
    ],
}

export default config
