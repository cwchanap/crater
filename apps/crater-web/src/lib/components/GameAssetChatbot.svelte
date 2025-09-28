<!-- Game Asset Chatbot composed from modular subcomponents -->
<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { browser } from '$app/environment'
    import { ChatBotService, S3Service, type BaseImageModelProvider } from '@crater/core'
    import { showSuccess, showError } from '$lib/stores/toast'
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
    import SessionPanel from './game-asset-chatbot/SessionPanel.svelte'
    import ChatHeader from './game-asset-chatbot/ChatHeader.svelte'
    import InfoCard from './game-asset-chatbot/InfoCard.svelte'
    import UsageSummaryCard from './game-asset-chatbot/UsageSummaryCard.svelte'
    import MessageList from './game-asset-chatbot/MessageList.svelte'
    import ChatInput from './game-asset-chatbot/ChatInput.svelte'
    import SettingsModal from './game-asset-chatbot/SettingsModal.svelte'
    import {
        computeUsageSummary,
        createAssistantTextMessage,
        createChatModeImageWarning,
        createErrorMessage,
        createImageProviderWarning,
        createMissingApiKeyMessage,
        getPlaceholderText,
        getProviderStatus,
        wantsImage,
        type ProviderStatus,
        type UsageSummary,
    } from './game-asset-chatbot/helpers'

    export let sessionId = ''
    export let currentTime = ''
    export let showSettings = false

    const chatbotService = new ChatBotService({
        systemPrompt:
            'You are a helpful game asset assistant for creating creative game content.',
        thinkingTime: 500,
    })

    const initialSession = createSession({ mode: 'image' })
    let sessions: ChatSession[] = [initialSession]
    let activeSessionId: string = initialSession.id
    let activeSession: ChatSession | null = initialSession
    let activeMode: SessionMode = initialSession.mode

    let currentMessage = ''
    let isLoading = false
    let infoCardExpanded = false
    let newChatMenuOpen = false
    let usageCollapsed = true

    let aiProvider: ProviderKind = 'gemini'
    let previousProvider: ProviderKind = 'gemini'
    let apiKey = ''
    let imageModel = ''
    let chatModel = ''
    let imageSize = '1024x1024'
    let imageQuality: 'standard' | 'hd' = 'standard'

    // S3 configuration
    let s3Enabled = false
    let s3BucketName = ''
    let s3Region = 'us-east-1'
    let s3AccessKeyId = ''
    let s3SecretAccessKey = ''

    let imageProvider: BaseImageModelProvider | null = null
    let chatProvider: BaseImageModelProvider | null = null
    let isImageConfigured = false
    let isChatConfigured = false

    let isConfiguredForActiveMode = false
    let placeholderText = getPlaceholderText(activeSession, isChatConfigured, isImageConfigured)
    let providerStatus: ProviderStatus = getProviderStatus(
        isConfiguredForActiveMode,
        aiProvider,
        apiKey
    )
    let usageSummary: UsageSummary = computeUsageSummary(initialSession)

    $: activeSession = sessions.find((session) => session.id === activeSessionId) ?? null
    $: activeMode = activeSession?.mode ?? 'image'
    $: isConfiguredForActiveMode =
        activeMode === 'chat' ? isChatConfigured : isImageConfigured
    $: placeholderText = getPlaceholderText(
        activeSession,
        isChatConfigured,
        isImageConfigured
    )
    $: providerStatus = getProviderStatus(
        isConfiguredForActiveMode,
        aiProvider,
        apiKey
    )
    $: imageModel = normalizeModel(aiProvider, 'image', imageModel)
    $: chatModel = normalizeModel(aiProvider, 'chat', chatModel)
    $: usageSummary = computeUsageSummary(activeSession)

    onMount(() => {
        loadSettings()
        if (browser) {
            window.addEventListener('keydown', handleGlobalKeydown)
            window.addEventListener('click', handleWindowClick)
        }
    })

    onDestroy(() => {
        if (browser) {
            window.removeEventListener('keydown', handleGlobalKeydown)
            window.removeEventListener('click', handleWindowClick)
        }
    })

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
        sessionIdToUpdate: string,
        updater: (session: ChatSession) => ChatSession
    ): void {
        sessions = sessions.map((session) =>
            session.id === sessionIdToUpdate ? updater(session) : session
        )
    }

    function appendMessage(sessionIdToUpdate: string, message: EnhancedMessage): void {
        updateSession(sessionIdToUpdate, (session) => ({
            ...session,
            messages: [...session.messages, message],
        }))
    }

    function updateTitleWithMessage(sessionIdToUpdate: string, text: string): void {
        updateSession(sessionIdToUpdate, (session) => {
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
        sessionIdToUpdate: string,
        prompt: string
    ): Promise<void> {
        if (!isChatConfigured) {
            appendMessage(sessionIdToUpdate, createMissingApiKeyMessage('chat'))
            return
        }

        if (wantsImage(prompt)) {
            appendMessage(sessionIdToUpdate, createChatModeImageWarning())
            return
        }

        applyProviderForMode('chat')
        const response = await chatbotService.generateResponse(prompt)
        appendMessage(sessionIdToUpdate, createAssistantTextMessage(response))
    }

    async function handleImageSessionMessage(
        sessionIdToUpdate: string,
        prompt: string
    ): Promise<void> {
        if (!isImageConfigured) {
            appendMessage(sessionIdToUpdate, createImageProviderWarning())
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

        appendMessage(sessionIdToUpdate, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

        const { id: sessionIdToUpdate, mode } = activeSession
        const userMessage: EnhancedMessage = {
            id: Date.now().toString(),
            text: trimmed,
            sender: 'user',
            timestamp: new Date(),
            messageType: 'text',
        }

        currentMessage = ''
        appendMessage(sessionIdToUpdate, userMessage)
        updateTitleWithMessage(sessionIdToUpdate, trimmed)
        isLoading = true

        try {
            if (mode === 'image') {
                await handleImageSessionMessage(sessionIdToUpdate, trimmed)
            } else {
                await handleChatSessionMessage(sessionIdToUpdate, trimmed)
            }
        } catch (error) {
            appendMessage(sessionIdToUpdate, createErrorMessage(error))
        } finally {
            isLoading = false
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

    async function saveImageToS3(imageUrl: string, prompt: string): Promise<void> {
        if (!browser || !s3Enabled || !s3BucketName || !s3AccessKeyId || !s3SecretAccessKey) {
            throw new Error('S3 configuration is incomplete')
        }

        try {
            const s3Service = new S3Service({
                bucketName: s3BucketName,
                region: s3Region,
                accessKeyId: s3AccessKeyId,
                secretAccessKey: s3SecretAccessKey,
            })

            // Generate a unique filename
            const filename = S3Service.generateImageFilename(prompt)

            // Upload to S3
            const s3Url = await s3Service.uploadImageFromUrl(imageUrl, filename, {
                prompt,
                generator: 'crater-web',
            })

            // Show success message
            showSuccess(`Image saved to S3 successfully! File: ${filename}`)
            return s3Url
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            showError(`Failed to save image to S3: ${errorMessage}`)
            throw error
        }
    }

    function viewImage(imageUrl: string): void {
        if (browser) {
            window.open(imageUrl, '_blank')
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

    function handleWindowClick(event: MouseEvent): void {
        if (!newChatMenuOpen) {
            return
        }

        const target = event.target as HTMLElement
        if (!target.closest('.new-chat-wrapper')) {
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
            s3Enabled = settings.s3Enabled ?? false
            s3BucketName = settings.s3BucketName ?? ''
            s3Region = settings.s3Region ?? 'us-east-1'
            s3AccessKeyId = settings.s3AccessKeyId ?? ''
            s3SecretAccessKey = settings.s3SecretAccessKey ?? ''
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
                s3Enabled,
                s3BucketName,
                s3Region,
                s3AccessKeyId,
                s3SecretAccessKey,
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
</script>

<div class="chatbot-container">
    <SessionPanel
        {sessions}
        {activeSessionId}
        {newChatMenuOpen}
        onCreateSession={createNewSession}
        onSelectSession={setActiveSession}
        onToggleNewChatMenu={toggleNewChatMenu}
    />

    <div class="chat-body">
        <ChatHeader
            {activeSession}
            {providerStatus}
            onClearSession={clearChat}
        >
            <div class="header-actions" slot="actions">
                <button class="settings-btn" on:click={() => (showSettings = true)}>
                    Settings
                </button>
                <button on:click={clearChat} class="clear-btn">Clear Session</button>
            </div>
        </ChatHeader>

        <InfoCard
            expanded={infoCardExpanded}
            {sessionId}
            {currentTime}
            onToggle={() => (infoCardExpanded = !infoCardExpanded)}
        />

        {#if activeSession?.mode === 'image'}
            <UsageSummaryCard
                summary={usageSummary}
                collapsed={usageCollapsed}
                onToggle={toggleUsageSummary}
            />
        {/if}

        <MessageList
            messages={activeSession?.messages ?? []}
            {isLoading}
            activeMode={activeMode}
            onDownloadImage={downloadImage}
            onViewImage={viewImage}
            onSaveToS3={saveImageToS3}
            {s3Enabled}
        />

        <ChatInput
            bind:value={currentMessage}
            {placeholderText}
            {isLoading}
            maxLength={500}
            on:submit={sendMessage}
        />
    </div>
</div>

{#if showSettings}
    <SettingsModal
        bind:aiProvider={aiProvider}
        bind:apiKey={apiKey}
        bind:imageModel={imageModel}
        bind:chatModel={chatModel}
        bind:imageSize={imageSize}
        bind:imageQuality={imageQuality}
        bind:s3Enabled={s3Enabled}
        bind:s3BucketName={s3BucketName}
        bind:s3Region={s3Region}
        bind:s3AccessKeyId={s3AccessKeyId}
        bind:s3SecretAccessKey={s3SecretAccessKey}
        onProviderChange={handleProviderChange}
        on:save={saveSettings}
        on:close={() => (showSettings = false)}
    />
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

    .chat-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .settings-btn {
        background: rgba(34, 211, 238, 0.2);
        color: #38bdf8;
        border: 2px solid rgba(34, 211, 238, 0.3);
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        transition: all 0.3s ease;
    }

    .settings-btn:hover {
        background: rgba(34, 211, 238, 0.3);
        box-shadow: 0 0 20px rgba(34, 211, 238, 0.35);
    }
</style>
