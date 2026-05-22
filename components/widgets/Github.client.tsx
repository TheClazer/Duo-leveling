"use client";

import { useState, useTransition } from "react";
import { Github as GithubIcon, Flame, Star, GitFork, RefreshCw, ExternalLink } from "lucide-react";
import { formatDistanceToNow, parseISO, subDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GithubProfile } from "@/lib/supabase/database.types";

type PublicGithubProfile = Omit<GithubProfile, "token_encrypted">;

export function GithubClient({ initial, readOnly }: { initial: PublicGithubProfile | null; readOnly: boolean }) {
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [username, setUsername] = useState(initial?.username ?? "");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sync() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, token: token || undefined }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "failed"); return; }
      setProfile({
        user_id: profile?.user_id ?? "",
        username,
        last_synced: new Date().toISOString(),
        contributions_year: j.stats.contributions_year,
        current_streak: j.stats.current_streak,
        pinned_repos: j.stats.pinned_repos,
        calendar: j.stats.calendar,
      });
      setEditing(false);
      setToken("");
    });
  }

  return (
    <div className="surface p-5 flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GithubIcon className="h-4 w-4 text-accent" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Forge</p>
            <h3 className="font-display text-lg font-semibold text-fg">GitHub</h3>
          </div>
        </div>
        {!readOnly && !editing && profile && (
          <Button size="sm" variant="outline" onClick={sync} disabled={pending}>
            <RefreshCw className={cn("mr-1 h-3.5 w-3.5", pending && "animate-spin")} /> Sync
          </Button>
        )}
      </div>

      {editing && !readOnly ? (
        <div className="space-y-2">
          <Input placeholder="GitHub username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input
            type="password"
            placeholder="Personal access token (read:user, public_repo)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
          <p className="text-[10px] text-fg-muted">
            Create one at <a className="text-accent underline" href="https://github.com/settings/tokens/new?scopes=read:user,public_repo&description=The%20System" target="_blank" rel="noopener noreferrer">github.com/settings/tokens</a>. Scopes: <code>read:user</code>, <code>public_repo</code>.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button onClick={sync} disabled={!username.trim() || !token.trim() || pending} className="w-full">
            {pending ? "Connecting..." : "Connect"}
          </Button>
        </div>
      ) : !profile ? (
        readOnly ? <p className="text-sm text-fg-muted italic">No GitHub connected.</p> : null
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Year" value={profile.contributions_year ?? 0} />
            <Stat label="Streak" value={`${profile.current_streak ?? 0}d`} icon={<Flame className="h-3 w-3 text-orange-400" />} />
          </div>

          {profile.calendar && Object.keys(profile.calendar).length > 0 && (
            <div className="mt-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fg-muted">Last 90 days</p>
              <MiniHeatmap calendar={profile.calendar} />
            </div>
          )}

          {profile.pinned_repos && profile.pinned_repos.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Pinned</p>
              <ul className="space-y-1">
                {profile.pinned_repos.slice(0, 4).map((r) => (
                  <li key={r.name}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 rounded-md border border-glow/15 bg-bg-elevated/30 px-2 py-1.5 text-xs transition-all hover:border-glow/40">
                      <span className="flex-1 truncate font-medium text-fg group-hover:text-accent">{r.name}</span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-fg-muted"><Star className="h-3 w-3" /> {r.stars}</span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-fg-muted"><GitFork className="h-3 w-3" /> {r.forks}</span>
                      <ExternalLink className="h-3 w-3 text-fg-muted opacity-0 group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.last_synced && (
            <p className="mt-3 font-mono text-[10px] text-fg-muted">
              Synced {formatDistanceToNow(parseISO(profile.last_synced), { addSuffix: true })}
              {!readOnly && (
                <button onClick={() => setEditing(true)} className="ml-2 underline">change credentials</button>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-glow/15 bg-bg-elevated/30 p-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold text-fg">{value}</div>
    </div>
  );
}

function MiniHeatmap({ calendar }: { calendar: Record<string, number> }) {
  const days = Array.from({ length: 90 }, (_, i) => format(subDays(new Date(), 89 - i), "yyyy-MM-dd"));
  const max = Math.max(1, ...Object.values(calendar));
  return (
    <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
      {days.map((d) => {
        const v = calendar[d] ?? 0;
        const intensity = v / max;
        return (
          <div
            key={d}
            title={`${d}${v ? ` · ${v}` : ""}`}
            className={cn("aspect-square rounded-sm", v === 0 ? "bg-bg-elevated/60" : "bg-violet-500")}
            style={v > 0 ? { opacity: 0.25 + 0.75 * intensity } : undefined}
          />
        );
      })}
    </div>
  );
}
