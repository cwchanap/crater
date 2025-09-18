import { test, expect } from '@playwright/test'
import {
    AccessibilityTestHelper,
    PerformanceTestHelper,
    ChatbotTestHelper,
} from './test-helpers'

test.describe('Accessibility and Performance Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test.describe('Accessibility', () => {
        test('should have proper semantic HTML structure', async ({ page }) => {
            const a11y = new AccessibilityTestHelper(page)

            // Check heading structure
            await a11y.expectProperHeadingStructure()

            // Check main landmark
            await expect(page.locator('main')).toBeVisible()

            // Check banner/header
            await expect(page.locator('banner, header')).toBeVisible()

            // Check footer
            await expect(page.locator('contentinfo, footer')).toBeVisible()
        })

        test('should support keyboard navigation', async ({ page }) => {
            const a11y = new AccessibilityTestHelper(page)

            // Tab through interactive elements
            await page.keyboard.press('Tab') // Settings button
            await page.keyboard.press('Tab') // Clear chat button
            await page.keyboard.press('Tab') // Message input
            await page.keyboard.press('Tab') // Send button

            // Should be able to navigate to all buttons
            await a11y.expectKeyboardNavigation()
        })

        test('should have proper form labels and associations', async ({
            page,
        }) => {
            const chatbot = new ChatbotTestHelper(page)
            const a11y = new AccessibilityTestHelper(page)

            await chatbot.openSettings()
            await a11y.expectProperLabels()

            // Check that API key input has proper label when visible
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            await expect(page.getByLabel('API Key:')).toBeVisible()
        })

        test('should have accessible button states', async ({ page }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Send button should be disabled when empty
            await expect(chatbot.sendButton).toBeDisabled()

            // Should be enabled when text is entered
            await chatbot.messageInput.fill('Test message')
            await expect(chatbot.sendButton).toBeEnabled()

            // Settings save button should have proper states
            await chatbot.openSettings()
            await chatbot.selectProvider('gemini')
            await expect(chatbot.saveSettingsButton).toBeDisabled()

            await chatbot.setApiKey('AIzaTestKey')
            await expect(chatbot.saveSettingsButton).toBeEnabled()
        })

        test('should support screen reader friendly text', async ({ page }) => {
            // Check for descriptive button text
            await expect(
                page.getByRole('button', { name: '⚙️ Settings' })
            ).toBeVisible()
            await expect(
                page.getByRole('button', { name: 'Clear Chat' })
            ).toBeVisible()
            await expect(
                page.getByRole('button', { name: 'Send' })
            ).toBeVisible()

            // Check for descriptive link text
            await expect(
                page.getByRole('link', { name: 'SvelteKit docs' })
            ).toBeVisible()
        })

        test('should have proper focus management', async ({ page }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Focus should be manageable in settings panel
            await chatbot.openSettings()

            // Tab to provider select
            await page.keyboard.press('Tab')
            await expect(chatbot.providerSelect).toBeFocused()

            // Change provider and check focus moves appropriately
            await chatbot.providerSelect.selectOption('Google Gemini')
            await page.keyboard.press('Tab')
            await expect(chatbot.apiKeyInput).toBeFocused()
        })

        test('should handle high contrast and reduced motion', async ({
            page,
        }) => {
            // Test with reduced motion preference
            await page.emulateMedia({ reducedMotion: 'reduce' })

            const chatbot = new ChatbotTestHelper(page)
            await chatbot.sendMessage('Test message with reduced motion')
            await expect(
                page.getByText('Test message with reduced motion')
            ).toBeVisible()

            // Test with high contrast
            await page.emulateMedia({ colorScheme: 'dark' })
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()
        })
    })

    test.describe('Performance', () => {
        test('should load page within acceptable time', async ({ page }) => {
            const perf = new PerformanceTestHelper(page)

            // Page should load within 3 seconds
            await perf.expectPageLoadWithinTime(3000)
        })

        test('should respond to chat messages quickly', async ({ page }) => {
            const perf = new PerformanceTestHelper(page)

            // Chat response should be within 2 seconds
            await perf.expectChatResponseWithinTime(
                'Test performance message',
                2000
            )
        })

        test('should handle multiple rapid interactions', async ({ page }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Send multiple messages quickly
            const messages = ['Message 1', 'Message 2', 'Message 3']

            for (const message of messages) {
                await chatbot.messageInput.fill(message)
                await chatbot.sendButton.click()
                // Don't wait for response to test rapid interactions
            }

            // All messages should eventually appear
            for (const message of messages) {
                await expect(page.getByText(message)).toBeVisible({
                    timeout: 10000,
                })
            }
        })

        test('should maintain performance with long chat history', async ({
            page,
        }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Send many messages to build up history
            for (let i = 0; i < 10; i++) {
                await chatbot.sendMessage(`Performance test message ${i + 1}`)
                await chatbot.waitForResponse()
            }

            // New messages should still respond quickly
            const startTime = Date.now()
            await chatbot.sendMessage('Final performance test')
            await chatbot.waitForResponse()
            const responseTime = Date.now() - startTime

            expect(responseTime).toBeLessThan(3000)
        })

        test('should handle settings panel interactions efficiently', async ({
            page,
        }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Rapidly open/close settings
            for (let i = 0; i < 5; i++) {
                await chatbot.openSettings()
                await chatbot.closeSettings()
            }

            // Should still be functional
            await chatbot.sendMessage('Settings performance test')
            await expect(
                page.getByText('Settings performance test')
            ).toBeVisible()
        })

        test('should render responsive changes smoothly', async ({ page }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Send a message first
            await chatbot.sendMessage('Responsive performance test')

            // Rapidly change viewport sizes
            const viewports = [
                { width: 1280, height: 720 },
                { width: 768, height: 1024 },
                { width: 375, height: 667 },
                { width: 1920, height: 1080 },
            ]

            for (const viewport of viewports) {
                await page.setViewportSize(viewport)
                // Small delay to allow rendering
                await page.waitForTimeout(100)
            }

            // Message should still be visible
            await expect(
                page.getByText('Responsive performance test')
            ).toBeVisible()

            // Should still be able to send messages
            await chatbot.sendMessage('Post-resize test')
            await expect(page.getByText('Post-resize test')).toBeVisible()
        })
    })

    test.describe('Error Handling', () => {
        test('should handle network interruptions gracefully', async ({
            page,
        }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Simulate offline condition
            await page.context().setOffline(true)

            // Try to send a message
            await chatbot.messageInput.fill('Offline test message')
            await chatbot.sendButton.click()

            // Should handle gracefully (likely showing the message but no response)
            await expect(page.getByText('Offline test message')).toBeVisible()

            // Restore connection
            await page.context().setOffline(false)

            // Should work normally again
            await chatbot.sendMessage('Back online test')
            await expect(page.getByText('Back online test')).toBeVisible()
        })

        test('should handle malformed input gracefully', async ({ page }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Try various edge cases
            const edgeCases = [
                '', // Empty string
                ' '.repeat(100), // Whitespace
                'a'.repeat(1000), // Very long string
                '🎮'.repeat(50), // Emoji spam
                '<script>alert("test")</script>', // HTML/JS injection attempt
                'null',
                'undefined',
                '0',
                'false',
            ]

            for (const testCase of edgeCases) {
                if (testCase.trim()) {
                    // Only test non-empty strings
                    await chatbot.messageInput.fill(testCase)
                    if (await chatbot.sendButton.isEnabled()) {
                        await chatbot.sendButton.click()
                        // Should handle gracefully without crashing
                        await expect(page.getByText(testCase)).toBeVisible({
                            timeout: 5000,
                        })
                    }
                }
            }
        })

        test('should recover from component errors', async ({ page }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Send normal message first
            await chatbot.sendMessage('Before error test')

            // Clear chat and ensure it works
            await chatbot.clearChat()
            await expect(chatbot.welcomeMessage).toBeVisible()

            // Should be able to continue normally
            await chatbot.sendMessage('After recovery test')
            await expect(page.getByText('After recovery test')).toBeVisible()
        })
    })

    test.describe('Browser Compatibility', () => {
        test('should work with different viewport orientations', async ({
            page,
        }) => {
            const chatbot = new ChatbotTestHelper(page)

            // Portrait
            await page.setViewportSize({ width: 375, height: 667 })
            await chatbot.sendMessage('Portrait test')

            // Landscape
            await page.setViewportSize({ width: 667, height: 375 })
            await expect(page.getByText('Portrait test')).toBeVisible()
            await chatbot.sendMessage('Landscape test')

            // Both messages should be visible
            await expect(page.getByText('Landscape test')).toBeVisible()
        })

        test('should handle different font sizes', async ({ page }) => {
            // Test with larger font size
            await page.addStyleTag({
                content: `
          * { font-size: 20px !important; }
        `,
            })

            const chatbot = new ChatbotTestHelper(page)
            await chatbot.sendMessage('Large font test')
            await expect(page.getByText('Large font test')).toBeVisible()

            // Layout should not break
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()
        })
    })
})
