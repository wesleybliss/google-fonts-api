'use client'
import useFontBrowserViewModel from '@/lib/FontBrowserViewModel'

export const FontBrowser = () => {
    const vm = useFontBrowserViewModel()

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
                            {vm.status === 'loading' ? 'Syncing' : `${vm.filtered.length} Fonts`}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Search families
                            <input
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm
                                    font-medium text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none"
                                placeholder="Try: geometric, serif, display"
                                value={vm.search}
                                onChange={(event) => vm.setSearch(event.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => vm.setSearch('')}
                            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm
                                font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-white"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                    {vm.status === 'error' ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            Unable to load fonts. Please refresh to try again.
                        </div>
                    ) : (
                        <div className="grid max-h-105 gap-3 overflow-y-auto pr-2">
                            {vm.filtered.map((family) => {
                                const name = vm.formatFamily(family)
                                const active = family === vm.selected

                                return (
                                    <button
                                        key={family}
                                        type="button"
                                        onClick={() => vm.setSelected(family)}
                                        className={`flex items-center justify-between rounded-2xl border
                                            px-4 py-3 text-left text-sm font-semibold transition ${
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

                            {vm.status !== 'loading' && vm.filtered.length === 0 ? (
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
                            <p className="text-xl font-semibold text-slate-900">{vm.selectedName || 'Pick a family'}</p>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {vm.updatedAt ? `Updated ${new Date(vm.updatedAt).toLocaleDateString()}` : 'Live'}
                        </div>
                    </div>

                    <div
                        className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-2xl leading-relaxed text-slate-900"
                        style={{
                            fontFamily: vm.selectedName ? `'${vm.selectedName}', var(--font-ui)` : 'var(--font-ui)',
                        }}
                    >
                        {vm.sample}
                    </div>

                    <label className="mt-5 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Sample text
                        <textarea
                            className="min-h-21 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm
                                font-medium text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none"
                            value={vm.sample}
                            onChange={(event) => vm.setSample(event.target.value)}
                        />
                    </label>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-lg shadow-slate-900/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">URL Builder</p>
                    <p className="mt-2 text-lg font-semibold text-white">Use this family token in your CSS</p>
                    <div className="mt-4 rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                        {vm.fontUrl || 'Select a family to generate the link.'}
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
