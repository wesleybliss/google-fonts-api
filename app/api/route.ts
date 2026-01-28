import { createClient } from '@vercel/edge-config'
import { NextResponse } from 'next/server'
import { createLogger, createRequestId, type Logger } from '@/lib/logger'

if (!process.env.EDGE_CONFIG) throw new Error('EDGE_CONFIG is required')

const GOOGLE_FONTS_METADATA_URL = 'https://fonts.google.com/metadata/fonts'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const LAST_FETCHED_KEY = 'fontsLastFetchedAt'

type CacheData = {
    families: string[]
}

type RefreshResult = CacheData & {
    fetchedAt: number
}

type MetadataResponse = {
    familyMetadataList?: Array<{
        family?: string
    }>
}

let cache: CacheData | null = null
let refreshPromise: Promise<RefreshResult> | null = null
const edgeConfigClient = createClient(process.env.EDGE_CONFIG)

const getLastFetchedAt = async () => {
    const value = await edgeConfigClient.get(LAST_FETCHED_KEY)

    if (typeof value === 'number' && Number.isFinite(value)) return value

    if (typeof value === 'string') {
        const parsed = Number(value)

        if (Number.isFinite(parsed)) return parsed
    }

    return null
}

const isCacheFresh = (lastFetchedAt: number | null) => {
    if (!lastFetchedAt) return false

    return Date.now() - lastFetchedAt < CACHE_TTL_MS
}

const updateLastFetchedAt = async (fetchedAt: number, log: Logger) => {
    const vercelToken = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_OIDC_TOKEN

    if (!vercelToken) throw new Error('VERCEL_API_TOKEN or VERCEL_OIDC_TOKEN is not set')

    log.info('edge-config.update.start', { fetchedAt })
    const updateStartedAt = Date.now()

    const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigClient.connection.id}/items`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            items: [
                {
                    operation: 'upsert',
                    key: LAST_FETCHED_KEY,
                    value: fetchedAt,
                },
            ],
        }),
    })

    if (!response.ok) throw new Error(`Failed to update Edge Config: ${response.status}`)

    log.info('edge-config.update.done', { durationMs: Date.now() - updateStartedAt, status: response.status })
}

const parseFontFamilies = (rawText: string) => {
    const sanitized = rawText.replace(/^\)\]\}'\n?/, '')
    const data = JSON.parse(sanitized) as MetadataResponse
    const families = new Set<string>()

    for (const entry of data.familyMetadataList ?? []) {
        if (!entry.family) continue

        const encoded = encodeURIComponent(entry.family).replaceAll('%20', '+')
        families.add(encoded)
    }

    return Array.from(families).sort((a, b) => a.localeCompare(b))
}

const refreshCache = async (log: Logger) => {
    if (refreshPromise) {
        log.info('refresh.inflight')
        return refreshPromise
    }

    refreshPromise = (async () => {
        log.info('fetch.start', { url: GOOGLE_FONTS_METADATA_URL })
        const fetchStartedAt = Date.now()
        const response = await fetch(GOOGLE_FONTS_METADATA_URL, { cache: 'no-store' })

        if (!response.ok) throw new Error(`Failed to fetch Google Fonts metadata: ${response.status}`)

        log.info('fetch.response', { durationMs: Date.now() - fetchStartedAt, status: response.status })

        log.info('parse.start')
        const parseStartedAt = Date.now()
        const text = await response.text()
        const families = parseFontFamilies(text)
        log.info('parse.done', { durationMs: Date.now() - parseStartedAt, familiesCount: families.length })

        const data = {
            families,
            fetchedAt: Date.now(),
        } satisfies RefreshResult

        await updateLastFetchedAt(data.fetchedAt, log)

        cache = { families: data.families }

        log.info('refresh.done', { familiesCount: data.families.length })

        return data
    })()

    try {
        return await refreshPromise
    } finally {
        refreshPromise = null
    }
}

export const GET = async () => {
    const requestId = createRequestId()
    const log = createLogger(requestId)
    const requestStartedAt = Date.now()

    log.info('request.start', { route: 'GET /api', cacheTtlMs: CACHE_TTL_MS })

    try {
        let lastFetchedAt = await getLastFetchedAt()
        let families: string[] | null = null

        log.info('cache.status', { hasCache: Boolean(cache), lastFetchedAt })

        if (cache && isCacheFresh(lastFetchedAt)) {
            families = cache.families
            log.info('cache.hit', { familiesCount: families.length })
        } else {
            log.info('cache.miss', { reason: cache ? 'stale' : 'empty' })
            const refreshed = await refreshCache(log)
            families = refreshed.families
            lastFetchedAt = refreshed.fetchedAt
        }

        if (!families) {
            log.error('cache.unavailable')
            return NextResponse.json({ error: 'Font cache unavailable' }, { status: 500 })
        }

        log.info('request.success', {
            durationMs: Date.now() - requestStartedAt,
            familiesCount: families.length,
            updatedAt: new Date(lastFetchedAt ?? Date.now()).toISOString(),
        })

        return NextResponse.json(
            {
                updatedAt: new Date(lastFetchedAt ?? Date.now()).toISOString(),
                families,
            },
            {
                headers: {
                    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
                },
            },
        )
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        log.error('request.error', { message: err.message, stack: err.stack })

        return NextResponse.json({ error: 'Font cache unavailable' }, { status: 500 })
    }
}
