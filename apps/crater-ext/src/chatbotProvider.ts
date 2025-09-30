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
    messageIndex?: number
    imageStates?: {
        deleted: boolean[]
        hidden: boolean[]
    }
    messages?: Array<{
        text: string
        sender: string
        timestamp: Date
        messageType?: 'text' | 'image'
        imageData?: {
            images: string[]
            prompt: string
            savedPaths?: string[]
            imageStates?: {
                deleted: boolean[]
                hidden: boolean[]
            }
            usage?: {
                inputTextTokens: number
                inputImageTokens: number
                outputImageTokens: number
                totalTokens: number
            }
            cost?: {
                inputTextCost: number
                inputImageCost: number
                outputImageCost: number
                perImageCost: number
                totalImageCost: number
                totalCost: number
                currency: string
                breakdown: {
                    tokenBasedCost: number
                    qualityBasedCost: number
                }
            }
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
        imageStates?: {
            deleted: boolean[]
            hidden: boolean[]
        }
        usage?: {
            inputTextTokens: number
            inputImageTokens: number
            outputImageTokens: number
            totalTokens: number
        }
        cost?: {
            inputTextCost: number
            inputImageCost: number
            outputImageCost: number
            perImageCost: number
            totalImageCost: number
            totalCost: number
            currency: string
            breakdown: {
                tokenBasedCost: number
                qualityBasedCost: number
            }
        }
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
    private _fileWatcher?: vscode.FileSystemWatcher
    private _saveTimeout?: NodeJS.Timeout
    private _pendingFileDeletions: string[] = []
    private _lastUpdateStates = new Map<number, string>()
    private _savingDisabled = false // Set to true to test without saving

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

        // Setup file watcher for development hot reload
        this.setupDevelopmentWatcher()
    }

    private setupDevelopmentWatcher(): void {
        const isHMREnabled =
            process.env.NODE_ENV === 'development' ||
            process.env.CRATER_HMR_ENABLED === 'true'

        if (!isHMREnabled) {
            console.log(
                '[Crater] HMR not enabled, skipping development watcher'
            )
            return
        }

        try {
            console.log('[Crater] Setting up development file watchers...')

            const handleFileChange = async (uri?: vscode.Uri) => {
                const fileName = uri ? path.basename(uri.fsPath) : 'unknown'
                console.log(
                    `[Crater] 🔥 Dev: ${fileName} changed, triggering refresh...`
                )

                // Option 1: Use VS Code's built-in webview reload command
                try {
                    await vscode.commands.executeCommand(
                        'workbench.action.webview.reloadWebviewAction'
                    )
                    console.log(
                        '[Crater] ✅ Webview reloaded via VS Code command'
                    )
                    vscode.window.setStatusBarMessage(
                        `🔥 ${fileName} → webview reloaded`,
                        2000
                    )
                } catch {
                    // Fallback: Manual HTML refresh
                    console.log('[Crater] 🔄 Fallback: Manual webview refresh')
                    if (this._view) {
                        this._view.webview.html = this._getHtmlForWebview(
                            this._view.webview
                        )
                    }
                    vscode.window.setStatusBarMessage(
                        `🔄 ${fileName} → manual refresh`,
                        2000
                    )
                }
            }

            // Watch dist files for immediate refresh
            const distJsPattern = path.join(
                this._extensionUri.fsPath,
                'dist',
                'webview.js'
            )
            const distCssPattern = path.join(
                this._extensionUri.fsPath,
                'dist',
                'webview.css'
            )

            console.log('[Crater] Watching for webview changes:')
            console.log(`  📦 ${distJsPattern}`)
            console.log(`  🎨 ${distCssPattern}`)

            const distJsWatcher =
                vscode.workspace.createFileSystemWatcher(distJsPattern)
            const distCssWatcher =
                vscode.workspace.createFileSystemWatcher(distCssPattern)

            // Immediate refresh for dist files
            distJsWatcher.onDidChange((uri) => {
                setTimeout(() => handleFileChange(uri), 300) // Wait for file write completion
            })
            distCssWatcher.onDidChange((uri) => {
                setTimeout(() => handleFileChange(uri), 300)
            })

            // Store watcher for cleanup
            this._fileWatcher = distJsWatcher

            console.log('[Crater] ✅ Development watchers active!')
            vscode.window.showInformationMessage(
                '🔥 Crater Dev Mode: Auto-reload on webview changes'
            )
        } catch (error) {
            console.log('[Crater] Could not setup development watcher:', error)
        }
    }

    dispose(): void {
        this._fileWatcher?.dispose()

        // Ensure any pending saves are completed before disposal
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout)
            // Force immediate save on disposal to prevent data loss
            this.saveChatHistory().catch((error) => {
                console.error(
                    '[Crater] Error in final save during disposal:',
                    error
                )
            })
        }
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
                let currentSession: ChatSession | undefined

                // Try to load from fast file-based storage first
                try {
                    const sessionFilePath = path.join(
                        this._extensionContext.globalStorageUri.fsPath,
                        `session_${this._currentSessionId}.json`
                    )
                    const fileContent = await vscode.workspace.fs.readFile(
                        vscode.Uri.file(sessionFilePath)
                    )
                    const sessionJson =
                        Buffer.from(fileContent).toString('utf8')
                    currentSession = JSON.parse(sessionJson) as ChatSession
                } catch {
                    // Fallback to VS Code globalState storage
                    currentSession = this._extensionContext.globalState.get<
                        ChatSession | undefined
                    >(`crater.session.${this._currentSessionId}`, undefined)
                }

                // Final fallback to session list if individual session not found
                if (!currentSession) {
                    currentSession = this._chatSessions.find(
                        (s) => s.id === this._currentSessionId
                    )
                }

                if (currentSession) {
                    // Restore image URLs from file paths since we don't store base64 data
                    this._extendedChatHistory = currentSession.messages.map(
                        (msg) => {
                            if (
                                msg.messageType === 'image' &&
                                msg.imageData &&
                                msg.imageData.savedPaths
                            ) {
                                return {
                                    ...msg,
                                    imageData: {
                                        ...msg.imageData,
                                        // Recreate image URLs from saved file paths
                                        images: msg.imageData.savedPaths.map(
                                            (path) => `file://${path}`
                                        ),
                                    },
                                }
                            }
                            return msg
                        }
                    )
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
                    // Avoid deep copy - directly assign reference for performance
                    this._chatSessions[sessionIndex].messages =
                        this._extendedChatHistory
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

                    // Save only the current session for performance
                    this.saveCurrentSessionInBackground()
                }
            }
        } catch (error) {
            console.error('[Crater] Error saving chat history:', error)
        }
    }

    private debouncedSaveChatHistory(): void {
        if (this._savingDisabled) {
            return
        }

        // Clear existing timeout
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout)
        }

        // Set new timeout for 2 seconds to reduce save frequency and prevent lag
        this._saveTimeout = setTimeout(() => {
            this.saveChatHistory().catch((error) => {
                console.error('[Crater] Error in debounced save:', error)
            })
            this._saveTimeout = undefined
        }, 2000)
    }

    private async deleteImageFiles(filePaths: string[]): Promise<void> {
        // Delete files asynchronously to avoid blocking the UI
        const deletionPromises = filePaths.map(async (filePath) => {
            try {
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath)
                    console.log(
                        '[Crater ChatbotProvider] Deleted image file:',
                        filePath
                    )
                    return { success: true, path: filePath }
                }
                return {
                    success: false,
                    path: filePath,
                    reason: 'File not found',
                }
            } catch (error) {
                console.error(
                    '[Crater ChatbotProvider] Error deleting image file:',
                    filePath,
                    error
                )
                return { success: false, path: filePath, error }
            }
        })

        const results = await Promise.allSettled(deletionPromises)
        const deletedCount = results.filter(
            (r) => r.status === 'fulfilled' && r.value.success
        ).length
        const failedCount = results.filter(
            (r) =>
                r.status === 'rejected' ||
                (r.status === 'fulfilled' && !r.value.success)
        ).length

        if (deletedCount > 0) {
            vscode.window.showInformationMessage(
                `Deleted ${deletedCount} image file${deletedCount > 1 ? 's' : ''} from directory.`
            )
        }

        if (failedCount > 0) {
            const failedPaths = results
                .filter(
                    (r) =>
                        r.status === 'rejected' ||
                        (r.status === 'fulfilled' && !r.value.success)
                )
                .map((r) =>
                    r.status === 'fulfilled'
                        ? path.basename(r.value.path)
                        : 'unknown'
                )
                .join(', ')
            vscode.window.showWarningMessage(
                `Failed to delete ${failedCount} image file${failedCount > 1 ? 's' : ''}: ${failedPaths}. Files may have been moved or deleted manually.`
            )
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

    private saveChatSessionsInBackground(): void {
        // Use setImmediate to defer the heavy serialization to the next tick
        // This prevents blocking the current execution context
        setImmediate(async () => {
            try {
                await this.saveChatSessions()
            } catch (error) {
                console.error('[Crater] Error in background save:', error)
            }
        })
    }

    private saveCurrentSessionInBackground(): void {
        // Use setImmediate to save only current session data
        setImmediate(async () => {
            try {
                await this.saveCurrentSession()
            } catch (error) {
                console.error('[Crater] Error in current session save:', error)
            }
        })
    }

    private async saveCurrentSession(): Promise<void> {
        if (!this._extensionContext || !this._currentSessionId) return

        try {
            const currentSession = this._chatSessions.find(
                (s) => s.id === this._currentSessionId
            )
            if (currentSession) {
                // Create a lightweight version without ANY base64 image data
                const lightweightSession = {
                    ...currentSession,
                    messages: currentSession.messages.map((msg) => {
                        if (msg.messageType === 'image' && msg.imageData) {
                            // Strip ALL image data, keep only essential metadata
                            return {
                                ...msg,
                                imageData: {
                                    images: [], // Completely remove base64 data
                                    prompt: msg.imageData.prompt,
                                    savedPaths: msg.imageData.savedPaths || [],
                                    imageStates: msg.imageData.imageStates,
                                    usage: msg.imageData.usage,
                                    cost: msg.imageData.cost,
                                },
                            }
                        }
                        return msg
                    }),
                }

                const sessionJson = JSON.stringify(lightweightSession)

                // Use file-based storage instead of VS Code globalState for speed
                const sessionFilePath = path.join(
                    this._extensionContext.globalStorageUri.fsPath,
                    `session_${this._currentSessionId}.json`
                )

                // Ensure directory exists
                await vscode.workspace.fs.createDirectory(
                    this._extensionContext.globalStorageUri
                )

                // Write directly to file (much faster than globalState)
                await vscode.workspace.fs.writeFile(
                    vscode.Uri.file(sessionFilePath),
                    Buffer.from(sessionJson, 'utf8')
                )
            }
        } catch (error) {
            console.error('[Crater] Error saving current session:', error)
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

    private convertFilePathsToWebviewUris(
        messages: ExtendedChatMessage[]
    ): Array<Omit<ExtendedChatMessage, 'timestamp'> & { timestamp: Date }> {
        return messages.map((msg) => {
            const convertedMsg = {
                id: msg.id,
                text: msg.text,
                sender: msg.sender,
                timestamp: new Date(msg.timestamp),
                messageType: msg.messageType,
                imageData: msg.imageData,
            }

            // Convert file paths to webview URIs for image messages
            if (
                msg.messageType === 'image' &&
                msg.imageData &&
                msg.imageData.savedPaths &&
                this._view
            ) {
                convertedMsg.imageData = {
                    ...msg.imageData,
                    images: msg.imageData.savedPaths
                        .map((path) => {
                            if (path) {
                                const fileUri = vscode.Uri.file(path)
                                return this._view!.webview.asWebviewUri(
                                    fileUri
                                ).toString()
                            }
                            return ''
                        })
                        .filter(Boolean),
                }
            }

            return convertedMsg
        })
    }

    private addMessageToHistory(
        text: string,
        sender: 'user' | 'assistant',
        messageType: 'text' | 'image' = 'text',
        imageData?: {
            images: string[]
            prompt: string
            savedPaths?: string[]
            imageStates?: {
                deleted: boolean[]
                hidden: boolean[]
            }
            usage?: {
                inputTextTokens: number
                inputImageTokens: number
                outputImageTokens: number
                totalTokens: number
            }
            cost?: {
                inputTextCost: number
                inputImageCost: number
                outputImageCost: number
                perImageCost: number
                totalImageCost: number
                totalCost: number
                currency: string
                breakdown: {
                    tokenBasedCost: number
                    qualityBasedCost: number
                }
            }
        }
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

    public refreshWebview(): void {
        console.log('[Crater] Manual webview refresh requested')
        if (this._view) {
            console.log('[Crater] Refreshing webview HTML manually...')
            this._view.webview.html = this._getHtmlForWebview(
                this._view.webview
            )
            vscode.window.showInformationMessage(
                '🔄 Webview refreshed manually'
            )
            console.log('[Crater] Manual webview refresh complete')
        } else {
            console.log('[Crater] No webview available to refresh')
            vscode.window.showWarningMessage('No webview available to refresh')
        }
    }

    public toggleSaving(): void {
        this._savingDisabled = !this._savingDisabled
        const status = this._savingDisabled ? 'DISABLED' : 'ENABLED'
        console.log(`[Crater] Saving ${status}`)
        vscode.window.showInformationMessage(`[Crater] Saving ${status}`)
    }

    public notifySettingsChanged(): void {
        console.log('[Crater] Notifying webview about settings change')
        if (this._view) {
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
            const autoSaveImages = config.get<boolean>('autoSaveImages', true)
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
            console.log('[Crater] Settings notification sent to webview')
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

        // Proactively send all initial data to the webview after a short delay
        // This helps with cases where the webview loads before the initial request is made
        setTimeout(() => {
            this.loadChatHistory()
                .then(() => {
                    if (!this._view) return

                    // Send chat history with proper webview URIs
                    if (this._extendedChatHistory.length > 0) {
                        const messages = this.convertFilePathsToWebviewUris(
                            this._extendedChatHistory
                        )
                        console.log(
                            `[Crater ChatbotProvider] Proactively sending ${messages.length} messages to newly created webview`
                        )
                        this._view.webview.postMessage({
                            type: 'chat-history',
                            messages: messages,
                        })
                    }

                    // Send provider info
                    this._view.webview.postMessage({
                        type: 'provider-info',
                        provider: this.currentProvider?.type || null,
                        configured: !!this.currentProvider,
                    })

                    // Send settings
                    const config =
                        vscode.workspace.getConfiguration('crater-ext')
                    const aiProvider = config.get<string>(
                        'aiProvider',
                        'gemini'
                    )
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
                    const imageQuality = config.get<string>(
                        'imageQuality',
                        'auto'
                    )

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

                    // Send chat sessions
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

                    console.log(
                        '[Crater ChatbotProvider] Proactively sent all initial data to webview'
                    )
                })
                .catch((error) => {
                    console.error(
                        '[Crater] Error proactively loading initial data:',
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

                        // Get the configured model
                        const config =
                            vscode.workspace.getConfiguration('crater-ext')
                        const aiModel = config.get<string>(
                            'aiModel',
                            'gemini-2.5-flash-image-preview'
                        )

                        // Determine which model to use for image generation
                        let imageModel = 'gemini' // default to gemini image generation
                        if (aiModel === 'imagen-4.0-generate-001') {
                            imageModel = 'imagen' // use imagen for high quality
                        }

                        // Generate image directly without fallback
                        const imageResponse =
                            await this.chatBotService.generateImage(
                                messageText,
                                {
                                    model: imageModel,
                                }
                            )
                        console.log(
                            '[Crater ChatbotProvider] Image generated successfully'
                        )
                        console.log(
                            '[Crater ChatbotProvider] Raw image response:',
                            JSON.stringify(imageResponse, null, 2)
                        )

                        // Process images and save them to files immediately
                        const savedPaths: string[] = []

                        for (const img of imageResponse.images) {
                            let base64Data: string | null = null

                            if (img.url) {
                                // Handle URL-based images (Gemini)
                                base64Data = img.url.includes('base64,')
                                    ? img.url.split('base64,')[1]
                                    : null
                            } else if (img.base64) {
                                // Handle base64 images (OpenAI)
                                base64Data = img.base64.includes('base64,')
                                    ? img.base64.split('base64,')[1]
                                    : img.base64
                            }

                            if (base64Data) {
                                const savedPath = await this.saveImageToFile(
                                    base64Data,
                                    messageText
                                )
                                if (savedPath) {
                                    savedPaths.push(savedPath)
                                }
                            }
                        }

                        console.log(
                            '[Crater ChatbotProvider] Saved image paths:',
                            savedPaths
                        )

                        if (savedPaths.length > 0) {
                            // Extract usage and cost data from metadata
                            const usage = imageResponse.metadata?.usage as
                                | {
                                      inputTextTokens: number
                                      inputImageTokens: number
                                      outputImageTokens: number
                                      totalTokens: number
                                  }
                                | undefined
                            const cost = imageResponse.metadata?.cost as
                                | {
                                      inputTextCost: number
                                      inputImageCost: number
                                      outputImageCost: number
                                      perImageCost: number
                                      totalImageCost: number
                                      totalCost: number
                                      currency: string
                                      breakdown: {
                                          tokenBasedCost: number
                                          qualityBasedCost: number
                                      }
                                  }
                                | undefined

                            // Add assistant response to extended chat history with image data
                            const responseText = `Generated ${savedPaths.length} image(s) for: "${messageText}"`
                            this.addMessageToHistory(
                                responseText,
                                'assistant',
                                'image',
                                {
                                    images: [], // Don't store image data in memory to keep it lightweight
                                    prompt: messageText,
                                    savedPaths: savedPaths,
                                    usage: usage,
                                    cost: cost,
                                }
                            )

                            // Save chat history after adding both user and assistant messages
                            await this.saveChatHistory()

                            // Convert file paths to proper webview URIs for immediate display
                            const webviewImageUris = savedPaths.map((path) => {
                                const fileUri = vscode.Uri.file(path)
                                return this._view!.webview.asWebviewUri(
                                    fileUri
                                ).toString()
                            })

                            this._view.webview.postMessage({
                                type: 'image-response',
                                images: webviewImageUris,
                                prompt: messageText,
                                savedPaths: savedPaths,
                                usage: usage,
                                cost: cost,
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

                // Send extended messages with proper webview URIs
                const messages = this.convertFilePathsToWebviewUris(
                    this._extendedChatHistory
                )
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
                    // Send updated chat history to webview with proper URIs
                    const messages = this.convertFilePathsToWebviewUris(
                        this._extendedChatHistory
                    )
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
            case 'switch-provider': {
                const newProvider = message.provider as string
                if (
                    !newProvider ||
                    (newProvider !== 'gemini' && newProvider !== 'openai')
                ) {
                    console.warn('[Crater] Invalid provider:', newProvider)
                    break
                }

                const config = vscode.workspace.getConfiguration('crater-ext')
                const target = vscode.ConfigurationTarget.Global

                await config.update('aiProvider', newProvider, target)

                // Update the AI provider
                await this.updateAIProvider()

                vscode.window.showInformationMessage(
                    `[Crater] Switched to ${newProvider === 'gemini' ? 'Gemini' : 'OpenAI'} provider`
                )
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
            case 'browse-folder': {
                // Trigger the browse folder command
                const selectedPath = await vscode.commands.executeCommand(
                    'crater-ext.browseFolder'
                )
                if (selectedPath) {
                    // Send the selected path back to the webview
                    this._view.webview.postMessage({
                        type: 'folder-selected',
                        path: selectedPath,
                    })
                }
                break
            }
            case 'update-image-states': {
                const messageIndex = message.messageIndex as number
                const imageStates = message.imageStates as {
                    deleted: boolean[]
                    hidden: boolean[]
                }

                if (
                    typeof messageIndex === 'number' &&
                    imageStates &&
                    this._extendedChatHistory.length > messageIndex
                ) {
                    // Check for duplicate updates by comparing state hash
                    const stateHash = JSON.stringify(imageStates)
                    const lastStateHash =
                        this._lastUpdateStates.get(messageIndex)

                    if (lastStateHash === stateHash) {
                        console.log(
                            '[Crater ChatbotProvider] Skipping duplicate update for message',
                            messageIndex
                        )
                        break
                    }

                    // Store current state hash
                    this._lastUpdateStates.set(messageIndex, stateHash)
                    const targetMessage =
                        this._extendedChatHistory[messageIndex]
                    if (
                        targetMessage.messageType === 'image' &&
                        targetMessage.imageData
                    ) {
                        const oldStates = targetMessage.imageData.imageStates

                        // Update the image states in the current chat history immediately for UI responsiveness
                        targetMessage.imageData.imageStates = imageStates

                        // Collect files to delete for batch processing
                        const filesToDelete: string[] = []
                        if (targetMessage.imageData.savedPaths && oldStates) {
                            for (
                                let i = 0;
                                i < imageStates.deleted.length;
                                i++
                            ) {
                                // If image was just marked as deleted (wasn't deleted before)
                                if (
                                    imageStates.deleted[i] &&
                                    !oldStates.deleted[i]
                                ) {
                                    const filePath =
                                        targetMessage.imageData.savedPaths[i]
                                    if (filePath) {
                                        filesToDelete.push(filePath)
                                    }
                                }
                            }
                        } else if (targetMessage.imageData.savedPaths) {
                            // No previous states, check for newly deleted images
                            for (
                                let i = 0;
                                i < imageStates.deleted.length;
                                i++
                            ) {
                                if (imageStates.deleted[i]) {
                                    const filePath =
                                        targetMessage.imageData.savedPaths[i]
                                    if (filePath) {
                                        filesToDelete.push(filePath)
                                    }
                                }
                            }
                        }

                        // Queue file deletions for asynchronous processing
                        if (filesToDelete.length > 0) {
                            this._pendingFileDeletions.push(...filesToDelete)
                            // Process deletions asynchronously without blocking
                            setImmediate(() => {
                                const toDelete = [...this._pendingFileDeletions]
                                this._pendingFileDeletions = []
                                this.deleteImageFiles(toDelete).catch(
                                    (error) => {
                                        console.error(
                                            '[Crater] Error in batch file deletion:',
                                            error
                                        )
                                    }
                                )
                            })
                        }

                        // Use debounced save instead of immediate save
                        this.debouncedSaveChatHistory()
                        console.log(
                            '[Crater ChatbotProvider] Image states updated and queued for save for message',
                            messageIndex
                        )
                    }
                }
                break
            }
            case 'open-image': {
                const imagePath = message.path as string
                if (imagePath) {
                    try {
                        // Open the image file in VS Code editor
                        const imageUri = vscode.Uri.file(imagePath)
                        await vscode.commands.executeCommand(
                            'vscode.open',
                            imageUri
                        )
                        console.log(
                            `[Crater ChatbotProvider] Opened image in editor: ${imagePath}`
                        )
                    } catch (error) {
                        console.error(
                            `[Crater ChatbotProvider] Error opening image: ${error}`
                        )
                        vscode.window.showErrorMessage(
                            `Failed to open image: ${error instanceof Error ? error.message : String(error)}`
                        )
                    }
                }
                break
            }
            case 'open-in-image-editor': {
                const imagePath = message.path as string
                if (imagePath) {
                    try {
                        // Open the image in the Crater Image Editor extension
                        const imageUri = vscode.Uri.file(imagePath)
                        await vscode.commands.executeCommand(
                            'crater-ext.openInImageEditor',
                            imageUri
                        )
                        console.log(
                            `[Crater ChatbotProvider] Opened image in Crater Image Editor: ${imagePath}`
                        )
                    } catch (error) {
                        console.error(
                            `[Crater ChatbotProvider] Error opening image in Crater Image Editor: ${error}`
                        )
                        vscode.window.showErrorMessage(
                            `Failed to open image in Crater Image Editor: ${error instanceof Error ? error.message : String(error)}`
                        )
                    }
                }
                break
            }
            default:
                console.warn(
                    '[Crater ChatbotProvider] Unknown message type:',
                    message.type
                )
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        console.log('[Crater] _getHtmlForWebview called')

        try {
            // Read the HTML template
            const htmlPath = path.join(
                this._extensionUri.fsPath,
                'src',
                'webview.html'
            )
            let html = fs.readFileSync(htmlPath, 'utf8')

            // Always use built files but with aggressive cache-busting for development
            const scriptPathOnDisk = vscode.Uri.joinPath(
                this._extensionUri,
                'dist',
                'webview.js'
            )
            const scriptUriWebview = webview.asWebviewUri(scriptPathOnDisk)

            const cssPathOnDisk = vscode.Uri.joinPath(
                this._extensionUri,
                'dist',
                'webview.css'
            )
            const cssUriWebview = webview.asWebviewUri(cssPathOnDisk)

            // Add aggressive cache-busting parameter for better development experience
            const cacheBuster = Date.now()
            const scriptUri = `${scriptUriWebview.toString()}?v=${cacheBuster}`
            const cssUri = `${cssUriWebview.toString()}?v=${cacheBuster}`

            // Replace all placeholders with the actual URIs
            html = html.replace(/\{\{SCRIPT_URI\}\}/g, scriptUri)
            html = html.replace(/\{\{CSS_URI\}\}/g, cssUri)

            console.log(
                '[Crater] HTML loaded and processed successfully, length:',
                html.length
            )
            console.log('[Crater] Generated HTML:', html)
            return html
        } catch (error) {
            console.error('[Crater] Error loading HTML for WebView:', error)
            // Fallback to empty HTML with error message
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crater Game Asset Assistant</title>
</head>
<body>
    <div style="padding: 20px; text-align: center; color: var(--vscode-errorForeground);">
        <h2>Error Loading Webview</h2>
        <p>Unable to load the webview content. Please try reloading the extension.</p>
        <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
    </div>
</body>
</html>`
        }
    }
}
