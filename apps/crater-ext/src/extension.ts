// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { ChatbotProvider } from './chatbotProvider'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Crater extension activated!')

    // Register the chatbot webview provider
    const chatbotProvider = new ChatbotProvider(context.extensionUri)

    // Register the command to open the chatbot
    const openChatbotCommand = vscode.commands.registerCommand(
        'crater-ext.openChatbot',
        () => {
            console.log('crater-ext.openChatbot command triggered!')
            chatbotProvider.createOrShowPanel()
        }
    )

    context.subscriptions.push(openChatbotCommand)

    // Register a debug command that directly tries to show the webview
    const showChatbotCommand = vscode.commands.registerCommand(
        'crater-ext.showChatbot',
        () => {
            console.log('crater-ext.showChatbot (debug) command triggered!')
            chatbotProvider.createOrShowPanel()

            // Log chat history for debugging
            console.log(
                'Current chat history:',
                chatbotProvider.getChatHistory()
            )
        }
    )

    context.subscriptions.push(showChatbotCommand)
}

// This method is called when your extension is deactivated
export function deactivate() {}
