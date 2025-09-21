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
