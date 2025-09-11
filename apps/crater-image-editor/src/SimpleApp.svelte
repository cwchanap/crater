<script lang="ts">
    import { onMount } from 'svelte';

    let vscode: any;
    let mounted = false;

    onMount(() => {
        console.log('SimpleApp: onMount called');
        try {
            // @ts-ignore
            vscode = acquireVsCodeApi();
            console.log('SimpleApp: VS Code API acquired');
            mounted = true;
        } catch (error) {
            console.error('SimpleApp: Error acquiring VS Code API:', error);
        }
    });

    function testMessage() {
        if (vscode) {
            vscode.postMessage({
                type: 'test',
                message: 'Hello from SimpleApp!'
            });
            console.log('SimpleApp: Test message sent');
        }
    }
</script>

<div class="app">
    <h1>Crater Image Editor - Simple Test</h1>
    
    {#if mounted}
        <div class="success">
            <p>✓ Svelte app mounted successfully</p>
            <p>✓ VS Code API available</p>
            <button on:click={testMessage}>Test Extension Communication</button>
        </div>
    {:else}
        <div class="loading">
            <p>Loading...</p>
        </div>
    {/if}

    <div class="debug-info">
        <h3>Debug Info:</h3>
        <p>Mounted: {mounted}</p>
        <p>VS Code API: {vscode ? 'Available' : 'Not Available'}</p>
    </div>
</div>

<style>
    .app {
        padding: 20px;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-font-family);
        height: 100vh;
    }

    .success {
        color: #4CAF50;
        padding: 15px;
        border: 1px solid #4CAF50;
        border-radius: 5px;
        margin: 10px 0;
    }

    .loading {
        color: #FFA500;
        padding: 15px;
        border: 1px solid #FFA500;
        border-radius: 5px;
        margin: 10px 0;
    }

    .debug-info {
        margin-top: 20px;
        padding: 10px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
    }

    button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 8px 16px;
        border-radius: 3px;
        cursor: pointer;
        margin: 10px 0;
    }

    button:hover {
        background: var(--vscode-button-hoverBackground);
    }

    h1 {
        color: var(--vscode-editor-foreground);
        margin-bottom: 20px;
    }
</style>