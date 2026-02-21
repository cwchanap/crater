import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { ExtensionContext } from 'vscode'
import {
    mockVSCode,
    createMockExtensionContext,
    resetAllMocks,
    fsMock,
    pathMock,
} from './test-utils'

import { ChatbotProvider } from '../chatbotProvider'

describe('ChatbotProvider._getHtmlForWebview', () => {
    let provider: ChatbotProvider
    let mockContext: ExtensionContext
    let mockWebview: ReturnType<typeof createMockWebview>

    function createMockWebview() {
        return {
            cspSource: 'vscode-webview-resource:',
            asWebviewUri: (uri: { fsPath: string }) => ({
                toString: () => `vscode-webview://resource${uri.fsPath}`,
            }),
            html: '',
            options: {},
            onDidReceiveMessage: mockVSCode.window.showInformationMessage,
            postMessage: mockVSCode.window.showInformationMessage,
        }
    }

    beforeEach(() => {
        resetAllMocks()
        mockContext = createMockExtensionContext()
        mockWebview = createMockWebview()

        // path.join needs to return something for the html path lookup
        pathMock.join.mockReturnValue('/test/extension/src/webview.html')

        provider = new ChatbotProvider(
            mockVSCode.Uri.file('/test/extension'),
            mockContext
        )
    })

    afterEach(() => {
        provider.dispose?.()
    })

    it('should replace all template placeholders', () => {
        fsMock.readFileSync.mockReturnValue(
            '{{NONCE}} {{CSP_SOURCE}} {{SCRIPT_URI}} {{CSS_URI}}'
        )

        const html = (provider as any)._getHtmlForWebview(mockWebview)

        expect(html).not.toContain('{{NONCE}}')
        expect(html).not.toContain('{{CSP_SOURCE}}')
        expect(html).not.toContain('{{SCRIPT_URI}}')
        expect(html).not.toContain('{{CSS_URI}}')
        expect(html.length).toBeGreaterThan(0)
    })

    it('should return fallback HTML with HTML-escaped error when template file is missing', () => {
        fsMock.readFileSync.mockImplementation(() => {
            throw new Error('<script>alert(1)</script>')
        })

        const html = (provider as any)._getHtmlForWebview(mockWebview)

        expect(html).toContain('&lt;script&gt;')
        expect(html).not.toContain('<script>alert(1)</script>')
        expect(html).toContain('Error Loading Webview')
    })
})
