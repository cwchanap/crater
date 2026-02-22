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

// ---------------------------------------------------------------------------
// Unconfigured provider
// ---------------------------------------------------------------------------
describe('GeminiImageProvider – unconfigured', () => {
    let unconfiguredProvider: GeminiImageProvider

    beforeEach(() => {
        vi.clearAllMocks()
        unconfiguredProvider = new GeminiImageProvider({})
    })

    it('should report isConfigured() as false when no API key is set', () => {
        expect(unconfiguredProvider.isConfigured()).toBe(false)
    })

    it('should throw when generateResponse is called without an API key', async () => {
        await expect(
            unconfiguredProvider.generateResponse({ prompt: 'test' })
        ).rejects.toThrow(/not configured/i)
    })

    it('should throw when generateImage is called without an API key', async () => {
        await expect(
            unconfiguredProvider.generateImage!({ prompt: 'test' })
        ).rejects.toThrow(/not configured/i)
    })
})

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------
describe('GeminiImageProvider.testConnection', () => {
    let provider: GeminiImageProvider
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        provider = new GeminiImageProvider({ apiKey: 'AIza-test-key' })
    })

    it('should return true when the API responds successfully', async () => {
        setupMockFetch(mockResponses.gemini)
        const result = await provider.testConnection()
        expect(result).toBe(true)
    })

    it('should return false when the API throws a network error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'))
        const result = await provider.testConnection()
        expect(result).toBe(false)
    })

    it('should return false when the API returns an error response', async () => {
        setupMockFetchError(500, {
            error: { message: 'Internal server error' },
        })
        const result = await provider.testConnection()
        expect(result).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Static utility methods
// ---------------------------------------------------------------------------
describe('GeminiImageProvider – static methods', () => {
    it('getAvailableModels should return a non-empty array of model IDs', () => {
        const models = GeminiImageProvider.getAvailableModels()
        expect(Array.isArray(models)).toBe(true)
        expect(models.length).toBeGreaterThan(0)
        expect(models).toContain('gemini-2.0-flash-exp')
    })

    it('getAvailableImageModels should return objects with id, name, and description', () => {
        const models = GeminiImageProvider.getAvailableImageModels()
        expect(Array.isArray(models)).toBe(true)
        expect(models.length).toBeGreaterThan(0)
        for (const m of models) {
            expect(typeof m.id).toBe('string')
            expect(typeof m.name).toBe('string')
            expect(typeof m.description).toBe('string')
        }
    })

    it('getAvailableImageModels should include a gemini and an imagen entry', () => {
        const models = GeminiImageProvider.getAvailableImageModels()
        const ids = models.map((m) => m.id)
        expect(ids).toContain('gemini')
        expect(ids).toContain('imagen')
    })
})

// ---------------------------------------------------------------------------
// buildPrompt with system prompt
// ---------------------------------------------------------------------------
describe('GeminiImageProvider – buildPrompt with systemPrompt', () => {
    let provider: GeminiImageProvider
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        provider = new GeminiImageProvider({
            apiKey: 'AIza-test-api-key',
            model: 'gemini-2.0-flash-exp',
        })
        setupMockFetch(mockResponses.gemini)
    })

    it('should prepend "System:" when a systemPrompt is provided', async () => {
        await provider.generateResponse({
            prompt: 'user message',
            systemPrompt: 'You are a game asset creator',
        })
        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining(
                    'System: You are a game asset creator'
                ),
            })
        )
    })

    it('should only include "User:" when no systemPrompt is provided', async () => {
        await provider.generateResponse({ prompt: 'dragon sprite' })
        const body = JSON.parse(
            (mockFetch.mock.calls[0][1] as RequestInit).body as string
        )
        const promptText = body.contents[0].parts[0].text as string
        expect(promptText).toContain('User: dragon sprite')
        expect(promptText).not.toContain('System:')
    })
})

// ---------------------------------------------------------------------------
// callGeminiImageAPI with reference images
// ---------------------------------------------------------------------------
describe('GeminiImageProvider – generateImage with reference images', () => {
    let provider: GeminiImageProvider
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        provider = new GeminiImageProvider({
            apiKey: 'AIza-test-api-key',
            model: 'gemini-2.0-flash-exp',
        })
    })

    it('should include reference images as inlineData parts in the request', async () => {
        const mockImageResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: 'result-data',
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

        await provider.generateImage!({
            prompt: 'modify this character',
            referenceImages: ['data:image/jpeg;base64,ref-data-here'],
        })

        const body = JSON.parse(
            (mockFetch.mock.calls[0][1] as RequestInit).body as string
        )
        const parts = body.contents[0].parts as Array<{
            text?: string
            inlineData?: { mimeType: string; data: string }
        }>
        const inlineDataParts = parts.filter((p) => p.inlineData)
        expect(inlineDataParts.length).toBeGreaterThan(0)
    })

    it('should not add extra parts when no referenceImages are provided', async () => {
        const mockImageResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: 'result-data',
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

        await provider.generateImage!({ prompt: 'create a shield' })

        const body = JSON.parse(
            (mockFetch.mock.calls[0][1] as RequestInit).body as string
        )
        // Only the text prompt part should be present, no extra inlineData
        expect(body.contents[0].parts).toHaveLength(1)
    })
})

// ---------------------------------------------------------------------------
// handleGeminiError – error variant branches
// ---------------------------------------------------------------------------
describe('GeminiImageProvider – handleGeminiError variants', () => {
    let provider: GeminiImageProvider
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        provider = new GeminiImageProvider({
            apiKey: 'AIza-test-api-key',
            model: 'gemini-2.0-flash-exp',
        })
    })

    it('should return INVALID_API_KEY code when error message contains "API key"', async () => {
        mockFetch.mockRejectedValue(new Error('API key is not valid'))
        await expect(
            provider.generateResponse({ prompt: 'test' })
        ).rejects.toMatchObject({ code: 'INVALID_API_KEY' })
    })

    it('should return QUOTA_EXCEEDED code when error message contains "quota"', async () => {
        mockFetch.mockRejectedValue(
            new Error('quota limit reached for project')
        )
        await expect(
            provider.generateResponse({ prompt: 'test' })
        ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' })
    })

    it('should return GEMINI_ERROR code for generic Error objects', async () => {
        mockFetch.mockRejectedValue(new Error('Some random error occurred'))
        await expect(
            provider.generateResponse({ prompt: 'test' })
        ).rejects.toMatchObject({
            code: 'GEMINI_ERROR',
            message: 'Some random error occurred',
        })
    })

    it('should return UNKNOWN_ERROR code for non-Error thrown values', async () => {
        mockFetch.mockRejectedValue({ customField: 'unexpected data' })
        await expect(
            provider.generateResponse({ prompt: 'test' })
        ).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })
    })
})

// ---------------------------------------------------------------------------
// detectMimeType / extractBase64Data (via generateResponse with images)
// ---------------------------------------------------------------------------
describe('GeminiImageProvider – detectMimeType and extractBase64Data', () => {
    let provider: GeminiImageProvider
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        provider = new GeminiImageProvider({
            apiKey: 'AIza-test-api-key',
            model: 'gemini-2.0-flash-exp',
        })
        setupMockFetch(mockResponses.gemini)
    })

    it('should extract the mimeType from a data URL image', async () => {
        await provider.generateResponse({
            prompt: 'test',
            images: ['data:image/webp;base64,abc123'],
        })
        const body = JSON.parse(
            (mockFetch.mock.calls[0][1] as RequestInit).body as string
        )
        const inlinePart = (
            body.contents[0].parts as Array<{
                inlineData?: { mimeType: string; data: string }
            }>
        ).find((p) => p.inlineData)
        expect(inlinePart?.inlineData?.mimeType).toBe('image/webp')
        expect(inlinePart?.inlineData?.data).toBe('abc123')
    })

    it('should default to image/jpeg for raw base64 without a data URL prefix', async () => {
        await provider.generateResponse({
            prompt: 'test',
            images: ['rawbase64datanocolo'],
        })
        const body = JSON.parse(
            (mockFetch.mock.calls[0][1] as RequestInit).body as string
        )
        const inlinePart = (
            body.contents[0].parts as Array<{
                inlineData?: { mimeType: string; data: string }
            }>
        ).find((p) => p.inlineData)
        expect(inlinePart?.inlineData?.mimeType).toBe('image/jpeg')
        // Raw base64 is passed through unchanged
        expect(inlinePart?.inlineData?.data).toBe('rawbase64datanocolo')
    })
})

// ---------------------------------------------------------------------------
// uncovered branch guards
// ---------------------------------------------------------------------------
describe('GeminiImageProvider – missing key and usage fallback branches', () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('generateResponse should leave usage undefined when usageMetadata is absent', async () => {
        const provider = new GeminiImageProvider({
            apiKey: 'AIza-test-api-key',
            model: 'gemini-2.0-flash-exp',
        })
        setupMockFetch({
            candidates: [
                {
                    content: { parts: [{ text: 'plain response' }] },
                    finishReason: 'STOP',
                    safetyRatings: [],
                },
            ],
        })

        const response = await provider.generateResponse({ prompt: 'hello' })

        expect(response.text).toBe('plain response')
        expect(response.usage).toBeUndefined()
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('callGeminiAPI should throw a clear error when apiKey is missing', async () => {
        const provider = new GeminiImageProvider()

        await expect(
            (provider as any).callGeminiAPI(
                'https://example.test/models',
                'gemini-2.0-flash-exp',
                { prompt: 'test' }
            )
        ).rejects.toThrow('Gemini API key is not configured')
    })

    it('callGeminiImageAPI should throw a clear error when apiKey is missing', async () => {
        const provider = new GeminiImageProvider()

        await expect(
            (provider as any).callGeminiImageAPI(
                'https://example.test/models',
                'gemini-2.5-flash-image-preview',
                { prompt: 'test image' }
            )
        ).rejects.toThrow('Gemini API key is not configured')
    })
})
