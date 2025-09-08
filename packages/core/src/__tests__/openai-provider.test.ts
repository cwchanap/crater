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

    describe('Token Usage and Cost Tracking', () => {
        describe('GPT-image-1 cost calculation', () => {
            it('should calculate costs with usage metadata from API response', async () => {
                const mockImageResponse = {
                    data: [
                        {
                            b64_json: 'mock-base64-image-data',
                            revised_prompt:
                                'Enhanced: A beautiful game character',
                        },
                    ],
                    usage: {
                        prompt_tokens: 100,
                        image_input_tokens: 0,
                        image_output_tokens: 2000,
                        total_tokens: 2100,
                    },
                }

                setupMockFetch(mockImageResponse)

                const request: ImageGenerationRequest = {
                    prompt: 'A beautiful game character',
                    quality: 'medium',
                    n: 1,
                }

                const response = await provider.generateImage!(request)

                expect(response.metadata?.usage).toEqual({
                    inputTextTokens: 100,
                    inputImageTokens: 0,
                    outputImageTokens: 2000,
                    totalTokens: 2100,
                })

                expect(response.metadata?.cost).toEqual({
                    inputTextCost: 0.0005, // 100/1M * $5
                    inputImageCost: 0,
                    outputImageCost: 0.08, // 2000/1M * $40
                    perImageCost: 0.04, // medium quality
                    totalImageCost: 0.04,
                    totalCost: 0.1205, // 0.0005 + 0 + 0.08 + 0.04
                    currency: 'USD',
                    breakdown: {
                        tokenBasedCost: 0.0805, // input + output token costs
                        qualityBasedCost: 0.04, // per-image costs
                    },
                })
            })

            it('should calculate costs with different quality settings', async () => {
                const mockImageResponse = {
                    data: [{ b64_json: 'mock-base64' }],
                    usage: {
                        prompt_tokens: 50,
                        total_tokens: 1550,
                    },
                }

                setupMockFetch(mockImageResponse)

                // Test high quality
                const highQualityResponse = await provider.generateImage!({
                    prompt: 'Test image',
                    quality: 'high',
                    n: 1,
                })

                expect(highQualityResponse.metadata?.cost?.perImageCost).toBe(
                    0.17
                )
                expect(highQualityResponse.metadata?.cost?.totalImageCost).toBe(
                    0.17
                )

                // Test low quality
                const lowQualityResponse = await provider.generateImage!({
                    prompt: 'Test image',
                    quality: 'low',
                    n: 1,
                })

                expect(lowQualityResponse.metadata?.cost?.perImageCost).toBe(
                    0.01
                )
                expect(lowQualityResponse.metadata?.cost?.totalImageCost).toBe(
                    0.01
                )
            })

            it('should handle multiple image generation cost calculation', async () => {
                const mockImageResponse = {
                    data: [
                        { b64_json: 'image1-data' },
                        { b64_json: 'image2-data' },
                        { b64_json: 'image3-data' },
                    ],
                    usage: {
                        prompt_tokens: 75,
                        image_output_tokens: 3000,
                        total_tokens: 3075,
                    },
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: 'Generate three images',
                    quality: 'medium',
                    n: 3,
                })

                expect(response.metadata?.usage?.totalTokens).toBe(3075)
                expect(response.metadata?.cost?.perImageCost).toBe(0.04)
                expect(response.metadata?.cost?.totalImageCost).toBe(0.12) // 3 * $0.04
                // Total cost = inputText (75/1M*$5) + outputImage (3000/1M*$40) + totalImage (0.12)
                // = 0.000375 + 0.12 + 0.12 = 0.240375
                expect(response.metadata?.cost?.totalCost).toBeCloseTo(
                    0.240375,
                    5
                )
            })

            it('should estimate costs when usage metadata is missing', async () => {
                const mockImageResponse = {
                    data: [{ b64_json: 'mock-base64' }],
                    // No usage metadata
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: 'A game character with detailed armor and weapons',
                    quality: 'auto',
                    size: '1024x1024',
                    n: 1,
                })

                // Should fallback to estimation
                expect(
                    response.metadata?.usage?.inputTextTokens
                ).toBeGreaterThan(0)
                expect(response.metadata?.usage?.outputImageTokens).toBe(1000) // estimate
                expect(response.metadata?.cost?.totalCost).toBeGreaterThan(0)
                expect(response.metadata?.cost?.perImageCost).toBe(0.016) // 1024x1024 resolution cost
            })

            it('should handle auto quality with different resolutions', async () => {
                const mockImageResponse = {
                    data: [{ b64_json: 'mock-base64' }],
                }

                setupMockFetch(mockImageResponse)

                // Test different resolution costs
                const resolutionTests = [
                    { size: '768x768', expectedCost: 0.008 },
                    { size: '1024x1024', expectedCost: 0.016 },
                    { size: '1536x1536', expectedCost: 0.032 },
                    { size: '2048x2048', expectedCost: 0.064 },
                ]

                for (const test of resolutionTests) {
                    const response = await provider.generateImage!({
                        prompt: 'Test image',
                        quality: 'auto',
                        size: test.size,
                        n: 1,
                    })

                    expect(response.metadata?.cost?.perImageCost).toBe(
                        test.expectedCost
                    )
                }
            })

            it('should handle edge case with zero tokens', async () => {
                const mockImageResponse = {
                    data: [{ b64_json: 'mock-base64' }],
                    usage: {
                        prompt_tokens: 0,
                        image_output_tokens: 0,
                        total_tokens: 0,
                    },
                }

                setupMockFetch(mockImageResponse)

                const response = await provider.generateImage!({
                    prompt: '',
                    quality: 'low',
                    n: 1,
                })

                expect(response.metadata?.usage?.inputTextTokens).toBe(0)
                expect(response.metadata?.usage?.outputImageTokens).toBe(0)
                expect(response.metadata?.cost?.inputTextCost).toBe(0)
                expect(response.metadata?.cost?.outputImageCost).toBe(0)
                expect(response.metadata?.cost?.totalCost).toBe(0.01) // Only per-image cost
            })
        })
    })
})
