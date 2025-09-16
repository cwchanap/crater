import * as vscode from 'vscode'
import { ImageEditorProvider } from './imageEditorProvider'

export async function activate(context: vscode.ExtensionContext) {
    try {
        const imageEditorProvider = new ImageEditorProvider(
            context.extensionUri,
            context
        )

        const viewType = ImageEditorProvider.viewType

        const disposable = vscode.window.registerWebviewViewProvider(
            viewType,
            imageEditorProvider
        )

        context.subscriptions.push(disposable)

        const openEditorCommand = vscode.commands.registerCommand(
            'crater-image-editor.openEditor',
            async () => {
                try {
                    await vscode.commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to open image editor: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(openEditorCommand)

        const refreshWebviewCommand = vscode.commands.registerCommand(
            'crater-image-editor.refreshWebview',
            () => {
                imageEditorProvider.refreshWebview()
            }
        )

        context.subscriptions.push(refreshWebviewCommand)

        const editImageFromExplorerCommand = vscode.commands.registerCommand(
            'crater-image-editor.editImageFromExplorer',
            async (uri: vscode.Uri) => {
                try {
                    await vscode.commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )

                    setTimeout(() => {
                        imageEditorProvider.loadImageFromPath(uri.fsPath)
                    }, 500)
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to open image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(editImageFromExplorerCommand)

        // Register loadImage command for external calls (e.g., from crater-ext)
        const loadImageCommand = vscode.commands.registerCommand(
            'crater-image-editor.loadImage',
            async (imagePathOrUri: string | vscode.Uri) => {
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
                        await vscode.commands.executeCommand(
                            'crater-image-editor.editorView.focus'
                        )
                    } catch {
                        // Try alternative approach - open the view container first
                        try {
                            await vscode.commands.executeCommand(
                                'workbench.view.extension.crater-image-editor-container'
                            )
                        } catch {
                            // Silently handle focus errors
                        }
                    }

                    // Refresh the webview to ensure it loads properly
                    imageEditorProvider.refreshWebview()

                    // Wait for webview to initialize, then load the image
                    setTimeout(() => {
                        imageEditorProvider.loadImageFromPath(imagePath)

                        // Ensure webview is ready
                        setTimeout(() => {
                            imageEditorProvider.forceWebviewReady()
                        }, 2000)
                    }, 1000)
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(loadImageCommand)

        const configChangeListener = vscode.workspace.onDidChangeConfiguration(
            async (event) => {
                if (event.affectsConfiguration('crater-image-editor')) {
                    imageEditorProvider.notifySettingsChanged()
                }
            }
        )

        context.subscriptions.push(configChangeListener)

        vscode.window.showInformationMessage(
            '[Crater Image Editor] Image Editor is now active!'
        )
    } catch (error) {
        vscode.window.showErrorMessage(
            `[Crater Image Editor] Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`
        )
        throw error
    }
}

export function deactivate() {}
