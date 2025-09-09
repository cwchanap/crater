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

<div class="gallery-container">
  <div class="gallery-header">
    <h2>Generated Images Gallery</h2>
    <p class="gallery-subtitle">
      {#if allImages.length === 0}
        No images generated yet. Start chatting to create some game assets!
      {:else}
        {allImages.length} image{allImages.length > 1 ? 's' : ''} in gallery
      {/if}
    </p>
  </div>
  
  {#if allImages.length > 0}
    <div class="gallery-grid">
      {#each allImages as image}
        <div class="thumbnail-card">
          <div class="thumbnail-container">
            <button
              class="thumbnail-button"
              on:click={() => image.savedPath && openImageInEditor(image.savedPath)}
              disabled={!image.savedPath}
              title={image.savedPath ? `Open ${image.savedPath.split('/').pop()} in VS Code` : 'No saved file to open'}
            >
              <img
                src={image.url.startsWith('data:') || image.url.startsWith('http') 
                  ? image.url 
                  : `data:image/png;base64,${image.url}`}
                alt="Generated: {image.prompt}"
                class="thumbnail"
                on:error={() => console.error('Failed to load thumbnail:', image.url)}
              />
            </button>
            {#if image.savedPath}
              <div class="thumbnail-overlay">
                <button
                  class="open-btn"
                  on:click={() => openImageInEditor(image.savedPath!)}
                  title="Open in VS Code editor"
                >
                  📂 Open
                </button>
              </div>
            {/if}
          </div>
          <div class="thumbnail-caption">
            <p class="prompt-text" title={image.prompt}>{image.prompt}</p>
            {#if image.savedPath}
              <p class="file-path" title={image.savedPath}>
                📁 {image.savedPath.split('/').pop() || 'Unknown file'}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-gallery">
      <div class="empty-icon">🎨</div>
      <h3>No images yet</h3>
      <p>Generate some game assets to see them in the gallery!</p>
    </div>
  {/if}
</div>

<style>
  .gallery-container {
    padding: 16px;
    height: calc(100vh - 200px);
    overflow-y: auto;
  }
  
  .gallery-header {
    margin-bottom: 24px;
    text-align: center;
  }
  
  .gallery-header h2 {
    margin: 0 0 8px 0;
    color: var(--vscode-foreground);
    font-size: 18px;
    font-weight: 600;
  }
  
  .gallery-subtitle {
    margin: 0;
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
  }
  
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    padding: 8px 0;
  }
  
  .thumbnail-card {
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .thumbnail-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border-color: var(--vscode-focusBorder);
  }
  
  .thumbnail-container {
    position: relative;
    width: 100%;
    height: 150px;
    overflow: hidden;
    background-color: var(--vscode-editor-background);
  }

  .thumbnail-button {
    width: 100%;
    height: 100%;
    border: none;
    padding: 0;
    margin: 0;
    background: none;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .thumbnail-button:hover:not(:disabled) {
    opacity: 0.8;
  }

  .thumbnail-button:disabled {
    cursor: default;
  }
  
  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  
  .thumbnail-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .thumbnail-container:hover .thumbnail-overlay {
    opacity: 1;
  }
  
  .open-btn {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .open-btn:hover {
    background-color: var(--vscode-button-hoverBackground);
  }
  
  .thumbnail-caption {
    padding: 12px;
  }
  
  .prompt-text {
    margin: 0 0 4px 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--vscode-foreground);
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
  
  .file-path {
    margin: 0;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .empty-gallery {
    text-align: center;
    padding: 40px 20px;
    color: var(--vscode-descriptionForeground);
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .empty-gallery h3 {
    margin: 0 0 8px 0;
    color: var(--vscode-foreground);
    font-size: 16px;
    font-weight: 500;
  }
  
  .empty-gallery p {
    margin: 0;
    font-size: 14px;
  }
</style>