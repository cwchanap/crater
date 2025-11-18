import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from 'svelte'

// Mock Svelte mount function
vi.mock('svelte', () => ({
    mount: vi.fn(),
}))

// Mock the App component
vi.mock('../App.svelte', () => ({
    default: vi.fn(),
}))

// Mock DOM elements
type MockFunction = ReturnType<typeof vi.fn>

const mockGetElementById = vi.fn((id: string) => {
    void id
    return null as HTMLElement | null
})

const mockAddEventListener = vi.fn((event: string, callback: () => void) => {
    void event
    void callback
})
const mockRemoveEventListener = vi.fn((event: string, callback: () => void) => {
    void event
    void callback
})

const mockedMount = vi.mocked(mount)

type GlobalWithSvelteApp = typeof globalThis & {
    svelteApp?: { destroy: MockFunction }
    vscode?: unknown
}

const globalScope = globalThis as GlobalWithSvelteApp

Object.defineProperty(document, 'getElementById', {
    value: mockGetElementById,
    writable: true,
})

Object.defineProperty(document, 'addEventListener', {
    value: mockAddEventListener,
    writable: true,
})

Object.defineProperty(document, 'removeEventListener', {
    value: mockRemoveEventListener,
    writable: true,
})

describe('Webview Initialization', () => {
    let mockAppElement: { innerHTML: string }
    let mockApp: { destroy: MockFunction }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()

        mockAppElement = {
            innerHTML: '',
        }

        mockApp = {
            destroy: vi.fn(),
        }

        mockGetElementById.mockReturnValue(
            mockAppElement as unknown as HTMLElement
        )
        mockedMount.mockReturnValue(
            mockApp as unknown as ReturnType<typeof mount>
        )
    })

    describe('initializeApp function', () => {
        it('should initialize app when element is found', async () => {
            // Import the module to trigger initialization
            await import('../webview')

            expect(mockGetElementById).toHaveBeenCalledWith('app')
            expect(mockAppElement.innerHTML).toBe('')
            expect(mockedMount).toHaveBeenCalledWith(
                expect.any(Function), // App component
                expect.objectContaining({
                    target: mockAppElement,
                })
            )
        })

        it('should log error when app element is not found', async () => {
            mockGetElementById.mockReturnValue(null)

            // Mock console.error to avoid test output pollution
            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})

            await import('../webview')

            expect(consoleSpy).toHaveBeenCalled()

            consoleSpy.mockRestore()
        })

        it('should make app globally accessible', async () => {
            // Import the module
            await import('../webview')

            expect(globalScope.svelteApp).toBe(mockApp)
        })
    })

    describe('Error Handling', () => {
        it('should handle mount errors gracefully', async () => {
            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})
            mockedMount.mockImplementation(() => {
                throw new Error('Mount failed')
            })

            // Import should not throw, but log error
            await import('../webview')

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })

        it('should handle missing vscode API gracefully', async () => {
            // Remove vscode from global
            const originalVscode = globalScope.vscode
            delete globalScope.vscode

            // Import should not throw
            await import('../webview')

            // Should still work without vscode API
            expect(mockedMount).toHaveBeenCalled()

            // Restore vscode
            if (originalVscode) {
                globalScope.vscode = originalVscode
            }
        })
    })

    describe('App Lifecycle', () => {
        it('should export the app instance', async () => {
            const webviewModule = await import('../webview')

            expect(webviewModule.app).toBeDefined()
        })

        it('should handle multiple imports gracefully', async () => {
            // First import
            await import('../webview')

            // Second import should not cause issues
            await import('../webview')

            // Should only mount once due to DOM ready state handling
            expect(mockedMount).toHaveBeenCalledTimes(1)
        })
    })
})
