import { writable } from 'svelte/store'

// VS Code webview API type declaration
declare function acquireVsCodeApi(): any

// VS Code API integration
export const vscode = writable<any>(null)

// Navigation state
export const currentPage = writable<'chat' | 'config' | 'settings'>('chat')
export const currentProvider = writable<string>('gemini')
export const isConfigured = writable<boolean>(false)

// Chat state
export const messages = writable<any[]>([])
export const isLoading = writable<boolean>(false)
export const showChatHistoryModal = writable<boolean>(false)
export const chatSessions = writable<any[]>([])
export const currentSessionId = writable<string | null>(null)

// Settings state
export const isLoadingSettings = writable<boolean>(false)
export const tempApiKeys = writable<{ gemini: string; openai: string }>({
    gemini: '',
    openai: '',
})
export const imageSettings = writable<{ size: string; quality: string }>({
    size: 'auto',
    quality: 'auto',
})

// Initialize VS Code API safely
if (typeof acquireVsCodeApi !== 'undefined') {
    try {
        const api = acquireVsCodeApi()
        vscode.set(api)
        console.log('[Crater WebView] VS Code API acquired in stores')
    } catch (error) {
        console.error('[Crater WebView] VS Code API error in stores:', error)
        vscode.set(null)
    }
} else {
    console.log('[Crater WebView] acquireVsCodeApi not available in stores')
    vscode.set(null)
}
