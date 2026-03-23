import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    GeminiImageProvider,
    OpenAIImageProvider,
    DebugImageProvider,
} from '@crater/core'
import {
    getDefaultModel,
    isValidApiKey,
    normalizeModel,
    createProviderForMode,
    DEFAULT_MODELS,
} from './aiProviderConfig'

vi.mock('@crater/core', () => {
    const DebugImageProvider = vi.fn().mockImplementation((opts: unknown) => ({
        _type: 'debug',
        opts,
    }))
    const GeminiImageProvider = vi.fn().mockImplementation((opts: unknown) => ({
        _type: 'gemini',
        opts,
    }))
    const OpenAIImageProvider = vi.fn().mockImplementation((opts: unknown) => ({
        _type: 'openai',
        opts,
    }))
    return { DebugImageProvider, GeminiImageProvider, OpenAIImageProvider }
})

describe('DEFAULT_MODELS', () => {
    it('has models for all providers and modes', () => {
        expect(DEFAULT_MODELS.gemini.chat).toBeTruthy()
        expect(DEFAULT_MODELS.gemini.image).toBeTruthy()
        expect(DEFAULT_MODELS.openai.chat).toBeTruthy()
        expect(DEFAULT_MODELS.openai.image).toBeTruthy()
        expect(DEFAULT_MODELS.debug.chat).toBeTruthy()
        expect(DEFAULT_MODELS.debug.image).toBeTruthy()
    })
})

describe('getDefaultModel', () => {
    it('returns the default chat model for gemini', () => {
        expect(getDefaultModel('gemini', 'chat')).toBe(
            DEFAULT_MODELS.gemini.chat
        )
    })

    it('returns the default image model for gemini', () => {
        expect(getDefaultModel('gemini', 'image')).toBe(
            DEFAULT_MODELS.gemini.image
        )
    })

    it('returns the default chat model for openai', () => {
        expect(getDefaultModel('openai', 'chat')).toBe(
            DEFAULT_MODELS.openai.chat
        )
    })

    it('returns the default image model for openai', () => {
        expect(getDefaultModel('openai', 'image')).toBe(
            DEFAULT_MODELS.openai.image
        )
    })

    it('returns the default model for debug provider', () => {
        expect(getDefaultModel('debug', 'chat')).toBe(DEFAULT_MODELS.debug.chat)
        expect(getDefaultModel('debug', 'image')).toBe(
            DEFAULT_MODELS.debug.image
        )
    })
})

describe('isValidApiKey', () => {
    it('returns true for any key when provider is debug', () => {
        expect(isValidApiKey('debug', '')).toBe(true)
        expect(isValidApiKey('debug', 'whatever')).toBe(true)
    })

    it('returns false for empty key when provider is gemini', () => {
        expect(isValidApiKey('gemini', '')).toBe(false)
    })

    it('returns true for gemini keys starting with AIza', () => {
        expect(isValidApiKey('gemini', 'AIzaSyABCDEFGHIJKLMNOP')).toBe(true)
    })

    it('returns false for gemini keys not starting with AIza', () => {
        expect(isValidApiKey('gemini', 'sk-somekey')).toBe(false)
        expect(isValidApiKey('gemini', 'Bearer token')).toBe(false)
    })

    it('returns false for empty key when provider is openai', () => {
        expect(isValidApiKey('openai', '')).toBe(false)
    })

    it('returns true for openai keys starting with sk-', () => {
        expect(isValidApiKey('openai', 'sk-abc123')).toBe(true)
    })

    it('returns false for openai keys not starting with sk-', () => {
        expect(isValidApiKey('openai', 'AIzaXXX')).toBe(false)
        expect(isValidApiKey('openai', 'my-api-key')).toBe(false)
    })
})

describe('normalizeModel', () => {
    it('returns the default model when model is undefined', () => {
        expect(normalizeModel('gemini', 'chat', undefined)).toBe(
            DEFAULT_MODELS.gemini.chat
        )
    })

    it('returns the default model when model is empty string', () => {
        expect(normalizeModel('openai', 'image', '')).toBe(
            DEFAULT_MODELS.openai.image
        )
    })

    it('returns the provided model when given', () => {
        expect(normalizeModel('gemini', 'chat', 'gemini-pro')).toBe(
            'gemini-pro'
        )
        expect(normalizeModel('openai', 'image', 'dall-e-3')).toBe('dall-e-3')
    })
})

describe('createProviderForMode', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns a DebugImageProvider for debug provider', () => {
        const provider = createProviderForMode('debug', 'chat', {})
        expect(provider).not.toBeNull()
        expect(DebugImageProvider).toHaveBeenCalled()
    })

    it('returns null for gemini provider without api key', () => {
        const provider = createProviderForMode('gemini', 'chat', {})
        expect(provider).toBeNull()
    })

    it('returns null for openai provider without api key', () => {
        const provider = createProviderForMode('openai', 'image', {})
        expect(provider).toBeNull()
    })

    it('creates a GeminiImageProvider with a valid api key', () => {
        createProviderForMode('gemini', 'chat', { apiKey: 'AIzaTestKey' })
        expect(GeminiImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: 'AIzaTestKey' })
        )
    })

    it('creates an OpenAIImageProvider with a valid api key', () => {
        createProviderForMode('openai', 'image', { apiKey: 'sk-test123' })
        expect(OpenAIImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: 'sk-test123' })
        )
    })

    it('uses the provided model instead of the default', () => {
        createProviderForMode('gemini', 'chat', {
            apiKey: 'AIzaKey',
            model: 'custom-model',
        })
        expect(GeminiImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ model: 'custom-model' })
        )
    })

    it('uses the default model when none provided', () => {
        createProviderForMode('gemini', 'image', { apiKey: 'AIzaKey' })
        expect(GeminiImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ model: DEFAULT_MODELS.gemini.image })
        )
    })

    it('passes imageQuality and imageSize to OpenAIImageProvider', () => {
        createProviderForMode('openai', 'image', {
            apiKey: 'sk-key',
            imageQuality: 'hd',
            imageSize: '1024x1024',
        })
        expect(OpenAIImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({
                defaultImageQuality: 'hd',
                defaultImageSize: '1024x1024',
            })
        )
    })
})
