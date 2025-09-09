<script lang="ts">
  export let x = 0
  export let y = 0
  export let show = false
  export let imageIndex = 0
  export let isDeleted = false
  export let isHidden = false
  export let savedPath = ''
  export let onDelete: (index: number) => void = () => {}
  export let onToggleVisibility: (index: number) => void = () => {}
  export let onOpenImage: (index: number) => void = () => {}
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

  function handleOpenImage() {
    onOpenImage(imageIndex)
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
    class="fixed z-[1000] min-w-32 py-0.5 rounded shadow-lg border" 
    style="left: {x}px; top: {y}px; background-color: var(--vscode-menu-background); border-color: var(--vscode-menu-border);"
  >
    {#if !isDeleted}
      {#if savedPath}
        <button 
          class="menu-item flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-left border-none bg-transparent cursor-pointer whitespace-nowrap transition-colors"
          style="color: var(--vscode-menu-foreground);"
          on:click={handleOpenImage}
        >
          📂 Open in Editor
        </button>
      {/if}
      <button 
        class="menu-item flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-left border-none bg-transparent cursor-pointer whitespace-nowrap transition-colors"
        style="color: var(--vscode-menu-foreground);"
        on:click={handleToggleVisibility}
      >
        {isHidden ? '👁️ Show Image' : '🙈 Hide Image'}
      </button>
      <button 
        class="menu-item flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-left border-none bg-transparent cursor-pointer whitespace-nowrap transition-colors"
        style="color: var(--vscode-menu-foreground);"
        on:click={handleDelete}
      >
        🗑️ Delete Image
      </button>
    {:else}
      <div 
        class="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs cursor-default whitespace-nowrap italic"
        style="color: var(--vscode-descriptionForeground);"
      >
        Image deleted
      </div>
    {/if}
  </div>
{/if}

<style>
  .menu-item:hover {
    background-color: var(--vscode-menu-selectionBackground);
    color: var(--vscode-menu-selectionForeground);
  }
</style>