import { strict as assert } from 'assert'
import {
    extensions,
    workspace,
    Uri,
    ExtensionContext,
    ExtensionMode,
    Extension,
    WebviewView,
    WebviewViewResolveContext,
    CancellationToken,
} from 'vscode'
import { join } from 'path'
import { ChatbotProvider } from '../chatbotProvider'

suite('ChatbotProvider Test Suite', () => {
    let context: ExtensionContext
    let extensionUri: Uri
    let provider: ChatbotProvider

    suiteSetup(() => {
        // Try different possible extension IDs
        const possibleIds = ['crater.crater-ext', 'crater-ext']
        let extension: Extension<any> | undefined

        for (const id of possibleIds) {
            extension = extensions.getExtension(id)
            if (extension) break
        }

        // Use extension URI or fallback to workspace/temp
        if (extension) {
            extensionUri = extension.extensionUri
        } else {
            const workspaceUri = workspace.workspaceFolders?.[0]?.uri
            extensionUri = workspaceUri || Uri.file('/tmp/crater-ext-test')
        }

        context = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
                setKeysForSync: () => {},
            },
            extensionUri,
            extensionPath: extensionUri.fsPath,
            storagePath: join(extensionUri.fsPath, 'storage'),
            globalStoragePath: join(extensionUri.fsPath, 'globalStorage'),
            logPath: join(extensionUri.fsPath, 'logs'),
            environmentVariableCollection: {} as any,
            asAbsolutePath: (relativePath: string) =>
                join(extensionUri.fsPath, relativePath),
            storageUri: Uri.joinPath(extensionUri, 'storage'),
            globalStorageUri: Uri.joinPath(extensionUri, 'globalStorage'),
            logUri: Uri.joinPath(extensionUri, 'logs'),
            extensionMode: ExtensionMode.Test,
            extension: extension,
            secrets: {} as any,
            languageModelAccessInformation: {} as any,
        } as ExtensionContext
    })

    setup(() => {
        provider = new ChatbotProvider(extensionUri, context)
    })

    teardown(() => {
        if (provider) {
            provider.dispose()
        }
    })

    test('Should create ChatbotProvider instance', () => {
        assert.ok(provider)
        assert.ok(provider instanceof ChatbotProvider)
    })

    test('Should have correct viewType', () => {
        assert.strictEqual(ChatbotProvider.viewType, 'crater-ext.chatbotView')
    })

    test('Should initialize without AI provider initially', async () => {
        // Wait a bit for async initialization
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Provider should exist but not be configured initially
        assert.ok(provider)
    })

    test('Should handle webview view resolution', () => {
        const mockWebview = {
            options: {},
            html: '',
            postMessage: () => Promise.resolve(true),
            asWebviewUri: (uri: Uri) => uri,
            onDidReceiveMessage: () => ({ dispose: () => {} }),
        } as any

        const mockWebviewView = {
            webview: mockWebview,
            viewType: 'crater-ext.chatbotView',
            visible: true,
            show: () => {},
            onDidDispose: () => ({ dispose: () => {} }),
            onDidChangeVisibility: () => ({ dispose: () => {} }),
        } as WebviewView

        const mockContext = {} as WebviewViewResolveContext
        const mockToken = {} as CancellationToken

        // Should not throw when resolving webview
        assert.doesNotThrow(() => {
            provider.resolveWebviewView(mockWebviewView, mockContext, mockToken)
        })
    })

    test('Should update AI provider when called', async () => {
        // Should not throw when updating provider
        await assert.doesNotReject(async () => {
            await provider.updateAIProvider()
        })
    })

    test('Should refresh webview when called', () => {
        // Should not throw when refreshing webview (even without a view)
        assert.doesNotThrow(() => {
            provider.refreshWebview()
        })
    })

    test('Should toggle saving when called', () => {
        // Should not throw when toggling saving
        assert.doesNotThrow(() => {
            provider.toggleSaving()
        })
    })

    test('Should notify settings changed when called', () => {
        // Should not throw when notifying settings changed
        assert.doesNotThrow(() => {
            provider.notifySettingsChanged()
        })
    })

    test('Should handle dispose gracefully', () => {
        const newProvider = new ChatbotProvider(extensionUri, context)

        // Should not throw when disposing
        assert.doesNotThrow(() => {
            newProvider.dispose()
        })
    })

    test('Should validate API keys correctly', () => {
        const newProvider = new ChatbotProvider(extensionUri, context)

        // Access private method through any cast for testing
        const validateApiKey = (newProvider as any).isValidApiKey.bind(
            newProvider
        )

        // Test Gemini API key validation
        assert.strictEqual(
            validateApiKey('AIzaValidKeyForGemini123456789', 'gemini'),
            true
        )
        assert.strictEqual(validateApiKey('invalid-key', 'gemini'), false)
        assert.strictEqual(validateApiKey('', 'gemini'), false)

        // Test OpenAI API key validation
        assert.strictEqual(
            validateApiKey('sk-validopenaikey123456789', 'openai'),
            true
        )
        assert.strictEqual(validateApiKey('invalid-key', 'openai'), false)
        assert.strictEqual(validateApiKey('', 'openai'), false)

        // Test short keys
        assert.strictEqual(validateApiKey('short', 'gemini'), false)
        assert.strictEqual(validateApiKey('short', 'openai'), false)

        newProvider.dispose()
    })
})
