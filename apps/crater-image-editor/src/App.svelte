<script lang="ts">
    import { onMount } from 'svelte';

    // Initialize webview
    console.log('[Crater Image Editor] Webview initializing');

    interface Settings {
        outputDirectory: string;
        outputFormat: string;
        quality: number;
        preserveOriginal: boolean;
    }

    interface ImageData {
        data: string;
        fileName: string;
        originalPath: string;
        format: string;
        size: number;
    }

    let vscode: any;
    let currentImage: ImageData | null = null;
    let settings: Settings = {
        outputDirectory: '${workspaceFolder}/edited-images',
        outputFormat: 'png',
        quality: 90,
        preserveOriginal: true
    };
    
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let img: HTMLImageElement;
    let isImageLoaded = false;
    
    // Crop state
    let isCropping = false;
    let cropRect = { x: 0, y: 0, width: 0, height: 0 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    
    // Resize state
    let isResizing = false;
    let newWidth = 0;
    let newHeight = 0;
    let maintainAspectRatio = true;
    let originalAspectRatio = 1;


    onMount(() => {
        // Use the globally available vscode API that was acquired in the HTML
        vscode = window.vscode;

        // Try to restore state from VS Code's webview state
        const state = vscode.getState();
        if (state && state.currentImage) {
            console.log('[Crater Image Editor] Restoring state from VS Code storage');
            currentImage = state.currentImage;
            isImageLoaded = state.isImageLoaded || false;
            settings = { ...settings, ...(state.settings || {}) };

            // If we have a restored image, wait for canvas to be ready and load it
            if (currentImage && isImageLoaded) {
                setTimeout(() => {
                    const restoreCanvas = () => {
                        if (canvas) {
                            const canvasContext = canvas.getContext('2d');
                            if (canvasContext) {
                                ctx = canvasContext;
                                console.log('[Crater Image Editor] Restoring image from state');

                                img = new Image();
                                img.onload = () => {
                                    originalAspectRatio = img.width / img.height;
                                    newWidth = img.width;
                                    newHeight = img.height;

                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    ctx.drawImage(img, 0, 0);
                                    console.log('[Crater Image Editor] Image restored from state successfully');
                                };
                                img.src = currentImage.data;
                            }
                        } else {
                            setTimeout(restoreCanvas, 100);
                        }
                    };
                    restoreCanvas();
                }, 100);
            }
        }

        // Request settings on load
        vscode.postMessage({ type: 'get-settings' });

        // Send initialization signal to extension with state info
        let readyAttempts = 0;
        const sendReadySignal = () => {
            readyAttempts++;
            vscode.postMessage({
                type: 'webview-ready',
                attempt: readyAttempts,
                hasCurrentImage: !!currentImage,
                wasReloaded: true // This indicates the webview was reloaded/reinitialized
            });

            // Keep trying every 1 second until we get a response, max 10 attempts
            if (readyAttempts < 10) {
                setTimeout(sendReadySignal, 1000);
            }
        };
        setTimeout(sendReadySignal, 100);

        // Listen for messages from extension
        window.addEventListener('message', handleExtensionMessage);

        return () => {
            window.removeEventListener('message', handleExtensionMessage);
        };
    });

    function handleExtensionMessage(event: MessageEvent) {
        const message = event.data;
        
        switch (message.type) {
            case 'load-image':
                loadImage(message);
                break;
            case 'settings':
                settings = { ...settings, ...message };
                break;
            case 'image-saved':
                showSuccessMessage(`Image saved to: ${message.savedPath}`);
                break;
            case 'test-connection':
            case 'test-response':
            case 'extension-response':
                // Connection test - no action needed
                break;
        }
    }

    // Helper function to check if canvas and context are available
    function isCanvasReady(): boolean {
        return !!(canvas && ctx);
    }

    function loadImage(messageData: any) {
        console.log('[Crater Image Editor Webview] Loading image:', messageData.fileName);

        currentImage = {
            data: messageData.imageData,
            fileName: messageData.fileName,
            originalPath: messageData.originalPath,
            format: messageData.format,
            size: messageData.size
        };

        // Wait for canvas to be available in the DOM
        const initializeCanvas = () => {
            if (canvas) {
                const canvasContext = canvas.getContext('2d');
                if (canvasContext) {
                    ctx = canvasContext;
                    console.log('[Crater Image Editor Webview] Canvas context initialized');

                    // Load image after canvas is ready
                    img = new Image();
                    img.onload = () => {
                        console.log('[Crater Image Editor Webview] Image loaded:', img.width, 'x', img.height);
                        isImageLoaded = true;
                        originalAspectRatio = img.width / img.height;
                        newWidth = img.width;
                        newHeight = img.height;

                        // Resize canvas to fit image
                        if (canvas && ctx) {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            console.log('[Crater Image Editor Webview] Image drawn to canvas');
                        }

                        // Notify extension about image dimensions
                        vscode.postMessage({
                            type: 'update-image-dimensions',
                            width: img.width,
                            height: img.height
                        });
                    };
                    img.onerror = (error) => {
                        console.error('[Crater Image Editor Webview] Error loading image:', error);
                    };
                    img.src = messageData.imageData;
                    console.log('[Crater Image Editor Webview] Set image src, length:', messageData.imageData?.length);
                }
            } else {
                // Canvas not ready yet, try again
                console.log('[Crater Image Editor Webview] Canvas not ready, retrying...');
                setTimeout(initializeCanvas, 100);
            }
        };

        // Start initialization
        setTimeout(initializeCanvas, 50);
    }

    function selectImage() {
        vscode.postMessage({ type: 'select-image' });
    }

    function startCrop() {
        isCropping = true;
        isResizing = false;
        cropRect = { x: 0, y: 0, width: canvas.width / 2, height: canvas.height / 2 };
        redrawCanvas();
    }

    function startResize() {
        isResizing = true;
        isCropping = false;
        redrawCanvas();
    }

    function applyCrop() {
        if (!isImageLoaded || !isCropping) return;
        
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d')!;
        
        croppedCanvas.width = cropRect.width;
        croppedCanvas.height = cropRect.height;
        
        croppedCtx.drawImage(
            canvas,
            cropRect.x, cropRect.y, cropRect.width, cropRect.height,
            0, 0, cropRect.width, cropRect.height
        );
        
        // Update main canvas
        canvas.width = cropRect.width;
        canvas.height = cropRect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(croppedCanvas, 0, 0);
        
        isCropping = false;
        newWidth = canvas.width;
        newHeight = canvas.height;
        originalAspectRatio = newWidth / newHeight;
    }

    function applyResize() {
        if (!isImageLoaded || !isResizing) return;
        
        const resizedCanvas = document.createElement('canvas');
        const resizedCtx = resizedCanvas.getContext('2d')!;
        
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        
        resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        // Update main canvas
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(resizedCanvas, 0, 0);
        
        isResizing = false;
    }

    function saveImage() {
        if (!isImageLoaded) return;
        
        const imageData = canvas.toDataURL(`image/${settings.outputFormat}`, settings.quality / 100);
        
        vscode.postMessage({
            type: 'save-image',
            imageData: imageData,
            outputFormat: settings.outputFormat,
            quality: settings.quality
        });
    }

    function resetImage() {
        if (!currentImage) return;
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            newWidth = img.width;
            newHeight = img.height;
            originalAspectRatio = img.width / img.height;
            isCropping = false;
            isResizing = false;
        };
        img.src = currentImage.data;
    }

    function redrawCanvas() {
        if (!isImageLoaded || !isCanvasReady()) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        if (isCropping) {
            // Draw crop overlay
            ctx.strokeStyle = '#007acc';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
            ctx.setLineDash([]);
            
            // Fill outside crop area with semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, cropRect.y);
            ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height);
            ctx.fillRect(cropRect.x + cropRect.width, cropRect.y, canvas.width - cropRect.x - cropRect.width, cropRect.height);
            ctx.fillRect(0, cropRect.y + cropRect.height, canvas.width, canvas.height - cropRect.y - cropRect.height);
        }
    }

    function handleCanvasMouseDown(event: MouseEvent) {
        if (!isCropping) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if click is inside crop area
        if (x >= cropRect.x && x <= cropRect.x + cropRect.width &&
            y >= cropRect.y && y <= cropRect.y + cropRect.height) {
            isDragging = true;
            dragStart = { x: x - cropRect.x, y: y - cropRect.y };
        }
    }

    function handleCanvasMouseMove(event: MouseEvent) {
        if (!isCropping || !isDragging) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        cropRect.x = Math.max(0, Math.min(x - dragStart.x, canvas.width - cropRect.width));
        cropRect.y = Math.max(0, Math.min(y - dragStart.y, canvas.height - cropRect.height));
        
        redrawCanvas();
    }

    function handleCanvasMouseUp() {
        isDragging = false;
    }

    function handleWidthChange() {
        if (maintainAspectRatio) {
            newHeight = Math.round(newWidth / originalAspectRatio);
        }
    }

    function handleHeightChange() {
        if (maintainAspectRatio) {
            newWidth = Math.round(newHeight * originalAspectRatio);
        }
    }

    function showSuccessMessage(message: string) {
        // Simple success feedback - you could enhance this with a toast component
        console.log(message);
    }

    function saveState() {
        if (vscode) {
            vscode.setState({
                currentImage,
                isImageLoaded,
                settings
            });
        }
    }

    $: if (isImageLoaded) {
        redrawCanvas();
    }

    // Save state whenever currentImage or settings change
    $: if (currentImage) {
        saveState();
    }

    $: if (settings) {
        saveState();
    }
</script>

<div class="h-full flex flex-col p-4 bg-vscode-background text-vscode-foreground">
    <div class="mb-4">
        <h1 class="text-xl font-bold mb-2">Crater Image Editor</h1>
        
        
        {#if !currentImage}
            <div class="text-center py-8">
                <p class="mb-4 text-gray-400">No image loaded</p>
                <button 
                    on:click={selectImage}
                    class="px-4 py-2 bg-vscode-button text-white rounded hover:bg-vscode-button-hover"
                >
                    Select Image
                </button>
            </div>
        {:else}
            <div class="flex flex-wrap gap-2 mb-4">
                <button 
                    on:click={selectImage}
                    class="px-3 py-1 text-sm bg-vscode-button text-white rounded hover:bg-vscode-button-hover"
                >
                    Load Different Image
                </button>
                <button 
                    on:click={startCrop}
                    class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={isCropping}
                >
                    {isCropping ? 'Cropping...' : 'Crop'}
                </button>
                <button 
                    on:click={startResize}
                    class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={isResizing}
                >
                    {isResizing ? 'Resizing...' : 'Resize'}
                </button>
                <button 
                    on:click={resetImage}
                    class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    Reset
                </button>
                <button 
                    on:click={saveImage}
                    class="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                    Save
                </button>
            </div>
            
            {#if currentImage}
                <div class="mb-4 p-3 bg-gray-800 rounded text-sm">
                    <p><strong>File:</strong> {currentImage.fileName}</p>
                    <p><strong>Format:</strong> {currentImage.format.toUpperCase()}</p>
                    <p><strong>Size:</strong> {Math.round(currentImage.size / 1024)} KB</p>
                    {#if isImageLoaded}
                        <p><strong>Dimensions:</strong> {canvas.width} × {canvas.height}</p>
                    {/if}
                </div>
            {/if}
        {/if}
    </div>
    
    {#if isCropping}
        <div class="mb-4 p-3 bg-blue-900 rounded">
            <h3 class="font-semibold mb-2">Crop Mode</h3>
            <p class="text-sm mb-2">Click and drag the blue rectangle to position your crop area.</p>
            <div class="flex gap-2">
                <button 
                    on:click={applyCrop}
                    class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Apply Crop
                </button>
                <button 
                    on:click={() => { isCropping = false; redrawCanvas(); }}
                    class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    Cancel
                </button>
            </div>
        </div>
    {/if}
    
    {#if isResizing}
        <div class="mb-4 p-3 bg-green-900 rounded">
            <h3 class="font-semibold mb-2">Resize Mode</h3>
            <div class="flex flex-col gap-2 mb-2">
                <label class="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        bind:checked={maintainAspectRatio}
                        class="rounded"
                    />
                    Maintain aspect ratio
                </label>
                <div class="flex gap-4">
                    <label class="flex flex-col">
                        Width:
                        <input 
                            type="number" 
                            bind:value={newWidth}
                            on:input={handleWidthChange}
                            min="1"
                            class="w-20 px-2 py-1 bg-vscode-input border border-vscode-border rounded"
                        />
                    </label>
                    <label class="flex flex-col">
                        Height:
                        <input 
                            type="number" 
                            bind:value={newHeight}
                            on:input={handleHeightChange}
                            min="1"
                            class="w-20 px-2 py-1 bg-vscode-input border border-vscode-border rounded"
                        />
                    </label>
                </div>
            </div>
            <div class="flex gap-2">
                <button 
                    on:click={applyResize}
                    class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                    Apply Resize
                </button>
                <button 
                    on:click={() => { isResizing = false; redrawCanvas(); }}
                    class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    Cancel
                </button>
            </div>
        </div>
    {/if}
    
    {#if currentImage}
        <div class="flex-1 overflow-auto">
            <div class="flex justify-center">
                <canvas 
                    bind:this={canvas}
                    on:mousedown={handleCanvasMouseDown}
                    on:mousemove={handleCanvasMouseMove}
                    on:mouseup={handleCanvasMouseUp}
                    class="border border-vscode-border max-w-full max-h-96 object-contain"
                    style="cursor: {isCropping ? 'crosshair' : 'default'}"
                ></canvas>
            </div>
        </div>
        
        <div class="mt-4 p-3 bg-gray-800 rounded">
            <h3 class="font-semibold mb-2">Export Settings</h3>
            <div class="flex flex-wrap gap-4">
                <label class="flex flex-col">
                    Format:
                    <select 
                        bind:value={settings.outputFormat}
                        class="px-2 py-1 bg-vscode-input border border-vscode-border rounded"
                    >
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="jpeg">JPEG</option>
                        <option value="webp">WebP</option>
                    </select>
                </label>
                {#if settings.outputFormat !== 'png'}
                    <label class="flex flex-col">
                        Quality:
                        <input 
                            type="range" 
                            bind:value={settings.quality}
                            min="1" 
                            max="100"
                            class="w-20"
                        />
                        <span class="text-xs text-gray-400">{settings.quality}%</span>
                    </label>
                {/if}
            </div>
        </div>
    {/if}
</div>