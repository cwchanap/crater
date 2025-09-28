<script lang="ts">
    import { toastStore, removeToast } from '$lib/stores/toast'

    $: toasts = $toastStore
</script>

<div class="toast-container">
    {#each toasts as toast (toast.id)}
        <div class="toast toast-{toast.type}">
            <div class="toast-content">
                <span class="toast-icon">
                    {#if toast.type === 'success'}
                        ✅
                    {:else if toast.type === 'error'}
                        ❌
                    {:else if toast.type === 'warning'}
                        ⚠️
                    {:else}
                        ℹ️
                    {/if}
                </span>
                <span class="toast-message">{toast.message}</span>
            </div>
            <button
                class="toast-close"
                on:click={() => removeToast(toast.id)}
            >
                ✕
            </button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 400px;
    }

    .toast {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border-radius: 0.5rem;
        backdrop-filter: blur(10px);
        border: 2px solid;
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.875rem;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .toast-success {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: #22c55e;
    }

    .toast-error {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: #ef4444;
    }

    .toast-warning {
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.3);
        color: #f59e0b;
    }

    .toast-info {
        background: rgba(34, 211, 238, 0.1);
        border-color: rgba(34, 211, 238, 0.3);
        color: #22d3ee;
    }

    .toast-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }

    .toast-icon {
        font-size: 1rem;
        flex-shrink: 0;
    }

    .toast-message {
        flex: 1;
        word-break: break-word;
    }

    .toast-close {
        background: transparent;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 1rem;
        padding: 0.25rem;
        border-radius: 0.25rem;
        opacity: 0.7;
        transition: opacity 0.2s ease;
        flex-shrink: 0;
    }

    .toast-close:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .toast-container {
            right: 0.5rem;
            left: 0.5rem;
            max-width: none;
        }
    }
</style>
