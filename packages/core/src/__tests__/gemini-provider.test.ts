import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GeminiImageProvider } from '../providers/gemini-provider'
import { AIGenerationRequest, ImageGenerationRequest } from '../base-provider'
import {
    mockResponses,
    setupMockFetch,
    setupMockFetchError,
} from './test-utils'

// Mock fetch globally
global.fetch = vi.fn()

describe('GeminiImageProvider', () => {
    let provider: GeminiImageProvider
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        provider = new GeminiImageProvider({
            apiKey: 'AIza-test-api-key',
            model: 'gemini-2.0-flash-exp',
        })
    })

    describe('constructor', () => {
        it('should initialize with Gemini-specific defaults', () => {
            expect(provider.type).toBe('gemini')
            expect(provider.defaultModel).toBe('gemini-2.0-flash-exp')
        })
    })

    describe('generateResponse - Gemini-specific behavior', () => {
        beforeEach(() => {
            setupMockFetch(mockResponses.gemini)
        })

        it('should format response with Gemini-specific metadata', async () => {
            const request: AIGenerationRequest = {
                prompt: 'Test prompt',
                systemPrompt: 'You are helpful',
                maxTokens: 100,
                temperature: 0.7,
            }

            const response = await provider.generateResponse(request)

            expect(response.metadata).toEqual({
                finishReason: 'STOP',
                safetyRatings: [],
            })
        })

        it('should use Gemini API endpoint and format', async () => {
            const request: AIGenerationRequest = {
                prompt: 'Analyze this image',
                images: ['data:image/jpeg;base64,mock-image-data'],
            }

            await provider.generateResponse(request)

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('generateContent'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    body: expect.stringContaining('inlineData'),
                })
            )
        })

        it('should handle Gemini-specific error format', async () => {
            setupMockFetchError(400, {
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request for Gemini API',
                },
            })

            await expect(
                provider.generateResponse({ prompt: 'test' })
            ).rejects.toThrow('Invalid request for Gemini API')
        })

        it('should handle empty candidates response', async () => {
            setupMockFetch({ candidates: [] })

            await expect(
                provider.generateResponse({ prompt: 'test' })
            ).rejects.toThrow('No response generated')
        })
    })

    describe('generateImage - Gemini-specific behavior', () => {
        const mockImageResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: 'mock-base64-image-data',
                                },
                            },
                        ],
                    },
                    finishReason: 'STOP',
                    safetyRatings: [],
                },
            ],
        }

        beforeEach(() => {
            setupMockFetch(mockImageResponse)
        })

        it('should use Gemini image generation model and format', async () => {
            const request: ImageGenerationRequest = {
                prompt: 'test image',
            }

            const response = await provider.generateImage!(request)

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-2.5-flash-image-preview'),
                expect.any(Object)
            )
            expect(response.images[0].base64).toBe(
                'data:image/png;base64,mock-base64-image-data'
            )
        })

        it('should handle Gemini quota exceeded error', async () => {
            setupMockFetchError(429, {
                error: {
                    code: 'QUOTA_EXCEEDED',
                    message: 'Quota exceeded for Gemini API',
                },
            })

            await expect(
                provider.generateImage!({ prompt: 'test' })
            ).rejects.toThrow('Quota exceeded for Gemini API')
        })
    })

    describe('Gemini API integration', () => {
        it('should use correct Gemini API endpoint format', async () => {
            setupMockFetch(mockResponses.gemini)

            await provider.generateResponse({ prompt: 'test' })

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringMatching(
                    /generativelanguage\.googleapis\.com.*generateContent/
                ),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            )
        })

        it('should handle safety ratings in response', async () => {
            const responseWithSafety = {
                ...mockResponses.gemini,
                candidates: [
                    {
                        ...mockResponses.gemini.candidates[0],
                        safetyRatings: [
                            {
                                category: 'HARM_CATEGORY_HARASSMENT',
                                probability: 'NEGLIGIBLE',
                            },
                        ],
                    },
                ],
            }
            setupMockFetch(responseWithSafety)

            const response = await provider.generateResponse({ prompt: 'test' })

            expect(response.metadata?.safetyRatings).toBeDefined()
            expect(response.metadata?.safetyRatings).toHaveLength(1)
        })
    })

    describe('Token Usage and Cost Tracking', () => {
        describe('Gemini 2.5 Flash Image cost calculation', () => {
            it('should calculate costs with usage metadata from API response', async () => {
                const mockImageResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'mock-base64-image-data',
                                        },
                                    },
                                ],
                            },
                            finishReason: 'STOP',
                            safetyRatings: [],
                        },
                    ],
                    usageMetadata: {
                        promptTokenCount: 50,
                        candidatesTokenCount: 1290, // Standard tokens per image
                        totalTokenCount: 1340,
                    },
                }

                setupMockFetch(mockImageResponse)

                const request: ImageGenerationRequest = {
                    prompt: 'A beautiful game character',
                }

                const response = await provider.generateImage!(request)

                expect(response.metadata?.usage).toEqual({
                    inputTextTokens: 50,
                    inputImageTokens: 0,
                    outputImageTokens: 1290,
                    totalTokens: 1340,
                })

                expect(response.metadata?.cost).toEqual({
                    inputTextCost: 0, // Free for image generation
                    inputImageCost: 0,
                    outputImageCost: 0.0387, // 1290/1M * $30
                    perImageCost: 0.039, // Standard Gemini 2.5 Flash Image cost
                    totalImageCost: 0.039,
                    totalCost: 0.039, // Max of token cost vs per-image cost
                    currency: 'USD',
                    breakdown: {
                        tokenBasedCost: 0.0387,
                        qualityBasedCost: 0.039,
                    },
                })
            })

            it('should handle multiple image generation cost calculation', async () => {
                const mockImageResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'image1-data',
                                        },
                                    },
                                    {
                                        text: 'Generated first image',
                                    },
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'image2-data',
                                        },
                                    },
                                    {
                                        text: 'Generated second image',
                                    },
                                ],
                            },
                            finishReason: 'STOP',
                            safetyRatings: [],
                        },
                    ],
                    usageMetadata: {
                        promptTokenCount: 75,
                        candidatesTokenCount: 2580, // 2 * 1290 tokens
                        totalTokenCount: 2655,
                    },
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: 'Generate two game characters',
                })

                expect(response.images).toHaveLength(2)
                expect(response.metadata?.usage?.totalTokens).toBe(2655)
                expect(response.metadata?.cost?.perImageCost).toBe(0.039)
                expect(response.metadata?.cost?.totalImageCost).toBe(0.078) // 2 * $0.039
                expect(response.metadata?.cost?.totalCost).toBe(0.078) // Higher of token vs per-image cost
            })

            it('should estimate costs when usage metadata is missing', async () => {
                const mockImageResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'mock-base64-image-data',
                                        },
                                    },
                                ],
                            },
                            finishReason: 'STOP',
                            safetyRatings: [],
                        },
                    ],
                    // No usage metadata
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: 'A detailed fantasy game character with magical armor',
                })

                // Should fallback to estimation
                expect(
                    response.metadata?.usage?.inputTextTokens
                ).toBeGreaterThan(0)
                expect(response.metadata?.usage?.outputImageTokens).toBe(1290) // Standard estimate
                expect(response.metadata?.cost?.totalCost).toBe(0.039) // Per-image cost
                expect(response.metadata?.cost?.perImageCost).toBe(0.039)
            })

            it('should handle Imagen model with different pricing', async () => {
                const mockImageResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'mock-imagen-data',
                                        },
                                    },
                                ],
                            },
                            finishReason: 'STOP',
                            safetyRatings: [],
                        },
                    ],
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: 'Test image',
                    model: 'imagen', // Use Imagen instead of Gemini 2.5 Flash Image
                })

                // Should use different pricing for Imagen
                expect(response.metadata?.cost?.perImageCost).toBe(0.05) // Placeholder Imagen cost
                expect(response.metadata?.cost?.totalImageCost).toBe(0.05)
                expect(response.metadata?.cost?.totalCost).toBe(0.05)
                expect(response.metadata?.cost?.breakdown?.tokenBasedCost).toBe(
                    0
                )
                expect(
                    response.metadata?.cost?.breakdown?.qualityBasedCost
                ).toBe(0.05)
            })

            it('should handle text responses alongside images', async () => {
                const mockImageResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        text: 'I created a beautiful character for you!',
                                    },
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'mock-character-image',
                                        },
                                    },
                                    {
                                        text: 'The character features detailed armor and weapons.',
                                    },
                                ],
                            },
                            finishReason: 'STOP',
                            safetyRatings: [],
                        },
                    ],
                    usageMetadata: {
                        promptTokenCount: 30,
                        candidatesTokenCount: 1350, // Text + image tokens
                        totalTokenCount: 1380,
                    },
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: 'Create a game character with description',
                })

                expect(response.images).toHaveLength(1)
                expect(response.metadata?.textResponse).toBeDefined()
                expect(response.metadata?.textResponse).toContain(
                    'beautiful character'
                )
                expect(response.metadata?.usage?.outputImageTokens).toBe(1350)
                // Token cost: 1350/1M * $30 = 0.0405, Per-image: $0.039
                // Uses Math.max, so 0.0405 > 0.039
                expect(response.metadata?.cost?.totalCost).toBe(0.0405)
            })

            it('should handle edge case with zero cost calculation', async () => {
                const mockImageResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'mock-image',
                                        },
                                    },
                                ],
                            },
                            finishReason: 'STOP',
                            safetyRatings: [],
                        },
                    ],
                    usageMetadata: {
                        promptTokenCount: 0,
                        candidatesTokenCount: 0,
                        totalTokenCount: 0,
                    },
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: '',
                })

                expect(response.metadata?.usage?.inputTextTokens).toBe(0)
                expect(response.metadata?.usage?.outputImageTokens).toBe(0)
                expect(response.metadata?.cost?.outputImageCost).toBe(0)
                expect(response.metadata?.cost?.totalCost).toBe(0.039) // Still has per-image cost
            })

            it('should prefer higher cost between token-based and per-image pricing', async () => {
                // Test scenario where token cost would be higher than per-image cost
                const mockImageResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: 'expensive-image',
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
                        candidatesTokenCount: 2000, // Higher than standard 1290
                        totalTokenCount: 2100,
                    },
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: 'Complex image generation',
                })

                expect(response.metadata?.cost?.outputImageCost).toBe(0.06)
                expect(response.metadata?.cost?.perImageCost).toBe(0.039)
                expect(response.metadata?.cost?.totalCost).toBe(0.06) // Should use higher token cost
            })
        })
    })
})
