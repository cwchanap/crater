import type {
    Event,
    Memento,
    Webview,
    WebviewOptions,
    WebviewView,
    FileSystemWatcher,
    Uri as VscodeUri,
    Disposable,
    SecretStorageChangeEvent,
    SecretStorage,
    EnvironmentVariableCollection,
    ConfigurationChangeEvent,
    GlobPattern,
    WorkspaceConfiguration,
    WorkspaceFolder,
    WebviewViewProvider,
    ExtensionMode,
    ExtensionContext,
} from 'vscode'
import { vi } from 'vitest'

type ViMock = ReturnType<typeof vi.fn>

type MockEvent<T> = Event<T> & ViMock

type MockedMemento = Memento & {
    get: ViMock
    update: ViMock
    keys: ViMock
    setKeysForSync?: ViMock
}

type MockWebview = Webview & {
    postMessage: ViMock
    asWebviewUri: ViMock
    onDidReceiveMessage: ViMock
    options: WebviewOptions
    html: string
}

type MockWebviewView = WebviewView & {
    onDidChangeVisibility: MockEvent<void>
    onDidDispose: MockEvent<void>
    show: ViMock
    webview: MockWebview
}

type MockFileSystemWatcher = FileSystemWatcher & {
    onDidChange: MockEvent<VscodeUri>
    onDidCreate: MockEvent<VscodeUri>
    onDidDelete: MockEvent<VscodeUri>
    dispose: ViMock
}

const createMockEvent = <T>(): MockEvent<T> =>
    vi.fn() as unknown as MockEvent<T>

const createDisposable = () => ({ dispose: vi.fn() }) as Disposable

const createMockUri = (fsPath: string): VscodeUri =>
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
    }) as unknown as VscodeUri

const createMockWebview = (): MockWebview => {
    const localResourceRoots: VscodeUri[] = []

    return {
        html: '',
        cspSource: '',
        options: {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots,
        },
        localResourceRoots,
        asWebviewUri: vi.fn((uri: VscodeUri) => uri),
        postMessage: vi.fn(async () => true),
        onDidReceiveMessage: vi.fn(() => createDisposable()),
    } as unknown as MockWebview
}

const createMockFileSystemWatcher = (): MockFileSystemWatcher =>
    ({
        onDidChange: createMockEvent<VscodeUri>(),
        onDidCreate: createMockEvent<VscodeUri>(),
        onDidDelete: createMockEvent<VscodeUri>(),
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
    }) as unknown as EnvironmentVariableCollection

const createSecretStorage = () =>
    ({
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: createMockEvent<SecretStorageChangeEvent>(),
    }) as unknown as SecretStorage

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

export class EventEmitter<T> {
    private listeners: Array<(event: T) => void> = []

    public event: Event<T> = ((listener: (e: T) => void) => {
        this.listeners.push(listener)
        return createDisposable()
    }) as unknown as Event<T>

    public fire(event: T): void {
        for (const listener of this.listeners) {
            listener(event)
        }
    }

    public dispose(): void {
        this.listeners = []
    }
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
                provider: WebviewViewProvider,
                options?: { webviewOptions?: WebviewOptions }
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
            } as unknown as WorkspaceConfiguration
        }),
        onDidChangeConfiguration: createMockEvent<ConfigurationChangeEvent>(),
        createFileSystemWatcher: vi.fn(
            (globPattern: GlobPattern, ignoreCreateOrDelete?: boolean) => {
                void globPattern
                void ignoreCreateOrDelete
                return createMockFileSystemWatcher()
            }
        ),
        // Use a getter to return a fresh array each time, preventing state leakage between tests
        get workspaceFolders(): WorkspaceFolder[] {
            return [
                {
                    uri: createMockUri('/test/workspace'),
                    name: 'workspace',
                    index: 0,
                },
            ]
        },
    },
    Uri: {
        joinPath: vi.fn((base: VscodeUri, ...paths: (string | VscodeUri)[]) => {
            const suffix = paths
                .map((segment) =>
                    typeof segment === 'string' ? segment : segment.fsPath
                )
                .join('/')
            return createMockUri([base.fsPath, suffix].join('/'))
        }),
        file: vi.fn((filePath: string) => createMockUri(filePath)),
    },
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
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
            this.viewType = 'crater-ext.chatbotView'
            this.onDidChangeVisibility = createMockEvent<void>()
            this.onDidDispose = createMockEvent<void>()
            this.show = vi.fn()
        }
    },
    ExtensionContext: class {
        extensionUri: VscodeUri
        subscriptions: Disposable[]
        globalState: MockedMemento
        workspaceState: MockedMemento
        environmentVariableCollection: EnvironmentVariableCollection
        secrets: SecretStorage
        extensionPath: string
        extensionMode: ExtensionMode
        storageUri: VscodeUri | undefined
        globalStorageUri: VscodeUri
        logUri: VscodeUri
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
            this.extensionMode = 1 as ExtensionMode
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

export function createMockExtensionContext(): ExtensionContext {
    return new mockVSCode.ExtensionContext() as unknown as ExtensionContext
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
export const ConfigurationTarget = mockVSCode.ConfigurationTarget

export { createMockUri, createMockWebview, createMockFileSystemWatcher }
