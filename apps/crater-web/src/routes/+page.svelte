<script lang="ts">
import { onMount } from 'svelte'
import GameAssetChatbot from '$lib/components/GameAssetChatbot.svelte'

let sessionId = ''
let currentTime = ''

onMount(() => {
    sessionId = `web-session-${Date.now()}`
    currentTime = new Date().toLocaleString()

    console.log('Crater Web app loaded', { sessionId, currentTime })
})
</script>

<div class="page-container">
    <header class="page-header">
        <h1>🌋 Crater Web</h1>
        <p class="subtitle">AI-Powered Game Asset Generation Platform</p>
    </header>

    <main class="main-content">
        <div class="chatbot-section">
            <GameAssetChatbot />
        </div>

        <aside class="info-section">
            <div class="info-card">
                <h2>🎯 What is Crater?</h2>
                <p>Crater is a powerful game development platform that helps you create amazing game assets using AI technology.</p>

                <h3>✨ Features</h3>
                <ul>
                    <li>AI-powered image generation for game assets</li>
                    <li>Support for multiple AI providers (Gemini, OpenAI)</li>
                    <li>Interactive chatbot assistant</li>
                    <li>Web and VS Code extension support</li>
                </ul>

                <h3>🚀 Getting Started</h3>
                <ol>
                    <li>Click the "Settings" button in the chatbot</li>
                    <li>Choose an AI provider (Gemini or OpenAI)</li>
                    <li>Enter your API key</li>
                    <li>Start generating amazing game assets!</li>
                </ol>

                <div class="core-demo">
                    <h3>📊 Session Info</h3>
                    <p>Session ID: <code>{sessionId}</code></p>
                    <p>Current Time: <code>{currentTime}</code></p>
                </div>
            </div>
        </aside>
    </main>

    <footer class="page-footer">
        <p>
            Built with ❤️ using SvelteKit, TypeScript, and the Crater Core package.
            Visit <a href="https://svelte.dev/docs/kit" target="_blank">SvelteKit docs</a> to learn more.
        </p>
    </footer>
</div>

<style>
.page-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #1f2937;
}

.page-header {
    text-align: center;
    padding: 2rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
}

.page-header h1 {
    margin: 0;
    font-size: 3rem;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
    margin: 0.5rem 0 0 0;
    font-size: 1.25rem;
    opacity: 0.9;
    font-weight: 300;
}

.main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 2rem;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

.chatbot-section {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    height: 700px;
}

.info-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.info-card {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
}

.info-card h2 {
    margin: 0 0 1rem 0;
    color: #2563eb;
    font-size: 1.5rem;
}

.info-card h3 {
    margin: 1.5rem 0 0.75rem 0;
    color: #374151;
    font-size: 1.125rem;
}

.info-card p {
    margin: 0 0 1rem 0;
    line-height: 1.6;
    color: #6b7280;
}

.info-card ul, .info-card ol {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
}

.info-card li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
    color: #6b7280;
}

.core-demo {
    margin: 1.5rem 0 0 0;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
}

.core-demo h3 {
    margin: 0 0 0.75rem 0;
}

code {
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    color: #1e293b;
}

.page-footer {
    text-align: center;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
}

.page-footer a {
    color: #93c5fd;
    text-decoration: none;
    font-weight: 500;
}

.page-footer a:hover {
    text-decoration: underline;
}

/* Responsive design */
@media (max-width: 1024px) {
    .main-content {
        grid-template-columns: 1fr;
        gap: 1rem;
        padding: 1rem;
    }

    .chatbot-section {
        height: 600px;
    }
}

@media (max-width: 768px) {
    .page-header h1 {
        font-size: 2rem;
    }

    .subtitle {
        font-size: 1rem;
    }

    .main-content {
        padding: 0.5rem;
    }

    .info-card {
        padding: 1.5rem;
    }

    .chatbot-section {
        height: 500px;
    }
}
</style>
