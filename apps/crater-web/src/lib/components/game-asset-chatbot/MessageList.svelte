<script lang="ts">
    import type {
        EnhancedMessage,
        SessionMode,
    } from '$lib/chat/sessionTypes'

    export let messages: EnhancedMessage[] = []
    export let isLoading = false
    export let activeMode: SessionMode = 'image'
    export let onDownloadImage: (imageUrl: string, prompt: string) => void = () => {}
    export let onViewImage: (imageUrl: string) => void = () => {}

    function renderMarkdown(text: string): string {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
    }
</script>

<div class="messages-container">
    {#if messages.length === 0}
        <div class="empty-state">
            <p>
                Start a conversation or open ⚙️ Settings to connect your AI
                provider.
            </p>
        </div>
    {:else}
        {#each messages as message (message.id)}
            <div class={`message ${message.sender}`}>
                <div class="message-content">
                    {#if message.messageType === 'image' && message.imageData}
                        <div class="image-message">
                            <p>{@html renderMarkdown(message.text)}</p>
                            <div class="image-gallery">
                                {#each message.imageData.images as imageUrl}
                                    <div class="image-item">
                                        <img
                                            src={imageUrl}
                                            alt={message.imageData.prompt}
                                            class="generated-image"
                                        />
                                        <div class="image-actions">
                                            <button
                                                on:click={() =>
                                                    onDownloadImage(
                                                        imageUrl,
                                                        message.imageData?.prompt || 'image'
                                                    )
                                                }
                                                class="download-btn"
                                                title="Download Image"
                                            >
                                                💾 Download
                                            </button>
                                            <button
                                                on:click={() => onViewImage(imageUrl)}
                                                class="view-btn"
                                                title="View Full Size"
                                            >
                                                🔍 View
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                            {#if message.imageData.cost}
                                <div class="usage-info">
                                    <small>
                                        Cost: ${message.imageData.cost.totalCost.toFixed(4)}
                                        {message.imageData.cost.currency}
                                    </small>
                                </div>
                            {/if}
                        </div>
                    {:else}
                        {@html renderMarkdown(message.text)}
                    {/if}
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
                <span class="loading-dots">
                    {activeMode === 'image'
                        ? 'Generating image...'
                        : 'Thinking...'}
                </span>
            </div>
        </div>
    {/if}
</div>

<style>
    .messages-container {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 1rem;
        padding: 1rem;
        background: rgba(2, 6, 23, 0.9);
        border: 2px solid rgba(6, 182, 212, 0.2);
        border-radius: 0.75rem;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-height: 0;
    }

    .messages-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
            linear-gradient(rgba(6, 182, 212, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.02) 1px, transparent 1px);
        background-size: 20px 20px;
        pointer-events: none;
        opacity: 0.5;
    }

    .empty-state {
        text-align: center;
        color: #94a3b8;
        padding: 2rem;
        font-family: 'Share Tech Mono', monospace;
    }

    .message {
        margin-bottom: 0.5rem;
        max-width: 80%;
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        line-height: 1.5;
        font-family: 'Share Tech Mono', monospace;
        position: relative;
        z-index: 2;
        backdrop-filter: blur(5px);
    }

    .message.user {
        background: rgba(34, 211, 238, 0.1);
        border: 2px solid rgba(34, 211, 238, 0.3);
        margin-left: auto;
        text-align: right;
        color: #e2e8f0;
        box-shadow: 0 0 10px rgba(34, 211, 238, 0.2);
    }

    .message.assistant {
        background: rgba(168, 85, 247, 0.1);
        border: 2px solid rgba(168, 85, 247, 0.3);
        margin-right: auto;
        color: #e2e8f0;
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.2);
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

    .image-message {
        width: 100%;
    }

    .image-gallery {
        display: grid;
        gap: 1rem;
        margin: 1rem 0;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }

    .image-item {
        background: white;
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .generated-image {
        width: 100%;
        height: auto;
        display: block;
        max-height: 300px;
        object-fit: cover;
    }

    .image-actions {
        display: flex;
        gap: 0.5rem;
        padding: 0.75rem;
        background: #f9fafb;
    }

    .download-btn,
    .view-btn {
        background: #2563eb;
        color: white;
        border: none;
        padding: 0.375rem 0.75rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        transition: background-color 0.2s;
    }

    .download-btn:hover,
    .view-btn:hover {
        background: #1d4ed8;
    }

    .usage-info {
        padding: 0.5rem;
        background: #f3f4f6;
        border-top: 1px solid #e5e7eb;
        text-align: right;
        font-size: 0.75rem;
        color: #475569;
    }

    .loading-dots {
        display: inline-block;
        animation: pulse 1.2s infinite ease-in-out;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 0.4;
        }
        50% {
            opacity: 1;
        }
    }
</style>
