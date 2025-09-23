import { vi } from 'vitest'

// Mock VS Code API interfaces and types
export const mockVSCode = {
    commands: {
        registerCommand: vi.fn(),
        executeCommand: vi.fn(),
    },
    window: {
        registerWebviewViewProvider: vi.fn(),
        showErrorMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showWarningMessage: vi.fn(),
        showOpenDialog: vi.fn(),
        createOutputChannel: vi.fn(),
        setStatusBarMessage: vi.fn(),
        onDidChangeConfiguration: vi.fn(),
    },
    workspace: {
        getConfiguration: vi.fn(),
        onDidChangeConfiguration: vi.fn(),
        createFileSystemWatcher: vi.fn(),
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    },
    Uri: {
        joinPath: vi.fn(),
        file: vi.fn(),
    },
    WebviewView: class {
        webview = {
            options: {},
            html: '',
            asWebviewUri: vi.fn(),
            postMessage: vi.fn(),
            onDidReceiveMessage: vi.fn(),
        }
        visible = true
        onDidChangeVisibility = vi.fn()
    },
    ExtensionContext: class {
        extensionUri = { fsPath: '/test/extension' }
        subscriptions = []
        globalState = {
            get: vi.fn(),
            update: vi.fn(),
        }
    },
}

// Helper to create a mock extension context
export function createMockExtensionContext(): InstanceType<
    typeof mockVSCode.ExtensionContext
> {
    return new mockVSCode.ExtensionContext()
}

// Helper to create a mock webview view
export function createMockWebviewView(): InstanceType<
    typeof mockVSCode.WebviewView
> {
    return new mockVSCode.WebviewView()
}

// Helper to reset all mocks
export function resetAllMocks(): void {
    Object.values(mockVSCode).forEach((mock) => {
        if (typeof mock === 'object' && mock !== null) {
            Object.values(mock).forEach((method) => {
                if (typeof method === 'function' && 'mockReset' in method) {
                    method.mockReset()
                }
            })
        }
    })
}
