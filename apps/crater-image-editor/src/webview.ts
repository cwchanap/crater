import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'

// Make app globally accessible for debugging
declare global {
    interface Window {
        svelteApp?: ReturnType<typeof mount>
    }
}

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

    window.svelteApp = app

    return app
}

let app: ReturnType<typeof initializeApp> | undefined

function safeInitializeApp() {
    try {
        app = initializeApp()
    } catch (error) {
        console.error('Failed to initialize Crater Image Editor webview', error)
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        safeInitializeApp()
    })
} else {
    safeInitializeApp()
}

export { app }
