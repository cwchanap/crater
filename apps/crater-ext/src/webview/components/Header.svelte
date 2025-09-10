<script lang="ts">
  import { currentPage, currentProvider } from '../stores'

  let pageTitle = '🎮 Game Asset Assistant'
  
  $: {
    switch ($currentPage) {
      case 'chat':
        pageTitle = '🎮 Game Asset Assistant'
        break
      case 'config':
        pageTitle = '🎮 Game Asset Assistant'
        break
      case 'settings':
        pageTitle = '⚙️ Settings'
        break
    }
  }

  function goBack() {
    currentPage.set('chat')
  }

  function openSettings() {
    currentPage.set('settings')
  }

  function getProviderName(provider: string | null): string {
    if (!provider) return 'Not configured'
    
    const names: Record<string, string> = {
      'gemini': 'Google Gemini',
      'openai': 'OpenAI GPT'
    }
    return names[provider] || provider
  }
</script>

<header class="flex justify-between items-center p-3 rounded-md card flex-shrink-0">
  <div class="flex items-center gap-2">
    {#if $currentPage === 'settings'}
      <button 
        class="btn-secondary text-xs px-2 py-1" 
        on:click={goBack}
      >
        ← Back
      </button>
    {/if}
    <div>
      <h2 class="m-0 text-base font-medium" style="color: var(--vscode-badge-foreground);">
        {pageTitle}
      </h2>
      {#if $currentPage === 'chat'}
        <div class="text-xs mt-1" style="color: var(--vscode-descriptionForeground);">
          AI Provider: {getProviderName($currentProvider)}
        </div>
      {/if}
    </div>
  </div>
  
  {#if $currentPage !== 'settings'}
    <button 
      class="btn-primary text-xs px-2 py-1" 
      on:click={openSettings}
    >
      ⚙️ Settings
    </button>
  {/if}
</header>