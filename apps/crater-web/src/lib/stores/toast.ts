// Simple toast notification store for user feedback
import { writable } from 'svelte/store'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
    id: string
    message: string
    type: ToastType
    duration?: number
}

export const toastStore = writable<Toast[]>([])

let toastId = 0

export function addToast(
    message: string,
    type: ToastType = 'info',
    duration = 5000
): string {
    const id = `toast-${++toastId}`
    const toast: Toast = { id, message, type, duration }

    toastStore.update((toasts) => [...toasts, toast])

    if (duration > 0) {
        setTimeout(() => {
            removeToast(id)
        }, duration)
    }

    return id
}

export function removeToast(id: string): void {
    toastStore.update((toasts) => toasts.filter((toast) => toast.id !== id))
}

export function clearAllToasts(): void {
    toastStore.set([])
}

// Convenience functions
export const showSuccess = (message: string, duration?: number) =>
    addToast(message, 'success', duration)
export const showError = (message: string, duration?: number) =>
    addToast(message, 'error', duration)
export const showInfo = (message: string, duration?: number) =>
    addToast(message, 'info', duration)
export const showWarning = (message: string, duration?: number) =>
    addToast(message, 'warning', duration)
