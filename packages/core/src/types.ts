// Types and interfaces for the ChatBot service
import type {
    BaseImageModelProvider,
    ImageGenerationUsage,
    ImageGenerationCost,
} from './base-provider'

export interface ChatMessage {
    id: string
    text: string
    sender: 'user' | 'assistant'
    timestamp: Date
}

export interface ChatBotConfig {
    /** Custom AI prompt or instructions for the chatbot */
    systemPrompt?: string
    /** Thinking time simulation in milliseconds */
    thinkingTime?: number
    /** Maximum message length */
    maxMessageLength?: number
    /** AI provider instance for generating responses */
    aiProvider?: BaseImageModelProvider
}

export interface AssetSuggestion {
    category: string
    items: string[]
    followUpQuestion?: string
}

export interface ImageStates {
    deleted: boolean[]
    hidden: boolean[]
}

export interface ImageData {
    images: string[]
    prompt: string
    savedPaths?: string[]
    imageStates?: ImageStates
    usage?: ImageGenerationUsage
    cost?: ImageGenerationCost
}

// Re-export all AI provider types and base class from dedicated file
export * from './base-provider'

// Re-export provider implementations
export { GeminiImageProvider } from './providers/gemini-provider'
export { OpenAIImageProvider } from './providers/openai-provider'
