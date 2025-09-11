import * as vscode from 'vscode'
import { ImageEditorProvider } from './imageEditorProvider'

export async function activate(context: vscode.ExtensionContext) {
    console.log('[Crater Image Editor] Extension activation started')

    try {
        console.log('[Crater Image Editor] Initializing ImageEditorProvider...')
        console.log(
            '[Crater Image Editor] Extension URI:',
            context.extensionUri.toString()
        )

        const imageEditorProvider = new ImageEditorProvider(
            context.extensionUri,
            context
        )
        console.log(
            '[Crater Image Editor] ImageEditorProvider instance created successfully'
        )

        const viewType = ImageEditorProvider.viewType
        console.log(
            `[Crater Image Editor] Registering webview view provider with viewType: ${viewType}`
        )

        const disposable = vscode.window.registerWebviewViewProvider(
            viewType,
            imageEditorProvider
        )

        context.subscriptions.push(disposable)
        console.log(
            '[Crater Image Editor] Main webview provider registered successfully'
        )

        const openEditorCommand = vscode.commands.registerCommand(
            'crater-image-editor.openEditor',
            async () => {
                console.log(
                    '[Crater Image Editor] crater-image-editor.openEditor command triggered!'
                )
                try {
                    await vscode.commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )
                    console.log(
                        '[Crater Image Editor] Successfully focused editor view'
                    )
                } catch (error) {
                    console.error(
                        '[Crater Image Editor] Error focusing editor view:',
                        error
                    )
                    vscode.window.showErrorMessage(
                        `Failed to open image editor: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(openEditorCommand)
        console.log('[Crater Image Editor] Open editor command registered')

        const refreshWebviewCommand = vscode.commands.registerCommand(
            'crater-image-editor.refreshWebview',
            () => {
                console.log(
                    '[Crater Image Editor] Manual webview refresh command triggered'
                )
                imageEditorProvider.refreshWebview()
            }
        )

        context.subscriptions.push(refreshWebviewCommand)
        console.log('[Crater Image Editor] Refresh webview command registered')

        const editImageFromExplorerCommand = vscode.commands.registerCommand(
            'crater-image-editor.editImageFromExplorer',
            async (uri: vscode.Uri) => {
                console.log(
                    '[Crater Image Editor] Edit image from explorer command triggered:',
                    uri.fsPath
                )
                try {
                    await vscode.commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )

                    setTimeout(() => {
                        imageEditorProvider.loadImageFromPath(uri.fsPath)
                    }, 500)

                    console.log(
                        '[Crater Image Editor] Successfully focused editor and loaded image'
                    )
                } catch (error) {
                    console.error(
                        '[Crater Image Editor] Error opening image from explorer:',
                        error
                    )
                    vscode.window.showErrorMessage(
                        `Failed to open image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(editImageFromExplorerCommand)
        console.log(
            '[Crater Image Editor] Edit from explorer command registered'
        )

        // Register loadImage command for external calls (e.g., from crater-ext)
        const loadImageCommand = vscode.commands.registerCommand(
            'crater-image-editor.loadImage',
            async (imagePath: string) => {
                console.log(
                    '[Crater Image Editor] Load image command triggered:',
                    imagePath
                )
                try {
                    // Focus the image editor view first
                    await vscode.commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )

                    // Small delay to ensure webview is ready
                    setTimeout(() => {
                        imageEditorProvider.loadImageFromPath(imagePath)
                    }, 500)

                    console.log(
                        '[Crater Image Editor] Successfully loaded image from external call'
                    )
                } catch (error) {
                    console.error(
                        '[Crater Image Editor] Error loading image from external call:',
                        error
                    )
                    vscode.window.showErrorMessage(
                        `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(loadImageCommand)
        console.log('[Crater Image Editor] Load image command registered')

        const configChangeListener = vscode.workspace.onDidChangeConfiguration(
            async (event) => {
                if (event.affectsConfiguration('crater-image-editor')) {
                    console.log(
                        '[Crater Image Editor] Extension configuration changed'
                    )
                    imageEditorProvider.notifySettingsChanged()
                }
            }
        )

        context.subscriptions.push(configChangeListener)
        console.log(
            '[Crater Image Editor] Configuration change listener registered'
        )

        console.log(
            '[Crater Image Editor] Extension activation completed successfully'
        )
        vscode.window.showInformationMessage(
            '[Crater Image Editor] Image Editor is now active!'
        )
    } catch (error) {
        console.error(
            '[Crater Image Editor] Failed to activate extension:',
            error
        )
        vscode.window.showErrorMessage(
            `[Crater Image Editor] Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`
        )
        throw error
    }
}

export function deactivate() {
    console.log('[Crater Image Editor] Extension deactivated')
}
