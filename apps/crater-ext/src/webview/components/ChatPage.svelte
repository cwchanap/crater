<script lang="ts">
  import { messages, isLoading, vscode, showChatHistoryModal, currentProvider, currentView, totalUsage } from '../stores'
  import type { ChatMessage } from '../types'
  import ImageContextMenu from './ImageContextMenu.svelte'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import GalleryView from './GalleryView.svelte'
  
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

  // Debouncing for image state updates
  let updateTimeout: number | undefined
  let pendingUpdates = new Map<number, any>()

  function debouncedUpdateImageStates(messageIndex: number, imageStates: any) {
    // Store the pending update (this will overwrite previous state for same message)
    pendingUpdates.set(messageIndex, imageStates)

    // Clear existing timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }

    // Set new timeout for 100ms delay (much shorter, just to batch rapid changes)
    updateTimeout = setTimeout(() => {
      if (!$vscode) return

      // Send batched updates

      // Send all pending updates in batch
      for (const [msgIndex, states] of pendingUpdates) {
        $vscode.postMessage({
          type: 'update-image-states',
          messageIndex: msgIndex,
          imageStates: states
        })
      }

      // Clear pending updates
      pendingUpdates.clear()
      updateTimeout = undefined
    }, 100)
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

  function handleOpenImage(imageIndex: number) {
    if (contextMenu.messageIndex === -1 || !$vscode) return
    
    const message = $messages[contextMenu.messageIndex]
    if (message.messageType === 'image' && message.imageData?.savedPaths) {
      const savedPath = message.imageData.savedPaths[imageIndex]
      if (savedPath) {
        $vscode.postMessage({
          type: 'open-image',
          path: savedPath
        })
      }
    }
  }

  function handleOpenInImageEditor(imageIndex: number) {
    if (contextMenu.messageIndex === -1 || !$vscode) return
    
    const message = $messages[contextMenu.messageIndex]
    if (message.messageType === 'image' && message.imageData?.savedPaths) {
      const savedPath = message.imageData.savedPaths[imageIndex]
      if (savedPath) {
        $vscode.postMessage({
          type: 'open-in-image-editor',
          path: savedPath
        })
      }
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
      // Only update the specific message to avoid triggering full re-render
      const message = msgs[confirmDialog.pendingDeleteMessageIndex]

      if (message.messageType === 'image' && message.imageData) {
        // Initialize imageStates if not present
        if (!message.imageData.imageStates) {
          message.imageData.imageStates = {
            deleted: new Array(message.imageData.images.length).fill(false),
            hidden: new Array(message.imageData.images.length).fill(false)
          }
        }

        // Mark image as deleted (mutate in place for performance)
        message.imageData.imageStates.deleted[confirmDialog.pendingDeleteImageIndex] = true
      }

      // Return same array to minimize Svelte reactivity overhead
      return msgs
    })

    // Send update to extension to persist the change (immediate for deletions)
    if ($vscode) {
      const message = $messages[confirmDialog.pendingDeleteMessageIndex]
      if (message.messageType === 'image' && message.imageData?.imageStates) {
        debouncedUpdateImageStates(confirmDialog.pendingDeleteMessageIndex, message.imageData.imageStates)
      }
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

    const messageIndex = contextMenu.messageIndex

    messages.update(msgs => {
      // Only update the specific message to avoid triggering full re-render
      const message = msgs[messageIndex]

      if (message.messageType === 'image' && message.imageData) {
        // Initialize imageStates if not present
        if (!message.imageData.imageStates) {
          message.imageData.imageStates = {
            deleted: new Array(message.imageData.images.length).fill(false),
            hidden: new Array(message.imageData.images.length).fill(false)
          }
        }

        // Toggle hidden state directly (mutate in place for performance)
        message.imageData.imageStates.hidden[imageIndex] = !message.imageData.imageStates.hidden[imageIndex]
      }

      // Return same array to minimize Svelte reactivity overhead
      return msgs
    })

    // Use debounced update instead of immediate postMessage
    const message = $messages[messageIndex]
    if (message.messageType === 'image' && message.imageData?.imageStates) {
      debouncedUpdateImageStates(messageIndex, message.imageData.imageStates)
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
      // Only update the specific message to avoid triggering full re-render
      const message = msgs[messageIndex]

      if (message.messageType === 'image' && message.imageData && message.imageData.imageStates) {
        // Show the hidden image (mutate in place for performance)
        message.imageData.imageStates.hidden[imageIndex] = false
      }

      // Return same array to minimize Svelte reactivity overhead
      return msgs
    })

    // Use debounced update instead of immediate postMessage
    const message = $messages[messageIndex]
    if (message.messageType === 'image' && message.imageData?.imageStates) {
      debouncedUpdateImageStates(messageIndex, message.imageData.imageStates)
    }
  }

</script>

<div class="flex flex-col h-full">
  {#if $currentView === 'chat'}
    <div class="flex flex-col h-full border rounded card">
      <!-- Total Usage Header -->
      {#if $totalUsage.totalTokens > 0 || $totalUsage.totalCost > 0}
        <div class="px-3 py-2 bg-vscode-input border-b border-vscode-border text-xs text-vscode-foreground">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span>💰 <strong>Tokens:</strong> {$totalUsage.totalInputTokens.toLocaleString()} input | {$totalUsage.totalOutputTokens.toLocaleString()} output</span>
              <span><strong>Total: ${$totalUsage.totalCost.toFixed(6)} {$totalUsage.currency}</strong></span>
            </div>
          </div>
        </div>
      {/if}
      <!-- Messages area -->
      <div class="flex-1 overflow-y-auto p-2 min-h-0">
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
                <div class="p-5 mb-1 border-2 border-dashed border-vscode-border rounded text-center text-vscode-foreground italic bg-vscode-input select-none">
                  🗑️ Image deleted
                </div>
              {:else if isHidden}
                <div 
                  class="p-5 mb-1 border-2 border-dashed border-vscode-border rounded text-center text-vscode-foreground italic bg-vscode-input select-none cursor-context-menu hover:bg-vscode-background"
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
                  class="max-w-full h-auto rounded mb-1 cursor-context-menu"
                  on:error={() => console.error('Failed to load image:', imageUrl)}
                  on:contextmenu={(e) => handleImageRightClick(e, messageIndex, imageIndex)}
                />
              {/if}
            {/each}
            
          {:else}
            <div>{message.text}</div>
          {/if}
          <div class="text-xs mt-1" style="color: var(--vscode-descriptionForeground);">
            {formatTime(message.timestamp)}
          </div>
        </div>
      {/each}
      
        {#if $isLoading}
          <div class="mb-3 p-2 rounded max-w-full break-words mr-5 bg-vscode-input text-vscode-foreground">
            🎨 Generating your game asset...
          </div>
        {/if}
      </div>
      
      <!-- Button row between messages and input -->
      <div class="flex gap-1 px-2 py-1 border-t border-vscode-border flex-shrink-0">
        <button 
          class="bg-vscode-input text-vscode-foreground border border-vscode-border rounded cursor-pointer transition-all duration-200 hover:bg-vscode-background text-xs px-2 py-1 flex items-center gap-1" 
          on:click={() => currentView.set($currentView === 'chat' ? 'gallery' : 'chat')}
        >
          {#if $currentView === 'chat'}
            🖼️ Gallery
          {:else}
            💬 Chat
          {/if}
        </button>
        <div class="flex-1"></div>
        <button class="btn-primary text-xs px-1.5 py-1 flex items-center gap-1" on:click={newChat} disabled={$currentView !== 'chat'}>
          ✨ New Chat
        </button>
        <button class="btn-secondary text-xs px-1.5 py-1 flex items-center gap-1" on:click={showHistory}>
          📂 History
        </button>
      </div>
      
      <!-- Input field at bottom of chat -->
      <div class="p-2 border-t border-vscode-border flex-shrink-0">
        <div class="flex gap-2 mb-2">
          <input 
            type="text" 
            class="input-field flex-1" 
            placeholder="Ask about game assets..." 
            bind:value={messageInput}
            on:keypress={handleKeyPress}
          />
          <button class="btn-primary px-3 py-2" on:click={sendMessage}>Send</button>
        </div>
        <!-- Provider dropdown below input -->
        <div class="flex justify-start">
          <select 
            class="input-field text-xs px-2 py-1" 
            style="width: max(60px, 20%);"
            value={$currentProvider} 
            on:change={handleProviderChange}
          >
            <option value="gemini">🤖 Google Gemini</option>
            <option value="openai">🔮 OpenAI DALL-E</option>
          </select>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col h-full">
      <!-- Total Usage Header for Gallery -->
      {#if $totalUsage.totalTokens > 0 || $totalUsage.totalCost > 0}
        <div class="px-3 py-2 bg-vscode-input border-b border-vscode-border text-xs text-vscode-foreground">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span>💰 <strong>Tokens:</strong> {$totalUsage.totalInputTokens.toLocaleString()} input | {$totalUsage.totalOutputTokens.toLocaleString()} output</span>
              <span><strong>Total: ${$totalUsage.totalCost.toFixed(6)} {$totalUsage.currency}</strong></span>
            </div>
          </div>
        </div>
      {/if}
      <!-- Gallery content -->
      <div class="flex-1 min-h-0">
        <GalleryView />
      </div>
      
      <!-- Button row for gallery -->
      <div class="flex gap-1 px-2 py-1 border-t border-vscode-border flex-shrink-0">
        <button 
          class="bg-vscode-input text-vscode-foreground border border-vscode-border rounded cursor-pointer transition-all duration-200 hover:bg-vscode-background text-xs px-2 py-1 flex items-center gap-1" 
          on:click={() => currentView.set($currentView === 'chat' ? 'gallery' : 'chat')}
        >
          {#if $currentView === 'chat'}
            🖼️ Gallery
          {:else}
            💬 Chat
          {/if}
        </button>
        <div class="flex-1"></div>
        <button class="btn-primary text-xs px-1.5 py-1 flex items-center gap-1" on:click={newChat} disabled={$currentView !== 'chat'}>
          ✨ New Chat
        </button>
        <button class="btn-secondary text-xs px-1.5 py-1 flex items-center gap-1" on:click={showHistory}>
          📂 History
        </button>
      </div>
    </div>
  {/if}
</div>

<ImageContextMenu
  show={contextMenu.show}
  x={contextMenu.x}
  y={contextMenu.y}
  imageIndex={contextMenu.imageIndex}
  isDeleted={contextMenu.messageIndex >= 0 && contextMenu.imageIndex >= 0 && $messages[contextMenu.messageIndex]?.imageData?.imageStates?.deleted?.[contextMenu.imageIndex] || false}
  isHidden={contextMenu.messageIndex >= 0 && contextMenu.imageIndex >= 0 && $messages[contextMenu.messageIndex]?.imageData?.imageStates?.hidden?.[contextMenu.imageIndex] || false}
  savedPath={contextMenu.messageIndex >= 0 && contextMenu.imageIndex >= 0 && $messages[contextMenu.messageIndex]?.imageData?.savedPaths?.[contextMenu.imageIndex] || ''}
  onDelete={handleDeleteImage}
  onToggleVisibility={handleToggleImageVisibility}
  onOpenImage={handleOpenImage}
  onOpenInImageEditor={handleOpenInImageEditor}
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
  /* No styles needed for now */
</style>