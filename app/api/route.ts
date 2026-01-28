import { get, parseConnectionString } from '@vercel/edge-config'
import { unzipSync } from 'fflate'
import { NextResponse } from 'next/server'
import { createLogger, createRequestId, type Logger } from '@/lib/logger'

const GOOGLE_FONTS_ZIP_URL = 'https://github.com/google/fonts/archive/refs/heads/main.zip'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const LAST_FETCHED_KEY = 'fontsLastFetchedAt'

type CacheData = {
    families: string[]
}

type RefreshResult = CacheData & {
    fetchedAt: number
}

let cache: CacheData | null = null
let refreshPromise: Promise<RefreshResult> | null = null

const textDecoder = new TextDecoder('utf-8')

const downloadWithProgress = async (response: Response, log: Logger) => {
    
    const contentLengthHeader = response.headers.get('content-length')
    const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : null
    const downloadStartedAt = Date.now()
    
    log.info('fetch.download.start', {
        totalBytes: Number.isFinite(totalBytes) ? totalBytes : null,
    })
    
    if (!response.body) {
        const buffer = await response.arrayBuffer()
        log.info('fetch.download.done', { durationMs: Date.now() - downloadStartedAt, bytes: buffer.byteLength })
        return buffer
    }
    
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let downloadedBytes = 0
    let nextProgress = 0.1
    
    while (true) {
        
        const { done, value } = await reader.read()
        
        if (done) break
        if (!value) continue
        
        chunks.push(value)
        downloadedBytes += value.byteLength
        
        if (Number.isFinite(totalBytes) && totalBytes && totalBytes > 0) {
            
            const progress = downloadedBytes / totalBytes
            
            while (progress >= nextProgress && nextProgress <= 1) {
                
                log.info('fetch.download.progress', {
                    percent: Math.round(nextProgress * 100),
                    downloadedBytes,
                    totalBytes,
                })
                
                nextProgress += 0.1
                
            }
            
        }
        
    }
    
    const buffer = new Uint8Array(downloadedBytes)
    let offset = 0
    
    for (const chunk of chunks) {
        buffer.set(chunk, offset)
        offset += chunk.byteLength
    }
    
    log.info('fetch.download.done', {
        durationMs: Date.now() - downloadStartedAt,
        bytes: downloadedBytes,
        totalBytes: Number.isFinite(totalBytes) ? totalBytes : null,
    })
    
    return buffer.buffer
    
}

const getLastFetchedAt = async () => {
    
    const value = await get(LAST_FETCHED_KEY)
    
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
    
    const connectionString = process.env.EDGE_CONFIG
    
    if (!connectionString) throw new Error('EDGE_CONFIG is not set')
    
    const connection = parseConnectionString(connectionString)
    
    if (!connection) throw new Error('EDGE_CONFIG connection string is invalid')
    
    const vercelToken = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_OIDC_TOKEN
    
    if (!vercelToken) throw new Error('VERCEL_API_TOKEN or VERCEL_OIDC_TOKEN is not set')
    
    log.info('edge-config.update.start', { fetchedAt })
    const updateStartedAt = Date.now()
    
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${connection.id}/items`, {
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

const parseFontFamilies = (zipEntries: Record<string, Uint8Array>) => {
    
    const families = new Set<string>()
    
    for (const [path, contents] of Object.entries(zipEntries)) {
        
        if (!path.endsWith('METADATA.pb')) continue
        
        const text = textDecoder.decode(contents)
        const match = /name:\s*"([^"]+)"/.exec(text)
        
        if (!match?.[1]) continue
        
        const familyName = match[1]
        const encoded = encodeURIComponent(familyName).replaceAll('%20', '+')
        
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
        log.info('fetch.start', { url: GOOGLE_FONTS_ZIP_URL })
        const fetchStartedAt = Date.now()
        const response = await fetch(GOOGLE_FONTS_ZIP_URL, { cache: 'no-store' })
        
        if (!response.ok) throw new Error(`Failed to fetch Google Fonts zip: ${response.status}`)
        
        log.info('fetch.response', { durationMs: Date.now() - fetchStartedAt, status: response.status })
        
        const buffer = await downloadWithProgress(response, log)
        
        log.info('unzip.start')
        const unzipStartedAt = Date.now()
        const entries = unzipSync(new Uint8Array(buffer))
        log.info('unzip.done', { durationMs: Date.now() - unzipStartedAt, entriesCount: Object.keys(entries).length })
        
        log.info('parse.start')
        const parseStartedAt = Date.now()
        const families = parseFontFamilies(entries)
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
