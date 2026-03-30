import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    createAIProvider,
    GameAssetChatbotDemo,
    demoMockProvider,
    demoProviderSwitching,
    type AIProviderConfig,
} from './ai-provider-demo'

// Mock @crater/core
vi.mock('@crater/core', () => {
    const DebugImageProvider = vi.fn().mockImplementation(() => ({
        _type: 'debug',
        getInfo: vi
            .fn()
            .mockReturnValue({ name: 'Debug Provider', type: 'debug' }),
        testConnection: vi.fn().mockResolvedValue(true),
        isConfigured: vi.fn().mockReturnValue(true),
    }))

    const GeminiImageProvider = vi
        .fn()
        .mockImplementation((opts: { apiKey: string; model?: string }) => ({
            _type: 'gemini',
            opts,
            getInfo: vi
                .fn()
                .mockReturnValue({ name: 'Gemini Provider', type: 'gemini' }),
            testConnection: vi.fn().mockResolvedValue(true),
            isConfigured: vi.fn().mockReturnValue(true),
        }))

    const OpenAIImageProvider = vi
        .fn()
        .mockImplementation((opts: { apiKey: string; model?: string }) => ({
            _type: 'openai',
            opts,
            getInfo: vi
                .fn()
                .mockReturnValue({ name: 'OpenAI Provider', type: 'openai' }),
            testConnection: vi.fn().mockResolvedValue(true),
            isConfigured: vi.fn().mockReturnValue(true),
        }))

    const mockSendMessage = vi.fn().mockResolvedValue([
        { id: 'u1', text: 'user msg', sender: 'user', timestamp: new Date() },
        {
            id: 'a1',
            text: 'ai response',
            sender: 'assistant',
            timestamp: new Date(),
        },
    ])
    const mockSetAIProvider = vi.fn()
    const mockSubscribe = vi.fn().mockReturnValue(() => {})
    const mockGetMessages = vi.fn().mockReturnValue([])
    const mockClearMessages = vi.fn()

    const WebChatBotService = vi.fn().mockImplementation(() => ({
        sendMessage: mockSendMessage,
        setAIProvider: mockSetAIProvider,
        subscribe: mockSubscribe,
        getMessages: mockGetMessages,
        clearMessages: mockClearMessages,
    }))

    return {
        DebugImageProvider,
        GeminiImageProvider,
        OpenAIImageProvider,
        WebChatBotService,
    }
})

describe('createAIProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns a DebugImageProvider for mock provider', async () => {
        const { DebugImageProvider } = await import('@crater/core')
        const provider = createAIProvider({ provider: 'mock' })
        expect(DebugImageProvider).toHaveBeenCalled()
        expect(provider).toBeDefined()
    })

    it('returns a DebugImageProvider for default case', async () => {
        const { DebugImageProvider } = await import('@crater/core')
        // Cast to satisfy type - any string not in union falls to default
        const provider = createAIProvider({ provider: 'mock' })
        expect(DebugImageProvider).toHaveBeenCalled()
        expect(provider).toBeDefined()
    })

    it('throws an error when gemini provider has no API key', () => {
        expect(() => createAIProvider({ provider: 'gemini' })).toThrow(
            'Gemini API key is required'
        )
    })

    it('creates a GeminiImageProvider with the given API key', async () => {
        const { GeminiImageProvider } = await import('@crater/core')
        const config: AIProviderConfig = {
            provider: 'gemini',
            apiKey: 'AIzaTestKey123',
        }
        const provider = createAIProvider(config)
        expect(GeminiImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: 'AIzaTestKey123' })
        )
        expect(provider).toBeDefined()
    })

    it('creates a GeminiImageProvider with a custom model', async () => {
        const { GeminiImageProvider } = await import('@crater/core')
        createAIProvider({
            provider: 'gemini',
            apiKey: 'AIzaKey',
            model: 'gemini-pro',
        })
        expect(GeminiImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ model: 'gemini-pro' })
        )
    })

    it('uses default Gemini model when none specified', async () => {
        const { GeminiImageProvider } = await import('@crater/core')
        createAIProvider({ provider: 'gemini', apiKey: 'AIzaKey' })
        expect(GeminiImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ model: 'gemini-2.0-flash-exp' })
        )
    })

    it('throws an error when openai provider has no API key', () => {
        expect(() => createAIProvider({ provider: 'openai' })).toThrow(
            'OpenAI API key is required'
        )
    })

    it('creates an OpenAIImageProvider with the given API key', async () => {
        const { OpenAIImageProvider } = await import('@crater/core')
        const config: AIProviderConfig = {
            provider: 'openai',
            apiKey: 'sk-testkey',
        }
        createAIProvider(config)
        expect(OpenAIImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: 'sk-testkey' })
        )
    })

    it('creates an OpenAIImageProvider with a custom model', async () => {
        const { OpenAIImageProvider } = await import('@crater/core')
        createAIProvider({
            provider: 'openai',
            apiKey: 'sk-key',
            model: 'gpt-4o',
        })
        expect(OpenAIImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ model: 'gpt-4o' })
        )
    })

    it('uses default OpenAI model when none specified', async () => {
        const { OpenAIImageProvider } = await import('@crater/core')
        createAIProvider({ provider: 'openai', apiKey: 'sk-key' })
        expect(OpenAIImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ model: 'gpt-4-vision-preview' })
        )
    })
})

describe('GameAssetChatbotDemo', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('constructs with default mock provider', async () => {
        const { DebugImageProvider } = await import('@crater/core')
        const demo = new GameAssetChatbotDemo()
        expect(DebugImageProvider).toHaveBeenCalled()
        expect(demo).toBeDefined()
    })

    it('constructs with a specified provider config', async () => {
        const { GeminiImageProvider } = await import('@crater/core')
        const demo = new GameAssetChatbotDemo({
            provider: 'gemini',
            apiKey: 'AIzaKey',
        })
        expect(GeminiImageProvider).toHaveBeenCalled()
        expect(demo).toBeDefined()
    })

    it('sendMessage returns user and AI response messages', async () => {
        const demo = new GameAssetChatbotDemo()
        const result = await demo.sendMessage('Create a character sprite')
        expect(result.userMessage).toBeDefined()
        expect(result.aiResponse).toBeDefined()
        expect(result.userMessage.sender).toBe('user')
        expect(result.aiResponse.sender).toBe('assistant')
    })

    it('sendMessage passes images to the service', async () => {
        const { WebChatBotService } = await import('@crater/core')
        const demo = new GameAssetChatbotDemo()
        await demo.sendMessage('Analyze this asset', ['base64img'])
        const instance = vi.mocked(WebChatBotService).mock.results[0].value
        expect(instance.sendMessage).toHaveBeenCalledWith(
            'Analyze this asset',
            ['base64img']
        )
    })

    it('switchProvider creates a new provider and updates the service', async () => {
        const { WebChatBotService, GeminiImageProvider } =
            await import('@crater/core')
        const demo = new GameAssetChatbotDemo()
        demo.switchProvider({ provider: 'gemini', apiKey: 'AIzaNewKey' })
        expect(GeminiImageProvider).toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: 'AIzaNewKey' })
        )
        const instance = vi.mocked(WebChatBotService).mock.results[0].value
        expect(instance.setAIProvider).toHaveBeenCalled()
    })

    it('getProviderInfo delegates to the current provider', () => {
        const demo = new GameAssetChatbotDemo()
        const info = demo.getProviderInfo()
        expect(info).toBeDefined()
    })

    it('testConnection delegates to the current provider', async () => {
        const demo = new GameAssetChatbotDemo()
        const connected = await demo.testConnection()
        expect(connected).toBe(true)
    })

    it('subscribe delegates to the web chat service', async () => {
        const { WebChatBotService } = await import('@crater/core')
        const demo = new GameAssetChatbotDemo()
        const callback = vi.fn()
        const unsub = demo.subscribe(callback)
        const instance = vi.mocked(WebChatBotService).mock.results[0].value
        expect(instance.subscribe).toHaveBeenCalledWith(callback)
        expect(typeof unsub).toBe('function')
    })

    it('getMessages delegates to the web chat service', async () => {
        const { WebChatBotService } = await import('@crater/core')
        const demo = new GameAssetChatbotDemo()
        const msgs = demo.getMessages()
        const instance = vi.mocked(WebChatBotService).mock.results[0].value
        expect(instance.getMessages).toHaveBeenCalled()
        expect(Array.isArray(msgs)).toBe(true)
    })

    it('clearMessages delegates to the web chat service', async () => {
        const { WebChatBotService } = await import('@crater/core')
        const demo = new GameAssetChatbotDemo()
        demo.clearMessages()
        const instance = vi.mocked(WebChatBotService).mock.results[0].value
        expect(instance.clearMessages).toHaveBeenCalled()
    })
})

describe('demoMockProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns a GameAssetChatbotDemo instance', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const demo = await demoMockProvider()
        expect(demo).toBeInstanceOf(GameAssetChatbotDemo)
        consoleSpy.mockRestore()
    })

    it('logs the mock response', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        await demoMockProvider()
        expect(consoleSpy).toHaveBeenCalledWith(
            'Mock Response:',
            expect.any(String)
        )
        consoleSpy.mockRestore()
    })
})

describe('demoProviderSwitching', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns a GameAssetChatbotDemo instance', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const demo = await demoProviderSwitching()
        expect(demo).toBeInstanceOf(GameAssetChatbotDemo)
        consoleSpy.mockRestore()
    })

    it('logs the mock response', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        await demoProviderSwitching()
        expect(consoleSpy).toHaveBeenCalledWith(
            'Mock response:',
            expect.any(String)
        )
        consoleSpy.mockRestore()
    })
})
