import type { ChatMessage } from '@crater/core'

export type SessionMode = 'chat' | 'image'

export interface EnhancedMessage extends ChatMessage {
    messageType?: 'text' | 'image'
    imageData?: {
        images: string[]
        prompt: string
        usage?: {
            inputTextTokens: number
            outputImageTokens: number
            totalTokens: number
        }
        cost?: {
            totalCost: number
            currency: string
        }
    }
}

export interface ChatSession {
    id: string
    mode: SessionMode
    title: string
    createdAt: string
    messages: EnhancedMessage[]
}

export interface SessionCreationOptions {
    mode: SessionMode
    title?: string
}

export const SESSION_TITLE_FALLBACK: Record<SessionMode, string> = {
    chat: 'Chat Session',
    image: 'Image Session',
}

export function createSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSession(options: SessionCreationOptions): ChatSession {
    const id = createSessionId()
    return {
        id,
        mode: options.mode,
        title: options.title ?? SESSION_TITLE_FALLBACK[options.mode],
        createdAt: new Date().toISOString(),
        messages: [],
    }
}

export function deriveTitleFromMessage(
    mode: SessionMode,
    message: string
): string {
    const trimmed = message.trim()
    if (!trimmed) {
        return SESSION_TITLE_FALLBACK[mode]
    }

    const snippet = trimmed.replace(/\s+/g, ' ').slice(0, 32)
    return snippet.length < trimmed.length ? `${snippet}...` : snippet
}
