import { vi } from 'vitest'

vi.mock('vscode', () => import('./mocks/vscode.js'))

const fsMock = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    promises: {
        unlink: vi.fn(),
    },
} as const

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
} as const

vi.mock('path', () => ({
    ...pathMock,
    default: pathMock,
}))

export { fsMock, pathMock }

export * from './mocks/vscode'
