"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroScanInput() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setScanning(true);
    // Briefly show the scan animation before navigating, so the
    // interaction itself demonstrates what the product does.
    setTimeout(() => {
      router.push(`/register?url=${encodeURIComponent(url.trim())}`);
    }, 650);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
        {scanning && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 h-16 bg-scan-gradient animate-scan" />
          </div>
        )}
        <div className="flex items-center gap-3 p-2">
          <span className="readout-label pl-3 text-muted">https://</span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="any-website.com"
            disabled={scanning}
            className="flex-1 bg-transparent py-3 font-mono text-sm text-ivory placeholder:text-muted focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={scanning || !url.trim()}
            className="btn-primary shrink-0"
          >
            {scanning ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse_dot rounded-full bg-ink" />
                Scanning
              </>
            ) : (
              "Scan site"
            )}
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        No credit card. Free account, then paste any URL.
      </p>
    </form>
  );
}
