<!-- Enhanced Game Asset Chatbot with AI provider integration for web -->
<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { browser } from '$app/environment'
    import { ChatBotService, type BaseImageModelProvider } from '@crater/core'
    import {
        createSession,
        deriveTitleFromMessage,
        SESSION_TITLE_FALLBACK,
        type ChatSession,
        type EnhancedMessage,
        type SessionMode,
    } from '$lib/chat/sessionTypes'
    import {
        createProviderForMode,
        getDefaultModel,
        isValidApiKey,
        normalizeModel,
        type ProviderKind,
    } from '$lib/chat/aiProviderConfig'

    export let sessionId: string = ''
    export let currentTime: string = ''
    export let showSettings: boolean = false

    const chatbotService = new ChatBotService({
        systemPrompt:
            'You are a helpful game asset assistant for creating creative game content.',
        thinkingTime: 500,
    })

    const initialSession = createSession({ mode: 'image' })
    let sessions: ChatSession[] = [initialSession]
    let activeSessionId: string = initialSession.id

    let currentMessage = ''
    let isLoading = false
    let infoCardExpanded = false
    let newChatMenuOpen = false

    let aiProvider: ProviderKind = 'gemini'
    let previousProvider: ProviderKind = 'gemini'
    let apiKey = ''
    let imageModel = ''
    let chatModel = ''
    let imageSize = '1024x1024'
    let imageQuality: 'standard' | 'hd' = 'standard'

    let imageProvider: BaseImageModelProvider | null = null
    let chatProvider: BaseImageModelProvider | null = null
    let isImageConfigured = false
    let isChatConfigured = false
    let usageCollapsed = true
    type ProviderStatus = {
        indicator: 'active' | 'inactive'
        text: string
    }
    interface UsageSummary {
        inputTokens: number
        outputTokens: number
        totalTokens: number
        cost: number
        currency: string | null
        hasData: boolean
    }
    let providerStatus: ProviderStatus = {
        indicator: 'inactive',
        text: 'Add GEMINI API Key',
    }
    let usageSummary: UsageSummary = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        currency: null,
        hasData: false,
    }

    $: activeSession =
        sessions.find((session) => session.id === activeSessionId) ?? null

    $: activeMode = activeSession?.mode ?? 'image'

    $: isConfiguredForActiveMode =
        activeMode === 'chat' ? isChatConfigured : isImageConfigured

    $: placeholderText = getPlaceholderText()

    $: providerStatus = (() => {
        if (isConfiguredForActiveMode) {
            return {
                indicator: 'active' as const,
                text: `${aiProvider.toUpperCase()} Ready`,
            }
        }

        if (!apiKey) {
            return {
                indicator: 'inactive' as const,
                text: `Add ${aiProvider.toUpperCase()} API Key`,
            }
        }

        return {
            indicator: 'inactive' as const,
            text: `Check ${aiProvider.toUpperCase()} Settings`,
        }
    })()

    $: imageModel = normalizeModel(aiProvider, 'image', imageModel)
    $: chatModel = normalizeModel(aiProvider, 'chat', chatModel)
    $: usageSummary = computeUsageSummary(activeSession)

    onMount(() => {
        loadSettings()
        if (browser) {
            window.addEventListener('keydown', handleGlobalKeydown)
        }
    })

    onDestroy(() => {
        if (browser) {
            window.removeEventListener('keydown', handleGlobalKeydown)
        }
    })

    function getPlaceholderText(): string {
        if (!activeSession) {
            return 'Ask me about game assets...'
        }

        if (activeSession.mode === 'chat') {
            return isChatConfigured
                ? 'Chat about game asset ideas, pipelines, and best practices'
                : 'Chat about game assets... (configure AI for richer replies)'
        }

        return isImageConfigured
            ? 'Ask me to generate a pixel art hero or vibrant environment'
            : 'Ask me about game assets... (configure AI to unlock image generation)'
    }

    function toggleNewChatMenu(): void {
        newChatMenuOpen = !newChatMenuOpen
    }

    function createNewSession(mode: SessionMode): void {
        const session = createSession({ mode })
        sessions = [session, ...sessions]
        activeSessionId = session.id
        currentMessage = ''
        newChatMenuOpen = false
        usageCollapsed = true
    }

    function setActiveSession(sessionId: string): void {
        activeSessionId = sessionId
        currentMessage = ''
        newChatMenuOpen = false
        usageCollapsed = true
    }

    function updateSession(
        sessionId: string,
        updater: (session: ChatSession) => ChatSession
    ): void {
        sessions = sessions.map((session) =>
            session.id === sessionId ? updater(session) : session
        )
    }

    function appendMessage(sessionId: string, message: EnhancedMessage): void {
        updateSession(sessionId, (session) => ({
            ...session,
            messages: [...session.messages, message],
        }))
    }

    function updateTitleWithMessage(sessionId: string, text: string): void {
        updateSession(sessionId, (session) => {
            if (session.title !== SESSION_TITLE_FALLBACK[session.mode]) {
                return session
            }

            return {
                ...session,
                title: deriveTitleFromMessage(session.mode, text),
            }
        })
    }

    function clearChat(): void {
        if (!activeSession) {
            return
        }

        updateSession(activeSession.id, (session) => ({
            ...session,
            messages: [],
        }))
    }

    function wantsImage(prompt: string): boolean {
        const lowered = prompt.toLowerCase()
        return (
            lowered.includes('generate') ||
            lowered.includes('create') ||
            lowered.includes('image') ||
            lowered.includes('art')
        )
    }

    function createAssistantTextMessage(text: string): EnhancedMessage {
        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            sender: 'assistant',
            timestamp: new Date(),
            messageType: 'text',
        }
    }

    function createMissingApiKeyMessage(mode: SessionMode): EnhancedMessage {
        const title = mode === 'chat' ? 'Chat responses' : 'AI features'
        const directive =
            mode === 'chat'
                ? 'Add your API key in Settings to unlock chat replies.'
                : 'Add your API key in Settings to enable AI image generation and responses.'

        return createAssistantTextMessage(
            `⚠️ ${title} require a valid API key. ${directive}`
        )
    }

    function createErrorMessage(error: unknown): EnhancedMessage {
        const message =
            error instanceof Error ? error.message : 'Unknown error occurred'
        return createAssistantTextMessage(`❌ Error: ${message}`)
    }

    function createImageProviderWarning(): EnhancedMessage {
        return createAssistantTextMessage(
            '⚠️ Image generation requires a valid AI provider API key. Open Settings to add your Gemini or OpenAI key and try again.'
        )
    }

    function createChatModeImageWarning(): EnhancedMessage {
        return createAssistantTextMessage(
            'This session is in chat mode. Start a new image session to generate artwork.'
        )
    }

    function applyProviderForMode(mode: SessionMode): void {
        if (mode === 'chat') {
            chatbotService.setAIProvider(
                chatProvider && chatProvider.isConfigured()
                    ? chatProvider
                    : undefined
            )
            return
        }

        chatbotService.setAIProvider(
            imageProvider && imageProvider.isConfigured()
                ? imageProvider
                : undefined
        )
    }

    async function handleChatSessionMessage(
        sessionId: string,
        prompt: string
    ): Promise<void> {
        if (!isChatConfigured) {
            appendMessage(sessionId, createMissingApiKeyMessage('chat'))
            return
        }

        if (wantsImage(prompt)) {
            appendMessage(sessionId, createChatModeImageWarning())
            return
        }

        applyProviderForMode('chat')
        const response = await chatbotService.generateResponse(prompt)
        appendMessage(sessionId, createAssistantTextMessage(response))
    }

    async function handleImageSessionMessage(
        sessionId: string,
        prompt: string
    ): Promise<void> {
        if (!isImageConfigured) {
            appendMessage(
                sessionId,
                createImageProviderWarning()
            )
            return
        }

        applyProviderForMode('image')
        const response = await chatbotService.generateImage(prompt, {
            size: imageSize,
            quality: imageQuality,
            n: 1,
        })

        const images = response.images
            .map((img) => {
                if (img.url) {
                    return img.url
                }
                if (img.base64) {
                    return img.base64.startsWith('data:')
                        ? img.base64
                        : `data:image/png;base64,${img.base64}`
                }
                return ''
            })
            .filter(Boolean) as string[]

        if (images.length === 0) {
            throw new Error('No images generated')
        }

        appendMessage(sessionId, {
            id: `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
            text: `Generated ${images.length} image(s) for: "${prompt}"`,
            sender: 'assistant',
            timestamp: new Date(),
            messageType: 'image',
            imageData: {
                images,
                prompt,
                usage: response.metadata?.usage as any,
                cost: response.metadata?.cost as any,
            },
        })
    }

    async function sendMessage(): Promise<void> {
        if (!activeSession) {
            return
        }

        const trimmed = currentMessage.trim()
        if (!trimmed || isLoading) {
            return
        }

        const { id: sessionId, mode } = activeSession
        const userMessage: EnhancedMessage = {
            id: Date.now().toString(),
            text: trimmed,
            sender: 'user',
            timestamp: new Date(),
            messageType: 'text',
        }

        currentMessage = ''
        appendMessage(sessionId, userMessage)
        updateTitleWithMessage(sessionId, trimmed)
        isLoading = true

        try {
            if (mode === 'image') {
                await handleImageSessionMessage(sessionId, trimmed)
            } else {
                await handleChatSessionMessage(sessionId, trimmed)
            }
        } catch (error) {
            appendMessage(sessionId, createErrorMessage(error))
        } finally {
            isLoading = false
        }
    }

    function computeUsageSummary(session: ChatSession | null): UsageSummary {
        const summary: UsageSummary = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            cost: 0,
            currency: null,
            hasData: false,
        }

        if (!session) {
            return summary
        }

        for (const message of session.messages) {
            const usage = message.imageData?.usage
            if (usage) {
                summary.hasData = true
                summary.inputTokens += usage.inputTextTokens ?? 0
                summary.outputTokens += usage.outputImageTokens ?? 0
                summary.totalTokens += usage.totalTokens ?? 0
            }

            const cost = message.imageData?.cost
            if (cost) {
                summary.hasData = true
                summary.cost += cost.totalCost ?? 0
                if (!summary.currency && cost.currency) {
                    summary.currency = cost.currency
                }
            }
        }

        return summary
    }

    function handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            sendMessage()
        }
    }

    function downloadImage(imageUrl: string, prompt: string): void {
        if (!browser) {
            return
        }
        try {
            const link = document.createElement('a')
            link.href = imageUrl
            link.download = `game-asset-${prompt
                .replace(/[^a-zA-Z0-9]/g, '-')
                .substring(0, 50)}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Failed to download image:', error)
        }
    }

    function handleGlobalKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape') {
            return
        }

        if (showSettings) {
            showSettings = false
        }

        if (newChatMenuOpen) {
            newChatMenuOpen = false
        }
    }

    function handleProviderChange(): void {
        if (aiProvider === previousProvider) {
            return
        }

        imageModel = getDefaultModel(aiProvider, 'image')
        chatModel = getDefaultModel(aiProvider, 'chat')

        previousProvider = aiProvider
        updateAIProviders()
    }

    function updateAIProviders(): void {
        if (!apiKey || !isValidApiKey(aiProvider, apiKey)) {
            imageProvider = null
            chatProvider = null
            isImageConfigured = false
            isChatConfigured = false
            chatbotService.setAIProvider(undefined)
            return
        }

        imageProvider =
            createProviderForMode(aiProvider, 'image', {
                apiKey,
                model: imageModel || getDefaultModel(aiProvider, 'image'),
                imageQuality,
                imageSize,
            }) ?? null

        chatProvider =
            createProviderForMode(aiProvider, 'chat', {
                apiKey,
                model: chatModel || getDefaultModel(aiProvider, 'chat'),
                imageQuality,
                imageSize,
            }) ?? null

        isImageConfigured = !!imageProvider && imageProvider.isConfigured()
        isChatConfigured = !!chatProvider && chatProvider.isConfigured()

        applyProviderForMode(activeMode)
    }

    function loadSettings(): void {
        if (!browser) {
            previousProvider = aiProvider
            return
        }

        try {
            const saved = localStorage.getItem('crater-web-ai-settings')
            if (!saved) {
                previousProvider = aiProvider
                return
            }

            const settings = JSON.parse(saved)
            const storedProvider = settings.aiProvider ?? 'gemini'
            aiProvider = storedProvider === 'openai' ? 'openai' : 'gemini'
            apiKey = settings.apiKey ?? ''
            imageModel =
                settings.imageModel ??
                settings.aiModel ??
                getDefaultModel(aiProvider, 'image')
            chatModel =
                settings.chatModel ??
                getDefaultModel(aiProvider, 'chat')
            imageSize = settings.imageSize ?? '1024x1024'
            imageQuality = settings.imageQuality ?? 'standard'
            previousProvider = aiProvider
            updateAIProviders()
        } catch (error) {
            console.error('Failed to load settings:', error)
        }
    }

    function saveSettings(): void {
        if (!browser) {
            return
        }

        try {
            apiKey = apiKey.trim()
            const settings = {
                aiProvider,
                apiKey,
                imageModel,
                chatModel,
                imageSize,
                imageQuality,
            }
            localStorage.setItem(
                'crater-web-ai-settings',
                JSON.stringify(settings)
            )
            previousProvider = aiProvider
            updateAIProviders()
            showSettings = false
        } catch (error) {
            console.error('Failed to save settings:', error)
        }
    }

    function toggleUsageSummary(): void {
        usageCollapsed = !usageCollapsed
    }

    function handleUsageToggleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggleUsageSummary()
        }
    }
</script>

<div class="chatbot-container">
    <aside class="session-panel">
        <div class="session-panel-header">
            <h3>Sessions</h3>
            <div class="new-chat-wrapper">
                <button class="new-chat-btn" on:click={toggleNewChatMenu}>
                    ＋ New Chat
                </button>
                {#if newChatMenuOpen}
                    <div class="new-chat-menu">
                        <button on:click={() => createNewSession('chat')}>
                            Chat Mode
                        </button>
                        <button on:click={() => createNewSession('image')}>
                            Image Mode
                        </button>
                    </div>
                {/if}
            </div>
        </div>
        <div class="session-list">
            {#if sessions.length === 0}
                <p class="empty-sessions">Start a conversation to begin.</p>
            {:else}
                {#each sessions as session (session.id)}
                    <button
                        class="session-item"
                        class:active={session.id === activeSessionId}
                        on:click={() => setActiveSession(session.id)}
                    >
                        <span class="session-item-title">{session.title}</span>
                        <span class="session-mode-tag" data-mode={session.mode}>
                            {session.mode === 'chat' ? 'Chat' : 'Image'}
                        </span>
                    </button>
                {/each}
            {/if}
        </div>
    </aside>

    <div class="chat-body" on:click={() => (newChatMenuOpen = false)}>
        <div class="chat-header">
            <div class="header-title">
                <h2>🎮 Game Asset Assistant</h2>
                {#if activeSession}
                    <span class="mode-chip" data-mode={activeSession.mode}>
                        {activeSession.mode === 'chat' ? 'Chat Mode' : 'Image Mode'}
                    </span>
                {/if}
            </div>
            <div class="header-controls">
                <div class="provider-status">
                    <span
                        class="status-indicator"
                        class:active={providerStatus.indicator === 'active'}
                        class:inactive={providerStatus.indicator === 'inactive'}
                    >●</span>
                    <span class="status-text">{providerStatus.text}</span>
                </div>
                <button on:click={clearChat} class="clear-btn">Clear Session</button>
            </div>
        </div>

        <div class="info-card-container">
            <button
                class="info-card-header"
                on:click={() => (infoCardExpanded = !infoCardExpanded)}
                aria-expanded={infoCardExpanded}
            >
                <div class="info-header-content">
                    <h3>🎯 What is Crater?</h3>
                    <span class="expand-icon" class:expanded={infoCardExpanded}>
                        {infoCardExpanded ? '▼' : '▶'}
                    </span>
                </div>
            </button>

            {#if infoCardExpanded}
                <div class="info-card-content">
                    <p>Crater is a powerful game development platform that helps you create amazing game assets using AI technology.</p>

                    <h4>✨ Features</h4>
                    <ul>
                        <li>AI-powered image generation for game assets</li>
                        <li>Support for multiple AI providers (Gemini, OpenAI)</li>
                        <li>Interactive chatbot assistant</li>
                        <li>Web and VS Code extension support</li>
                    </ul>

                    <h4>🚀 Getting Started</h4>
                    <ol>
                        <li>Click the "Settings" button in the chatbot</li>
                        <li>Choose an AI provider (Gemini or OpenAI)</li>
                        <li>Enter your API key</li>
                        <li>Start generating amazing game assets!</li>
                    </ol>

                    {#if sessionId}
                        <div class="session-info">
                            <h4>📊 Session Info</h4>
                            <p>Session ID: <code>{sessionId}</code></p>
                            <p>Current Time: <code>{currentTime}</code></p>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        {#if activeSession?.mode === 'image' && usageSummary.hasData}
            <div class="usage-card">
                <button
                    class="usage-header"
                    on:click={toggleUsageSummary}
                    on:keydown={handleUsageToggleKeydown}
                    aria-expanded={!usageCollapsed}
                    aria-controls="usage-details"
                >
                    <span class="usage-chevron" class:expanded={!usageCollapsed}>▶</span>
                    <span class="usage-title">Usage Summary</span>
                    <span class="usage-cost">
                        ${usageSummary.cost.toFixed(4)} {usageSummary.currency ?? 'USD'}
                    </span>
                </button>
                {#if !usageCollapsed}
                    <div id="usage-details" class="usage-details">
                        <div class="usage-row">
                            <span>Input Tokens</span>
                            <span class="value">{usageSummary.inputTokens.toLocaleString()}</span>
                        </div>
                        <div class="usage-row">
                            <span>Output Tokens</span>
                            <span class="value">{usageSummary.outputTokens.toLocaleString()}</span>
                        </div>
                        <div class="usage-row">
                            <span>Total Tokens</span>
                            <span class="value">{usageSummary.totalTokens.toLocaleString()}</span>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <div class="messages-container">
            {#if activeSession}
                {#if activeSession.messages.length === 0}
                    <div class="empty-state">
                        <p>Start a conversation or open ⚙️ Settings to connect your AI provider.</p>
                    </div>
                {:else}
                    {#each activeSession.messages as message (message.id)}
                        <div class="message {message.sender}">
                            <div class="message-content">
                                {#if message.messageType === 'image' && message.imageData}
                                    <div class="image-message">
                                        <p>
                                            {@html message.text
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br>')}
                                        </p>
                                        <div class="image-gallery">
                                            {#each message.imageData.images as imageUrl}
                                                <div class="image-item">
                                                    <img src={imageUrl} alt={message.imageData.prompt} class="generated-image" />
                                                    <div class="image-actions">
                                                        <button
                                                            on:click={() => downloadImage(imageUrl, message.imageData?.prompt || 'image')}
                                                            class="download-btn"
                                                            title="Download Image"
                                                        >
                                                            💾 Download
                                                        </button>
                                                        <button
                                                            on:click={() => browser && window.open(imageUrl, '_blank')}
                                                            class="view-btn"
                                                            title="View Full Size"
                                                        >
                                                            🔍 View
                                                        </button>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                        {#if message.imageData.cost}
                                            <div class="usage-info">
                                                <small>Cost: ${message.imageData.cost.totalCost.toFixed(4)} {message.imageData.cost.currency}</small>
                                            </div>
                                        {/if}
                                    </div>
                                {:else}
                                    {@html message.text
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\n/g, '<br>')}
                                {/if}
                            </div>
                            <div class="message-time">
                                {message.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                    {/each}
                {/if}
            {/if}

            {#if isLoading}
                <div class="message assistant loading">
                    <div class="message-content">
                        <span class="loading-dots">
                            {activeMode === 'image' ? 'Generating image...' : 'Thinking...'}
                        </span>
                    </div>
                </div>
            {/if}
        </div>

        <div class="input-container">
            <input
                type="text"
                bind:value={currentMessage}
                on:keydown={handleKeyDown}
                placeholder={placeholderText}
                disabled={isLoading}
                class="message-input"
                maxlength="500"
            />
            <button
                on:click={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                class="send-btn"
            >
                {isLoading ? 'Sending...' : 'Send'}
            </button>
        </div>
    </div>
</div>

<!-- Settings Modal -->
{#if showSettings}
  <div class="modal-backdrop" on:click={() => showSettings = false}>
    <div class="settings-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h2>⚙️ AI Provider Configuration</h2>
        <button class="close-btn" on:click={() => showSettings = false}>✕</button>
      </div>

      <div class="modal-content">
        <div class="setting-group">
          <label for="provider-select">AI Provider:</label>
          <select
            id="provider-select"
            bind:value={aiProvider}
            on:change={handleProviderChange}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

          <div class="setting-group">
            <label for="image-model-select">Image Model:</label>
            <select id="image-model-select" bind:value={imageModel}>
              {#if aiProvider === 'gemini'}
                <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash (Image Preview)</option>
                <option value="imagen-4.0-generate-001">Imagen 4.0 (High Quality)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              {:else if aiProvider === 'openai'}
                <option value="gpt-image-1">GPT Image 1 (Latest)</option>
              {/if}
            </select>
            <div class="setting-info">
              <p>Model used when generating images in image sessions</p>
            </div>
          </div>

          <div class="setting-group">
            <label for="chat-model-select">Chat Model:</label>
            <select id="chat-model-select" bind:value={chatModel}>
              {#if aiProvider === 'gemini'}
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              {:else if aiProvider === 'openai'}
                <option value="gpt-5-nano">GPT-5 Nano</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              {/if}
            </select>
            <div class="setting-info">
              <p>Model used for text conversations in chat sessions</p>
            </div>
          </div>

          <div class="setting-group">
            <label for="api-key">API Key:</label>
            <input
              id="api-key"
              type="password"
              bind:value={apiKey}
              placeholder={aiProvider === 'gemini' ? 'AIza...' : 'sk-...'}
              class="api-key-input"
            />
          </div>
          <div class="setting-info">
            {#if aiProvider === 'gemini'}
              <p>Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
            {:else if aiProvider === 'openai'}
              <p>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a></p>
            {/if}
          </div>

        {#if aiProvider === 'openai'}
          <div class="setting-group">
            <label for="image-size">Image Size:</label>
            <select id="image-size" bind:value={imageSize}>
              <option value="1024x1024">1024×1024 (Square)</option>
              <option value="1024x1792">1024×1792 (Portrait)</option>
              <option value="1792x1024">1792×1024 (Landscape)</option>
              <option value="512x512">512×512 (Small)</option>
              <option value="256x256">256×256 (Tiny)</option>
            </select>
            <div class="setting-info">
              <p>Generated image dimensions</p>
            </div>
          </div>

          <div class="setting-group">
            <label for="image-quality">Image Quality:</label>
            <select id="image-quality" bind:value={imageQuality}>
              <option value="standard">Standard</option>
              <option value="hd">HD (Higher cost)</option>
            </select>
            <div class="setting-info">
              <p>Image generation quality level</p>
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button on:click={saveSettings} class="save-btn">
          Save Settings
        </button>
        <button on:click={() => showSettings = false} class="cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  .chatbot-container {
    display: flex;
    gap: 1.5rem;
    height: 100%;
    width: 100%;
    padding: 2rem;
    font-family: 'Orbitron', monospace;
    background: transparent;
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .session-panel {
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: rgba(6, 182, 212, 0.06);
    border: 2px solid rgba(6, 182, 212, 0.25);
    border-radius: 1rem;
    padding: 1.25rem;
    backdrop-filter: blur(14px);
    box-shadow: inset 0 0 20px rgba(6, 182, 212, 0.08);
  }

  .session-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .session-panel-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #38bdf8;
    text-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
  }

  .new-chat-wrapper {
    position: relative;
  }

  .new-chat-btn {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
    border: 2px solid rgba(168, 85, 247, 0.3);
    padding: 0.35rem 0.75rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: 'Orbitron', monospace;
    transition: all 0.3s ease;
  }

  .new-chat-btn:hover {
    background: rgba(168, 85, 247, 0.35);
    box-shadow: 0 0 18px rgba(168, 85, 247, 0.35);
  }

  .new-chat-menu {
    position: absolute;
    top: 110%;
    right: 0;
    display: flex;
    flex-direction: column;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(34, 211, 238, 0.4);
    border-radius: 0.75rem;
    box-shadow: 0 18px 40px rgba(8, 47, 73, 0.45);
    overflow: hidden;
    z-index: 10;
    min-width: 160px;
  }

  .new-chat-menu button {
    background: transparent;
    color: #e2e8f0;
    border: none;
    padding: 0.6rem 1rem;
    text-align: left;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s ease;
  }

  .new-chat-menu button:hover {
    background: rgba(34, 211, 238, 0.12);
  }

  .session-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }

  .session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid transparent;
    background: rgba(15, 23, 42, 0.6);
    color: #e2e8f0;
    cursor: pointer;
    text-align: left;
    transition: all 0.3s ease;
  }

  .session-item:hover,
  .session-item.active {
    border-color: rgba(34, 211, 238, 0.4);
    background: rgba(30, 41, 59, 0.85);
    box-shadow: 0 0 18px rgba(34, 211, 238, 0.15);
  }

  .session-item-title {
    font-size: 0.85rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .session-mode-tag {
    font-size: 0.7rem;
    padding: 0.1rem 0.6rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid rgba(34, 211, 238, 0.4);
    color: #38bdf8;
    background: rgba(34, 211, 238, 0.12);
  }

  .session-mode-tag[data-mode='chat'] {
    color: #fcd34d;
    border-color: rgba(250, 204, 21, 0.4);
    background: rgba(250, 204, 21, 0.12);
  }

  .empty-sessions {
    margin: 0;
    font-size: 0.8rem;
    color: rgba(148, 163, 184, 0.8);
    text-align: center;
  }

  .chat-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(6, 182, 212, 0.05);
    border: 2px solid rgba(6, 182, 212, 0.3);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    position: relative;
    overflow: hidden;
  }

  .chat-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #06b6d4, transparent);
    animation: scan-line 3s linear infinite;
  }

  .chat-header h2 {
    margin: 0;
    color: #06b6d4;
    font-size: 1.5rem;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-shadow: 0 0 10px #06b6d4;
    animation: pulse-glow 2s ease-in-out infinite;
    position: relative;
    z-index: 2;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mode-chip {
    font-size: 0.75rem;
    padding: 0.2rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(34, 211, 238, 0.4);
    background: rgba(34, 211, 238, 0.15);
    color: #38bdf8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .mode-chip[data-mode='chat'] {
    color: #facc15;
    border-color: rgba(250, 204, 21, 0.4);
    background: rgba(250, 204, 21, 0.15);
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    z-index: 2;
  }

  .provider-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(34, 211, 238, 0.3);
    border-radius: 0.5rem;
  }

  .status-indicator {
    font-size: 0.75rem;
  }

  .status-indicator.active {
    color: #22c55e;
    text-shadow: 0 0 5px #22c55e;
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  .status-indicator.inactive {
    color: #ef4444;
    text-shadow: 0 0 5px #ef4444;
  }

  .status-text {
    color: #cbd5e1;
    font-weight: 500;
    font-family: 'Share Tech Mono', monospace;
  }

  .clear-btn {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
    border: 2px solid rgba(168, 85, 247, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-family: 'Orbitron', monospace;
    font-weight: 600;
    text-shadow: 0 0 5px #a855f7;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .clear-btn:hover {
    background: rgba(168, 85, 247, 0.3);
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
    text-shadow: 0 0 10px #a855f7;
  }

  .clear-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.2), transparent);
    transition: transform 0.5s ease;
  }

  .clear-btn:hover::before {
    transform: translateX(200%);
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(2, 6, 23, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }

  .settings-modal {
    background: rgba(15, 23, 42, 0.95);
    border: 2px solid rgba(34, 211, 238, 0.3);
    border-radius: 1rem;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    backdrop-filter: blur(20px);
    box-shadow:
      0 0 30px rgba(34, 211, 238, 0.2),
      inset 0 0 20px rgba(34, 211, 238, 0.05);
    position: relative;
    animation: slideUp 0.3s ease-out;
  }

  .settings-modal::before {
    content: '';
    position: absolute;
    top: 0;
    right: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #22d3ee, transparent);
    animation: scan-line 4s linear infinite reverse;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(34, 211, 238, 0.3);
    position: relative;
    z-index: 2;
  }

  .modal-header h2 {
    margin: 0;
    color: #22d3ee;
    font-size: 1.25rem;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-shadow: 0 0 10px #22d3ee;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .close-btn {
    background: transparent;
    color: #22d3ee;
    border: 2px solid rgba(34, 211, 238, 0.3);
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1rem;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-shadow: 0 0 5px #22d3ee;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: rgba(34, 211, 238, 0.1);
    box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
    text-shadow: 0 0 10px #22d3ee;
  }

  .modal-content {
    padding: 1.5rem;
    position: relative;
    z-index: 2;
  }

  .setting-group {
    margin-bottom: 1rem;
    position: relative;
    z-index: 2;
  }

  .setting-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #cbd5e1;
    font-family: 'Share Tech Mono', monospace;
    text-shadow: 0 0 3px #cbd5e1;
  }

  .setting-group select, .api-key-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid rgba(6, 182, 212, 0.3);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: rgba(2, 6, 23, 0.8);
    color: #e2e8f0;
    font-family: 'Share Tech Mono', monospace;
    transition: all 0.3s ease;
  }

  .setting-group select:focus, .api-key-input:focus {
    outline: none;
    border-color: #06b6d4;
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), inset 0 0 10px rgba(6, 182, 212, 0.1);
    text-shadow: 0 0 5px #06b6d4;
  }

  .setting-info {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .setting-info a {
    color: #2563eb;
    text-decoration: underline;
  }

  .modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid rgba(34, 211, 238, 0.3);
    position: relative;
    z-index: 2;
  }

  .save-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .save-btn:hover:not(:disabled) {
    background: #059669;
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-btn {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .cancel-btn:hover {
    background: #4b5563;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(2, 6, 23, 0.9);
    border: 2px solid rgba(6, 182, 212, 0.2);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    box-shadow: inset 0 0 20px rgba(6, 182, 212, 0.05);
    position: relative;
    min-height: 200px;
  }

  .usage-card {
    background: rgba(15, 23, 42, 0.85);
    border: 2px solid rgba(34, 211, 238, 0.3);
    border-radius: 0.75rem;
    padding: 0.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.15);
  }

  .usage-header {
    width: 100%;
    background: transparent;
    border: none;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-family: 'Share Tech Mono', monospace;
    text-align: left;
  }

  .usage-header:focus {
    outline: 2px solid rgba(34, 211, 238, 0.6);
    outline-offset: 2px;
  }

  .usage-chevron {
    margin-right: 0.75rem;
    transition: transform 0.2s ease;
    display: inline-block;
  }

  .usage-chevron.expanded {
    transform: rotate(90deg);
  }

  .usage-title {
    flex: 1;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .usage-cost {
    font-weight: 600;
    color: #38bdf8;
  }

  .usage-details {
    border-top: 1px solid rgba(34, 211, 238, 0.3);
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    display: grid;
    gap: 0.5rem;
  }

  .usage-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #cbd5e1;
  }

  .usage-row .value {
    font-family: 'Share Tech Mono', monospace;
    color: #22d3ee;
  }

  .messages-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      linear-gradient(rgba(6, 182, 212, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6, 182, 212, 0.02) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
    opacity: 0.5;
  }

  .empty-state {
    text-align: center;
    color: #94a3b8;
    padding: 2rem;
    font-family: 'Share Tech Mono', monospace;
  }

  .message {
    margin-bottom: 1rem;
    max-width: 80%;
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    line-height: 1.5;
    font-family: 'Share Tech Mono', monospace;
    position: relative;
    z-index: 2;
    backdrop-filter: blur(5px);
  }

  .message.user {
    background: rgba(34, 211, 238, 0.1);
    border: 2px solid rgba(34, 211, 238, 0.3);
    margin-left: auto;
    text-align: right;
    color: #e2e8f0;
    box-shadow: 0 0 10px rgba(34, 211, 238, 0.2);
  }

  .message.assistant {
    background: rgba(168, 85, 247, 0.1);
    border: 2px solid rgba(168, 85, 247, 0.3);
    margin-right: auto;
    color: #e2e8f0;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.2);
  }

  .message.loading {
    opacity: 0.7;
  }

  .message-content {
    margin-bottom: 0.25rem;
  }

  .message-time {
    font-size: 0.75rem;
    color: #64748b;
  }

  .image-message {
    width: 100%;
  }

  .image-gallery {
    display: grid;
    gap: 1rem;
    margin: 1rem 0;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .image-item {
    background: white;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .generated-image {
    width: 100%;
    height: auto;
    display: block;
    max-height: 300px;
    object-fit: cover;
  }

  .image-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #f9fafb;
  }

  .download-btn, .view-btn {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .download-btn:hover, .view-btn:hover {
    background: #1d4ed8;
  }

  .usage-info {
    padding: 0.5rem;
    background: #f3f4f6;
    border-top: 1px solid #e5e7eb;
    color: #6b7280;
    text-align: center;
  }

  .loading-dots {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes scan-line {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100vw); }
  }

  @keyframes pulse-glow {
    0%, 100% {
      text-shadow: 0 0 5px currentColor;
    }
    50% {
      text-shadow: 0 0 15px currentColor, 0 0 25px currentColor;
    }
  }

  @keyframes glow {
    0% {
      text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
    }
    100% {
      text-shadow: 0 0 15px currentColor, 0 0 25px currentColor, 0 0 35px currentColor;
    }
  }

  @keyframes neon-flicker {
    0%, 100% { opacity: 1; }
    2% { opacity: 0.8; }
    4% { opacity: 1; }
    8% { opacity: 0.8; }
    10% { opacity: 1; }
    15% { opacity: 0.9; }
    20% { opacity: 1; }
  }

  /* Info Card Styles */
  .info-card-container {
    margin-bottom: 1rem;
    background: rgba(15, 23, 42, 0.95);
    border: 2px solid rgba(168, 85, 247, 0.3);
    border-radius: 0.75rem;
    backdrop-filter: blur(15px);
    box-shadow:
      0 0 20px rgba(168, 85, 247, 0.1),
      inset 0 0 20px rgba(168, 85, 247, 0.05);
    position: relative;
    overflow: hidden;
  }

  .info-card-container::before {
    content: '';
    position: absolute;
    top: 0;
    right: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #a855f7, transparent);
    animation: scan-line 4s linear infinite reverse;
  }

  .info-card-header {
    width: 100%;
    background: transparent;
    border: none;
    padding: 1rem 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    z-index: 2;
  }

  .info-card-header:hover {
    background: rgba(168, 85, 247, 0.1);
  }

  .info-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-header-content h3 {
    margin: 0;
    color: #a855f7;
    font-size: 1.125rem;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-shadow: 0 0 10px #a855f7;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .expand-icon {
    color: #06b6d4;
    font-size: 1rem;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-shadow: 0 0 5px #06b6d4;
    transition: all 0.3s ease;
    transform-origin: center;
  }

  .expand-icon.expanded {
    transform: rotate(0deg);
    color: #22d3ee;
    text-shadow: 0 0 10px #22d3ee;
  }

  .info-card-content {
    padding: 0 1.5rem 1.5rem 1.5rem;
    position: relative;
    z-index: 2;
    animation: slideDown 0.3s ease-out;
  }

  .info-card-content p {
    margin: 0 0 1rem 0;
    line-height: 1.6;
    color: #cbd5e1;
    font-family: 'Share Tech Mono', monospace;
  }

  .info-card-content h4 {
    margin: 1.5rem 0 0.75rem 0;
    color: #06b6d4;
    font-size: 1rem;
    font-family: 'Orbitron', monospace;
    font-weight: 600;
    text-shadow: 0 0 5px #06b6d4;
  }

  .info-card-content ul, .info-card-content ol {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }

  .info-card-content li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
    color: #cbd5e1;
    font-family: 'Share Tech Mono', monospace;
  }

  .info-card-content li::marker {
    color: #22d3ee;
  }

  .session-info {
    margin: 1.5rem 0 0 0;
    padding: 1rem;
    background: rgba(2, 6, 23, 0.8);
    border: 1px solid rgba(34, 211, 238, 0.3);
    border-radius: 0.5rem;
    box-shadow: inset 0 0 10px rgba(34, 211, 238, 0.1);
  }

  .session-info h4 {
    margin: 0 0 0.75rem 0;
    color: #22d3ee;
    text-shadow: 0 0 5px #22d3ee;
  }

  .session-info code {
    background: rgba(2, 6, 23, 0.9);
    border: 1px solid rgba(34, 211, 238, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.875rem;
    color: #22d3ee;
    text-shadow: 0 0 3px #22d3ee;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .input-container {
    display: flex;
    gap: 0.75rem;
    position: relative;
    z-index: 2;
  }

  .message-input {
    flex: 1;
    background: rgba(2, 6, 23, 0.9);
    border: 2px solid rgba(6, 182, 212, 0.3);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: 'Share Tech Mono', monospace;
    color: #e2e8f0;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .message-input:focus {
    outline: none;
    border-color: #06b6d4;
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), inset 0 0 10px rgba(6, 182, 212, 0.1);
    text-shadow: 0 0 5px #06b6d4;
  }

  .message-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .message-input::placeholder {
    color: rgba(203, 213, 225, 0.6);
  }

  .send-btn {
    background: rgba(22, 163, 74, 0.2);
    color: #22c55e;
    border: 2px solid rgba(22, 163, 74, 0.3);
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    font-family: 'Orbitron', monospace;
    min-width: 100px;
    transition: all 0.3s ease;
    text-shadow: 0 0 5px #22c55e;
    position: relative;
    overflow: hidden;
  }

  .send-btn:hover:not(:disabled) {
    background: rgba(22, 163, 74, 0.3);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
    text-shadow: 0 0 10px #22c55e;
  }

  .send-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.2), transparent);
    transition: transform 0.5s ease;
  }

  .send-btn:hover::before {
    transform: translateX(200%);
  }

  .send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .chatbot-container {
      padding: 1rem;
      flex-direction: column;
      gap: 1rem;
    }

    .session-panel {
      width: 100%;
      flex-direction: column;
    }

    .header-controls {
      flex-direction: column;
      gap: 0.5rem;
      align-items: stretch;
    }

    .new-chat-menu {
      left: 0;
      right: auto;
    }

    .message {
      max-width: 90%;
    }

    .image-gallery {
      grid-template-columns: 1fr;
    }

    .input-container {
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-card-header {
      padding: 0.75rem 1rem;
    }

    .info-card-content {
      padding: 0 1rem 1rem 1rem;
    }

    .info-header-content h3 {
      font-size: 1rem;
    }

    .settings-modal {
      width: 95%;
      max-height: 90vh;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-header h2 {
      font-size: 1.1rem;
    }

    .modal-content {
      padding: 1rem;
    }

    .modal-footer {
      padding: 1rem;
      flex-direction: column;
      gap: 0.5rem;
    }

    .close-btn {
      width: 2rem;
      height: 2rem;
      font-size: 0.9rem;
    }
  }
</style>
