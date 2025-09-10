<script lang="ts">
  import { showChatHistoryModal, chatSessions, currentSessionId, vscode } from '../stores'

  function hideModal() {
    showChatHistoryModal.set(false)
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      hideModal()
    }
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      hideModal()
    }
  }

  function handleSessionKeydown(event: KeyboardEvent, sessionId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      loadChatSession(sessionId)
    }
  }

  function loadChatSession(sessionId: string) {
    if (!$vscode || sessionId === $currentSessionId) return
    
    console.log('[Crater WebView] Loading chat session:', sessionId)
    $vscode.postMessage({ type: 'load-chat-session', sessionId })
    hideModal()
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
    }
  }
</script>

{#if $showChatHistoryModal}
  <div 
    class="fixed inset-0 w-full h-full bg-black/50 flex items-center justify-center z-[1000]" 
    role="dialog" 
    tabindex="-1"
    aria-modal="true" 
    aria-labelledby="modal-title"
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
  >
    <div class="bg-vscode-background border border-vscode-border rounded-lg p-5 max-w-md w-[90%] max-h-[70vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4 border-b border-vscode-border pb-2">
        <h3 id="modal-title" class="text-base font-bold text-vscode-foreground m-0">Chat History</h3>
        <button class="bg-transparent border-none text-xl cursor-pointer text-vscode-foreground p-0 hover:opacity-75" on:click={hideModal}>&times;</button>
      </div>
      <div>
        {#if $chatSessions.length === 0}
          <div class="text-center text-vscode-foreground italic py-5">No previous chats found</div>
        {:else}
          {#each $chatSessions as session}
            <div 
              class="p-3 border border-vscode-border rounded-md mb-2 cursor-pointer transition-colors duration-200 hover:bg-vscode-input {session.id === $currentSessionId ? 'bg-vscode-button border-blue-500' : ''}"
              role="button"
              tabindex="0"
              aria-label="Load chat session: {session.title}"
              on:click={() => loadChatSession(session.id)}
              on:keydown={(e) => handleSessionKeydown(e, session.id)}
            >
              <div class="font-bold mb-1 text-vscode-foreground">{session.title}</div>
              <div class="text-xs text-gray-500">
                {session.messageCount} messages • Last active: {formatDate(session.lastActivity)}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

