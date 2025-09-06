// VS Code API interface
declare const acquireVsCodeApi: () => {
    postMessage: (message: unknown) => void
    getState: () => unknown
    setState: (state: unknown) => void
}

interface WebviewMessage {
    type: string
    text?: string
    message?: string
    response?: string
    images?: string[]
    prompt?: string
    savedPaths?: string[]
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
    sessions?: Array<{
        id: string
        title: string
        createdAt: string
        lastActivity: string
        messageCount: number
    }>
    currentSessionId?: string
    sessionId?: string
    provider?: string
    configured?: boolean
    aiProvider?: string
    aiModel?: string
    geminiApiKey?: string
    openaiApiKey?: string
    imageSaveDirectory?: string
    autoSaveImages?: boolean
    imageSize?: string
    imageQuality?: string
    apiKey?: string
    [key: string]: unknown
}

console.log('[Crater WebView] Script started loading with Vite bundling')
const vscode = acquireVsCodeApi()
console.log('[Crater WebView] VS Code API acquired')

const messagesContainer = document.getElementById('messages')!
const messageInput = document.getElementById(
    'message-input'
) as HTMLInputElement
const sendButton = document.getElementById('send-button')!
const newChatBtn = document.getElementById('new-chat-btn')!
const chatHistoryBtn = document.getElementById('chat-history-btn')!
const providerInfo = document.getElementById('provider-info')!

// Navigation elements
const backBtn = document.getElementById('backBtn')!
const settingsBtn = document.getElementById('settingsBtn')!
const pageTitle = document.getElementById('pageTitle')!
const navProviderInfo = document.getElementById('provider-info')!

// Modal elements
const chatHistoryModal = document.getElementById('chatHistoryModal')!
const modalClose = document.getElementById('modalClose')!
const chatSessionsList = document.getElementById('chatSessionsList')!

// Page containers
const configPage = document.getElementById('configPage')!
const chatPage = document.getElementById('chatPage')!
const settingsPage = document.getElementById('settingsPage')!

// Settings form elements
const providerEl = document.getElementById('provider') as HTMLSelectElement
const modelEl = document.getElementById('model') as HTMLSelectElement
const apiKeyEl = document.getElementById('apiKey') as HTMLInputElement
const apiKeyLabelEl = document.getElementById('apiKeyLabel')!
const imageSizeEl = document.getElementById('imageSize') as HTMLSelectElement
const imageQualityEl = document.getElementById(
    'imageQuality'
) as HTMLSelectElement
const imageSizeSection = document.getElementById('imageSizeSection')!
const imageQualitySection = document.getElementById('imageQualitySection')!
const saveBtn = document.getElementById('saveBtn')!
const validationMessageEl = document.getElementById('validationMessage')!

// Navigation state
let currentPage = 'chat'
let isLoadingSettings = false

// Store API keys temporarily while user is switching providers
const tempApiKeys = {
    gemini: '',
    openai: '',
}
let currentProvider = 'gemini'

// Store image settings
let lastImageSize = 'auto'
let lastImageQuality = 'auto'

console.log('[Crater WebView] DOM elements found:', {
    messagesContainer: !!messagesContainer,
    messageInput: !!messageInput,
    sendButton: !!sendButton,
    newChatBtn: !!newChatBtn,
    chatHistoryBtn: !!chatHistoryBtn,
    providerInfo: !!providerInfo,
    navProviderInfo: !!navProviderInfo,
})

function addMessage(text: string, sender: string, timestamp?: Date): void {
    const messageDiv = document.createElement('div')
    messageDiv.className = `message ${sender}`

    const messageText = document.createElement('div')
    messageText.textContent = text
    messageDiv.appendChild(messageText)

    if (timestamp) {
        const timestampDiv = document.createElement('div')
        timestampDiv.className = 'timestamp'
        timestampDiv.textContent = new Date(timestamp).toLocaleTimeString()
        messageDiv.appendChild(timestampDiv)
    }

    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function addImageMessage(
    imageUrls: string[],
    prompt: string,
    timestamp?: Date
): void {
    const messageDiv = document.createElement('div')
    messageDiv.className = 'message assistant'

    // Add prompt text
    const promptText = document.createElement('div')
    promptText.textContent = `Generated image for: "${prompt}"`
    promptText.style.marginBottom = '8px'
    promptText.style.fontStyle = 'italic'
    messageDiv.appendChild(promptText)

    // Add images
    imageUrls.forEach((imageUrl) => {
        const imageEl = document.createElement('img')

        // Handle legacy raw base64 data by converting to proper data URL
        const processedImageUrl =
            imageUrl.startsWith('data:') || imageUrl.startsWith('http')
                ? imageUrl
                : `data:image/png;base64,${imageUrl}`

        imageEl.src = processedImageUrl
        imageEl.style.maxWidth = '100%'
        imageEl.style.height = 'auto'
        imageEl.style.borderRadius = '4px'
        imageEl.style.marginBottom = '4px'
        imageEl.alt = `Generated game asset: ${prompt}`

        // Add loading and error handling
        imageEl.onload = () => {
            console.log('[Crater WebView] Image loaded successfully')
        }
        imageEl.onerror = () => {
            console.error(
                '[Crater WebView] Failed to load image:',
                processedImageUrl
            )
            imageEl.style.display = 'none'
            const errorText = document.createElement('div')
            errorText.textContent = '❌ Failed to load image'
            errorText.style.color = 'var(--vscode-errorForeground)'
            messageDiv.appendChild(errorText)
        }

        messageDiv.appendChild(imageEl)
    })

    if (timestamp) {
        const timestampDiv = document.createElement('div')
        timestampDiv.className = 'timestamp'
        timestampDiv.textContent = new Date(timestamp).toLocaleTimeString()
        messageDiv.appendChild(timestampDiv)
    }

    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function sendMessage(): void {
    console.log('[Crater WebView] sendMessage called')
    const message = messageInput.value.trim()
    if (message) {
        console.log('[Crater WebView] Sending message:', message)
        addMessage(message, 'user', new Date())

        // Show loading message
        const loadingDiv = document.createElement('div')
        loadingDiv.className = 'message assistant loading'
        loadingDiv.textContent = '🎨 Generating your game asset...'
        loadingDiv.id = 'loading-message'
        messagesContainer.appendChild(loadingDiv)
        messagesContainer.scrollTop = messagesContainer.scrollHeight

        console.log('[Crater WebView] Posting message to extension')
        vscode.postMessage({
            type: 'send-message',
            message: message,
        })

        messageInput.value = ''
    }
}

function newChat(): void {
    console.log('[Crater WebView] newChat called')
    vscode.postMessage({ type: 'new-chat' })
}

function showChatHistory(): void {
    console.log('[Crater WebView] showChatHistory called')
    chatHistoryModal.classList.add('show')
    vscode.postMessage({ type: 'get-chat-sessions' })
}

function hideModal(): void {
    chatHistoryModal.classList.remove('show')
}

function loadChatSession(sessionId: string): void {
    console.log('[Crater WebView] Loading chat session:', sessionId)
    vscode.postMessage({ type: 'load-chat-session', sessionId })
    hideModal()
}

function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
    } else {
        return date.toLocaleDateString()
    }
}

function renderChatSessions(
    sessions: Array<{
        id: string
        title: string
        lastActivity: string
        messageCount: number
    }>,
    currentSessionId: string | null
): void {
    if (!sessions || sessions.length === 0) {
        chatSessionsList.innerHTML =
            '<div class="no-sessions">No previous chats found</div>'
        return
    }

    const sessionsHtml = sessions
        .map((session) => {
            const isActive = session.id === currentSessionId
            return `
            <div class="chat-session-item ${isActive ? 'active' : ''}" data-session-id="${session.id}">
                <div class="session-title">${session.title}</div>
                <div class="session-info">
                    ${session.messageCount} messages • Last active: ${formatDate(session.lastActivity)}
                </div>
            </div>
        `
        })
        .join('')

    chatSessionsList.innerHTML = sessionsHtml

    // Add click listeners to session items
    chatSessionsList.querySelectorAll('.chat-session-item').forEach((item) => {
        item.addEventListener('click', () => {
            const sessionId = (item as HTMLElement).dataset.sessionId
            if (sessionId && sessionId !== currentSessionId) {
                loadChatSession(sessionId)
            }
        })
    })
}

function updateProviderInfo(provider: string | null): void {
    if (!provider) {
        providerInfo.textContent = 'AI Provider: Not configured'
        isConfigured = false
        // Show config page if not configured
        if (currentPage === 'chat') {
            navigateToPage('config')
        }
    } else {
        const providerNames: Record<string, string> = {
            gemini: 'Google Gemini',
            openai: 'OpenAI GPT',
        }
        providerInfo.textContent = `AI Provider: ${providerNames[provider] || provider}`
        isConfigured = true
        // Show chat page if configured and currently on config page
        if (currentPage === 'config') {
            navigateToPage('chat')
        }
    }
}

// Navigation functions
function navigateToPage(page: string): void {
    currentPage = page

    // Update page visibility
    configPage.classList.toggle('active', page === 'config')
    chatPage.classList.toggle('active', page === 'chat')
    settingsPage.classList.toggle('active', page === 'settings')

    // Update header
    if (page === 'config') {
        pageTitle.textContent = '🎮 Game Asset Assistant'
        backBtn.style.display = 'none'
        settingsBtn.style.display = 'block'
        navProviderInfo.style.display = 'none'
    } else if (page === 'chat') {
        pageTitle.textContent = '🎮 Game Asset Assistant'
        backBtn.style.display = 'none'
        settingsBtn.style.display = 'block'
        navProviderInfo.style.display = 'block'
    } else if (page === 'settings') {
        pageTitle.textContent = '⚙️ Settings'
        backBtn.style.display = 'block'
        settingsBtn.style.display = 'none'
        navProviderInfo.style.display = 'none'
        // Request current settings when navigating to settings
        vscode.postMessage({ type: 'get-settings' })
        // Update model options after settings are loaded
        setTimeout(() => updateModelOptions(), 100)
    }
}

function validateApiKey(
    apiKey: string,
    provider: string
): { valid: boolean; message: string } {
    if (!apiKey || apiKey.trim().length === 0) {
        return { valid: false, message: 'API key is required' }
    }

    // Basic validation for common API key formats
    if (provider === 'gemini' && !apiKey.startsWith('AIza')) {
        return {
            valid: false,
            message: 'Gemini API keys typically start with "AIza"',
        }
    }

    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        return {
            valid: false,
            message: 'OpenAI API keys typically start with "sk-"',
        }
    }

    if (apiKey.length < 20) {
        return { valid: false, message: 'API key seems too short' }
    }

    return { valid: true, message: 'API key format looks valid' }
}

function updateValidation(): void {
    const provider = providerEl.value
    const apiKey = apiKeyEl.value

    const validation = validateApiKey(apiKey, provider)
    validationMessageEl.textContent = validation.message
    validationMessageEl.className =
        'validation-message ' + (validation.valid ? 'success' : 'error')

    // If this is OpenAI and we have stored image settings, restore them after validation
    if (provider === 'openai' && (lastImageSize || lastImageQuality)) {
        console.log(
            '[Crater WebView] Validation updated, checking if image settings need restoration'
        )
        setTimeout(() => {
            // Check if dropdowns have been reset
            const sizeNeedsRestore =
                imageSizeEl && imageSizeEl.value !== lastImageSize
            const qualityNeedsRestore =
                imageQualityEl && imageQualityEl.value !== lastImageQuality

            if (sizeNeedsRestore || qualityNeedsRestore) {
                console.log(
                    '[Crater WebView] Restoring image settings after validation:',
                    {
                        sizeNeedsRestore,
                        qualityNeedsRestore,
                        currentSize: imageSizeEl?.value,
                        currentQuality: imageQualityEl?.value,
                        expectedSize: lastImageSize,
                        expectedQuality: lastImageQuality,
                    }
                )
                setImageSettings(lastImageSize, lastImageQuality)
            }
        }, 10)
    }
}

function updateApiKeyLabel(): void {
    const map: Record<string, string> = {
        gemini: 'Gemini API Key',
        openai: 'OpenAI API Key',
    }
    apiKeyLabelEl.textContent = map[providerEl.value] || 'API Key'
    const section = document.getElementById('apiKeySection')!
    section.style.display = 'block'
    updateValidation()
}

function updateModelOptions(): void {
    const provider = providerEl.value
    const modelSection = document.getElementById('modelSection')!

    // Clear existing options
    modelEl.innerHTML = ''

    const models: Record<string, Array<{ value: string; label: string }>> = {
        gemini: [
            {
                value: 'gemini-2.5-flash-image-preview',
                label: 'Gemini 2.5 Flash Image Preview (Default)',
            },
            {
                value: 'imagen-4.0-generate-001',
                label: 'Imagen 4.0 (High Quality)',
            },
        ],
        openai: [{ value: 'gpt-image-1', label: 'GPT-Image-1 (Latest)' }],
    }

    const providerModels = models[provider] || []
    providerModels.forEach((model) => {
        const option = document.createElement('option')
        option.value = model.value
        option.textContent = model.label
        modelEl.appendChild(option)
    })

    // Show model section
    modelSection.style.display = 'block'

    // Show/hide image settings based on provider
    if (provider === 'openai') {
        imageSizeSection.style.display = 'block'
        imageQualitySection.style.display = 'block'
        console.log(
            '[Crater WebView] Image sections made visible for OpenAI provider'
        )
    } else {
        imageSizeSection.style.display = 'none'
        imageQualitySection.style.display = 'none'
        console.log(
            '[Crater WebView] Image sections hidden for non-OpenAI provider'
        )
    }
}

function setImageSettings(imageSize?: string, imageQuality?: string): void {
    console.log('[Crater WebView] setImageSettings called with:', {
        imageSize,
        imageQuality,
    })
    console.log('[Crater WebView] isLoadingSettings:', isLoadingSettings)
    console.log('[Crater WebView] Current provider:', currentProvider)
    console.log('[Crater WebView] Provider dropdown value:', providerEl.value)

    // Store the values globally
    if (imageSize) lastImageSize = imageSize
    if (imageQuality) lastImageQuality = imageQuality

    if (imageSizeEl && imageSize) {
        console.log('[Crater WebView] Setting imageSize to:', imageSize)
        console.log(
            '[Crater WebView] ImageSize section visible:',
            imageSizeSection.style.display !== 'none'
        )
        console.log(
            '[Crater WebView] Available size options:',
            Array.from(imageSizeEl.options).map((opt) => opt.value)
        )
        imageSizeEl.value = imageSize
        console.log(
            '[Crater WebView] ImageSize dropdown value after setting:',
            imageSizeEl.value
        )
        if (imageSizeEl.value !== imageSize) {
            console.warn(
                '[Crater WebView] Failed to set imageSize - trying selectedIndex method'
            )
            // Try to find a matching option
            for (let i = 0; i < imageSizeEl.options.length; i++) {
                if (imageSizeEl.options[i].value === imageSize) {
                    imageSizeEl.selectedIndex = i
                    console.log(
                        '[Crater WebView] Set imageSize using selectedIndex:',
                        i
                    )
                    break
                }
            }
        }
    }

    if (imageQualityEl && imageQuality) {
        console.log('[Crater WebView] Setting imageQuality to:', imageQuality)
        console.log(
            '[Crater WebView] ImageQuality section visible:',
            imageQualitySection.style.display !== 'none'
        )
        console.log(
            '[Crater WebView] Available quality options:',
            Array.from(imageQualityEl.options).map((opt) => opt.value)
        )
        imageQualityEl.value = imageQuality
        console.log(
            '[Crater WebView] ImageQuality dropdown value after setting:',
            imageQualityEl.value
        )
        if (imageQualityEl.value !== imageQuality) {
            console.warn(
                '[Crater WebView] Failed to set imageQuality - trying selectedIndex method'
            )
            // Try to find a matching option
            for (let i = 0; i < imageQualityEl.options.length; i++) {
                if (imageQualityEl.options[i].value === imageQuality) {
                    imageQualityEl.selectedIndex = i
                    console.log(
                        '[Crater WebView] Set imageQuality using selectedIndex:',
                        i
                    )
                    break
                }
            }
        }
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage)
newChatBtn.addEventListener('click', newChat)
chatHistoryBtn.addEventListener('click', showChatHistory)

// Modal event listeners
modalClose.addEventListener('click', hideModal)
chatHistoryModal.addEventListener('click', (e) => {
    if (e.target === chatHistoryModal) {
        hideModal()
    }
})

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage()
    }
})

// Navigation event listeners
settingsBtn.addEventListener('click', () => navigateToPage('settings'))
backBtn.addEventListener('click', () => navigateToPage('chat'))

// Config page event listener
const goToSettingsBtn = document.getElementById('goToSettingsBtn')
if (goToSettingsBtn) {
    goToSettingsBtn.addEventListener('click', () => navigateToPage('settings'))
}

// Form event listeners
providerEl.addEventListener('change', () => {
    // Ignore changes during settings loading to prevent overriding user selections
    if (isLoadingSettings) return

    // Save current API key before switching
    if (currentProvider === 'gemini') {
        tempApiKeys.gemini = apiKeyEl.value
    } else if (currentProvider === 'openai') {
        tempApiKeys.openai = apiKeyEl.value
    }

    // Update current provider tracking
    currentProvider = providerEl.value

    // Update UI elements for new provider
    updateApiKeyLabel()
    updateModelOptions()

    // Restore API key for the selected provider
    if (currentProvider === 'gemini') {
        apiKeyEl.value = tempApiKeys.gemini
    } else if (currentProvider === 'openai') {
        apiKeyEl.value = tempApiKeys.openai

        // Restore image settings for OpenAI provider after UI update
        setTimeout(() => {
            setImageSettings(lastImageSize, lastImageQuality)
        }, 100)
    } else {
        apiKeyEl.value = ''
    }

    updateValidation()
})

apiKeyEl.addEventListener('input', () => {
    // Update temporary storage when user types
    if (currentProvider === 'gemini') {
        tempApiKeys.gemini = apiKeyEl.value
    } else if (currentProvider === 'openai') {
        tempApiKeys.openai = apiKeyEl.value
    }
    updateValidation()

    // If this is OpenAI and we have stored image settings, restore them
    if (currentProvider === 'openai' && (lastImageSize || lastImageQuality)) {
        console.log(
            '[Crater WebView] API key changed, restoring image settings:',
            { lastImageSize, lastImageQuality }
        )
        setTimeout(() => {
            setImageSettings(lastImageSize, lastImageQuality)
        }, 50)
    }
})

// Watch for programmatic changes to API key field (not just user input)
const apiKeyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'value'
        ) {
            console.log(
                '[Crater WebView] API key field value changed programmatically'
            )
            if (
                currentProvider === 'openai' &&
                (lastImageSize || lastImageQuality)
            ) {
                console.log(
                    '[Crater WebView] Restoring image settings after programmatic API key change'
                )
                setTimeout(() => {
                    setImageSettings(lastImageSize, lastImageQuality)
                }, 50)
            }
        }
    })
})

// Observe changes to the API key input field
apiKeyObserver.observe(apiKeyEl, {
    attributes: true,
    attributeFilter: ['value'],
    childList: false,
    subtree: false,
})

// Handle messages from the extension
window.addEventListener('message', (event: MessageEvent<WebviewMessage>) => {
    console.log(
        '[Crater WebView] Received message from extension:',
        event.data.type
    )
    const message = event.data
    switch (message.type) {
        case 'chat-response': {
            console.log('[Crater WebView] Processing chat response')
            // Remove loading message
            const loadingMessage = document.getElementById('loading-message')
            if (loadingMessage) {
                loadingMessage.remove()
            }
            addMessage(message.response!, 'assistant', new Date())
            break
        }
        case 'image-response': {
            console.log('[Crater WebView] Processing image response')
            // Remove loading message
            const imageLoadingMessage =
                document.getElementById('loading-message')
            if (imageLoadingMessage) {
                imageLoadingMessage.remove()
            }
            addImageMessage(message.images!, message.prompt!, new Date())
            break
        }
        case 'chat-history': {
            // Clear existing messages except welcome
            const existingMessages = messagesContainer.querySelectorAll(
                '.message:not(.welcome-message)'
            )
            existingMessages.forEach((msg) => msg.remove())

            // Add historical messages
            message.messages!.forEach((msg) => {
                if (msg.messageType === 'image' && msg.imageData) {
                    // Restore image message
                    addImageMessage(
                        msg.imageData.images,
                        msg.imageData.prompt,
                        msg.timestamp
                    )
                } else {
                    // Regular text message
                    addMessage(msg.text, msg.sender, msg.timestamp)
                }
            })
            break
        }
        case 'chat-cleared': {
            // Clear all messages except welcome
            const allMessages = messagesContainer.querySelectorAll(
                '.message:not(.welcome-message)'
            )
            allMessages.forEach((msg) => msg.remove())
            break
        }
        case 'chat-sessions': {
            console.log(
                '[Crater WebView] Received chat sessions:',
                message.sessions
            )
            renderChatSessions(message.sessions!, message.currentSessionId!)
            break
        }
        case 'provider-info':
        case 'provider-updated': {
            updateProviderInfo(message.provider!)
            break
        }
        case 'settings': {
            console.log('[Crater WebView] Received settings message:', message)
            isLoadingSettings = true

            // Store API keys in temporary storage
            tempApiKeys.gemini = message.geminiApiKey || ''
            tempApiKeys.openai = message.openaiApiKey || ''

            // Update provider dropdown and track current provider
            providerEl.value = message.aiProvider || 'gemini'
            currentProvider = message.aiProvider || 'gemini'

            // Update API key based on the provider from settings
            if (message.aiProvider === 'gemini') {
                apiKeyEl.value = tempApiKeys.gemini
            } else if (message.aiProvider === 'openai') {
                apiKeyEl.value = tempApiKeys.openai
            } else {
                apiKeyEl.value = ''
            }
            updateApiKeyLabel()
            updateModelOptions()

            // Set model value
            if (message.aiModel && modelEl) {
                modelEl.value = message.aiModel
            }

            // Set image settings values with multiple attempts to ensure they stick
            const sizeValue = message.imageSize || 'auto'
            const qualityValue = message.imageQuality || 'auto'

            // Multiple attempts with different delays to ensure values are set
            const attemptImageSettings = (attempt = 1) => {
                console.log(
                    '[Crater WebView] Image settings attempt',
                    attempt,
                    'with values:',
                    { sizeValue, qualityValue }
                )
                setImageSettings(sizeValue, qualityValue)

                // Check if values were actually set after a short delay
                setTimeout(() => {
                    const sizeSet =
                        !imageSizeEl || imageSizeEl.value === sizeValue
                    const qualitySet =
                        !imageQualityEl || imageQualityEl.value === qualityValue

                    console.log(
                        '[Crater WebView] Attempt',
                        attempt,
                        'results:',
                        {
                            sizeSet,
                            qualitySet,
                            actualSizeValue: imageSizeEl?.value,
                            actualQualityValue: imageQualityEl?.value,
                        }
                    )

                    // If not set correctly and we haven't tried too many times, try again
                    if ((!sizeSet || !qualitySet) && attempt < 5) {
                        setTimeout(() => attemptImageSettings(attempt + 1), 200)
                    }
                }, 100)
            }

            // Start attempts after initial UI setup
            setTimeout(() => attemptImageSettings(1), 200)
            setTimeout(() => attemptImageSettings(2), 600)

            // Set up periodic monitoring for the first 5 seconds to catch any resets
            const monitoringInterval = setInterval(() => {
                if (
                    currentProvider === 'openai' &&
                    (lastImageSize || lastImageQuality)
                ) {
                    const sizeOk =
                        !imageSizeEl || imageSizeEl.value === lastImageSize
                    const qualityOk =
                        !imageQualityEl ||
                        imageQualityEl.value === lastImageQuality

                    if (!sizeOk || !qualityOk) {
                        console.log(
                            '[Crater WebView] Periodic check found reset dropdowns, restoring:',
                            {
                                currentSize: imageSizeEl?.value,
                                expectedSize: lastImageSize,
                                currentQuality: imageQualityEl?.value,
                                expectedQuality: lastImageQuality,
                            }
                        )
                        setImageSettings(lastImageSize, lastImageQuality)
                    }
                }
            }, 500)

            // Stop monitoring after 5 seconds
            setTimeout(() => {
                clearInterval(monitoringInterval)
                console.log(
                    '[Crater WebView] Stopped periodic monitoring of image settings'
                )
            }, 5000)

            // Set loading to false after starting the process
            isLoadingSettings = false
            break
        }
        case 'settings-saved': {
            navigateToPage('chat')
            break
        }
        case 'settings-error': {
            console.error('[Crater Settings] Error:', message.message)
            break
        }
    }
})

// Settings save button
saveBtn.addEventListener('click', () => {
    vscode.postMessage({
        type: 'save-settings',
        aiProvider: providerEl.value,
        aiModel: modelEl.value,
        apiKey: apiKeyEl.value,
        imageSize: imageSizeEl.value,
        imageQuality: imageQualityEl.value,
    })
})

// Request chat history on load with a small delay to ensure everything is ready
setTimeout(() => {
    vscode.postMessage({ type: 'get-chat-history' })
    vscode.postMessage({ type: 'get-provider-info' })
}, 100)
