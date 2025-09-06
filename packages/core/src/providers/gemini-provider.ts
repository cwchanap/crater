import {
    BaseImageModelProvider,
    AIProviderConfig,
    AIGenerationRequest,
    AIGenerationResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    AIProviderError,
} from '../base-provider'

// Gemini API types
interface GeminiPart {
    text?: string
    inlineData?: {
        mimeType: string
        data: string
    }
}

interface GeminiContent {
    parts: GeminiPart[]
}

interface GeminiRequest {
    contents: GeminiContent[]
    generationConfig: {
        temperature: number
        maxOutputTokens: number
        topP: number
        topK: number
    }
}

interface GeminiCandidate {
    content: {
        parts: Array<{
            text?: string
            inlineData?: {
                mimeType: string
                data: string
            }
        }>
    }
    finishReason: string
    safetyRatings: unknown[]
}

interface GeminiResponse {
    candidates: GeminiCandidate[]
    usageMetadata?: {
        promptTokenCount: number
        candidatesTokenCount: number
        totalTokenCount: number
    }
}

/**
 * Google Gemini AI Provider
 * Supports image and text inputs for game asset assistance
 */
export class GeminiImageProvider extends BaseImageModelProvider {
    private static readonly DEFAULT_MODEL = 'gemini-2.0-flash-exp'
    private static readonly IMAGE_GENERATION_MODEL =
        'gemini-2.5-flash-image-preview'
    private static readonly IMAGEN_MODEL = 'imagen-4.0-generate-001'
    private static readonly API_ENDPOINT =
        'https://generativelanguage.googleapis.com/v1beta/models'

    constructor(config: AIProviderConfig = {}) {
        super('gemini', GeminiImageProvider.DEFAULT_MODEL, config)
    }

    /**
     * Generate a response using Gemini API
     */
    async generateResponse(
        request: AIGenerationRequest
    ): Promise<AIGenerationResponse> {
        if (!this.isConfigured()) {
            throw new Error(
                'Gemini provider is not configured. Please provide an API key.'
            )
        }

        const endpoint =
            this.config.endpoint || GeminiImageProvider.API_ENDPOINT
        const model = this.getModel()

        try {
            const response = await this.callGeminiAPI(endpoint, model, request)
            return this.parseGeminiResponse(response)
        } catch (error) {
            throw this.handleGeminiError(error)
        }
    }

    /**
     * Generate an image using Gemini image generation models
     */
    async generateImage(
        request: ImageGenerationRequest
    ): Promise<ImageGenerationResponse> {
        if (!this.isConfigured()) {
            throw new Error(
                'Gemini provider is not configured. Please provide an API key.'
            )
        }

        const endpoint =
            this.config.endpoint || GeminiImageProvider.API_ENDPOINT
        const model =
            request.model === 'imagen'
                ? GeminiImageProvider.IMAGEN_MODEL
                : GeminiImageProvider.IMAGE_GENERATION_MODEL

        try {
            const response = await this.callGeminiImageAPI(
                endpoint,
                model,
                request
            )
            return this.parseGeminiImageResponse(response)
        } catch (error) {
            throw this.handleGeminiError(error)
        }
    }

    /**
     * Check if the provider has the required configuration
     */
    isConfigured(): boolean {
        return !!this.config.apiKey
    }

    private async callGeminiAPI(
        endpoint: string,
        model: string,
        request: AIGenerationRequest
    ): Promise<GeminiResponse> {
        const url = `${endpoint}/${model}:generateContent?key=${this.config.apiKey}`

        const parts: GeminiPart[] = [
            {
                text: this.buildPrompt(request),
            },
        ]

        // Add images if provided
        if (request.images && request.images.length > 0) {
            for (const image of request.images) {
                parts.push({
                    inlineData: {
                        mimeType: this.detectMimeType(image),
                        data: this.extractBase64Data(image),
                    },
                })
            }
        }

        const body: GeminiRequest = {
            contents: [
                {
                    parts,
                },
            ],
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens ?? 1000,
                topP: 0.8,
                topK: 10,
            },
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ error: { message: 'Unknown error' } }))
            throw new Error(
                `Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
            )
        }

        return response.json() as Promise<GeminiResponse>
    }

    private buildPrompt(request: AIGenerationRequest): string {
        let prompt = ''

        if (request.systemPrompt) {
            prompt += `System: ${request.systemPrompt}\n\n`
        }

        prompt += `User: ${request.prompt}`

        return prompt
    }

    private parseGeminiResponse(
        response: GeminiResponse
    ): AIGenerationResponse {
        const candidate = response.candidates?.[0]
        if (!candidate) {
            throw new Error('No response generated by Gemini')
        }

        const text = candidate.content?.parts?.[0]?.text || ''

        return {
            text,
            usage: response.usageMetadata
                ? {
                      promptTokens:
                          response.usageMetadata.promptTokenCount || 0,
                      completionTokens:
                          response.usageMetadata.candidatesTokenCount || 0,
                      totalTokens: response.usageMetadata.totalTokenCount || 0,
                  }
                : undefined,
            metadata: {
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings,
            },
        }
    }

    private async callGeminiImageAPI(
        endpoint: string,
        model: string,
        request: ImageGenerationRequest
    ): Promise<GeminiResponse> {
        const url = `${endpoint}/${model}:generateContent?key=${this.config.apiKey}`

        const parts: GeminiPart[] = [
            {
                text: request.prompt,
            },
        ]

        // Add reference images if provided
        if (request.referenceImages && request.referenceImages.length > 0) {
            for (const image of request.referenceImages) {
                parts.push({
                    inlineData: {
                        mimeType: this.detectMimeType(image),
                        data: this.extractBase64Data(image),
                    },
                })
            }
        }

        const body: GeminiRequest = {
            contents: [
                {
                    parts,
                },
            ],
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: 1000,
                topP: 0.8,
                topK: 10,
            },
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ error: { message: 'Unknown error' } }))
            throw new Error(
                `Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
            )
        }

        return response.json() as Promise<GeminiResponse>
    }

    private parseGeminiImageResponse(
        response: GeminiResponse
    ): ImageGenerationResponse {
        const candidate = response.candidates?.[0]
        if (!candidate) {
            throw new Error('No response generated by Gemini')
        }

        const images: Array<{
            url?: string
            base64?: string
            revisedPrompt?: string
        }> = []
        const textResponses: string[] = []

        // Process all parts in the response
        for (const part of candidate.content.parts) {
            if (part.text) {
                textResponses.push(part.text)
            } else if (part.inlineData) {
                // Convert to data URL format for base64
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                images.push({
                    base64: dataUrl,
                })
            }
        }

        return {
            images,
            metadata: {
                model: response.usageMetadata ? 'gemini' : 'unknown',
                finishReason: candidate.finishReason,
                textResponse:
                    textResponses.length > 0
                        ? textResponses.join('\n')
                        : undefined,
            },
        }
    }

    private handleGeminiError(error: unknown): AIProviderError {
        if (error instanceof Error) {
            // Extract structured error information if available
            if (error.message.includes('API key')) {
                return {
                    code: 'INVALID_API_KEY',
                    message: 'Invalid or missing Gemini API key',
                    originalError: error,
                }
            }

            if (error.message.includes('quota')) {
                return {
                    code: 'QUOTA_EXCEEDED',
                    message: 'Gemini API quota exceeded',
                    originalError: error,
                }
            }

            return {
                code: 'GEMINI_ERROR',
                message: error.message,
                originalError: error,
            }
        }

        return {
            code: 'UNKNOWN_ERROR',
            message: 'Unknown error occurred with Gemini provider',
            originalError: error,
        }
    }

    private detectMimeType(imageData: string): string {
        if (imageData.startsWith('data:')) {
            const mimeMatch = imageData.match(/data:([^;]+)/)
            return mimeMatch?.[1] || 'image/jpeg'
        }

        // Default to JPEG for base64 without data URL prefix
        return 'image/jpeg'
    }

    private extractBase64Data(imageData: string): string {
        if (imageData.startsWith('data:')) {
            const base64Match = imageData.match(/base64,(.+)/)
            return base64Match?.[1] || imageData
        }

        return imageData
    }

    /**
     * Test the connection to Gemini API
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
     * Get available models
     */
    static getAvailableModels(): string[] {
        return [
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-1.0-pro-vision',
        ]
    }

    /**
     * Get available image generation models
     */
    static getAvailableImageModels(): {
        id: string
        name: string
        description: string
    }[] {
        return [
            {
                id: 'gemini',
                name: 'Gemini 2.5 Flash (Image Preview)',
                description:
                    'Conversational image generation and editing with text prompts',
            },
            {
                id: 'imagen',
                name: 'Imagen 4.0',
                description: 'High-quality direct image generation',
            },
        ]
    }
}
