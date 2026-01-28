import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Google Fonts Explorer',
    description: '',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className="antialiased" data-arp="">
                {children}
            </body>
        </html>
    )
}
