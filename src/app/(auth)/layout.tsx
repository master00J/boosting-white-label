import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-white font-heading text-xl">
          <Gamepad2 className="h-6 w-6 text-indigo-400" />
          <span>
            Boost<span className="text-indigo-400">Platform</span>
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-zinc-600">
        <Link href="/tos" className="hover:text-zinc-400 transition-colors">
          Terms of Service
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
