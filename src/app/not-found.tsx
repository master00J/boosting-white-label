import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative text-center space-y-8 max-w-md">
        {/* 404 number */}
        <div className="space-y-3">
          <p className="text-[120px] font-heading font-bold leading-none bg-gradient-to-b from-white/20 to-white/5 bg-clip-text text-transparent">
            404
          </p>
          <h1 className="text-2xl font-heading font-semibold text-white">
            Page not found
          </h1>
          <p className="text-zinc-400 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
          <Link
            href="/games"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            <Search className="h-4 w-4" />
            Browse games
          </Link>
        </div>
      </div>
    </div>
  );
}
