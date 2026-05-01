"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-semibold text-white">
              Something went wrong
            </h1>
            <p className="text-zinc-400 max-w-sm mx-auto">
              An unexpected error occurred. Our team has been notified.
            </p>
          </div>
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
