/**
 * Base class for all AI image model providers
 * This provides a common interface and shared functionality
 */

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

export interface ImageGenerationRequest {
    /** Text prompt for image generation */
    prompt: string
    /** Image size (e.g., "1024x1024", "512x512") */
    size?: string
    /** Quality setting */
    quality?: 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto'
    /** Style setting */
    style?: 'vivid' | 'natural'
    /** Number of images to generate */
    n?: number
}

export interface ImageGenerationResponse {
    /** Generated images as base64 or URLs */
    images: Array<{
        url?: string
        base64?: string
        revisedPrompt?: string
    }>
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

/**
 * Abstract base class for AI image model providers
 * All AI providers should extend this class
 */
export abstract class BaseImageModelProvider {
    protected config: AIProviderConfig
    readonly type: AIProviderType
    readonly defaultModel: string

    constructor(
        type: AIProviderType,
        defaultModel: string,
        config: AIProviderConfig = {}
    ) {
        this.type = type
        this.defaultModel = defaultModel
        this.config = config
    }

    /**
     * Generate a text response based on the request
     */
    abstract generateResponse(
        request: AIGenerationRequest
    ): Promise<AIGenerationResponse>

    /**
     * Generate an image based on the request (optional for providers that support it)
     */
    generateImage?(
        request: ImageGenerationRequest
    ): Promise<ImageGenerationResponse>

    /**
     * Check if the provider is properly configured
     */
    abstract isConfigured(): boolean

    /**
     * Test connection to the provider (optional, default implementation returns true)
     */
    async testConnection(): Promise<boolean> {
        return true
    }

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
