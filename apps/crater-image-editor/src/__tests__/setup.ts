import { vi, beforeAll, afterAll } from 'vitest'

// Vitest setup file for crater-image-editor tests
// This file runs before all tests

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

// Mock VS Code API globally
testGlobal.vscode = {
    postMessage: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
}

// Mock acquireVsCodeApi
testGlobal.acquireVsCodeApi = vi.fn(() => testGlobal.vscode as VSCodeApi)

// Mock console methods for cleaner test output
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
