<script lang="ts">
import { onMount } from 'svelte'
import GameAssetChatbot from '$lib/components/GameAssetChatbot.svelte'
import ToastContainer from '$lib/components/ToastContainer.svelte'

let sessionId = ''
let currentTime = ''
let showSettings = false

onMount(() => {
    sessionId = `web-session-${Date.now()}`
    currentTime = new Date().toLocaleString()

    console.log('Crater Web app loaded', { sessionId, currentTime })
})
</script>

<div class="page-container">
    <header class="page-header">
        <div class="header-content">
            <div class="title-section">
                <h1>🌋 Crater Web</h1>
                <p class="subtitle">AI-Powered Game Asset Generation Platform</p>
            </div>
            <div class="header-controls">
                <button
                    on:click={() => showSettings = !showSettings}
                    class="settings-nav-btn"
                    class:active={showSettings}
                >
                    ⚙️ Settings
                </button>
            </div>
        </div>
    </header>

    <main class="main-content">
        <div class="chatbot-section">
            <GameAssetChatbot {sessionId} {currentTime} bind:showSettings />
        </div>
    </main>

    <footer class="page-footer">
        <p>
            Built with ❤️ using SvelteKit, TypeScript, and the Crater Core package.
            Visit <a href="https://svelte.dev/docs/kit" target="_blank">SvelteKit docs</a> to learn more.
        </p>
    </footer>
</div>

<ToastContainer />

<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

:global(body) {
    font-family: 'Orbitron', monospace;
    background: #020617;
    overflow-x: hidden;
}

:global(body::before) {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
        linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px),
        linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%);
    background-size: 40px 40px, 40px 40px, 100% 100%;
    pointer-events: none;
    z-index: -1;
}

.page-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: transparent;
    color: #e2e8f0;
    position: relative;
}

.page-container::after {
    content: '';
    position: fixed;
    top: 0;
    left: -100%;
    width: 200%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #06b6d4, transparent);
    animation: scan-line 4s linear infinite;
    z-index: 1;
    pointer-events: none;
}

.page-header {
    text-align: center;
    padding: 3rem 1rem;
    background: rgba(6, 182, 212, 0.05);
    backdrop-filter: blur(20px);
    border-bottom: 2px solid rgba(6, 182, 212, 0.3);
    border-image: linear-gradient(90deg, transparent, #06b6d4, transparent) 1;
    color: #f0f9ff;
    position: relative;
    overflow: hidden;
}

.page-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at center top, rgba(6, 182, 212, 0.1), transparent 70%);
    pointer-events: none;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
}

.title-section {
    text-align: center;
    flex: 1;
}

.header-controls {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    pointer-events: auto;
}

.page-header h1 {
    margin: 0;
    font-size: 4rem;
    font-weight: 900;
    font-family: 'Orbitron', monospace;
    text-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4, 0 0 30px #06b6d4;
    color: #f0f9ff;
    animation: glow 2s ease-in-out infinite alternate;
    position: relative;
    z-index: 2;
}

.subtitle {
    margin: 1rem 0 0 0;
    font-size: 1.5rem;
    opacity: 0.9;
    font-weight: 400;
    color: #06b6d4;
    text-shadow: 0 0 5px #06b6d4;
    animation: neon-flicker 3s infinite linear;
    position: relative;
    z-index: 2;
}

.main-content {
    flex: 1;
    display: flex;
    padding: 0;
    width: 100%;
    position: relative;
    z-index: 2;
    min-height: 0; /* Allow flex child to shrink */
}

.chatbot-section {
    background: transparent;
    overflow: hidden;
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
}



.page-footer {
    text-align: center;
    padding: 2rem;
    background: rgba(6, 182, 212, 0.05);
    backdrop-filter: blur(20px);
    border-top: 2px solid rgba(6, 182, 212, 0.3);
    border-image: linear-gradient(90deg, transparent, #06b6d4, transparent) 1;
    color: #cbd5e1;
    position: relative;
    font-family: 'Share Tech Mono', monospace;
}

.page-footer a {
    color: #22d3ee;
    text-decoration: none;
    font-weight: 500;
    text-shadow: 0 0 5px #22d3ee;
    transition: all 0.3s ease;
}

.page-footer a:hover {
    color: #06b6d4;
    text-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4;
    text-decoration: underline;
}

@keyframes glow {
    0% {
        text-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4, 0 0 30px #06b6d4;
    }
    100% {
        text-shadow: 0 0 15px #06b6d4, 0 0 25px #06b6d4, 0 0 35px #06b6d4;
    }
}

@keyframes pulse-glow {
    0%, 100% {
        text-shadow: 0 0 10px #a855f7;
    }
    50% {
        text-shadow: 0 0 15px #a855f7, 0 0 25px #a855f7;
    }
}

@keyframes neon-flicker {
    0%, 100% { opacity: 1; }
    2% { opacity: 0.8; }
    4% { opacity: 1; }
    8% { opacity: 0.8; }
    10% { opacity: 1; }
    15% { opacity: 0.9; }
    20% { opacity: 1; }
}

.settings-nav-btn {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
    border: 2px solid rgba(168, 85, 247, 0.3);
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    font-family: 'Orbitron', monospace;
    font-weight: 600;
    text-shadow: 0 0 5px #a855f7;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
}

.settings-nav-btn:hover, .settings-nav-btn.active {
    background: rgba(168, 85, 247, 0.3);
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
    text-shadow: 0 0 10px #a855f7;
}

.settings-nav-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.2), transparent);
    transition: transform 0.5s ease;
}

.settings-nav-btn:hover::before {
    transform: translateX(200%);
}

@keyframes scan-line {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100vw); }
}

/* Responsive design */
@media (max-width: 768px) {
    .page-header h1 {
        font-size: 2.5rem;
    }

    .subtitle {
        font-size: 1.1rem;
    }

    .header-content {
        flex-direction: column;
        gap: 1rem;
    }

    .header-controls {
        position: static;
        transform: none;
    }

    .settings-nav-btn {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
    }
}
</style>
