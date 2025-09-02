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
        const chatbotProvider = new ChatbotProvider(context.extensionUri)
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

        // Also register for the debug view in Explorer
        console.log(
            '[Crater] Registering debug webview provider for Explorer...'
        )
        const debugDisposable = vscode.window.registerWebviewViewProvider(
            'crater-ext.chatbotViewDebug',
            chatbotProvider
        )

        context.subscriptions.push(debugDisposable)
        console.log('[Crater] Debug webview provider registered successfully')

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

        // Register the debug command to show the chatbot (alternative way to focus)
        const showChatbotCommand = vscode.commands.registerCommand(
            'crater-ext.showChatbot',
            async () => {
                console.log(
                    '[Crater] crater-ext.showChatbot command triggered!'
                )
                try {
                    // Try to focus the debug view first (easier to find in Explorer)
                    await vscode.commands.executeCommand(
                        'crater-ext.chatbotViewDebug.focus'
                    )
                    console.log(
                        '[Crater] Successfully focused chatbot debug view'
                    )
                } catch (error) {
                    console.error(
                        '[Crater] Error focusing chatbot debug view:',
                        error
                    )
                    // Fallback to main view
                    try {
                        await vscode.commands.executeCommand(
                            'crater-ext.chatbotView.focus'
                        )
                        console.log(
                            '[Crater] Successfully focused main chatbot view (fallback)'
                        )
                    } catch (fallbackError) {
                        console.error(
                            '[Crater] Error focusing main chatbot view (fallback):',
                            fallbackError
                        )
                        vscode.window.showErrorMessage(
                            `Failed to show chatbot: ${error instanceof Error ? error.message : String(error)}`
                        )
                    }
                }
            }
        )

        context.subscriptions.push(showChatbotCommand)
        console.log('[Crater] Show chatbot command registered')

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

        // Add a test command to debug view registration
        const testCommand = vscode.commands.registerCommand(
            'crater-ext.testViewRegistration',
            async () => {
                console.log('[Crater] Testing view registration...')

                // Try to get the view state first
                console.log('[Crater] Available commands:')
                const commands = await vscode.commands.getCommands()
                const relevantCommands = commands.filter(
                    (cmd) => cmd.includes('crater') || cmd.includes('chatbot')
                )
                console.log(
                    '[Crater] Relevant commands found:',
                    relevantCommands
                )

                // Try to show the Activity Bar container
                console.log(
                    '[Crater] Attempting to show Activity Bar container...'
                )
                try {
                    await vscode.commands.executeCommand(
                        'workbench.view.extension.crater-ext-container'
                    )
                    console.log(
                        '[Crater] Activity Bar container command executed'
                    )
                } catch (error) {
                    console.error(
                        '[Crater] Error showing Activity Bar container:',
                        error
                    )
                }

                // Wait for potential view activation
                setTimeout(async () => {
                    console.log(
                        '[Crater] Attempting to focus main view directly...'
                    )
                    try {
                        await vscode.commands.executeCommand(
                            'crater-ext.chatbotView.focus'
                        )
                        console.log('[Crater] Main view focus command executed')
                    } catch (error) {
                        console.error(
                            '[Crater] Error focusing main view:',
                            error
                        )
                    }

                    console.log(
                        '[Crater] Attempting to focus debug view directly...'
                    )
                    try {
                        await vscode.commands.executeCommand(
                            'crater-ext.chatbotViewDebug.focus'
                        )
                        console.log(
                            '[Crater] Debug view focus command executed'
                        )
                    } catch (error) {
                        console.error(
                            '[Crater] Error focusing debug view:',
                            error
                        )
                    }

                    // Try alternative commands
                    console.log('[Crater] Trying workbench.view.explorer...')
                    try {
                        await vscode.commands.executeCommand(
                            'workbench.view.explorer'
                        )
                        console.log('[Crater] Explorer view shown')
                    } catch (error) {
                        console.error('[Crater] Error showing explorer:', error)
                    }
                }, 2000)

                vscode.window.showInformationMessage(
                    '[Crater] View registration test executed - check Debug Console for logs'
                )
            }
        )

        context.subscriptions.push(testCommand)
        console.log('[Crater] Test command registered')

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
