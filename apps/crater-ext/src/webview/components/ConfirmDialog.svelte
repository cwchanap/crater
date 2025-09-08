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
    class="dialog-backdrop" 
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    tabindex="-1"
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <h3 id="dialog-title">{title}</h3>
      </div>
      
      <div class="dialog-body">
        <p>{message}</p>
      </div>
      
      <div class="dialog-footer">
        <button 
          class="dialog-button cancel-button" 
          on:click={handleCancel}
          type="button"
        >
          {cancelText}
        </button>
        <button 
          class="dialog-button confirm-button" 
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
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(2px);
  }

  .dialog-content {
    background-color: var(--vscode-quickInput-background);
    border: 1px solid var(--vscode-quickInput-border);
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    min-width: 320px;
    max-width: 480px;
    margin: 20px;
    animation: dialogSlideIn 0.2s ease-out;
  }

  @keyframes dialogSlideIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .dialog-header {
    padding: 16px 20px 8px 20px;
    border-bottom: 1px solid var(--vscode-quickInput-border);
  }

  .dialog-header h3 {
    margin: 0;
    color: var(--vscode-quickInput-foreground);
    font-size: 14px;
    font-weight: 600;
  }

  .dialog-body {
    padding: 16px 20px;
  }

  .dialog-body p {
    margin: 0;
    color: var(--vscode-quickInput-foreground);
    font-size: 13px;
    line-height: 1.4;
  }

  .dialog-footer {
    padding: 12px 20px 16px 20px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .dialog-button {
    padding: 8px 16px;
    border: none;
    border-radius: 3px;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    min-width: 80px;
    transition: background-color 0.1s ease;
  }

  .cancel-button {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }

  .cancel-button:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
  }

  .confirm-button {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }

  .confirm-button:hover {
    background-color: var(--vscode-button-hoverBackground);
  }

  .confirm-button:focus,
  .cancel-button:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
</style>