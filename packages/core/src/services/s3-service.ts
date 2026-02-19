type PutObjectCommandInput = import('@aws-sdk/client-s3').PutObjectCommandInput
type S3Client = import('@aws-sdk/client-s3').S3Client

let _s3Module: typeof import('@aws-sdk/client-s3') | undefined

async function getS3Module(): Promise<typeof import('@aws-sdk/client-s3')> {
    if (!_s3Module) {
        try {
            _s3Module = await import('@aws-sdk/client-s3')
        } catch (cause) {
            const err = new Error(
                '@aws-sdk/client-s3 is required for S3Service. Install it with: npm install @aws-sdk/client-s3'
            )
            // Preserve original error for diagnostic context
            ;(err as Error & { cause?: unknown }).cause = cause
            throw err
        }
    }
    return _s3Module
}

export interface S3Config {
    bucketName: string
    region: string
    accessKeyId: string
    secretAccessKey: string
}

export interface S3UploadOptions {
    contentType?: string
    metadata?: Record<string, string>
}

type S3ClientInstance = Pick<S3Client, 'send' | 'config'>

export class S3Service {
    private client: S3ClientInstance
    private bucketName: string

    private constructor(client: S3ClientInstance, bucketName: string) {
        this.client = client
        this.bucketName = bucketName
    }

    static async create(config: S3Config): Promise<S3Service> {
        S3Service.validateConfig(config)
        const s3 = await getS3Module()
        const client = new s3.S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        })
        return new S3Service(client, config.bucketName)
    }

    /**
     * Upload a file to S3
     * @param key - The S3 key (path) for the file
     * @param body - The file content (Buffer, Uint8Array, or Blob)
     * @param options - Upload options
     * @returns Promise with the S3 URL of the uploaded file
     */
    async uploadFile(
        key: string,
        body: Buffer | Uint8Array | Blob,
        options: S3UploadOptions = {}
    ): Promise<string> {
        const { contentType = 'application/octet-stream', metadata = {} } =
            options

        const s3 = await getS3Module()
        const command = new s3.PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
            Metadata: metadata,
        } as PutObjectCommandInput)

        try {
            await this.client.send(command)
            return `https://${this.bucketName}.s3.${await this.getRegion()}.amazonaws.com/${key}`
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error'
            const err = new Error(`S3 upload failed: ${message}`)
            // Preserve original error for diagnostic context
            ;(err as Error & { cause?: unknown }).cause = error
            throw err
        }
    }

    /**
     * Upload an image from a URL to S3
     * @param imageUrl - The URL of the image to upload
     * @param key - The S3 key (path) for the file
     * @param metadata - Optional metadata for the image
     * @returns Promise with the S3 URL of the uploaded image
     */
    async uploadImageFromUrl(
        imageUrl: string,
        key: string,
        metadata: Record<string, string> = {}
    ): Promise<string> {
        try {
            // Fetch the image
            const response = await fetch(imageUrl)
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`)
            }

            const imageBuffer = await response.arrayBuffer()
            const uint8Array = new Uint8Array(imageBuffer)

            // Determine content type from response or default to PNG
            const contentType =
                response.headers.get('content-type') || 'image/png'

            return await this.uploadFile(key, uint8Array, {
                contentType,
                metadata: {
                    ...metadata,
                    originalUrl: imageUrl,
                    uploadedAt: new Date().toISOString(),
                },
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error'
            const err = new Error(`Image upload failed: ${message}`)
            // Preserve original error for diagnostic context
            ;(err as Error & { cause?: unknown }).cause = error
            throw err
        }
    }

    /**
     * Generate a unique filename with timestamp and sanitized prompt
     * @param prompt - The original prompt used to generate the image
     * @param prefix - Optional prefix for the filename
     * @returns A sanitized filename with random suffix for uniqueness
     */
    static generateImageFilename(
        prompt: string,
        prefix: string = 'crater-image'
    ): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const sanitizedPrompt = prompt
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .substring(0, 50)
        // Add random suffix to prevent collisions under high throughput
        const randomSuffix = Math.random().toString(36).substring(2, 10)

        return `${prefix}/${timestamp}-${sanitizedPrompt}-${randomSuffix}.png`
    }

    /**
     * Get the AWS region for this client
     * @returns Promise with the region string
     */
    private async getRegion(): Promise<string> {
        const region = this.client.config.region
        if (typeof region === 'function') {
            return (await region()) || 'us-east-1'
        }
        return (region as string) || 'us-east-1'
    }

    /**
     * Validate S3 configuration
     * @param config - S3 configuration to validate
     * @throws Error if configuration is invalid
     */
    static validateConfig(config: S3Config): asserts config is S3Config {
        if (!config.bucketName?.trim()) {
            throw new Error('S3 bucket name is required')
        }
        if (!config.region?.trim()) {
            throw new Error('S3 region is required')
        }
        if (!config.accessKeyId?.trim()) {
            throw new Error('S3 access key ID is required')
        }
        if (!config.secretAccessKey?.trim()) {
            throw new Error('S3 secret access key is required')
        }
    }
}

export default S3Service
