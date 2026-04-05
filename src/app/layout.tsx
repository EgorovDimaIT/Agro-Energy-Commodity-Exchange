import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './bags-styles.css'
import { SolanaProvider } from '@/components/SolanaProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'StableHacks RWA Vault',
    description: 'Institutional-grade Stablecoin Infrastructure & B2B Escrow Vault.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <SolanaProvider>
                    {children}
                </SolanaProvider>
            </body>
        </html>
    )
}
