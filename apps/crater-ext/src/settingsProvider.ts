import * as vscode from 'vscode'

interface SettingsMessage {
    type: string
    [key: string]: unknown
}

export class SettingsProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'crater-ext.settingsView'
    private _view?: vscode.WebviewView

    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._view = webviewView

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri],
        }

        webviewView.webview.html = this._getHtml()

        webviewView.webview.onDidReceiveMessage(
            async (msg: SettingsMessage) => {
                try {
                    switch (msg.type) {
                        case 'get-settings': {
                            const config =
                                vscode.workspace.getConfiguration('crater-ext')
                            const aiProvider = config.get<string>(
                                'aiProvider',
                                'mock'
                            )
                            const geminiApiKey = config.get<string>(
                                'geminiApiKey',
                                ''
                            )
                            const openaiApiKey = config.get<string>(
                                'openaiApiKey',
                                ''
                            )
                            webviewView.webview.postMessage({
                                type: 'settings',
                                aiProvider,
                                geminiApiKey,
                                openaiApiKey,
                            })
                            break
                        }
                        case 'save-settings': {
                            const config =
                                vscode.workspace.getConfiguration('crater-ext')
                            const target = vscode.ConfigurationTarget.Global

                            const aiProvider = String(
                                msg['aiProvider'] || 'mock'
                            )
                            const apiKey = String(msg['apiKey'] || '')

                            await config.update(
                                'aiProvider',
                                aiProvider,
                                target
                            )

                            if (aiProvider === 'gemini') {
                                await config.update(
                                    'geminiApiKey',
                                    apiKey,
                                    target
                                )
                            } else if (aiProvider === 'openai') {
                                await config.update(
                                    'openaiApiKey',
                                    apiKey,
                                    target
                                )
                            }

                            // Prompt ChatbotProvider to refresh its provider
                            await vscode.commands.executeCommand(
                                'crater-ext.updateAIProvider'
                            )

                            webviewView.webview.postMessage({
                                type: 'settings-saved',
                            })
                            vscode.window.showInformationMessage(
                                '[Crater] Settings saved'
                            )
                            break
                        }
                    }
                } catch (err) {
                    console.error(
                        '[Crater Settings] Error handling message:',
                        err
                    )
                    webviewView.webview.postMessage({
                        type: 'settings-error',
                        message:
                            err instanceof Error
                                ? err.message
                                : String(err ?? 'Unknown error'),
                    })
                }
            }
        )
    }

    private _getHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crater Settings</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      margin: 0; padding: 16px;
      position: relative; min-height: 100vh;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }

    .header h3 {
      margin: 0;
      color: var(--vscode-foreground);
    }

    .settings-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
    }

    .settings-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .welcome-message {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      margin: 40px 0;
    }

    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .modal.show {
      display: flex;
    }

    .modal-content {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }

    .modal-header h3 {
      margin: 0;
      color: var(--vscode-foreground);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--vscode-foreground);
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .section { margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; }
    select, input[type="text"], input[type="password"] {
      width: 100%; box-sizing: border-box; padding: 6px 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }
    .row { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
    .btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer;
    }
    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .note { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .validation-message {
      font-size: 12px; margin-top: 4px; min-height: 16px;
    }
    .validation-message.error { color: var(--vscode-errorForeground); }
    .validation-message.success { color: var(--vscode-charts-green); }
  </style>
</head>
<body>
   <div class="header">
     <h3>🎮 Crater Settings</h3>
     <button class="settings-btn" id="openSettingsBtn">⚙️ Configure</button>
   </div>

   <div class="welcome-message">
     Welcome to Crater Settings! Click the "Configure" button to set up your AI provider and API keys.
   </div>

   <!-- Settings Modal -->
   <div class="modal" id="settingsModal">
     <div class="modal-content">
       <div class="modal-header">
         <h3>Configure AI Provider</h3>
         <button class="close-btn" id="closeModalBtn">&times;</button>
       </div>

       <div class="section">
         <label for="provider">Model Provider</label>
         <select id="provider">
           <option value="mock">Mock (Demo) - No API key needed</option>
           <option value="gemini">Google Gemini - Requires API key</option>
           <option value="openai">OpenAI GPT - Requires API key</option>
         </select>
         <div class="note">Choose your preferred AI provider for generating game assets</div>
       </div>

       <div class="section" id="apiKeySection">
         <label id="apiKeyLabel" for="apiKey">API Key</label>
         <input id="apiKey" type="password" placeholder="Enter API key" />
         <div class="note">Stored securely in your VS Code settings (User scope).</div>
         <div class="validation-message" id="validationMessage"></div>
       </div>

       <div class="row">
         <button class="btn secondary" id="cancelBtn">Cancel</button>
         <button class="btn" id="saveBtn">Save Settings</button>
       </div>
     </div>
   </div>

   <script>
    const vscode = acquireVsCodeApi()

    const openSettingsBtn = document.getElementById('openSettingsBtn')
    const closeModalBtn = document.getElementById('closeModalBtn')
    const cancelBtn = document.getElementById('cancelBtn')
    const settingsModal = document.getElementById('settingsModal')
    const providerEl = document.getElementById('provider')
    const apiKeyEl = document.getElementById('apiKey')
    const apiKeyLabelEl = document.getElementById('apiKeyLabel')
    const saveBtn = document.getElementById('saveBtn')
    const validationMessageEl = document.getElementById('validationMessage')

    function validateApiKey(apiKey, provider) {
      if (provider === 'mock') return { valid: true }

      if (!apiKey || apiKey.trim().length === 0) {
        return { valid: false, message: 'API key is required' }
      }

      // Basic validation for common API key formats
      if (provider === 'gemini' && !apiKey.startsWith('AIza')) {
        return { valid: false, message: 'Gemini API keys typically start with "AIza"' }
      }

      if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        return { valid: false, message: 'OpenAI API keys typically start with "sk-"' }
      }

      if (apiKey.length < 20) {
        return { valid: false, message: 'API key seems too short' }
      }

      return { valid: true, message: 'API key format looks valid' }
    }

    function showModal() {
      settingsModal.classList.add('show')
      // Request current settings when modal opens
      vscode.postMessage({ type: 'get-settings' })
    }

    function hideModal() {
      settingsModal.classList.remove('show')
    }

    function updateValidation() {
      const provider = providerEl.value
      const apiKey = apiKeyEl.value

      if (provider === 'mock') {
        validationMessageEl.textContent = ''
        validationMessageEl.className = 'validation-message'
        return
      }

      const validation = validateApiKey(apiKey, provider)
      validationMessageEl.textContent = validation.message
      validationMessageEl.className = 'validation-message ' + (validation.valid ? 'success' : 'error')
    }

    function updateApiKeyLabel() {
      const map = { gemini: 'Gemini API Key', openai: 'OpenAI API Key', mock: 'API Key (unused for Mock)' }
      apiKeyLabelEl.textContent = map[providerEl.value] || 'API Key'
      const section = document.getElementById('apiKeySection')
      section.style.display = providerEl.value === 'mock' ? 'none' : 'block'
      updateValidation()
    }

    // Modal event listeners
    openSettingsBtn.addEventListener('click', showModal)
    closeModalBtn.addEventListener('click', hideModal)
    cancelBtn.addEventListener('click', hideModal)

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        hideModal()
      }
    })

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal.classList.contains('show')) {
        hideModal()
      }
    })

    // Form event listeners
    providerEl.addEventListener('change', updateApiKeyLabel)
    apiKeyEl.addEventListener('input', updateValidation)

    window.addEventListener('message', (event) => {
      const msg = event.data
      switch (msg.type) {
        case 'settings':
          providerEl.value = msg.aiProvider || 'mock'
          if (msg.aiProvider === 'gemini') apiKeyEl.value = msg.geminiApiKey || ''
          else if (msg.aiProvider === 'openai') apiKeyEl.value = msg.openaiApiKey || ''
          else apiKeyEl.value = ''
          updateApiKeyLabel()
          break
        case 'settings-saved':
          hideModal()
          break
        case 'settings-error':
          console.error('[Crater Settings] Error:', msg.message)
          break
      }
    })

    saveBtn.addEventListener('click', () => {
      vscode.postMessage({
        type: 'save-settings',
        aiProvider: providerEl.value,
        apiKey: apiKeyEl.value
      })
    })
  </script>
</body>
</html>`
    }
}
