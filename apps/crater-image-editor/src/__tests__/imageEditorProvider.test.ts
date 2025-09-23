import type { Stats } from 'fs'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    mockVSCode,
    createMockExtensionContext,
    createMockWebviewView,
    resetAllMocks,
    asProviderInternals,
    type ProviderInternals,
} from './test-utils'
import * as fs from 'fs'
import * as path from 'path'

// Import after mocks are set up
import { ImageEditorProvider } from '../imageEditorProvider'

const mockedFs = vi.mocked(fs)
const mockedPath = vi.mocked(path)

describe('ImageEditorProvider', () => {
    let provider: ImageEditorProvider
    let providerInternals: ProviderInternals
    let mockContext: ReturnType<typeof createMockExtensionContext>
    let mockWebviewView: ReturnType<typeof createMockWebviewView>

    beforeEach(() => {
        resetAllMocks()
        mockContext = createMockExtensionContext()
        mockWebviewView = createMockWebviewView()
        provider = new ImageEditorProvider(
            mockVSCode.Uri.file('/test/extension'),
            mockContext
        )
        providerInternals = asProviderInternals(provider)
    })

    afterEach(() => {
        provider.dispose()
    })

    describe('Initialization', () => {
        it('should initialize with correct view type', () => {
            expect(ImageEditorProvider.viewType).toBe(
                'crater-image-editor.editorView'
            )
        })

        it('should load persisted session on initialization', () => {
            const mockSession = {
                id: 'test-session',
                originalPath: '/test/image.png',
                originalData: 'data:image/png;base64,test',
                fileName: 'image.png',
                dimensions: { width: 100, height: 100 },
                format: 'png',
                size: 1024,
                createdAt: new Date().toISOString(),
            }

            mockContext.globalState.get.mockReturnValue(mockSession)

            const newProvider = new ImageEditorProvider(
                mockVSCode.Uri.file('/test/extension'),
                mockContext
            )
            const newProviderInternals = asProviderInternals(newProvider)

            expect(mockContext.globalState.get).toHaveBeenCalledWith(
                'crater-image-editor.currentSession'
            )
            expect(newProviderInternals._currentSession).toEqual(mockSession)

            newProvider.dispose()
        })
    })

    describe('Webview Resolution', () => {
        it('should resolve webview view correctly', () => {
            provider.resolveWebviewView(mockWebviewView)

            expect(mockWebviewView.webview.options.enableScripts).toBe(true)
            expect(mockWebviewView.webview.options.localResourceRoots).toEqual([
                mockVSCode.Uri.file('/test/extension'),
            ])
        })

        it('should set HTML content on first resolution', () => {
            const originalGetHtml = providerInternals._getHtmlForWebview
            providerInternals._getHtmlForWebview = vi
                .fn()
                .mockReturnValue('<html>Test</html>')

            provider.resolveWebviewView(mockWebviewView)

            expect(providerInternals._getHtmlForWebview).toHaveBeenCalledWith(
                mockWebviewView.webview
            )
            expect(mockWebviewView.webview.html).toBe('<html>Test</html>')

            providerInternals._getHtmlForWebview = originalGetHtml
        })

        it('should send settings on webview resolution', () => {
            mockVSCode.workspace.getConfiguration.mockReturnValue({
                get: vi.fn((key: string) => {
                    const defaults: Record<string, string | number | boolean> =
                        {
                            outputDirectory: '${workspaceFolder}/edited-images',
                            outputFormat: 'png',
                            quality: 90,
                            preserveOriginal: true,
                        }
                    return defaults[key]
                }),
            })

            provider.resolveWebviewView(mockWebviewView)

            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'settings',
                    outputDirectory: '${workspaceFolder}/edited-images',
                    outputFormat: 'png',
                    quality: 90,
                    preserveOriginal: true,
                })
            )
        })
    })

    describe('Image Loading', () => {
        beforeEach(() => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.statSync.mockReturnValue({
                size: 1024,
                isFile: () => true,
                isDirectory: () => false,
            } as unknown as Stats)
            mockedFs.readFileSync.mockReturnValue(
                Buffer.from('test image data')
            )
            mockedPath.basename.mockReturnValue('test.png')
            mockedPath.extname.mockReturnValue('.png')
        })

        it('should load image from valid path', async () => {
            const imagePath = '/test/image.png'

            await provider.loadImageFromPath(imagePath)

            expect(mockedFs.existsSync).toHaveBeenCalledWith(imagePath)
            expect(mockedFs.readFileSync).toHaveBeenCalledWith(imagePath)
            expect(provider['_currentSession']).toBeDefined()
            expect(provider['_currentSession']?.fileName).toBe('test.png')
            expect(provider['_currentSession']?.format).toBe('png')
        })

        it('should handle non-existent image file', async () => {
            mockedFs.existsSync.mockReturnValue(false)
            const imagePath = '/test/nonexistent.png'

            await expect(provider.loadImageFromPath(imagePath)).rejects.toThrow(
                'Image file not found'
            )

            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load image')
            )
        })

        it('should persist session after loading image', async () => {
            const imagePath = '/test/image.png'

            await provider.loadImageFromPath(imagePath)

            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'crater-image-editor.currentSession',
                expect.any(Object)
            )
        })

        it('should send image data to webview when available', async () => {
            provider.resolveWebviewView(mockWebviewView)
            const imagePath = '/test/image.png'

            await provider.loadImageFromPath(imagePath)

            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'load-image',
                    fileName: 'test.png',
                    format: 'png',
                    size: 1024,
                })
            )
        })
    })

    describe('MIME Type Detection', () => {
        it('should return correct MIME types for supported formats', () => {
            const testCases = [
                { ext: 'png', expected: 'image/png' },
                { ext: 'jpg', expected: 'image/jpeg' },
                { ext: 'jpeg', expected: 'image/jpeg' },
                { ext: 'gif', expected: 'image/gif' },
                { ext: 'bmp', expected: 'image/bmp' },
                { ext: 'webp', expected: 'image/webp' },
                { ext: 'unknown', expected: 'image/png' },
            ]

            testCases.forEach(({ ext, expected }) => {
                const result = (provider as any).getMimeType(ext)
                expect(result).toBe(expected)
            })
        })
    })

    describe('Settings Management', () => {
        it('should notify settings changed', () => {
            provider.resolveWebviewView(mockWebviewView)

            mockVSCode.workspace.getConfiguration.mockReturnValue({
                get: vi.fn((key: string) => {
                    const defaults: { [key: string]: any } = {
                        outputDirectory: '/custom/output',
                        outputFormat: 'jpg',
                        quality: 85,
                        preserveOriginal: false,
                    }
                    return defaults[key]
                }),
            })

            provider.notifySettingsChanged()

            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith({
                type: 'settings',
                outputDirectory: '/custom/output',
                outputFormat: 'jpg',
                quality: 85,
                preserveOriginal: false,
            })
        })

        it('should handle missing webview gracefully', () => {
            expect(() => provider.notifySettingsChanged()).not.toThrow()
        })
    })

    describe('Webview Refresh', () => {
        it('should refresh webview when available', () => {
            provider.resolveWebviewView(mockWebviewView)

            provider.refreshWebview()

            expect(mockWebviewView.webview.html).toBeDefined()
        })

        it('should handle refresh when no webview available', () => {
            expect(() => provider.refreshWebview()).not.toThrow()
            expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith(
                'No webview available to refresh'
            )
        })
    })

    describe('Message Handling', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView)
        })

        it('should handle select-image message', async () => {
            const mockResult = [{ fsPath: '/selected/image.png' }]
            mockVSCode.window.showOpenDialog.mockResolvedValue(mockResult)

            const message = { type: 'select-image' }
            await (provider as any)._handleMessage(message)

            expect(mockVSCode.window.showOpenDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    canSelectFiles: true,
                    canSelectMany: false,
                    openLabel: 'Select Image',
                })
            )
        })

        it('should handle save-image message', async () => {
            const message = {
                type: 'save-image',
                imageData: 'data:image/png;base64,test',
                outputFormat: 'png',
            }

            provider['_currentSession'] = {
                id: 'test',
                originalPath: '/test/image.png',
                originalData: 'data:image/png;base64,original',
                fileName: 'test.png',
                dimensions: { width: 100, height: 100 },
                format: 'png',
                size: 1024,
                createdAt: new Date().toISOString(),
            }

            mockedPath.join.mockReturnValue('/output/test_edited_timestamp.png')
            mockedFs.existsSync.mockReturnValue(false)
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => undefined)

            await (provider as any)._handleMessage(message)

            expect(mockedFs.writeFileSync).toHaveBeenCalled()
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'image-saved',
                    savedPath: '/output/test_edited_timestamp.png',
                })
            )
        })

        it('should handle get-settings message', () => {
            mockVSCode.workspace.getConfiguration.mockReturnValue({
                get: vi.fn((key: string) => {
                    const defaults: { [key: string]: any } = {
                        outputDirectory: '/test/dir',
                        outputFormat: 'png',
                        quality: 90,
                        preserveOriginal: true,
                    }
                    return defaults[key]
                }),
            })

            const message = { type: 'get-settings' }
            ;(provider as any)._handleMessage(message)

            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'settings',
                    outputDirectory: '/test/dir',
                })
            )
        })

        it('should handle webview-ready message', () => {
            const message = {
                type: 'webview-ready',
                attempt: 1,
                hasCurrentImage: false,
            }

            ;(provider as any)._handleMessage(message)

            expect(provider['_webviewReady']).toBe(true)
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'extension-response',
                    message: 'Hello from extension!',
                })
            )
        })

        it('should handle unknown message types gracefully', () => {
            const message = { type: 'unknown-message' }

            expect(() =>
                (provider as any)._handleMessage(message)
            ).not.toThrow()
        })
    })

    describe('Session Management', () => {
        it('should persist session to global state', () => {
            provider['_currentSession'] = {
                id: 'test',
                originalPath: '/test/image.png',
                originalData: 'data:image/png;base64,test',
                fileName: 'test.png',
                dimensions: { width: 100, height: 100 },
                format: 'png',
                size: 1024,
                createdAt: new Date().toISOString(),
            }
            ;(provider as any).persistSession()

            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'crater-image-editor.currentSession',
                provider['_currentSession']
            )
        })

        it('should restore current session when webview becomes visible', () => {
            provider['_currentSession'] = {
                id: 'test',
                originalPath: '/test/image.png',
                originalData: 'data:image/png;base64,test',
                fileName: 'test.png',
                dimensions: { width: 100, height: 100 },
                format: 'png',
                size: 1024,
                createdAt: new Date().toISOString(),
            }

            provider.resolveWebviewView(mockWebviewView)

            // Simulate visibility change
            mockWebviewView.onDidChangeVisibility.mock.calls[0][0]({
                visible: true,
            })

            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'load-image',
                    fileName: 'test.png',
                })
            )
        })
    })

    describe('Error Handling', () => {
        it('should handle file system errors during image loading', async () => {
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('File read error')
            })

            await expect(
                provider.loadImageFromPath('/test/image.png')
            ).rejects.toThrow()

            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load image')
            )
        })

        it('should handle save errors gracefully', async () => {
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error')
            })

            const result = await (provider as any).saveEditedImage(
                'data:image/png;base64,test',
                'test.png',
                'png'
            )

            expect(result).toBeNull()
            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save image')
            )
        })
    })
})
