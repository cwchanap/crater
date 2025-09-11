// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { ChatbotProvider } from './chatbotProvider'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('[Crater] Extension activation started')

    try {
        console.log('[Crater] Initializing ChatbotProvider...')
        console.log('[Crater] Extension URI:', context.extensionUri.toString())

        // Register the chatbot webview view provider
        const chatbotProvider = new ChatbotProvider(
            context.extensionUri,
            context
        )
        console.log('[Crater] ChatbotProvider instance created successfully')

        // Register the webview view provider for the sidebar (main)
        const viewType = ChatbotProvider.viewType
        console.log(
            `[Crater] Registering webview view provider with viewType: ${viewType}`
        )

        const disposable = vscode.window.registerWebviewViewProvider(
            viewType,
            chatbotProvider
        )

        context.subscriptions.push(disposable)
        console.log('[Crater] Main webview provider registered successfully')

        // Register the command to open the chatbot (focuses the sidebar view)
        const openChatbotCommand = vscode.commands.registerCommand(
            'crater-ext.openChatbot',
            async () => {
                console.log(
                    '[Crater] crater-ext.openChatbot command triggered!'
                )
                try {
                    // Focus the chatbot view in the explorer sidebar
                    await vscode.commands.executeCommand(
                        'crater-ext.chatbotView.focus'
                    )
                    console.log('[Crater] Successfully focused chatbot view')
                } catch (error) {
                    console.error(
                        '[Crater] Error focusing chatbot view:',
                        error
                    )
                    vscode.window.showErrorMessage(
                        `Failed to open chatbot: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(openChatbotCommand)
        console.log('[Crater] Open chatbot command registered')

        // Register a command to update AI provider when configuration changes
        const updateProviderCommand = vscode.commands.registerCommand(
            'crater-ext.updateAIProvider',
            async () => {
                console.log('[Crater] Updating AI provider configuration...')
                try {
                    await chatbotProvider.updateAIProvider()
                    console.log('[Crater] AI provider updated successfully')
                } catch (error) {
                    console.error('[Crater] Error updating AI provider:', error)
                    vscode.window.showErrorMessage(
                        `Failed to update AI provider: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(updateProviderCommand)
        console.log('[Crater] Update AI provider command registered')

        // Register a command to manually refresh the webview (for development)
        const refreshWebviewCommand = vscode.commands.registerCommand(
            'crater-ext.refreshWebview',
            () => {
                console.log('[Crater] Manual webview refresh command triggered')
                chatbotProvider.refreshWebview()
            }
        )

        context.subscriptions.push(refreshWebviewCommand)
        console.log('[Crater] Refresh webview command registered')

        // Register a command to browse for folder selection
        const browseFolderCommand = vscode.commands.registerCommand(
            'crater-ext.browseFolder',
            async () => {
                console.log('[Crater] Browse folder command triggered')
                try {
                    const options: vscode.OpenDialogOptions = {
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                        openLabel: 'Select Folder',
                        title: 'Select Directory for Saving Images',
                    }

                    const result = await vscode.window.showOpenDialog(options)
                    if (result && result[0]) {
                        const selectedPath = result[0].fsPath
                        console.log('[Crater] Selected folder:', selectedPath)

                        // Update the configuration
                        const config =
                            vscode.workspace.getConfiguration('crater-ext')
                        await config.update(
                            'imageSaveDirectory',
                            selectedPath,
                            vscode.ConfigurationTarget.Global
                        )

                        // Notify the webview about the change
                        chatbotProvider.notifySettingsChanged()

                        vscode.window.showInformationMessage(
                            `[Crater] Image save directory updated to: ${selectedPath}`
                        )
                        return selectedPath
                    }
                } catch (error) {
                    console.error(
                        '[Crater] Error in browse folder command:',
                        error
                    )
                    vscode.window.showErrorMessage(
                        `Failed to select folder: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(browseFolderCommand)
        console.log('[Crater] Browse folder command registered')

        // Register a command to open image in the image editor extension
        const openInImageEditorCommand = vscode.commands.registerCommand(
            'crater-ext.openInImageEditor',
            async (uri: vscode.Uri) => {
                console.log(
                    '[Crater] Open in image editor command triggered',
                    uri?.fsPath
                )
                try {
                    if (!uri) {
                        vscode.window.showErrorMessage(
                            '[Crater] No file selected'
                        )
                        return
                    }

                    const imagePath = uri.fsPath
                    console.log('[Crater] Opening image in editor:', imagePath)

                    // Check if the crater-image-editor extension is available
                    const imageEditorExtension = vscode.extensions.getExtension(
                        'undefined_publisher.crater-image-editor'
                    )
                    if (!imageEditorExtension) {
                        vscode.window.showErrorMessage(
                            '[Crater] Image Editor extension not found. Please install the Crater Image Editor extension.'
                        )
                        return
                    }

                    // Activate the image editor extension if it's not already active
                    if (!imageEditorExtension.isActive) {
                        console.log(
                            '[Crater] Activating image editor extension...'
                        )
                        await imageEditorExtension.activate()
                    }

                    // Execute the command to load image in the image editor
                    await vscode.commands.executeCommand(
                        'crater-image-editor.loadImage',
                        imagePath
                    )

                    // Focus the image editor view
                    await vscode.commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )

                    console.log('[Crater] Successfully opened image in editor')
                } catch (error) {
                    console.error(
                        '[Crater] Error opening image in editor:',
                        error
                    )
                    vscode.window.showErrorMessage(
                        `[Crater] Failed to open image in editor: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(openInImageEditorCommand)
        console.log('[Crater] Open in image editor command registered')

        // Listen for configuration changes
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(
            async (event) => {
                if (event.affectsConfiguration('crater-ext')) {
                    console.log(
                        '[Crater] Extension configuration changed, updating AI provider...'
                    )
                    try {
                        await chatbotProvider.updateAIProvider()
                        console.log(
                            '[Crater] AI provider updated after configuration change'
                        )
                    } catch (error) {
                        console.error(
                            '[Crater] Error updating AI provider after configuration change:',
                            error
                        )
                    }
                }
            }
        )

        context.subscriptions.push(configChangeListener)
        console.log('[Crater] Configuration change listener registered')

        console.log('[Crater] Extension activation completed successfully')
        vscode.window.showInformationMessage(
            '[Crater] Game Asset Assistant is now active!'
        )
    } catch (error) {
        console.error('[Crater] Failed to activate extension:', error)
        vscode.window.showErrorMessage(
            `[Crater] Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`
        )
        throw error // Re-throw to ensure VS Code knows activation failed
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('[Crater] Extension deactivated')
}
