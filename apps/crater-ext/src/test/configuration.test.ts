import { strict as assert } from 'assert'
import { workspace, ConfigurationTarget } from 'vscode'

suite('Configuration Test Suite', () => {
    test('Configuration schema should be defined correctly', () => {
        const config = workspace.getConfiguration('crater-ext')

        // Test default values match package.json
        const aiProvider = config.inspect<string>('aiProvider')
        const aiModel = config.inspect<string>('aiModel')
        const imageSaveDirectory = config.inspect<string>('imageSaveDirectory')
        const autoSaveImages = config.inspect<boolean>('autoSaveImages')
        const imageSize = config.inspect<string>('imageSize')
        const imageQuality = config.inspect<string>('imageQuality')

        assert.strictEqual(aiProvider?.defaultValue, 'gemini')
        assert.strictEqual(
            aiModel?.defaultValue,
            'gemini-2.5-flash-image-preview'
        )
        assert.strictEqual(
            imageSaveDirectory?.defaultValue,
            '${workspaceFolder}/images'
        )
        assert.strictEqual(autoSaveImages?.defaultValue, true)
        assert.strictEqual(imageSize?.defaultValue, 'auto')
        assert.strictEqual(imageQuality?.defaultValue, 'auto')
    })

    test('Configuration should accept valid values', async () => {
        const config = workspace.getConfiguration('crater-ext')
        const originalValue = config.get('aiProvider')

        // Test setting valid provider
        await config.update('aiProvider', 'openai', ConfigurationTarget.Global)

        // Get fresh config after update
        const updatedConfig = workspace.getConfiguration('crater-ext')
        assert.strictEqual(updatedConfig.get('aiProvider'), 'openai')

        // Reset to original value
        await updatedConfig.update(
            'aiProvider',
            originalValue,
            ConfigurationTarget.Global
        )
    })

    test('Configuration should handle API key settings', async () => {
        const config = workspace.getConfiguration('crater-ext')

        // Test setting API keys (use empty strings for testing)
        await config.update('geminiApiKey', '', ConfigurationTarget.Global)
        await config.update('openaiApiKey', '', ConfigurationTarget.Global)

        assert.strictEqual(config.get('geminiApiKey'), '')
        assert.strictEqual(config.get('openaiApiKey'), '')
    })

    test('Configuration should handle image settings', async () => {
        const config = workspace.getConfiguration('crater-ext')
        const originalSize = config.get('imageSize')
        const originalQuality = config.get('imageQuality')

        // Test image size settings
        await config.update(
            'imageSize',
            '1024x1024',
            ConfigurationTarget.Global
        )
        const updatedConfig1 = workspace.getConfiguration('crater-ext')
        assert.strictEqual(updatedConfig1.get('imageSize'), '1024x1024')

        // Test image quality settings
        await updatedConfig1.update(
            'imageQuality',
            'high',
            ConfigurationTarget.Global
        )
        const updatedConfig2 = workspace.getConfiguration('crater-ext')
        assert.strictEqual(updatedConfig2.get('imageQuality'), 'high')

        // Reset to original values
        await updatedConfig2.update(
            'imageSize',
            originalSize,
            ConfigurationTarget.Global
        )
        await updatedConfig2.update(
            'imageQuality',
            originalQuality,
            ConfigurationTarget.Global
        )
    })

    test('Configuration should handle boolean settings', async () => {
        const config = workspace.getConfiguration('crater-ext')
        const originalValue = config.get('autoSaveImages')

        // Test auto save setting
        await config.update('autoSaveImages', false, ConfigurationTarget.Global)
        const updatedConfig = workspace.getConfiguration('crater-ext')
        assert.strictEqual(updatedConfig.get('autoSaveImages'), false)

        // Reset to original value
        await updatedConfig.update(
            'autoSaveImages',
            originalValue,
            ConfigurationTarget.Global
        )
    })

    test('Configuration should handle path settings', async () => {
        const config = workspace.getConfiguration('crater-ext')
        const originalPath = config.get('imageSaveDirectory')

        // Test custom directory path
        const customPath = '/custom/path/to/images'
        await config.update(
            'imageSaveDirectory',
            customPath,
            ConfigurationTarget.Global
        )
        const updatedConfig = workspace.getConfiguration('crater-ext')
        assert.strictEqual(updatedConfig.get('imageSaveDirectory'), customPath)

        // Reset to original value
        await updatedConfig.update(
            'imageSaveDirectory',
            originalPath,
            ConfigurationTarget.Global
        )
    })
})
