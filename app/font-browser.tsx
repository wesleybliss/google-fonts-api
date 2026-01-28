'use client'

import { useEffect, useMemo, useState } from 'react'

type ApiResponse = {
    families: string[]
    updatedAt?: string
}

const DEFAULT_SAMPLE = 'Sphinx of black quartz, judge my vow.'

const formatFamily = (token: string) => decodeURIComponent(token.replaceAll('+', '%20'))

const buildFontHref = (token: string) => `https://fonts.googleapis.com/css2?family=${token}&display=swap`

export const FontBrowser = () => {
    const [families, setFamilies] = useState<string[]>([])
    const [search, setSearch] = useState('')
    const [sample, setSample] = useState(DEFAULT_SAMPLE)
    const [selected, setSelected] = useState<string>('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
    const [updatedAt, setUpdatedAt] = useState<string | undefined>()

    useEffect(() => {
        let active = true

        const load = async () => {
            setStatus('loading')
            try {
                const response = await fetch('/api')

                if (!response.ok) {
                    throw new Error('Failed to load fonts')
                }

                const data = (await response.json()) as ApiResponse

                if (!active) {
                    return
                }

                setFamilies(data.families ?? [])
                setUpdatedAt(data.updatedAt)
                setSelected((prev) => prev || data.families?.[0] || '')
                setStatus('ready')
            } catch {
                if (active) {
                    setStatus('error')
                }
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (!selected) {
            return
        }

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

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()

        if (!term) {
            return families
        }

        return families.filter((family) => formatFamily(family).toLowerCase().includes(term))
    }, [families, search])

    const selectedName = selected ? formatFamily(selected) : ''
    const fontUrl = selected ? buildFontHref(selected) : ''

    return (
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-xl shadow-slate-200/40 backdrop-blur">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Library</p>
                            <p className="text-xl font-semibold text-slate-900">Font catalog</p>
                        </div>
                        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                            {status === 'loading' ? 'Syncing' : `${filtered.length} Fonts`}
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Search families
                            <input
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none"
                                placeholder="Try: geometric, serif, display"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-white"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                    {status === 'error' ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            Unable to load fonts. Please refresh to try again.
                        </div>
                    ) : (
                        <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-2">
                            {filtered.map((family) => {
                                const name = formatFamily(family)
                                const active = family === selected

                                return (
                                    <button
                                        key={family}
                                        type="button"
                                        onClick={() => setSelected(family)}
                                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                            active
                                                ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        <span>{name}</span>
                                        <span className={`text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>
                                            Preview
                                        </span>
                                    </button>
                                )
                            })}
                            {status !== 'loading' && filtered.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                    No fonts match that search.
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/40">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Preview</p>
                            <p className="text-xl font-semibold text-slate-900">{selectedName || 'Pick a family'}</p>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {updatedAt ? `Updated ${new Date(updatedAt).toLocaleDateString()}` : 'Live'}
                        </div>
                    </div>
                    <div
                        className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-2xl leading-relaxed text-slate-900"
                        style={{ fontFamily: selectedName ? `'${selectedName}', var(--font-ui)` : 'var(--font-ui)' }}
                    >
                        {sample}
                    </div>
                    <label className="mt-5 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Sample text
                        <textarea
                            className="min-h-[84px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none"
                            value={sample}
                            onChange={(event) => setSample(event.target.value)}
                        />
                    </label>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-lg shadow-slate-900/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">URL Builder</p>
                    <p className="mt-2 text-lg font-semibold text-white">Use this family token in your CSS</p>
                    <div className="mt-4 rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                        {fontUrl || 'Select a family to generate the link.'}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                        Use the value after <span className="font-semibold text-slate-200">family=</span> when composing
                        a Fonts API link.
                    </p>
                </div>
            </div>
        </section>
    )
}
