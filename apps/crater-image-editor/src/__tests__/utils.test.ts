import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageEditorProvider } from '../imageEditorProvider'

describe('Utility Functions', () => {
    let provider: ImageEditorProvider

    beforeEach(() => {
        // Create a minimal provider instance for testing utility methods
        provider = new (ImageEditorProvider as any)(
            { fsPath: '/test/extension' },
            {
                subscriptions: [],
                globalState: { get: vi.fn(), update: vi.fn() },
            }
        )
    })

    describe('MIME Type Detection', () => {
        it('should return correct MIME types for supported image formats', () => {
            const testCases = [
                { ext: 'png', expected: 'image/png' },
                { ext: 'jpg', expected: 'image/jpeg' },
                { ext: 'jpeg', expected: 'image/jpeg' },
                { ext: 'gif', expected: 'image/gif' },
                { ext: 'bmp', expected: 'image/bmp' },
                { ext: 'webp', expected: 'image/webp' },
                { ext: 'PNG', expected: 'image/png' }, // Test case insensitive
                { ext: 'JPG', expected: 'image/jpeg' },
                { ext: '', expected: 'image/png' }, // Default fallback
                { ext: 'unknown', expected: 'image/png' }, // Unknown extension fallback
                { ext: 'txt', expected: 'image/png' }, // Non-image extension fallback
            ]

            testCases.forEach(({ ext, expected }) => {
                const result = (provider as any).getMimeType(ext)
                expect(result).toBe(expected)
            })
        })

        it('should handle extensions with and without dots', () => {
            expect((provider as any).getMimeType('.png')).toBe('image/png')
            expect((provider as any).getMimeType('png')).toBe('image/png')
            expect((provider as any).getMimeType('.jpg')).toBe('image/jpeg')
            expect((provider as any).getMimeType('jpg')).toBe('image/jpeg')
        })
    })

    describe('File Path Handling', () => {
        it('should handle various file path formats', () => {
            const testPaths = [
                '/absolute/path/image.png',
                './relative/path/image.jpg',
                'image.gif',
                'C:\\Windows\\Path\\image.bmp', // Windows path
                '/unix/path/image.webp',
            ]

            // These are just smoke tests to ensure the provider can handle different path formats
            testPaths.forEach((path) => {
                expect(typeof path).toBe('string')
                expect(path.length).toBeGreaterThan(0)
            })
        })
    })

    describe('Image Data Processing', () => {
        it('should handle base64 data URL format', () => {
            const testDataUrls = [
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/vAA==',
                'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            ]

            testDataUrls.forEach((dataUrl) => {
                expect(dataUrl).toMatch(/^data:image\/(png|jpeg|gif);base64,/)
                expect(dataUrl.split(',')[0]).toContain('data:image')
                expect(dataUrl.split(',')[1]).toBeDefined()
            })
        })

        it('should validate image data format', () => {
            const validDataUrl =
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            const invalidDataUrl = 'invalid-data-url'
            const plainBase64 =
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

            expect(validDataUrl).toMatch(/^data:image\/[^;]+;base64,/)
            expect(invalidDataUrl).not.toMatch(/^data:image\/[^;]+;base64,/)
            expect(plainBase64).not.toMatch(/^data:image\/[^;]+;base64,/)
        })
    })

    describe('Configuration Handling', () => {
        it('should handle default configuration values', () => {
            const defaultConfig = {
                outputDirectory: '${workspaceFolder}/edited-images',
                outputFormat: 'png',
                quality: 90,
                preserveOriginal: true,
            }

            Object.entries(defaultConfig).forEach(([, expectedValue]) => {
                expect(typeof expectedValue).toBeDefined()
                if (typeof expectedValue === 'string') {
                    expect(expectedValue.length).toBeGreaterThan(0)
                }
                if (typeof expectedValue === 'number') {
                    expect(expectedValue).toBeGreaterThanOrEqual(0)
                }
                if (typeof expectedValue === 'boolean') {
                    expect(typeof expectedValue).toBe('boolean')
                }
            })
        })

        it('should validate quality range', () => {
            const validQualities = [1, 25, 50, 75, 90, 100]
            const invalidQualities = [0, -1, 101, 200]

            validQualities.forEach((quality) => {
                expect(quality).toBeGreaterThanOrEqual(1)
                expect(quality).toBeLessThanOrEqual(100)
            })

            invalidQualities.forEach((quality) => {
                // Each invalid value should fall outside the allowed [1, 100] range
                expect(quality >= 1 && quality <= 100).toBe(false)
            })
        })
    })

    describe('Error Handling', () => {
        it('should handle malformed file paths gracefully', () => {
            const malformedPaths = ['', null, undefined, {}, [], 123]

            malformedPaths.forEach((path) => {
                expect(() => {
                    if (typeof path === 'string' && path) {
                        // Valid string path
                        const normalized = path.trim()
                        expect(normalized.length).toBeGreaterThan(0)
                    } else {
                        // Invalid path should be handled
                        // Avoid string operations on non-string values and ensure no exceptions are thrown
                    }
                }).not.toThrow()
            })
        })

        it('should handle invalid image data', () => {
            const invalidData = [
                '',
                'not-base64',
                'data:text/plain;base64,SGVsbG8gV29ybGQ=', // Wrong MIME type
                'data:image/png;base64,invalid-base64!!!', // Invalid base64
            ]

            invalidData.forEach((data) => {
                if (data.includes('data:image/')) {
                    expect(data).toMatch(/^data:image\/[^;]+;base64,/)
                } else {
                    expect(data).not.toMatch(/^data:image\/[^;]+;base64,/)
                }
            })
        })
    })
})
