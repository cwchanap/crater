import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'

function initializeApp() {
    const appElement = document.getElementById('app')
    if (!appElement) {
        throw new Error('Could not find app element')
    }

    // Clear any existing content
    appElement.innerHTML = ''

    // Mount the Svelte app
    const app = mount(App, {
        target: appElement,
    })

    // Make app globally accessible for debugging
    ;(window as any).svelteApp = app

    return app
}

let app: unknown

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = initializeApp()
    })
} else {
    app = initializeApp()
}

export default app
