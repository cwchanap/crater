import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

interface WebviewMessage {
    type: string
    imagePath?: string
    imageData?: string
    cropData?: {
        x: number
        y: number
        width: number
        height: number
    }
    resizeData?: {
        width: number
        height: number
    }
    outputFormat?: string
    quality?: number
    [key: string]: unknown
}

interface ImageEditSession {
    id: string
    originalPath: string
    originalData: string
    fileName: string
    dimensions: { width: number; height: number }
    format: string
    size: number
    createdAt: string
}

export class ImageEditorProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'crater-image-editor.editorView'
    private _view?: vscode.WebviewView
    private _extensionContext?: vscode.ExtensionContext
    private _currentSession: ImageEditSession | null = null
    private _fileWatcher?: vscode.FileSystemWatcher

    constructor(
        private readonly _extensionUri: vscode.Uri,
        extensionContext?: vscode.ExtensionContext
    ) {
        console.log(
            '[Crater Image Editor] ImageEditorProvider constructor called'
        )
        console.log(
            '[Crater Image Editor] Extension URI in constructor:',
            _extensionUri.toString()
        )

        this._extensionContext = extensionContext
        this.setupDevelopmentWatcher()
    }

    private setupDevelopmentWatcher(): void {
        const isHMREnabled =
            process.env.NODE_ENV === 'development' ||
            process.env.CRATER_HMR_ENABLED === 'true'

        if (!isHMREnabled) {
            console.log(
                '[Crater Image Editor] HMR not enabled, skipping development watcher'
            )
            return
        }

        try {
            console.log(
                '[Crater Image Editor] Setting up development file watchers...'
            )

            const handleFileChange = async (uri?: vscode.Uri) => {
                const fileName = uri ? path.basename(uri.fsPath) : 'unknown'
                console.log(
                    `[Crater Image Editor] 🔥 Dev: ${fileName} changed, triggering refresh...`
                )

                try {
                    await vscode.commands.executeCommand(
                        'workbench.action.webview.reloadWebviewAction'
                    )
                    console.log(
                        '[Crater Image Editor] ✅ Webview reloaded via VS Code command'
                    )
                    vscode.window.setStatusBarMessage(
                        `🔥 ${fileName} → webview reloaded`,
                        2000
                    )
                } catch {
                    console.log(
                        '[Crater Image Editor] 🔄 Fallback: Manual webview refresh'
                    )
                    if (this._view) {
                        this._view.webview.html = this._getHtmlForWebview(
                            this._view.webview
                        )
                    }
                    vscode.window.setStatusBarMessage(
                        `🔄 ${fileName} → manual refresh`,
                        2000
                    )
                }
            }

            const distJsPattern = path.join(
                this._extensionUri.fsPath,
                'dist',
                'webview.js'
            )
            const distCssPattern = path.join(
                this._extensionUri.fsPath,
                'dist',
                'webview.css'
            )

            console.log('[Crater Image Editor] Watching for webview changes:')
            console.log(`  📦 ${distJsPattern}`)
            console.log(`  🎨 ${distCssPattern}`)

            const distJsWatcher =
                vscode.workspace.createFileSystemWatcher(distJsPattern)
            const distCssWatcher =
                vscode.workspace.createFileSystemWatcher(distCssPattern)

            distJsWatcher.onDidChange((uri) => {
                setTimeout(() => handleFileChange(uri), 300)
            })
            distCssWatcher.onDidChange((uri) => {
                setTimeout(() => handleFileChange(uri), 300)
            })

            this._fileWatcher = distJsWatcher

            console.log('[Crater Image Editor] ✅ Development watchers active!')
            vscode.window.showInformationMessage(
                '🔥 Crater Image Editor Dev Mode: Auto-reload on webview changes'
            )
        } catch (error) {
            console.log(
                '[Crater Image Editor] Could not setup development watcher:',
                error
            )
        }
    }

    dispose(): void {
        this._fileWatcher?.dispose()
    }

    public refreshWebview(): void {
        console.log('[Crater Image Editor] Manual webview refresh requested')
        if (this._view) {
            console.log(
                '[Crater Image Editor] Refreshing webview HTML manually...'
            )
            this._view.webview.html = this._getHtmlForWebview(
                this._view.webview
            )
            vscode.window.showInformationMessage(
                '🔄 Webview refreshed manually'
            )
            console.log('[Crater Image Editor] Manual webview refresh complete')
        } else {
            console.log('[Crater Image Editor] No webview available to refresh')
            vscode.window.showWarningMessage('No webview available to refresh')
        }
    }

    public async loadImageFromPath(imagePath: string): Promise<void> {
        try {
            console.log(
                '[Crater Image Editor] Loading image from path:',
                imagePath
            )

            if (!fs.existsSync(imagePath)) {
                throw new Error('Image file not found')
            }

            const fileStats = fs.statSync(imagePath)
            const imageBuffer = fs.readFileSync(imagePath)
            const base64Data = imageBuffer.toString('base64')
            const fileName = path.basename(imagePath)
            const ext = path.extname(imagePath).toLowerCase().substring(1)

            const mimeType = this.getMimeType(ext)
            const dataUrl = `data:${mimeType};base64,${base64Data}`

            this._currentSession = {
                id: Date.now().toString(),
                originalPath: imagePath,
                originalData: dataUrl,
                fileName: fileName,
                dimensions: { width: 0, height: 0 }, // Will be set by webview
                format: ext,
                size: fileStats.size,
                createdAt: new Date().toISOString(),
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'load-image',
                    imageData: dataUrl,
                    fileName: fileName,
                    originalPath: imagePath,
                    format: ext,
                    size: fileStats.size,
                })
            }

            console.log('[Crater Image Editor] Image loaded successfully')
        } catch (error) {
            console.error('[Crater Image Editor] Error loading image:', error)
            vscode.window.showErrorMessage(
                `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    private getMimeType(extension: string): string {
        const mimeTypes: { [key: string]: string } = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            bmp: 'image/bmp',
            webp: 'image/webp',
        }
        return mimeTypes[extension] || 'image/png'
    }

    public notifySettingsChanged(): void {
        console.log(
            '[Crater Image Editor] Notifying webview about settings change'
        )
        if (this._view) {
            const config = vscode.workspace.getConfiguration(
                'crater-image-editor'
            )
            const outputDirectory = config.get<string>(
                'outputDirectory',
                '${workspaceFolder}/edited-images'
            )
            const outputFormat = config.get<string>('outputFormat', 'png')
            const quality = config.get<number>('quality', 90)
            const preserveOriginal = config.get<boolean>(
                'preserveOriginal',
                true
            )

            this._view.webview.postMessage({
                type: 'settings',
                outputDirectory,
                outputFormat,
                quality,
                preserveOriginal,
            })
            console.log(
                '[Crater Image Editor] Settings notification sent to webview'
            )
        }
    }

    private async saveEditedImage(
        imageData: string,
        fileName: string,
        outputFormat: string,
        _quality: number
    ): Promise<string | null> {
        try {
            const config = vscode.workspace.getConfiguration(
                'crater-image-editor'
            )
            let outputDirectory = config.get<string>(
                'outputDirectory',
                '${workspaceFolder}/edited-images'
            )

            if (
                vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders.length > 0
            ) {
                const workspaceFolder =
                    vscode.workspace.workspaceFolders[0].uri.fsPath
                outputDirectory = outputDirectory.replace(
                    '${workspaceFolder}',
                    workspaceFolder
                )
            } else {
                outputDirectory = path.join(
                    this._extensionUri.fsPath,
                    'edited-images'
                )
            }

            if (!fs.existsSync(outputDirectory)) {
                fs.mkdirSync(outputDirectory, { recursive: true })
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const nameWithoutExt = path.parse(fileName).name
            const newFileName = `${nameWithoutExt}_edited_${timestamp}.${outputFormat}`
            const filePath = path.join(outputDirectory, newFileName)

            const base64Data = imageData.split(',')[1] || imageData
            const imageBuffer = Buffer.from(base64Data, 'base64')
            fs.writeFileSync(filePath, imageBuffer)

            console.log(`[Crater Image Editor] Image saved to: ${filePath}`)
            return filePath
        } catch (error) {
            console.error('[Crater Image Editor] Error saving image:', error)
            vscode.window.showErrorMessage(`Failed to save image: ${error}`)
            return null
        }
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        console.log('[Crater Image Editor] *** resolveWebviewView CALLED! ***')

        this._view = webviewView

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        }

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)
        console.log('[Crater Image Editor] HTML content set for webview')

        webviewView.webview.onDidReceiveMessage(
            (message) => {
                console.log(
                    '[Crater Image Editor] Received message from webview:',
                    message
                )
                this._handleMessage(message)
            },
            undefined,
            []
        )

        console.log(
            '[Crater Image Editor] resolveWebviewView completed successfully'
        )

        setTimeout(() => {
            if (!this._view) return

            const config = vscode.workspace.getConfiguration(
                'crater-image-editor'
            )
            const outputDirectory = config.get<string>(
                'outputDirectory',
                '${workspaceFolder}/edited-images'
            )
            const outputFormat = config.get<string>('outputFormat', 'png')
            const quality = config.get<number>('quality', 90)
            const preserveOriginal = config.get<boolean>(
                'preserveOriginal',
                true
            )

            this._view.webview.postMessage({
                type: 'settings',
                outputDirectory,
                outputFormat,
                quality,
                preserveOriginal,
            })

            console.log(
                '[Crater Image Editor] Proactively sent initial data to webview'
            )
        }, 200)
    }

    private async _handleMessage(message: WebviewMessage): Promise<void> {
        console.log('[Crater Image Editor] Handling message:', message.type)

        if (!this._view) {
            console.error(
                '[Crater Image Editor] No view available to handle message'
            )
            return
        }

        switch (message.type) {
            case 'select-image': {
                try {
                    const options: vscode.OpenDialogOptions = {
                        canSelectFiles: true,
                        canSelectFolders: false,
                        canSelectMany: false,
                        openLabel: 'Select Image',
                        title: 'Select Image to Edit',
                        filters: {
                            Images: [
                                'png',
                                'jpg',
                                'jpeg',
                                'gif',
                                'bmp',
                                'webp',
                            ],
                        },
                    }

                    const result = await vscode.window.showOpenDialog(options)
                    if (result && result[0]) {
                        await this.loadImageFromPath(result[0].fsPath)
                    }
                } catch (error) {
                    console.error(
                        '[Crater Image Editor] Error selecting image:',
                        error
                    )
                    vscode.window.showErrorMessage(
                        `Failed to select image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
                break
            }
            case 'save-image': {
                if (message.imageData && this._currentSession) {
                    const outputFormat = message.outputFormat || 'png'
                    const quality = message.quality || 90

                    const savedPath = await this.saveEditedImage(
                        message.imageData,
                        this._currentSession.fileName,
                        outputFormat,
                        quality
                    )

                    if (savedPath) {
                        this._view.webview.postMessage({
                            type: 'image-saved',
                            savedPath: savedPath,
                        })

                        vscode.window.showInformationMessage(
                            `Image saved to: ${path.basename(savedPath)}`
                        )
                    }
                }
                break
            }
            case 'get-settings': {
                const config = vscode.workspace.getConfiguration(
                    'crater-image-editor'
                )
                const outputDirectory = config.get<string>(
                    'outputDirectory',
                    '${workspaceFolder}/edited-images'
                )
                const outputFormat = config.get<string>('outputFormat', 'png')
                const quality = config.get<number>('quality', 90)
                const preserveOriginal = config.get<boolean>(
                    'preserveOriginal',
                    true
                )

                this._view.webview.postMessage({
                    type: 'settings',
                    outputDirectory,
                    outputFormat,
                    quality,
                    preserveOriginal,
                })
                break
            }
            case 'update-image-dimensions': {
                if (this._currentSession && message.width && message.height) {
                    this._currentSession.dimensions = {
                        width: message.width as number,
                        height: message.height as number,
                    }
                    console.log(
                        '[Crater Image Editor] Updated image dimensions:',
                        this._currentSession.dimensions
                    )
                }
                break
            }
            case 'test':
            case 'webview-ready':
                console.log(
                    '[Crater Image Editor] Test/ready message received:',
                    message
                )
                this._view?.webview.postMessage({
                    type: 'extension-response',
                    message: 'Hello from extension!',
                })
                break
            default:
                console.warn(
                    '[Crater Image Editor] Unknown message type:',
                    message.type
                )
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        console.log('[Crater Image Editor] _getHtmlForWebview called')

        try {
            const htmlPath = path.join(
                this._extensionUri.fsPath,
                'src',
                'webview.html'
            )
            let html = fs.readFileSync(htmlPath, 'utf8')

            const scriptPathOnDisk = vscode.Uri.joinPath(
                this._extensionUri,
                'dist',
                'webview.js'
            )
            const scriptUriWebview = webview.asWebviewUri(scriptPathOnDisk)

            const cssPathOnDisk = vscode.Uri.joinPath(
                this._extensionUri,
                'dist',
                'webview.css'
            )
            const cssUriWebview = webview.asWebviewUri(cssPathOnDisk)

            const cacheBuster = Date.now()
            const scriptUri = `${scriptUriWebview.toString()}?v=${cacheBuster}`
            const cssUri = `${cssUriWebview.toString()}?v=${cacheBuster}`

            html = html.replace(/\{\{SCRIPT_URI\}\}/g, scriptUri)
            html = html.replace(/\{\{CSS_URI\}\}/g, cssUri)

            console.log(
                '[Crater Image Editor] HTML loaded and processed successfully, length:',
                html.length
            )
            return html
        } catch (error) {
            console.error(
                '[Crater Image Editor] Error loading HTML for WebView:',
                error
            )
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crater Image Editor</title>
</head>
<body>
    <div style="padding: 20px; text-align: center; color: var(--vscode-errorForeground);">
        <h2>Error Loading Webview</h2>
        <p>Unable to load the webview content. Please try reloading the extension.</p>
        <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
    </div>
</body>
</html>`
        }
    }
}
