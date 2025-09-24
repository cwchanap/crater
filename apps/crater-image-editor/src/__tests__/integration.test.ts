import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    mockVSCode,
    createMockExtensionContext,
    createMockWebviewView,
    resetAllMocks,
} from './test-utils'

// Import after mocks are set up
import { ImageEditorProvider } from '../imageEditorProvider'
import * as fs from 'fs'
import * as path from 'path'

const mockedFs = vi.mocked(fs)
const mockedPath = vi.mocked(path)

describe('Extension-WebView Integration', () => {
    let provider: ImageEditorProvider
    let mockContext: any
    let mockWebviewView: any

    beforeEach(() => {
        resetAllMocks()
        mockContext = createMockExtensionContext()
        mockWebviewView = createMockWebviewView()
        provider = new ImageEditorProvider(
            mockVSCode.Uri.file('/test/extension'),
            mockContext
        )

        // Set up default mocks
        mockedFs.existsSync.mockReturnValue(true)
        mockedFs.statSync.mockReturnValue({
            size: 1024,
            isFile: () => true,
            isDirectory: () => false,
        } as any)
        mockedFs.readFileSync.mockReturnValue(Buffer.from('test image data'))
        mockedPath.basename.mockReturnValue('test.png')
        mockedPath.extname.mockReturnValue('.png')
        mockedPath.join.mockReturnValue('/output/test_edited_timestamp.png')
    })

    afterEach(() => {
        provider.dispose()
    })

    describe('End-to-End Image Loading Flow', () => {
        it('should complete full image loading workflow', async () => {
            // Step 1: Resolve webview
            provider.resolveWebviewView(mockWebviewView)

            // Step 2: Load image
            const imagePath = '/test/image.png'
            await provider.loadImageFromPath(imagePath)

            // Step 3: Verify image was sent to webview
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'load-image',
                    fileName: 'test.png',
                    format: 'png',
                    size: 1024,
                })
            )

            // Step 4: Verify session was persisted
            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'crater-image-editor.currentSession',
                expect.any(Object)
            )
        })

        it('should handle webview communication during image operations', async () => {
            provider.resolveWebviewView(mockWebviewView)

            // Load image
            await provider.loadImageFromPath('/test/image.png')

            // Simulate webview ready message
            const webviewReadyMessage = {
                type: 'webview-ready',
                attempt: 1,
                hasCurrentImage: false,
            }
            await (provider as any)._handleMessage(webviewReadyMessage)

            // Verify webview ready state
            expect((provider as any)._webviewReady).toBe(true)

            // Verify response was sent back
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'extension-response',
                    message: 'Hello from extension!',
                })
            )
        })

        it('should handle settings synchronization', async () => {
            provider.resolveWebviewView(mockWebviewView)

            // Mock configuration
            mockVSCode.workspace.getConfiguration.mockReturnValue({
                get: vi.fn((key: string) => {
                    const config: { [key: string]: any } = {
                        outputDirectory: '/custom/output',
                        outputFormat: 'jpg',
                        quality: 85,
                        preserveOriginal: false,
                    }
                    return config[key]
                }),
                update: vi.fn(),
                has: vi.fn(),
                inspect: vi.fn(),
            })

            // Trigger settings notification
            provider.notifySettingsChanged()

            // Verify settings were sent to webview
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith({
                type: 'settings',
                outputDirectory: '/custom/output',
                outputFormat: 'jpg',
                quality: 85,
                preserveOriginal: false,
            })
        })
    })

    describe('Image Editing Workflow', () => {
        beforeEach(async () => {
            provider.resolveWebviewView(mockWebviewView)
            await provider.loadImageFromPath('/test/image.png')
        })

        it('should handle save image request', async () => {
            // Set up current session
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

            // Mock file system operations
            mockedFs.existsSync.mockReturnValue(false)
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => undefined)

            // Simulate save image message
            const saveMessage = {
                type: 'save-image',
                imageData: 'data:image/png;base64,edited-image-data',
                outputFormat: 'png',
            }

            await (provider as any)._handleMessage(saveMessage)

            // Verify file operations
            expect(mockedFs.mkdirSync).toHaveBeenCalled()
            expect(mockedFs.writeFileSync).toHaveBeenCalled()

            // Verify success message sent to webview
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'image-saved',
                    savedPath: expect.stringContaining('test_edited_'),
                })
            )

            // Verify user notification
            expect(
                mockVSCode.window.showInformationMessage
            ).toHaveBeenCalledWith(expect.stringContaining('Image saved to:'))
        })

        it('should handle image selection workflow', async () => {
            // Mock file dialog
            const mockResult = [{ fsPath: '/selected/image.jpg' }]
            mockVSCode.window.showOpenDialog.mockResolvedValue(
                mockResult as any
            )

            // Mock file operations for the selected image
            mockedPath.basename.mockReturnValue('image.jpg')
            mockedPath.extname.mockReturnValue('.jpg')

            // Simulate select image message
            const selectMessage = { type: 'select-image' }
            await (provider as any)._handleMessage(selectMessage)

            // Verify file dialog was shown
            expect(mockVSCode.window.showOpenDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    canSelectFiles: true,
                    canSelectMany: false,
                    openLabel: 'Select Image',
                })
            )

            // Verify image was loaded
            expect(mockedFs.existsSync).toHaveBeenCalledWith(
                '/selected/image.jpg'
            )
        })
    })

    describe('Error Recovery and Edge Cases', () => {
        it('should handle webview refresh and state restoration', async () => {
            // Load initial image
            await provider.loadImageFromPath('/test/image.png')

            // Resolve webview
            provider.resolveWebviewView(mockWebviewView)

            // Simulate webview refresh
            provider.refreshWebview()

            // Verify webview HTML was reset
            expect(mockWebviewView.webview.html).toBeDefined()

            // Simulate webview ready after refresh
            const refreshMessage = {
                type: 'webview-ready',
                attempt: 1,
                hasCurrentImage: false,
                wasReloaded: true,
            }
            await (provider as any)._handleMessage(refreshMessage)

            // Verify session was restored
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'load-image',
                    fileName: 'test.png',
                })
            )
        })

        it('should handle visibility changes correctly', async () => {
            // Load image and resolve webview
            await provider.loadImageFromPath('/test/image.png')
            provider.resolveWebviewView(mockWebviewView)

            // Simulate becoming visible after being hidden
            mockWebviewView.onDidChangeVisibility.mock.calls[0][0]({
                visible: true,
            })

            // Should restore session
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'load-image',
                })
            )
        })

        it('should handle configuration changes', async () => {
            provider.resolveWebviewView(mockWebviewView)

            // Mock configuration change
            mockVSCode.workspace.getConfiguration.mockReturnValue({
                get: vi.fn((key: string) => {
                    const config: { [key: string]: any } = {
                        outputDirectory: '/new/output',
                        outputFormat: 'webp',
                        quality: 95,
                        preserveOriginal: true,
                    }
                    return config[key]
                }),
                update: vi.fn(),
                has: vi.fn(),
                inspect: vi.fn(),
            })

            // Simulate configuration change
            const configChangeCallback =
                mockVSCode.workspace.onDidChangeConfiguration.mock.calls[0][0]
            configChangeCallback({ affectsConfiguration: vi.fn(() => true) })

            // Should notify settings changed
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'settings',
                    outputDirectory: '/new/output',
                })
            )
        })
    })

    describe('Message Queue Management', () => {
        it('should queue messages when webview is not ready', async () => {
            // Don't resolve webview yet
            await provider.loadImageFromPath('/test/image.png')

            // Messages should be queued
            expect((provider as any)._pendingMessages.length).toBeGreaterThan(0)

            // Now resolve webview
            provider.resolveWebviewView(mockWebviewView)

            // Simulate webview ready
            const readyMessage = {
                type: 'webview-ready',
                attempt: 1,
                hasCurrentImage: false,
            }
            await (provider as any)._handleMessage(readyMessage)

            // Queue should be flushed
            expect((provider as any)._pendingMessages.length).toBe(0)
        })

        it('should handle rapid message sequences', async () => {
            provider.resolveWebviewView(mockWebviewView)

            // Send multiple messages rapidly
            const messages = [
                { type: 'get-settings' },
                { type: 'test-connection', message: 'Test 1' },
                { type: 'get-settings' },
                { type: 'test-connection', message: 'Test 2' },
            ]

            for (const message of messages) {
                await (provider as any)._handleMessage(message)
            }

            // Verify all messages were handled
            expect(mockWebviewView.webview.postMessage).toHaveBeenCalledTimes(
                messages.length + 1 // +1 for initial settings message
            )
        })
    })
})
