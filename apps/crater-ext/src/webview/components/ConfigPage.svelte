<script lang="ts">
  import { currentPage } from '../stores'
  
  function goToSettings() {
    currentPage.set('settings')
  }
</script>

<div class="config-page">
  <div class="welcome-message">
    ⚙️ Configuration Required
  </div>
  <div class="content">
    <p>
      To use the Game Asset Assistant, you need to configure an AI provider with a valid API key.
    </p>
    <button class="btn" on:click={goToSettings}>
      Go to Settings
    </button>
  </div>
</div>

<style>
  .config-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  .welcome-message {
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    margin: 20px 0;
    font-size: 18px;
  }

  .content {
    text-align: center;
    padding: 20px;
  }

  .content p {
    margin-bottom: 20px;
    color: var(--vscode-descriptionForeground);
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

  .btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
</style>