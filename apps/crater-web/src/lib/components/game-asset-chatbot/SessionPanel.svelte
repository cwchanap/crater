<script lang="ts">
    import type { ChatSession, SessionMode } from '$lib/chat/sessionTypes'

    export let sessions: ChatSession[] = []
    export let activeSessionId = ''
    export let newChatMenuOpen = false
    export let onCreateSession: (mode: SessionMode) => void = () => {}
    export let onSelectSession: (sessionId: string) => void = () => {}
    export let onToggleNewChatMenu: () => void = () => {}
</script>

<aside class="session-panel">
    <div class="session-panel-header">
        <h3>Sessions</h3>
        <div class="new-chat-wrapper">
            <button class="new-chat-btn" on:click={onToggleNewChatMenu}>
                ＋ New Chat
            </button>
            {#if newChatMenuOpen}
                <div class="new-chat-menu">
                    <button on:click={() => onCreateSession('chat')}>Chat Mode</button>
                    <button on:click={() => onCreateSession('image')}>
                        Image Mode
                    </button>
                </div>
            {/if}
        </div>
    </div>
    <div class="session-list">
        {#if sessions.length === 0}
            <p class="empty-sessions">Start a conversation to begin.</p>
        {:else}
            {#each sessions as session (session.id)}
                <button
                    class:active={session.id === activeSessionId}
                    class="session-item"
                    on:click={() => onSelectSession(session.id)}
                >
                    <span class="session-item-title">{session.title}</span>
                    <span class="session-mode-tag" data-mode={session.mode}>
                        {session.mode === 'chat' ? 'Chat' : 'Image'}
                    </span>
                </button>
            {/each}
        {/if}
    </div>
</aside>

<style>
    .session-panel {
        width: 280px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: rgba(6, 182, 212, 0.06);
        border: 2px solid rgba(6, 182, 212, 0.25);
        border-radius: 1rem;
        padding: 1.25rem;
        backdrop-filter: blur(14px);
        box-shadow: inset 0 0 20px rgba(6, 182, 212, 0.08);
    }

    .session-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
    }

    .session-panel-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #38bdf8;
        text-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }

    .new-chat-wrapper {
        position: relative;
    }

    .new-chat-btn {
        background: rgba(168, 85, 247, 0.2);
        color: #a855f7;
        border: 2px solid rgba(168, 85, 247, 0.3);
        padding: 0.35rem 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
        font-family: 'Orbitron', monospace;
        transition: all 0.3s ease;
    }

    .new-chat-btn:hover {
        background: rgba(168, 85, 247, 0.35);
        box-shadow: 0 0 18px rgba(168, 85, 247, 0.35);
    }

    .new-chat-menu {
        position: absolute;
        top: 110%;
        right: 0;
        display: flex;
        flex-direction: column;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(34, 211, 238, 0.4);
        border-radius: 0.75rem;
        box-shadow: 0 18px 40px rgba(8, 47, 73, 0.45);
        overflow: hidden;
        z-index: 10;
        min-width: 160px;
    }

    .new-chat-menu button {
        background: transparent;
        color: #e2e8f0;
        border: none;
        padding: 0.6rem 1rem;
        text-align: left;
        cursor: pointer;
        font-size: 0.85rem;
        transition: background 0.2s ease;
    }

    .new-chat-menu button:hover {
        background: rgba(34, 211, 238, 0.12);
    }

    .session-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto;
    }

    .session-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.65rem 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid transparent;
        background: rgba(15, 23, 42, 0.6);
        color: #e2e8f0;
        cursor: pointer;
        text-align: left;
        transition: all 0.3s ease;
    }

    .session-item:hover,
    .session-item.active {
        border-color: rgba(34, 211, 238, 0.4);
        background: rgba(30, 41, 59, 0.85);
        box-shadow: 0 0 18px rgba(34, 211, 238, 0.15);
    }

    .session-item-title {
        font-size: 0.85rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .session-mode-tag {
        font-size: 0.7rem;
        padding: 0.1rem 0.6rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 1px solid rgba(34, 211, 238, 0.4);
        color: #38bdf8;
        background: rgba(34, 211, 238, 0.12);
    }

    .session-mode-tag[data-mode='chat'] {
        color: #fcd34d;
        border-color: rgba(250, 204, 21, 0.4);
        background: rgba(250, 204, 21, 0.12);
    }

    .empty-sessions {
        margin: 0;
        font-size: 0.8rem;
        color: rgba(148, 163, 184, 0.8);
        text-align: center;
    }
</style>
