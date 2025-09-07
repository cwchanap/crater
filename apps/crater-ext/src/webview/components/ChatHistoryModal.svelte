<script lang="ts">
  import { showChatHistoryModal, chatSessions, currentSessionId, vscode } from '../stores'
  import type { ChatSession } from '../types'

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
    class="modal" 
    role="dialog" 
    tabindex="-1"
    aria-modal="true" 
    aria-labelledby="modal-title"
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
  >
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modal-title" class="modal-title">Chat History</h3>
        <button class="modal-close" on:click={hideModal}>&times;</button>
      </div>
      <div class="sessions-list">
        {#if $chatSessions.length === 0}
          <div class="no-sessions">No previous chats found</div>
        {:else}
          {#each $chatSessions as session}
            <div 
              class="chat-session-item {session.id === $currentSessionId ? 'active' : ''}"
              role="button"
              tabindex="0"
              aria-label="Load chat session: {session.title}"
              on:click={() => loadChatSession(session.id)}
              on:keydown={(e) => handleSessionKeydown(e, session.id)}
            >
              <div class="session-title">{session.title}</div>
              <div class="session-info">
                {session.messageCount} messages • Last active: {formatDate(session.lastActivity)}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 8px;
    padding: 20px;
    max-width: 500px;
    width: 90%;
    max-height: 70vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--vscode-widget-border);
    padding-bottom: 8px;
  }

  .modal-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--vscode-foreground);
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--vscode-foreground);
    padding: 0;
  }

  .chat-session-item {
    padding: 12px;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .chat-session-item:hover {
    background-color: var(--vscode-list-hoverBackground);
  }

  .chat-session-item.active {
    background-color: var(--vscode-list-activeSelectionBackground);
    border-color: var(--vscode-focusBorder);
  }

  .session-title {
    font-weight: bold;
    margin-bottom: 4px;
    color: var(--vscode-foreground);
  }

  .session-info {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  .no-sessions {
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    padding: 20px;
  }
</style>