import * as vscode from 'vscode'
import {
    ChatBotService,
    MockImageProvider,
    GeminiImageProvider,
    OpenAIImageProvider,
} from '@crater/core'

interface WebviewMessage {
    type: string
    text?: string
    messages?: Array<{ text: string; sender: string; timestamp: Date }>
    [key: string]: unknown
}

export class ChatbotProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'crater-ext.chatbotView'
    private _view?: vscode.WebviewView
    private chatBotService: ChatBotService
    private currentProvider:
        | MockImageProvider
        | GeminiImageProvider
        | OpenAIImageProvider
    private _isInitialized = false

    constructor(private readonly _extensionUri: vscode.Uri) {
        console.log('[Crater] ChatbotProvider constructor called')
        console.log(
            '[Crater] Extension URI in constructor:',
            _extensionUri.toString()
        )

        // Initialize with Mock provider by default, will be updated based on configuration
        const mockProvider = new MockImageProvider()
        this.chatBotService = new ChatBotService(
            {
                systemPrompt:
                    'You are a helpful game asset assistant for creating creative game content.',
            },
            mockProvider
        )
        this.currentProvider = mockProvider

        console.log('[Crater] ChatBotService initialized successfully')

        // Initialize AI provider based on configuration
        this.initializeAIProvider()
            .then(() => {
                this._isInitialized = true
                console.log('[Crater] ChatbotProvider: Initialization complete')
            })
            .catch((error) => {
                console.error(
                    '[Crater] ChatbotProvider: Failed to initialize:',
                    error
                )
                vscode.window.showErrorMessage(
                    `[Crater] Failed to initialize chatbot: ${error instanceof Error ? error.message : String(error)}`
                )
            })
    }

    private async initializeAIProvider(): Promise<void> {
        try {
            console.log('[Crater] Initializing AI provider...')
            const config = vscode.workspace.getConfiguration('crater-ext')
            const aiProvider = config.get<string>('aiProvider', 'mock')
            console.log('[Crater] Selected AI provider:', aiProvider)

            let provider
            switch (aiProvider) {
                case 'gemini': {
                    const geminiApiKey = config.get<string>('geminiApiKey')
                    console.log(
                        '[Crater] Gemini API key provided:',
                        !!geminiApiKey
                    )
                    if (geminiApiKey) {
                        provider = new GeminiImageProvider({
                            apiKey: geminiApiKey,
                        })
                        console.log('[Crater] Initialized Gemini AI provider')
                    } else {
                        console.warn(
                            '[Crater] Gemini API key not configured, falling back to Mock provider'
                        )
                        provider = new MockImageProvider()
                    }
                    break
                }
                case 'openai': {
                    const openaiApiKey = config.get<string>('openaiApiKey')
                    console.log(
                        '[Crater] OpenAI API key provided:',
                        !!openaiApiKey
                    )
                    if (openaiApiKey) {
                        provider = new OpenAIImageProvider({
                            apiKey: openaiApiKey,
                        })
                        console.log('[Crater] Initialized OpenAI provider')
                    } else {
                        console.warn(
                            '[Crater] OpenAI API key not configured, falling back to Mock provider'
                        )
                        provider = new MockImageProvider()
                    }
                    break
                }
                default: {
                    provider = new MockImageProvider()
                    console.log('[Crater] Using Mock AI provider')
                    break
                }
            }

            this.currentProvider = provider
            console.log(
                '[Crater] Current provider set:',
                provider.constructor.name
            )
            if (this.chatBotService) {
                this.chatBotService.setAIProvider(provider)
                console.log(
                    '[Crater] AI provider set on ChatBotService successfully'
                )
            }
        } catch (error) {
            console.error('[Crater] Failed to initialize AI provider:', error)
            // Fallback to mock provider
            this.currentProvider = new MockImageProvider()
            console.log('[Crater] Fallback to Mock provider due to error')
            if (this.chatBotService) {
                this.chatBotService.setAIProvider(this.currentProvider)
                console.log('[Crater] Fallback provider set on ChatBotService')
            }
        }
    }

    public async updateAIProvider(): Promise<void> {
        console.log('[Crater] updateAIProvider called')
        await this.initializeAIProvider()

        // Update the webview with current provider info
        if (this._view) {
            this._view.webview.postMessage({
                type: 'provider-updated',
                provider: this.currentProvider?.type || 'mock',
            })
        }
    }

    // This method is called by VS Code when the view needs to be shown
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        console.log(
            '[Crater ChatbotProvider] *** resolveWebviewView CALLED! ***'
        )
        console.log(
            '[Crater ChatbotProvider] WebviewView object:',
            !!webviewView
        )
        console.log('[Crater ChatbotProvider] Context:', context)
        console.log('[Crater ChatbotProvider] Token:', !!token)

        this._view = webviewView

        // Configure the webview
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        }

        // Set the HTML content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)
        console.log('[Crater ChatbotProvider] HTML content set for webview')

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            (message) => {
                console.log(
                    '[Crater ChatbotProvider] Received message from webview:',
                    message
                )
                this._handleMessage(message)
            },
            undefined,
            []
        )

        console.log(
            '[Crater ChatbotProvider] resolveWebviewView completed successfully'
        )
    }

    private async _handleMessage(message: WebviewMessage): Promise<void> {
        console.log('[Crater ChatbotProvider] Handling message:', message.type)

        if (!this._view) {
            console.error(
                '[Crater ChatbotProvider] No view available to handle message'
            )
            return
        }

        switch (message.type) {
            case 'chat-message':
                if (message.text && this.chatBotService) {
                    try {
                        console.log(
                            '[Crater ChatbotProvider] Processing chat message:',
                            message.text
                        )
                        const response =
                            await this.chatBotService.generateResponse(
                                message.text
                            )
                        this._view.webview.postMessage({
                            type: 'chat-response',
                            response: response,
                        })
                    } catch (error) {
                        console.error(
                            '[Crater ChatbotProvider] Error generating response:',
                            error
                        )
                        this._view.webview.postMessage({
                            type: 'chat-response',
                            response: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        })
                    }
                }
                break
            case 'get-chat-history':
                // For now, just send empty history
                this._view.webview.postMessage({
                    type: 'chat-history',
                    messages: [],
                })
                break
            case 'get-provider-info':
                this._view.webview.postMessage({
                    type: 'provider-info',
                    provider: this.currentProvider?.type || 'mock',
                })
                break
            case 'clear-chat':
                this._view.webview.postMessage({
                    type: 'chat-cleared',
                })
                break
            default:
                console.warn(
                    '[Crater ChatbotProvider] Unknown message type:',
                    message.type
                )
        }
    }

    private _getErrorHtmlForWebview(error: Error | string): string {
        console.log('[Crater] Generating error HTML for WebView')
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crater - Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 20px;
            text-align: center;
        }
        .error-container {
            border: 1px solid var(--vscode-errorBorder);
            background-color: var(--vscode-inputValidation-errorBackground);
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
        }
        .error-title {
            color: var(--vscode-errorForeground);
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .error-message {
            color: var(--vscode-foreground);
            margin-bottom: 15px;
        }
        .retry-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .retry-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-title">🔧 Crater Initialization Error</div>
        <div class="error-message">
            Failed to initialize the Game Asset Assistant.<br>
            <small>Error: ${error instanceof Error ? error.message : String(error)}</small>
        </div>
        <button class="retry-button" onclick="location.reload()">Retry</button>
    </div>
    <script>
        console.log('[Crater WebView] Error page loaded');
    </script>
</body>
</html>`
    }

    private _getHtmlForWebview(_webview: vscode.Webview) {
        console.log('[Crater] _getHtmlForWebview called')

        try {
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crater Game Asset Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 16px;
            overflow-x: hidden;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 12px;
            background-color: var(--vscode-badge-background);
            border-radius: 6px;
        }

        .header h2 {
            margin: 0;
            color: var(--vscode-badge-foreground);
            font-size: 16px;
        }

        .provider-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 200px);
            min-height: 300px;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            margin-bottom: 12px;
            background-color: var(--vscode-input-background);
        }

        .message {
            margin-bottom: 12px;
            padding: 8px;
            border-radius: 4px;
            max-width: 100%;
            word-wrap: break-word;
        }

        .message.user {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20px;
        }

        .message.assistant {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            margin-right: 20px;
        }

        .input-container {
            display: flex;
            gap: 8px;
        }

        .message-input {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
        }

        .message-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .send-button, .clear-button {
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
        }

        .send-button:hover, .clear-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .clear-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .clear-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .loading {
            font-style: italic;
            color: var(--vscode-descriptionForeground);
        }

        .controls {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
        }

        .timestamp {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .welcome-message {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🎮 Game Asset Assistant</h2>
        <div class="provider-info" id="provider-info">AI Provider: Loading...</div>
    </div>

    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="welcome-message">
                👋 Hi! I'm your game asset assistant. Ask me about characters, backgrounds, textures, UI elements, sounds, animations, and more!
            </div>
        </div>

        <div class="controls">
            <button class="clear-button" id="clear-button">Clear Chat</button>
        </div>

        <div class="input-container">
            <input type="text" class="message-input" id="message-input" placeholder="Ask about game assets..." />
            <button class="send-button" id="send-button">Send</button>
        </div>
    </div>

    <script>
        console.log('[Crater WebView] Script started loading');
        const vscode = acquireVsCodeApi();
        console.log('[Crater WebView] VS Code API acquired');
        
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const clearButton = document.getElementById('clear-button');
        const providerInfo = document.getElementById('provider-info');
        
        console.log('[Crater WebView] DOM elements found:', {
            messagesContainer: !!messagesContainer,
            messageInput: !!messageInput,
            sendButton: !!sendButton,
            clearButton: !!clearButton,
            providerInfo: !!providerInfo
        });

        function addMessage(text, sender, timestamp) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}\`;
            
            const messageText = document.createElement('div');
            messageText.textContent = text;
            messageDiv.appendChild(messageText);
            
            if (timestamp) {
                const timestampDiv = document.createElement('div');
                timestampDiv.className = 'timestamp';
                timestampDiv.textContent = new Date(timestamp).toLocaleTimeString();
                messageDiv.appendChild(timestampDiv);
            }
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function sendMessage() {
            console.log('[Crater WebView] sendMessage called');
            const message = messageInput.value.trim();
            if (message) {
                console.log('[Crater WebView] Sending message:', message);
                addMessage(message, 'user', new Date());
                
                // Show loading message
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'message assistant loading';
                loadingDiv.textContent = '🤔 Thinking...';
                loadingDiv.id = 'loading-message';
                messagesContainer.appendChild(loadingDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                console.log('[Crater WebView] Posting message to extension');
                vscode.postMessage({
                    type: 'send-message',
                    message: message
                });
                
                messageInput.value = '';
            }
        }

        function clearChat() {
            console.log('[Crater WebView] clearChat called');
            vscode.postMessage({ type: 'clear-chat' });
        }

        function updateProviderInfo(provider) {
            const providerNames = {
                'mock': 'Mock (Demo)',
                'gemini': 'Google Gemini',
                'openai': 'OpenAI GPT'
            };
            providerInfo.textContent = \`AI Provider: \${providerNames[provider] || provider}\`;
        }

        sendButton.addEventListener('click', sendMessage);
        clearButton.addEventListener('click', clearChat);
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Handle messages from the extension
        window.addEventListener('message', event => {
            console.log('[Crater WebView] Received message from extension:', event.data.type);
            const message = event.data;
            switch (message.type) {
                case 'chat-response':
                    console.log('[Crater WebView] Processing chat response');
                    // Remove loading message
                    const loadingMessage = document.getElementById('loading-message');
                    if (loadingMessage) {
                        loadingMessage.remove();
                    }
                    addMessage(message.response, 'assistant', new Date());
                    break;
                case 'chat-history':
                    // Clear existing messages except welcome
                    const existingMessages = messagesContainer.querySelectorAll('.message:not(.welcome-message)');
                    existingMessages.forEach(msg => msg.remove());
                    
                    // Add historical messages
                    message.messages.forEach(msg => {
                        addMessage(msg.text, msg.sender, msg.timestamp);
                    });
                    break;
                case 'chat-cleared':
                    // Clear all messages except welcome
                    const allMessages = messagesContainer.querySelectorAll('.message:not(.welcome-message)');
                    allMessages.forEach(msg => msg.remove());
                    break;
                case 'provider-info':
                case 'provider-updated':
                    updateProviderInfo(message.provider);
                    break;
            }
        });

        // Request chat history on load
        console.log('[Crater WebView] Page loaded, requesting initial data');
        vscode.postMessage({ type: 'get-chat-history' });
        vscode.postMessage({ type: 'get-provider-info' });
    </script>
</body>
</html>`

            console.log(
                '[Crater] HTML generated successfully, length:',
                html.length
            )
            return html
        } catch (error) {
            console.error('[Crater] Error generating HTML for WebView:', error)
            throw error
        }
    }
}
