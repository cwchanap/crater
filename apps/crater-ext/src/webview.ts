import { mount } from 'svelte'
import App from './webview/App.svelte'

// Wait for DOM to be ready
function initializeApp() {
    try {
        // Create a container div for the Svelte app
        const appContainer = document.createElement('div')
        appContainer.id = 'svelte-app'
        document.body.appendChild(appContainer)

        // Use Svelte 5's mount() function
        const app = mount(App, {
            target: appContainer,
        })
        return app
    } catch (error) {
        console.error('[Crater WebView] Error creating Svelte app:', error)
        throw error
    }
}

let app: unknown

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = initializeApp()
    })
} else {
    app = initializeApp()
}

export default app
