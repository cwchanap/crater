import { vi } from 'vitest'
import {
    BaseImageModelProvider,
    AIProviderConfig,
    AIGenerationRequest,
    AIGenerationResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
} from '../base-provider'

// Reusable mock implementation for testing
export class MockImageProvider extends BaseImageModelProvider {
    private shouldThrowError = false
    private mockResponse: AIGenerationResponse = {
        text: 'Mock response',
        usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
        },
    }
    private mockImageResponse: ImageGenerationResponse = {
        images: [
            {
                base64: 'mock-base64-data',
                revisedPrompt: 'Revised: test prompt',
            },
        ],
    }

    constructor(config: AIProviderConfig = {}) {
        super('mock', 'mock-model-v1', config)
    }

    async generateResponse(
        _request: AIGenerationRequest
    ): Promise<AIGenerationResponse> {
        if (this.shouldThrowError) {
            throw new Error('Mock error')
        }
        return this.mockResponse
    }

    async generateImage(
        _request: ImageGenerationRequest
    ): Promise<ImageGenerationResponse> {
        if (this.shouldThrowError) {
            throw new Error('Mock image generation error')
        }
        return this.mockImageResponse
    }

    isConfigured(): boolean {
        return !!this.config.apiKey
    }

    setMockResponse(response: AIGenerationResponse): void {
        this.mockResponse = response
    }

    setMockImageResponse(response: ImageGenerationResponse): void {
        this.mockImageResponse = response
    }

    setShouldThrowError(shouldThrow: boolean): void {
        this.shouldThrowError = shouldThrow
    }
}

// Mock provider without image generation capability
export class MockTextOnlyProvider extends BaseImageModelProvider {
    constructor(configured = true) {
        super('text-only', 'text-only-model', {
            apiKey: configured ? 'test-key' : undefined,
        })
    }

    async generateResponse(
        _request: AIGenerationRequest
    ): Promise<AIGenerationResponse> {
        return {
            text: 'Text only response',
            usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        }
    }

    isConfigured(): boolean {
        return !!this.config.apiKey
    }
}

// Common test data
export const mockResponses = {
    gemini: {
        candidates: [
            {
                content: {
                    parts: [{ text: 'Mock Gemini response' }],
                },
                finishReason: 'STOP',
                safetyRatings: [],
            },
        ],
        usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 15,
            totalTokenCount: 25,
        },
    },
    openai: {
        choices: [
            {
                message: {
                    content: 'Mock OpenAI response',
                    role: 'assistant',
                },
                finish_reason: 'stop',
                index: 0,
            },
        ],
        usage: {
            prompt_tokens: 12,
            completion_tokens: 18,
            total_tokens: 30,
        },
        model: 'gpt-4-vision-preview',
        id: 'chatcmpl-test123',
    },
}

// Common mock fetch setup
export function setupMockFetch(response: unknown) {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
    })
    return mockFetch
}

export function setupMockFetchError(status: number, errorResponse: unknown) {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({
        ok: false,
        status,
        json: () => Promise.resolve(errorResponse),
    })
    return mockFetch
}

export function setupMockFetchNetworkError(error: Error) {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockRejectedValue(error)
    return mockFetch
}
