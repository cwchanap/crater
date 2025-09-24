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

        // Reset DOM ready state
        Object.defineProperty(document, 'readyState', {
            value: 'loading',
            writable: true,
        })
    })

    describe('initializeApp function', () => {
        it('should initialize app when element is found', async () => {
            // Import the module to trigger initialization
            await import('../webview')

            // Wait for next tick to allow initialization
            await new Promise((resolve) => setTimeout(resolve, 0))

            expect(mockGetElementById).toHaveBeenCalledWith('app')
            expect(mockAppElement.innerHTML).toBe('')
            expect(mockedMount).toHaveBeenCalledWith(
                expect.any(Function), // App component
                expect.objectContaining({
                    target: mockAppElement,
                })
            )
        })

        it('should throw error when app element is not found', async () => {
            mockGetElementById.mockReturnValue(null)

            // Mock console.error to avoid test output pollution
            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})

            await expect(import('../webview')).rejects.toThrow(
                'Could not find app element'
            )

            consoleSpy.mockRestore()
        })

        it('should make app globally accessible', async () => {
            // Import the module
            await import('../webview')

            // Wait for initialization
            await new Promise((resolve) => setTimeout(resolve, 0))

            expect(globalScope.svelteApp).toBe(mockApp)
        })
    })

    describe('DOM Ready State Handling', () => {
        it('should initialize immediately when DOM is already ready', async () => {
            // Set DOM as ready
            Object.defineProperty(document, 'readyState', {
                value: 'complete',
                writable: true,
            })

            // Clear previous mocks
            vi.clearAllMocks()

            // Import the module
            await import('../webview')

            // Should initialize immediately
            expect(mockedMount).toHaveBeenCalled()
        })

        it('should wait for DOMContentLoaded when DOM is loading', async () => {
            // Set DOM as loading
            Object.defineProperty(document, 'readyState', {
                value: 'loading',
                writable: true,
            })

            // Mock addEventListener
            let domContentLoadedCallback: (() => void) | undefined
            mockAddEventListener.mockImplementation(
                (event: string, callback: () => void) => {
                    if (event === 'DOMContentLoaded') {
                        domContentLoadedCallback = callback
                    }
                }
            )

            // Import the module
            await import('../webview')

            // Should not initialize immediately
            expect(mockedMount).not.toHaveBeenCalled()

            // Simulate DOMContentLoaded event
            domContentLoadedCallback?.()

            expect(mockedMount).toHaveBeenCalled()
        })

        it('should set up event listeners correctly', async () => {
            // Import the module
            await import('../webview')

            expect(mockAddEventListener).toHaveBeenCalledWith(
                'DOMContentLoaded',
                expect.any(Function)
            )
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

            // Wait for error handling
            await new Promise((resolve) => setTimeout(resolve, 0))

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })

        it('should handle missing vscode API gracefully', async () => {
            // Remove vscode from global
            const originalVscode = globalScope.vscode
            delete globalScope.vscode

            // Import should not throw
            await import('../webview')

            // Wait for initialization
            await new Promise((resolve) => setTimeout(resolve, 0))

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

            expect(webviewModule.default).toBeDefined()
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
