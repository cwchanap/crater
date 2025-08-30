import * as vscode from 'vscode'

export class ChatbotProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'crater-chatbot'

    private _view?: vscode.WebviewView

    constructor(private readonly _extensionUri: vscode.Uri) {}

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

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'sendMessage':
                    await this._handleUserMessage(message.text)
                    break
                case 'clearChat':
                    this._clearChat()
                    break
            }
        }, undefined)
    }

    private async _handleUserMessage(userMessage: string) {
        // Add user message to chat
        this._addMessageToChat(userMessage, 'user')

        // Simulate AI response (in a real implementation, you'd call an AI service)
        const aiResponse = await this._generateAIResponse(userMessage)
        this._addMessageToChat(aiResponse, 'assistant')
    }

    private async _generateAIResponse(userMessage: string): Promise<string> {
        // Simulate thinking time
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Simple rule-based responses for demo
        const lowercaseMessage = userMessage.toLowerCase()

        if (
            lowercaseMessage.includes('sprite') ||
            lowercaseMessage.includes('character')
        ) {
            return `I can help you generate character sprites! Here are some suggestions:

**Character Sprite Ideas:**
- 2D pixel art characters (8-bit, 16-bit style)
- Modern high-resolution sprites
- Animated character frames
- Different poses and animations

What type of character are you looking for? (e.g., warrior, mage, robot, etc.)`
        }

        if (
            lowercaseMessage.includes('background') ||
            lowercaseMessage.includes('environment')
        ) {
            return `Great! I can help with background assets:

**Background Types:**
- Parallax scrolling backgrounds
- Tiled environments
- Sky boxes and landscapes
- Interior scenes
- Sci-fi or fantasy environments

What setting are you creating? (e.g., forest, city, space, dungeon)`
        }

        if (
            lowercaseMessage.includes('texture') ||
            lowercaseMessage.includes('material')
        ) {
            return `Textures are essential for great-looking games! I can suggest:

**Texture Categories:**
- Stone and brick textures
- Metal and rust patterns
- Fabric and cloth materials
- Natural textures (wood, grass, water)
- Sci-fi materials

What surface are you trying to texture?`
        }

        if (
            lowercaseMessage.includes('ui') ||
            lowercaseMessage.includes('interface')
        ) {
            return `UI assets can make or break the user experience! Consider:

**UI Elements:**
- Buttons and menus
- Health bars and progress indicators
- Inventory panels
- Dialog boxes
- Icons and symbols

What type of UI element do you need help with?`
        }

        // Default response
        return `Hello! I'm your game asset assistant. I can help you brainstorm and plan:

🎮 **Game Assets I Can Help With:**
- Character sprites and animations
- Background environments
- Textures and materials
- UI elements and interfaces
- Sound effect concepts
- Game mechanics ideas

What type of game asset are you working on today?`
    }

    private _addMessageToChat(message: string, sender: 'user' | 'assistant') {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: message,
                sender: sender,
            })
        }
    }

    private _clearChat() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'clearChat',
            })
        }
    }

    private _getHtmlForWebview(_webview: vscode.Webview): string {
        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Game Asset Chatbot</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 16px;
                height: 100vh;
                display: flex;
                flex-direction: column;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            
            .title {
                font-size: 16px;
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            
            .clear-btn {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .clear-btn:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            
            .chat-container {
                flex: 1;
                overflow-y: auto;
                margin-bottom: 16px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 12px;
                background: var(--vscode-input-background);
            }
            
            .message {
                margin-bottom: 12px;
                padding: 8px 12px;
                border-radius: 8px;
                max-width: 85%;
                word-wrap: break-word;
            }
            
            .message.user {
                background: var(--vscode-textBlockQuote-background);
                margin-left: auto;
                text-align: right;
            }
            
            .message.assistant {
                background: var(--vscode-textCodeBlock-background);
                margin-right: auto;
            }
            
            .message.assistant pre {
                background: var(--vscode-textPreformat-background);
                padding: 8px;
                border-radius: 4px;
                overflow-x: auto;
                margin: 8px 0;
            }
            
            .input-container {
                display: flex;
                gap: 8px;
            }
            
            .message-input {
                flex: 1;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                padding: 8px 12px;
                font-family: inherit;
                font-size: 14px;
            }
            
            .message-input:focus {
                outline: none;
                border-color: var(--vscode-focusBorder);
            }
            
            .send-btn {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
                font-size: 14px;
            }
            
            .send-btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
            
            .send-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .welcome-message {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
                margin: 40px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">🎮 Game Asset Assistant</div>
            <button class="clear-btn" onclick="clearChat()">Clear Chat</button>
        </div>
        
        <div class="chat-container" id="chatContainer">
            <div class="welcome-message">
                Welcome! I'm here to help you brainstorm and plan game assets.<br>
                Ask me about sprites, backgrounds, textures, UI elements, and more!
            </div>
        </div>
        
        <div class="input-container">
            <input 
                type="text" 
                class="message-input" 
                id="messageInput" 
                placeholder="Ask me about game assets..."
                maxlength="500"
            >
            <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const chatContainer = document.getElementById('chatContainer');
            
            // Handle Enter key
            messageInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            function sendMessage() {
                const text = messageInput.value.trim();
                if (!text) return;
                
                // Disable input while processing
                messageInput.disabled = true;
                sendBtn.disabled = true;
                
                // Send message to extension
                vscode.postMessage({
                    type: 'sendMessage',
                    text: text
                });
                
                // Clear input
                messageInput.value = '';
            }
            
            function clearChat() {
                vscode.postMessage({
                    type: 'clearChat'
                });
            }
            
            function addMessage(message, sender) {
                // Remove welcome message if it exists
                const welcomeMsg = chatContainer.querySelector('.welcome-message');
                if (welcomeMsg) {
                    welcomeMsg.remove();
                }
                
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${sender}\`;
                
                // Convert markdown-like formatting
                let formattedMessage = message
                    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                    .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
                    .replace(/\`(.*?)\`/g, '<code>$1</code>')
                    .replace(/\\n/g, '<br>');
                
                messageDiv.innerHTML = formattedMessage;
                chatContainer.appendChild(messageDiv);
                
                // Scroll to bottom
                chatContainer.scrollTop = chatContainer.scrollHeight;
                
                // Re-enable input
                messageInput.disabled = false;
                sendBtn.disabled = false;
                messageInput.focus();
            }
            
            function clearChatMessages() {
                chatContainer.innerHTML = '<div class="welcome-message">Welcome! I\\'m here to help you brainstorm and plan game assets.<br>Ask me about sprites, backgrounds, textures, UI elements, and more!</div>';
            }
            
            // Handle messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'addMessage':
                        addMessage(message.message, message.sender);
                        break;
                    case 'clearChat':
                        clearChatMessages();
                        break;
                }
            });
            
            // Focus input on load
            messageInput.focus();
        </script>
    </body>
    </html>`
    }
}
