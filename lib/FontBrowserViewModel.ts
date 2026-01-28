'use client'

import { useEffect, useMemo, useState } from 'react'

type ApiResponse = {
    families: string[]
    updatedAt?: string
}

const DEFAULT_SAMPLE = 'Sphinx of black quartz, judge my vow.'

const formatFamily = (token: string) => decodeURIComponent(token.replaceAll('+', '%20'))

const buildFontHref = (token: string) => `https://fonts.googleapis.com/css2?family=${token}&display=swap`

const FontBrowserViewModel = () => {
    const [families, setFamilies] = useState<string[]>([])
    const [search, setSearch] = useState('')
    const [sample, setSample] = useState(DEFAULT_SAMPLE)
    const [selected, setSelected] = useState<string>('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
    const [updatedAt, setUpdatedAt] = useState<string | undefined>()

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()

        return term ? families.filter((family) => formatFamily(family).toLowerCase().includes(term)) : families
    }, [families, search])

    const selectedName = useMemo(() => (selected ? formatFamily(selected) : ''), [selected])
    const fontUrl = useMemo(() => (selected ? buildFontHref(selected) : ''), [selected])

    useEffect(() => {
        let active = true

        const load = async () => {
            setStatus('loading')

            try {
                const response = await fetch('/api')

                if (!response.ok) throw new Error('Failed to load fonts')

                const data = (await response.json()) as ApiResponse

                if (!active) return

                setFamilies(data.families ?? [])
                setUpdatedAt(data.updatedAt)
                setSelected((prev) => prev || data.families?.[0] || '')
                setStatus('ready')
            } catch {
                if (active) setStatus('error')
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (!selected) return

        const href = buildFontHref(selected)
        const linkId = 'google-font-preview'

        let link = document.querySelector<HTMLLinkElement>(`link#${linkId}`)

        if (!link) {
            link = document.createElement('link')
            link.id = linkId
            link.rel = 'stylesheet'
            document.head.append(link)
        }

        link.href = href
    }, [selected])

    return {
        // Constants
        DEFAULT_SAMPLE,

        // State
        families,
        setFamilies,
        search,
        setSearch,
        sample,
        setSample,
        selected,
        setSelected,
        status,
        setStatus,
        updatedAt,
        setUpdatedAt,

        // Memos
        filtered,
        selectedName,
        fontUrl,

        // Methods
        formatFamily,
        buildFontHref,
    }
}

export default FontBrowserViewModel
