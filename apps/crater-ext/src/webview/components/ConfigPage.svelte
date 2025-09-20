<script lang="ts">
  import { currentPage } from '../stores'
  
  function goToSettings() {
    currentPage.set('settings')
  }
</script>

<div class="flex flex-col items-center justify-center min-h-[60vh] p-8">
  <div class="text-center max-w-md space-y-6">
    <div class="text-6xl mb-4">⚙️</div>

    <div class="space-y-3">
      <h2 class="text-xl font-semibold text-vscode-foreground">
        Configuration Required
      </h2>
      <p class="text-vscode-foreground opacity-75 leading-relaxed">
        To use the Game Asset Assistant, you need to configure an AI provider with a valid API key.
      </p>
    </div>

    <button class="btn-primary px-6 py-3 text-sm flex items-center gap-2 mx-auto" on:click={goToSettings}>
      <span>→</span>
      <span>Go to Settings</span>
    </button>
  </div>
</div>

