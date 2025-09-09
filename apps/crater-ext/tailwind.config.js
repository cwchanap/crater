/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,svelte,html}",
    "./src/**/*.svelte",
    "../../packages/ui-components/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // VS Code theme integration
        'vscode-foreground': 'var(--vscode-foreground)',
        'vscode-background': 'var(--vscode-editor-background)',
        'vscode-button': 'var(--vscode-button-background)',
        'vscode-button-hover': 'var(--vscode-button-hoverBackground)',
        'vscode-input': 'var(--vscode-input-background)',
        'vscode-border': 'var(--vscode-widget-border)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}