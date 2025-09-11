/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            colors: {
                'vscode-foreground': 'var(--vscode-foreground)',
                'vscode-background': 'var(--vscode-editor-background)',
                'vscode-button': 'var(--vscode-button-background)',
                'vscode-button-hover': 'var(--vscode-button-hoverBackground)',
                'vscode-input': 'var(--vscode-input-background)',
                'vscode-border': 'var(--vscode-widget-border)',
            },
        },
    },
    plugins: [],
}
