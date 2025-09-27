<script lang="ts">
    import type { UsageSummary } from './helpers'

    export let summary: UsageSummary
    export let collapsed = true
    export let onToggle: () => void = () => {}

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggle()
        }
    }
</script>

{#if summary.hasData}
    <div class="usage-card">
        <button
            class="usage-header"
            on:click={onToggle}
            on:keydown={handleKeydown}
            aria-expanded={!collapsed}
            aria-controls="usage-details"
        >
            <span class:expanded={!collapsed} class="usage-chevron">▶</span>
            <span class="usage-title">Usage Summary</span>
            <span class="usage-cost">
                ${summary.cost.toFixed(4)} {summary.currency ?? 'USD'}
            </span>
        </button>
        {#if !collapsed}
            <div id="usage-details" class="usage-details">
                <div class="usage-row">
                    <span>Input Tokens</span>
                    <span class="value">{summary.inputTokens.toLocaleString()}</span>
                </div>
                <div class="usage-row">
                    <span>Output Tokens</span>
                    <span class="value">{summary.outputTokens.toLocaleString()}</span>
                </div>
                <div class="usage-row">
                    <span>Total Tokens</span>
                    <span class="value">{summary.totalTokens.toLocaleString()}</span>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    .usage-card {
        margin-bottom: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(34, 211, 238, 0.3);
        background: rgba(15, 23, 42, 0.7);
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.35);
        overflow: hidden;
    }

    .usage-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: none;
        background: transparent;
        color: #e2e8f0;
        padding: 1rem 1.25rem;
        cursor: pointer;
        font-size: 0.95rem;
        font-family: 'Share Tech Mono', monospace;
    }

    .usage-chevron {
        margin-right: 0.75rem;
        transition: transform 0.2s ease;
    }

    .usage-chevron.expanded {
        transform: rotate(90deg);
    }

    .usage-title {
        flex: 1;
        text-align: left;
        color: #38bdf8;
    }

    .usage-cost {
        color: #22d3ee;
        font-weight: 600;
    }

    .usage-details {
        padding: 0 1.25rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .usage-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #cbd5e1;
    }

    .usage-row .value {
        font-family: 'Share Tech Mono', monospace;
        color: #22d3ee;
    }
</style>
