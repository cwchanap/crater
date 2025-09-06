import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import {
    ChatBotService,
    GeminiImageProvider,
    OpenAIImageProvider,
} from '@crater/core'

interface WebviewMessage {
    type: string
    text?: string
    messages?: Array<{
        text: string
        sender: string
        timestamp: Date
        messageType?: 'text' | 'image'
        imageData?: {
            images: string[]
            prompt: string
            savedPaths?: string[]
        }
    }>
    [key: string]: unknown
}

interface ExtendedChatMessage {
    id: string
    text: string
    sender: 'user' | 'assistant'
    timestamp: string
    messageType?: 'text' | 'image'
    imageData?: {
        images: string[]
        prompt: string
        savedPaths?: string[]
    }
}

interface ChatSession {
    id: string
    title: string
    messages: ExtendedChatMessage[]
    createdAt: string
    lastActivity: string
}

export class ChatbotProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'crater-ext.chatbotView'
    private _view?: vscode.WebviewView
    private chatBotService: ChatBotService
    private currentProvider: GeminiImageProvider | OpenAIImageProvider | null
    // private _isInitialized = false // Unused for now
    private _extensionContext?: vscode.ExtensionContext
    private _extendedChatHistory: ExtendedChatMessage[] = []
    private _chatSessions: ChatSession[] = []
    private _currentSessionId: string | null = null

    constructor(
        private readonly _extensionUri: vscode.Uri,
        extensionContext?: vscode.ExtensionContext
    ) {
        console.log('[Crater] ChatbotProvider constructor called')
        console.log(
            '[Crater] Extension URI in constructor:',
            _extensionUri.toString()
        )

        // Store extension context for persistent storage
        this._extensionContext = extensionContext

        // Initialize without provider - will be set during initializeAIProvider
        this.chatBotService = new ChatBotService({
            systemPrompt:
                'You are a helpful game asset assistant for creating creative game content.',
        })
        this.currentProvider = null

        console.log('[Crater] ChatBotService initialized successfully')

        // Load chat history from storage
        this.loadChatHistory().catch((error) => {
            console.error('[Crater] Failed to load chat history:', error)
        })

        // Initialize AI provider based on configuration
        this.initializeAIProvider()
            .then(() => {
                // this._isInitialized = true
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

    private async loadChatHistory(): Promise<void> {
        if (!this._extensionContext) {
            console.log(
                '[Crater] No extension context available for loading chat history'
            )
            return
        }

        try {
            // Load chat sessions
            const storedSessions = this._extensionContext.globalState.get<
                ChatSession[]
            >('crater.chatSessions', [])
            this._chatSessions = storedSessions

            // Load current session ID
            this._currentSessionId = this._extensionContext.globalState.get<
                string | null
            >('crater.currentSessionId', null)

            // If we have a current session, load its messages
            if (this._currentSessionId) {
                const currentSession = this._chatSessions.find(
                    (s) => s.id === this._currentSessionId
                )
                if (currentSession) {
                    this._extendedChatHistory = currentSession.messages
                    console.log(
                        `[Crater] Loaded ${currentSession.messages.length} messages from current session`
                    )
                } else {
                    // Current session doesn't exist, clear it
                    this._currentSessionId = null
                    this._extendedChatHistory = []
                }
            } else {
                // No current session, check for legacy chat history to migrate
                const legacyData = this._extensionContext.globalState.get<
                    (
                        | ExtendedChatMessage
                        | {
                              id: string
                              text: string
                              sender: 'user' | 'assistant'
                              timestamp: string
                          }
                    )[]
                >('crater.chatHistory', [])

                if (legacyData.length > 0) {
                    // Migrate legacy data to new session format
                    const migratedMessages: ExtendedChatMessage[] =
                        legacyData.map((msg) => {
                            if (!('messageType' in msg) || !msg.messageType) {
                                return {
                                    id: msg.id ?? this.generateMessageId(),
                                    text: msg.text,
                                    sender: msg.sender,
                                    timestamp: msg.timestamp,
                                    messageType: 'text' as const,
                                }
                            }
                            return msg as ExtendedChatMessage
                        })

                    // Create a new session with migrated data
                    const migratedSession: ChatSession = {
                        id: this.generateSessionId(),
                        title: this.generateSessionTitle(migratedMessages),
                        messages: migratedMessages,
                        createdAt:
                            migratedMessages[0]?.timestamp ||
                            new Date().toISOString(),
                        lastActivity:
                            migratedMessages[migratedMessages.length - 1]
                                ?.timestamp || new Date().toISOString(),
                    }

                    this._chatSessions = [migratedSession]
                    this._currentSessionId = migratedSession.id
                    this._extendedChatHistory = migratedMessages

                    // Save migrated data and clean up legacy storage
                    await this.saveChatSessions()
                    await this._extensionContext.globalState.update(
                        'crater.chatHistory',
                        undefined
                    )

                    console.log(
                        `[Crater] Migrated ${migratedMessages.length} messages to new session format`
                    )
                } else {
                    this._extendedChatHistory = []
                }
            }

            console.log(
                `[Crater] Loaded ${this._chatSessions.length} chat sessions`
            )
        } catch (error) {
            console.error('[Crater] Error loading chat history:', error)
        }
    }

    private async saveChatHistory(): Promise<void> {
        if (!this._extensionContext) {
            console.log(
                '[Crater] No extension context available for saving chat history'
            )
            return
        }

        try {
            // Update current session with latest messages
            if (this._currentSessionId) {
                const sessionIndex = this._chatSessions.findIndex(
                    (s) => s.id === this._currentSessionId
                )
                if (sessionIndex >= 0) {
                    this._chatSessions[sessionIndex].messages = [
                        ...this._extendedChatHistory,
                    ]
                    this._chatSessions[sessionIndex].lastActivity =
                        new Date().toISOString()

                    // Update title if it's a generic title and we have messages
                    if (
                        this._chatSessions[sessionIndex].title.startsWith(
                            'Chat '
                        ) &&
                        this._extendedChatHistory.length > 0
                    ) {
                        this._chatSessions[sessionIndex].title =
                            this.generateSessionTitle(this._extendedChatHistory)
                    }
                }
            }

            await this.saveChatSessions()
            console.log(
                `[Crater] Saved ${this._extendedChatHistory.length} messages to current session`
            )
        } catch (error) {
            console.error('[Crater] Error saving chat history:', error)
        }
    }

    private async saveChatSessions(): Promise<void> {
        if (!this._extensionContext) return

        try {
            await this._extensionContext.globalState.update(
                'crater.chatSessions',
                this._chatSessions
            )
            await this._extensionContext.globalState.update(
                'crater.currentSessionId',
                this._currentSessionId
            )
            console.log(
                `[Crater] Saved ${this._chatSessions.length} chat sessions`
            )
        } catch (error) {
            console.error('[Crater] Error saving chat sessions:', error)
        }
    }

    private generateSessionId(): string {
        return (
            'session_' +
            Date.now().toString() +
            Math.random().toString(36).substring(2, 11)
        )
    }

    private generateSessionTitle(messages: ExtendedChatMessage[]): string {
        if (messages.length === 0) {
            return `Chat ${new Date().toLocaleDateString()}`
        }

        // Find first user message to use as title base
        const firstUserMessage = messages.find((m) => m.sender === 'user')
        if (firstUserMessage) {
            // Take first 30 characters and clean up
            const titleBase = firstUserMessage.text
                .substring(0, 30)
                .replace(/\n/g, ' ')
                .trim()
            return titleBase.length < firstUserMessage.text.length
                ? titleBase + '...'
                : titleBase
        }

        return `Chat ${new Date().toLocaleDateString()}`
    }

    private async createNewChat(): Promise<void> {
        // Save current chat if it has messages
        if (this._extendedChatHistory.length > 0) {
            await this.saveChatHistory()
        }

        // Create new session
        const newSession: ChatSession = {
            id: this.generateSessionId(),
            title: `Chat ${new Date().toLocaleDateString()}`,
            messages: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
        }

        this._chatSessions.unshift(newSession) // Add to beginning
        this._currentSessionId = newSession.id
        this._extendedChatHistory = []

        await this.saveChatSessions()
        console.log('[Crater] Created new chat session:', newSession.id)
    }

    private async loadChatSession(sessionId: string): Promise<void> {
        // Save current chat if it has unsaved changes
        if (this._extendedChatHistory.length > 0 && this._currentSessionId) {
            await this.saveChatHistory()
        }

        const session = this._chatSessions.find((s) => s.id === sessionId)
        if (session) {
            this._currentSessionId = sessionId
            this._extendedChatHistory = [...session.messages]

            // Update last activity
            session.lastActivity = new Date().toISOString()
            await this.saveChatSessions()

            console.log(
                `[Crater] Loaded chat session: ${sessionId} with ${session.messages.length} messages`
            )
        } else {
            console.error(`[Crater] Chat session not found: ${sessionId}`)
        }
    }

    private generateMessageId(): string {
        return (
            Date.now().toString() + Math.random().toString(36).substring(2, 11)
        )
    }

    private addMessageToHistory(
        text: string,
        sender: 'user' | 'assistant',
        messageType: 'text' | 'image' = 'text',
        imageData?: { images: string[]; prompt: string; savedPaths?: string[] }
    ): void {
        const message: ExtendedChatMessage = {
            id: this.generateMessageId(),
            text,
            sender,
            timestamp: new Date().toISOString(),
            messageType,
            imageData,
        }
        this._extendedChatHistory.push(message)
    }

    private isValidApiKey(apiKey: string, provider: string): boolean {
        if (!apiKey || apiKey.trim().length === 0) {
            return false
        }

        // Basic validation for common API key formats
        if (provider === 'gemini' && !apiKey.startsWith('AIza')) {
            return false
        }

        if (provider === 'openai' && !apiKey.startsWith('sk-')) {
            return false
        }

        if (apiKey.length < 20) {
            return false
        }

        return true
    }

    private async initializeAIProvider(): Promise<void> {
        try {
            console.log('[Crater] Initializing AI provider...')
            const config = vscode.workspace.getConfiguration('crater-ext')
            const aiProvider = config.get<string>('aiProvider', 'gemini') // Default to gemini
            console.log('[Crater] Selected AI provider:', aiProvider)

            let provider: GeminiImageProvider | OpenAIImageProvider | null =
                null

            switch (aiProvider) {
                case 'gemini': {
                    const geminiApiKey = config.get<string>('geminiApiKey')
                    console.log(
                        '[Crater] Gemini API key provided:',
                        !!geminiApiKey
                    )
                    if (
                        geminiApiKey &&
                        this.isValidApiKey(geminiApiKey, 'gemini')
                    ) {
                        provider = new GeminiImageProvider({
                            apiKey: geminiApiKey,
                        })
                        console.log('[Crater] Initialized Gemini AI provider')
                    } else {
                        console.warn(
                            '[Crater] Gemini API key not configured or invalid'
                        )
                    }
                    break
                }
                case 'openai': {
                    const openaiApiKey = config.get<string>('openaiApiKey')
                    const imageSize = config.get<string>('imageSize', 'auto')
                    const imageQuality = config.get<string>(
                        'imageQuality',
                        'auto'
                    )
                    console.log(
                        '[Crater] OpenAI API key provided:',
                        !!openaiApiKey
                    )
                    console.log(
                        '[Crater] OpenAI image settings - Size:',
                        imageSize,
                        'Quality:',
                        imageQuality
                    )
                    if (
                        openaiApiKey &&
                        this.isValidApiKey(openaiApiKey, 'openai')
                    ) {
                        provider = new OpenAIImageProvider({
                            apiKey: openaiApiKey,
                            defaultImageSize: imageSize,
                            defaultImageQuality: imageQuality,
                        })
                        console.log('[Crater] Initialized OpenAI provider')
                    } else {
                        console.warn(
                            '[Crater] OpenAI API key not configured or invalid'
                        )
                    }
                    break
                }
                default: {
                    console.log(
                        '[Crater] Unknown provider, checking for any valid configuration'
                    )
                    // Check if any provider has a valid API key
                    const geminiApiKey = config.get<string>('geminiApiKey')
                    const openaiApiKey = config.get<string>('openaiApiKey')

                    if (
                        geminiApiKey &&
                        this.isValidApiKey(geminiApiKey, 'gemini')
                    ) {
                        provider = new GeminiImageProvider({
                            apiKey: geminiApiKey,
                        })
                        console.log('[Crater] Auto-selected Gemini provider')
                    } else if (
                        openaiApiKey &&
                        this.isValidApiKey(openaiApiKey, 'openai')
                    ) {
                        const imageSize = config.get<string>(
                            'imageSize',
                            'auto'
                        )
                        const imageQuality = config.get<string>(
                            'imageQuality',
                            'auto'
                        )
                        provider = new OpenAIImageProvider({
                            apiKey: openaiApiKey,
                            defaultImageSize: imageSize,
                            defaultImageQuality: imageQuality,
                        })
                        console.log('[Crater] Auto-selected OpenAI provider')
                    }
                    break
                }
            }

            this.currentProvider = provider
            if (provider) {
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
            } else {
                console.log('[Crater] No valid AI provider configured')
            }
        } catch (error) {
            console.error('[Crater] Failed to initialize AI provider:', error)
            this.currentProvider = null
            console.log('[Crater] No provider available due to error')
        }
    }

    public async updateAIProvider(): Promise<void> {
        console.log('[Crater] updateAIProvider called')
        await this.initializeAIProvider()

        // Update the webview with current provider info
        if (this._view) {
            this._view.webview.postMessage({
                type: 'provider-updated',
                provider: this.currentProvider?.type || null,
                configured: !!this.currentProvider,
            })
        }
    }

    private async saveImageToFile(
        base64Data: string,
        prompt: string
    ): Promise<string | null> {
        try {
            const config = vscode.workspace.getConfiguration('crater-ext')
            const autoSave = config.get<boolean>('autoSaveImages', true)

            if (!autoSave) {
                return null
            }

            let saveDirectory = config.get<string>(
                'imageSaveDirectory',
                '${workspaceFolder}/images'
            )

            // Resolve VS Code variables
            if (
                vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders.length > 0
            ) {
                const workspaceFolder =
                    vscode.workspace.workspaceFolders[0].uri.fsPath
                saveDirectory = saveDirectory.replace(
                    '${workspaceFolder}',
                    workspaceFolder
                )
            } else {
                // No workspace, use extension directory
                saveDirectory = path.join(this._extensionUri.fsPath, 'images')
            }

            // Create directory if it doesn't exist
            if (!fs.existsSync(saveDirectory)) {
                fs.mkdirSync(saveDirectory, { recursive: true })
            }

            // Generate filename from prompt and timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const sanitizedPrompt = prompt
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50)

            const filename = `${sanitizedPrompt}_${timestamp}.png`
            const filePath = path.join(saveDirectory, filename)

            // Convert base64 to buffer and save
            const imageBuffer = Buffer.from(base64Data, 'base64')
            fs.writeFileSync(filePath, imageBuffer)

            console.log(`[Crater] Image saved to: ${filePath}`)
            return filePath
        } catch (error) {
            console.error('[Crater] Error saving image:', error)
            vscode.window.showErrorMessage(`Failed to save image: ${error}`)
            return null
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

        // Proactively send chat history to the webview after a short delay
        // This helps with cases where the webview loads before the initial request is made
        setTimeout(() => {
            this.loadChatHistory()
                .then(() => {
                    const messages = this._extendedChatHistory.map((msg) => ({
                        text: msg.text,
                        sender: msg.sender,
                        timestamp: new Date(msg.timestamp),
                        messageType: msg.messageType,
                        imageData: msg.imageData,
                    }))
                    if (messages.length > 0 && this._view) {
                        console.log(
                            `[Crater ChatbotProvider] Proactively sending ${messages.length} messages to newly created webview`
                        )
                        this._view.webview.postMessage({
                            type: 'chat-history',
                            messages: messages,
                        })
                    }
                })
                .catch((error) => {
                    console.error(
                        '[Crater] Error proactively loading chat history:',
                        error
                    )
                })
        }, 200)
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
            case 'send-message': {
                if (!this.currentProvider) {
                    this._view.webview.postMessage({
                        type: 'chat-response',
                        response:
                            'Please configure your API key in settings first.',
                    })
                    break
                }
                const messageText = (message.text || message.message) as string
                if (messageText && this.chatBotService) {
                    try {
                        console.log(
                            '[Crater ChatbotProvider] Processing chat message:',
                            messageText
                        )

                        // Add user message to extended chat history
                        this.addMessageToHistory(messageText, 'user', 'text')

                        // Generate image directly without fallback
                        const imageResponse =
                            await this.chatBotService.generateImage(messageText)
                        console.log(
                            '[Crater ChatbotProvider] Image generated successfully'
                        )
                        console.log(
                            '[Crater ChatbotProvider] Raw image response:',
                            JSON.stringify(imageResponse, null, 2)
                        )

                        // Process images and save them if enabled
                        const imageUrls: string[] = []
                        const savedPaths: string[] = []

                        for (const img of imageResponse.images) {
                            if (img.url) {
                                imageUrls.push(img.url)
                            } else if (img.base64) {
                                // Convert base64 to data URL for display
                                imageUrls.push(
                                    `data:image/png;base64,${img.base64}`
                                )

                                // Save image to file
                                const savedPath = await this.saveImageToFile(
                                    img.base64,
                                    messageText
                                )
                                if (savedPath) {
                                    savedPaths.push(savedPath)
                                }
                            }
                        }

                        console.log(
                            '[Crater ChatbotProvider] Extracted URLs/Data URLs:',
                            imageUrls
                        )
                        console.log(
                            '[Crater ChatbotProvider] Saved image paths:',
                            savedPaths
                        )

                        if (imageUrls.length > 0) {
                            // Add assistant response to extended chat history with image data
                            const responseText = `Generated ${imageUrls.length} image(s) for: "${messageText}"`
                            this.addMessageToHistory(
                                responseText,
                                'assistant',
                                'image',
                                {
                                    images: imageUrls,
                                    prompt: messageText,
                                    savedPaths: savedPaths,
                                }
                            )

                            // Save chat history after adding both user and assistant messages
                            await this.saveChatHistory()

                            this._view.webview.postMessage({
                                type: 'image-response',
                                images: imageUrls,
                                prompt: messageText,
                                savedPaths: savedPaths,
                            })

                            // Show success message if images were saved
                            if (savedPaths.length > 0) {
                                vscode.window.showInformationMessage(
                                    `Generated ${savedPaths.length} image(s) and saved to ${path.dirname(savedPaths[0])}`
                                )
                            }
                        } else {
                            throw new Error(
                                `No image URLs or base64 data received from provider. Response structure: ${JSON.stringify(imageResponse, null, 2)}`
                            )
                        }
                    } catch (error) {
                        console.error(
                            '[Crater ChatbotProvider] Error generating response:',
                            error
                        )

                        let errorMessage = 'Unknown error occurred'

                        if (error instanceof Error) {
                            errorMessage = error.message
                        } else if (error && typeof error === 'object') {
                            // Handle custom error objects like AIProviderError
                            if (
                                'message' in error &&
                                typeof error.message === 'string'
                            ) {
                                errorMessage = error.message
                            } else if (
                                'originalError' in error &&
                                error.originalError instanceof Error
                            ) {
                                errorMessage = error.originalError.message
                            } else {
                                errorMessage = JSON.stringify(error, null, 2)
                            }
                        } else {
                            errorMessage = String(error)
                        }

                        // Add error message to extended chat history
                        this.addMessageToHistory(
                            `❌ Error: ${errorMessage}`,
                            'assistant',
                            'text'
                        )
                        await this.saveChatHistory()

                        this._view.webview.postMessage({
                            type: 'chat-response',
                            response: `❌ **Error**: ${errorMessage}`,
                        })
                    }
                }
                break
            }
            case 'get-chat-history': {
                // Reload chat history from storage in case webview was recreated
                await this.loadChatHistory()

                // Send extended messages with image data
                const messages = this._extendedChatHistory.map((msg) => ({
                    text: msg.text,
                    sender: msg.sender,
                    timestamp: new Date(msg.timestamp),
                    messageType: msg.messageType,
                    imageData: msg.imageData,
                }))
                console.log(
                    `[Crater ChatbotProvider] Sending ${messages.length} chat history messages to webview`
                )
                this._view.webview.postMessage({
                    type: 'chat-history',
                    messages: messages,
                })
                break
            }
            case 'get-provider-info':
                this._view.webview.postMessage({
                    type: 'provider-info',
                    provider: this.currentProvider?.type || null,
                    configured: !!this.currentProvider,
                })
                break
            case 'new-chat':
                await this.createNewChat()
                this._view.webview.postMessage({
                    type: 'chat-cleared',
                })
                break
            case 'get-chat-sessions': {
                // Sort sessions by last activity (most recent first)
                const sortedSessions = [...this._chatSessions].sort(
                    (a, b) =>
                        new Date(b.lastActivity).getTime() -
                        new Date(a.lastActivity).getTime()
                )
                this._view.webview.postMessage({
                    type: 'chat-sessions',
                    sessions: sortedSessions.map((s) => ({
                        id: s.id,
                        title: s.title,
                        createdAt: s.createdAt,
                        lastActivity: s.lastActivity,
                        messageCount: s.messages.length,
                    })),
                    currentSessionId: this._currentSessionId,
                })
                break
            }
            case 'load-chat-session': {
                const sessionId = message.sessionId as string
                if (sessionId) {
                    await this.loadChatSession(sessionId)
                    // Send updated chat history to webview
                    const messages = this._extendedChatHistory.map((msg) => ({
                        text: msg.text,
                        sender: msg.sender,
                        timestamp: new Date(msg.timestamp),
                        messageType: msg.messageType,
                        imageData: msg.imageData,
                    }))
                    this._view.webview.postMessage({
                        type: 'chat-history',
                        messages: messages,
                    })
                }
                break
            }
            case 'get-settings': {
                const config = vscode.workspace.getConfiguration('crater-ext')
                const aiProvider = config.get<string>('aiProvider', 'gemini')
                const aiModel = config.get<string>(
                    'aiModel',
                    aiProvider === 'gemini'
                        ? 'gemini-2.5-flash-image-preview'
                        : 'gpt-image-1'
                )
                const geminiApiKey = config.get<string>('geminiApiKey', '')
                const openaiApiKey = config.get<string>('openaiApiKey', '')
                const imageSaveDirectory = config.get<string>(
                    'imageSaveDirectory',
                    '${workspaceFolder}/images'
                )
                const autoSaveImages = config.get<boolean>(
                    'autoSaveImages',
                    true
                )
                const imageSize = config.get<string>('imageSize', 'auto')
                const imageQuality = config.get<string>('imageQuality', 'auto')
                this._view.webview.postMessage({
                    type: 'settings',
                    aiProvider,
                    aiModel,
                    geminiApiKey,
                    openaiApiKey,
                    imageSaveDirectory,
                    autoSaveImages,
                    imageSize,
                    imageQuality,
                })
                break
            }
            case 'save-settings': {
                const config = vscode.workspace.getConfiguration('crater-ext')
                const target = vscode.ConfigurationTarget.Global

                const aiProvider = String(message['aiProvider'] || 'gemini')
                const aiModel = String(
                    message['aiModel'] ||
                        (aiProvider === 'gemini'
                            ? 'gemini-2.5-flash-image-preview'
                            : 'gpt-image-1')
                )
                const apiKey = String(message['apiKey'] || '')
                const imageSaveDirectory = String(
                    message['imageSaveDirectory'] || '${workspaceFolder}/images'
                )
                const autoSaveImages = Boolean(
                    message['autoSaveImages'] ?? true
                )
                const imageSize = String(message['imageSize'] || 'auto')
                const imageQuality = String(message['imageQuality'] || 'auto')

                await config.update('aiProvider', aiProvider, target)
                await config.update('aiModel', aiModel, target)
                await config.update(
                    'imageSaveDirectory',
                    imageSaveDirectory,
                    target
                )
                await config.update('autoSaveImages', autoSaveImages, target)
                await config.update('imageSize', imageSize, target)
                await config.update('imageQuality', imageQuality, target)

                if (aiProvider === 'gemini') {
                    await config.update('geminiApiKey', apiKey, target)
                } else if (aiProvider === 'openai') {
                    await config.update('openaiApiKey', apiKey, target)
                }

                // Prompt ChatbotProvider to refresh its provider
                await vscode.commands.executeCommand(
                    'crater-ext.updateAIProvider'
                )

                this._view.webview.postMessage({ type: 'settings-saved' })
                vscode.window.showInformationMessage('[Crater] Settings saved')
                break
            }
            default:
                console.warn(
                    '[Crater ChatbotProvider] Unknown message type:',
                    message.type
                )
        }
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
            display: flex;
            justify-content: space-between;
            align-items: center;
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

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .back-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 11px;
        }

        .back-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .settings-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 11px;
        }

        .settings-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .provider-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .page-content {
            display: none;
        }

        .page-content.active {
            display: block;
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

        .new-chat-btn, .chat-history-btn {
            padding: 6px 8px;
            border: none;
            border-radius: 4px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-family: inherit;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .new-chat-btn:hover, .chat-history-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .new-chat-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .new-chat-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
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


        .section { margin-bottom: 16px; }
        label { display: block; margin-bottom: 6px; }
        select, input[type="text"], input[type="password"] {
            width: 100%; box-sizing: border-box; padding: 6px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        .row { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer;
        }
        .btn:hover { background: var(--vscode-button-hoverBackground); }
        .btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .note { color: var(--vscode-descriptionForeground); font-size: 12px; }
        .validation-message {
            font-size: 12px; margin-top: 4px; min-height: 16px;
        }
        .validation-message.error { color: var(--vscode-errorForeground); }
        .validation-message.success { color: var(--vscode-charts-green); }

        /* Chat History Modal */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 1000;
        }

        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 70vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 8px;
        }

        .modal-title {
            font-size: 16px;
            font-weight: bold;
            color: var(--vscode-foreground);
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--vscode-foreground);
            padding: 0;
        }

        .chat-session-item {
            padding: 12px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .chat-session-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .chat-session-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-color: var(--vscode-focusBorder);
        }

        .session-title {
            font-weight: bold;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
        }

        .session-info {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .no-sessions {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="header" id="header">
        <div class="header-left">
            <button class="back-btn" id="backBtn" style="display: none;">← Back</button>
            <div>
                <h2 id="pageTitle">🎮 Game Asset Assistant</h2>
                <div class="provider-info" id="provider-info" style="display: block;">AI Provider: Loading...</div>
            </div>
        </div>
        <button class="settings-btn" id="settingsBtn">⚙️ Settings</button>
    </div>

    <!-- Chat Page -->
    <div class="page-content active" id="chatPage">
        <div class="chat-container">
            <div class="messages" id="messages">
                <div class="welcome-message">
                    👋 Hi! I'm your game asset assistant. Ask me about characters, backgrounds, textures, UI elements, sounds, animations, and more!
                </div>
            </div>

            <div class="controls">
                <button class="new-chat-btn" id="new-chat-btn">
                    ✨ New Chat
                </button>
                <button class="chat-history-btn" id="chat-history-btn">
                    📂 History
                </button>
            </div>

            <div class="input-container">
                <input type="text" class="message-input" id="message-input" placeholder="Ask about game assets..." />
                <button class="send-button" id="send-button">Send</button>
            </div>
        </div>
    </div>

    <!-- Configuration Required Page -->
    <div class="page-content" id="configPage">
        <div class="welcome-message">
            ⚙️ Configuration Required
        </div>
        <div style="text-align: center; padding: 20px;">
            <p style="margin-bottom: 20px; color: var(--vscode-descriptionForeground);">
                To use the Game Asset Assistant, you need to configure an AI provider with a valid API key.
            </p>
            <button class="btn" id="goToSettingsBtn" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground);">
                Go to Settings
            </button>
        </div>
    </div>

    <!-- Chat History Modal -->
    <div class="modal" id="chatHistoryModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Chat History</h3>
                <button class="modal-close" id="modalClose">&times;</button>
            </div>
            <div id="chatSessionsList">
                <div class="no-sessions">No previous chats found</div>
            </div>
        </div>
    </div>

    <!-- Settings Page -->
    <div class="page-content" id="settingsPage">
        <div class="welcome-message">
            Configure your AI provider and API keys below.
        </div>

        <div class="section">
            <label for="provider">Model Provider</label>
            <select id="provider">
                <option value="gemini">Google Gemini - Requires API key</option>
                <option value="openai">OpenAI GPT - Requires API key</option>
            </select>
            <div class="note">Choose your preferred AI provider for generating game assets</div>
        </div>

        <div class="section" id="modelSection">
            <label for="model">Model</label>
            <select id="model">
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.0-pro-vision">Gemini 1.0 Pro Vision</option>
            </select>
            <div class="note">Select the specific model to use for AI generation</div>
        </div>

        <div class="section" id="apiKeySection">
            <label id="apiKeyLabel" for="apiKey">API Key</label>
            <input id="apiKey" type="password" placeholder="Enter API key" />
            <div class="note">Stored securely in your VS Code settings (User scope).</div>
            <div class="validation-message" id="validationMessage"></div>
        </div>

        <div class="section" id="imageSizeSection" style="display: none;">
            <label for="imageSize">Image Size (OpenAI gpt-image-1 only)</label>
            <select id="imageSize">
                <option value="auto">Auto - AI selects optimal size based on prompt</option>
                <option value="1024x1024">1024x1024 - Standard square format</option>
                <option value="1024x1536">1024x1536 - Portrait format (tall)</option>
                <option value="1536x1024">1536x1024 - Landscape format (wide)</option>
            </select>
            <div class="note">Size of generated images. Auto selection optimizes based on your prompt content.</div>
        </div>

        <div class="section" id="imageQualitySection" style="display: none;">
            <label for="imageQuality">Image Quality (OpenAI gpt-image-1 only)</label>
            <select id="imageQuality">
                <option value="auto">Auto - AI selects optimal quality for the prompt</option>
                <option value="low">Low - Fast generation, lower cost, basic quality</option>
                <option value="medium">Medium - Balanced quality and speed</option>
                <option value="high">High - Best quality, slower generation, higher cost</option>
            </select>
            <div class="note">Quality setting affects generation time and cost. Auto adjusts based on your prompt.</div>
        </div>

        <div class="row">
            <button class="btn" id="saveBtn">Save Settings</button>
        </div>
    </div>

    <script>
        console.log('[Crater WebView] Script started loading');
        const vscode = acquireVsCodeApi();
        console.log('[Crater WebView] VS Code API acquired');
        
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const newChatBtn = document.getElementById('new-chat-btn');
        const chatHistoryBtn = document.getElementById('chat-history-btn');
        const providerInfo = document.getElementById('provider-info');

        // Navigation elements
        const backBtn = document.getElementById('backBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const pageTitle = document.getElementById('pageTitle');
        const navProviderInfo = document.getElementById('provider-info');

        // Modal elements
        const chatHistoryModal = document.getElementById('chatHistoryModal');
        const modalClose = document.getElementById('modalClose');
        const chatSessionsList = document.getElementById('chatSessionsList');

        // Page containers
        const configPage = document.getElementById('configPage');
        const chatPage = document.getElementById('chatPage');
        const settingsPage = document.getElementById('settingsPage');

        // Settings form elements
        const providerEl = document.getElementById('provider');
        const modelEl = document.getElementById('model');
        const apiKeyEl = document.getElementById('apiKey');
        const apiKeyLabelEl = document.getElementById('apiKeyLabel');
        const imageSizeEl = document.getElementById('imageSize');
        const imageQualityEl = document.getElementById('imageQuality');
        const imageSizeSection = document.getElementById('imageSizeSection');
        const imageQualitySection = document.getElementById('imageQualitySection');
        const saveBtn = document.getElementById('saveBtn');
        const validationMessageEl = document.getElementById('validationMessage');

        // Navigation state
        let currentPage = 'chat';
        let isConfigured = false;
        let isLoadingSettings = false;
        
        // Store API keys temporarily while user is switching providers
        let tempApiKeys = {
            gemini: '',
            openai: ''
        };
        let currentProvider = 'gemini';
        
        // Store image settings
        let lastImageSize = 'auto';
        let lastImageQuality = 'auto';
        
        console.log('[Crater WebView] DOM elements found:', {
            messagesContainer: !!messagesContainer,
            messageInput: !!messageInput,
            sendButton: !!sendButton,
            newChatBtn: !!newChatBtn,
            chatHistoryBtn: !!chatHistoryBtn,
            providerInfo: !!providerInfo,
            navProviderInfo: !!navProviderInfo
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

        function addImageMessage(imageUrls, prompt, timestamp) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant';
            
            // Add prompt text
            const promptText = document.createElement('div');
            promptText.textContent = \`Generated image for: "\${prompt}"\`;
            promptText.style.marginBottom = '8px';
            promptText.style.fontStyle = 'italic';
            messageDiv.appendChild(promptText);
            
            // Add images
            imageUrls.forEach(imageUrl => {
                const imageEl = document.createElement('img');
                imageEl.src = imageUrl;
                imageEl.style.maxWidth = '100%';
                imageEl.style.height = 'auto';
                imageEl.style.borderRadius = '4px';
                imageEl.style.marginBottom = '4px';
                imageEl.alt = \`Generated game asset: \${prompt}\`;
                
                // Add loading and error handling
                imageEl.onload = () => {
                    console.log('[Crater WebView] Image loaded successfully');
                };
                imageEl.onerror = () => {
                    console.error('[Crater WebView] Failed to load image:', imageUrl);
                    imageEl.style.display = 'none';
                    const errorText = document.createElement('div');
                    errorText.textContent = '❌ Failed to load image';
                    errorText.style.color = 'var(--vscode-errorForeground)';
                    messageDiv.appendChild(errorText);
                };
                
                messageDiv.appendChild(imageEl);
            });
            
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
                loadingDiv.textContent = '🎨 Generating your game asset...';
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

        function newChat() {
            console.log('[Crater WebView] newChat called');
            vscode.postMessage({ type: 'new-chat' });
        }

        function showChatHistory() {
            console.log('[Crater WebView] showChatHistory called');
            chatHistoryModal.classList.add('show');
            vscode.postMessage({ type: 'get-chat-sessions' });
        }

        function hideModal() {
            chatHistoryModal.classList.remove('show');
        }

        function loadChatSession(sessionId) {
            console.log('[Crater WebView] Loading chat session:', sessionId);
            vscode.postMessage({ type: 'load-chat-session', sessionId });
            hideModal();
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            
            if (isToday) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                return date.toLocaleDateString();
            }
        }

        function renderChatSessions(sessions, currentSessionId) {
            if (!sessions || sessions.length === 0) {
                chatSessionsList.innerHTML = '<div class="no-sessions">No previous chats found</div>';
                return;
            }

            const sessionsHtml = sessions.map(session => {
                const isActive = session.id === currentSessionId;
                return \`
                    <div class="chat-session-item \${isActive ? 'active' : ''}" data-session-id="\${session.id}">
                        <div class="session-title">\${session.title}</div>
                        <div class="session-info">
                            \${session.messageCount} messages • Last active: \${formatDate(session.lastActivity)}
                        </div>
                    </div>
                \`;
            }).join('');

            chatSessionsList.innerHTML = sessionsHtml;

            // Add click listeners to session items
            chatSessionsList.querySelectorAll('.chat-session-item').forEach(item => {
                item.addEventListener('click', () => {
                    const sessionId = item.dataset.sessionId;
                    if (sessionId && sessionId !== currentSessionId) {
                        loadChatSession(sessionId);
                    }
                });
            });
        }

        function updateProviderInfo(provider) {
            if (!provider) {
                providerInfo.textContent = 'AI Provider: Not configured';
                isConfigured = false;
                // Show config page if not configured
                if (currentPage === 'chat') {
                    navigateToPage('config');
                }
            } else {
                const providerNames = {
                    'gemini': 'Google Gemini',
                    'openai': 'OpenAI GPT'
                };
                providerInfo.textContent = \`AI Provider: \${providerNames[provider] || provider}\`;
                isConfigured = true;
                // Show chat page if configured and currently on config page
                if (currentPage === 'config') {
                    navigateToPage('chat');
                }
            }
        }

        // Navigation functions
        function navigateToPage(page) {
            currentPage = page;

            // Update page visibility
            configPage.classList.toggle('active', page === 'config');
            chatPage.classList.toggle('active', page === 'chat');
            settingsPage.classList.toggle('active', page === 'settings');

            // Update header
            if (page === 'config') {
                pageTitle.textContent = '🎮 Game Asset Assistant';
                backBtn.style.display = 'none';
                settingsBtn.style.display = 'block';
                navProviderInfo.style.display = 'none';
            } else if (page === 'chat') {
                pageTitle.textContent = '🎮 Game Asset Assistant';
                backBtn.style.display = 'none';
                settingsBtn.style.display = 'block';
                navProviderInfo.style.display = 'block';
            } else if (page === 'settings') {
                pageTitle.textContent = '⚙️ Settings';
                backBtn.style.display = 'block';
                settingsBtn.style.display = 'none';
                navProviderInfo.style.display = 'none';
                // Request current settings when navigating to settings
                vscode.postMessage({ type: 'get-settings' });
                // Update model options after settings are loaded
                setTimeout(() => updateModelOptions(), 100);
            }
        }

        function validateApiKey(apiKey, provider) {
            if (!apiKey || apiKey.trim().length === 0) {
                return { valid: false, message: 'API key is required' };
            }

            // Basic validation for common API key formats
            if (provider === 'gemini' && !apiKey.startsWith('AIza')) {
                return { valid: false, message: 'Gemini API keys typically start with "AIza"' };
            }

            if (provider === 'openai' && !apiKey.startsWith('sk-')) {
                return { valid: false, message: 'OpenAI API keys typically start with "sk-"' };
            }

            if (apiKey.length < 20) {
                return { valid: false, message: 'API key seems too short' };
            }

            return { valid: true, message: 'API key format looks valid' };
        }

        function updateValidation() {
            const provider = providerEl.value;
            const apiKey = apiKeyEl.value;

            const validation = validateApiKey(apiKey, provider);
            validationMessageEl.textContent = validation.message;
            validationMessageEl.className = 'validation-message ' + (validation.valid ? 'success' : 'error');
            
            // If this is OpenAI and we have stored image settings, restore them after validation
            if (provider === 'openai' && (lastImageSize || lastImageQuality)) {
                console.log('[Crater WebView] Validation updated, checking if image settings need restoration');
                setTimeout(() => {
                    // Check if dropdowns have been reset
                    const sizeNeedsRestore = imageSizeEl && imageSizeEl.value !== lastImageSize;
                    const qualityNeedsRestore = imageQualityEl && imageQualityEl.value !== lastImageQuality;
                    
                    if (sizeNeedsRestore || qualityNeedsRestore) {
                        console.log('[Crater WebView] Restoring image settings after validation:', { 
                            sizeNeedsRestore, 
                            qualityNeedsRestore,
                            currentSize: imageSizeEl?.value,
                            currentQuality: imageQualityEl?.value,
                            expectedSize: lastImageSize,
                            expectedQuality: lastImageQuality
                        });
                        setImageSettings(lastImageSize, lastImageQuality);
                    }
                }, 10);
            }
        }

        function updateApiKeyLabel() {
            const map = { gemini: 'Gemini API Key', openai: 'OpenAI API Key' };
            apiKeyLabelEl.textContent = map[providerEl.value] || 'API Key';
            const section = document.getElementById('apiKeySection');
            section.style.display = 'block';
            updateValidation();
        }

        function updateModelOptions() {
            const provider = providerEl.value;
            const modelSection = document.getElementById('modelSection');

            // Clear existing options
            modelEl.innerHTML = '';

            const models = {
                gemini: [
                    { value: 'gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image Preview' }
                ],
                openai: [
                    { value: 'gpt-image-1', label: 'GPT-Image-1 (Latest)' }
                ]
            };

            const providerModels = models[provider] || [];
            providerModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                modelEl.appendChild(option);
            });

            // Show model section
            modelSection.style.display = 'block';
            
            // Show/hide image settings based on provider
            if (provider === 'openai') {
                imageSizeSection.style.display = 'block';
                imageQualitySection.style.display = 'block';
                console.log('[Crater WebView] Image sections made visible for OpenAI provider');
            } else {
                imageSizeSection.style.display = 'none';
                imageQualitySection.style.display = 'none';
                console.log('[Crater WebView] Image sections hidden for non-OpenAI provider');
            }
        }
        
        function setImageSettings(imageSize, imageQuality) {
            console.log('[Crater WebView] setImageSettings called with:', { imageSize, imageQuality });
            console.log('[Crater WebView] isLoadingSettings:', isLoadingSettings);
            console.log('[Crater WebView] Current provider:', currentProvider);
            console.log('[Crater WebView] Provider dropdown value:', providerEl.value);
            
            // Store the values globally
            if (imageSize) lastImageSize = imageSize;
            if (imageQuality) lastImageQuality = imageQuality;
            
            if (imageSizeEl && imageSize) {
                console.log('[Crater WebView] Setting imageSize to:', imageSize);
                console.log('[Crater WebView] ImageSize section visible:', imageSizeSection.style.display !== 'none');
                console.log('[Crater WebView] Available size options:', Array.from(imageSizeEl.options).map(opt => opt.value));
                imageSizeEl.value = imageSize;
                console.log('[Crater WebView] ImageSize dropdown value after setting:', imageSizeEl.value);
                if (imageSizeEl.value !== imageSize) {
                    console.warn('[Crater WebView] Failed to set imageSize - trying selectedIndex method');
                    // Try to find a matching option
                    for (let i = 0; i < imageSizeEl.options.length; i++) {
                        if (imageSizeEl.options[i].value === imageSize) {
                            imageSizeEl.selectedIndex = i;
                            console.log('[Crater WebView] Set imageSize using selectedIndex:', i);
                            break;
                        }
                    }
                }
            }
            
            if (imageQualityEl && imageQuality) {
                console.log('[Crater WebView] Setting imageQuality to:', imageQuality);
                console.log('[Crater WebView] ImageQuality section visible:', imageQualitySection.style.display !== 'none');
                console.log('[Crater WebView] Available quality options:', Array.from(imageQualityEl.options).map(opt => opt.value));
                imageQualityEl.value = imageQuality;
                console.log('[Crater WebView] ImageQuality dropdown value after setting:', imageQualityEl.value);
                if (imageQualityEl.value !== imageQuality) {
                    console.warn('[Crater WebView] Failed to set imageQuality - trying selectedIndex method');
                    // Try to find a matching option
                    for (let i = 0; i < imageQualityEl.options.length; i++) {
                        if (imageQualityEl.options[i].value === imageQuality) {
                            imageQualityEl.selectedIndex = i;
                            console.log('[Crater WebView] Set imageQuality using selectedIndex:', i);
                            break;
                        }
                    }
                }
            }
        }


        sendButton.addEventListener('click', sendMessage);
        newChatBtn.addEventListener('click', newChat);
        chatHistoryBtn.addEventListener('click', showChatHistory);

        // Modal event listeners
        modalClose.addEventListener('click', hideModal);
        chatHistoryModal.addEventListener('click', (e) => {
            if (e.target === chatHistoryModal) {
                hideModal();
            }
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Navigation event listeners
        settingsBtn.addEventListener('click', () => navigateToPage('settings'));
        backBtn.addEventListener('click', () => navigateToPage('chat'));

        // Config page event listener
        const goToSettingsBtn = document.getElementById('goToSettingsBtn');
        if (goToSettingsBtn) {
            goToSettingsBtn.addEventListener('click', () => navigateToPage('settings'));
        }

        // Form event listeners
        providerEl.addEventListener('change', () => {
            // Ignore changes during settings loading to prevent overriding user selections
            if (isLoadingSettings) return;
            
            // Save current API key before switching
            if (currentProvider === 'gemini') {
                tempApiKeys.gemini = apiKeyEl.value;
            } else if (currentProvider === 'openai') {
                tempApiKeys.openai = apiKeyEl.value;
            }
            
            // Update current provider tracking
            currentProvider = providerEl.value;
            
            // Update UI elements for new provider
            updateApiKeyLabel();
            updateModelOptions();
            
            // Restore API key for the selected provider
            if (currentProvider === 'gemini') {
                apiKeyEl.value = tempApiKeys.gemini;
            } else if (currentProvider === 'openai') {
                apiKeyEl.value = tempApiKeys.openai;
                
                // Restore image settings for OpenAI provider after UI update
                setTimeout(() => {
                    setImageSettings(lastImageSize, lastImageQuality);
                }, 100);
            } else {
                apiKeyEl.value = '';
            }
            
            updateValidation();
        });
        apiKeyEl.addEventListener('input', () => {
            // Update temporary storage when user types
            if (currentProvider === 'gemini') {
                tempApiKeys.gemini = apiKeyEl.value;
            } else if (currentProvider === 'openai') {
                tempApiKeys.openai = apiKeyEl.value;
            }
            updateValidation();
            
            // If this is OpenAI and we have stored image settings, restore them
            if (currentProvider === 'openai' && (lastImageSize || lastImageQuality)) {
                console.log('[Crater WebView] API key changed, restoring image settings:', { lastImageSize, lastImageQuality });
                setTimeout(() => {
                    setImageSettings(lastImageSize, lastImageQuality);
                }, 50);
            }
        });
        
        // Watch for programmatic changes to API key field (not just user input)
        const apiKeyObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    console.log('[Crater WebView] API key field value changed programmatically');
                    if (currentProvider === 'openai' && (lastImageSize || lastImageQuality)) {
                        console.log('[Crater WebView] Restoring image settings after programmatic API key change');
                        setTimeout(() => {
                            setImageSettings(lastImageSize, lastImageQuality);
                        }, 50);
                    }
                }
            });
        });
        
        // Observe changes to the API key input field
        apiKeyObserver.observe(apiKeyEl, { 
            attributes: true, 
            attributeFilter: ['value'],
            childList: false,
            subtree: false 
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
                case 'image-response':
                    console.log('[Crater WebView] Processing image response');
                    // Remove loading message
                    const imageLoadingMessage = document.getElementById('loading-message');
                    if (imageLoadingMessage) {
                        imageLoadingMessage.remove();
                    }
                    addImageMessage(message.images, message.prompt, new Date());
                    break;
                case 'chat-history':
                    // Clear existing messages except welcome
                    const existingMessages = messagesContainer.querySelectorAll('.message:not(.welcome-message)');
                    existingMessages.forEach(msg => msg.remove());
                    
                    // Add historical messages
                    message.messages.forEach(msg => {
                        if (msg.messageType === 'image' && msg.imageData) {
                            // Restore image message
                            addImageMessage(msg.imageData.images, msg.imageData.prompt, msg.timestamp);
                        } else {
                            // Regular text message
                            addMessage(msg.text, msg.sender, msg.timestamp);
                        }
                    });
                    break;
                case 'chat-cleared':
                    // Clear all messages except welcome
                    const allMessages = messagesContainer.querySelectorAll('.message:not(.welcome-message)');
                    allMessages.forEach(msg => msg.remove());
                    break;
                case 'chat-sessions':
                    console.log('[Crater WebView] Received chat sessions:', message.sessions);
                    renderChatSessions(message.sessions, message.currentSessionId);
                    break;
                case 'provider-info':
                case 'provider-updated':
                    updateProviderInfo(message.provider);
                    isConfigured = message.configured || false;
                    break;
                case 'settings':
                    console.log('[Crater WebView] Received settings message:', message);
                    isLoadingSettings = true;
                    
                    // Store API keys in temporary storage
                    tempApiKeys.gemini = message.geminiApiKey || '';
                    tempApiKeys.openai = message.openaiApiKey || '';
                    
                    // Update provider dropdown and track current provider
                    providerEl.value = message.aiProvider || 'gemini';
                    currentProvider = message.aiProvider || 'gemini';
                    
                    // Update API key based on the provider from settings
                    if (message.aiProvider === 'gemini') {
                        apiKeyEl.value = tempApiKeys.gemini;
                    } else if (message.aiProvider === 'openai') {
                        apiKeyEl.value = tempApiKeys.openai;
                    } else {
                        apiKeyEl.value = '';
                    }
                    updateApiKeyLabel();
                    updateModelOptions();
                    
                    // Set model value
                    if (message.aiModel && modelEl) {
                        modelEl.value = message.aiModel;
                    }
                    
                    // Set image settings values with multiple attempts to ensure they stick
                    const sizeValue = message.imageSize || 'auto';
                    const qualityValue = message.imageQuality || 'auto';
                    
                    // Multiple attempts with different delays to ensure values are set
                    const attemptImageSettings = (attempt = 1) => {
                        console.log('[Crater WebView] Image settings attempt', attempt, 'with values:', { sizeValue, qualityValue });
                        setImageSettings(sizeValue, qualityValue);
                        
                        // Check if values were actually set after a short delay
                        setTimeout(() => {
                            const sizeSet = !imageSizeEl || imageSizeEl.value === sizeValue;
                            const qualitySet = !imageQualityEl || imageQualityEl.value === qualityValue;
                            
                            console.log('[Crater WebView] Attempt', attempt, 'results:', { 
                                sizeSet, 
                                qualitySet,
                                actualSizeValue: imageSizeEl?.value,
                                actualQualityValue: imageQualityEl?.value
                            });
                            
                            // If not set correctly and we haven't tried too many times, try again
                            if ((!sizeSet || !qualitySet) && attempt < 5) {
                                setTimeout(() => attemptImageSettings(attempt + 1), 200);
                            }
                        }, 100);
                    };
                    
                    // Start attempts after initial UI setup
                    setTimeout(() => attemptImageSettings(1), 200);
                    setTimeout(() => attemptImageSettings(2), 600);
                    
                    // Set up periodic monitoring for the first 5 seconds to catch any resets
                    const monitoringInterval = setInterval(() => {
                        if (currentProvider === 'openai' && (lastImageSize || lastImageQuality)) {
                            const sizeOk = !imageSizeEl || imageSizeEl.value === lastImageSize;
                            const qualityOk = !imageQualityEl || imageQualityEl.value === lastImageQuality;
                            
                            if (!sizeOk || !qualityOk) {
                                console.log('[Crater WebView] Periodic check found reset dropdowns, restoring:', {
                                    currentSize: imageSizeEl?.value,
                                    expectedSize: lastImageSize,
                                    currentQuality: imageQualityEl?.value,
                                    expectedQuality: lastImageQuality
                                });
                                setImageSettings(lastImageSize, lastImageQuality);
                            }
                        }
                    }, 500);
                    
                    // Stop monitoring after 5 seconds
                    setTimeout(() => {
                        clearInterval(monitoringInterval);
                        console.log('[Crater WebView] Stopped periodic monitoring of image settings');
                    }, 5000);
                    
                    // Set loading to false after starting the process
                    isLoadingSettings = false;
                    break;
                case 'settings-saved':
                    navigateToPage('chat');
                    break;
                case 'settings-error':
                    console.error('[Crater Settings] Error:', message.message);
                    break;
            }
        });

        // Settings save button
        saveBtn.addEventListener('click', () => {
            vscode.postMessage({
                type: 'save-settings',
                aiProvider: providerEl.value,
                aiModel: modelEl.value,
                apiKey: apiKeyEl.value,
                imageSize: imageSizeEl.value,
                imageQuality: imageQualityEl.value
            });
        });

        // Request chat history on load with a small delay to ensure everything is ready
        setTimeout(() => {
            vscode.postMessage({ type: 'get-chat-history' });
            vscode.postMessage({ type: 'get-provider-info' });
        }, 100);
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
