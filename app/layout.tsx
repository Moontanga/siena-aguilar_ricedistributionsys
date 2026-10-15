import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Siena-Aguilar Rice Distribution', description: 'Rice inventory, sales, purchasing and distribution management.', applicationName: 'Siena-Aguilar Rice Distribution', manifest: '/manifest.json' };
export const viewport: Viewport = { themeColor: '#0b251b', width: 'device-width', initialScale: 1 };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
