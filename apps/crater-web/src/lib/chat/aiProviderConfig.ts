import {
    GeminiImageProvider,
    OpenAIImageProvider,
    type BaseImageModelProvider,
} from '@crater/core'

import type { SessionMode } from './sessionTypes'

export type ProviderKind = 'gemini' | 'openai'

export const DEFAULT_MODELS: Record<
    ProviderKind,
    Record<SessionMode, string>
> = {
    gemini: {
        chat: 'gemini-2.5-flash-lite',
        image: 'gemini-2.5-flash-image-preview',
    },
    openai: {
        chat: 'gpt-5-nano',
        image: 'gpt-image-1',
    },
}

export interface ProviderConfigInput {
    apiKey?: string
    model?: string
    imageSize?: string
    imageQuality?: string
}

export function getDefaultModel(
    provider: ProviderKind,
    mode: SessionMode
): string {
    return DEFAULT_MODELS[provider][mode]
}

export function createProviderForMode(
    provider: ProviderKind,
    mode: SessionMode,
    config: ProviderConfigInput
): BaseImageModelProvider | null {
    if (!config.apiKey) {
        return null
    }

    const model = config.model ?? getDefaultModel(provider, mode)

    if (provider === 'gemini') {
        return new GeminiImageProvider({
            apiKey: config.apiKey,
            model,
        })
    }

    return new OpenAIImageProvider({
        apiKey: config.apiKey,
        model,
        defaultImageQuality: config.imageQuality,
        defaultImageSize: config.imageSize,
    })
}

export function isValidApiKey(provider: ProviderKind, apiKey: string): boolean {
    if (!apiKey) {
        return false
    }

    if (provider === 'gemini') {
        return apiKey.startsWith('AIza')
    }

    return apiKey.startsWith('sk-')
}

export function normalizeModel(
    provider: ProviderKind,
    mode: SessionMode,
    model?: string
): string {
    if (!model) {
        return getDefaultModel(provider, mode)
    }

    return model
}
