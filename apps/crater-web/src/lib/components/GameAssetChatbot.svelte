<!-- Enhanced Game Asset Chatbot with AI provider integration for web -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
import { browser } from '$app/environment'
  import {
    ChatBotService,
    WebChatBotService,
    GeminiImageProvider,
    OpenAIImageProvider,
    type ChatMessage,
    type BaseImageModelProvider
  } from '@crater/core'

  // Props from parent component
  export let sessionId: string = ''
  export let currentTime: string = ''
  export let showSettings: boolean = false

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
  let aiProvider: 'gemini' | 'openai' | 'none' = 'none'
  let apiKey = ''
  let currentProvider: BaseImageModelProvider | null = null
  let isConfigured = false

  // Info card state
  let infoCardExpanded = false

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

    // Add global keyboard listener for ESC key only in browser
    if (browser) {
      window.addEventListener('keydown', handleKeydown)
    }
  })

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
    // Remove global keyboard listener only in browser
    if (browser) {
      window.removeEventListener('keydown', handleKeydown)
    }
  })

  function loadSettings() {
    if (!browser) return
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
    if (!browser) return
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
    if (!browser) return
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

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showSettings) {
      showSettings = false
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
      <button on:click={clearChat} class="clear-btn">Clear Chat</button>
    </div>
  </div>

  <!-- Collapsible Info Card -->
  <div class="info-card-container">
    <button
      class="info-card-header"
      on:click={() => infoCardExpanded = !infoCardExpanded}
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
                        <button on:click={() => browser && window.open(imageUrl, '_blank')}
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
      </div>

      <div class="modal-footer">
        <button on:click={saveSettings} class="save-btn" disabled={aiProvider !== 'none' && !apiKey}>
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
    flex-direction: column;
    height: 100%;
    width: 100%;
    padding: 2rem;
    font-family: 'Orbitron', monospace;
    background: transparent;
    position: relative;
    flex: 1;
    min-height: 0;
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
