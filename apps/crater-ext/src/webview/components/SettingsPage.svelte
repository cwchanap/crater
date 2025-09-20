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
  
  // Using stores directly for provider and model, no need for local variables
  let geminiApiKey: string = ''
  let openaiApiKey: string = ''
  let imageSize: string = 'auto'
  let imageQuality: string = 'auto'
  let autoSaveImages: boolean = true
  let imageSaveDirectory: string = ''

  $: if ($tempApiKeys) {
    geminiApiKey = $tempApiKeys.gemini
    openaiApiKey = $tempApiKeys.openai
  }
  $: if ($imageSettings) {
    imageSize = $imageSettings.size
    imageQuality = $imageSettings.quality
  }

  onMount(() => {

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

    // Always request fresh settings when settings page loads
    if ($vscode) {
      $vscode.postMessage({ type: 'get-settings' })
    }
    
    // Fallback: request settings again if not received within 200ms
    setTimeout(() => {
      if (!settingsReceived && $vscode) {
        $vscode.postMessage({ type: 'get-settings' })
      }
    }, 200)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  })

  function handleSaveSettings() {
    if (!$vscode) return

    isLoadingSettings.set(true)
    
    const apiKey = $currentProvider === 'gemini' ? geminiApiKey.trim() : openaiApiKey.trim()
    
    const settings = {
      aiProvider: $currentProvider,
      aiModel: $currentModel,
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

  // Track previous provider to detect actual changes
  let previousProvider = $currentProvider
  
  // Only reset model when provider actually changes from user interaction
  $: {
    if ($currentProvider && $currentProvider !== previousProvider && previousProvider) {
      // Only reset if this seems like a user action (both values are non-empty)
      if ($currentProvider === 'gemini') {
        currentModel.set('gemini-2.5-flash-image-preview')
      } else if ($currentProvider === 'openai') {
        currentModel.set('gpt-image-1')
      }
    }
    previousProvider = $currentProvider
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
  $: canSave = ($currentProvider === 'gemini' && isGeminiKeyValid) || 
               ($currentProvider === 'openai' && isOpenAIKeyValid)
</script>

<div class="max-w-2xl mx-auto p-4">
  <div class="text-center mb-8">
    <div class="text-xl font-semibold text-vscode-foreground mb-2">
      ⚙️ Settings
    </div>
    <div class="text-sm text-vscode-foreground opacity-75">
      Configure your AI provider and API keys below
    </div>
  </div>

  <div class="form-group">
    <label for="provider" class="form-label">Model Provider</label>
    <select 
      id="provider" 
      bind:value={$currentProvider} 
      disabled={$isLoadingSettings}
      class="input-field"
    >
      <option value="gemini">Google Gemini - Requires API key</option>
      <option value="openai">OpenAI DALL-E - Requires API key</option>
    </select>
    <div class="form-help">Choose your preferred AI provider for generating game assets</div>
  </div>

  <div class="form-group">
    <label for="model" class="form-label">AI Model</label>
    <select 
      id="model" 
      bind:value={$currentModel}
      disabled={$isLoadingSettings}
      class="input-field"
    >
      {#if $currentProvider === 'gemini'}
        <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash (Image Preview)</option>
        <option value="imagen-4.0-generate-001">Imagen 4.0 (High Quality)</option>
        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
      {:else if $currentProvider === 'openai'}
        <option value="gpt-image-1">GPT Image 1 (Latest)</option>
      {/if}
    </select>
    <div class="form-help">Select the specific model to use for generation</div>
  </div>

  {#if $currentProvider === 'gemini'}
    <div class="form-group">
      <label for="geminiApiKey" class="form-label">Google Gemini API Key</label>
      <input 
        id="geminiApiKey" 
        type="password" 
        bind:value={geminiApiKey}
        placeholder="AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        disabled={$isLoadingSettings}
        class="input-field {geminiApiKey && !isGeminiKeyValid ? 'border-red-500' : ''} {isGeminiKeyValid ? 'border-green-500' : ''}"
      />
      <div class="form-help">
        Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a>
        {#if geminiApiKey && !isGeminiKeyValid}
          <span class="status-badge status-error ml-2">Invalid format</span>
        {:else if isGeminiKeyValid}
          <span class="status-badge status-success ml-2">Valid format</span>
        {/if}
      </div>
    </div>
  {:else if $currentProvider === 'openai'}
    <div class="form-group">
      <label for="openaiApiKey" class="form-label">OpenAI API Key</label>
      <input 
        id="openaiApiKey" 
        type="password" 
        bind:value={openaiApiKey}
        placeholder="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        disabled={$isLoadingSettings}
        class="input-field {openaiApiKey && !isOpenAIKeyValid ? 'border-red-500' : ''} {isOpenAIKeyValid ? 'border-green-500' : ''}"
      />
      <div class="form-help">
        Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-400 hover:text-blue-300 underline">OpenAI Platform</a>
        {#if openaiApiKey && !isOpenAIKeyValid}
          <span class="status-badge status-error ml-2">Invalid format</span>
        {:else if isOpenAIKeyValid}
          <span class="status-badge status-success ml-2">Valid format</span>
        {/if}
      </div>
    </div>
  {/if}

  {#if $currentProvider === 'openai'}
  <div class="form-group">
    <label for="imageSize" class="form-label">Image Size</label>
    <select 
      id="imageSize" 
      bind:value={imageSize}
      disabled={$isLoadingSettings}
      class="input-field"
    >
      <option value="auto">Auto (Provider default)</option>
      <option value="256x256">256×256 (Small)</option>
      <option value="512x512">512×512 (Medium)</option>
      <option value="1024x1024">1024×1024 (Large)</option>
      <option value="1024x1792">1024×1792 (Portrait)</option>
      <option value="1792x1024">1792×1024 (Landscape)</option>
    </select>
    <div class="form-help">Generated image dimensions</div>
  </div>
  {/if}

  {#if $currentProvider === 'openai'}
  <div class="form-group">
    <label for="imageQuality" class="form-label">Image Quality</label>
    <select 
      id="imageQuality" 
      bind:value={imageQuality}
      disabled={$isLoadingSettings}
      class="input-field"
    >
      <option value="auto">Auto</option>
      <option value="standard">Standard</option>
      <option value="hd">HD (Higher cost)</option>
    </select>
    <div class="form-help">Image generation quality level</div>
  </div>
  {/if}

  <div class="form-group">
    <label class="flex items-center text-vscode-foreground cursor-pointer hover:opacity-80 transition-opacity">
      <input
        type="checkbox"
        bind:checked={autoSaveImages}
        disabled={$isLoadingSettings}
        class="w-4 h-4 mr-3 accent-blue-500"
      />
      <span class="form-label mb-0">Auto-save generated images</span>
    </label>
    <div class="form-help mt-1">Automatically save generated images to your workspace</div>
  </div>

  {#if autoSaveImages}
    <div class="form-group">
      <label for="imageSaveDirectory" class="form-label">Save Directory</label>
      <div class="flex gap-2 items-center">
        <input 
          id="imageSaveDirectory" 
          type="text" 
          bind:value={imageSaveDirectory}
          placeholder="images/ (relative to workspace root)"
          disabled={$isLoadingSettings}
          class="input-field flex-1"
        />
        <button
          class="btn-secondary px-4 py-2.5 text-sm whitespace-nowrap flex items-center gap-2"
          type="button"
          disabled={$isLoadingSettings}
          on:click={handleBrowseFolder}
        >
          <span>📁</span>
          <span>Browse</span>
        </button>
      </div>
      <div class="form-help">Directory where images will be saved. Click Browse to select from filesystem.</div>
    </div>
  {/if}

  <div class="flex justify-end mt-8 pt-6 border-t border-vscode-border">
    <button
      class="btn-primary px-6 py-3 text-sm min-w-fit whitespace-nowrap flex items-center gap-2 {$isLoadingSettings ? 'opacity-80' : ''}"
      disabled={!canSave || $isLoadingSettings}
      on:click={handleSaveSettings}
    >
      {#if $isLoadingSettings}
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Saving...</span>
      {:else}
        <span>✓</span>
        <span>Save Settings</span>
      {/if}
    </button>
  </div>
</div>

