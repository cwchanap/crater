<!-- Enhanced Game Asset Chatbot with AI provider integration for web -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    ChatBotService,
    WebChatBotService,
    GeminiImageProvider,
    OpenAIImageProvider,
    type ChatMessage,
    type BaseImageModelProvider
  } from '@crater/core'

  // Enhanced chatbot service with AI provider support
  const chatService = new WebChatBotService({
    systemPrompt: 'You are a helpful game asset assistant for web-based game development.',
    thinkingTime: 500,
  })

  // Core service for advanced features
  let coreService: ChatBotService | null = null

  // Component state
  let messages: ChatMessage[] = []
  let currentMessage = ''
  let isLoading = false
  let unsubscribe: (() => void) | null = null

  // AI provider configuration
  let showSettings = false
  let aiProvider: 'gemini' | 'openai' | 'none' = 'none'
  let apiKey = ''
  let currentProvider: BaseImageModelProvider | null = null
  let isConfigured = false

  // Message types for enhanced display
  interface EnhancedMessage extends ChatMessage {
    messageType?: 'text' | 'image'
    imageData?: {
      images: string[]
      prompt: string
      usage?: {
        inputTextTokens: number
        outputImageTokens: number
        totalTokens: number
      }
      cost?: {
        totalCost: number
        currency: string
      }
    }
  }

  let enhancedMessages: EnhancedMessage[] = []

  onMount(() => {
    // Initialize core service
    coreService = new ChatBotService({
      systemPrompt: 'You are a helpful game asset assistant for creating creative game content.',
      thinkingTime: 500,
    })

    // Subscribe to message updates
    unsubscribe = chatService.subscribe((newMessages) => {
      messages = newMessages
      enhancedMessages = newMessages.map(msg => ({ ...msg, messageType: 'text' as const }))
    })

    // Load initial messages
    messages = chatService.getMessages()
    enhancedMessages = messages.map(msg => ({ ...msg, messageType: 'text' as const }))

    // Try to load saved settings from localStorage
    loadSettings()
  })

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  function loadSettings() {
    try {
      const saved = localStorage.getItem('crater-web-ai-settings')
      if (saved) {
        const settings = JSON.parse(saved)
        aiProvider = settings.aiProvider || 'none'
        apiKey = settings.apiKey || ''
        updateAIProvider()
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  function saveSettings() {
    try {
      const settings = { aiProvider, apiKey }
      localStorage.setItem('crater-web-ai-settings', JSON.stringify(settings))
      updateAIProvider()
      showSettings = false
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  function updateAIProvider() {
    if (!coreService) return

    currentProvider = null
    isConfigured = false

    if (aiProvider === 'gemini' && apiKey.startsWith('AIza')) {
      currentProvider = new GeminiImageProvider({ apiKey })
      isConfigured = true
    } else if (aiProvider === 'openai' && apiKey.startsWith('sk-')) {
      currentProvider = new OpenAIImageProvider({ apiKey })
      isConfigured = true
    }

    if (currentProvider) {
      coreService.setAIProvider(currentProvider)
    }
  }

  async function sendMessage() {
    if (!currentMessage.trim() || isLoading) return

    const messageToSend = currentMessage
    currentMessage = ''
    isLoading = true

    try {
      if (isConfigured && coreService && (messageToSend.toLowerCase().includes('generate') || messageToSend.toLowerCase().includes('create') || messageToSend.toLowerCase().includes('image'))) {
        // Use AI provider for image generation
        await generateImage(messageToSend)
      } else {
        // Use regular text chat
        await chatService.sendMessage(messageToSend)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message to chat
      const errorMsg: EnhancedMessage = {
        id: Date.now().toString(),
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'assistant',
        timestamp: new Date(),
        messageType: 'text'
      }
      enhancedMessages = [...enhancedMessages, errorMsg]
    } finally {
      isLoading = false
    }
  }

  async function generateImage(prompt: string) {
    if (!coreService || !currentProvider) {
      throw new Error('AI provider not configured')
    }

    // Add user message
    const userMsg: EnhancedMessage = {
      id: Date.now().toString(),
      text: prompt,
      sender: 'user',
      timestamp: new Date(),
      messageType: 'text'
    }
    enhancedMessages = [...enhancedMessages, userMsg]

    try {
      // Generate image
      const response = await coreService.generateImage(prompt, {
        size: '1024x1024',
        quality: 'standard',
        n: 1
      })

      // Process image data
      const imageUrls: string[] = []
      for (const img of response.images) {
        if (img.url) {
          imageUrls.push(img.url)
        } else if (img.base64) {
          const dataUrl = img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`
          imageUrls.push(dataUrl)
        }
      }

      if (imageUrls.length > 0) {
        // Add assistant message with image
        const assistantMsg: EnhancedMessage = {
          id: (Date.now() + 1).toString(),
          text: `Generated ${imageUrls.length} image(s) for: "${prompt}"`,
          sender: 'assistant',
          timestamp: new Date(),
          messageType: 'image',
          imageData: {
            images: imageUrls,
            prompt: prompt,
            usage: response.metadata?.usage as any,
            cost: response.metadata?.cost as any
          }
        }
        enhancedMessages = [...enhancedMessages, assistantMsg]
      } else {
        throw new Error('No images generated')
      }
    } catch (error) {
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  function clearChat() {
    chatService.clearMessages()
    enhancedMessages = []
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  function downloadImage(imageUrl: string, prompt: string) {
    try {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `game-asset-${prompt.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }
</script>

<div class="chatbot-container">
  <div class="chat-header">
    <h2>🎮 Game Asset Assistant</h2>
    <div class="header-controls">
      <div class="provider-status">
        {#if isConfigured}
          <span class="status-indicator active">●</span>
          <span class="status-text">{aiProvider.toUpperCase()} Ready</span>
        {:else}
          <span class="status-indicator inactive">●</span>
          <span class="status-text">No AI Provider</span>
        {/if}
      </div>
      <button on:click={() => showSettings = !showSettings} class="settings-btn">
        ⚙️ Settings
      </button>
      <button on:click={clearChat} class="clear-btn">Clear Chat</button>
    </div>
  </div>

  {#if showSettings}
    <div class="settings-panel">
      <h3>AI Provider Configuration</h3>
      <div class="setting-group">
        <label for="provider-select">AI Provider:</label>
        <select id="provider-select" bind:value={aiProvider}>
          <option value="none">None (Text Only)</option>
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      {#if aiProvider !== 'none'}
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
      {/if}

      <div class="setting-actions">
        <button on:click={saveSettings} class="save-btn" disabled={aiProvider !== 'none' && !apiKey}>
          Save Settings
        </button>
        <button on:click={() => showSettings = false} class="cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <div class="messages-container">
    {#if enhancedMessages.length === 0}
      <div class="welcome-message">
        <span class="emoji">🎯</span>
        <p>Welcome to the Game Asset Assistant!</p>
        <p>I'm here to help you brainstorm and plan amazing game assets.</p>
        <p>Ask me about sprites, backgrounds, textures, UI elements, and more!</p>
        {#if isConfigured}
          <p class="ai-notice">✨ AI image generation is enabled! Try: "Create a fantasy forest background"</p>
        {:else}
          <p class="setup-notice">💡 Configure an AI provider in settings to enable image generation</p>
        {/if}
      </div>
    {:else}
      {#each enhancedMessages as message (message.id)}
        <div class="message {message.sender}">
          <div class="message-content">
            {#if message.messageType === 'image' && message.imageData}
              <div class="image-message">
                <p>{@html message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>
                <div class="image-gallery">
                  {#each message.imageData.images as imageUrl}
                    <div class="image-item">
                      <img src={imageUrl} alt={message.imageData.prompt} class="generated-image" />
                      <div class="image-actions">
                        <button on:click={() => downloadImage(imageUrl, message.imageData?.prompt || 'image')}
                                class="download-btn" title="Download Image">
                          💾 Download
                        </button>
                        <button on:click={() => window.open(imageUrl, '_blank')}
                                class="view-btn" title="View Full Size">
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
              {@html message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
            {/if}
          </div>
          <div class="message-time">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      {/each}
    {/if}

    {#if isLoading}
      <div class="message assistant loading">
        <div class="message-content">
          <span class="loading-dots">
            {isConfigured && currentMessage.toLowerCase().includes('generate') ? 'Generating image...' : 'Thinking...'}
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
      placeholder={isConfigured
        ? "Ask me about game assets or try 'Generate a pixel art warrior sprite'"
        : "Ask me about game assets... (e.g., 'I need a forest background')"}
      disabled={isLoading}
      class="message-input"
      maxlength="500"
    />
    <button on:click={sendMessage} disabled={!currentMessage.trim() || isLoading} class="send-btn">
      {isLoading ? 'Sending...' : 'Send'}
    </button>
  </div>
</div>

<style>
  .chatbot-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
  }

  .chat-header h2 {
    margin: 0;
    color: #2563eb;
    font-size: 1.5rem;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .provider-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .status-indicator {
    font-size: 0.75rem;
  }

  .status-indicator.active {
    color: #10b981;
  }

  .status-indicator.inactive {
    color: #ef4444;
  }

  .status-text {
    color: #64748b;
    font-weight: 500;
  }

  .settings-btn, .clear-btn {
    background: #64748b;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .settings-btn:hover, .clear-btn:hover {
    background: #475569;
  }

  .settings-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .settings-panel h3 {
    margin: 0 0 1rem 0;
    color: #1f2937;
    font-size: 1.125rem;
  }

  .setting-group {
    margin-bottom: 1rem;
  }

  .setting-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .setting-group select, .api-key-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
  }

  .setting-group select:focus, .api-key-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 1px #2563eb;
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

  .setting-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
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
    background: #f8fafc;
    border-radius: 0.5rem;
    min-height: 400px;
  }

  .welcome-message {
    text-align: center;
    color: #64748b;
    padding: 2rem;
  }

  .welcome-message .emoji {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .ai-notice {
    color: #10b981 !important;
    font-weight: 500;
    margin-top: 1rem;
  }

  .setup-notice {
    color: #f59e0b !important;
    font-weight: 500;
    margin-top: 1rem;
  }

  .message {
    margin-bottom: 1rem;
    max-width: 80%;
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    line-height: 1.5;
  }

  .message.user {
    background: #dbeafe;
    border: 1px solid #93c5fd;
    margin-left: auto;
    text-align: right;
  }

  .message.assistant {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    margin-right: auto;
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

  .input-container {
    display: flex;
    gap: 0.75rem;
  }

  .message-input {
    flex: 1;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  .message-input:focus {
    outline: none;
    border-color: #2563eb;
  }

  .message-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    min-width: 100px;
    transition: background-color 0.2s;
  }

  .send-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .chatbot-container {
      padding: 0.5rem;
    }

    .header-controls {
      flex-direction: column;
      gap: 0.5rem;
      align-items: stretch;
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
  }
</style>
