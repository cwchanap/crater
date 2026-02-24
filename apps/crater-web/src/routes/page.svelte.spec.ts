import { page, type Locator } from '@vitest/browser/context'
import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Page from './+page.svelte'

describe('/+page.svelte', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('should render h1', async () => {
        render(Page)

        const heading: Locator = page.getByRole('heading', { level: 1 })
        await expect.element(heading).toBeInTheDocument()
    })

    it('should generate an image response in default image mode', async () => {
        render(Page)

        const input: Locator = page.getByRole('textbox')
        await input.fill('Generate a pixel art hero')
        await page.getByRole('button', { name: 'Send' }).click()

        await expect
            .element(page.getByText(/Generated 1 image\(s\) for:/))
            .toBeInTheDocument()
    })

    it('should warn when image intent is sent in chat mode', async () => {
        render(Page)

        await page.getByRole('button', { name: /New Chat/i }).click()
        await page.getByRole('button', { name: 'Chat Mode' }).click()

        const input: Locator = page.getByRole('textbox')
        await input.fill('Create an image of a dragon')
        await page.getByRole('button', { name: 'Send' }).click()

        await expect
            .element(
                page.getByText(
                    'This session is in chat mode. Start a new image session to generate artwork.'
                )
            )
            .toBeInTheDocument()
    })

    it('should open and save the settings modal', async () => {
        render(Page)

        await page.getByRole('button', { name: '⚙️ Settings' }).click()
        await expect
            .element(page.getByText('⚙️ AI Provider Configuration'))
            .toBeInTheDocument()

        await page
            .getByRole('button', { name: 'Save Settings', exact: true })
            .click()
        expect(localStorage.getItem('crater-web-ai-settings')).not.toBeNull()
    })
})
