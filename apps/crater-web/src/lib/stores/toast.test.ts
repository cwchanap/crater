import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { get } from 'svelte/store'
import {
    toastStore,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showInfo,
    showWarning,
} from './toast'

beforeEach(() => {
    clearAllToasts()
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('addToast', () => {
    it('adds a toast to the store', () => {
        addToast('Hello world', 'info')
        expect(get(toastStore)).toHaveLength(1)
        expect(get(toastStore)[0].message).toBe('Hello world')
        expect(get(toastStore)[0].type).toBe('info')
    })

    it('returns a unique toast id', () => {
        const id1 = addToast('First', 'info')
        const id2 = addToast('Second', 'error')
        expect(id1).toMatch(/^toast-\d+$/)
        expect(id2).toMatch(/^toast-\d+$/)
        expect(id1).not.toBe(id2)
    })

    it('defaults type to info', () => {
        addToast('Default type')
        expect(get(toastStore)[0].type).toBe('info')
    })

    it('sets default duration of 5000', () => {
        addToast('With duration')
        expect(get(toastStore)[0].duration).toBe(5000)
    })

    it('stores the provided duration', () => {
        addToast('Custom duration', 'warning', 3000)
        expect(get(toastStore)[0].duration).toBe(3000)
    })

    it('auto-removes toast after duration expires', () => {
        addToast('Temporary', 'info', 2000)
        expect(get(toastStore)).toHaveLength(1)
        vi.advanceTimersByTime(2000)
        expect(get(toastStore)).toHaveLength(0)
    })

    it('does not auto-remove when duration is 0', () => {
        addToast('Persistent', 'info', 0)
        vi.advanceTimersByTime(100000)
        expect(get(toastStore)).toHaveLength(1)
    })

    it('can add multiple toasts', () => {
        addToast('First', 'success')
        addToast('Second', 'error')
        addToast('Third', 'warning')
        expect(get(toastStore)).toHaveLength(3)
    })
})

describe('removeToast', () => {
    it('removes a toast by id', () => {
        const id = addToast('Remove me', 'info', 0)
        expect(get(toastStore)).toHaveLength(1)
        removeToast(id)
        expect(get(toastStore)).toHaveLength(0)
    })

    it('does not affect other toasts when removing one', () => {
        const id1 = addToast('Keep', 'info', 0)
        const id2 = addToast('Remove', 'error', 0)
        removeToast(id2)
        const remaining = get(toastStore)
        expect(remaining).toHaveLength(1)
        expect(remaining[0].id).toBe(id1)
    })

    it('does nothing when removing a non-existent id', () => {
        addToast('Stays', 'info', 0)
        removeToast('toast-nonexistent')
        expect(get(toastStore)).toHaveLength(1)
    })
})

describe('clearAllToasts', () => {
    it('removes all toasts from the store', () => {
        addToast('First', 'info', 0)
        addToast('Second', 'error', 0)
        addToast('Third', 'warning', 0)
        clearAllToasts()
        expect(get(toastStore)).toHaveLength(0)
    })

    it('does nothing when store is already empty', () => {
        clearAllToasts()
        expect(get(toastStore)).toHaveLength(0)
    })
})

describe('showSuccess', () => {
    it('adds a success toast', () => {
        showSuccess('Done!')
        const toasts = get(toastStore)
        expect(toasts).toHaveLength(1)
        expect(toasts[0].type).toBe('success')
        expect(toasts[0].message).toBe('Done!')
    })

    it('respects custom duration', () => {
        showSuccess('Done!', 1000)
        expect(get(toastStore)[0].duration).toBe(1000)
    })
})

describe('showError', () => {
    it('adds an error toast', () => {
        showError('Something went wrong')
        const toasts = get(toastStore)
        expect(toasts[0].type).toBe('error')
        expect(toasts[0].message).toBe('Something went wrong')
    })
})

describe('showInfo', () => {
    it('adds an info toast', () => {
        showInfo('FYI')
        const toasts = get(toastStore)
        expect(toasts[0].type).toBe('info')
        expect(toasts[0].message).toBe('FYI')
    })
})

describe('showWarning', () => {
    it('adds a warning toast', () => {
        showWarning('Be careful')
        const toasts = get(toastStore)
        expect(toasts[0].type).toBe('warning')
        expect(toasts[0].message).toBe('Be careful')
    })
})
