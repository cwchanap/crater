<script lang="ts">
import { onMount } from 'svelte'
import { formatDate, generateId, globalEventEmitter } from '@crater/core'

let sessionId = ''
let currentTime = ''

onMount(() => {
    sessionId = generateId('web-session')
    currentTime = formatDate(new Date())
    
    // Listen for events
    globalEventEmitter.on('page:loaded', (data: unknown) => {
        console.log('Page loaded event:', data)
    })
    
    // Emit page loaded event
    globalEventEmitter.emit('page:loaded', { sessionId, currentTime })
})
</script>

<h1>Welcome to Crater Web</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<div class="core-demo">
    <h2>Core Package Demo</h2>
    <p>Session ID: <code>{sessionId}</code></p>
    <p>Current Time: <code>{currentTime}</code></p>
</div>

<style>
.core-demo {
    margin: 2rem 0;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
}

code {
    background: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
}
</style>
