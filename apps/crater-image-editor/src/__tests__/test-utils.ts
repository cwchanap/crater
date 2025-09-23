import type { ImageEditorProvider } from '../imageEditorProvider'
import { vi } from 'vitest'

// Mock vscode module before any imports
vi.mock('vscode', () => import('./mocks/vscode'))

// Mock fs and path modules
const fsMock = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
}

vi.mock('fs', () => ({
    ...fsMock,
    default: fsMock,
}))

const pathMock = {
    join: vi.fn(),
    basename: vi.fn(),
    extname: vi.fn(),
    parse: vi.fn(),
    dirname: vi.fn(),
}

vi.mock('path', () => ({
    ...pathMock,
    default: pathMock,
}))

export { fsMock, pathMock }

// Re-export everything from mocks for convenience
export * from './mocks/vscode'

type WebviewMessagePayload = {
    type: string
    [key: string]: unknown
}

export type ProviderInternals = ImageEditorProvider & {
    _handleMessage: (message: WebviewMessagePayload) => Promise<void>
    _webviewReady: boolean
    _pendingMessages: WebviewMessagePayload[]
    getMimeType: (extension: string) => string
    persistSession: () => void
    saveEditedImage: (
        imageData: string,
        fileName: string,
        outputFormat?: string
    ) => Promise<string | null>
}

export const asProviderInternals = (
    provider: ImageEditorProvider
): ProviderInternals => provider as ProviderInternals
