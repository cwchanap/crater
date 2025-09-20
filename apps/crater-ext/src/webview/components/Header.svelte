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

<header class="header-section flex-shrink-0">
  <div class="flex items-center gap-3">
    {#if $currentPage === 'settings'}
      <button
        class="btn-ghost text-sm px-2 py-1.5 flex items-center gap-1.5"
        on:click={goBack}
        title="Go back to chat"
      >
        <span class="text-lg">←</span>
        <span>Back</span>
      </button>
    {/if}
    <div class="flex flex-col">
      <h2 class="text-lg font-semibold text-vscode-foreground m-0">
        {pageTitle}
      </h2>
      {#if $currentPage === 'chat'}
        <div class="text-xs text-vscode-foreground opacity-75 mt-0.5">
          Provider: {getProviderName($currentProvider)}
        </div>
      {/if}
    </div>
  </div>

  {#if $currentPage !== 'settings'}
    <button
      class="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
      on:click={openSettings}
      title="Open Settings"
    >
      <span>⚙️</span>
      <span>Settings</span>
    </button>
  {/if}
</header>