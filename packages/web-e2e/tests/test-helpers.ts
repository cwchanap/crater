import { expect, type Page, type Locator } from '@playwright/test'

/**
 * Test helper utilities for Crater Web E2E tests
 */

export class ChatbotTestHelper {
    constructor(private page: Page) {}

    // Locators
    private get settingsButton() {
        // Use the inner chat header settings button that opens the modal
        return this.page.locator('.chat-header .settings-btn')
    }

    get clearChatButton(): Locator {
        return this.page.getByRole('button', { name: 'Clear Session' })
    }

    get messageInput(): Locator {
        return this.page.getByRole('textbox', {
            name: /pixel art hero or vibrant environment/,
        })
    }

    get sendButton(): Locator {
        return this.page.getByRole('button', { name: 'Send' })
    }

    get sendingButton(): Locator {
        return this.page.getByRole('button', { name: 'Sending...' })
    }

    get providerSelect(): Locator {
        return this.page.getByLabel('AI Provider:')
    }

    get apiKeyInput(): Locator {
        return this.page.getByLabel('API Key:')
    }

    get saveSettingsButton(): Locator {
        return this.page.getByRole('button', {
            name: 'Save Settings',
            exact: true,
        })
    }

    get cancelButton(): Locator {
        return this.page.getByRole('button', { name: 'Cancel', exact: true })
    }

    private get settingsPanel() {
        // Use the visible heading text inside the settings modal
        return this.page.getByText('AI Provider Configuration')
    }

    get welcomeMessage(): Locator {
        return this.page.getByText('Welcome to the Game Asset Assistant!')
    }

    get providerStatus(): Locator {
        return this.page.locator('.provider-status')
    }

    // Actions
    async openSettings(): Promise<void> {
        // Try clicking the Settings button multiple ways to ensure modal opens
        await this.settingsButton.click()

        // Wait for possible state changes
        await this.page.waitForTimeout(100)

        // Check if modal appeared, if not try force click
        try {
            await expect(this.settingsPanel).toBeVisible({ timeout: 1000 })
        } catch {
            // If modal didn't appear, try force click
            await this.settingsButton.click({ force: true })
            await this.page.waitForTimeout(100)
            await expect(this.settingsPanel).toBeVisible()
        }
    }

    async closeSettings(): Promise<void> {
        await this.cancelButton.click()
        await expect(this.settingsPanel).not.toBeVisible()
    }

    async selectProvider(
        provider: 'debug' | 'gemini' | 'openai'
    ): Promise<void> {
        await this.openSettings()

        const providerMap = {
            debug: 'Debug (Test Images)',
            gemini: 'Google Gemini',
            openai: 'OpenAI',
        }

        await this.providerSelect.selectOption(providerMap[provider])
    }

    async setApiKey(apiKey: string): Promise<void> {
        await this.apiKeyInput.fill(apiKey)
    }

    async saveSettings(): Promise<void> {
        await this.saveSettingsButton.click()
        await expect(this.settingsPanel).not.toBeVisible()
    }

    async sendMessage(message: string): Promise<void> {
        await this.messageInput.fill(message)
        await this.sendButton.click()

        // Wait for message to appear - use more specific selector to avoid strict mode violations
        await expect(
            this.page
                .locator('.message-content')
                .filter({ hasText: message })
                .first()
        ).toBeVisible()
    }

    async clearChat(): Promise<void> {
        await this.clearChatButton.click()
        await expect(this.welcomeMessage).toBeVisible()
    }

    async waitForResponse(): Promise<void> {
        // Wait for sending state to disappear
        await expect(this.sendingButton).not.toBeVisible({ timeout: 10000 })
        await expect(this.sendButton).toBeVisible()
    }

    async expectMessageVisible(message: string): Promise<void> {
        await expect(
            this.page
                .locator('.message-content')
                .filter({ hasText: message })
                .first()
        ).toBeVisible()
    }

    async expectProviderStatus(
        status: 'active' | 'inactive',
        text: string
    ): Promise<void> {
        await expect(this.page.getByText(text)).toBeVisible()
        await expect(
            this.page.locator(`.status-indicator.${status}`)
        ).toBeVisible()
    }

    async expectApiKeyPlaceholder(placeholder: string): Promise<void> {
        await expect(this.page.getByPlaceholder(placeholder)).toBeVisible()
    }

    async expectHelpLink(name: string, href: string): Promise<void> {
        const link = this.page.getByRole('link', { name })
        await expect(link).toBeVisible()
        await expect(link).toHaveAttribute('href', href)
        await expect(link).toHaveAttribute('target', '_blank')
    }
}

export class ResponsiveTestHelper {
    constructor(private page: Page) {}

    async setMobileViewport(): Promise<void> {
        await this.page.setViewportSize({ width: 375, height: 667 })
    }

    async setTabletViewport(): Promise<void> {
        await this.page.setViewportSize({ width: 768, height: 1024 })
    }

    async setDesktopViewport(): Promise<void> {
        await this.page.setViewportSize({ width: 1280, height: 720 })
    }

    async setLargeDesktopViewport(): Promise<void> {
        await this.page.setViewportSize({ width: 1920, height: 1080 })
    }

    async expectElementVisible(selector: string): Promise<void> {
        await expect(this.page.locator(selector)).toBeVisible()
    }

    async expectResponsiveLayout(): Promise<void> {
        // Check that main elements are visible across viewport changes
        await expect(
            this.page.getByRole('heading', { name: '🌋 Crater Web' })
        ).toBeVisible()
        await expect(
            this.page.getByRole('heading', { name: '🎮 Game Asset Assistant' })
        ).toBeVisible()
    }
}

export class AccessibilityTestHelper {
    constructor(private page: Page) {}

    async expectProperLabels(): Promise<void> {
        // Check that form controls have proper labels
        await expect(this.page.getByLabel('AI Provider:')).toBeVisible()
    }

    async expectKeyboardNavigation(): Promise<void> {
        // Test tab navigation
        await this.page.keyboard.press('Tab')

        const focusedElement = await this.page.evaluate(
            () => document.activeElement?.tagName
        )
        expect(['BUTTON', 'INPUT', 'SELECT', 'A']).toContain(focusedElement)
    }

    async expectAriaAttributes(): Promise<void> {
        // Check for important ARIA attributes
        const buttons = this.page.getByRole('button')
        const count = await buttons.count()
        expect(count).toBeGreaterThan(0)
    }

    async expectProperHeadingStructure(): Promise<void> {
        // Check heading hierarchy
        await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(this.page.getByRole('heading', { level: 2 })).toBeVisible()
    }
}

export class TestDataHelper {
    static getValidGeminiApiKey(): string {
        return 'AIzaTestKey123456789'
    }

    static getValidOpenAIApiKey(): string {
        return 'sk-test1234567890abcdef'
    }

    static getInvalidApiKey(): string {
        return 'invalid-key-format'
    }

    static getTestMessages(): string[] {
        return [
            'I need help creating sprites for a 2D platformer game',
            'Create a fantasy forest background',
            'Help me design UI elements',
            'I need sound effects for my game',
            'Generate a pixel art warrior sprite',
        ]
    }

    static getImageGenerationKeywords(): string[] {
        return [
            'generate',
            'create',
            'image',
            'Generate a warrior sprite',
            'Create a forest background image',
            'I need an image of a castle',
        ]
    }
}

export class PerformanceTestHelper {
    constructor(private page: Page) {}

    async measurePageLoadTime(): Promise<number> {
        const startTime = Date.now()
        await this.page.goto('/')
        await this.page.waitForLoadState('networkidle')
        return Date.now() - startTime
    }

    async measureChatResponseTime(message: string): Promise<number> {
        const chatbot = new ChatbotTestHelper(this.page)

        const startTime = Date.now()
        await chatbot.sendMessage(message)
        await chatbot.waitForResponse()
        return Date.now() - startTime
    }

    async expectPageLoadWithinTime(maxTime: number): Promise<void> {
        const loadTime = await this.measurePageLoadTime()
        expect(loadTime).toBeLessThan(maxTime)
    }

    async expectChatResponseWithinTime(
        message: string,
        maxTime: number
    ): Promise<void> {
        const responseTime = await this.measureChatResponseTime(message)
        expect(responseTime).toBeLessThan(maxTime)
    }
}
