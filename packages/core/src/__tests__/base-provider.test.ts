import { describe, it, expect, beforeEach } from 'vitest'
import { AIGenerationRequest } from '../base-provider'
import { MockImageProvider } from './test-utils'

describe('BaseImageModelProvider', () => {
    let provider: MockImageProvider

    beforeEach(() => {
        provider = new MockImageProvider({
            apiKey: 'test-api-key',
            model: 'test-model',
        })
    })

    describe('constructor', () => {
        it('should initialize with correct type and default model', () => {
            expect(provider.type).toBe('mock')
            expect(provider.defaultModel).toBe('mock-model-v1')
        })

        it('should accept configuration options', () => {
            const config = {
                apiKey: 'test-key',
                model: 'custom-model',
                endpoint: 'https://custom.endpoint',
            }
            const customProvider = new MockImageProvider(config)
            expect(customProvider.getModel()).toBe('custom-model')
        })

        it('should work with empty config', () => {
            const emptyProvider = new MockImageProvider()
            expect(emptyProvider.getModel()).toBe('mock-model-v1')
            expect(emptyProvider.isConfigured()).toBe(false)
        })
    })

    describe('getModel', () => {
        it('should return configured model when set', () => {
            expect(provider.getModel()).toBe('test-model')
        })

        it('should return default model when no model configured', () => {
            const providerNoModel = new MockImageProvider({ apiKey: 'test' })
            expect(providerNoModel.getModel()).toBe('mock-model-v1')
        })
    })

    describe('updateConfig', () => {
        it('should merge new config with existing config', () => {
            provider.updateConfig({ endpoint: 'https://new.endpoint' })
            expect(provider.getModel()).toBe('test-model') // existing config preserved
        })

        it('should override existing config values', () => {
            provider.updateConfig({ model: 'updated-model' })
            expect(provider.getModel()).toBe('updated-model')
        })

        it('should handle partial config updates', () => {
            const originalConfig = provider.getInfo()
            provider.updateConfig({ defaultImageSize: '512x512' })
            expect(provider.getModel()).toBe(originalConfig.model)
            expect(provider.isConfigured()).toBe(originalConfig.configured)
        })
    })

    describe('getInfo', () => {
        it('should return provider information', () => {
            const info = provider.getInfo()
            expect(info).toEqual({
                type: 'mock',
                model: 'test-model',
                configured: true,
            })
        })

        it('should reflect configuration status', () => {
            const unconfiguredProvider = new MockImageProvider()
            const info = unconfiguredProvider.getInfo()
            expect(info.configured).toBe(false)
        })
    })

    describe('testConnection', () => {
        it('should return true by default', async () => {
            const result = await provider.testConnection()
            expect(result).toBe(true)
        })
    })

    describe('generateResponse', () => {
        it('should generate response successfully', async () => {
            const request: AIGenerationRequest = {
                prompt: 'Test prompt',
                maxTokens: 100,
            }

            const response = await provider.generateResponse(request)

            expect(response).toEqual({
                text: 'Mock response',
                usage: {
                    promptTokens: 10,
                    completionTokens: 20,
                    totalTokens: 30,
                },
            })
        })

        it('should handle errors appropriately', async () => {
            provider.setShouldThrowError(true)

            const request: AIGenerationRequest = {
                prompt: 'Test prompt',
            }

            await expect(provider.generateResponse(request)).rejects.toThrow(
                'Mock error'
            )
        })

        it('should accept complex generation requests', async () => {
            const complexRequest: AIGenerationRequest = {
                prompt: 'Complex prompt',
                systemPrompt: 'You are a helpful assistant',
                maxTokens: 200,
                temperature: 0.8,
                images: ['base64-image-data'],
            }

            const response = await provider.generateResponse(complexRequest)
            expect(response.text).toBe('Mock response')
        })

        it('should handle network errors gracefully', async () => {
            provider.setShouldThrowError(true)

            const request: AIGenerationRequest = { prompt: 'test' }

            await expect(provider.generateResponse(request)).rejects.toThrow()
        })

        it('should handle empty response scenarios', async () => {
            provider.setMockResponse({
                text: '',
                usage: { promptTokens: 1, completionTokens: 0, totalTokens: 1 },
            })

            const response = await provider.generateResponse({ prompt: 'test' })
            expect(response.text).toBe('')
        })
    })

    describe('isConfigured', () => {
        it('should return true when API key is provided', () => {
            expect(provider.isConfigured()).toBe(true)
        })

        it('should return false when API key is missing', () => {
            const unconfiguredProvider = new MockImageProvider({})
            expect(unconfiguredProvider.isConfigured()).toBe(false)
        })

        it('should validate empty API key as not configured', () => {
            const emptyKeyProvider = new MockImageProvider({ apiKey: '' })
            expect(emptyKeyProvider.isConfigured()).toBe(false)
        })

        it('should validate null/undefined API key as not configured', () => {
            const nullKeyProvider = new MockImageProvider({
                apiKey: null as unknown as string,
            })
            expect(nullKeyProvider.isConfigured()).toBe(false)
        })
    })

    describe('image generation (when supported)', () => {
        it('should generate images when provider supports it', async () => {
            const request = {
                prompt: 'A test image',
                size: '1024x1024' as const,
            }

            const response = await provider.generateImage!(request)

            expect(response.images).toHaveLength(1)
            expect(response.images[0].base64).toBe('mock-base64-data')
        })

        it('should handle image generation errors', async () => {
            provider.setShouldThrowError(true)

            await expect(
                provider.generateImage!({ prompt: 'test' })
            ).rejects.toThrow('Mock image generation error')
        })
    })
})
