import * as vscode from 'vscode'

// Use dynamic imports to avoid TypeScript module resolution issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ChatBotService: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MockImageProvider: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GeminiImageProvider: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let OpenAIImageProvider: any

async function loadCraterCore() {
    const craterCore = await import('@crater/core')
    ChatBotService = craterCore.ChatBotService
    MockImageProvider = craterCore.MockImageProvider
    GeminiImageProvider = craterCore.GeminiImageProvider
    OpenAIImageProvider = craterCore.OpenAIImageProvider
}

export class ChatbotProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'crater-ext.chatbotView'
    private _view?: vscode.WebviewView
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private chatBotService: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private currentProvider: any

    constructor(private readonly _extensionUri: vscode.Uri) {
        // Initialize with dynamic imports
        loadCraterCore().then(() => {
            // Initialize with Mock provider by default, will be updated based on configuration
            this.chatBotService = new ChatBotService({
                aiProvider: new MockImageProvider(),
                systemPrompt:
                    'You are a helpful game asset assistant for creating creative game content.',
            })

            // Initialize AI provider based on configuration
            this.initializeAIProvider()
        })
    }

    private async initializeAIProvider(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('crater-ext')
            const aiProvider = config.get<string>('aiProvider', 'mock')

            let provider
            switch (aiProvider) {
                case 'gemini': {
                    const geminiApiKey = config.get<string>('geminiApiKey')
                    if (geminiApiKey) {
                        provider = new GeminiImageProvider({
                            apiKey: geminiApiKey,
                        })
                        console.log('Initialized Gemini AI provider')
                    } else {
                        console.warn(
                            'Gemini API key not configured, falling back to Mock provider'
                        )
                        provider = new MockImageProvider()
                    }
                    break
                }
                case 'openai': {
                    const openaiApiKey = config.get<string>('openaiApiKey')
                    if (openaiApiKey) {
                        provider = new OpenAIImageProvider({
                            apiKey: openaiApiKey,
                        })
                        console.log('Initialized OpenAI provider')
                    } else {
                        console.warn(
                            'OpenAI API key not configured, falling back to Mock provider'
                        )
                        provider = new MockImageProvider()
                    }
                    break
                }
                default: {
                    provider = new MockImageProvider()
                    console.log('Using Mock AI provider')
                    break
                }
            }

            this.currentProvider = provider
            if (this.chatBotService) {
                this.chatBotService.setAIProvider(provider)
            }
        } catch (error) {
            console.error('Failed to initialize AI provider:', error)
            // Fallback to mock provider
            this.currentProvider = new MockImageProvider()
            if (this.chatBotService) {
                this.chatBotService.setAIProvider(this.currentProvider)
            }
        }
    }

    public async updateAIProvider(): Promise<void> {
        await this.initializeAIProvider()

        // Update the webview with current provider info
        if (this._view) {
            this._view.webview.postMessage({
                type: 'provider-updated',
                provider: this.currentProvider?.type || 'mock',
            })
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        }

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'send-message': {
                    if (this.chatBotService) {
                        try {
                            const response =
                                await this.chatBotService.generateResponse(
                                    data.message
                                )
                            webviewView.webview.postMessage({
                                type: 'chat-response',
                                response: response,
                            })
                        } catch (error) {
                            console.error('Error generating response:', error)
                            webviewView.webview.postMessage({
                                type: 'chat-response',
                                response:
                                    'Sorry, I encountered an error while generating a response. Please try again.',
                            })
                        }
                    }
                    break
                }
                case 'get-chat-history': {
                    if (this.chatBotService) {
                        const messages = this.chatBotService.getMessages()
                        webviewView.webview.postMessage({
                            type: 'chat-history',
                            messages: messages,
                        })
                    }
                    break
                }
                case 'clear-chat': {
                    if (this.chatBotService) {
                        this.chatBotService.clearMessages()
                        webviewView.webview.postMessage({
                            type: 'chat-cleared',
                        })
                    }
                    break
                }
                case 'get-provider-info': {
                    webviewView.webview.postMessage({
                        type: 'provider-info',
                        provider: this.currentProvider?.type || 'mock',
                    })
                    break
                }
            }
        })
    }

    private _getHtmlForWebview(_webview: vscode.Webview) {
        return `<!DOCTYPE html>
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
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const clearButton = document.getElementById('clear-button');
        const providerInfo = document.getElementById('provider-info');

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
            const message = messageInput.value.trim();
            if (message) {
                addMessage(message, 'user', new Date());
                
                // Show loading message
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'message assistant loading';
                loadingDiv.textContent = '🤔 Thinking...';
                loadingDiv.id = 'loading-message';
                messagesContainer.appendChild(loadingDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                vscode.postMessage({
                    type: 'send-message',
                    message: message
                });
                
                messageInput.value = '';
            }
        }

        function clearChat() {
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
            const message = event.data;
            switch (message.type) {
                case 'chat-response':
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
        vscode.postMessage({ type: 'get-chat-history' });
        vscode.postMessage({ type: 'get-provider-info' });
    </script>
</body>
</html>`
    }
}
