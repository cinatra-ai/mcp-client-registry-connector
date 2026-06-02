"use client";

import { Button } from "./components/ui/button";

export function CopyMcpUrlPanel({ url }: { url: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-control border border-line bg-surface-muted px-4 py-3">
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">{url}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => { void navigator.clipboard.writeText(url); }}
        className="shrink-0 rounded-control p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
        title="Copy URL"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <rect x="5.5" y="5.5" width="7" height="7" rx="1" />
          <path d="M3.5 10.5V4a1 1 0 0 1 1-1h6.5" />
        </svg>
      </Button>
    </div>
  );
}
