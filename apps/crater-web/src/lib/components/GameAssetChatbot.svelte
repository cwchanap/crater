<!-- Example Svelte component showing how to use the ChatBotService in the web app -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { WebChatBotService, type ChatMessage } from '@crater/core'

  // Initialize the chatbot service
  const chatService = new WebChatBotService({
    systemPrompt: 'You are a helpful game asset assistant for web-based game development.',
    thinkingTime: 500,
  })

  let messages: ChatMessage[] = []
  let currentMessage = ''
  let isLoading = false
  let unsubscribe: (() => void) | null = null

  onMount(() => {
    // Subscribe to message updates
    unsubscribe = chatService.subscribe((newMessages) => {
      messages = newMessages
    })

    // Load initial messages
    messages = chatService.getMessages()
  })

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  async function sendMessage() {
    if (!currentMessage.trim() || isLoading) return

    const messageToSend = currentMessage
    currentMessage = ''
    isLoading = true

    try {
      await chatService.sendMessage(messageToSend)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      isLoading = false
    }
  }

  function clearChat() {
    chatService.clearMessages()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }
</script>

<div class="chatbot-container">
  <div class="chat-header">
    <h2>🎮 Game Asset Assistant</h2>
    <button on:click={clearChat} class="clear-btn">Clear Chat</button>
  </div>

  <div class="messages-container">
    {#if messages.length === 0}
      <div class="welcome-message">
        <span class="emoji">🎯</span>
        <p>Welcome to the Game Asset Assistant!</p>
        <p>I'm here to help you brainstorm and plan amazing game assets.</p>
        <p>Ask me about sprites, backgrounds, textures, UI elements, and more!</p>
      </div>
    {:else}
      {#each messages as message (message.id)}
        <div class="message {message.sender}">
          <div class="message-content">
            {@html message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
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
          <span class="loading-dots">Thinking...</span>
        </div>
      </div>
    {/if}
  </div>

  <div class="input-container">
    <input
      type="text"
      bind:value={currentMessage}
      on:keydown={handleKeyDown}
      placeholder="Ask me about game assets... (e.g., 'I need a forest background')"
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
    max-width: 800px;
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

  .clear-btn {
    background: #64748b;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .clear-btn:hover {
    background: #475569;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    min-height: 300px;
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

  .message {
    margin-bottom: 1rem;
    max-width: 70%;
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
    min-width: 80px;
  }

  .send-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
