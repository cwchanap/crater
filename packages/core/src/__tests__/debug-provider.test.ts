import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DebugImageProvider } from '../providers/debug-provider'

describe('DebugImageProvider', () => {
    let provider: DebugImageProvider

    beforeEach(() => {
        // Use delay: 1 (not 0) because constructor uses `config.simulateDelay || 2000`
        // which treats 0 as falsy and falls back to the 2000ms default
        provider = new DebugImageProvider({ simulateDelay: 1 })
    })

    describe('constructor', () => {
        it('uses default values when no config is provided', () => {
            const defaultProvider = new DebugImageProvider()
            const config = defaultProvider.getDebugConfig()
            expect(config.testImageUrl).toBe('/test_image.png')
            expect(config.simulateDelay).toBe(2000)
            expect(config.simulateError).toBe(false)
        })

        it('accepts custom testImageUrl', () => {
            const custom = new DebugImageProvider({
                testImageUrl: '/custom.png',
            })
            expect(custom.getDebugConfig().testImageUrl).toBe('/custom.png')
        })

        it('accepts custom simulateDelay', () => {
            const custom = new DebugImageProvider({ simulateDelay: 500 })
            expect(custom.getDebugConfig().simulateDelay).toBe(500)
        })

        it('treats simulateDelay: 0 as falsy and falls back to the 2000ms default', () => {
            // The constructor uses `config.simulateDelay || 2000`, so passing 0
            // (falsy) results in the default 2000ms delay being applied.
            const p = new DebugImageProvider({ simulateDelay: 0 })
            expect(p.getDebugConfig().simulateDelay).toBe(2000)
        })

        it('accepts custom simulateError flag', () => {
            const custom = new DebugImageProvider({ simulateError: true })
            expect(custom.getDebugConfig().simulateError).toBe(true)
        })

        it('initializes with type mock', () => {
            expect(provider.type).toBe('mock')
        })

        it('initializes with debug-image-provider as the default model', () => {
            expect(provider.defaultModel).toBe('debug-image-provider')
        })
    })

    describe('isConfigured', () => {
        it('always returns true regardless of config', () => {
            expect(provider.isConfigured()).toBe(true)
        })

        it('returns true even with an empty config', () => {
            const noKeyProvider = new DebugImageProvider({})
            expect(noKeyProvider.isConfigured()).toBe(true)
        })
    })

    describe('generateResponse', () => {
        it('returns a text response echoing the prompt', async () => {
            const response = await provider.generateResponse({
                prompt: 'test prompt',
            })
            expect(response.text).toContain('test prompt')
            expect(response.text).toContain('Debug provider')
        })

        it('returns usage with promptTokens equal to prompt length', async () => {
            const prompt = 'hello'
            const response = await provider.generateResponse({ prompt })
            expect(response.usage?.promptTokens).toBe(prompt.length)
        })

        it('returns usage with completionTokens of 50', async () => {
            const response = await provider.generateResponse({ prompt: 'hi' })
            expect(response.usage?.completionTokens).toBe(50)
        })

        it('returns usage with correct totalTokens', async () => {
            const prompt = 'hello'
            const response = await provider.generateResponse({ prompt })
            expect(response.usage?.totalTokens).toBe(prompt.length + 50)
        })

        it('includes provider metadata', async () => {
            const response = await provider.generateResponse({ prompt: 'test' })
            expect(response.metadata?.provider).toBe('debug')
            expect(response.metadata?.model).toBe('debug-text-provider')
        })
    })

    describe('generateImage', () => {
        it('returns the test image URL for each generated image', async () => {
            const response = await provider.generateImage({
                prompt: 'a dragon',
                n: 2,
            })
            expect(response.images).toHaveLength(2)
            response.images.forEach((img) => {
                expect(img.url).toBe('/test_image.png')
            })
        })

        it('sets revisedPrompt to the original prompt', async () => {
            const response = await provider.generateImage({
                prompt: 'a castle',
            })
            expect(response.images[0].revisedPrompt).toBe('a castle')
        })

        it('defaults to 1 image when n is not specified', async () => {
            const response = await provider.generateImage({ prompt: 'test' })
            expect(response.images).toHaveLength(1)
        })

        it('generates the correct number of images based on n', async () => {
            const response = await provider.generateImage({
                prompt: 'test',
                n: 3,
            })
            expect(response.images).toHaveLength(3)
        })

        it('includes usage data with correct inputTextTokens', async () => {
            const prompt = 'test'
            const response = await provider.generateImage({ prompt })
            const usage = response.metadata?.usage as {
                inputTextTokens: number
                inputImageTokens: number
                outputImageTokens: number
                totalTokens: number
            }
            expect(usage.inputTextTokens).toBe(prompt.length)
        })

        it('includes usage data with 0 inputImageTokens', async () => {
            const response = await provider.generateImage({ prompt: 'test' })
            const usage = response.metadata?.usage as {
                inputImageTokens: number
            }
            expect(usage.inputImageTokens).toBe(0)
        })

        it('computes outputImageTokens as n * 1000', async () => {
            const response = await provider.generateImage({
                prompt: 'test',
                n: 2,
            })
            const usage = response.metadata?.usage as {
                outputImageTokens: number
            }
            expect(usage.outputImageTokens).toBe(2000)
        })

        it('includes cost with perImageCost of 0.01', async () => {
            const response = await provider.generateImage({ prompt: 'test' })
            const cost = response.metadata?.cost as { perImageCost: number }
            expect(cost.perImageCost).toBe(0.01)
        })

        it('computes totalCost as n * 0.01', async () => {
            const response = await provider.generateImage({
                prompt: 'test',
                n: 3,
            })
            const cost = response.metadata?.cost as { totalCost: number }
            expect(cost.totalCost).toBeCloseTo(0.03)
        })

        it('includes currency USD in cost', async () => {
            const response = await provider.generateImage({ prompt: 'test' })
            const cost = response.metadata?.cost as { currency: string }
            expect(cost.currency).toBe('USD')
        })

        it('includes provider and model in metadata', async () => {
            const response = await provider.generateImage({ prompt: 'test' })
            expect(response.metadata?.provider).toBe('debug')
            expect(response.metadata?.model).toBe('debug-image-provider')
        })

        it('includes finishReason stop in metadata', async () => {
            const response = await provider.generateImage({ prompt: 'test' })
            expect(response.metadata?.finishReason).toBe('stop')
        })

        it('includes a timestamp in metadata', async () => {
            const before = new Date().toISOString()
            const response = await provider.generateImage({ prompt: 'test' })
            const after = new Date().toISOString()
            const timestamp = response.metadata?.timestamp as string
            expect(timestamp >= before).toBe(true)
            expect(timestamp <= after).toBe(true)
        })

        it('uses size from the request in metadata', async () => {
            const response = await provider.generateImage({
                prompt: 'test',
                size: '512x512',
            })
            expect(response.metadata?.size).toBe('512x512')
        })

        it('defaults to 1024x1024 when size is not specified', async () => {
            const response = await provider.generateImage({ prompt: 'test' })
            expect(response.metadata?.size).toBe('1024x1024')
        })

        it('uses quality from the request in metadata', async () => {
            const response = await provider.generateImage({
                prompt: 'test',
                quality: 'high',
            })
            expect(response.metadata?.quality).toBe('high')
        })

        it('throws a simulated error when simulateError is true', async () => {
            provider = new DebugImageProvider({
                simulateDelay: 1,
                simulateError: true,
            })
            await expect(
                provider.generateImage({ prompt: 'test' })
            ).rejects.toThrow('Simulated error for testing')
        })

        it('respects a custom testImageUrl when generating images', async () => {
            const customProvider = new DebugImageProvider({
                simulateDelay: 1,
                testImageUrl: '/my-custom-image.png',
            })
            const response = await customProvider.generateImage({
                prompt: 'test',
            })
            expect(response.images[0].url).toBe('/my-custom-image.png')
        })

        it('simulates delay when simulateDelay > 0', async () => {
            vi.useFakeTimers()
            try {
                const delayedProvider = new DebugImageProvider({
                    simulateDelay: 10,
                })
                let resolved = false
                const imagePromise = delayedProvider.generateImage({
                    prompt: 'test',
                })
                imagePromise.then(() => {
                    resolved = true
                })

                // Advance less than the delay — promise must still be pending
                vi.advanceTimersByTime(5)
                expect(resolved).toBe(false)

                // Advance past the delay — promise should now resolve
                vi.advanceTimersByTime(5)
                const response = await imagePromise
                expect(resolved).toBe(true)
                expect(response.images).toHaveLength(1)
            } finally {
                vi.useRealTimers()
            }
        })
    })

    describe('setTestImageUrl', () => {
        it('updates the test image URL', () => {
            provider.setTestImageUrl('/new-image.png')
            expect(provider.getDebugConfig().testImageUrl).toBe(
                '/new-image.png'
            )
        })

        it('reflects the new URL in getDebugConfig after setting', () => {
            provider.setTestImageUrl('/updated.png')
            expect(provider.getDebugConfig().testImageUrl).toBe('/updated.png')
        })
    })

    describe('setSimulateError', () => {
        it('enables error simulation', () => {
            provider.setSimulateError(true)
            expect(provider.getDebugConfig().simulateError).toBe(true)
        })

        it('disables error simulation', () => {
            provider.setSimulateError(true)
            provider.setSimulateError(false)
            expect(provider.getDebugConfig().simulateError).toBe(false)
        })
    })

    describe('setSimulateDelay', () => {
        it('updates the simulated delay', () => {
            provider.setSimulateDelay(750)
            expect(provider.getDebugConfig().simulateDelay).toBe(750)
        })

        it('can set delay to 0 to disable it', () => {
            provider.setSimulateDelay(0)
            expect(provider.getDebugConfig().simulateDelay).toBe(0)
        })
    })

    describe('getDebugConfig', () => {
        it('returns all three configuration properties', () => {
            const config = provider.getDebugConfig()
            expect(config).toHaveProperty('testImageUrl')
            expect(config).toHaveProperty('simulateDelay')
            expect(config).toHaveProperty('simulateError')
        })

        it('reflects all mutations accurately', () => {
            provider.setTestImageUrl('/foo.png')
            provider.setSimulateDelay(123)
            provider.setSimulateError(true)
            const config = provider.getDebugConfig()
            expect(config.testImageUrl).toBe('/foo.png')
            expect(config.simulateDelay).toBe(123)
            expect(config.simulateError).toBe(true)
        })
    })
})
