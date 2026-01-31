import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: '%s | VGC Meta Compass',
    default: 'VGC Meta Compass - Competitive Pokémon VGC Analysis',
  },
  description: 'VGC decision engine with counter guides, core analysis, team archetypes, and replay evidence. Get actionable strategies for VGC 2026 Regulation F.',
  keywords: ['VGC', 'Pokemon', 'competitive', 'meta', 'counter', 'team builder', 'Reg F', 'Regulation F'],
  authors: [{ name: 'VGC Meta Compass' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'VGC Meta Compass',
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vgcmeta.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <Navigation />
        {children}
        <Footer />
      </body>
    </html>
  );
}
