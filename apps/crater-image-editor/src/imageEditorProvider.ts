import {
    type ExtensionContext,
    type FileSystemWatcher,
    type OpenDialogOptions,
    Uri,
    type Webview,
    type WebviewView,
    type WebviewViewProvider,
    commands,
    EventEmitter,
    window,
    workspace,
} from 'vscode'
import {
    existsSync,
    mkdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from 'fs'
import { basename, extname, join, parse as pathParse } from 'path'
import { randomBytes } from 'crypto'

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

type OutboundWebviewMessage =
    | {
          type: 'settings'
          outputDirectory: string
          outputFormat: string
          quality: number
          preserveOriginal: boolean
      }
    | {
          type: 'load-image'
          imageData: string
          fileName: string
          originalPath: string
          format: string
          size: number
      }
    | { type: 'test-connection'; message: string; timestamp: number }
    | { type: 'image-saved'; savedPath: string }
    | { type: 'extension-response'; message: string; timestamp?: number }
    | { type: 'test-response'; message: string; timestamp: number }

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

export class ImageEditorProvider implements WebviewViewProvider {
    public static readonly viewType = 'crater-image-editor.editorView'
    private _view?: WebviewView
    private _extensionContext?: ExtensionContext
    private _currentSession: ImageEditSession | null = null
    private _fileWatcher?: FileSystemWatcher
    private _cssFileWatcher?: FileSystemWatcher
    private _pendingMessages: OutboundWebviewMessage[] = []
    private _webviewReady = false
    private _isVisible = true
    private _onDidChangeVisibilityEmitter = new EventEmitter<boolean>()
    public readonly onDidChangeVisibility =
        this._onDidChangeVisibilityEmitter.event

    constructor(
        private readonly _extensionUri: Uri,
        extensionContext?: ExtensionContext
    ) {
        this._extensionContext = extensionContext
        this.setupDevelopmentWatcher()
        this.loadPersistedSession()
    }

    private loadPersistedSession(): void {
        if (this._extensionContext) {
            const persistedSession =
                this._extensionContext.globalState.get<ImageEditSession>(
                    'crater-image-editor.currentSession'
                )
            if (persistedSession) {
                console.log(
                    '[Crater Image Editor] Loading persisted session:',
                    persistedSession.fileName
                )
                this._currentSession = persistedSession
            }
        }
    }

    private persistSession(): void {
        if (this._extensionContext && this._currentSession) {
            this._extensionContext.globalState.update(
                'crater-image-editor.currentSession',
                this._currentSession
            )
            console.log(
                '[Crater Image Editor] Session persisted to global state'
            )
        }
    }

    private setupDevelopmentWatcher(): void {
        const isHMREnabled =
            process.env.NODE_ENV === 'development' ||
            process.env.CRATER_HMR_ENABLED === 'true'

        if (!isHMREnabled) {
            return
        }

        try {
            const handleFileChange = async (uri?: Uri) => {
                const fileName = uri ? basename(uri.fsPath) : 'unknown'

                try {
                    await commands.executeCommand(
                        'workbench.action.webview.reloadWebviewAction'
                    )
                    window.setStatusBarMessage(
                        `🔥 ${fileName} → webview reloaded`,
                        2000
                    )
                } catch {
                    if (this._view) {
                        this._view.webview.html = this._getHtmlForWebview(
                            this._view.webview
                        )
                    }
                    window.setStatusBarMessage(
                        `🔄 ${fileName} → manual refresh`,
                        2000
                    )
                }
            }

            const distJsPattern = join(
                this._extensionUri.fsPath,
                'dist',
                'webview.js'
            )
            const distCssPattern = join(
                this._extensionUri.fsPath,
                'dist',
                'webview.css'
            )

            const distJsWatcher =
                workspace.createFileSystemWatcher(distJsPattern)
            const distCssWatcher =
                workspace.createFileSystemWatcher(distCssPattern)

            distJsWatcher.onDidChange((uri) => {
                setTimeout(() => handleFileChange(uri), 300)
            })
            distCssWatcher.onDidChange((uri) => {
                setTimeout(() => handleFileChange(uri), 300)
            })

            this._fileWatcher = distJsWatcher
            this._cssFileWatcher = distCssWatcher

            window.showInformationMessage(
                '🔥 Crater Image Editor Dev Mode: Auto-reload on webview changes'
            )
        } catch {
            // Silent fail for development watcher setup
        }
    }

    dispose(): void {
        this._fileWatcher?.dispose()
        this._cssFileWatcher?.dispose()
        this._onDidChangeVisibilityEmitter.dispose()
    }

    public forceWebviewReady(): void {
        if (this._view) {
            this._webviewReady = true

            this._view.webview.postMessage({
                type: 'test-connection',
                message: 'Testing webview communication',
                timestamp: Date.now(),
            })

            this.flushPendingMessages()
        }
    }

    public refreshWebview(): void {
        if (this._view) {
            // Reset all state
            this._webviewReady = false
            this._pendingMessages = []

            this._view.webview.html = this._getHtmlForWebview(
                this._view.webview
            )
        } else {
            window.showWarningMessage('No webview available to refresh')
        }
    }

    private restoreCurrentSession(): void {
        if (!this._view || !this._currentSession) {
            return
        }

        console.log(
            '[Crater Image Editor] Restoring current session:',
            this._currentSession.fileName
        )

        // Send settings first
        const config = workspace.getConfiguration('crater-image-editor')
        this.sendMessageToWebview({
            type: 'settings',
            outputDirectory: config.get<string>(
                'outputDirectory',
                '${workspaceFolder}/edited-images'
            ),
            outputFormat: config.get<string>('outputFormat', 'png'),
            quality: config.get<number>('quality', 90),
            preserveOriginal: config.get<boolean>('preserveOriginal', true),
        })

        // Then restore the image
        this.sendMessageToWebview({
            type: 'load-image',
            imageData: this._currentSession.originalData,
            fileName: this._currentSession.fileName,
            originalPath: this._currentSession.originalPath,
            format: this._currentSession.format,
            size: this._currentSession.size,
        })
    }

    public async loadImageFromPath(imagePath: string): Promise<void> {
        try {
            if (!existsSync(imagePath)) {
                throw new Error('Image file not found')
            }

            const fileStats = statSync(imagePath)
            const imageBuffer = readFileSync(imagePath)
            const base64Data = imageBuffer.toString('base64')
            const fileName = basename(imagePath)
            const ext = extname(imagePath).toLowerCase().substring(1)

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

            // Persist session to extension global state
            this.persistSession()

            if (this._view) {
                this.sendMessageToWebview({
                    type: 'load-image',
                    imageData: dataUrl,
                    fileName: fileName,
                    originalPath: imagePath,
                    format: ext,
                    size: fileStats.size,
                })

                // Send a follow-up test message to verify the webview received the load-image message
                setTimeout(() => {
                    this.sendMessageToWebview({
                        type: 'test-connection',
                        message: 'Follow-up test after load-image',
                        timestamp: Date.now(),
                    })
                }, 100)
            }

            // If webview still isn't ready after loading, force it and flush messages
            if (
                this._view &&
                !this._webviewReady &&
                this._pendingMessages.length > 0
            ) {
                setTimeout(() => {
                    if (!this._webviewReady) {
                        this._webviewReady = true
                        this.flushPendingMessages()
                    }
                }, 1500)
            }
        } catch (error) {
            window.showErrorMessage(
                `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    private getMimeType(extension: string): string {
        const normalizedExt = extension.toLowerCase().replace(/^\./, '')
        const mimeTypes: { [key: string]: string } = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            bmp: 'image/bmp',
            webp: 'image/webp',
        }
        return mimeTypes[normalizedExt] || 'image/png'
    }

    private sendMessageToWebview(message: OutboundWebviewMessage): void {
        if (this._view && this._webviewReady) {
            this._view.webview.postMessage(message)
        } else {
            this._pendingMessages.push(message)
        }
    }

    private flushPendingMessages(): void {
        if (
            this._view &&
            this._webviewReady &&
            this._pendingMessages.length > 0
        ) {
            this._pendingMessages.forEach((message) => {
                this._view!.webview.postMessage(message)
            })
            this._pendingMessages = []
        }
    }

    public notifySettingsChanged(): void {
        if (this._view) {
            const config = workspace.getConfiguration('crater-image-editor')
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

            // Use the message queue to ensure messages are delivered when webview is ready
            this.sendMessageToWebview({
                type: 'settings',
                outputDirectory,
                outputFormat,
                quality,
                preserveOriginal,
            })
        }
    }

    private async saveEditedImage(
        imageData: string,
        fileName: string,
        outputFormat: string
    ): Promise<string | null> {
        try {
            const config = workspace.getConfiguration('crater-image-editor')
            let outputDirectory = config.get<string>(
                'outputDirectory',
                '${workspaceFolder}/edited-images'
            )

            if (
                workspace.workspaceFolders &&
                workspace.workspaceFolders.length > 0
            ) {
                const workspaceFolder = workspace.workspaceFolders[0].uri.fsPath
                outputDirectory = outputDirectory.replace(
                    '${workspaceFolder}',
                    workspaceFolder
                )
            } else {
                outputDirectory = join(
                    this._extensionUri.fsPath,
                    'edited-images'
                )
            }

            if (!existsSync(outputDirectory)) {
                mkdirSync(outputDirectory, { recursive: true })
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const nameWithoutExt = pathParse(fileName).name
            const newFileName = `${nameWithoutExt}_edited_${timestamp}.${outputFormat}`
            const filePath = join(outputDirectory, newFileName)

            const base64Data = imageData.split(',')[1] || imageData
            const imageBuffer = Buffer.from(base64Data, 'base64')
            writeFileSync(filePath, imageBuffer)

            return filePath
        } catch (error) {
            window.showErrorMessage(`Failed to save image: ${error}`)
            return null
        }
    }

    resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
        this._view = webviewView

        // Don't reset webview ready state if this is just a visibility change
        const isFirstTime = !this._webviewReady
        if (isFirstTime) {
            this._webviewReady = false
        }

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                ...(workspace.workspaceFolders?.map((f) => f.uri) ?? []),
            ],
        }

        // Only set HTML for the first time or if webview was actually disposed
        if (isFirstTime || !webviewView.webview.html) {
            console.log(
                '[Crater Image Editor] Setting webview HTML (first time or after disposal)'
            )
            webviewView.webview.html = this._getHtmlForWebview(
                webviewView.webview
            )
        } else {
            console.log(
                '[Crater Image Editor] Webview already has content, skipping HTML reset'
            )
        }

        // Track visibility changes
        webviewView.onDidChangeVisibility(() => {
            const wasVisible = this._isVisible
            this._isVisible = webviewView.visible
            console.log(
                '[Crater Image Editor] Visibility changed:',
                wasVisible,
                '->',
                this._isVisible
            )

            this._onDidChangeVisibilityEmitter.fire(this._isVisible)

            // If becoming visible after being hidden, restore state
            if (!wasVisible && this._isVisible && this._currentSession) {
                console.log(
                    '[Crater Image Editor] Restoring state after becoming visible'
                )
                setTimeout(() => this.restoreCurrentSession(), 100)
            }
        })

        webviewView.webview.onDidReceiveMessage(
            (message) => {
                this._handleMessage(message)
            },
            undefined,
            []
        )

        if (!this._view) {
            return
        }

        const config = workspace.getConfiguration('crater-image-editor')
        const outputDirectory = config.get<string>(
            'outputDirectory',
            '${workspaceFolder}/edited-images'
        )
        const outputFormat = config.get<string>('outputFormat', 'png')
        const quality = config.get<number>('quality', 90)
        const preserveOriginal = config.get<boolean>('preserveOriginal', true)

        this.sendMessageToWebview({
            type: 'settings',
            outputDirectory,
            outputFormat,
            quality,
            preserveOriginal,
        })

        // Restore current session if it exists
        if (this._currentSession) {
            console.log(
                '[Crater Image Editor Provider] Restoring image session:',
                this._currentSession.fileName
            )
            this.sendMessageToWebview({
                type: 'load-image',
                imageData: this._currentSession.originalData,
                fileName: this._currentSession.fileName,
                originalPath: this._currentSession.originalPath,
                format: this._currentSession.format,
                size: this._currentSession.size,
            })
        }

        // Send test message to verify webview connection
        this.sendMessageToWebview({
            type: 'test-connection',
            message: 'Extension can send messages to webview',
            timestamp: Date.now(),
        })
    }

    private async _handleMessage(message: WebviewMessage): Promise<void> {
        if (!this._view) {
            return
        }

        switch (message.type) {
            case 'select-image': {
                try {
                    const options: OpenDialogOptions = {
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

                    const result = await window.showOpenDialog(options)
                    if (result && result[0]) {
                        await this.loadImageFromPath(result[0].fsPath)
                    }
                } catch (error) {
                    window.showErrorMessage(
                        `Failed to select image: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
                break
            }
            case 'save-image': {
                if (message.imageData && this._currentSession) {
                    const outputFormat = message.outputFormat || 'png'

                    const savedPath = await this.saveEditedImage(
                        message.imageData,
                        this._currentSession.fileName,
                        outputFormat
                    )

                    if (savedPath) {
                        this._view.webview.postMessage({
                            type: 'image-saved',
                            savedPath: savedPath,
                        })

                        window.showInformationMessage(
                            `Image saved to: ${basename(savedPath)}`
                        )
                    }
                }
                break
            }
            case 'get-settings': {
                const config = workspace.getConfiguration('crater-image-editor')
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
                }
                break
            }
            case 'minimal-test':
                this._view?.webview.postMessage({
                    type: 'extension-response',
                    message: 'Hello from extension! Minimal test successful.',
                    timestamp: Date.now(),
                })
                break
            case 'debug-test':
                this._view?.webview.postMessage({
                    type: 'extension-response',
                    message: 'Hello from extension! Debug test successful.',
                })
                break
            case 'test':
            case 'direct-test':
                break

            case 'webview-ready':
                console.log(
                    '[Crater Image Editor Provider] Webview ready signal received, attempt:',
                    message.attempt
                )
                this._webviewReady = true

                // If webview was reloaded and we have a current session, restore it
                if (
                    message.wasReloaded &&
                    this._currentSession &&
                    !message.hasCurrentImage
                ) {
                    console.log(
                        '[Crater Image Editor Provider] Webview was reloaded, restoring session automatically'
                    )
                    setTimeout(() => this.restoreCurrentSession(), 200)
                }

                this.flushPendingMessages()
                this._view?.webview.postMessage({
                    type: 'extension-response',
                    message: 'Hello from extension!',
                })
                break

            case 'manual-test':
                this._view?.webview.postMessage({
                    type: 'test-response',
                    message: 'Manual test response from extension',
                    timestamp: Date.now(),
                })
                break
            default:
            // Unknown message type - silently ignore
        }
    }

    private _getHtmlForWebview(webview: Webview): string {
        try {
            const htmlPath = join(
                this._extensionUri.fsPath,
                'src',
                'webview.html'
            )
            let html = readFileSync(htmlPath, 'utf8')

            const scriptPathOnDisk = Uri.joinPath(
                this._extensionUri,
                'dist',
                'webview.js'
            )
            const scriptUriWebview = webview.asWebviewUri(scriptPathOnDisk)

            const cssPathOnDisk = Uri.joinPath(
                this._extensionUri,
                'dist',
                'webview.css'
            )
            const cssUriWebview = webview.asWebviewUri(cssPathOnDisk)

            // Force aggressive cache busting with single timestamp and random value
            const ts = Date.now()
            const rand = Math.random().toString(36).substring(2)
            const cacheKey = `${ts}-${rand}`
            const scriptUri = `${scriptUriWebview.toString()}?v=${cacheKey}`
            const cssUri = `${cssUriWebview.toString()}?v=${cacheKey}`

            const nonce = randomBytes(16).toString('base64')

            html = html.replace(/\{\{SCRIPT_URI\}\}/g, scriptUri)
            html = html.replace(/\{\{CSS_URI\}\}/g, cssUri)
            html = html.replace(/\{\{NONCE\}\}/g, nonce)

            return html
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            const escaped = errorMessage
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
            const nonce = randomBytes(16).toString('base64')
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
    <title>Crater Image Editor</title>
</head>
<body>
    <div style="padding: 20px; text-align: center; color: var(--vscode-errorForeground);">
        <h2>Error Loading Webview</h2>
        <p>Unable to load the webview content. Please try reloading the extension.</p>
        <p>Error: ${escaped}</p>
    </div>
</body>
</html>`
        }
    }
}
