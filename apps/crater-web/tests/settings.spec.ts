import { test, expect } from '@playwright/test'
import { ChatbotTestHelper } from './test-helpers'

test.describe('Settings Panel Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(200)
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

            // Open settings via the header settings button
            await settingsButton.click()
            await expect(settingsPanel).toBeVisible()
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
            await page
                .getByRole('button', { name: 'Cancel', exact: true })
                .click()
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

            // Click outside the panel by targeting the backdrop element
            await page
                .locator('.modal-backdrop')
                .click({ position: { x: 10, y: 10 } })

            // Panel should close when clicking outside/backdrop
            await expect(
                page.getByText('AI Provider Configuration')
            ).not.toBeVisible()
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
                'Debug (Test Images)',
                'Google Gemini',
                'OpenAI',
            ])
        })

        test('should default to "Debug (Test Images)"', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            const providerSelect = page.getByLabel('AI Provider:')
            await expect(providerSelect).toHaveValue('debug')

            // Debug provider keeps API key field visible but disabled with hint text
            const apiKeyInput = page.getByLabel('API Key:')
            await expect(apiKeyInput).toBeDisabled()
            await expect(apiKeyInput).toHaveAttribute(
                'placeholder',
                'Not required for debug provider'
            )
        })

        test('should switch between providers correctly', async ({ page }) => {
            await page.getByRole('button', { name: '⚙️ Settings' }).click()

            const providerSelect = page.getByLabel('AI Provider:')

            // Default should be Debug
            await expect(providerSelect).toHaveValue('debug')

            // Switch to Gemini
            await providerSelect.selectOption('gemini')
            await expect(providerSelect).toHaveValue('gemini')
            await expect(page.getByPlaceholder('AIza...')).toBeVisible()

            // Switch to OpenAI
            await providerSelect.selectOption('openai')
            await expect(providerSelect).toHaveValue('openai')
            await expect(page.getByPlaceholder('sk-...')).toBeVisible()

            // Switch back to Debug
            await providerSelect.selectOption('debug')
            await expect(providerSelect).toHaveValue('debug')
            const apiKeyInput = page.getByLabel('API Key:')
            await expect(apiKeyInput).toBeVisible()
            await expect(apiKeyInput).toBeDisabled()
            await expect(apiKeyInput).toHaveAttribute(
                'placeholder',
                'Not required for debug provider'
            )
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
                exact: true,
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
                exact: true,
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
                exact: true,
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
                exact: true,
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
            await page
                .getByRole('button', { name: 'Cancel', exact: true })
                .click()

            // Reopen settings - should be back to defaults
            await page.getByRole('button', { name: '⚙️ Settings' }).click()
            await expect(page.getByLabel('AI Provider:')).toHaveValue('debug')
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
            await expect(page.getByText('DEBUG Ready')).toBeVisible()
            await expect(page.locator('.status-indicator.active')).toBeVisible()
        })

        test('should maintain status indicator styling', async ({ page }) => {
            const statusDot = page.locator('.status-indicator')
            await expect(statusDot).toBeVisible()

            // Should have active class initially for debug provider
            await expect(statusDot).toHaveClass(/active/)
        })
    })

    test.describe('Settings Panel Accessibility', () => {
        test('should support keyboard navigation', async ({ page }) => {
            const helper = new ChatbotTestHelper(page)

            await helper.openSettings()

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
            const helper = new ChatbotTestHelper(page)

            await helper.openSettings()

            // Check form labels are properly associated
            await expect(page.getByLabel('AI Provider:')).toBeVisible()

            await page.getByLabel('AI Provider:').selectOption('Google Gemini')
            await expect(page.getByLabel('API Key:')).toBeVisible()
        })

        test('should support screen reader text', async ({ page }) => {
            const helper = new ChatbotTestHelper(page)

            await helper.openSettings()

            // Check that buttons have descriptive text
            await expect(
                page.getByRole('button', {
                    name: 'Save Settings',
                    exact: true,
                })
            ).toBeVisible()
            await expect(
                page.getByRole('button', { name: 'Cancel', exact: true })
            ).toBeVisible()
        })
    })
})
