// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { ChatbotProvider } from './chatbotProvider'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "crater-ext" is now active!')

    // Register the chatbot webview provider
    const chatbotProvider = new ChatbotProvider(context.extensionUri)

    // Register the webview view provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatbotProvider.viewType,
            chatbotProvider
        )
    )

    // Register the command to open the chatbot
    const openChatbotCommand = vscode.commands.registerCommand(
        'crater-ext.openChatbot',
        () => {
            // Focus on the explorer view first, then our webview should be visible
            vscode.commands.executeCommand('workbench.view.explorer')
        }
    )

    context.subscriptions.push(openChatbotCommand)
}

// This method is called when your extension is deactivated
export function deactivate() {}
