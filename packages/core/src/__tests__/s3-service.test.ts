import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AWS SDK before importing s3-service (handles dynamic import caching)
const mockSend = vi.fn()

const MockS3Client = vi.fn(() => ({
    send: mockSend,
    config: { region: 'us-east-1' },
}))

const MockPutObjectCommand = vi.fn((params: unknown) => ({
    ...(params as object),
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: MockS3Client,
    PutObjectCommand: MockPutObjectCommand,
}))

import { S3Service } from '../services/s3-service'

const validConfig = {
    bucketName: 'test-bucket',
    region: 'us-east-1',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENGbPxRfiCYEXAMPLEKEY',
}

describe('S3Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSend.mockResolvedValue({})
        MockS3Client.mockImplementation(() => ({
            send: mockSend,
            config: { region: 'us-east-1' },
        }))
    })

    describe('validateConfig', () => {
        it('should throw when bucketName is empty', () => {
            expect(() =>
                S3Service.validateConfig({ ...validConfig, bucketName: '' })
            ).toThrow('S3 bucket name is required')
        })

        it('should throw when bucketName is whitespace only', () => {
            expect(() =>
                S3Service.validateConfig({ ...validConfig, bucketName: '   ' })
            ).toThrow('S3 bucket name is required')
        })

        it('should throw when region is empty', () => {
            expect(() =>
                S3Service.validateConfig({ ...validConfig, region: '' })
            ).toThrow('S3 region is required')
        })

        it('should throw when region is whitespace only', () => {
            expect(() =>
                S3Service.validateConfig({ ...validConfig, region: '  ' })
            ).toThrow('S3 region is required')
        })

        it('should throw when accessKeyId is empty', () => {
            expect(() =>
                S3Service.validateConfig({ ...validConfig, accessKeyId: '' })
            ).toThrow('S3 access key ID is required')
        })

        it('should throw when secretAccessKey is empty', () => {
            expect(() =>
                S3Service.validateConfig({
                    ...validConfig,
                    secretAccessKey: '',
                })
            ).toThrow('S3 secret access key is required')
        })

        it('should not throw with a fully valid config', () => {
            expect(() => S3Service.validateConfig(validConfig)).not.toThrow()
        })
    })

    describe('generateImageFilename', () => {
        it('should generate a filename with the default prefix', () => {
            const filename = S3Service.generateImageFilename('test prompt')
            expect(filename).toMatch(/^crater-image\//)
            expect(filename).toMatch(/\.png$/)
        })

        it('should use a provided custom prefix', () => {
            const filename = S3Service.generateImageFilename(
                'test',
                'my-project'
            )
            expect(filename).toMatch(/^my-project\//)
        })

        it('should include a sanitized lowercase version of the prompt', () => {
            const filename =
                S3Service.generateImageFilename('Hello World! @#$%')
            expect(filename).toContain('hello-world')
            expect(filename).not.toContain('!')
            expect(filename).not.toContain('@')
            expect(filename).not.toContain('#')
        })

        it('should replace spaces with hyphens', () => {
            const filename = S3Service.generateImageFilename('a b c d')
            expect(filename).toContain('a-b-c-d')
        })

        it('should truncate prompts to at most 50 characters in the slug', () => {
            const longPrompt = 'word '.repeat(20).trim() // 99 chars
            const filename = S3Service.generateImageFilename(longPrompt)
            // Extract the prompt slug: part after timestamp (4th dash-separated group onwards)
            const name = filename.split('/')[1]
            // The full name has: timestamp-slug-randomsuffix.png
            // Slug should be <= 50 chars
            const slugMatch = name.match(/T[\d-]+-([a-z-]+)-[a-z0-9]+\.png$/)
            expect(slugMatch).not.toBeNull()
            expect(slugMatch![1].length).toBeLessThanOrEqual(50)
        })

        it('should include a timestamp in the filename', () => {
            const filename = S3Service.generateImageFilename('test')
            // ISO date with colons/dots replaced by dashes
            expect(filename).toMatch(/\d{4}-\d{2}-\d{2}T/)
        })

        it('should include a random suffix to prevent collisions', () => {
            const f1 = S3Service.generateImageFilename('same prompt')
            const f2 = S3Service.generateImageFilename('same prompt')
            expect(f1).not.toBe(f2)
        })

        it('should handle an empty prompt gracefully', () => {
            const filename = S3Service.generateImageFilename('')
            expect(filename).toMatch(/^crater-image\//)
            expect(filename).toMatch(/\.png$/)
        })
    })

    describe('S3Service.create', () => {
        it('should return an S3Service instance with valid config', async () => {
            const service = await S3Service.create(validConfig)
            expect(service).toBeInstanceOf(S3Service)
        })

        it('should create an S3Client with the correct region and credentials', async () => {
            await S3Service.create(validConfig)
            expect(MockS3Client).toHaveBeenCalledWith({
                region: validConfig.region,
                credentials: {
                    accessKeyId: validConfig.accessKeyId,
                    secretAccessKey: validConfig.secretAccessKey,
                },
            })
        })

        it('should throw when the config fails validation', async () => {
            await expect(
                S3Service.create({ ...validConfig, bucketName: '' })
            ).rejects.toThrow('S3 bucket name is required')
        })
    })

    describe('uploadFile', () => {
        let service: S3Service

        beforeEach(async () => {
            service = await S3Service.create(validConfig)
        })

        it('should return the correct S3 URL after a successful upload', async () => {
            const url = await service.uploadFile(
                'images/test.png',
                Buffer.from('data')
            )
            expect(url).toBe(
                'https://test-bucket.s3.us-east-1.amazonaws.com/images/test.png'
            )
        })

        it('should include the bucket name and key in the URL', async () => {
            const url = await service.uploadFile(
                'folder/sub/image.jpg',
                Buffer.from('data')
            )
            expect(url).toContain('test-bucket')
            expect(url).toContain('folder/sub/image.jpg')
        })

        it('should use application/octet-stream as the default content type', async () => {
            await service.uploadFile('test.bin', Buffer.from('data'))
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    ContentType: 'application/octet-stream',
                })
            )
        })

        it('should use the provided content type', async () => {
            await service.uploadFile('test.png', Buffer.from('data'), {
                contentType: 'image/png',
            })
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({ ContentType: 'image/png' })
            )
        })

        it('should include provided metadata in the PutObjectCommand', async () => {
            await service.uploadFile('test.png', Buffer.from('data'), {
                metadata: { source: 'ai', author: 'bot' },
            })
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    Metadata: { source: 'ai', author: 'bot' },
                })
            )
        })

        it('should use an empty object for metadata when not provided', async () => {
            await service.uploadFile('test.png', Buffer.from('data'))
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({ Metadata: {} })
            )
        })

        it('should send a PutObjectCommand with correct Bucket and Key', async () => {
            await service.uploadFile('path/to/file.png', Buffer.from('data'))
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Key: 'path/to/file.png',
                })
            )
        })

        it('should throw a wrapped error on send failure', async () => {
            mockSend.mockRejectedValue(new Error('Access denied'))
            await expect(
                service.uploadFile('test.png', Buffer.from('data'))
            ).rejects.toThrow('S3 upload failed: Access denied')
        })

        it('should handle non-Error upload failures with a generic message', async () => {
            mockSend.mockRejectedValue('network failure string')
            await expect(
                service.uploadFile('test.png', Buffer.from('data'))
            ).rejects.toThrow('S3 upload failed: Unknown error')
        })
    })

    describe('uploadFile with function-based region', () => {
        it('should resolve region from an async function', async () => {
            MockS3Client.mockReturnValueOnce({
                send: mockSend,
                config: { region: async () => 'eu-central-1' },
            })
            const service = await S3Service.create(validConfig)
            const url = await service.uploadFile(
                'test.png',
                Buffer.from('data')
            )
            expect(url).toContain('eu-central-1')
        })

        it('should fall back to us-east-1 when region function returns undefined', async () => {
            MockS3Client.mockReturnValueOnce({
                send: mockSend,
                config: { region: async () => undefined },
            })
            const service = await S3Service.create(validConfig)
            const url = await service.uploadFile(
                'test.png',
                Buffer.from('data')
            )
            expect(url).toContain('us-east-1')
        })
    })

    describe('uploadImageFromUrl', () => {
        let service: S3Service
        const mockFetch = vi.fn()

        beforeEach(async () => {
            global.fetch = mockFetch
            service = await S3Service.create(validConfig)
        })

        it('should fetch the image and return its S3 URL', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(8),
                headers: {
                    get: (h: string) =>
                        h === 'content-type' ? 'image/jpeg' : null,
                },
            })
            const url = await service.uploadImageFromUrl(
                'https://example.com/image.jpg',
                'images/remote.jpg'
            )
            expect(url).toContain('test-bucket')
            expect(url).toContain('images/remote.jpg')
        })

        it('should default to image/png when content-type header is absent', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(8),
                headers: { get: () => null },
            })
            await service.uploadImageFromUrl(
                'https://example.com/img.png',
                'test.png'
            )
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({ ContentType: 'image/png' })
            )
        })

        it('should include originalUrl and uploadedAt in the metadata', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(8),
                headers: { get: () => 'image/png' },
            })
            await service.uploadImageFromUrl(
                'https://example.com/img.png',
                'test.png'
            )
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    Metadata: expect.objectContaining({
                        originalUrl: 'https://example.com/img.png',
                        uploadedAt: expect.any(String),
                    }),
                })
            )
        })

        it('should merge caller-provided metadata with originalUrl and uploadedAt', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(8),
                headers: { get: () => 'image/png' },
            })
            await service.uploadImageFromUrl(
                'https://example.com/img.png',
                'test.png',
                { source: 'external', author: 'bot' }
            )
            expect(MockPutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    Metadata: expect.objectContaining({
                        source: 'external',
                        author: 'bot',
                        originalUrl: 'https://example.com/img.png',
                    }),
                })
            )
        })

        it('should throw when the fetch response is not ok', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                statusText: 'Not Found',
            })
            await expect(
                service.uploadImageFromUrl(
                    'https://example.com/missing.png',
                    'test.png'
                )
            ).rejects.toThrow('Image upload failed')
        })

        it('should throw a wrapped error when the S3 send fails', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(8),
                headers: { get: () => 'image/png' },
            })
            mockSend.mockRejectedValue(new Error('S3 unavailable'))
            await expect(
                service.uploadImageFromUrl(
                    'https://example.com/img.png',
                    'test.png'
                )
            ).rejects.toThrow('Image upload failed')
        })
    })
})
