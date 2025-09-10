import { writable, derived } from 'svelte/store'
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
export const currentPage = writable<'chat' | 'config' | 'settings' | 'gallery'>(
    'chat'
)
export const currentView = writable<'chat' | 'gallery'>('chat')
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

// Derived store for total usage across all messages
export const totalUsage = derived(messages, ($messages) => {
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalTokens = 0
    let totalCost = 0
    let currency = 'USD'

    $messages.forEach((message) => {
        if (message.messageType === 'image' && message.imageData) {
            if (message.imageData.usage) {
                totalInputTokens +=
                    message.imageData.usage.inputTextTokens +
                    (message.imageData.usage.inputImageTokens || 0)
                totalOutputTokens += message.imageData.usage.outputImageTokens
                totalTokens += message.imageData.usage.totalTokens
            }
            if (message.imageData.cost) {
                totalCost += message.imageData.cost.totalCost
                currency = message.imageData.cost.currency
            }
        }
    })

    return {
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCost,
        currency,
    }
})
