import { writable } from 'svelte/store'
import type { ChatMessage, ChatSession } from '../types'

interface VSCodeApi {
    postMessage(message: unknown): void
    getState(): unknown
    setState(state: unknown): void
}

// VS Code webview API type declaration
declare function acquireVsCodeApi(): VSCodeApi

// VS Code API integration
export const vscode = writable<VSCodeApi | null>(null)

// Navigation state
export const currentPage = writable<'chat' | 'config' | 'settings'>('chat')
export const currentProvider = writable<string>('gemini')
export const currentModel = writable<string>('gemini-2.5-flash-image-preview')

export const isConfigured = writable<boolean>(false)

// Chat state
export const messages = writable<ChatMessage[]>([])
export const isLoading = writable<boolean>(false)
export const showChatHistoryModal = writable<boolean>(false)
export const chatSessions = writable<ChatSession[]>([])
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
    } catch {
        vscode.set(null)
    }
} else {
    vscode.set(null)
}
