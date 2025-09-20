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
            // Reset isImageLoaded to false during restoration to ensure proper loading
            isImageLoaded = false;
            settings = { ...settings, ...(state.settings || {}) };

            // If we have a restored image, wait for canvas to be ready and load it
            if (currentImage) {
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

                                    // Set isImageLoaded to true only after canvas is drawn
                                    isImageLoaded = true;
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

<div class="h-full flex flex-col bg-vscode-background text-vscode-foreground">
    <!-- Header Section -->
    <div class="flex-shrink-0 border-b border-vscode-border p-4">
        <h1 class="text-lg font-semibold mb-3">Crater Image Editor</h1>

        {#if !currentImage || !isImageLoaded}
            <div class="text-center py-6">
                <div class="mb-4">
                    <div class="w-16 h-16 mx-auto mb-3 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center">
                        <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <p class="text-sm text-gray-400 mb-4">
                        {#if currentImage && !isImageLoaded}
                            Loading image...
                        {:else}
                            No image loaded
                        {/if}
                    </p>
                </div>
                <button
                    on:click={selectImage}
                    class="px-6 py-2 bg-vscode-button text-white rounded-md hover:bg-vscode-button-hover transition-colors font-medium"
                    disabled={currentImage && !isImageLoaded}
                >
                    Select Image
                </button>
            </div>
        {:else}
            <!-- Action Buttons -->
            <div class="space-y-3">
                <!-- Primary Actions -->
                <div class="flex flex-wrap gap-2">
                    <button
                        on:click={selectImage}
                        class="px-4 py-2 text-sm bg-vscode-button text-white rounded-md hover:bg-vscode-button-hover transition-colors font-medium"
                    >
                        Load Different Image
                    </button>
                </div>

                <!-- Tool Actions -->
                <div class="flex flex-wrap gap-2">
                    <button
                        on:click={startCrop}
                        class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isCropping}
                    >
                        {isCropping ? 'Cropping...' : 'Crop'}
                    </button>
                    <button
                        on:click={startResize}
                        class="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isResizing}
                    >
                        {isResizing ? 'Resizing...' : 'Resize'}
                    </button>
                    <button
                        on:click={resetImage}
                        class="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                    >
                        Reset
                    </button>
                    <button
                        on:click={saveImage}
                        class="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
                    >
                        Save
                    </button>
                </div>
            </div>
        {/if}
    </div>

    <!-- File Information -->
    {#if currentImage}
        <div class="flex-shrink-0 border-b border-vscode-border px-4 py-3">
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div class="text-gray-400">File:</div>
                <div class="font-medium truncate">{currentImage.fileName}</div>
                <div class="text-gray-400">Format:</div>
                <div class="font-medium">{currentImage.format.toUpperCase()}</div>
                <div class="text-gray-400">Size:</div>
                <div class="font-medium">{Math.round(currentImage.size / 1024)} KB</div>
                {#if isImageLoaded}
                    <div class="text-gray-400">Dimensions:</div>
                    <div class="font-medium">{canvas.width} × {canvas.height}</div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Mode Panels -->
    {#if isCropping}
        <div class="flex-shrink-0 border-b border-vscode-border bg-blue-950/30 px-4 py-3">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h3 class="font-medium text-blue-300">Crop Mode</h3>
                </div>
            </div>
            <p class="text-sm text-gray-300 mb-3">Click and drag the blue rectangle to position your crop area.</p>
            <div class="flex gap-2">
                <button
                    on:click={applyCrop}
                    class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                    Apply Crop
                </button>
                <button
                    on:click={() => { isCropping = false; redrawCanvas(); }}
                    class="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
    {/if}

    {#if isResizing}
        <div class="flex-shrink-0 border-b border-vscode-border bg-green-950/30 px-4 py-3">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    <h3 class="font-medium text-green-300">Resize Mode</h3>
                </div>
            </div>
            <div class="space-y-3 mb-3">
                <label class="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        bind:checked={maintainAspectRatio}
                        class="rounded border-vscode-border"
                    />
                    <span class="text-gray-300">Maintain aspect ratio</span>
                </label>
                <div class="grid grid-cols-2 gap-3">
                    <label class="space-y-1">
                        <span class="text-sm text-gray-400">Width</span>
                        <input
                            type="number"
                            bind:value={newWidth}
                            on:input={handleWidthChange}
                            min="1"
                            class="w-full px-3 py-2 bg-vscode-input border border-vscode-border rounded-md text-sm"
                        />
                    </label>
                    <label class="space-y-1">
                        <span class="text-sm text-gray-400">Height</span>
                        <input
                            type="number"
                            bind:value={newHeight}
                            on:input={handleHeightChange}
                            min="1"
                            class="w-full px-3 py-2 bg-vscode-input border border-vscode-border rounded-md text-sm"
                        />
                    </label>
                </div>
            </div>
            <div class="flex gap-2">
                <button
                    on:click={applyResize}
                    class="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                    Apply Resize
                </button>
                <button
                    on:click={() => { isResizing = false; redrawCanvas(); }}
                    class="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
    {/if}

    <!-- Canvas Area -->
    {#if currentImage}
        <div class="flex-1 overflow-hidden flex flex-col">
            <div class="flex-1 overflow-auto p-4">
                <div class="flex justify-center items-center min-h-full">
                    <div class="relative">
                        <canvas
                            bind:this={canvas}
                            on:mousedown={handleCanvasMouseDown}
                            on:mousemove={handleCanvasMouseMove}
                            on:mouseup={handleCanvasMouseUp}
                            class="border border-vscode-border shadow-lg max-w-full max-h-[calc(100vh-400px)] object-contain"
                            style="cursor: {isCropping ? 'crosshair' : 'default'}"
                        ></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Export Settings Panel -->
        <div class="flex-shrink-0 border-t border-vscode-border p-4">
            <h3 class="font-medium mb-3 text-sm">Export Settings</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label class="space-y-1">
                    <span class="text-sm text-gray-400">Format</span>
                    <select
                        bind:value={settings.outputFormat}
                        class="w-full px-3 py-2 bg-vscode-input border border-vscode-border rounded-md text-sm"
                    >
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="jpeg">JPEG</option>
                        <option value="webp">WebP</option>
                    </select>
                </label>
                {#if settings.outputFormat !== 'png'}
                    <label class="space-y-1">
                        <span class="text-sm text-gray-400">Quality</span>
                        <div class="flex items-center gap-3">
                            <input
                                type="range"
                                bind:value={settings.quality}
                                min="1"
                                max="100"
                                class="flex-1"
                            />
                            <span class="text-sm font-medium w-12 text-right">{settings.quality}%</span>
                        </div>
                    </label>
                {/if}
            </div>
        </div>
    {/if}
</div>