import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CineBox — Streaming Film Favoritmu",
    template: "%s · CineBox",
  },
  description:
    "Website menonton film dengan video tersimpan di IS3 Storage — streaming HLS multi-kualitas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-600">
          CineBox • Video di-hosting pada IS3 Storage
        </footer>
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090f]/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-black tracking-tight">
          <span className="text-red-600">CINE</span>
          <span className="text-zinc-100">BOX</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/"
            className="text-zinc-300 transition hover:text-white"
          >
            Beranda
          </Link>
          <Link
            href="/admin"
            className="rounded-full bg-zinc-800 px-3 py-1.5 font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
