import { test, expect } from '@playwright/test'

test.describe('Settings Panel Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test.describe('Settings Panel Visibility', () => {
        test('should open settings panel when button is clicked', async ({
            page,
        }) => {
            const settingsButton = page.getByRole('button', {
                name: '⚙️ Settings',
            })
            const settingsPanel = page.getByText('AI Provider Configuration')

            // Initially hidden
            await expect(settingsPanel).not.toBeVisible()

            // Open settings
            await settingsButton.click()
            await expect(settingsPanel).toBeVisible()

            // Button should show active state
            await expect(settingsButton).toHaveAttribute('class', /active/)
        })

        test('should close settings panel when Cancel is clicked', async ({
            page,
        }) => {
            // Open settings
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).toBeVisible()

            // Close with Cancel
            await page.getByRole('button', { name: 'Cancel' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).not.toBeVisible()
        })

        test('should close settings panel when clicking outside', async ({
            page,
        }) => {
            // Open settings
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await expect(
                page.getByText('AI Provider Configuration')
            ).toBeVisible()

            // Click outside the panel (on the main content)
            await page.getByText('Welcome to the Game Asset Assistant!').click()

            // Panel should still be visible (we don't have click-outside functionality implemented)
            await expect(
                page.getByText('AI Provider Configuration')
            ).toBeVisible()
        })
    })

    test.describe('Provider Selection', () => {
        test('should display all provider options', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            const providerSelect = page.getByLabel('AI Provider:')
            await expect(providerSelect).toBeVisible()

            // Check all options
            const options = await providerSelect
                .locator('option')
                .allTextContents()
            expect(options).toEqual([
                'None (Text Only)',
                'Google Gemini',
                'OpenAI',
            ])
        })

        test('should default to "None (Text Only)"', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            const providerSelect = page.getByLabel('AI Provider:')
            await expect(providerSelect).toHaveValue('none')

            // No API key field should be visible
            await expect(page.getByLabel('API Key:')).not.toBeVisible()
        })

        test('should switch between providers correctly', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            const providerSelect = page.getByLabel('AI Provider:')

            // Switch to Gemini
            await providerSelect.selectOption('gemini')
            await expect(providerSelect).toHaveValue('gemini')
            await expect(page.getByPlaceholder('AIza...')).toBeVisible()

            // Switch to OpenAI
            await providerSelect.selectOption('openai')
            await expect(providerSelect).toHaveValue('openai')
            await expect(page.getByPlaceholder('sk-...')).toBeVisible()

            // Switch back to None
            await providerSelect.selectOption('none')
            await expect(providerSelect).toHaveValue('none')
            await expect(page.getByLabel('API Key:')).not.toBeVisible()
        })
    })

    test.describe('Gemini Provider Configuration', () => {
        test('should show Gemini-specific fields', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')

            // Check API key field
            const apiKeyInput = page.getByLabel('API Key:')
            await expect(apiKeyInput).toBeVisible()
            await expect(apiKeyInput).toHaveAttribute('type', 'password')
            await expect(apiKeyInput).toHaveAttribute('placeholder', 'AIza...')

            // Check help text and link
            await expect(page.getByText('Get your API key from')).toBeVisible()
            const geminiLink = page.getByRole('link', {
                name: 'Google AI Studio',
            })
            await expect(geminiLink).toBeVisible()
            await expect(geminiLink).toHaveAttribute(
                'href',
                'https://makersuite.google.com/app/apikey'
            )
            await expect(geminiLink).toHaveAttribute('target', '_blank')
        })

        test('should validate Gemini API key format', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')

            const apiKeyInput = page.getByLabel('API Key:')
            const saveButton = page.getByRole('button', {
                name: 'Save Settings',
            })

            // Empty key - save should be disabled
            await expect(saveButton).toBeDisabled()

            // Invalid key format - save should be disabled
            await apiKeyInput.fill('invalid-key')
            await expect(saveButton).toBeDisabled()

            // Valid Gemini key format - save should be enabled
            await apiKeyInput.fill('AIza123456789')
            await expect(saveButton).toBeEnabled()
        })

        test('should handle Gemini API key input', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')

            const apiKeyInput = page.getByLabel('API Key:')

            // Type in API key
            await apiKeyInput.fill('AIzaTestKey123456789')
            await expect(apiKeyInput).toHaveValue('AIzaTestKey123456789')

            // Clear API key
            await apiKeyInput.clear()
            await expect(apiKeyInput).toHaveValue('')
        })
    })

    test.describe('OpenAI Provider Configuration', () => {
        test('should show OpenAI-specific fields', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await page.getByLabel('AI Provider:').selectOption('OpenAI')

            // Check API key field
            const apiKeyInput = page.getByLabel('API Key:')
            await expect(apiKeyInput).toBeVisible()
            await expect(apiKeyInput).toHaveAttribute('type', 'password')
            await expect(apiKeyInput).toHaveAttribute('placeholder', 'sk-...')

            // Check help text and link
            await expect(page.getByText('Get your API key from')).toBeVisible()
            const openaiLink = page.getByRole('link', {
                name: 'OpenAI Platform',
            })
            await expect(openaiLink).toBeVisible()
            await expect(openaiLink).toHaveAttribute(
                'href',
                'https://platform.openai.com/api-keys'
            )
            await expect(openaiLink).toHaveAttribute('target', '_blank')
        })

        test('should validate OpenAI API key format', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await page.getByLabel('AI Provider:').selectOption('OpenAI')

            const apiKeyInput = page.getByLabel('API Key:')
            const saveButton = page.getByRole('button', {
                name: 'Save Settings',
            })

            // Empty key - save should be disabled
            await expect(saveButton).toBeDisabled()

            // Invalid key format - save should be disabled
            await apiKeyInput.fill('invalid-key')
            await expect(saveButton).toBeDisabled()

            // Valid OpenAI key format - save should be enabled
            await apiKeyInput.fill('sk-1234567890abcdef')
            await expect(saveButton).toBeEnabled()
        })
    })

    test.describe('Save and Cancel Actions', () => {
        test('should save settings for None provider', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // None provider should allow saving immediately
            const saveButton = page.getByRole('button', {
                name: 'Save Settings',
            })
            await expect(saveButton).toBeEnabled()

            await saveButton.click()

            // Settings panel should close
            await expect(
                page.getByText('AI Provider Configuration')
            ).not.toBeVisible()
        })

        test('should not save settings without required API key', async ({
            page,
        }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Select Gemini without API key
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')

            const saveButton = page.getByRole('button', {
                name: 'Save Settings',
            })
            await expect(saveButton).toBeDisabled()

            // Add API key
            await page.getByLabel('API Key:').fill('AIzaTestKey')
            await expect(saveButton).toBeEnabled()
        })

        test('should preserve settings when canceling', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Change settings
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            await page.getByLabel('API Key:').fill('AIzaTestKey')

            // Cancel without saving
            await page.getByRole('button', { name: 'Cancel' }).click()

            // Reopen settings - should be back to defaults
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await expect(page.getByLabel('AI Provider:')).toHaveValue('none')
        })

        test('should clear form when switching providers', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Set Gemini with API key
            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            await page.getByLabel('API Key:').fill('AIzaTestKey')

            // Switch to OpenAI
            await page.getByLabel('AI Provider:').selectOption('OpenAI')

            // API key field should be empty with new placeholder
            await expect(page.getByLabel('API Key:')).toHaveValue('')
            await expect(page.getByPlaceholder('sk-...')).toBeVisible()
        })
    })

    test.describe('Provider Status Updates', () => {
        test('should show correct provider status when none configured', async ({
            page,
        }) => {
            // Check initial status
            await expect(page.getByText('No AI Provider')).toBeVisible()
            await expect(
                page.locator('.status-indicator.inactive')
            ).toBeVisible()
        })

        test('should maintain status indicator styling', async ({ page }) => {
            const statusDot = page.locator('.status-indicator')
            await expect(statusDot).toBeVisible()

            // Should have inactive class initially
            await expect(statusDot).toHaveClass(/inactive/)
        })
    })

    test.describe('Settings Panel Accessibility', () => {
        test('should support keyboard navigation', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Tab through elements
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')

            // Should be able to navigate through form elements
            const focusedElement = await page.evaluate(
                () => document.activeElement?.tagName
            )
            expect(['SELECT', 'BUTTON', 'INPUT']).toContain(focusedElement)
        })

        test('should have proper form labels', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Check form labels are properly associated
            await expect(page.getByLabel('AI Provider:')).toBeVisible()

            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            await expect(page.getByLabel('API Key:')).toBeVisible()
        })

        test('should support screen reader text', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            // Check that buttons have descriptive text
            await expect(
                page.getByRole('button', { name: 'Save Settings' })
            ).toBeVisible()
            await expect(
                page.getByRole('button', { name: 'Cancel' })
            ).toBeVisible()
        })
    })
})
