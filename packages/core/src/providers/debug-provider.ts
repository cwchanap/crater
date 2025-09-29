import {
    BaseImageModelProvider,
    type AIGenerationRequest,
    type AIGenerationResponse,
    type AIProviderConfig,
    type ImageGenerationRequest,
    type ImageGenerationResponse,
    type ImageGenerationUsage,
    type ImageGenerationCost,
} from '../base-provider'

export interface DebugProviderConfig extends AIProviderConfig {
    testImageUrl?: string
    simulateDelay?: number
    simulateError?: boolean
}

/**
 * Debug image provider that returns a static test image.
 * Useful for development and testing without using actual AI services.
 */
export class DebugImageProvider extends BaseImageModelProvider {
    private testImageUrl: string
    private simulateDelay: number
    private simulateError: boolean

    constructor(config: DebugProviderConfig = {}) {
        super('mock', 'debug-image-provider', config)
        this.testImageUrl = config.testImageUrl || '/test_image.png'
        this.simulateDelay = config.simulateDelay || 2000 // 2 seconds default
        this.simulateError = config.simulateError || false
    }

    async generateResponse(
        request: AIGenerationRequest
    ): Promise<AIGenerationResponse> {
        // This debug provider focuses on image generation, but we need to implement this method
        return {
            text: `Debug provider received prompt: "${request.prompt}". This is a debug text response.`,
            usage: {
                promptTokens: request.prompt.length,
                completionTokens: 50,
                totalTokens: request.prompt.length + 50,
            },
            metadata: {
                provider: 'debug',
                model: 'debug-text-provider',
            },
        }
    }

    async generateImage(
        request: ImageGenerationRequest
    ): Promise<ImageGenerationResponse> {
        // Simulate API delay
        if (this.simulateDelay > 0) {
            await new Promise((resolve) =>
                setTimeout(resolve, this.simulateDelay)
            )
        }

        // Simulate error if configured
        if (this.simulateError) {
            throw new Error('Debug provider: Simulated error for testing')
        }

        const { n = 1, size = '1024x1024', quality = 'standard' } = request

        // Generate the specified number of images (all the same test image)
        const images = Array.from({ length: n }, () => ({
            url: this.testImageUrl,
            base64: undefined,
            revisedPrompt: request.prompt,
        }))

        // Simulate usage and cost data
        const usage: ImageGenerationUsage = {
            inputTextTokens: request.prompt.length,
            inputImageTokens: 0,
            outputImageTokens: n * 1000, // Simulate 1000 tokens per image
            totalTokens: request.prompt.length + n * 1000,
        }

        const cost: ImageGenerationCost = {
            inputTextCost: 0.001,
            inputImageCost: 0,
            outputImageCost: n * 0.01,
            perImageCost: 0.01,
            totalImageCost: n * 0.01,
            totalCost: n * 0.01, // $0.01 per image for debug
            currency: 'USD',
            breakdown: {
                tokenBasedCost: 0.001,
                qualityBasedCost: n * 0.009,
            },
        }

        return {
            images,
            metadata: {
                provider: 'debug',
                model: 'debug-image-provider',
                usage,
                cost,
                finishReason: 'stop',
                prompt: request.prompt,
                size,
                quality,
                n,
                timestamp: new Date().toISOString(),
            },
        }
    }

    isConfigured(): boolean {
        // Debug provider is always "configured"
        return true
    }

    /**
     * Update the test image URL
     */
    setTestImageUrl(url: string): void {
        this.testImageUrl = url
    }

    /**
     * Enable or disable error simulation
     */
    setSimulateError(simulate: boolean): void {
        this.simulateError = simulate
    }

    /**
     * Set the simulated delay in milliseconds
     */
    setSimulateDelay(delay: number): void {
        this.simulateDelay = delay
    }

    /**
     * Get current debug configuration
     */
    getDebugConfig(): {
        testImageUrl: string
        simulateDelay: number
        simulateError: boolean
    } {
        return {
            testImageUrl: this.testImageUrl,
            simulateDelay: this.simulateDelay,
            simulateError: this.simulateError,
        }
    }
}

export default DebugImageProvider
