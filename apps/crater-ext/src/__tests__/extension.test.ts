import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    mockVSCode,
    createMockExtensionContext,
    resetAllMocks,
} from './test-utils'

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
            'crater-ext.openChatbot',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-ext.updateAIProvider',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-ext.refreshWebview',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-ext.toggleSaving',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-ext.browseFolder',
            expect.any(Function)
        )
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
            'crater-ext.openInImageEditor',
            expect.any(Function)
        )
    })

    it('should register webview view provider', async () => {
        await activate(mockContext)

        expect(
            mockVSCode.window.registerWebviewViewProvider
        ).toHaveBeenCalledWith('crater-ext.chatbotView', expect.any(Object))
    })

    it('should register configuration change listener', async () => {
        await activate(mockContext)

        expect(
            mockVSCode.workspace.onDidChangeConfiguration
        ).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should show activation message', async () => {
        await activate(mockContext)

        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
            '[Crater] Game Asset Assistant is now active!'
        )
    })

    describe('Command Handlers', () => {
        it('should handle openChatbot command', async () => {
            await activate(mockContext)

            const openChatbotCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-ext.openChatbot'
                )
            expect(openChatbotCall).toBeDefined()
            const handler = openChatbotCall![1]

            mockVSCode.commands.executeCommand.mockResolvedValueOnce(undefined)

            await handler()

            expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
                'crater-ext.chatbotView.focus'
            )
        })

        it('should handle openChatbot command errors', async () => {
            await activate(mockContext)

            const openChatbotCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-ext.openChatbot'
                )
            expect(openChatbotCall).toBeDefined()
            const handler = openChatbotCall![1]

            mockVSCode.commands.executeCommand.mockRejectedValueOnce(
                new Error('Focus failed')
            )

            await handler()

            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to open chatbot')
            )
        })

        it('should handle browseFolder command with selection', async () => {
            await activate(mockContext)

            const browseFolderCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-ext.browseFolder'
                )
            expect(browseFolderCall).toBeDefined()
            const handler = browseFolderCall![1]

            const mockUri = { fsPath: '/selected/folder' }
            ;(
                mockVSCode.window.showOpenDialog as ReturnType<typeof vi.fn>
            ).mockResolvedValueOnce([mockUri])

            const mockConfig = {
                get: vi.fn(),
                update: vi.fn().mockResolvedValue(undefined),
                has: vi.fn(),
                inspect: vi.fn(),
            }
            mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig)

            await handler()

            expect(mockVSCode.window.showOpenDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                })
            )
            expect(mockConfig.update).toHaveBeenCalledWith(
                'imageSaveDirectory',
                '/selected/folder',
                expect.any(Number)
            )
        })

        it('should handle browseFolder command without selection', async () => {
            await activate(mockContext)

            const browseFolderCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-ext.browseFolder'
                )
            expect(browseFolderCall).toBeDefined()
            const handler = browseFolderCall![1]

            mockVSCode.window.showOpenDialog.mockResolvedValueOnce(undefined)

            await handler()

            expect(mockVSCode.window.showOpenDialog).toHaveBeenCalled()
        })

        it('should handle openInImageEditor command with URI', async () => {
            await activate(mockContext)

            const openInImageEditorCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-ext.openInImageEditor'
                )
            expect(openInImageEditorCall).toBeDefined()
            const handler = openInImageEditorCall![1]

            const mockUri = { fsPath: '/test/image.png' }
            mockVSCode.commands.executeCommand.mockResolvedValue(undefined)

            await handler(mockUri)

            expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
                'crater-image-editor.editorView.focus'
            )
            expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
                'crater-image-editor.loadImage',
                mockUri
            )
        })

        it('should handle openInImageEditor command without URI', async () => {
            await activate(mockContext)

            const openInImageEditorCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-ext.openInImageEditor'
                )
            expect(openInImageEditorCall).toBeDefined()
            const handler = openInImageEditorCall![1]

            await handler(null)

            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                '[Crater] No file selected'
            )
        })

        it('should handle openInImageEditor command when image editor not found', async () => {
            await activate(mockContext)

            const openInImageEditorCall =
                mockVSCode.commands.registerCommand.mock.calls.find(
                    (call) => call[0] === 'crater-ext.openInImageEditor'
                )
            expect(openInImageEditorCall).toBeDefined()
            const handler = openInImageEditorCall![1]

            const mockUri = { fsPath: '/test/image.png' }
            mockVSCode.commands.executeCommand
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(
                    new Error(
                        "command 'crater-image-editor.loadImage' not found"
                    )
                )

            await handler(mockUri)

            expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Image Editor extension not found')
            )
        })
    })
})
