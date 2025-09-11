import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'

console.log('webview.ts: Starting Svelte app initialization')

// Wait for DOM to be ready
function initializeApp() {
    try {
        console.log('webview.ts: Initializing Svelte app...')

        // Find the existing app container
        const appElement = document.getElementById('app')
        console.log('webview.ts: App element found:', appElement)

        if (!appElement) {
            throw new Error('Could not find app element')
        }

        // Clear any existing content
        appElement.innerHTML = ''

        // Use Svelte 5's mount() function
        console.log('webview.ts: Calling mount() function...')
        const app = mount(App, {
            target: appElement,
        })

        console.log('webview.ts: Svelte app initialized successfully')

        // Make app globally accessible for debugging
        ;(window as any).svelteApp = app

        return app
    } catch (error) {
        console.error('webview.ts: Error creating Svelte app:', error)

        // Show error in the DOM for debugging
        const appElement = document.getElementById('app')
        if (appElement) {
            appElement.innerHTML = `
                <div style="color: #f44336; padding: 20px; font-family: monospace;">
                    <h3>Svelte Initialization Error:</h3>
                    <pre>${error instanceof Error ? error.message : String(error)}</pre>
                    <pre>${error instanceof Error ? error.stack : ''}</pre>
                </div>
            `
        }

        throw error
    }
}

let app: unknown

if (document.readyState === 'loading') {
    console.log('webview.ts: DOM still loading, waiting for DOMContentLoaded')
    document.addEventListener('DOMContentLoaded', () => {
        console.log('webview.ts: DOMContentLoaded fired')
        app = initializeApp()
    })
} else {
    console.log('webview.ts: DOM already ready, initializing immediately')
    app = initializeApp()
}

export default app
