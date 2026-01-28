import { unzipSync } from 'fflate'
import { NextResponse } from 'next/server'

const GOOGLE_FONTS_ZIP_URL = 'https://github.com/google/fonts/archive/refs/heads/main.zip'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type CacheData = {
    families: string[]
    fetchedAt: number
}

let cache: CacheData | null = null
let refreshPromise: Promise<CacheData> | null = null

const textDecoder = new TextDecoder('utf-8')

const isCacheFresh = (data: CacheData | null) => {
    if (!data) {
        return false
    }

    return Date.now() - data.fetchedAt < CACHE_TTL_MS
}

const parseFontFamilies = (zipEntries: Record<string, Uint8Array>) => {
    const families = new Set<string>()

    for (const [path, contents] of Object.entries(zipEntries)) {
        if (!path.endsWith('METADATA.pb')) {
            continue
        }

        const text = textDecoder.decode(contents)
        const match = /name:\s*"([^"]+)"/.exec(text)

        if (!match?.[1]) {
            continue
        }

        const familyName = match[1]
        const encoded = encodeURIComponent(familyName).replaceAll('%20', '+')
        families.add(encoded)
    }

    return Array.from(families).sort((a, b) => a.localeCompare(b))
}

const refreshCache = async () => {
    if (refreshPromise) {
        return refreshPromise
    }

    refreshPromise = (async () => {
        const response = await fetch(GOOGLE_FONTS_ZIP_URL, { cache: 'no-store' })

        if (!response.ok) {
            throw new Error(`Failed to fetch Google Fonts zip: ${response.status}`)
        }

        const buffer = await response.arrayBuffer()
        const entries = unzipSync(new Uint8Array(buffer))
        const families = parseFontFamilies(entries)

        const data = {
            families,
            fetchedAt: Date.now(),
        } satisfies CacheData

        cache = data
        return data
    })()

    try {
        return await refreshPromise
    } finally {
        refreshPromise = null
    }
}

export const GET = async () => {
    const data = isCacheFresh(cache) ? cache : await refreshCache()

    if (!data) {
        return NextResponse.json({ error: 'Font cache unavailable' }, { status: 500 })
    }

    return NextResponse.json(
        {
            updatedAt: new Date(data.fetchedAt).toISOString(),
            families: data.families,
        },
        {
            headers: {
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
        },
    )
}
