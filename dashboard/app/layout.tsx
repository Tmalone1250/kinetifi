import type { Metadata } from 'next';
import { Inter, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppKitProvider } from './AppKitProvider';

const inter = Inter({ subsets: ['latin'] });
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'KinetiFi // Agentic OS Dashboard',
  description: 'Autonomous Wallet OS for Mantle Network',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} ${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen selection:bg-cyan-400 selection:text-slate-950">
        <AppKitProvider>{children}</AppKitProvider>
      </body>
    </html>
  );
}
