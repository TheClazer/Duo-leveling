"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function InvitePartnerCard() {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/invites/create", { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || res.statusText);
      setLoading(false);
      return;
    }
    const j = await res.json();
    setLink(j.url);
    setLoading(false);
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (!link) return;
    if (navigator.share) {
      await navigator.share({ title: "The System — partner invite", text: "Join my workspace.", url: link }).catch(() => {});
    } else {
      copy();
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Awaiting partner</p>
          <h2 className="mt-1 text-lg font-semibold text-fg">Invite your partner</h2>
          <p className="mt-1 text-sm text-fg-muted">Generate a one-time link, send it however you like. Expires in 7 days.</p>
        </div>
        {!link && (
          <Button onClick={generate} disabled={loading} size="sm">
            {loading ? "Generating..." : "Generate link"}
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {link && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-glow/30 bg-bg-elevated/60 px-3 py-2 font-mono text-xs">
            <span className="flex-1 truncate text-fg">{link}</span>
            <button onClick={copy} className="text-fg-muted hover:text-fg" aria-label="Copy">
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={share}>Share</Button>
            <Button variant="ghost" size="sm" onClick={generate}>Regenerate</Button>
          </div>
        </div>
      )}
    </div>
  );
}
