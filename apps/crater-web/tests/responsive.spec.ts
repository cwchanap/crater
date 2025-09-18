import { test, expect } from '@playwright/test'

test.describe('Responsive Design Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test.describe('Desktop Layout', () => {
        test('should display two-column layout on desktop', async ({
            page,
        }) => {
            await page.setViewportSize({ width: 1280, height: 720 })

            // Check that both main sections are visible side by side
            const chatbotSection = page.locator('.chatbot-section')
            const infoSection = page.locator('.info-section')

            await expect(chatbotSection).toBeVisible()
            await expect(infoSection).toBeVisible()

            // Check that header text is full size
            const mainHeading = page.getByRole('heading', {
                name: '🌋 Crater Web',
            })
            await expect(mainHeading).toBeVisible()
        })

        test('should maintain functionality at large desktop sizes', async ({
            page,
        }) => {
            await page.setViewportSize({ width: 1920, height: 1080 })

            // Test basic chatbot functionality
            await page
                .getByRole('textbox', { name: /Ask me about game assets/ })
                .fill('Desktop large test')
            await page.getByRole('button', { name: 'Send' }).click()

            await expect(page.getByText('Desktop large test')).toBeVisible()
        })
    })

    test.describe('Tablet Layout', () => {
        test('should adapt layout for tablet portrait', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 })

            // Elements should still be visible and functional
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()
            await expect(
                page.getByRole('heading', { name: '🎮 Game Asset Assistant' })
            ).toBeVisible()

            // Test chatbot functionality
            await page
                .getByRole('textbox', { name: /Ask me about game assets/ })
                .fill('Tablet portrait test')
            await page.getByRole('button', { name: 'Send' }).click()

            await expect(page.getByText('Tablet portrait test')).toBeVisible()
        })

        test('should adapt layout for tablet landscape', async ({ page }) => {
            await page.setViewportSize({ width: 1024, height: 768 })

            // Check that layout adapts properly
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()

            // Test settings panel functionality
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).toBeVisible()

            // Select a provider
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            await expect(page.getByLabel('API Key:')).toBeVisible()
        })
    })

    test.describe('Mobile Layout', () => {
        test('should work on iPhone-sized screens', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 })

            // Main elements should be visible and stacked
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()
            await expect(
                page.getByRole('heading', { name: '🎮 Game Asset Assistant' })
            ).toBeVisible()

            // Chat functionality should work
            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })
            await messageInput.fill('iPhone test message')
            await page.getByRole('button', { name: 'Send' }).click()

            await expect(page.getByText('iPhone test message')).toBeVisible()
        })

        test('should work on Android-sized screens', async ({ page }) => {
            await page.setViewportSize({ width: 360, height: 640 })

            // Test settings panel on small screen
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).toBeVisible()

            // Provider selection should work
            await page.getByLabel('AI Provider:').selectOption('OpenAI')
            await expect(page.getByPlaceholder('sk-...')).toBeVisible()

            // Cancel should work
            await page.getByRole('button', { name: 'Cancel' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).not.toBeVisible()
        })

        test('should handle very small screens', async ({ page }) => {
            await page.setViewportSize({ width: 320, height: 568 })

            // Basic functionality should still work
            await expect(
                page.getByRole('heading', { name: '🌋 Crater Web' })
            ).toBeVisible()

            const messageInput = page.getByRole('textbox', {
                name: /Ask me about game assets/,
            })
            await messageInput.fill('Small screen test')
            await page.getByRole('button', { name: 'Send' }).click()

            await expect(page.getByText('Small screen test')).toBeVisible()
        })
    })

    test.describe('Cross-Device Consistency', () => {
        test('should maintain chat state across viewport changes', async ({
            page,
        }) => {
            // Start on desktop
            await page.setViewportSize({ width: 1280, height: 720 })

            // Send a message
            await page
                .getByRole('textbox', { name: /Ask me about game assets/ })
                .fill('Consistency test')
            await page.getByRole('button', { name: 'Send' }).click()
            await expect(page.getByText('Consistency test')).toBeVisible()

            // Switch to mobile
            await page.setViewportSize({ width: 375, height: 667 })

            // Message should still be visible
            await expect(page.getByText('Consistency test')).toBeVisible()

            // Should be able to send another message
            await page
                .getByRole('textbox', { name: /Ask me about game assets/ })
                .fill('Mobile follow-up')
            await page.getByRole('button', { name: 'Send' }).click()
            await expect(page.getByText('Mobile follow-up')).toBeVisible()
        })

        test('should handle orientation changes', async ({ page }) => {
            // Portrait mobile
            await page.setViewportSize({ width: 375, height: 667 })
            await page
                .getByRole('textbox', { name: /Ask me about game assets/ })
                .fill('Portrait message')
            await page.getByRole('button', { name: 'Send' }).click()

            // Landscape mobile
            await page.setViewportSize({ width: 667, height: 375 })
            await expect(page.getByText('Portrait message')).toBeVisible()

            // Should still function
            await page
                .getByRole('textbox', { name: /Ask me about game assets/ })
                .fill('Landscape message')
            await page.getByRole('button', { name: 'Send' }).click()
            await expect(page.getByText('Landscape message')).toBeVisible()
        })
    })

    test.describe('Touch and Accessibility', () => {
        test('should handle touch interactions on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 })

            // Tap settings button
            await page.getByRole('button', { name: '⚙️ Settings' }).tap()
            await expect(
                page.getByText('AI Provider Configuration')
            ).toBeVisible()

            // Tap dropdown
            await page.getByLabel('AI Provider:').tap()
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')

            // Tap cancel
            await page.getByRole('button', { name: 'Cancel' }).tap()
            await expect(
                page.getByText('AI Provider Configuration')
            ).not.toBeVisible()
        })

        test('should maintain proper focus order on mobile', async ({
            page,
        }) => {
            await page.setViewportSize({ width: 375, height: 667 })

            // Test tab navigation
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')

            // Should be able to navigate to all interactive elements
            const focusedElement = await page.evaluate(
                () => document.activeElement?.tagName
            )
            expect(['BUTTON', 'INPUT', 'SELECT', 'A']).toContain(focusedElement)
        })
    })
})
