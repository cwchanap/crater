import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ExtensionContext } from 'vscode'
import {
    mockVSCode,
    createMockExtensionContext,
    createMockWebviewView,
    resetAllMocks,
    fsMock,
    pathMock,
} from './test-utils'

import { ChatbotProvider } from '../chatbotProvider'

describe('ChatbotProvider._getHtmlForWebview', () => {
    let provider: ChatbotProvider
    let mockContext: ExtensionContext
    let mockWebview: ReturnType<typeof createMockWebview>

    function createMockWebview() {
        return {
            cspSource: 'vscode-webview-resource:',
            asWebviewUri: (uri: { fsPath: string }) => ({
                toString: () => `vscode-webview://resource${uri.fsPath}`,
            }),
            html: '',
            options: {},
            onDidReceiveMessage: mockVSCode.window.showInformationMessage,
            postMessage: mockVSCode.window.showInformationMessage,
        }
    }

    beforeEach(() => {
        resetAllMocks()
        mockContext = createMockExtensionContext()
        mockWebview = createMockWebview()

        // path.join needs to return something for the html path lookup
        pathMock.join.mockReturnValue('/test/extension/src/webview.html')

        provider = new ChatbotProvider(
            mockVSCode.Uri.file('/test/extension'),
            mockContext
        )
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should replace all template placeholders', () => {
        fsMock.readFileSync.mockReturnValue(
            '{{NONCE}} {{CSP_SOURCE}} {{SCRIPT_URI}} {{CSS_URI}}'
        )

        const html = (provider as any)._getHtmlForWebview(mockWebview)

        expect(html).not.toContain('{{NONCE}}')
        expect(html).not.toContain('{{CSP_SOURCE}}')
        expect(html).not.toContain('{{SCRIPT_URI}}')
        expect(html).not.toContain('{{CSS_URI}}')
        expect(html.length).toBeGreaterThan(0)
    })

    it('should return fallback HTML with HTML-escaped error when template file is missing', () => {
        fsMock.readFileSync.mockImplementation(() => {
            throw new Error('<script>alert(1)</script>')
        })

        const html = (provider as any)._getHtmlForWebview(mockWebview)

        expect(html).toContain('&lt;script&gt;')
        expect(html).not.toContain('<script>alert(1)</script>')
        expect(html).toContain('Error Loading Webview')
    })
})

// ---------------------------------------------------------------------------
// Helper: build a provider with a consistent workspace config mock
// ---------------------------------------------------------------------------
function makeProviderWithConfig(
    configOverrides: Record<string, unknown> = {}
): {
    provider: ChatbotProvider
    mockContext: ExtensionContext
    configGetMock: ReturnType<typeof vi.fn>
} {
    resetAllMocks()
    pathMock.join.mockReturnValue('/test/extension/src/webview.html')

    const defaults: Record<string, unknown> = {
        aiProvider: 'gemini',
        aiModel: 'gemini-2.5-flash-image-preview',
        geminiApiKey: '',
        openaiApiKey: '',
        imageSaveDirectory: '${workspaceFolder}/images',
        autoSaveImages: true,
        imageSize: 'auto',
        imageQuality: 'auto',
        ...configOverrides,
    }

    const configGetMock = vi.fn((key: string, defaultValue?: unknown) => {
        // Return stored value only when it is not undefined; otherwise fall
        // through to the defaultValue so callers receive their specified default.
        if (key in defaults && defaults[key] !== undefined) {
            return defaults[key]
        }
        return defaultValue
    })

    mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: configGetMock,
        update: vi.fn().mockResolvedValue(undefined),
        has: vi.fn(),
        inspect: vi.fn(),
    })

    const mockContext = createMockExtensionContext()
    const provider = new ChatbotProvider(
        mockVSCode.Uri.file('/test/extension'),
        mockContext
    )

    return { provider, mockContext, configGetMock }
}

// ---------------------------------------------------------------------------
// generateSessionTitle
// ---------------------------------------------------------------------------
describe('ChatbotProvider.generateSessionTitle', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should return a date-based title when messages array is empty', () => {
        const title = (provider as any).generateSessionTitle([])
        expect(title).toMatch(/^Chat /)
    })

    it('should use the first user message as the title base', () => {
        const messages = [
            {
                id: '1',
                text: 'Make me a dragon',
                sender: 'user',
                timestamp: new Date().toISOString(),
            },
        ]
        const title = (provider as any).generateSessionTitle(messages)
        expect(title).toContain('Make me a dragon')
    })

    it('should truncate long user messages and append ellipsis', () => {
        const longText = 'a'.repeat(50)
        const messages = [
            {
                id: '1',
                text: longText,
                sender: 'user',
                timestamp: new Date().toISOString(),
            },
        ]
        const title = (provider as any).generateSessionTitle(messages)
        expect(title.endsWith('...')).toBe(true)
        expect(title.length).toBeLessThan(longText.length + 5)
    })

    it('should not truncate short messages', () => {
        const shortText = 'Hi'
        const messages = [
            {
                id: '1',
                text: shortText,
                sender: 'user',
                timestamp: new Date().toISOString(),
            },
        ]
        const title = (provider as any).generateSessionTitle(messages)
        expect(title).toBe('Hi')
        expect(title.endsWith('...')).toBe(false)
    })

    it('should skip assistant messages when looking for title base', () => {
        const messages = [
            {
                id: '1',
                text: 'I am an assistant',
                sender: 'assistant',
                timestamp: new Date().toISOString(),
            },
            {
                id: '2',
                text: 'User request',
                sender: 'user',
                timestamp: new Date().toISOString(),
            },
        ]
        const title = (provider as any).generateSessionTitle(messages)
        expect(title).toContain('User request')
    })

    it('should fall back to a date title when all messages are from assistant', () => {
        const messages = [
            {
                id: '1',
                text: 'Hello from assistant',
                sender: 'assistant',
                timestamp: new Date().toISOString(),
            },
        ]
        const title = (provider as any).generateSessionTitle(messages)
        expect(title).toMatch(/^Chat /)
    })
})

// ---------------------------------------------------------------------------
// generateSessionId / generateMessageId
// ---------------------------------------------------------------------------
describe('ChatbotProvider.generateSessionId and generateMessageId', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('generateSessionId should start with "session_"', () => {
        const id = (provider as any).generateSessionId()
        expect(id).toMatch(/^session_/)
    })

    it('generateSessionId should produce unique IDs', () => {
        const id1 = (provider as any).generateSessionId()
        const id2 = (provider as any).generateSessionId()
        expect(id1).not.toBe(id2)
    })

    it('generateMessageId should return a non-empty string', () => {
        const id = (provider as any).generateMessageId()
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
    })

    it('generateMessageId should produce unique IDs', () => {
        const id1 = (provider as any).generateMessageId()
        const id2 = (provider as any).generateMessageId()
        expect(id1).not.toBe(id2)
    })
})

// ---------------------------------------------------------------------------
// isValidApiKey
// ---------------------------------------------------------------------------
describe('ChatbotProvider.isValidApiKey', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should return false for an empty key', () => {
        expect((provider as any).isValidApiKey('', 'gemini')).toBe(false)
    })

    it('should return false for a whitespace-only key', () => {
        expect((provider as any).isValidApiKey('   ', 'gemini')).toBe(false)
    })

    it('should return false for a key shorter than 20 characters', () => {
        expect((provider as any).isValidApiKey('AIzaShort', 'gemini')).toBe(
            false
        )
    })

    it('should return false for a Gemini key not starting with "AIza"', () => {
        const longKey = 'BADPREFIX_' + 'x'.repeat(20)
        expect((provider as any).isValidApiKey(longKey, 'gemini')).toBe(false)
    })

    it('should return true for a valid Gemini key', () => {
        const validGeminiKey = 'AIza' + 'x'.repeat(20)
        expect((provider as any).isValidApiKey(validGeminiKey, 'gemini')).toBe(
            true
        )
    })

    it('should return false for an OpenAI key not starting with "sk-"', () => {
        const longKey = 'WRONGPREFIX' + 'x'.repeat(20)
        expect((provider as any).isValidApiKey(longKey, 'openai')).toBe(false)
    })

    it('should return true for a valid OpenAI key', () => {
        const validOpenAIKey = 'sk-' + 'x'.repeat(20)
        expect((provider as any).isValidApiKey(validOpenAIKey, 'openai')).toBe(
            true
        )
    })

    it('should return true for an unknown provider when key is long enough', () => {
        const longKey = 'somekey_' + 'x'.repeat(20)
        expect(
            (provider as any).isValidApiKey(longKey, 'unknown-provider')
        ).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// getExtensionSettings
// ---------------------------------------------------------------------------
describe('ChatbotProvider.getExtensionSettings', () => {
    afterEach(() => {
        resetAllMocks()
    })

    it('should return settings with correct values from configuration', () => {
        const { provider } = makeProviderWithConfig({
            aiProvider: 'openai',
            aiModel: 'gpt-image-1',
            geminiApiKey: 'AIza_gem_key_here_1234567',
            openaiApiKey: 'sk-openai-key-here-1234567',
            imageSaveDirectory: '/custom/path',
            autoSaveImages: false,
            imageSize: '1024x1024',
            imageQuality: 'hd',
        })

        const settings = (provider as any).getExtensionSettings()

        expect(settings.aiProvider).toBe('openai')
        expect(settings.aiModel).toBe('gpt-image-1')
        expect(settings.geminiApiKey).toBe('AIza_gem_key_here_1234567')
        expect(settings.openaiApiKey).toBe('sk-openai-key-here-1234567')
        expect(settings.imageSaveDirectory).toBe('/custom/path')
        expect(settings.autoSaveImages).toBe(false)
        expect(settings.imageSize).toBe('1024x1024')
        expect(settings.imageQuality).toBe('hd')

        provider.dispose?.()
    })

    it('should default aiProvider to "gemini" when an unknown value is returned', () => {
        const { provider } = makeProviderWithConfig({ aiProvider: 'unknown' })
        const settings = (provider as any).getExtensionSettings()
        expect(settings.aiProvider).toBe('gemini')
        provider.dispose?.()
    })

    it('should default aiModel for gemini when not set', () => {
        const { provider } = makeProviderWithConfig({
            aiProvider: 'gemini',
            aiModel: undefined,
        })
        const settings = (provider as any).getExtensionSettings()
        expect(settings.aiModel).toBe('gemini-2.5-flash-image-preview')
        provider.dispose?.()
    })
})

// ---------------------------------------------------------------------------
// notifySettingsChanged
// ---------------------------------------------------------------------------
describe('ChatbotProvider.notifySettingsChanged', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should post a settings message to the webview when the view exists', () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        provider.notifySettingsChanged()

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'settings' })
        )
    })

    it('should do nothing when no view is set', () => {
        ;(provider as any)._view = undefined

        // Should not throw
        expect(() => provider.notifySettingsChanged()).not.toThrow()
    })
})

// ---------------------------------------------------------------------------
// refreshWebview
// ---------------------------------------------------------------------------
describe('ChatbotProvider.refreshWebview', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        pathMock.join.mockReturnValue('/test/extension/src/webview.html')
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should update webview HTML when a view is present', () => {
        fsMock.readFileSync.mockReturnValue(
            '{{NONCE}} {{CSP_SOURCE}} {{SCRIPT_URI}} {{CSS_URI}}'
        )
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        provider.refreshWebview()

        expect(mockView.webview.html.length).toBeGreaterThan(0)
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
            expect.stringContaining('refreshed')
        )
    })

    it('should show a warning when no view is set', () => {
        ;(provider as any)._view = undefined

        provider.refreshWebview()

        expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith(
            expect.stringContaining('No webview')
        )
    })
})

// ---------------------------------------------------------------------------
// toggleSaving
// ---------------------------------------------------------------------------
describe('ChatbotProvider.toggleSaving', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should disable saving when it is currently enabled', () => {
        ;(provider as any)._savingDisabled = false
        provider.toggleSaving()
        expect((provider as any)._savingDisabled).toBe(true)
    })

    it('should re-enable saving when it is currently disabled', () => {
        ;(provider as any)._savingDisabled = true
        provider.toggleSaving()
        expect((provider as any)._savingDisabled).toBe(false)
    })

    it('should show an information message indicating the new state', () => {
        ;(provider as any)._savingDisabled = false
        provider.toggleSaving()
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
            expect.stringContaining('DISABLED')
        )
    })
})

// ---------------------------------------------------------------------------
// addMessageToHistory
// ---------------------------------------------------------------------------
describe('ChatbotProvider.addMessageToHistory', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
        ;(provider as any)._extendedChatHistory = []
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should append a text message to _extendedChatHistory', () => {
        ;(provider as any).addMessageToHistory('hello', 'user', 'text')
        const history = (provider as any)._extendedChatHistory
        expect(history).toHaveLength(1)
        expect(history[0].text).toBe('hello')
        expect(history[0].sender).toBe('user')
        expect(history[0].messageType).toBe('text')
    })

    it('should generate a unique id and a valid timestamp for each message', () => {
        ;(provider as any).addMessageToHistory('msg1', 'assistant', 'text')
        ;(provider as any).addMessageToHistory('msg2', 'user', 'text')
        const history = (provider as any)._extendedChatHistory
        expect(history[0].id).not.toBe(history[1].id)
        expect(() => new Date(history[0].timestamp)).not.toThrow()
    })

    it('should store imageData on image messages', () => {
        const imageData = {
            images: ['data:image/png;base64,abc'],
            prompt: 'dragon',
            savedPaths: ['/tmp/dragon.png'],
        }
        ;(provider as any).addMessageToHistory(
            'Generated image',
            'assistant',
            'image',
            imageData
        )
        const history = (provider as any)._extendedChatHistory
        expect(history[0].imageData).toBeDefined()
        expect(history[0].imageData.prompt).toBe('dragon')
    })
})

// ---------------------------------------------------------------------------
// convertFilePathsToWebviewUris
// ---------------------------------------------------------------------------
describe('ChatbotProvider.convertFilePathsToWebviewUris', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should return text messages unchanged', () => {
        const messages = [
            {
                id: '1',
                text: 'hello',
                sender: 'user' as const,
                timestamp: new Date().toISOString(),
                messageType: 'text' as const,
            },
        ]
        const result = (provider as any).convertFilePathsToWebviewUris(messages)
        expect(result[0].text).toBe('hello')
        expect(result[0].imageData).toBeUndefined()
    })

    it('should convert savedPaths to webview URIs for image messages when a view is active', () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        const messages = [
            {
                id: '2',
                text: 'image',
                sender: 'assistant' as const,
                timestamp: new Date().toISOString(),
                messageType: 'image' as const,
                imageData: {
                    images: [],
                    prompt: 'test',
                    savedPaths: ['/tmp/img1.png', '/tmp/img2.png'],
                },
            },
        ]
        const result = (provider as any).convertFilePathsToWebviewUris(messages)
        expect(result[0].imageData?.images).toHaveLength(2)
    })

    it('should return an empty images array when savedPaths is empty', () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        const messages = [
            {
                id: '3',
                text: 'image no paths',
                sender: 'assistant' as const,
                timestamp: new Date().toISOString(),
                messageType: 'image' as const,
                imageData: { images: [], prompt: 'test', savedPaths: [] },
            },
        ]
        const result = (provider as any).convertFilePathsToWebviewUris(messages)
        expect(result[0].imageData?.images).toHaveLength(0)
    })
})

// ---------------------------------------------------------------------------
// dispose
// ---------------------------------------------------------------------------
describe('ChatbotProvider.dispose', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    it('should dispose the file watcher when present', () => {
        const mockDisposable = { dispose: vi.fn() }
        ;(provider as any)._fileWatcher = mockDisposable
        ;(provider as any)._cssWatcher = { dispose: vi.fn() }

        provider.dispose()

        expect(mockDisposable.dispose).toHaveBeenCalled()
    })

    it('should not throw when no watchers are set', () => {
        ;(provider as any)._fileWatcher = undefined
        ;(provider as any)._cssWatcher = undefined
        expect(() => provider.dispose()).not.toThrow()
    })
})

// ---------------------------------------------------------------------------
// _handleMessage
// ---------------------------------------------------------------------------
describe('ChatbotProvider._handleMessage', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should return early without a view', async () => {
        ;(provider as any)._view = undefined
        // Should not throw regardless of message type
        await expect(
            (provider as any)._handleMessage({ type: 'get-settings' })
        ).resolves.toBeUndefined()
    })

    it('should post settings in response to "get-settings"', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await (provider as any)._handleMessage({ type: 'get-settings' })

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'settings' })
        )
    })

    it('should post provider-info in response to "get-provider-info"', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await (provider as any)._handleMessage({ type: 'get-provider-info' })

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'provider-info',
                configured: false,
            })
        )
    })

    it('should post chat-sessions in response to "get-chat-sessions"', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView
        ;(provider as any)._chatSessions = []
        ;(provider as any)._currentSessionId = null

        await (provider as any)._handleMessage({ type: 'get-chat-sessions' })

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'chat-sessions', sessions: [] })
        )
    })

    it('should post chat-cleared in response to "new-chat"', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView
        // Disable saving to avoid workspace.fs interactions
        ;(provider as any)._savingDisabled = true

        await (provider as any)._handleMessage({ type: 'new-chat' })

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'chat-cleared' })
        )
    })

    it('should respond with configure message when "chat-message" is sent with no provider', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView
        ;(provider as any).currentProvider = null

        await (provider as any)._handleMessage({
            type: 'chat-message',
            text: 'create a dragon',
        })

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'chat-response',
                response: expect.stringContaining('API key'),
            })
        )
    })

    it('should respond with configure message when "send-message" is sent with no provider', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView
        ;(provider as any).currentProvider = null

        await (provider as any)._handleMessage({
            type: 'send-message',
            message: 'hello',
        })

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'chat-response',
                response: expect.stringContaining('API key'),
            })
        )
    })

    it('should ignore "switch-provider" with an invalid provider value', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await expect(
            (provider as any)._handleMessage({
                type: 'switch-provider',
                provider: 'invalid-provider',
            })
        ).resolves.toBeUndefined()
    })

    it('should ignore "switch-provider" when provider is missing', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await expect(
            (provider as any)._handleMessage({
                type: 'switch-provider',
                provider: null,
            })
        ).resolves.toBeUndefined()
    })

    it('should open an image via vscode.open for "open-image"', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await (provider as any)._handleMessage({
            type: 'open-image',
            path: '/tmp/test.png',
        })

        expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
            'vscode.open',
            expect.anything()
        )
    })

    it('should do nothing for "open-image" when path is missing', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await expect(
            (provider as any)._handleMessage({ type: 'open-image', path: '' })
        ).resolves.toBeUndefined()
    })

    it('should silently handle unknown message types', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await expect(
            (provider as any)._handleMessage({ type: 'unknown-type' })
        ).resolves.toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// updateAIProvider
// ---------------------------------------------------------------------------
describe('ChatbotProvider.updateAIProvider', () => {
    let provider: ChatbotProvider

    beforeEach(() => {
        ;({ provider } = makeProviderWithConfig())
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should post provider-updated to the webview after updating', async () => {
        const mockView = createMockWebviewView()
        ;(provider as any)._view = mockView

        await provider.updateAIProvider()

        expect(mockView.webview.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'provider-updated' })
        )
    })

    it('should not throw when no view is set', async () => {
        ;(provider as any)._view = undefined
        await expect(provider.updateAIProvider()).resolves.toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// initializeAIProvider – provider selection logic
// ---------------------------------------------------------------------------
describe('ChatbotProvider.initializeAIProvider', () => {
    afterEach(() => {
        resetAllMocks()
    })

    it('should leave currentProvider null when no valid API key is set for gemini', async () => {
        const { provider } = makeProviderWithConfig({
            aiProvider: 'gemini',
            geminiApiKey: '',
        })
        await (provider as any).initializeAIProvider()
        expect((provider as any).currentProvider).toBeNull()
        provider.dispose?.()
    })

    it('should create a GeminiImageProvider when a valid gemini key is provided', async () => {
        const { provider } = makeProviderWithConfig({
            aiProvider: 'gemini',
            geminiApiKey: 'AIza' + 'x'.repeat(20),
        })
        await (provider as any).initializeAIProvider()
        expect((provider as any).currentProvider).not.toBeNull()
        expect((provider as any).currentProvider?.type).toBe('gemini')
        provider.dispose?.()
    })

    it('should create an OpenAIImageProvider when a valid openai key is provided', async () => {
        const { provider } = makeProviderWithConfig({
            aiProvider: 'openai',
            openaiApiKey: 'sk-' + 'x'.repeat(20),
        })
        await (provider as any).initializeAIProvider()
        expect((provider as any).currentProvider).not.toBeNull()
        expect((provider as any).currentProvider?.type).toBe('openai')
        provider.dispose?.()
    })

    it('should leave currentProvider null when openai key is invalid', async () => {
        const { provider } = makeProviderWithConfig({
            aiProvider: 'openai',
            openaiApiKey: 'bad-key',
        })
        await (provider as any).initializeAIProvider()
        expect((provider as any).currentProvider).toBeNull()
        provider.dispose?.()
    })

    it('should fall back to gemini when aiProvider is an unrecognised value but gemini key is valid', async () => {
        const { provider } = makeProviderWithConfig({
            aiProvider: 'legacy-provider',
            geminiApiKey: 'AIza' + 'x'.repeat(20),
        })
        await (provider as any).initializeAIProvider()
        expect((provider as any).currentProvider?.type).toBe('gemini')
        provider.dispose?.()
    })
})
