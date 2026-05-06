import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DAnalyze — CS2 Match Analysis",
  description: "Professional CS2 demo analysis, replay viewer, and AI coaching",
};

function NavBar() {
  return (
    <nav className="border-b border-slate-800 bg-[#0a0a0f]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-orange-500 font-mono font-black text-lg tracking-tighter group-hover:text-orange-400 transition-colors">
            DAnalyze
          </span>
        </Link>
        <div className="h-4 w-px bg-slate-700" />
        <Link
          href="/history"
          className="text-xs font-mono text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
        >
          History
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-mono text-slate-600">CS2 DEMO ANALYZER</span>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0a0a0f] min-h-screen">
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
