<script lang="ts">
  import { currentPage } from '../stores'
  
  function goToSettings() {
    currentPage.set('settings')
  }
</script>

<div class="flex flex-col items-center justify-center min-h-[60vh]">
  <div class="text-center text-vscode-foreground italic my-5 text-lg">
    ⚙️ Configuration Required
  </div>
  <div class="text-center p-5">
    <p class="mb-5 text-vscode-foreground">
      To use the Game Asset Assistant, you need to configure an AI provider with a valid API key.
    </p>
    <button class="btn-primary" on:click={goToSettings}>
      Go to Settings
    </button>
  </div>
</div>

