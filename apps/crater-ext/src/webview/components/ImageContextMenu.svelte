<script lang="ts">
  export let x = 0
  export let y = 0
  export let show = false
  export let imageIndex = 0
  export let isDeleted = false
  export let isHidden = false
  export let onDelete: (index: number) => void = () => {}
  export let onToggleVisibility: (index: number) => void = () => {}
  export let onClose: () => void = () => {}

  let menuElement: HTMLDivElement

  $: if (show && menuElement) {
    // Ensure menu doesn't go off screen
    const rect = menuElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10
    }
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10
    }
  }

  function handleDelete() {
    onDelete(imageIndex)
    onClose()
  }

  function handleToggleVisibility() {
    onToggleVisibility(imageIndex)
    onClose()
  }

  function handleClickOutside(event: MouseEvent) {
    if (menuElement && !menuElement.contains(event.target as Node)) {
      onClose()
    }
  }

  $: if (show) {
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
</script>

{#if show}
  <div 
    bind:this={menuElement}
    class="context-menu" 
    style="left: {x}px; top: {y}px;"
  >
    {#if !isDeleted}
      <button class="menu-item" on:click={handleDelete}>
        🗑️ Delete Image
      </button>
      <button class="menu-item" on:click={handleToggleVisibility}>
        {isHidden ? '👁️ Show Image' : '🙈 Hide Image'}
      </button>
    {:else}
      <div class="menu-item disabled">
        Image deleted
      </div>
    {/if}
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    background-color: var(--vscode-menu-background);
    border: 1px solid var(--vscode-menu-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    min-width: 120px;
    padding: 2px 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: none;
    color: var(--vscode-menu-foreground);
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
  }

  .menu-item:hover:not(.disabled) {
    background-color: var(--vscode-menu-selectionBackground);
    color: var(--vscode-menu-selectionForeground);
  }

  .menu-item.disabled {
    color: var(--vscode-descriptionForeground);
    cursor: default;
    font-style: italic;
  }
</style>