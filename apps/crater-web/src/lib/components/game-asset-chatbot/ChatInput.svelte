<script lang="ts">
    import { createEventDispatcher } from 'svelte'

    export let value: string = ''
    export let placeholder: string = 'Ask me about game assets...'
    export let isLoading: boolean = false
    export let maxLength: number = 500

    const dispatch = createEventDispatcher<{
        value: string
        submit: void
    }>()

    function handleInput(event: Event): void {
        const target = event.currentTarget as HTMLInputElement
        dispatch('value', target.value)
    }

    function handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            dispatch('submit')
        }
    }

    function handleClick(): void {
        if (!isLoading) {
            dispatch('submit')
        }
    }
</script>

<div class="input-container">
    <input
        type="text"
        bind:value
        placeholder={placeholder}
        disabled={isLoading}
        class="message-input"
        maxlength={maxLength}
        on:input={handleInput}
        on:keydown={handleKeyDown}
    />
    <button
        on:click={handleClick}
        disabled={isLoading || !value.trim()}
        class="send-btn"
    >
        {isLoading ? 'Sending...' : 'Send'}
    </button>
</div>

<style>
    .input-container {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(34, 211, 238, 0.25);
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
    }

    .message-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid rgba(34, 211, 238, 0.3);
        background: rgba(2, 6, 23, 0.85);
        color: #e2e8f0;
        font-size: 0.95rem;
        font-family: 'Share Tech Mono', monospace;
        outline: none;
        transition: border-color 0.2s ease;
    }

    .message-input:focus {
        border-color: #22d3ee;
        box-shadow: 0 0 12px rgba(34, 211, 238, 0.35);
    }

    .message-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .send-btn {
        min-width: 90px;
        background: linear-gradient(90deg, #38bdf8, #a855f7);
        border: none;
        color: white;
        font-weight: 600;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        cursor: pointer;
        font-size: 0.9rem;
        font-family: 'Orbitron', monospace;
        transition: transform 0.2s ease;
    }

    .send-btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    .send-btn:not(:disabled):hover {
        transform: translateY(-1px);
    }
</style>
