<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    vscode, 
    currentProvider,
    currentModel, 
    isLoadingSettings, 
    tempApiKeys, 
    imageSettings 
  } from '../stores'
  
  let aiProvider: string = 'gemini'
  let aiModel: string = 'gemini-2.5-flash-image-preview'
  let geminiApiKey: string = ''
  let openaiApiKey: string = ''
  let imageSize: string = 'auto'
  let imageQuality: string = 'auto'
  let autoSaveImages: boolean = true
  let imageSaveDirectory: string = ''

  onMount(() => {
    // Subscribe to store updates - these will be updated by App.svelte when settings arrive
    const unsubscribeProvider = currentProvider.subscribe(value => {
      if (value) aiProvider = value
    })

    const unsubscribeModel = currentModel.subscribe(value => {
      if (value) aiModel = value
    })

    const unsubscribeApiKeys = tempApiKeys.subscribe(keys => {
      geminiApiKey = keys.gemini
      openaiApiKey = keys.openai
    })

    const unsubscribeImageSettings = imageSettings.subscribe(settings => {
      imageSize = settings.size
      imageQuality = settings.quality
    })

    // Handle settings for fields not in stores
    let settingsReceived = false
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'settings') {
        const message = event.data
        imageSaveDirectory = message.imageSaveDirectory || '${workspaceFolder}/images'
        autoSaveImages = message.autoSaveImages ?? true
        settingsReceived = true
      } else if (event.data.type === 'settings-saved') {
        isLoadingSettings.set(false)
      } else if (event.data.type === 'folder-selected') {
        // Update the directory path when user selects a folder via browse dialog
        imageSaveDirectory = event.data.path || imageSaveDirectory
      }
    }

    window.addEventListener('message', handleMessage)

    // Fallback: request settings if not received proactively within 100ms
    setTimeout(() => {
      if (!settingsReceived && $vscode) {
        $vscode.postMessage({ type: 'get-settings' })
      }
    }, 100)

    return () => {
      unsubscribeProvider()
      unsubscribeModel()
      unsubscribeApiKeys()
      unsubscribeImageSettings()
      window.removeEventListener('message', handleMessage)
    }
  })

  function handleSaveSettings() {
    if (!$vscode) return

    isLoadingSettings.set(true)
    
    const apiKey = aiProvider === 'gemini' ? geminiApiKey.trim() : openaiApiKey.trim()
    
    const settings = {
      aiProvider,
      aiModel,
      apiKey,
      imageSize,
      imageQuality,
      autoSaveImages,
      imageSaveDirectory: imageSaveDirectory.trim()
    }

    $vscode.postMessage({ 
      type: 'save-settings', 
      ...settings 
    })
  }

  function handleProviderChange() {
    // Update model based on provider
    if (aiProvider === 'gemini') {
      aiModel = 'gemini-2.5-flash-image-preview'
    } else if (aiProvider === 'openai') {
      aiModel = 'gpt-image-1'
    }
  }

  function handleBrowseFolder() {
    if (!$vscode) return
    
    // Send message to extension to trigger folder browse dialog
    $vscode.postMessage({ type: 'browse-folder' })
  }

  function validateApiKey(key: string, provider: string): boolean {
    if (!key.trim()) return false
    
    if (provider === 'gemini') {
      return key.startsWith('AIza') && key.length > 30
    } else if (provider === 'openai') {
      return key.startsWith('sk-') && key.length > 40
    }
    
    return false
  }

  $: isGeminiKeyValid = validateApiKey(geminiApiKey, 'gemini')
  $: isOpenAIKeyValid = validateApiKey(openaiApiKey, 'openai')
  $: canSave = (aiProvider === 'gemini' && isGeminiKeyValid) || 
               (aiProvider === 'openai' && isOpenAIKeyValid)
</script>

<div class="settings-page">
  <div class="welcome-message">
    Configure your AI provider and API keys below.
  </div>
  
  <div class="section">
    <label for="provider">Model Provider</label>
    <select 
      id="provider" 
      bind:value={aiProvider} 
      on:change={handleProviderChange}
      disabled={$isLoadingSettings}
    >
      <option value="gemini">Google Gemini - Requires API key</option>
      <option value="openai">OpenAI DALL-E - Requires API key</option>
    </select>
    <div class="note">Choose your preferred AI provider for generating game assets</div>
  </div>

  <div class="section">
    <label for="model">AI Model</label>
    <select 
      id="model" 
      bind:value={aiModel}
      disabled={$isLoadingSettings}
    >
      {#if aiProvider === 'gemini'}
        <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash (Image Generation)</option>
        <option value="imagen-4.0-generate-001">Imagen 4.0 (High Quality)</option>
      {:else if aiProvider === 'openai'}
        <option value="gpt-image-1">GPT Image 1 (Latest)</option>
        <option value="dall-e-3">DALL-E 3 (Legacy)</option>
      {/if}
    </select>
    <div class="note">Select the specific model to use for generation</div>
  </div>

  {#if aiProvider === 'gemini'}
    <div class="section">
      <label for="geminiApiKey">Google Gemini API Key</label>
      <input 
        id="geminiApiKey" 
        type="password" 
        bind:value={geminiApiKey}
        placeholder="AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        disabled={$isLoadingSettings}
        class:invalid={geminiApiKey && !isGeminiKeyValid}
        class:valid={isGeminiKeyValid}
      />
      <div class="note">
        Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>
        {#if geminiApiKey && !isGeminiKeyValid}
          <span class="error">• Invalid key format</span>
        {:else if isGeminiKeyValid}
          <span class="success">• Valid key format</span>
        {/if}
      </div>
    </div>
  {:else if aiProvider === 'openai'}
    <div class="section">
      <label for="openaiApiKey">OpenAI API Key</label>
      <input 
        id="openaiApiKey" 
        type="password" 
        bind:value={openaiApiKey}
        placeholder="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        disabled={$isLoadingSettings}
        class:invalid={openaiApiKey && !isOpenAIKeyValid}
        class:valid={isOpenAIKeyValid}
      />
      <div class="note">
        Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>
        {#if openaiApiKey && !isOpenAIKeyValid}
          <span class="error">• Invalid key format</span>
        {:else if isOpenAIKeyValid}
          <span class="success">• Valid key format</span>
        {/if}
      </div>
    </div>
  {/if}

  <div class="section">
    <label for="imageSize">Image Size</label>
    <select 
      id="imageSize" 
      bind:value={imageSize}
      disabled={$isLoadingSettings}
    >
      <option value="auto">Auto (Provider default)</option>
      <option value="256x256">256×256 (Small)</option>
      <option value="512x512">512×512 (Medium)</option>
      <option value="1024x1024">1024×1024 (Large)</option>
      {#if aiProvider === 'openai'}
        <option value="1024x1792">1024×1792 (Portrait)</option>
        <option value="1792x1024">1792×1024 (Landscape)</option>
      {/if}
    </select>
    <div class="note">Generated image dimensions</div>
  </div>

  <div class="section">
    <label for="imageQuality">Image Quality</label>
    <select 
      id="imageQuality" 
      bind:value={imageQuality}
      disabled={$isLoadingSettings}
    >
      <option value="auto">Auto</option>
      <option value="standard">Standard</option>
      <option value="hd">HD (Higher cost)</option>
    </select>
    <div class="note">Image generation quality level</div>
  </div>

  <div class="section">
    <label>
      <input 
        type="checkbox" 
        bind:checked={autoSaveImages}
        disabled={$isLoadingSettings}
      />
      Auto-save generated images
    </label>
    <div class="note">Automatically save generated images to your workspace</div>
  </div>

  {#if autoSaveImages}
    <div class="section">
      <label for="imageSaveDirectory">Save Directory</label>
      <div class="directory-input-group">
        <input 
          id="imageSaveDirectory" 
          type="text" 
          bind:value={imageSaveDirectory}
          placeholder="images/ (relative to workspace root)"
          disabled={$isLoadingSettings}
        />
        <button 
          class="btn browse-btn" 
          type="button"
          disabled={$isLoadingSettings}
          on:click={handleBrowseFolder}
        >
          Browse...
        </button>
      </div>
      <div class="note">Directory where images will be saved. Click Browse to select from filesystem.</div>
    </div>
  {/if}

  <div class="row">
    <button 
      class="btn" 
      class:loading={$isLoadingSettings}
      disabled={!canSave || $isLoadingSettings}
      on:click={handleSaveSettings}
    >
      {#if $isLoadingSettings}
        Saving...
      {:else}
        Save Settings
      {/if}
    </button>
  </div>
</div>

<style>
  .settings-page {
    max-width: 600px;
    margin: 0 auto;
  }

  .welcome-message {
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    margin: 20px 0;
  }

  .section {
    margin-bottom: 16px;
  }

  label {
    display: block;
    margin-bottom: 6px;
    color: var(--vscode-foreground);
  }

  select, input[type="password"], input[type="text"], input[type="checkbox"] {
    box-sizing: border-box;
    padding: 6px 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
  }

  select, input[type="password"], input[type="text"] {
    width: 100%;
  }

  input[type="checkbox"] {
    width: auto;
    margin-right: 8px;
  }

  input.valid {
    border-color: var(--vscode-testing-iconPassed, #73c991);
  }

  input.invalid {
    border-color: var(--vscode-testing-iconFailed, #f85149);
  }

  .note {
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-top: 4px;
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .btn {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  .btn:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn.loading {
    opacity: 0.8;
  }

  .error {
    color: var(--vscode-testing-iconFailed, #f85149);
    font-weight: bold;
  }

  .success {
    color: var(--vscode-testing-iconPassed, #73c991);
    font-weight: bold;
  }

  a {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
  }

  a:hover {
    color: var(--vscode-textLink-activeForeground);
    text-decoration: underline;
  }

  label {
    display: flex;
    align-items: center;
  }

  label input[type="checkbox"] {
    margin-bottom: 0;
  }

  .directory-input-group {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .directory-input-group input {
    flex: 1;
  }

  .browse-btn {
    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
    padding: 6px 12px;
    font-size: 12px;
    white-space: nowrap;
  }

  .browse-btn:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-hoverBackground));
  }
</style>