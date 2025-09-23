import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    mockVSCode,
    createMockExtensionContext,
    resetAllMocks,
} from './test-utils'

// Import after mocks are set up
import { activate } from '../extension'

describe('Extension Activation', () => {
    let mockContext: any

    beforeEach(() => {
        resetAllMocks()
        mockContext = createMockExtensionContext()
    })

    it('should register all required commands', async () => {
        await activate(mockContext)

        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-image-editor.openEditor',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-image-editor.refreshWebview',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-image-editor.editImageFromExplorer',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-image-editor.loadImage',
            expect.any(Function)
        )
    })

    it('should register webview view provider', async () => {
        await activate(mockContext)

        expect(
            mockVSCode.window.registerWebviewViewProvider
        ).toHaveBeenCalledWith(
            'crater-image-editor.editorView',
            expect.any(Object)
        )
    })

    it('should register configuration change listener', async () => {
        await activate(mockContext)

        expect(
            mockVSCode.workspace.onDidChangeConfiguration
        ).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should show information message on successful activation', async () => {
        await activate(mockContext)

        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
            '[Crater Image Editor] Image Editor is now active!'
        )
    })

    it('should handle activation errors gracefully', async () => {
        // Mock a failure in command registration
        mockVSCode.commands.registerCommand.mockImplementationOnce(() => {
            throw new Error('Command registration failed')
        })

        // Spy on console.error to verify error handling
        const consoleSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {})

        try {
            await activate(mockContext)
        } catch {
            // Expected to throw
        }

        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining(
                '[Crater Image Editor] Failed to activate extension'
            )
        )

        consoleSpy.mockRestore()
    })

    describe('Command Handlers', () => {
        it('should handle openEditor command', async () => {
            await activate(mockContext)

            // Get the command handler
            const openEditorCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-image-editor.openEditor'
                )
            expect(openEditorCall).toBeDefined()
            const handler = openEditorCall![1]

            // Mock executeCommand to resolve
            mockVSCode.commands.executeCommand.mockResolvedValueOnce(undefined)

            await handler()

            expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
                'crater-image-editor.editorView.focus'
            )
        })

        it('should handle openEditor command errors', async () => {
            await activate(mockContext)

            const openEditorCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-image-editor.openEditor'
                )
            expect(openEditorCall).toBeDefined()
            const handler = openEditorCall![1]

            // Mock executeCommand to reject
            mockVSCode.commands.executeCommand.mockRejectedValueOnce(
                new Error('Focus failed')
            )

            await handler()

            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to open image editor')
            )
        })

        it('should handle editImageFromExplorer command', async () => {
            await activate(mockContext)

            const editCommandCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) =>
                        call[0] === 'crater-image-editor.editImageFromExplorer'
                )
            expect(editCommandCall).toBeDefined()
            const handler = editCommandCall![1]

            const mockUri = { fsPath: '/test/image.png' }

            // Mock executeCommand to resolve
            mockVSCode.commands.executeCommand.mockResolvedValueOnce(undefined)

            await handler(mockUri)

            expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
                'crater-image-editor.editorView.focus'
            )
        })

        it('should handle loadImage command with string path', async () => {
            await activate(mockContext)

            const loadCommandCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-image-editor.loadImage'
                )
            expect(loadCommandCall).toBeDefined()
            const handler = loadCommandCall![1]

            const imagePath = '/test/image.png'

            // Mock executeCommand to resolve
            mockVSCode.commands.executeCommand.mockResolvedValueOnce(undefined)

            await handler(imagePath)

            expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
                'crater-image-editor.editorView.focus'
            )
        })

        it('should handle loadImage command with URI object', async () => {
            await activate(mockContext)

            const loadCommandCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-image-editor.loadImage'
                )
            expect(loadCommandCall).toBeDefined()
            const handler = loadCommandCall![1]

            const mockUri = { fsPath: '/test/image.png' }

            // Mock executeCommand to resolve
            mockVSCode.commands.executeCommand.mockResolvedValueOnce(undefined)

            await handler(mockUri)

            expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
                'crater-image-editor.editorView.focus'
            )
        })

        it('should handle invalid loadImage parameters', async () => {
            await activate(mockContext)

            const loadCommandCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-image-editor.loadImage'
                )
            expect(loadCommandCall).toBeDefined()
            const handler = loadCommandCall![1]

            await handler(null)

            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load image')
            )
        })
    })
})
