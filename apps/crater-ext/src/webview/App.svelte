<script lang="ts">
  import { onMount } from 'svelte'
  import { currentPage, vscode, isConfigured, messages, isLoading, currentProvider, currentModel, chatSessions, currentSessionId, tempApiKeys, imageSettings } from './stores'
  import type { WebviewMessage } from './types'
  
  // Import components
  import Header from './components/Header.svelte'
  import ChatPage from './components/ChatPage.svelte'
  import ConfigPage from './components/ConfigPage.svelte'
  import SettingsPage from './components/SettingsPage.svelte'
  import ChatHistoryModal from './components/ChatHistoryModal.svelte'

  onMount(() => {
    // Listen for messages from the extension
    window.addEventListener('message', handleMessage)
    
    // Note: Initial data (chat history, provider info, settings) is sent 
    // proactively by the extension - no need to request it
  })

  function handleMessage(event: MessageEvent<WebviewMessage>) {
    const message = event.data

    switch (message.type) {
      case 'provider-info':
      case 'provider-updated':
        if (message.provider) {
          isConfigured.set(true)
          $currentPage === 'config' && currentPage.set('chat')
        } else {
          isConfigured.set(false)
          $currentPage === 'chat' && currentPage.set('config')
        }
        break
      
      case 'chat-history':
        if (message.messages) {
          messages.set(message.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })))
        }
        break
        
      case 'chat-response':
        isLoading.set(false)
        if (message.response) {
          const assistantMessage = {
            text: message.response,
            sender: 'assistant' as const,
            timestamp: new Date(),
            messageType: 'text' as const
          }
          messages.update(msgs => [...msgs, assistantMessage])
        }
        break
        
      case 'image-response':
        isLoading.set(false)
        if (message.images && message.prompt) {
          const imageMessage = {
            text: '',
            sender: 'assistant' as const,
            timestamp: new Date(),
            messageType: 'image' as const,
            imageData: {
              images: message.images,
              prompt: message.prompt,
              savedPaths: message.savedPaths
            }
          }
          messages.update(msgs => [...msgs, imageMessage])
        }
        break
        
      case 'settings':
        // Handle settings received from extension
        if (message.aiProvider) {
          currentProvider.set(message.aiProvider)
        }
        if (message.aiModel) {
          currentModel.set(message.aiModel)
        }
        
        // Update API key stores
        tempApiKeys.set({
          gemini: message.geminiApiKey || '',
          openai: message.openaiApiKey || ''
        })
        
        // Update image settings
        imageSettings.set({
          size: message.imageSize || 'auto',
          quality: message.imageQuality || 'auto'
        })
        break
        
      case 'settings-saved':
        isLoading.set(false)
        break
        
      case 'chat-sessions':
        if (message.sessions) {
          chatSessions.set(message.sessions)
        }
        if (message.currentSessionId) {
          currentSessionId.set(message.currentSessionId)
        }
        break
        
      case 'chat-cleared':
        messages.set([])
        break
    }
  }
</script>

<main>
  <Header />
  
  {#if $currentPage === 'chat'}
    <ChatPage />
  {:else if $currentPage === 'config'}
    <ConfigPage />
  {:else if $currentPage === 'settings'}
    <SettingsPage />
  {/if}
  
  <ChatHistoryModal />
</main>

<style>
  :global(body) {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background-color: var(--vscode-editor-background);
    margin: 0;
    padding: 0;
  }

  main {
    min-height: 100vh;
  }
</style>