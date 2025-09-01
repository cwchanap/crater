// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Crater extension activated!')

    // Dynamic import to avoid module resolution issues
    const chatbotModule = await import('./chatbotProvider.js')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ChatbotProvider = (chatbotModule as any).ChatbotProvider

    // Register the chatbot webview view provider
    const chatbotProvider = new ChatbotProvider(context.extensionUri)

    // Register the webview view provider for the sidebar
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatbotProvider.viewType,
            chatbotProvider
        )
    )

    // Register the command to open the chatbot (focuses the sidebar view)
    const openChatbotCommand = vscode.commands.registerCommand(
        'crater-ext.openChatbot',
        async () => {
            console.log('crater-ext.openChatbot command triggered!')
            // Focus the chatbot view in the explorer sidebar
            await vscode.commands.executeCommand('crater-ext.chatbotView.focus')
        }
    )

    context.subscriptions.push(openChatbotCommand)

    // Register the debug command to show the chatbot (alternative way to focus)
    const showChatbotCommand = vscode.commands.registerCommand(
        'crater-ext.showChatbot',
        async () => {
            console.log('crater-ext.showChatbot command triggered!')
            // Focus the chatbot view in the custom sidebar
            await vscode.commands.executeCommand('crater-ext.chatbotView.focus')
        }
    )

    context.subscriptions.push(showChatbotCommand)

    // Register a command to update AI provider when configuration changes
    const updateProviderCommand = vscode.commands.registerCommand(
        'crater-ext.updateAIProvider',
        async () => {
            console.log('Updating AI provider configuration...')
            await chatbotProvider.updateAIProvider()
        }
    )

    context.subscriptions.push(updateProviderCommand)

    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
        async (event) => {
            if (event.affectsConfiguration('crater-ext')) {
                console.log(
                    'Crater extension configuration changed, updating AI provider...'
                )
                await chatbotProvider.updateAIProvider()
            }
        }
    )

    context.subscriptions.push(configChangeListener)
}

// This method is called when your extension is deactivated
export function deactivate() {}
