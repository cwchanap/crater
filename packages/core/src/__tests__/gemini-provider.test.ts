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
})
