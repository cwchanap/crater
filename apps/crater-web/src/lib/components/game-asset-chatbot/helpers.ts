import type {
    ChatSession,
    EnhancedMessage,
    SessionMode,
} from '$lib/chat/sessionTypes'
import type { ProviderKind } from '$lib/chat/aiProviderConfig'

export type ProviderStatus = {
    indicator: 'active' | 'inactive'
    text: string
}

export type UsageSummary = {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    cost: number
    currency: string | null
    hasData: boolean
}

function generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function wantsImage(prompt: string): boolean {
    const lowered = prompt.toLowerCase()
    return (
        lowered.includes('generate') ||
        lowered.includes('create') ||
        lowered.includes('image') ||
        lowered.includes('art')
    )
}

export function createAssistantTextMessage(text: string): EnhancedMessage {
    return {
        id: generateMessageId(),
        text,
        sender: 'assistant',
        timestamp: new Date(),
        messageType: 'text',
    }
}

export function createMissingApiKeyMessage(mode: SessionMode): EnhancedMessage {
    const title = mode === 'chat' ? 'Chat responses' : 'AI features'
    const directive =
        mode === 'chat'
            ? 'Add your API key in Settings to unlock chat replies.'
            : 'Add your API key in Settings to enable AI image generation and responses.'

    return createAssistantTextMessage(
        `⚠️ ${title} require a valid API key. ${directive}`
    )
}

export function createImageProviderWarning(): EnhancedMessage {
    return createAssistantTextMessage(
        '⚠️ Image generation requires a valid AI provider API key. Open Settings to add your Gemini or OpenAI key and try again.'
    )
}

export function createChatModeImageWarning(): EnhancedMessage {
    return createAssistantTextMessage(
        'This session is in chat mode. Start a new image session to generate artwork.'
    )
}

export function createErrorMessage(error: unknown): EnhancedMessage {
    const message =
        error instanceof Error ? error.message : 'Unknown error occurred'
    return createAssistantTextMessage(`❌ Error: ${message}`)
}

export function computeUsageSummary(session: ChatSession | null): UsageSummary {
    const summary: UsageSummary = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        currency: null,
        hasData: false,
    }

    if (!session) {
        return summary
    }

    for (const message of session.messages) {
        const usage = message.imageData?.usage
        if (usage) {
            summary.hasData = true
            summary.inputTokens += usage.inputTextTokens ?? 0
            summary.outputTokens += usage.outputImageTokens ?? 0
            summary.totalTokens += usage.totalTokens ?? 0
        }

        const cost = message.imageData?.cost
        if (cost) {
            summary.hasData = true
            summary.cost += cost.totalCost ?? 0
            if (!summary.currency && cost.currency) {
                summary.currency = cost.currency
            }
        }
    }

    return summary
}

export function getPlaceholderText(
    activeSession: ChatSession | null,
    isChatConfigured: boolean,
    isImageConfigured: boolean
): string {
    if (!activeSession) {
        return 'Ask me about game assets...'
    }

    if (activeSession.mode === 'chat') {
        return isChatConfigured
            ? 'Chat about game asset ideas, pipelines, and best practices'
            : 'Chat about game assets... (configure AI for richer replies)'
    }

    return isImageConfigured
        ? 'Ask me to generate a pixel art hero or vibrant environment'
        : 'Ask me about game assets... (configure AI to unlock image generation)'
}

export function getProviderStatus(
    isConfiguredForMode: boolean,
    aiProvider: ProviderKind,
    apiKey: string
): ProviderStatus {
    if (isConfiguredForMode) {
        return {
            indicator: 'active',
            text: `${aiProvider.toUpperCase()} Ready`,
        }
    }

    if (!apiKey) {
        return {
            indicator: 'inactive',
            text: `Add ${aiProvider.toUpperCase()} API Key`,
        }
    }

    return {
        indicator: 'inactive',
        text: `Check ${aiProvider.toUpperCase()} Settings`,
    }
}
