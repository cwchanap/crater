import { test, expect } from '@playwright/test'

test.describe('Crater Web Game Asset Chatbot', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test.describe('Page Loading and Layout', () => {
        test('should load the main page with proper title and layout', async ({
            page,
        }) => {
            // Check main heading
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()

            // Check subtitle
            await expect(
                page.getByText('AI-Powered Game Asset Generation Platform')
            ).toBeVisible()

            // Check chatbot section
            await expect(
                page.getByRole('heading', { name: '🎮 Game Asset Assistant' })
            ).toBeVisible()

            // Check info section
            await expect(
                page.getByRole('heading', { name: '🎯 What is Crater?' })
            ).toBeVisible()
        })

        test('should display session info with correct format', async ({
            page,
        }) => {
            // Check session ID is present
            await expect(page.getByText('Session ID:')).toBeVisible()
            const sessionElement = page.locator('code').first()
            await expect(sessionElement).toBeVisible()
            const sessionText = await sessionElement.textContent()
            expect(sessionText).toMatch(/web-session-\d+/)

            // Check current time is present
            await expect(page.getByText('Current Time:')).toBeVisible()
            const timeElement = page.locator('code').last()
            await expect(timeElement).toBeVisible()
        })
    })

    test.describe('Chatbot Initial State', () => {
        test('should show welcome message when no messages exist', async ({
            page,
        }) => {
            await expect(page.locator('.welcome-message .emoji')).toBeVisible()
            await expect(
                page.getByText('Welcome to the Game Asset Assistant!')
            ).toBeVisible()
            await expect(
                page.getByText(
                    "I'm here to help you brainstorm and plan amazing game assets."
                )
            ).toBeVisible()
            await expect(
                page.getByText(
                    '💡 Configure an AI provider in settings to enable image generation'
                )
            ).toBeVisible()
        })

        test('should show correct provider status when unconfigured', async ({
            page,
        }) => {
            await expect(page.getByText('No AI Provider')).toBeVisible()
            await expect(
                page.locator('.status-indicator.inactive')
            ).toBeVisible()
        })

        test('should have disabled send button initially', async ({ page }) => {
            const sendButton = page.getByRole('button', { name: 'Send' })
            await expect(sendButton).toBeDisabled()
        })
    })

    test.describe('Settings Panel Functionality', () => {
        test('should open and close settings panel', async ({ page }) => {
            // Open settings
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).toBeVisible()

            // Close settings with Cancel
            await page.getByRole('button', { name: 'Cancel' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).not.toBeVisible()
        })

        test('should show provider options in dropdown', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            const dropdown = page.getByLabel('AI Provider:')
            await expect(dropdown).toBeVisible()

            // Check all options are present
            const options = await dropdown.locator('option').allTextContents()
            expect(options).toContain('None (Text Only)')
            expect(options).toContain('Google Gemini')
            expect(options).toContain('OpenAI')
        })

        test('should show API key field when Gemini is selected', async ({
            page,
        }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Select Gemini
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')

            // Check API key field appears
            await expect(page.getByLabel('API Key:')).toBeVisible()
            await expect(page.getByPlaceholder('AIza...')).toBeVisible()

            // Check help link
            await expect(
                page.getByRole('link', { name: 'Google AI Studio' })
            ).toBeVisible()

            // Check save button is disabled without API key
            await expect(
                page.getByRole('button', { name: 'Save Settings' })
            ).toBeDisabled()
        })

        test('should show API key field when OpenAI is selected', async ({
            page,
        }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Select OpenAI
            await page.getByLabel('AI Provider:').selectOption('OpenAI')

            // Check API key field appears
            await expect(page.getByLabel('API Key:')).toBeVisible()
            await expect(page.getByPlaceholder('sk-...')).toBeVisible()

            // Check help link
            await expect(
                page.getByRole('link', { name: 'OpenAI Platform' })
            ).toBeVisible()

            // Check save button is disabled without API key
            await expect(
                page.getByRole('button', { name: 'Save Settings' })
            ).toBeDisabled()
        })

        test('should hide API key field when None is selected', async ({
            page,
        }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Select Gemini first to show API key field
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            await expect(page.getByLabel('API Key:')).toBeVisible()

            // Select None to hide it
            await page
                .getByLabel('AI Provider:')
                .selectOption('None (Text Only)')
            await expect(page.getByLabel('API Key:')).not.toBeVisible()

            // Save button should be enabled for None option
            await expect(
                page.getByRole('button', { name: 'Save Settings' })
            ).toBeEnabled()
        })
    })

    test.describe('Chat Message Flow', () => {
        test('should enable send button when text is entered', async ({
            page,
        }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })
            const sendButton = page.getByRole('button', { name: 'Send' })

            // Initially disabled
            await expect(sendButton).toBeDisabled()

            // Enable after typing
            await messageInput.fill('Test message')
            await expect(sendButton).toBeEnabled()

            // Disable when cleared
            await messageInput.clear()
            await expect(sendButton).toBeDisabled()
        })

        test('should send message and receive response', async ({ page }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })
            const sendButton = page.getByRole('button', { name: 'Send' })

            // Type and send message
            await messageInput.fill(
                'I need help creating sprites for a 2D platformer game'
            )
            await sendButton.click()

            // Check user message appears
            await expect(
                page.getByText(
                    'I need help creating sprites for a 2D platformer game'
                )
            ).toBeVisible()

            // Check assistant response appears
            await expect(
                page.getByText(/Great! I can help with character sprites/)
            ).toBeVisible()
            await expect(page.getByText(/Character Sprites:/)).toBeVisible()

            // Check timestamps are present
            await expect(page.locator('.message-time')).toHaveCount(2)

            // Check input is cleared after sending
            await expect(messageInput).toHaveValue('')
        })

        test('should handle Enter key to send message', async ({ page }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })

            // Type message and press Enter
            await messageInput.fill('Test message with Enter key')
            await messageInput.press('Enter')

            // Check message was sent
            await expect(
                page.getByText('Test message with Enter key')
            ).toBeVisible()
        })

        test('should not send empty or whitespace-only messages', async ({
            page,
        }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })
            const sendButton = page.getByRole('button', { name: 'Send' })

            // Send button should be disabled when empty
            await expect(sendButton).toBeDisabled()
            await expect(
                page.getByText('Welcome to the Game Asset Assistant!')
            ).toBeVisible()

            // Try to send whitespace-only message
            await messageInput.fill('   ')
            await expect(sendButton).toBeDisabled()
        })

        test('should clear chat messages', async ({ page }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })

            // Send a message first
            await messageInput.fill('Test message for clearing')
            await page.getByRole('button', { name: 'Send' }).click()

            // Verify message exists
            await expect(
                page.getByText('Test message for clearing')
            ).toBeVisible()

            // Clear chat
            await page.getByRole('button', { name: 'Clear Chat' }).click()

            // Verify welcome message is back
            await expect(
                page.getByText('Welcome to the Game Asset Assistant!')
            ).toBeVisible()
            await expect(
                page.getByText('Test message for clearing')
            ).not.toBeVisible()
        })
    })

    test.describe('Message Types and Formatting', () => {
        test('should format text with bold markdown', async ({ page }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })

            // Send message that will trigger character response with bold text
            await messageInput.fill('I need sprites')
            await page.getByRole('button', { name: 'Send' }).click()

            // Check that bold formatting is applied
            await expect(
                page.locator('strong').getByText('Character Sprites:')
            ).toBeVisible()
        })

        test('should display timestamps correctly', async ({ page }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })

            await messageInput.fill('Test timestamp')
            await page.getByRole('button', { name: 'Send' }).click()

            // Check timestamp format (should be HH:MM:SS)
            const timestamps = page.locator('.message-time')
            await expect(timestamps.first()).toHaveText(/\d{2}:\d{2}:\d{2}/)
        })
    })

    test.describe('Responsive Design', () => {
        test('should adapt layout for mobile screens', async ({ page }) => {
            // Set mobile viewport
            await page.setViewportSize({ width: 375, height: 667 })

            // Check that main content is still visible and properly laid out
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()
            await expect(
                page.getByRole('heading', { name: '🎮 Game Asset Assistant' })
            ).toBeVisible()
            await expect(
                page.getByRole('heading', { name: '🎯 What is Crater?' })
            ).toBeVisible()

            // Check that chatbot functionality still works
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })
            await messageInput.fill('Mobile test message')
            await page.getByRole('button', { name: 'Send' }).click()

            await expect(page.getByText('Mobile test message')).toBeVisible()
        })

        test('should work correctly on tablet screens', async ({ page }) => {
            // Set tablet viewport
            await page.setViewportSize({ width: 768, height: 1024 })

            // Test basic functionality
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()

            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })
            await messageInput.fill('Tablet test message')
            await page.getByRole('button', { name: 'Send' }).click()

            await expect(page.getByText('Tablet test message')).toBeVisible()
        })
    })

    test.describe('User Interface Interactions', () => {
        test('should show loading state while processing message', async ({
            page,
        }) => {
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })

            await messageInput.fill('Loading test message')
            await page.getByRole('button', { name: 'Send' }).click()

            // Check that send button is disabled during processing
            await expect(
                page.getByRole('button', { name: 'Sending...' })
            ).toBeVisible()

            // Wait for response to complete
            await expect(page.getByText('Loading test message')).toBeVisible()
            await expect(
                page.getByRole('button', { name: 'Send' })
            ).toBeVisible()
        })

        test('should maintain focus and accessibility', async ({ page }) => {
            // Test tab navigation
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')

            // Should be able to interact with focused elements
            const settingsButton = page.getByRole('button', {
                name: '⚙️ Settings',
            })
            await expect(settingsButton).toBeFocused()
        })
    })

    test.describe('External Links', () => {
        test('should have working external links', async ({ page }) => {
            // Check SvelteKit docs link
            const sveltekitLink = page.getByRole('link', {
                name: 'SvelteKit docs',
            })
            await expect(sveltekitLink).toHaveAttribute(
                'href',
                'https://svelte.dev/docs/kit'
            )
            await expect(sveltekitLink).toHaveAttribute('target', '_blank')
        })

        test('should show provider documentation links in settings', async ({
            page,
        }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Test Gemini link
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            const geminiLink = page.getByRole('link', {
                name: 'Google AI Studio',
            })
            await expect(geminiLink).toHaveAttribute(
                'href',
                'https://makersuite.google.com/app/apikey'
            )

            // Test OpenAI link
            await page.getByLabel('AI Provider:').selectOption('OpenAI')
            const openaiLink = page.getByRole('link', {
                name: 'OpenAI Platform',
            })
            await expect(openaiLink).toHaveAttribute(
                'href',
                'https://platform.openai.com/api-keys'
            )
        })
    })
})
