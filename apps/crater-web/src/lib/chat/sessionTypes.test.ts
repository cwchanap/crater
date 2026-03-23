import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    createSessionId,
    createSession,
    deriveTitleFromMessage,
    SESSION_TITLE_FALLBACK,
} from './sessionTypes'

describe('createSessionId', () => {
    it('returns a string starting with session-', () => {
        const id = createSessionId()
        expect(id).toMatch(/^session-\d+-[a-z0-9]+$/)
    })

    it('returns unique ids on each call', () => {
        const ids = new Set(Array.from({ length: 20 }, () => createSessionId()))
        expect(ids.size).toBe(20)
    })

    it('includes a timestamp segment', () => {
        const before = Date.now()
        const id = createSessionId()
        const after = Date.now()
        const ts = parseInt(id.split('-')[1], 10)
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })
})

describe('createSession', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))
    })

    it('creates a chat session with default title', () => {
        const session = createSession({ mode: 'chat' })
        expect(session.mode).toBe('chat')
        expect(session.title).toBe(SESSION_TITLE_FALLBACK.chat)
        expect(session.messages).toEqual([])
        expect(session.id).toMatch(/^session-/)
    })

    it('creates an image session with default title', () => {
        const session = createSession({ mode: 'image' })
        expect(session.mode).toBe('image')
        expect(session.title).toBe(SESSION_TITLE_FALLBACK.image)
    })

    it('uses a provided custom title', () => {
        const session = createSession({
            mode: 'chat',
            title: 'My Custom Title',
        })
        expect(session.title).toBe('My Custom Title')
    })

    it('sets createdAt to the current ISO timestamp', () => {
        const session = createSession({ mode: 'chat' })
        expect(session.createdAt).toBe('2024-06-15T12:00:00.000Z')
    })

    it('starts with an empty messages array', () => {
        const session = createSession({ mode: 'image' })
        expect(session.messages).toHaveLength(0)
    })
})

describe('deriveTitleFromMessage', () => {
    it('returns the fallback when message is empty', () => {
        expect(deriveTitleFromMessage('chat', '')).toBe(
            SESSION_TITLE_FALLBACK.chat
        )
        expect(deriveTitleFromMessage('image', '')).toBe(
            SESSION_TITLE_FALLBACK.image
        )
    })

    it('returns the fallback when message is only whitespace', () => {
        expect(deriveTitleFromMessage('chat', '   ')).toBe(
            SESSION_TITLE_FALLBACK.chat
        )
    })

    it('returns short messages as-is', () => {
        expect(deriveTitleFromMessage('chat', 'Hello')).toBe('Hello')
    })

    it('truncates messages longer than 32 characters with ellipsis', () => {
        const longMessage = 'Generate a pixel art hero with a sword'
        const result = deriveTitleFromMessage('image', longMessage)
        expect(result).toBe('Generate a pixel art hero with a...')
        expect(result.endsWith('...')).toBe(true)
    })

    it('does not add ellipsis if snippet equals the full trimmed message', () => {
        const exactly32 = 'A'.repeat(32)
        const result = deriveTitleFromMessage('chat', exactly32)
        expect(result).toBe(exactly32)
        expect(result.endsWith('...')).toBe(false)
    })

    it('collapses internal whitespace before slicing', () => {
        const message = 'Hello   world   this   is   a   test   of   collapsing'
        const result = deriveTitleFromMessage('chat', message)
        expect(result).toMatch(/^Hello world this is a test of co/)
    })

    it('trims leading and trailing whitespace from message', () => {
        const result = deriveTitleFromMessage('chat', '  hello  ')
        expect(result).toBe('hello')
    })
})

describe('SESSION_TITLE_FALLBACK', () => {
    it('has fallback for chat mode', () => {
        expect(SESSION_TITLE_FALLBACK.chat).toBe('Chat Session')
    })

    it('has fallback for image mode', () => {
        expect(SESSION_TITLE_FALLBACK.image).toBe('Image Session')
    })
})
