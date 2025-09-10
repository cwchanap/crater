<script lang="ts">
  import { messages, vscode } from '../stores'
  
  function openImageInEditor(imagePath: string) {
    if (!$vscode || !imagePath) return
    
    $vscode.postMessage({
      type: 'open-image',
      path: imagePath
    })
  }
  
  function extractAllImages() {
    const images: { url: string, prompt: string, savedPath?: string }[] = []
    
    $messages.forEach((message) => {
      if (message.messageType === 'image' && message.imageData) {
        message.imageData.images.forEach((imageUrl, index) => {
          const isDeleted = message.imageData?.imageStates?.deleted?.[index] || false
          const isHidden = message.imageData?.imageStates?.hidden?.[index] || false
          
          if (!isDeleted && !isHidden) {
            images.push({
              url: imageUrl,
              prompt: message.imageData!.prompt,
              savedPath: message.imageData!.savedPaths?.[index]
            })
          }
        })
      }
    })
    
    return images
  }
  
  $: allImages = extractAllImages()
</script>

<div class="p-4 h-full overflow-y-auto">
  <div class="mb-6 text-center">
    <h2 class="m-0 mb-2 text-vscode-foreground text-lg font-semibold">Generated Images Gallery</h2>
    <p class="m-0 text-vscode-foreground text-sm">
      {#if allImages.length === 0}
        No images generated yet. Start chatting to create some game assets!
      {:else}
        {allImages.length} image{allImages.length > 1 ? 's' : ''} in gallery
      {/if}
    </p>
  </div>
  
  {#if allImages.length > 0}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 py-2">
      {#each allImages as image}
        <div class="group bg-vscode-input border border-vscode-border rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-500">
          <div class="relative w-full h-[150px] overflow-hidden bg-vscode-background">
            <button
              class="w-full h-full border-none p-0 m-0 bg-transparent cursor-pointer transition-opacity duration-200 hover:opacity-80 disabled:cursor-default"
              on:click={() => image.savedPath && openImageInEditor(image.savedPath)}
              disabled={!image.savedPath}
              title={image.savedPath ? `Open ${image.savedPath.split('/').pop()} in VS Code` : 'No saved file to open'}
            >
              <img
                src={image.url.startsWith('data:') || image.url.startsWith('http') 
                  ? image.url 
                  : `data:image/png;base64,${image.url}`}
                alt="Generated: {image.prompt}"
                class="w-full h-full object-cover block"
                on:error={() => console.error('Failed to load thumbnail:', image.url)}
              />
            </button>
            {#if image.savedPath}
              <div class="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button
                  class="bg-vscode-button text-white border-none px-4 py-2 rounded cursor-pointer text-xs font-medium transition-colors duration-200 hover:bg-vscode-button-hover"
                  on:click={() => openImageInEditor(image.savedPath!)}
                  title="Open in VS Code editor"
                >
                  📂 Open
                </button>
              </div>
            {/if}
          </div>
          <div class="p-3">
            <p class="m-0 mb-1 text-xs leading-relaxed text-vscode-foreground overflow-hidden break-words" title={image.prompt} style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">{image.prompt}</p>
            {#if image.savedPath}
              <p class="m-0 text-[10px] text-gray-500 font-mono overflow-hidden text-ellipsis whitespace-nowrap" title={image.savedPath}>
                📁 {image.savedPath.split('/').pop() || 'Unknown file'}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center py-10 px-5 text-vscode-foreground">
      <div class="text-5xl mb-4">🎨</div>
      <h3 class="m-0 mb-2 text-vscode-foreground text-base font-medium">No images yet</h3>
      <p class="m-0 text-sm">Generate some game assets to see them in the gallery!</p>
    </div>
  {/if}
</div>

