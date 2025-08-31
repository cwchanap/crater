// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { ChatbotProvider } from './chatbotProvider'
import {
    formatDate,
    generateId,
    globalEventEmitter,
    PreferencesService,
} from '@crater/core'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated

    // Demonstrate core package usage
    const sessionId = generateId('session')
    const activationTime = formatDate(new Date())

    console.log(
        `Crater extension activated! Session: ${sessionId} at ${activationTime}`
    )

    // Initialize preferences service
    const prefsService = PreferencesService.getInstance()
    console.log('User theme preference:', prefsService.getPreference('theme'))

    // Set up event listening
    globalEventEmitter.on('extension:activated', (data: unknown) => {
        console.log('Extension activation event received:', data)
    })

    // Emit activation event
    globalEventEmitter.emit('extension:activated', {
        sessionId,
        activationTime,
    })

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
        }
    )

    context.subscriptions.push(showChatbotCommand)
}

// This method is called when your extension is deactivated
export function deactivate() {}
