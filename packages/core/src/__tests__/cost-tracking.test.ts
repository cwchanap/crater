import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAIImageProvider } from '../providers/openai-provider'
import { GeminiImageProvider } from '../providers/gemini-provider'
import { setupMockFetch, setupMockFetchError } from './test-utils'

// Mock fetch globally
global.fetch = vi.fn()

describe('Cost Tracking Edge Cases and Error Scenarios', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('OpenAI Provider Edge Cases', () => {
        let provider: OpenAIImageProvider

        beforeEach(() => {
            provider = new OpenAIImageProvider({
                apiKey: 'sk-test-api-key-12345',
            })
        })

        it('should handle API errors gracefully without breaking cost calculation', async () => {
            setupMockFetchError(500, {
                error: {
                    message: 'Internal server error',
                },
            })

            await expect(
                provider.generateImage!({ prompt: 'test' })
            ).rejects.toThrow()
        })

        it('should handle malformed usage metadata', async () => {
            const mockResponse = {
                data: [{ b64_json: 'mock-data' }],
                usage: {
                    // Missing some expected fields
                    prompt_tokens: 100,
                    // completion_tokens missing
                    total_tokens: null, // Invalid type
                },
            }

            setupMockFetch(mockResponse)

            const response = await provider.generateImage!({
                prompt: 'test image',
                quality: 'medium',
            })

            // Should handle gracefully and still provide cost information
            expect(response.metadata?.usage?.inputTextTokens).toBe(100)
            expect(response.metadata?.usage?.outputImageTokens).toBe(0)
            expect(response.metadata?.cost?.totalCost).toBeGreaterThan(0)
        })

        it('should handle extremely large token counts', async () => {
            const mockResponse = {
                data: [{ b64_json: 'mock-data' }],
                usage: {
                    prompt_tokens: 1000000, // 1M tokens
                    image_output_tokens: 10000000, // 10M tokens
                    total_tokens: 11000000,
                },
            }

            setupMockFetch(mockResponse)

            const response = await provider.generateImage!({
                prompt: 'complex prompt'.repeat(10000),
                quality: 'high',
            })

            expect(response.metadata?.usage?.totalTokens).toBe(11000000)
            expect(response.metadata?.cost?.inputTextCost).toBe(5.0) // 1M * $5
            expect(response.metadata?.cost?.outputImageCost).toBe(400.0) // 10M * $40
            expect(response.metadata?.cost?.totalCost).toBeGreaterThan(400)
        })

        it('should handle unknown size/quality combinations', async () => {
            const mockResponse = {
                data: [{ b64_json: 'mock-data' }],
            }

            setupMockFetch(mockResponse)

            const response = await provider.generateImage!({
                prompt: 'test',
                size: '999x999' as any, // Unknown size
                quality: 'ultra' as any, // Unknown quality
            })

            // Should fallback to medium quality cost
            expect(response.metadata?.cost?.perImageCost).toBe(0.04)
        })

        it('should handle negative token counts', async () => {
            const mockResponse = {
                data: [{ b64_json: 'mock-data' }],
                usage: {
                    prompt_tokens: -10, // Invalid negative
                    image_output_tokens: -5,
                    total_tokens: -15,
                },
            }

            setupMockFetch(mockResponse)

            const response = await provider.generateImage!({
                prompt: 'test',
                quality: 'low',
            })

            // Should handle gracefully - negative values should be clamped to 0
            expect(response.metadata?.cost?.inputTextCost).toBe(0)
            expect(response.metadata?.cost?.outputImageCost).toBe(0)
            expect(response.metadata?.cost?.totalCost).toBe(0.01) // Still has per-image cost
        })
    })

    describe('Gemini Provider Edge Cases', () => {
        let provider: GeminiImageProvider

        beforeEach(() => {
            provider = new GeminiImageProvider({
                apiKey: 'AIza-test-api-key',
            })
        })

        it('should handle API quota exceeded without breaking cost calculation', async () => {
            setupMockFetchError(429, {
                error: {
                    code: 'QUOTA_EXCEEDED',
                    message: 'API quota exceeded',
                },
            })

            await expect(
                provider.generateImage!({ prompt: 'test' })
            ).rejects.toThrow()
        })

        it('should handle response without candidates', async () => {
            const mockResponse = {
                candidates: [], // Empty candidates
                usageMetadata: {
                    promptTokenCount: 50,
                    candidatesTokenCount: 0,
                    totalTokenCount: 50,
                },
            }

            setupMockFetch(mockResponse)

            await expect(
                provider.generateImage!({ prompt: 'test' })
            ).rejects.toThrow('No response generated')
        })

        it('should handle mixed content parts (text + images + unknown)', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: 'Here is your image:' },
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'image-data-1',
                                    },
                                },
                                { unknownPart: 'unknown content' }, // Unknown part type
                                {
                                    inlineData: {
                                        mimeType: 'image/jpeg',
                                        data: 'image-data-2',
                                    },
                                },
                                { text: 'And another description.' },
                            ],
                        },
                        finishReason: 'STOP',
                        safetyRatings: [],
                    },
                ],
                usageMetadata: {
                    promptTokenCount: 20,
                    candidatesTokenCount: 2600, // 2 images worth
                    totalTokenCount: 2620,
                },
            }

            setupMockFetch(mockResponse)

            const response = await provider.generateImage!({
                prompt: 'Create multiple images with descriptions',
            })

            expect(response.images).toHaveLength(2) // Should extract 2 images
            expect(response.metadata?.textResponse).toContain(
                'Here is your image'
            )
            expect(response.metadata?.cost?.totalImageCost).toBe(0.078) // 2 * $0.039
        })

        it('should handle extremely long prompts', async () => {
            const longPrompt =
                'Create a detailed fantasy game character '.repeat(1000)

            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'complex-image-data',
                                    },
                                },
                            ],
                        },
                        finishReason: 'STOP',
                        safetyRatings: [],
                    },
                ],
                usageMetadata: {
                    promptTokenCount: 8750, // Very large prompt
                    candidatesTokenCount: 1290,
                    totalTokenCount: 10040,
                },
            }

            setupMockFetch(mockResponse)

            const response = await provider.generateImage!({
                prompt: longPrompt,
            })

            expect(response.metadata?.usage?.inputTextTokens).toBe(8750)
            expect(response.metadata?.cost?.totalCost).toBe(0.039) // Still uses per-image cost
        })

        it('should handle missing mimeType in image data', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        // mimeType missing
                                        data: 'image-without-mime-type',
                                    },
                                },
                            ],
                        },
                        finishReason: 'STOP',
                        safetyRatings: [],
                    },
                ],
            }

            setupMockFetch(mockResponse)

            const response = await provider.generateImage!({
                prompt: 'test image',
            })

            expect(response.images).toHaveLength(1)
            // Should handle gracefully even without proper mime type
            expect(response.images[0].base64).toContain('data:')
        })
    })

    describe('Cross-Provider Consistency', () => {
        it('should have consistent cost structure between providers', async () => {
            const openaiProvider = new OpenAIImageProvider({
                apiKey: 'sk-test-key',
            })
            const geminiProvider = new GeminiImageProvider({
                apiKey: 'AIza-test-key',
            })

            // Mock responses for both
            const openaiMockResponse = {
                data: [{ b64_json: 'openai-image' }],
                usage: {
                    prompt_tokens: 100,
                    image_output_tokens: 1000,
                    total_tokens: 1100,
                },
            }

            const geminiMockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'gemini-image',
                                    },
                                },
                            ],
                        },
                        finishReason: 'STOP',
                        safetyRatings: [],
                    },
                ],
                usageMetadata: {
                    promptTokenCount: 100,
                    candidatesTokenCount: 1290,
                    totalTokenCount: 1390,
                },
            }

            setupMockFetch(openaiMockResponse)
            const openaiResponse = await openaiProvider.generateImage!({
                prompt: 'test image',
                quality: 'medium',
            })

            setupMockFetch(geminiMockResponse)
            const geminiResponse = await geminiProvider.generateImage!({
                prompt: 'test image',
            })

            // Both should have consistent structure
            expect(openaiResponse.metadata?.usage).toHaveProperty(
                'inputTextTokens'
            )
            expect(openaiResponse.metadata?.usage).toHaveProperty(
                'outputImageTokens'
            )
            expect(openaiResponse.metadata?.usage).toHaveProperty('totalTokens')
            expect(openaiResponse.metadata?.cost).toHaveProperty('totalCost')
            expect(openaiResponse.metadata?.cost).toHaveProperty('currency')

            expect(geminiResponse.metadata?.usage).toHaveProperty(
                'inputTextTokens'
            )
            expect(geminiResponse.metadata?.usage).toHaveProperty(
                'outputImageTokens'
            )
            expect(geminiResponse.metadata?.usage).toHaveProperty('totalTokens')
            expect(geminiResponse.metadata?.cost).toHaveProperty('totalCost')
            expect(geminiResponse.metadata?.cost).toHaveProperty('currency')

            // Both should use USD
            expect(openaiResponse.metadata?.cost?.currency).toBe('USD')
            expect(geminiResponse.metadata?.cost?.currency).toBe('USD')

            // Both should have positive costs for this test
            expect(openaiResponse.metadata?.cost?.totalCost).toBeGreaterThan(0)
            expect(geminiResponse.metadata?.cost?.totalCost).toBeGreaterThan(0)
        })
    })
})
