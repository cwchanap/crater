import type * as vscode from 'vscode'
import { vi } from 'vitest'

type ViMock = ReturnType<typeof vi.fn>

type MockEvent<T> = vscode.Event<T> & ViMock

type MockedMemento = vscode.Memento & {
    get: ViMock
    update: ViMock
    keys: ViMock
    setKeysForSync?: ViMock
}

type MockWebview = vscode.Webview & {
    postMessage: ViMock
    asWebviewUri: ViMock
    onDidReceiveMessage: ViMock
    options: vscode.WebviewOptions
    html: string
}

type MockWebviewView = vscode.WebviewView & {
    onDidChangeVisibility: MockEvent<void>
    onDidDispose: MockEvent<void>
    show: ViMock
    webview: MockWebview
}

type MockFileSystemWatcher = vscode.FileSystemWatcher & {
    onDidChange: MockEvent<vscode.Uri>
    onDidCreate: MockEvent<vscode.Uri>
    onDidDelete: MockEvent<vscode.Uri>
    dispose: ViMock
}

const createMockEvent = <T>(): MockEvent<T> =>
    vi.fn() as unknown as MockEvent<T>

const createDisposable = () => ({ dispose: vi.fn() }) as vscode.Disposable

const createMockUri = (fsPath: string): vscode.Uri =>
    ({
        fsPath,
        path: fsPath,
        scheme: 'file',
        authority: '',
        fragment: '',
        query: '',
        toString: () => fsPath,
        toJSON: () => ({ path: fsPath }),
        with: vi.fn(() => createMockUri(fsPath)),
    }) as unknown as vscode.Uri

const createMockWebview = (): MockWebview => {
    const localResourceRoots: vscode.Uri[] = []

    return {
        html: '',
        cspSource: '',
        options: {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots,
        },
        localResourceRoots,
        asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
        postMessage: vi.fn(async () => true),
        onDidReceiveMessage: vi.fn(() => createDisposable()),
    } as unknown as MockWebview
}

const createMockFileSystemWatcher = (): MockFileSystemWatcher =>
    ({
        onDidChange: createMockEvent<vscode.Uri>(),
        onDidCreate: createMockEvent<vscode.Uri>(),
        onDidDelete: createMockEvent<vscode.Uri>(),
        dispose: vi.fn(),
    }) as unknown as MockFileSystemWatcher

const createEnvironmentVariableCollection = () =>
    ({
        replace: vi.fn(),
        append: vi.fn(),
        prepend: vi.fn(),
        get: vi.fn(),
        forEach: vi.fn(),
        clear: vi.fn(),
        delete: vi.fn(),
    }) as unknown as vscode.EnvironmentVariableCollection

const createSecretStorage = () =>
    ({
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: createMockEvent<vscode.SecretStorageChangeEvent>(),
    }) as unknown as vscode.SecretStorage

const createMemento = (withSync = false): MockedMemento => {
    const base: MockedMemento = {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(() => [] as string[]),
    } as unknown as MockedMemento

    if (withSync) {
        base.setKeysForSync = vi.fn()
    }

    return base
}

export const mockVSCode = {
    commands: {
        registerCommand: vi.fn(
            (command: string, callback: (...args: unknown[]) => unknown) => {
                void command
                void callback
                return createDisposable()
            }
        ),
        executeCommand: vi.fn(async (command: string, ...args: unknown[]) => {
            void command
            void args
            return undefined
        }),
    },
    window: {
        registerWebviewViewProvider: vi.fn(
            (
                viewType: string,
                provider: vscode.WebviewViewProvider,
                options?: { webviewOptions?: vscode.WebviewOptions }
            ) => {
                void viewType
                void provider
                void options
                return createDisposable()
            }
        ),
        showErrorMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showWarningMessage: vi.fn(),
        showOpenDialog: vi.fn(async () => undefined),
        createOutputChannel: vi.fn(() => ({
            appendLine: vi.fn(),
            dispose: vi.fn(),
        })),
        setStatusBarMessage: vi.fn(() => createDisposable()),
    },
    workspace: {
        getConfiguration: vi.fn((section?: string) => {
            void section
            return {
                get: vi.fn(),
                update: vi.fn(),
                has: vi.fn(),
                inspect: vi.fn(),
            } as unknown as vscode.WorkspaceConfiguration
        }),
        onDidChangeConfiguration:
            createMockEvent<vscode.ConfigurationChangeEvent>(),
        createFileSystemWatcher: vi.fn(
            (
                globPattern: vscode.GlobPattern,
                ignoreCreateOrDelete?: boolean
            ) => {
                void globPattern
                void ignoreCreateOrDelete
                return createMockFileSystemWatcher()
            }
        ),
        workspaceFolders: [{ uri: createMockUri('/test/workspace') }],
    },
    Uri: {
        joinPath: vi.fn(
            (base: vscode.Uri, ...paths: (string | vscode.Uri)[]) => {
                const suffix = paths
                    .map((segment) =>
                        typeof segment === 'string' ? segment : segment.fsPath
                    )
                    .join('/')
                return createMockUri([base.fsPath, suffix].join('/'))
            }
        ),
        file: vi.fn((filePath: string) => createMockUri(filePath)),
    },
    WebviewView: class {
        webview: MockWebview
        visible: boolean
        viewType: string
        onDidChangeVisibility: MockEvent<void>
        onDidDispose: MockEvent<void>
        show: ViMock

        constructor() {
            this.webview = createMockWebview()
            this.visible = true
            this.viewType = 'crater-image-editor.editorView'
            this.onDidChangeVisibility = createMockEvent<void>()
            this.onDidDispose = createMockEvent<void>()
            this.show = vi.fn()
        }
    },
    ExtensionContext: class {
        extensionUri: vscode.Uri
        subscriptions: vscode.Disposable[]
        globalState: MockedMemento
        workspaceState: MockedMemento
        environmentVariableCollection: vscode.EnvironmentVariableCollection
        secrets: vscode.SecretStorage
        extensionPath: string
        extensionMode: vscode.ExtensionMode
        storageUri: vscode.Uri | undefined
        globalStorageUri: vscode.Uri
        logUri: vscode.Uri
        storagePath: string | undefined
        globalStoragePath: string
        logPath: string

        constructor() {
            this.extensionUri = createMockUri('/test/extension')
            this.subscriptions = []
            this.globalState = createMemento(true)
            this.workspaceState = createMemento()
            this.environmentVariableCollection =
                createEnvironmentVariableCollection()
            this.secrets = createSecretStorage()
            this.extensionPath = '/test/extension'
            this.extensionMode = 1 as vscode.ExtensionMode
            this.storageUri = undefined
            this.globalStorageUri = createMockUri('/test/global-storage')
            this.logUri = createMockUri('/test/log')
            this.storagePath = undefined
            this.globalStoragePath = '/test/global-storage'
            this.logPath = '/test/log'
        }

        asAbsolutePath(relativePath: string): string {
            return `${this.extensionPath}/${relativePath}`
        }
    },
}

export function createMockExtensionContext(): vscode.ExtensionContext {
    return new mockVSCode.ExtensionContext() as unknown as vscode.ExtensionContext
}

export function createMockWebviewView(): MockWebviewView {
    return new mockVSCode.WebviewView() as unknown as MockWebviewView
}

export function resetAllMocks(): void {
    vi.clearAllMocks()
}

export const commands = mockVSCode.commands
export const window = mockVSCode.window
export const workspace = mockVSCode.workspace
export const Uri = mockVSCode.Uri

export { createMockUri, createMockWebview, createMockFileSystemWatcher }
