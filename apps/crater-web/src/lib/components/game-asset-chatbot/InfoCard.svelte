<script lang="ts">
    export let expanded = false
    export let sessionId = ''
    export let currentTime = ''
    export let onToggle: () => void = () => {}
</script>

<div class="info-card-container">
    <button class="info-card-header" on:click={onToggle} aria-expanded={expanded}>
        <div class="info-header-content">
            <h3>🎯 What is Crater?</h3>
            <span class:expanded={expanded} class="expand-icon">
                {expanded ? '▼' : '▶'}
            </span>
        </div>
    </button>

    {#if expanded}
        <div class="info-card-content">
            <p>
                Crater is a powerful game development platform that helps you
                create amazing game assets using AI technology.
            </p>

            <h4>✨ Features</h4>
            <ul>
                <li>AI-powered image generation for game assets</li>
                <li>Support for multiple AI providers (Gemini, OpenAI)</li>
                <li>Interactive chatbot assistant</li>
                <li>Web and VS Code extension support</li>
            </ul>

            <h4>🚀 Getting Started</h4>
            <ol>
                <li>Click the "Settings" button in the chatbot</li>
                <li>Choose an AI provider (Gemini or OpenAI)</li>
                <li>Enter your API key</li>
                <li>Start generating amazing game assets!</li>
            </ol>

            {#if sessionId}
                <div class="session-info">
                    <h4>📊 Session Info</h4>
                    <p>Session ID: <code>{sessionId}</code></p>
                    <p>Current Time: <code>{currentTime}</code></p>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .info-card-container {
        margin-bottom: 1.5rem;
        background: rgba(15, 23, 42, 0.7);
        border-radius: 1rem;
        border: 1px solid rgba(56, 189, 248, 0.2);
        overflow: hidden;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.35);
    }

    .info-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        border: none;
        background: transparent;
        padding: 1rem 1.25rem;
        cursor: pointer;
        color: #e2e8f0;
    }

    .info-header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .info-card-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #22d3ee;
        font-family: 'Orbitron', monospace;
        text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
    }

    .expand-icon {
        transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
        transform: rotate(90deg);
    }

    .info-card-content {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        color: #cbd5e1;
        font-size: 0.95rem;
        line-height: 1.6;
    }

    .info-card-content h4 {
        margin: 0;
        color: #38bdf8;
        font-family: 'Orbitron', monospace;
        text-shadow: 0 0 8px rgba(56, 189, 248, 0.45);
    }

    ul,
    ol {
        margin: 0;
        padding-left: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .session-info {
        background: rgba(2, 6, 23, 0.85);
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 0.75rem;
        padding: 1rem;
        font-family: 'Share Tech Mono', monospace;
    }

    code {
        background: rgba(15, 23, 42, 0.9);
        padding: 0.2rem 0.4rem;
        border-radius: 0.25rem;
        font-size: 0.85rem;
    }
</style>
