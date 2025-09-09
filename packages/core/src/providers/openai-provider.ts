import {
    BaseImageModelProvider,
    AIProviderConfig,
    AIGenerationRequest,
    AIGenerationResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    ImageGenerationUsage,
    ImageGenerationCost,
    AIProviderError,
} from '../base-provider'

// OpenAI API types
interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant'
    content: Array<{
        type: 'text' | 'image_url'
        text?: string
        image_url?: {
            url: string
            detail?: 'low' | 'high' | 'auto'
        }
    }>
}

interface OpenAIRequest {
    model: string
    messages: OpenAIMessage[]
    max_tokens: number
    temperature: number
    stream?: boolean
}

interface OpenAIChoice {
    message: {
        content: string
        role: string
    }
    finish_reason: string
    index: number
}

interface OpenAIResponse {
    choices: OpenAIChoice[]
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
    model: string
    id: string
}

interface OpenAIImageRequest {
    model: 'gpt-image-1' | 'dall-e-2' | 'dall-e-3'
    prompt: string
    n?: number
    size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto'
    quality?: 'low' | 'medium' | 'high' | 'auto'
    style?: 'vivid' | 'natural'
    // Note: response_format is not supported by gpt-image-1
}

interface OpenAIImageResponse {
    data: Array<{
        url?: string
        b64_json?: string
        revised_prompt?: string
    }>
    usage?: {
        prompt_tokens: number
        image_input_tokens?: number
        image_output_tokens?: number
        total_tokens: number
    }
}

/**
 * OpenAI GPT Provider with Image Support
 * Supports GPT-4 Vision and other image-capable models
 */
export class OpenAIImageProvider extends BaseImageModelProvider {
    private static readonly DEFAULT_MODEL = 'gpt-4-vision-preview'
    private static readonly API_ENDPOINT = 'https://api.openai.com/v1'

    // GPT-image-1 pricing constants (per 1M tokens)
    private static readonly GPT_IMAGE_1_PRICING = {
        INPUT_TEXT_TOKENS: 5.0, // $5 per 1M input text tokens
        INPUT_IMAGE_TOKENS: 10.0, // $10 per 1M input image tokens
        OUTPUT_IMAGE_TOKENS: 40.0, // $40 per 1M output image tokens
    }

    // Per-image costs by quality
    private static readonly GPT_IMAGE_1_IMAGE_COSTS = {
        low: 0.01,
        medium: 0.04,
        high: 0.17,
    }

    // Per-resolution costs (approximate)
    private static readonly GPT_IMAGE_1_RESOLUTION_COSTS = {
        '768x768': 0.008,
        '1024x1024': 0.016,
        '1536x1536': 0.032,
        '2048x2048': 0.064,
    }

    constructor(config: AIProviderConfig = {}) {
        super('openai', OpenAIImageProvider.DEFAULT_MODEL, config)
    }

    /**
     * Generate a response using OpenAI API
     */
    async generateResponse(
        request: AIGenerationRequest
    ): Promise<AIGenerationResponse> {
        if (!this.isConfigured()) {
            throw new Error(
                'OpenAI provider is not configured. Please provide an API key.'
            )
        }

        const endpoint =
            this.config.endpoint || OpenAIImageProvider.API_ENDPOINT

        try {
            const response = await this.callOpenAIAPI(endpoint, request)
            return this.parseOpenAIResponse(response)
        } catch (error) {
            throw this.handleOpenAIError(error)
        }
    }

    /**
     * Generate an image using OpenAI DALL-E API
     */
    async generateImage(
        request: ImageGenerationRequest
    ): Promise<ImageGenerationResponse> {
        if (!this.isConfigured()) {
            throw new Error(
                'OpenAI provider is not configured. Please provide an API key.'
            )
        }

        const endpoint =
            this.config.endpoint || OpenAIImageProvider.API_ENDPOINT

        try {
            const requestBody: OpenAIImageRequest = {
                model: 'gpt-image-1', // Use the latest image model
                prompt: request.prompt,
                n: request.n ?? 1,
                size:
                    (request.size as OpenAIImageRequest['size']) ??
                    (this.config
                        .defaultImageSize as OpenAIImageRequest['size']) ??
                    'auto',
                quality:
                    (request.quality as OpenAIImageRequest['quality']) ??
                    (this.config
                        .defaultImageQuality as OpenAIImageRequest['quality']) ??
                    'auto',
            }
            const response = await this.callOpenAIImageAPI(endpoint, request)
            return this.parseOpenAIImageResponse(response, requestBody)
        } catch (error) {
            throw this.handleOpenAIError(error)
        }
    }

    /**
     * Check if the provider has the required configuration
     */
    isConfigured(): boolean {
        return !!this.config.apiKey
    }

    private async callOpenAIAPI(
        endpoint: string,
        request: AIGenerationRequest
    ): Promise<OpenAIResponse> {
        const url = `${endpoint}/chat/completions`

        const messages: OpenAIMessage[] = []

        // Add system message if provided
        if (request.systemPrompt) {
            messages.push({
                role: 'system',
                content: [{ type: 'text', text: request.systemPrompt }],
            })
        }

        // Build user message content
        const userContent: OpenAIMessage['content'] = [
            { type: 'text', text: request.prompt },
        ]

        // Add images if provided
        if (request.images && request.images.length > 0) {
            for (const image of request.images) {
                userContent.push({
                    type: 'image_url',
                    image_url: {
                        url: this.formatImageUrl(image),
                        detail: 'high',
                    },
                })
            }
        }

        messages.push({
            role: 'user',
            content: userContent,
        })

        const body: OpenAIRequest = {
            model: this.getModel(),
            messages,
            max_tokens: request.maxTokens ?? 1000,
            temperature: request.temperature ?? 0.7,
            stream: false,
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ error: { message: 'Unknown error' } }))
            throw new Error(
                `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
            )
        }

        return response.json() as Promise<OpenAIResponse>
    }

    private async callOpenAIImageAPI(
        endpoint: string,
        request: ImageGenerationRequest
    ): Promise<OpenAIImageResponse> {
        const url = `${endpoint}/images/generations`

        const body: OpenAIImageRequest = {
            model: 'gpt-image-1', // Use the latest image model
            prompt: request.prompt,
            n: request.n ?? 1,
            size:
                (request.size as OpenAIImageRequest['size']) ??
                (this.config.defaultImageSize as OpenAIImageRequest['size']) ??
                'auto',
            quality:
                (request.quality as OpenAIImageRequest['quality']) ??
                (this.config
                    .defaultImageQuality as OpenAIImageRequest['quality']) ??
                'auto',
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ error: { message: 'Unknown error' } }))

            // Extract full error information
            let errorMessage = errorData.error?.message || 'Unknown error'
            if (errorData.error?.code) {
                errorMessage = `${errorData.error.code}: ${errorMessage}`
            }

            throw new Error(
                `OpenAI Image API error: ${response.status} - ${errorMessage}`
            )
        }

        const jsonResponse = (await response.json()) as OpenAIImageResponse
        return jsonResponse
    }

    private parseOpenAIImageResponse(
        response: OpenAIImageResponse,
        requestParams: OpenAIImageRequest
    ): ImageGenerationResponse {
        if (!response.data || response.data.length === 0) {
            throw new Error('No images generated by OpenAI')
        }

        const images = response.data.map((item) => ({
            url: item.url,
            base64: item.b64_json,
            revisedPrompt: item.revised_prompt,
        }))

        // Calculate token usage and costs
        const tokenUsage = this.calculateTokenUsage(response, requestParams)
        const costBreakdown = this.calculateCostBreakdown(
            response,
            requestParams
        )

        return {
            images,
            metadata: {
                provider: 'openai',
                model: 'gpt-image-1',
                usage: tokenUsage,
                cost: costBreakdown,
            },
        }
    }

    private calculateTokenUsage(
        response: OpenAIImageResponse,
        requestParams: OpenAIImageRequest
    ): ImageGenerationUsage {
        // If usage is provided in the response, use it
        if (response.usage) {
            return {
                inputTextTokens: Math.max(0, response.usage.prompt_tokens || 0),
                inputImageTokens: Math.max(
                    0,
                    response.usage.image_input_tokens || 0
                ),
                outputImageTokens: Math.max(
                    0,
                    response.usage.image_output_tokens || 0
                ),
                totalTokens: Math.max(0, response.usage.total_tokens || 0),
            }
        }

        // Fallback: estimate token usage
        const promptTokens = Math.ceil(requestParams.prompt.length / 4) // rough approximation
        const imageCount = requestParams.n || 1
        const outputTokensPerImage = 1000 // estimate for image generation

        return {
            inputTextTokens: promptTokens,
            inputImageTokens: 0,
            outputImageTokens: imageCount * outputTokensPerImage,
            totalTokens: promptTokens + imageCount * outputTokensPerImage,
        }
    }

    private calculateCostBreakdown(
        response: OpenAIImageResponse,
        requestParams: OpenAIImageRequest
    ): ImageGenerationCost {
        const tokenUsage = this.calculateTokenUsage(response, requestParams)
        const imageCount = requestParams.n || 1

        // Calculate token-based costs
        const inputTextCost = Math.max(
            0,
            (tokenUsage.inputTextTokens / 1_000_000) *
                OpenAIImageProvider.GPT_IMAGE_1_PRICING.INPUT_TEXT_TOKENS
        )
        const inputImageCost = Math.max(
            0,
            (tokenUsage.inputImageTokens / 1_000_000) *
                OpenAIImageProvider.GPT_IMAGE_1_PRICING.INPUT_IMAGE_TOKENS
        )
        const outputImageCost = Math.max(
            0,
            (tokenUsage.outputImageTokens / 1_000_000) *
                OpenAIImageProvider.GPT_IMAGE_1_PRICING.OUTPUT_IMAGE_TOKENS
        )

        // Calculate per-image costs based on quality
        let perImageCost = 0
        const quality = requestParams.quality || 'auto'
        if (quality === 'low') {
            perImageCost = OpenAIImageProvider.GPT_IMAGE_1_IMAGE_COSTS.low
        } else if (quality === 'medium') {
            perImageCost = OpenAIImageProvider.GPT_IMAGE_1_IMAGE_COSTS.medium
        } else if (quality === 'high') {
            perImageCost = OpenAIImageProvider.GPT_IMAGE_1_IMAGE_COSTS.high
        } else {
            // For 'auto', estimate based on resolution
            const size = requestParams.size || '1024x1024'
            perImageCost =
                OpenAIImageProvider.GPT_IMAGE_1_RESOLUTION_COSTS[
                    size as keyof typeof OpenAIImageProvider.GPT_IMAGE_1_RESOLUTION_COSTS
                ] || OpenAIImageProvider.GPT_IMAGE_1_IMAGE_COSTS.medium
        }

        const totalImageCost = perImageCost * imageCount
        const totalCost =
            inputTextCost + inputImageCost + outputImageCost + totalImageCost

        return {
            inputTextCost: Number(inputTextCost.toFixed(6)),
            inputImageCost: Number(inputImageCost.toFixed(6)),
            outputImageCost: Number(outputImageCost.toFixed(6)),
            perImageCost: Number(perImageCost.toFixed(6)),
            totalImageCost: Number(totalImageCost.toFixed(6)),
            totalCost: Number(totalCost.toFixed(6)),
            currency: 'USD',
            breakdown: {
                tokenBasedCost: Number(
                    (inputTextCost + inputImageCost + outputImageCost).toFixed(
                        6
                    )
                ),
                qualityBasedCost: Number(totalImageCost.toFixed(6)),
            },
        }
    }

    private formatImageUrl(imageData: string): string {
        // If it's already a data URL or HTTP URL, return as-is
        if (imageData.startsWith('data:') || imageData.startsWith('http')) {
            return imageData
        }

        // Assume it's base64 and create a data URL
        return `data:image/jpeg;base64,${imageData}`
    }

    private parseOpenAIResponse(
        response: OpenAIResponse
    ): AIGenerationResponse {
        const choice = response.choices?.[0]
        if (!choice) {
            throw new Error('No response generated by OpenAI')
        }

        const text = choice.message?.content || ''

        return {
            text,
            usage: {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
            },
            metadata: {
                model: response.model,
                finishReason: choice.finish_reason,
                id: response.id,
            },
        }
    }

    private handleOpenAIError(error: unknown): AIProviderError {
        if (error instanceof Error) {
            // Extract structured error information
            if (
                error.message.includes('401') ||
                error.message.includes('API key')
            ) {
                return {
                    code: 'INVALID_API_KEY',
                    message: 'Invalid or missing OpenAI API key',
                    originalError: error,
                }
            }

            if (
                error.message.includes('429') ||
                error.message.includes('quota')
            ) {
                return {
                    code: 'QUOTA_EXCEEDED',
                    message: 'OpenAI API quota exceeded or rate limit hit',
                    originalError: error,
                }
            }

            if (error.message.includes('400')) {
                return {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request to OpenAI API',
                    originalError: error,
                }
            }

            return {
                code: 'OPENAI_ERROR',
                message: error.message,
                originalError: error,
            }
        }

        return {
            code: 'UNKNOWN_ERROR',
            message: 'Unknown error occurred with OpenAI provider',
            originalError: error,
        }
    }

    /**
     * Test the connection to OpenAI API
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.generateResponse({
                prompt: 'Hello, test connection',
                maxTokens: 10,
            })
            return !!response.text
        } catch {
            return false
        }
    }

    /**
     * Get available models for image processing
     */
    static getAvailableModels(): string[] {
        return ['gpt-4-vision-preview', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
    }
}
