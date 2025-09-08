<script lang="ts">
  import { messages, isLoading, vscode, showChatHistoryModal, currentProvider } from '../stores'
  import type { ChatMessage } from '../types'
  
  let messageInput = ''

  function sendMessage() {
    if (!messageInput.trim() || !$vscode) return
    
    console.log('[Crater WebView] Sending message:', messageInput)
    
    // Add user message to store
    const userMessage: ChatMessage = {
      text: messageInput,
      sender: 'user',
      timestamp: new Date(),
      messageType: 'text'
    }
    messages.update(msgs => [...msgs, userMessage])
    
    // Send to extension
    $vscode.postMessage({
      type: 'send-message',
      message: messageInput
    })
    
    messageInput = ''
    isLoading.set(true)
  }

  function newChat() {
    if (!$vscode) return
    $vscode.postMessage({ type: 'new-chat' })
  }

  function showHistory() {
    showChatHistoryModal.set(true)
    if (!$vscode) return
    $vscode.postMessage({ type: 'get-chat-sessions' })
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      sendMessage()
    }
  }

  function formatTime(timestamp: Date | string): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    return date.toLocaleTimeString()
  }

  function handleProviderChange(event: Event) {
    const target = event.target as HTMLSelectElement
    const newProvider = target.value
    
    if (!$vscode) return
    
    currentProvider.set(newProvider)
    $vscode.postMessage({
      type: 'switch-provider',
      provider: newProvider
    })
  }
</script>

<div class="chat-container">
  <div class="messages">
    {#if $messages.length === 0}
      <div class="welcome-message">
        👋 Hi! I'm your game asset assistant. Ask me about characters, backgrounds, textures, UI elements, sounds, animations, and more!
      </div>
    {/if}
    
    {#each $messages as message}
      <div class="message {message.sender}">
        {#if message.messageType === 'image' && message.imageData && typeof message.imageData === 'object' && 'images' in message.imageData}
          {@const imageData = message.imageData}
          <div style="margin-bottom: 8px; font-style: italic;">
            Generated image for: "{imageData.prompt}"
          </div>
          {#each imageData.images as imageUrl}
            <img 
              src={imageUrl.startsWith('data:') || imageUrl.startsWith('http') 
                ? imageUrl 
                : `data:image/png;base64,${imageUrl}`}
              alt="Generated game asset: {imageData.prompt}"
              style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 4px;"
              on:error={() => console.error('Failed to load image:', imageUrl)}
            />
          {/each}
          
          {#if imageData.usage && imageData.cost}
            {@const usage = imageData.usage}
            {@const cost = imageData.cost}
            <div class="usage-info">
              <div class="usage-section">
                <strong>💰 Tokens & Cost</strong>
                <div class="usage-details">
                  <div>Input Tokens: {usage.inputTextTokens.toLocaleString()}</div>
                  <div>Output Tokens: {usage.outputImageTokens.toLocaleString()}</div>
                  <div>Total Tokens: {usage.totalTokens.toLocaleString()}</div>
                </div>
                <div class="cost-details">
                  <div>Token Cost: ${cost.breakdown.tokenBasedCost.toFixed(6)}</div>
                  <div>Per-Image Cost: ${cost.breakdown.qualityBasedCost.toFixed(6)}</div>
                  <div><strong>Total: ${cost.totalCost.toFixed(6)} {cost.currency}</strong></div>
                </div>
              </div>
            </div>
          {/if}
        {:else}
          <div>{message.text}</div>
        {/if}
        <div class="timestamp">{formatTime(message.timestamp)}</div>
      </div>
    {/each}
    
    {#if $isLoading}
      <div class="message assistant loading">
        🎨 Generating your game asset...
      </div>
    {/if}
  </div>

  <div class="controls">
    <select class="provider-dropdown" value={$currentProvider} on:change={handleProviderChange}>
      <option value="gemini">🤖 Gemini</option>
      <option value="openai">🔮 OpenAI</option>
    </select>
    <button class="new-chat-btn" on:click={newChat}>
      ✨ New Chat
    </button>
    <button class="chat-history-btn" on:click={showHistory}>
      📂 History
    </button>
  </div>

  <div class="input-container">
    <input 
      type="text" 
      class="message-input" 
      placeholder="Ask about game assets..." 
      bind:value={messageInput}
      on:keypress={handleKeyPress}
    />
    <button class="send-button" on:click={sendMessage}>Send</button>
  </div>
</div>

<style>
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

  .message.loading {
    font-style: italic;
    color: var(--vscode-descriptionForeground);
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

  .controls {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .provider-dropdown {
    padding: 6px 8px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    min-width: 100px;
  }

  .provider-dropdown:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
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

  .new-chat-btn {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }

  .new-chat-btn:hover {
    background-color: var(--vscode-button-hoverBackground);
  }

  .chat-history-btn:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
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

  .send-button {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  .send-button:hover {
    background-color: var(--vscode-button-hoverBackground);
  }

  .usage-info {
    margin-top: 12px;
    padding: 8px;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    background-color: var(--vscode-input-background);
    font-size: 11px;
  }

  .usage-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .usage-details, .cost-details {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-top: 4px;
    color: var(--vscode-descriptionForeground);
  }

  .cost-details {
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px solid var(--vscode-widget-border);
  }

  .cost-details div:last-child {
    grid-column: span 3;
    text-align: center;
    color: var(--vscode-foreground);
  }
</style>