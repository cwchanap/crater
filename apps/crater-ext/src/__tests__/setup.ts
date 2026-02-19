import { vi, beforeAll, afterAll } from 'vitest'

type VSCodeApi = {
    postMessage: ReturnType<typeof vi.fn>
    getState: ReturnType<typeof vi.fn>
    setState: ReturnType<typeof vi.fn>
}

type GlobalTestScope = typeof globalThis & {
    vscode?: VSCodeApi
    acquireVsCodeApi?: () => VSCodeApi
}

const testGlobal = globalThis as GlobalTestScope

testGlobal.vscode = {
    postMessage: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
}

testGlobal.acquireVsCodeApi = vi.fn(() => testGlobal.vscode as VSCodeApi)

type ConsoleSpy = { mockRestore: () => void }

let consoleSpies: ConsoleSpy[] = []

beforeAll(() => {
    consoleSpies = [
        vi.spyOn(console, 'log').mockImplementation(() => {}),
        vi.spyOn(console, 'warn').mockImplementation(() => {}),
        vi.spyOn(console, 'error').mockImplementation(() => {}),
    ]
})

afterAll(() => {
    consoleSpies.forEach((spy) => spy.mockRestore())
})
