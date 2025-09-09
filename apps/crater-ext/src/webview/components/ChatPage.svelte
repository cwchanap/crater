<script lang="ts">
  import { messages, isLoading, vscode, showChatHistoryModal, currentProvider } from '../stores'
  import type { ChatMessage } from '../types'
  import ImageContextMenu from './ImageContextMenu.svelte'
  import ConfirmDialog from './ConfirmDialog.svelte'
  
  let messageInput = ''
  let contextMenu = {
    show: false,
    x: 0,
    y: 0,
    messageIndex: -1,
    imageIndex: -1
  }
  let confirmDialog = {
    show: false,
    pendingDeleteImageIndex: -1,
    pendingDeleteMessageIndex: -1
  }

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

  function handleImageRightClick(event: MouseEvent, messageIndex: number, imageIndex: number) {
    event.preventDefault()
    contextMenu = {
      show: true,
      x: event.clientX,
      y: event.clientY,
      messageIndex,
      imageIndex
    }
  }

  function handleDeleteImage(imageIndex: number) {
    if (contextMenu.messageIndex === -1) return
    
    // Show confirmation dialog
    confirmDialog = {
      show: true,
      pendingDeleteImageIndex: imageIndex,
      pendingDeleteMessageIndex: contextMenu.messageIndex
    }
  }

  function confirmDeleteImage() {
    if (confirmDialog.pendingDeleteMessageIndex === -1 || confirmDialog.pendingDeleteImageIndex === -1) return
    
    messages.update(msgs => {
      const newMessages = [...msgs]
      const message = newMessages[confirmDialog.pendingDeleteMessageIndex]
      
      if (message.messageType === 'image' && message.imageData) {
        // Initialize imageStates if not present
        if (!message.imageData.imageStates) {
          message.imageData.imageStates = {
            deleted: new Array(message.imageData.images.length).fill(false),
            hidden: new Array(message.imageData.images.length).fill(false)
          }
        }
        
        // Mark image as deleted
        message.imageData.imageStates.deleted[confirmDialog.pendingDeleteImageIndex] = true
      }
      
      return newMessages
    })

    // Send update to extension to persist the change
    if ($vscode) {
      $vscode.postMessage({
        type: 'update-image-states',
        messageIndex: confirmDialog.pendingDeleteMessageIndex,
        imageStates: $messages[confirmDialog.pendingDeleteMessageIndex].imageData?.imageStates
      })
    }

    // Reset dialog state
    confirmDialog = {
      show: false,
      pendingDeleteImageIndex: -1,
      pendingDeleteMessageIndex: -1
    }
  }

  function cancelDeleteImage() {
    confirmDialog = {
      show: false,
      pendingDeleteImageIndex: -1,
      pendingDeleteMessageIndex: -1
    }
  }

  function handleToggleImageVisibility(imageIndex: number) {
    if (contextMenu.messageIndex === -1) return
    
    messages.update(msgs => {
      const newMessages = [...msgs]
      const message = newMessages[contextMenu.messageIndex]
      
      if (message.messageType === 'image' && message.imageData) {
        // Initialize imageStates if not present
        if (!message.imageData.imageStates) {
          message.imageData.imageStates = {
            deleted: new Array(message.imageData.images.length).fill(false),
            hidden: new Array(message.imageData.images.length).fill(false)
          }
        }
        
        // Toggle hidden state
        message.imageData.imageStates.hidden[imageIndex] = !message.imageData.imageStates.hidden[imageIndex]
      }
      
      return newMessages
    })

    // Send update to extension to persist the change
    if ($vscode && contextMenu.messageIndex >= 0) {
      $vscode.postMessage({
        type: 'update-image-states',
        messageIndex: contextMenu.messageIndex,
        imageStates: $messages[contextMenu.messageIndex].imageData?.imageStates
      })
    }
  }

  function closeContextMenu() {
    contextMenu.show = false
  }

  function handleShowHiddenImage(event: MouseEvent | KeyboardEvent, messageIndex: number, imageIndex: number) {
    // Only handle left clicks or Enter/Space keys
    if (event instanceof MouseEvent && event.button !== 0) return
    if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return
    
    messages.update(msgs => {
      const newMessages = [...msgs]
      const message = newMessages[messageIndex]
      
      if (message.messageType === 'image' && message.imageData && message.imageData.imageStates) {
        // Show the hidden image
        message.imageData.imageStates.hidden[imageIndex] = false
      }
      
      return newMessages
    })

    // Send update to extension to persist the change
    if ($vscode) {
      $vscode.postMessage({
        type: 'update-image-states',
        messageIndex: messageIndex,
        imageStates: $messages[messageIndex].imageData?.imageStates
      })
    }
  }
</script>

<div class="flex flex-col min-h-[300px]" style="height: calc(100vh - 200px);">
  <div class="flex-1 overflow-y-auto p-2 border rounded mb-3 card">
    {#if $messages.length === 0}
      <div class="text-center italic my-5" style="color: var(--vscode-descriptionForeground);">
        👋 Hi! I'm your game asset assistant. Ask me about characters, backgrounds, textures, UI elements, sounds, animations, and more!
      </div>
    {/if}
    
    {#each $messages as message, messageIndex}
      <div class="mb-3 p-2 rounded max-w-full break-words {message.sender === 'user' ? 'ml-5' : 'mr-5'}" 
           style="background-color: {message.sender === 'user' ? 'var(--vscode-button-background)' : 'var(--vscode-badge-background)'}; color: {message.sender === 'user' ? 'var(--vscode-button-foreground)' : 'var(--vscode-badge-foreground)'};">
        {#if message.messageType === 'image' && message.imageData && typeof message.imageData === 'object' && 'images' in message.imageData && Array.isArray(message.imageData.images)}
          {@const imageData = message.imageData}
          <div style="margin-bottom: 8px; font-style: italic;">
            Generated image for: "{imageData.prompt}"
          </div>
          {#each imageData.images as imageUrl, imageIndex}
            {@const isDeleted = imageData.imageStates?.deleted?.[imageIndex] || false}
            {@const isHidden = imageData.imageStates?.hidden?.[imageIndex] || false}
            
            {#if isDeleted}
              <div class="deleted-image-placeholder">
                🗑️ Image deleted
              </div>
            {:else if isHidden}
              <div 
                class="hidden-image-placeholder"
                role="button"
                tabindex="0"
                on:click={(e) => handleShowHiddenImage(e, messageIndex, imageIndex)}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleShowHiddenImage(e, messageIndex, imageIndex) }}
                on:contextmenu={(e) => handleImageRightClick(e, messageIndex, imageIndex)}
              >
                🙈 Image hidden (click to show)
              </div>
            {:else}
              <img 
                src={imageUrl.startsWith('data:') || imageUrl.startsWith('http') 
                  ? imageUrl 
                  : `data:image/png;base64,${imageUrl}`}
                alt="Generated game asset: {imageData.prompt}"
                class="generated-image"
                on:error={() => console.error('Failed to load image:', imageUrl)}
                on:contextmenu={(e) => handleImageRightClick(e, messageIndex, imageIndex)}
              />
            {/if}
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
        <div class="text-xs mt-1" style="color: var(--vscode-descriptionForeground);">
          {formatTime(message.timestamp)}
        </div>
      </div>
    {/each}
    
    {#if $isLoading}
      <div class="message assistant loading">
        🎨 Generating your game asset...
      </div>
    {/if}
  </div>

  <div class="flex gap-2 mb-3">
    <select 
      class="input-field text-xs min-w-24 px-2 py-1.5" 
      value={$currentProvider} 
      on:change={handleProviderChange}
    >
      <option value="gemini">🤖 Gemini</option>
      <option value="openai">🔮 OpenAI</option>
    </select>
    <button class="btn-primary text-xs px-2 py-1.5 flex items-center gap-1" on:click={newChat}>
      ✨ New Chat
    </button>
    <button class="btn-secondary text-xs px-2 py-1.5 flex items-center gap-1" on:click={showHistory}>
      📂 History
    </button>
  </div>

  <div class="flex gap-2">
    <input 
      type="text" 
      class="input-field flex-1" 
      placeholder="Ask about game assets..." 
      bind:value={messageInput}
      on:keypress={handleKeyPress}
    />
    <button class="btn-primary px-3 py-2" on:click={sendMessage}>Send</button>
  </div>
</div>

<ImageContextMenu
  show={contextMenu.show}
  x={contextMenu.x}
  y={contextMenu.y}
  imageIndex={contextMenu.imageIndex}
  isDeleted={contextMenu.messageIndex >= 0 && contextMenu.imageIndex >= 0 && $messages[contextMenu.messageIndex]?.imageData?.imageStates?.deleted?.[contextMenu.imageIndex] || false}
  isHidden={contextMenu.messageIndex >= 0 && contextMenu.imageIndex >= 0 && $messages[contextMenu.messageIndex]?.imageData?.imageStates?.hidden?.[contextMenu.imageIndex] || false}
  onDelete={handleDeleteImage}
  onToggleVisibility={handleToggleImageVisibility}
  onClose={closeContextMenu}
/>

<ConfirmDialog
  show={confirmDialog.show}
  title="Delete Image"
  message="Are you sure you want to delete this image? This will remove it from the chat and permanently delete the saved file from your directory. This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={confirmDeleteImage}
  onCancel={cancelDeleteImage}
/>

<style>

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

  .generated-image {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin-bottom: 4px;
    cursor: context-menu;
  }

  .deleted-image-placeholder,
  .hidden-image-placeholder {
    padding: 20px;
    margin-bottom: 4px;
    border: 2px dashed var(--vscode-widget-border);
    border-radius: 4px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    background-color: var(--vscode-input-background);
    user-select: none;
  }

  .hidden-image-placeholder {
    cursor: context-menu;
  }

  .hidden-image-placeholder:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
</style>