// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { ChatbotProvider } from './chatbotProvider'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    try {
        // Register the chatbot webview view provider
        const chatbotProvider = new ChatbotProvider(
            context.extensionUri,
            context
        )

        // Register the webview view provider for the sidebar (main)
        const viewType = ChatbotProvider.viewType

        const disposable = vscode.window.registerWebviewViewProvider(
            viewType,
            chatbotProvider
        )

        context.subscriptions.push(disposable)

        // Register the command to open the chatbot (focuses the sidebar view)
        const openChatbotCommand = vscode.commands.registerCommand(
            'crater-ext.openChatbot',
            async () => {
                try {
                    // Focus the chatbot view in the explorer sidebar
                    await vscode.commands.executeCommand(
                        'crater-ext.chatbotView.focus'
                    )
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to open chatbot: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(openChatbotCommand)

        // Register a command to update AI provider when configuration changes
        const updateProviderCommand = vscode.commands.registerCommand(
            'crater-ext.updateAIProvider',
            async () => {
                try {
                    await chatbotProvider.updateAIProvider()
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to update AI provider: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(updateProviderCommand)

        // Register a command to manually refresh the webview (for development)
        const refreshWebviewCommand = vscode.commands.registerCommand(
            'crater-ext.refreshWebview',
            () => {
                chatbotProvider.refreshWebview()
            }
        )

        context.subscriptions.push(refreshWebviewCommand)

        // Register a command to browse for folder selection
        const browseFolderCommand = vscode.commands.registerCommand(
            'crater-ext.browseFolder',
            async () => {
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
                    vscode.window.showErrorMessage(
                        `Failed to select folder: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        context.subscriptions.push(browseFolderCommand)

        // Register a command to open image in the image editor extension
        const openInImageEditorCommand = vscode.commands.registerCommand(
            'crater-ext.openInImageEditor',
            async (uri: vscode.Uri) => {
                try {
                    if (!uri) {
                        vscode.window.showErrorMessage(
                            '[Crater] No file selected'
                        )
                        return
                    }

                    // Get the image path from the URI
                    console.log(`[Crater] Opening image: ${uri.fsPath}`)

                    // Try to execute the loadImage command directly
                    // If the extension isn't available, the command will fail and we'll catch the error

                    // Execute the command to load image in the image editor
                    // Pass the original URI object directly
                    await vscode.commands.executeCommand(
                        'crater-image-editor.loadImage',
                        uri
                    )

                    // Focus the image editor view
                    await vscode.commands.executeCommand(
                        'crater-image-editor.editorView.focus'
                    )

                    // Show a notification to help user find the image editor
                    vscode.window.showInformationMessage(
                        `✅ Image opened in Crater Image Editor! Look for the image editor icon in the activity bar or sidebar.`,
                        'OK'
                    )
                } catch (error) {
                    console.error(
                        '[Crater] Error opening image in image editor:',
                        error
                    )
                    if (
                        error instanceof Error &&
                        error.message.includes(
                            "command 'crater-image-editor.loadImage' not found"
                        )
                    ) {
                        vscode.window.showErrorMessage(
                            '[Crater] Image Editor extension not found or not active. Please install and activate the Crater Image Editor extension.'
                        )
                    } else {
                        vscode.window.showErrorMessage(
                            `[Crater] Failed to open image in editor: ${error instanceof Error ? error.message : String(error)}`
                        )
                    }
                }
            }
        )

        context.subscriptions.push(openInImageEditorCommand)

        // Listen for configuration changes
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(
            async (event) => {
                if (event.affectsConfiguration('crater-ext')) {
                    try {
                        await chatbotProvider.updateAIProvider()
                    } catch (error) {
                        console.error(
                            '[Crater] Failed to update AI provider:',
                            error
                        )
                    }
                }
            }
        )

        context.subscriptions.push(configChangeListener)

        vscode.window.showInformationMessage(
            '[Crater] Game Asset Assistant is now active!'
        )
    } catch (error) {
        vscode.window.showErrorMessage(
            `[Crater] Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`
        )
        throw error // Re-throw to ensure VS Code knows activation failed
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
