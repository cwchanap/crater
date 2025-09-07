import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAIImageProvider } from '../providers/openai-provider'
import { AIGenerationRequest, ImageGenerationRequest } from '../base-provider'
import {
    mockResponses,
    setupMockFetch,
    setupMockFetchError,
} from './test-utils'

// Mock fetch globally
global.fetch = vi.fn()

describe('OpenAIImageProvider', () => {
    let provider: OpenAIImageProvider
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        provider = new OpenAIImageProvider({
            apiKey: 'sk-test-api-key-12345',
            model: 'gpt-4-vision-preview',
        })
    })

    describe('constructor', () => {
        it('should initialize with OpenAI-specific defaults', () => {
            expect(provider.type).toBe('openai')
            expect(provider.defaultModel).toBe('gpt-4-vision-preview')
        })
    })

    describe('generateResponse - OpenAI-specific behavior', () => {
        beforeEach(() => {
            setupMockFetch(mockResponses.openai)
        })

        it('should format response with OpenAI-specific metadata', async () => {
            const request: AIGenerationRequest = {
                prompt: 'Test prompt',
                systemPrompt: 'You are helpful',
                maxTokens: 100,
                temperature: 0.7,
            }

            const response = await provider.generateResponse(request)

            expect(response.text).toBe('Mock OpenAI response')
            expect(response.usage).toEqual({
                promptTokens: 12,
                completionTokens: 18,
                totalTokens: 30,
            })
            expect(response.metadata).toEqual({
                finishReason: 'stop',
                model: 'gpt-4-vision-preview',
                id: 'chatcmpl-test123',
            })
        })

        it('should use OpenAI API endpoint and authorization', async () => {
            const request: AIGenerationRequest = {
                prompt: 'Analyze this image',
                images: ['data:image/jpeg;base64,mock-image-data'],
            }

            await provider.generateResponse(request)

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('chat/completions'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer sk-test-api-key-12345',
                        'Content-Type': 'application/json',
                    }),
                    body: expect.stringContaining('image_url'),
                })
            )
        })

        it('should handle OpenAI-specific error format', async () => {
            setupMockFetchError(401, {
                error: {
                    type: 'invalid_request_error',
                    message: 'Invalid API key for OpenAI',
                },
            })

            await expect(
                provider.generateResponse({ prompt: 'test' })
            ).rejects.toThrow()
        })

        it('should handle empty choices response', async () => {
            setupMockFetch({
                choices: [],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 0,
                    total_tokens: 10,
                },
            })

            await expect(
                provider.generateResponse({ prompt: 'test' })
            ).rejects.toThrow('No response generated')
        })
    })

    describe('generateImage - OpenAI-specific behavior', () => {
        const mockImageResponse = {
            data: [
                {
                    b64_json: 'mock-base64-image-data',
                    revised_prompt: 'Enhanced: A beautiful game character',
                },
            ],
        }

        beforeEach(() => {
            setupMockFetch(mockImageResponse)
        })

        it('should use OpenAI image generation endpoint and defaults', async () => {
            const request: ImageGenerationRequest = {
                prompt: 'test image',
            }

            await provider.generateImage!(request)

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('images/generations'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer sk-test-api-key-12345',
                    }),
                })
            )

            const requestBody = JSON.parse(
                (mockFetch.mock.calls[0][1] as { body: string }).body
            )
            expect(requestBody.model).toBe('gpt-image-1')
            expect(requestBody.size).toBe('auto')
            expect(requestBody.quality).toBe('auto')
        })

        it('should handle both base64 and URL responses', async () => {
            setupMockFetch({
                data: [
                    {
                        url: 'https://example.com/generated-image.png',
                        revised_prompt: 'Enhanced prompt',
                    },
                ],
            })

            const result = await provider.generateImage!({
                prompt: 'test image',
            })

            expect(result.images[0]).toEqual({
                url: 'https://example.com/generated-image.png',
                revisedPrompt: 'Enhanced prompt',
            })
        })

        it('should handle multiple image generation', async () => {
            setupMockFetch({
                data: [
                    { b64_json: 'image1-data', revised_prompt: 'Image 1' },
                    { b64_json: 'image2-data', revised_prompt: 'Image 2' },
                ],
            })

            const response = await provider.generateImage!({
                prompt: 'test',
                n: 2,
            })

            expect(response.images).toHaveLength(2)
            expect(response.images[0].base64).toBe('image1-data')
            expect(response.images[1].base64).toBe('image2-data')
        })

        it('should handle OpenAI rate limit error', async () => {
            setupMockFetchError(429, {
                error: {
                    type: 'rate_limit_error',
                    message: 'Rate limit exceeded for OpenAI API',
                },
            })

            await expect(
                provider.generateImage!({ prompt: 'test' })
            ).rejects.toThrow()
        })
    })

    describe('OpenAI API integration', () => {
        it('should use correct OpenAI API endpoint format', async () => {
            setupMockFetch(mockResponses.openai)

            await provider.generateResponse({ prompt: 'test' })

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringMatching(/api\.openai\.com.*chat\/completions/),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: expect.stringMatching(/Bearer sk-/),
                        'Content-Type': 'application/json',
                    }),
                })
            )
        })

        it('should handle OpenAI-specific response format', async () => {
            setupMockFetch(mockResponses.openai)

            const response = await provider.generateResponse({ prompt: 'test' })

            expect(response.metadata).toEqual({
                finishReason: 'stop',
                model: 'gpt-4-vision-preview',
                id: 'chatcmpl-test123',
            })
        })

        it('should support custom image generation options', () => {
            provider.updateConfig({
                defaultImageSize: '512x512',
                defaultImageQuality: 'high',
            })

            expect(provider).toBeDefined()
        })
    })
})
