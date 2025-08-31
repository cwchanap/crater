// Types and interfaces for the ChatBot service

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

// AI Provider Types

export interface AIProviderConfig {
    /** API key for the AI service */
    apiKey?: string
    /** Model name/ID to use */
    model?: string
    /** Custom endpoint URL (optional) */
    endpoint?: string
    /** Additional provider-specific options */
    options?: Record<string, unknown>
}

export interface AIGenerationRequest {
    /** User's message/prompt */
    prompt: string
    /** System prompt/instructions */
    systemPrompt?: string
    /** Maximum response length */
    maxTokens?: number
    /** Temperature for response creativity (0-1) */
    temperature?: number
    /** Images to include in the request (base64 or URLs) */
    images?: string[]
}

export interface AIGenerationResponse {
    /** Generated text response */
    text: string
    /** Usage statistics */
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
    /** Provider-specific metadata */
    metadata?: Record<string, unknown>
}

export interface AIProviderError {
    /** Error code from the provider */
    code: string
    /** Human-readable error message */
    message: string
    /** Original error from the provider */
    originalError?: unknown
}

export type AIProviderType = 'gemini' | 'openai' | 'mock'

export abstract class BaseImageModelProvider {
    protected config: AIProviderConfig
    public readonly type: AIProviderType
    public readonly defaultModel: string

    constructor(
        type: AIProviderType,
        defaultModel: string,
        config: AIProviderConfig = {}
    ) {
        this.type = type
        this.defaultModel = defaultModel
        this.config = {
            model: defaultModel,
            ...config,
        }
    }

    /**
     * Generate a text response based on the request
     */
    abstract generateResponse(
        request: AIGenerationRequest
    ): Promise<AIGenerationResponse>

    /**
     * Check if the provider is properly configured
     */
    abstract isConfigured(): boolean

    /**
     * Get the current model being used
     */
    getModel(): string {
        return this.config.model || this.defaultModel
    }

    /**
     * Update the provider configuration
     */
    updateConfig(newConfig: Partial<AIProviderConfig>): void {
        this.config = { ...this.config, ...newConfig }
    }

    /**
     * Get provider information
     */
    getInfo(): { type: AIProviderType; model: string; configured: boolean } {
        return {
            type: this.type,
            model: this.getModel(),
            configured: this.isConfigured(),
        }
    }
}

// Re-export provider implementations
export { GeminiImageProvider } from './providers/gemini-provider'
export { OpenAIImageProvider } from './providers/openai-provider'
export { MockImageProvider } from './providers/mock-provider'
