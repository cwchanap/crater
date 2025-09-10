<script lang="ts">
  export let show = false
  export let title = "Confirm Action"
  export let message = "Are you sure you want to proceed?"
  export let confirmText = "Confirm"
  export let cancelText = "Cancel"
  export let onConfirm: () => void = () => {}
  export let onCancel: () => void = () => {}

  function handleConfirm() {
    onConfirm()
    show = false
  }

  function handleCancel() {
    onCancel()
    show = false
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel()
    } else if (event.key === 'Enter') {
      handleConfirm()
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel()
    }
  }
</script>

{#if show}
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] backdrop-blur-sm" 
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    tabindex="-1"
  >
    <div class="card min-w-80 max-w-96 m-5 shadow-2xl animate-slideIn">
      <div class="px-5 pt-4 pb-2 border-b" style="border-color: var(--vscode-quickInput-border);">
        <h3 id="dialog-title" class="m-0 text-sm font-semibold" style="color: var(--vscode-quickInput-foreground);">
          {title}
        </h3>
      </div>
      
      <div class="px-5 py-4">
        <p class="m-0 text-xs leading-relaxed" style="color: var(--vscode-quickInput-foreground);">
          {message}
        </p>
      </div>
      
      <div class="px-5 pb-4 pt-3 flex gap-2 justify-end">
        <button 
          class="btn-secondary text-xs px-4 py-2 min-w-20 focus:ring-2 focus:ring-offset-2" 
          style="focus:ring-color: var(--vscode-focusBorder);"
          on:click={handleCancel}
          type="button"
        >
          {cancelText}
        </button>
        <button 
          class="btn-primary text-xs px-4 py-2 min-w-20 focus:ring-2 focus:ring-offset-2" 
          style="focus:ring-color: var(--vscode-focusBorder);"
          on:click={handleConfirm}
          type="button"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideIn {
    from {
      transform: translateY(10px);
      opacity: 0;
      scale: 0.9;
    }
    to {
      transform: translateY(0);
      opacity: 1;
      scale: 1;
    }
  }
  
  .animate-slideIn {
    animation: slideIn 0.2s ease-out;
  }
</style>