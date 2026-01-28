import { Fraunces, Space_Grotesk } from 'next/font/google'

import { FontBrowser } from './font-browser'

const uiFont = Space_Grotesk({ subsets: ['latin'], variable: '--font-ui' })
const displayFont = Fraunces({ subsets: ['latin'], variable: '--font-display' })

export default function Home() {
    
    return (
        
        <div
            className={`${uiFont.variable} ${displayFont.variable} min-h-screen bg-[radial-gradient(circle_at_top,#fff5e6_0,#f7f4ff_38%,#eef2ff_68%,#f9fafb_100%)] text-slate-900`}
            style={{ fontFamily: 'var(--font-ui)' }}>
            
            <div className="relative isolate overflow-hidden">
                
                <div className="pointer-events-none absolute -top-20 right-10 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 left-10 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />
                
                <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-16 sm:px-10 lg:px-16">
                    
                    <section className="flex flex-col gap-6">
                        
                        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-slate-500 shadow-sm">
                            Google Fonts Explorer
                        </div>
                        
                        <h1
                            className="max-w-3xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl"
                            style={{ fontFamily: 'var(--font-display)' }}>
                            Search, preview, and assemble Google Fonts URLs in seconds.
                        </h1>
                        
                        <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
                            Powered by the live Google Fonts repository. Filter the catalog, preview sample text, and
                            copy a ready-to-use family token for the CSS API.
                        </p>
                        
                    </section>
                    
                    <FontBrowser />
                    
                </main>
                
            </div>
            
        </div>
        
    )
    
}
