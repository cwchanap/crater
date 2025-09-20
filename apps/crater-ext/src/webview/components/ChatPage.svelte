<script lang="ts">
  import { messages, isLoading, vscode, showChatHistoryModal, currentProvider, currentView, totalUsage, isUsageInfoCollapsed } from '../stores'
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

  function toggleUsageInfo() {
    isUsageInfoCollapsed.update(collapsed => !collapsed)
  }

  function handleUsageToggleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleUsageInfo()
    }
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
  <!-- Usage Information Card - Improved design -->
  {#if $totalUsage.totalTokens > 0 || $totalUsage.totalCost > 0}
    <div class="usage-card mb-3">
      <div
        class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-vscode-background transition-all duration-200"
        role="button"
        tabindex="0"
        aria-expanded={!$isUsageInfoCollapsed}
        aria-controls="usage-details"
        on:click={toggleUsageInfo}
        on:keydown={handleUsageToggleKeydown}
      >
        <div class="flex items-center gap-2.5">
          <span class="text-sm transform transition-transform duration-200 {$isUsageInfoCollapsed ? 'rotate-0' : 'rotate-90'} text-vscode-foreground opacity-75">▶</span>
          <span class="text-sm font-medium text-vscode-foreground">Usage Summary</span>
        </div>
        <div class="text-sm text-vscode-foreground font-mono">
          <span class="status-badge bg-blue-100 text-blue-800">${$totalUsage.totalCost.toFixed(4)} {$totalUsage.currency}</span>
        </div>
      </div>
      {#if !$isUsageInfoCollapsed}
        <div id="usage-details" class="px-4 py-3 border-t border-vscode-border bg-vscode-editor-background">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-vscode-foreground">
            <div class="flex items-center gap-2">
              <span>💰</span>
              <span><strong>Input:</strong> {$totalUsage.totalInputTokens.toLocaleString()} tokens</span>
            </div>
            <div class="flex items-center gap-2">
              <span>📊</span>
              <span><strong>Output:</strong> {$totalUsage.totalOutputTokens.toLocaleString()} tokens</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if $currentView === 'chat'}
    <div class="flex flex-col h-full card">
      <!-- Messages area -->
      <div class="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-4">
          {#if $messages.length === 0}
            <div class="text-center py-12">
              <div class="text-4xl mb-4">🎮</div>
              <div class="text-lg font-medium text-vscode-foreground mb-2">
                Welcome to Game Asset Assistant!
              </div>
              <div class="text-sm text-vscode-foreground opacity-75 max-w-sm mx-auto">
                Ask me about characters, backgrounds, textures, UI elements, sounds, animations, and more!
              </div>
            </div>
          {/if}

          {#each $messages as message, messageIndex}
        <div class="message-bubble {message.sender === 'user' ? 'message-user' : 'message-assistant'}">
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
          <div class="text-xs mt-2 text-vscode-foreground opacity-60">
            {formatTime(message.timestamp)}
          </div>
        </div>
      {/each}

        {#if $isLoading}
          <div class="message-bubble message-assistant animate-pulse">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <span class="ml-2 text-sm">🎨 Generating your game asset...</span>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Action buttons -->
      <div class="flex justify-between items-center px-4 py-3 border-t border-vscode-border bg-vscode-background">
        <button
          class="btn-ghost text-sm px-3 py-2 flex items-center gap-2"
          on:click={() => currentView.set($currentView === 'chat' ? 'gallery' : 'chat')}
        >
          {#if $currentView === 'chat'}
            <span>🖼️</span>
            <span>Gallery</span>
          {:else}
            <span>💬</span>
            <span>Chat</span>
          {/if}
        </button>

        <div class="flex gap-2">
          <button class="btn-primary text-sm px-3 py-2 flex items-center gap-2" on:click={newChat} disabled={$currentView !== 'chat'}>
            <span>✨</span>
            <span>New Chat</span>
          </button>
          <button class="btn-secondary text-sm px-3 py-2 flex items-center gap-2" on:click={showHistory}>
            <span>📂</span>
            <span>History</span>
          </button>
        </div>
      </div>
      
      <!-- Input section -->
      <div class="px-4 py-4 border-t border-vscode-border bg-vscode-background space-y-3">
        <!-- Provider selection -->
        <div class="flex items-center gap-3">
          <label for="provider-select" class="text-sm font-medium text-vscode-foreground">Provider:</label>
          <select
            id="provider-select"
            class="input-field text-sm max-w-xs"
            value={$currentProvider}
            on:change={handleProviderChange}
          >
            <option value="gemini">🤖 Google Gemini</option>
            <option value="openai">🔮 OpenAI DALL-E</option>
          </select>
        </div>

        <!-- Message input -->
        <div class="flex gap-3">
          <input
            type="text"
            class="input-field flex-1 text-sm"
            placeholder="Describe the game asset you need..."
            bind:value={messageInput}
            on:keypress={handleKeyPress}
            disabled={$isLoading}
          />
          <button
            class="btn-primary px-4 py-2.5 flex items-center gap-2 min-w-fit"
            on:click={sendMessage}
            disabled={!messageInput.trim() || $isLoading}
          >
            {#if $isLoading}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {:else}
              <span>➤</span>
            {/if}
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col h-full">
      <!-- Gallery content -->
      <div class="flex-1 min-h-0">
        <GalleryView />
      </div>
      
      <!-- Gallery action buttons -->
      <div class="flex justify-between items-center px-4 py-3 border-t border-vscode-border bg-vscode-background">
        <button
          class="btn-ghost text-sm px-3 py-2 flex items-center gap-2"
          on:click={() => currentView.set($currentView === 'chat' ? 'gallery' : 'chat')}
        >
          {#if $currentView === 'chat'}
            <span>🖼️</span>
            <span>Gallery</span>
          {:else}
            <span>💬</span>
            <span>Chat</span>
          {/if}
        </button>

        <div class="flex gap-2">
          <button class="btn-primary text-sm px-3 py-2 flex items-center gap-2" on:click={newChat} disabled={$currentView !== 'chat'}>
            <span>✨</span>
            <span>New Chat</span>
          </button>
          <button class="btn-secondary text-sm px-3 py-2 flex items-center gap-2" on:click={showHistory}>
            <span>📂</span>
            <span>History</span>
          </button>
        </div>
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