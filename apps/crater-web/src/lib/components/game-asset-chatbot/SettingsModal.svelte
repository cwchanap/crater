<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    import type { ProviderKind } from '$lib/chat/aiProviderConfig'

    export let aiProvider: ProviderKind = 'gemini'
    export let apiKey = ''
    export let imageModel = ''
    export let chatModel = ''
    export let imageSize = '1024x1024'
    export let imageQuality: 'standard' | 'hd' = 'standard'
    export let canSave = true
    export let onProviderChange: () => void = () => {}

    // S3 configuration
    export let s3Enabled = false
    export let s3BucketName = ''
    export let s3Region = 'us-east-1'
    export let s3AccessKeyId = ''
    export let s3SecretAccessKey = ''

    const dispatch = createEventDispatcher<{ save: void; close: void }>()

    function handleBackdropClick(): void {
        dispatch('close')
    }

    function handleBackdropKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            dispatch('close')
        }
    }

    function handleProviderSelect(): void {
        onProviderChange()
    }

    function handleSave(): void {
        dispatch('save')
    }

    function handleClose(): void {
        dispatch('close')
    }
</script>

<div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    on:click|self={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
>
    <div class="settings-modal">
        <div class="modal-header">
            <h2>⚙️ AI Provider Configuration</h2>
            <button class="close-btn" on:click={handleClose}>✕</button>
        </div>

        <div class="modal-content">
            <div class="setting-group">
                <label for="provider-select">AI Provider:</label>
                <select
                    id="provider-select"
                    bind:value={aiProvider}
                    on:change={handleProviderSelect}
                >
                    <option value="debug">Debug (Test Images)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                </select>
            </div>

            <div class="setting-group">
                <label for="image-model-select">Image Model:</label>
                <select id="image-model-select" bind:value={imageModel}>
                    {#if aiProvider === 'debug'}
                        <option value="debug-image-provider">Debug Image Provider</option>
                    {:else if aiProvider === 'gemini'}
                        <option value="gemini-2.5-flash-image-preview">
                            Gemini 2.5 Flash (Image Preview)
                        </option>
                        <option value="imagen-4.0-generate-001">
                            Imagen 4.0 (High Quality)
                        </option>
                        <option value="gemini-2.0-flash-exp">
                            Gemini 2.0 Flash (Experimental)
                        </option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    {:else if aiProvider === 'openai'}
                        <option value="gpt-image-1">GPT Image 1 (Latest)</option>
                    {/if}
                </select>
                <div class="setting-info">
                    <p>Model used when generating images in image sessions</p>
                </div>
            </div>

            <div class="setting-group">
                <label for="chat-model-select">Chat Model:</label>
                <select id="chat-model-select" bind:value={chatModel}>
                    {#if aiProvider === 'debug'}
                        <option value="debug-text-provider">Debug Text Provider</option>
                    {:else if aiProvider === 'gemini'}
                        <option value="gemini-2.5-flash-lite">
                            Gemini 2.5 Flash Lite
                        </option>
                        <option value="gemini-2.0-flash-exp">
                            Gemini 2.0 Flash (Experimental)
                        </option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    {:else if aiProvider === 'openai'}
                        <option value="gpt-5-nano">GPT-5 Nano</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                    {/if}
                </select>
                <div class="setting-info">
                    <p>Model used for text conversations in chat sessions</p>
                </div>
            </div>

            <div class="setting-group">
                <label for="api-key">API Key:</label>
                <input
                    id="api-key"
                    type="password"
                    bind:value={apiKey}
                    placeholder={aiProvider === 'debug' ? 'Not required for debug provider' : aiProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                    class="api-key-input"
                    disabled={aiProvider === 'debug'}
                />
            </div>
            <div class="setting-info">
                {#if aiProvider === 'debug'}
                    <p>
                        Debug provider uses a test image and doesn't require an API key.
                        Perfect for testing and development!
                    </p>
                {:else if aiProvider === 'gemini'}
                    <p>
                        Get your API key from
                        <a
                            href="https://makersuite.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Google AI Studio
                        </a>
                    </p>
                {:else if aiProvider === 'openai'}
                    <p>
                        Get your API key from
                        <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noreferrer"
                        >
                            OpenAI Platform
                        </a>
                    </p>
                {/if}
            </div>

            {#if aiProvider === 'openai'}
                <div class="setting-group">
                    <label for="image-size">Image Size:</label>
                    <select id="image-size" bind:value={imageSize}>
                        <option value="1024x1024">1024×1024 (Square)</option>
                        <option value="1024x1792">1024×1792 (Portrait)</option>
                        <option value="1792x1024">1792×1024 (Landscape)</option>
                        <option value="512x512">512×512 (Small)</option>
                        <option value="256x256">256×256 (Tiny)</option>
                    </select>
                    <div class="setting-info">
                        <p>Generated image dimensions</p>
                    </div>
                </div>

                <div class="setting-group">
                    <label for="image-quality">Image Quality:</label>
                    <select id="image-quality" bind:value={imageQuality}>
                        <option value="standard">Standard</option>
                        <option value="hd">HD (Higher cost)</option>
                    </select>
                    <div class="setting-info">
                        <p>Image generation quality level</p>
                    </div>
                </div>
            {/if}

            <!-- S3 Configuration Section -->
            <div class="section-divider">
                <h3>📦 S3 Storage Configuration</h3>
            </div>

            <div class="setting-group">
                <label>
                    <input type="checkbox" bind:checked={s3Enabled} class="s3-checkbox" />
                    Enable S3 Storage
                </label>
                <div class="setting-info">
                    <p>Allow saving generated images directly to AWS S3 bucket</p>
                </div>
            </div>

            {#if s3Enabled}
                <div class="setting-group">
                    <label for="s3-bucket">S3 Bucket Name:</label>
                    <input
                        id="s3-bucket"
                        type="text"
                        bind:value={s3BucketName}
                        placeholder="my-crater-images"
                        class="api-key-input"
                    />
                    <div class="setting-info">
                        <p>The name of your S3 bucket where images will be stored</p>
                    </div>
                </div>

                <div class="setting-group">
                    <label for="s3-region">AWS Region:</label>
                    <select id="s3-region" bind:value={s3Region}>
                        <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                        <option value="us-east-2">US East (Ohio) - us-east-2</option>
                        <option value="us-west-1">US West (N. California) - us-west-1</option>
                        <option value="us-west-2">US West (Oregon) - us-west-2</option>
                        <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                        <option value="eu-west-2">Europe (London) - eu-west-2</option>
                        <option value="eu-central-1">Europe (Frankfurt) - eu-central-1</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                        <option value="ap-southeast-2">Asia Pacific (Sydney) - ap-southeast-2</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
                    </select>
                    <div class="setting-info">
                        <p>AWS region where your S3 bucket is located</p>
                    </div>
                </div>

                <div class="setting-group">
                    <label for="s3-access-key">AWS Access Key ID:</label>
                    <input
                        id="s3-access-key"
                        type="password"
                        bind:value={s3AccessKeyId}
                        placeholder="AKIA..."
                        class="api-key-input"
                    />
                    <div class="setting-info">
                        <p>Your AWS access key with S3 write permissions</p>
                    </div>
                </div>

                <div class="setting-group">
                    <label for="s3-secret-key">AWS Secret Access Key:</label>
                    <input
                        id="s3-secret-key"
                        type="password"
                        bind:value={s3SecretAccessKey}
                        placeholder="***"
                        class="api-key-input"
                    />
                    <div class="setting-info">
                        <p>
                            Your AWS secret access key. Get your credentials from
                            <a
                                href="https://console.aws.amazon.com/iam/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                AWS IAM Console
                            </a>
                        </p>
                    </div>
                </div>
            {/if}
        </div>

        <div class="modal-footer">
            <button
                on:click={handleSave}
                class="save-btn"
                disabled={!canSave}
            >
                Save Settings
            </button>
            <button on:click={handleClose} class="cancel-btn">Cancel</button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(2, 6, 23, 0.8);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }

    .settings-modal {
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid rgba(34, 211, 238, 0.3);
        border-radius: 1rem;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        backdrop-filter: blur(20px);
        box-shadow:
            0 0 30px rgba(34, 211, 238, 0.2),
            inset 0 0 20px rgba(34, 211, 238, 0.05);
        position: relative;
        animation: slideUp 0.3s ease-out;
    }

    .settings-modal::before {
        content: '';
        position: absolute;
        top: 0;
        right: -100%;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, transparent, #22d3ee, transparent);
        animation: scan-line 4s linear infinite reverse;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid rgba(34, 211, 238, 0.3);
        position: relative;
        z-index: 2;
    }

    .modal-header h2 {
        margin: 0;
        color: #22d3ee;
        font-size: 1.25rem;
        font-family: 'Orbitron', monospace;
        font-weight: 700;
        text-shadow: 0 0 10px #22d3ee;
        animation: pulse-glow 2s ease-in-out infinite;
    }

    .close-btn {
        background: transparent;
        color: #22d3ee;
        border: 2px solid rgba(34, 211, 238, 0.3);
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1rem;
        font-family: 'Orbitron', monospace;
        font-weight: 700;
        text-shadow: 0 0 5px #22d3ee;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        background: rgba(34, 211, 238, 0.1);
        box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
        text-shadow: 0 0 10px #22d3ee;
    }

    .modal-content {
        padding: 1.5rem;
        position: relative;
        z-index: 2;
    }

    .setting-group {
        margin-bottom: 1rem;
        position: relative;
        z-index: 2;
    }

    .setting-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #cbd5e1;
        font-family: 'Share Tech Mono', monospace;
        text-shadow: 0 0 3px #cbd5e1;
    }

    .setting-group select,
    .api-key-input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid rgba(6, 182, 212, 0.3);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        background: rgba(2, 6, 23, 0.8);
        color: #e2e8f0;
        font-family: 'Share Tech Mono', monospace;
        transition: all 0.3s ease;
    }

    .setting-group select:focus,
    .api-key-input:focus {
        outline: none;
        border-color: #06b6d4;
        box-shadow: 0 0 20px rgba(6, 182, 212, 0.3),
            inset 0 0 10px rgba(6, 182, 212, 0.1);
        text-shadow: 0 0 5px #06b6d4;
    }

    .setting-info {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #6b7280;
    }

    .setting-info a {
        color: #2563eb;
        text-decoration: underline;
    }

    .modal-footer {
        display: flex;
        gap: 0.75rem;
        padding: 1.5rem;
        border-top: 1px solid rgba(34, 211, 238, 0.3);
        position: relative;
        z-index: 2;
    }

    .save-btn {
        background: #10b981;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .save-btn:hover:not(:disabled) {
        background: #059669;
    }

    .save-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .cancel-btn {
        background: #6b7280;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
    }

    .cancel-btn:hover {
        background: #4b5563;
    }

    .section-divider {
        margin: 2rem 0 1.5rem 0;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(34, 211, 238, 0.2);
    }

    .section-divider h3 {
        margin: 0;
        color: #22d3ee;
        font-size: 1rem;
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        text-shadow: 0 0 8px #22d3ee;
    }

    .s3-checkbox {
        width: auto !important;
        margin-right: 0.5rem;
        accent-color: #06b6d4;
    }

    .setting-group label:has(.s3-checkbox) {
        display: flex;
        align-items: center;
        cursor: pointer;
        margin-bottom: 0.5rem;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideUp {
        from {
            transform: translateY(10%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes scan-line {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-100%);
        }
    }

    @keyframes pulse-glow {
        0%,
        100% {
            text-shadow: 0 0 10px #22d3ee;
        }
        50% {
            text-shadow: 0 0 5px rgba(34, 211, 238, 0.6);
        }
    }
</style>
