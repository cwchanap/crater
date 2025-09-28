import {
    S3Client,
    PutObjectCommand,
    PutObjectCommandInput,
} from '@aws-sdk/client-s3'

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

export class S3Service {
    private client: S3Client
    private bucketName: string

    constructor(config: S3Config) {
        this.bucketName = config.bucketName
        this.client = new S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        })
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

        const command = new PutObjectCommand({
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
            throw new Error(
                `S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
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
            throw new Error(
                `Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    /**
     * Generate a unique filename with timestamp and sanitized prompt
     * @param prompt - The original prompt used to generate the image
     * @param prefix - Optional prefix for the filename
     * @returns A sanitized filename
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

        return `${prefix}/${timestamp}-${sanitizedPrompt}.png`
    }

    /**
     * Get the AWS region for this client
     * @returns Promise with the region string
     */
    private async getRegion(): Promise<string> {
        return (this.client.config.region as string) || 'us-east-1'
    }

    /**
     * Validate S3 configuration
     * @param config - S3 configuration to validate
     * @returns true if valid, throws error if invalid
     */
    static validateConfig(config: S3Config): boolean {
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
        return true
    }
}

export default S3Service
