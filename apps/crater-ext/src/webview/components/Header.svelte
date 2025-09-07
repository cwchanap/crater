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

<header class="header">
  <div class="header-left">
    {#if $currentPage === 'settings'}
      <button class="back-btn" on:click={goBack}>← Back</button>
    {/if}
    <div>
      <h2>{pageTitle}</h2>
      {#if $currentPage === 'chat'}
        <div class="provider-info">
          AI Provider: {getProviderName($currentProvider)}
        </div>
      {/if}
    </div>
  </div>
  
  {#if $currentPage !== 'settings'}
    <button class="settings-btn" on:click={openSettings}>⚙️ Settings</button>
  {/if}
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 12px;
    background-color: var(--vscode-badge-background);
    border-radius: 6px;
  }

  .header h2 {
    margin: 0;
    color: var(--vscode-badge-foreground);
    font-size: 16px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .back-btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 11px;
  }

  .back-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  .settings-btn {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 11px;
  }

  .settings-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }

  .provider-info {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
  }
</style>