import { mount } from 'svelte'
import App from './webview/App.svelte'

console.log('[Crater WebView] Script loaded successfully')
console.log('[Crater WebView] Document ready state:', document.readyState)
console.log('[Crater WebView] Document body:', document.body)

// Wait for DOM to be ready
function initializeApp() {
    console.log('[Crater WebView] Initializing Svelte application')
    console.log('[Crater WebView] Target element:', document.body)

    const statusEl = document.getElementById('svelte-status')
    if (statusEl) statusEl.textContent = '🔧 Creating Svelte app...'

    try {
        // Create a container div for the Svelte app to avoid conflicts with debug info
        const appContainer = document.createElement('div')
        appContainer.id = 'svelte-app'
        document.body.appendChild(appContainer)

        // Use Svelte 5's mount() function instead of constructor
        const app = mount(App, {
            target: appContainer,
        })
        console.log('[Crater WebView] Svelte app created successfully:', app)
        if (statusEl)
            statusEl.textContent = '✅ Svelte app loaded successfully!'
        return app
    } catch (error) {
        console.error('[Crater WebView] Error creating Svelte app:', error)
        if (statusEl)
            statusEl.textContent = `❌ Error loading Svelte: ${error.message}`
        throw error
    }
}

let app: unknown

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Crater WebView] DOM content loaded')
        app = initializeApp()
    })
} else {
    console.log('[Crater WebView] DOM already ready')
    app = initializeApp()
}

export default app
