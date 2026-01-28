import { BlobNotFoundError, head, put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger, createRequestId, type Logger } from '@/lib/logger'

if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required')

const GOOGLE_FONTS_METADATA_URL = 'https://fonts.google.com/metadata/fonts'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const LAST_FETCHED_PATHNAME = 'cache/fonts-last-fetched.txt'
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

type CacheData = {
    families: FontMetadata[]
}

type RefreshResult = CacheData & {
    fetchedAt: number
}

type FontMetadata = {
    family: string
    category: string
    classifications: string[]
}

type MetadataResponse = {
    familyMetadataList?: Array<FontMetadata>
}

let cache: CacheData | null = null
let refreshPromise: Promise<RefreshResult> | null = null

const getLastFetchedAt = async () => {
    let value: string

    try {
        const blob = await head(LAST_FETCHED_PATHNAME)
        const response = await fetch(blob.url, { cache: 'no-store' })

        if (!response.ok) throw new Error(`Failed to read last fetch timestamp: ${response.status}`)

        value = await response.text()
    } catch (error) {
        if (error instanceof BlobNotFoundError) return null

        throw error
    }

    const parsed = Number(value.trim())

    if (Number.isFinite(parsed)) return parsed

    return null
}

const isCacheFresh = (lastFetchedAt: number | null) => {
    if (!lastFetchedAt) return false

    return Date.now() - lastFetchedAt < CACHE_TTL_MS
}

const updateLastFetchedAt = async (fetchedAt: number, log: Logger) => {
    log.info('blob.update.start', { fetchedAt })
    const updateStartedAt = Date.now()

    await put(LAST_FETCHED_PATHNAME, `${fetchedAt}`, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'text/plain',
        cacheControlMaxAge: Math.floor(CACHE_TTL_MS / 1000),
    })

    log.info('blob.update.done', { durationMs: Date.now() - updateStartedAt })
}

const parseFontFamilies = (rawText: string): FontMetadata[] => {
    const sanitized = rawText.replace(/^\)\]\}'\n?/, '')
    const data = JSON.parse(sanitized) as MetadataResponse
    const families = new Map<string, FontMetadata>()

    for (const entry of data.familyMetadataList ?? []) {
        if (!entry.family) continue

        const encoded = encodeURIComponent(entry.family).replaceAll('%20', '+')
        families.set(encoded, entry)
    }

    return Array.from(families.values())
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

export const GET = async (req: NextRequest) => {
    const requestId = createRequestId()
    const log = createLogger(requestId)
    const requestStartedAt = Date.now()

    const noCache = req.nextUrl.searchParams.get('noCache') === 'true'
    const excludeCategories = (req.nextUrl.searchParams.get('excludeCategories')?.split(',') ?? []).map((it) =>
        it.toLowerCase(),
    )

    log.info('request.start', { route: 'GET /api', cacheTtlMs: CACHE_TTL_MS })

    try {
        let lastFetchedAt = await getLastFetchedAt()
        let metas: FontMetadata[] | null = null

        log.info('cache.status', { hasCache: Boolean(cache), lastFetchedAt })

        if (!noCache && cache && isCacheFresh(lastFetchedAt)) {
            metas = cache.families
            log.info('cache.hit', { familiesCount: metas.length })
        } else {
            log.info('cache.miss', { reason: noCache ? 'requested-bust' : cache ? 'stale' : 'empty' })
            const refreshed = await refreshCache(log)
            metas = refreshed.families
            lastFetchedAt = refreshed.fetchedAt
        }

        if (!metas) {
            log.error('cache.unavailable')
            return NextResponse.json({ error: 'Font cache unavailable' }, { status: 500, headers: corsHeaders })
        }

        const families = metas
            .filter((entry) => {
                return !(excludeCategories?.length && excludeCategories.includes(entry.category.toLowerCase()))
            })
            .map((it) => it.family)

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
                    ...corsHeaders,
                    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
                },
            },
        )
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        log.error('request.error', { message: err.message, stack: err.stack })

        return NextResponse.json({ error: 'Font cache unavailable' }, { status: 500, headers: corsHeaders })
    }
}

export const OPTIONS = async () => new NextResponse(null, { status: 204, headers: corsHeaders })
