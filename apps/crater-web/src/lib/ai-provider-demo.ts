/**
 * Demo file showing how to use AI providers in web applications
 * This demonstrates the integration of real AI providers with the Crater chatbot system
 */

import {
    WebChatBotService,
    DebugImageProvider,
    GeminiImageProvider,
    OpenAIImageProvider,
    type BaseImageModelProvider,
} from '@crater/core'

/**
 * Factory function to create AI providers based on configuration
 */
export function createAIProvider(
    config: AIProviderConfig
): BaseImageModelProvider {
    switch (config.provider) {
        case 'gemini':
            if (!config.apiKey) {
                throw new Error('Gemini API key is required')
            }
            return new GeminiImageProvider({
                apiKey: config.apiKey,
                model: config.model || 'gemini-2.0-flash-exp',
            })

        case 'openai':
            if (!config.apiKey) {
                throw new Error('OpenAI API key is required')
            }
            return new OpenAIImageProvider({
                apiKey: config.apiKey,
                model: config.model || 'gpt-4-vision-preview',
            })

        case 'mock':
        default:
            return new DebugImageProvider()
    }
}

/**
 * Configuration for AI providers
 */
export interface AIProviderConfig {
    provider: 'mock' | 'gemini' | 'openai'
    apiKey?: string
    model?: string
}

/**
 * Demo class showing how to integrate AI providers with web apps
 */
export class GameAssetChatbotDemo {
    private webChatService: WebChatBotService
    private currentProvider: BaseImageModelProvider

    constructor(aiConfig: AIProviderConfig = { provider: 'mock' }) {
        // Create AI provider
        this.currentProvider = createAIProvider(aiConfig)

        // Initialize web chat service with AI provider
        this.webChatService = new WebChatBotService(
            {
                systemPrompt:
                    'You are an expert game asset assistant specializing in creative brainstorming and technical guidance.',
                thinkingTime: 500, // Faster for web demo
                maxMessageLength: 2000,
            },
            this.currentProvider
        )
    }

    /**
     * Send a message and get response
     */
    async sendMessage(
        text: string,
        images?: string[]
    ): Promise<{ userMessage: any; aiResponse: any }> {
        const messages = await this.webChatService.sendMessage(text, images)
        return {
            userMessage: messages[0],
            aiResponse: messages[1],
        }
    }

    /**
     * Switch AI provider
     */
    switchProvider(config: AIProviderConfig): void {
        this.currentProvider = createAIProvider(config)
        this.webChatService.setAIProvider(this.currentProvider)
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return this.currentProvider.getInfo()
    }

    /**
     * Test provider connection
     */
    async testConnection(): Promise<boolean> {
        return this.currentProvider.testConnection()
    }

    /**
     * Subscribe to message updates
     */
    subscribe(callback: (messages: any[]) => void): () => void {
        return this.webChatService.subscribe(callback)
    }

    /**
     * Get all messages
     */
    getMessages() {
        return this.webChatService.getMessages()
    }

    /**
     * Clear chat
     */
    clearMessages(): void {
        this.webChatService.clearMessages()
    }
}

/**
 * Example usage functions
 */

// Example 1: Basic mock provider usage
export async function demoMockProvider() {
    const demo = new GameAssetChatbotDemo({ provider: 'mock' })

    const response = await demo.sendMessage(
        'I need a fantasy warrior character sprite'
    )
    console.log('Mock Response:', response.aiResponse.text)

    return demo
}

// Example 2: Gemini provider usage (requires API key)
export async function demoGeminiProvider(apiKey: string) {
    const demo = new GameAssetChatbotDemo({
        provider: 'gemini',
        apiKey,
        model: 'gemini-2.0-flash-exp',
    })

    // Test connection first
    const connected = await demo.testConnection()
    if (!connected) {
        throw new Error('Failed to connect to Gemini API')
    }

    const response = await demo.sendMessage(
        'Create a detailed sprite sheet plan for a 2D platformer game character'
    )
    console.log('Gemini Response:', response.aiResponse.text)

    return demo
}

// Example 3: OpenAI provider usage (requires API key)
export async function demoOpenAIProvider(apiKey: string) {
    const demo = new GameAssetChatbotDemo({
        provider: 'openai',
        apiKey,
        model: 'gpt-4-vision-preview',
    })

    // Test connection first
    const connected = await demo.testConnection()
    if (!connected) {
        throw new Error('Failed to connect to OpenAI API')
    }

    const response = await demo.sendMessage(
        'Help me design UI elements for a mobile puzzle game'
    )
    console.log('OpenAI Response:', response.aiResponse.text)

    return demo
}

// Example 4: Image analysis with AI providers
export async function demoImageAnalysis(
    apiKey: string,
    provider: 'gemini' | 'openai',
    imageBase64: string
) {
    const demo = new GameAssetChatbotDemo({ provider, apiKey })

    const response = await demo.sendMessage(
        'Analyze this game asset image and suggest improvements',
        [imageBase64]
    )

    console.log(`${provider} Image Analysis:`, response.aiResponse.text)
    return demo
}

// Example 5: Provider switching demo
export async function demoProviderSwitching() {
    const demo = new GameAssetChatbotDemo({ provider: 'mock' })

    // Start with mock
    const response = await demo.sendMessage(
        'What makes a good character sprite?'
    )
    console.log('Mock response:', response.aiResponse.text)

    // Switch to different provider (if API keys are available)
    // demo.switchProvider({ provider: 'gemini', apiKey: 'your-key' })
    // response = await demo.sendMessage('Same question with different provider')

    return demo
}
