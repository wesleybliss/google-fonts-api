export type LogDetails = Record<string, unknown>

export type Logger = {
    requestId: string
    info: (event: string, details?: LogDetails) => void
    warn: (event: string, details?: LogDetails) => void
    error: (event: string, details?: LogDetails) => void
}

export const createRequestId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const createLogger = (requestId: string): Logger => {
    const log = (level: 'info' | 'warn' | 'error', event: string, details?: LogDetails) => {
        const payload = {
            event,
            requestId,
            ...details,
        }

        console[level](payload)
    }

    return {
        requestId,
        info: (event, details) => log('info', event, details),
        warn: (event, details) => log('warn', event, details),
        error: (event, details) => log('error', event, details),
    }
}
