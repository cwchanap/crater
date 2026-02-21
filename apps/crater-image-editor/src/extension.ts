import {
    type ExtensionContext,
    type Uri,
    commands,
    window,
    workspace,
} from 'vscode'
import { ImageEditorProvider } from './imageEditorProvider'

// Timing constants for webview initialization
const WEBVIEW_LOAD_DELAY = 500
const WEBVIEW_READY_DELAY = 1500

export async function activate(context: ExtensionContext) {
    try {
        const imageEditorProvider = new ImageEditorProvider(
            context.extensionUri,
            context
        )

        const viewType = ImageEditorProvider.viewType

        const disposable = window.registerWebviewViewProvider(
            viewType,
            imageEditorProvider
        )

        context.subscriptions.push(disposable)

        const openEditorCommand = commands.registerCommand(
            'crater-image-editor.openEditor',
            async () => {
                try {
                    await commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )
                } catch (error) {
                    window.showErrorMessage(
                        `Failed to open image editor: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(openEditorCommand)

        const refreshWebviewCommand = commands.registerCommand(
            'crater-image-editor.refreshWebview',
            () => {
                imageEditorProvider.refreshWebview()
            }
        )

        context.subscriptions.push(refreshWebviewCommand)

        const editImageFromExplorerCommand = commands.registerCommand(
            'crater-image-editor.editImageFromExplorer',
            async (uri: Uri) => {
                try {
                    await commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )

                    // Use consistent timing: load after delay, then force ready
                    setTimeout(async () => {
                        try {
                            await imageEditorProvider.loadImageFromPath(
                                uri.fsPath
                            )

                            // Force webview ready state after delay to ensure proper initialization
                            setTimeout(() => {
                                try {
                                    imageEditorProvider.forceWebviewReady()
                                } catch (error) {
                                    console.error(
                                        `[Crater Image Editor] Error in forceWebviewReady: ${error instanceof Error ? error.message : String(error)}`
                                    )
                                }
                            }, WEBVIEW_READY_DELAY)
                        } catch (error) {
                            window.showErrorMessage(
                                `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
                            )
                        }
                    }, WEBVIEW_LOAD_DELAY)
                } catch (error) {
                    window.showErrorMessage(
                        `Failed to open image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(editImageFromExplorerCommand)

        // Register loadImage command for external calls (e.g., from crater-ext)
        const loadImageCommand = commands.registerCommand(
            'crater-image-editor.loadImage',
            async (imagePathOrUri: string | Uri) => {
                try {
                    // Convert URI to file path if needed
                    let imagePath: string
                    if (typeof imagePathOrUri === 'string') {
                        imagePath = imagePathOrUri
                    } else if (
                        imagePathOrUri &&
                        typeof imagePathOrUri === 'object' &&
                        'fsPath' in imagePathOrUri
                    ) {
                        imagePath = imagePathOrUri.fsPath
                    } else {
                        throw new Error('Invalid image path or URI provided')
                    }

                    // Focus the image editor view first
                    try {
                        await commands.executeCommand(
                            'crater-image-editor.editorView.focus'
                        )
                    } catch {
                        // Try alternative approach - open the view container first
                        try {
                            await commands.executeCommand(
                                'workbench.view.extension.crater-image-editor-container'
                            )
                        } catch (focusError: unknown) {
                            console.error(
                                '[Crater Image Editor] All focus attempts failed:',
                                focusError
                            )
                        }
                    }

                    // Wait a bit for the view to become available, then load the image
                    setTimeout(async () => {
                        try {
                            // Load the image directly - the provider will handle queueing if needed
                            await imageEditorProvider.loadImageFromPath(
                                imagePath
                            )

                            // Force webview ready state after delay to ensure proper initialization
                            setTimeout(() => {
                                try {
                                    imageEditorProvider.forceWebviewReady()
                                } catch (error) {
                                    console.error(
                                        `[Crater Image Editor] Error in forceWebviewReady: ${error instanceof Error ? error.message : String(error)}`
                                    )
                                }
                            }, WEBVIEW_READY_DELAY)
                        } catch (error) {
                            window.showErrorMessage(
                                `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
                            )
                        }
                    }, WEBVIEW_LOAD_DELAY)
                } catch (error) {
                    window.showErrorMessage(
                        `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(loadImageCommand)

        const configChangeListener = workspace.onDidChangeConfiguration(
            async (event) => {
                if (event.affectsConfiguration('crater-image-editor')) {
                    imageEditorProvider.notifySettingsChanged()
                }
            }
        )

        context.subscriptions.push(configChangeListener)

        console.log('[Crater Image Editor] activated')
    } catch (error) {
        window.showErrorMessage(
            `[Crater Image Editor] Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`
        )
        throw error
    }
}

export function deactivate(): void {}
