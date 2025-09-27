<script lang="ts">
    import type { ChatSession } from '$lib/chat/sessionTypes'
    import type { ProviderStatus } from './helpers'

    export let activeSession: ChatSession | null = null
    export let providerStatus: ProviderStatus = {
        indicator: 'inactive',
        text: 'Add GEMINI API Key',
    }
    export let onClearSession: () => void = () => {}
</script>

<div class="chat-header">
    <div class="header-title">
        <h2>🎮 Game Asset Assistant</h2>
        {#if activeSession}
            <span class="mode-chip" data-mode={activeSession.mode}>
                {activeSession.mode === 'chat' ? 'Chat Mode' : 'Image Mode'}
            </span>
        {/if}
    </div>
    <div class="header-controls">
        <div class="provider-status">
            <span
                class="status-indicator"
                class:active={providerStatus.indicator === 'active'}
                class:inactive={providerStatus.indicator === 'inactive'}
            >●</span>
            <span class="status-text">{providerStatus.text}</span>
        </div>
        <slot name="actions">
            <button on:click={onClearSession} class="clear-btn">Clear Session</button>
        </slot>
    </div>
</div>

<style>
    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding: 1rem;
        border-radius: 0.75rem;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid rgba(34, 211, 238, 0.25);
        box-shadow: 0 8px 30px rgba(15, 23, 42, 0.35);
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .header-title h2 {
        margin: 0;
        color: #22d3ee;
        font-size: 1.5rem;
        font-family: 'Orbitron', monospace;
        font-weight: 700;
        text-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
        letter-spacing: 0.05em;
    }

    .mode-chip {
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        border: 1px solid rgba(56, 189, 248, 0.5);
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
    }

    .mode-chip[data-mode='chat'] {
        border-color: rgba(250, 204, 21, 0.5);
        background: rgba(250, 204, 21, 0.15);
        color: #fcd34d;
    }

    .header-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
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

    :global(.clear-btn) {
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

    :global(.clear-btn:hover) {
        background: rgba(168, 85, 247, 0.3);
        box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
        text-shadow: 0 0 10px #a855f7;
    }

    :global(.clear-btn::before) {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(168, 85, 247, 0.2),
            transparent
        );
        transition: transform 0.5s ease;
    }

    :global(.clear-btn:hover::before) {
        transform: translateX(200%);
    }

    @keyframes pulse-glow {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.6;
        }
    }
</style>
