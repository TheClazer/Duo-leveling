"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const params = useSearchParams();
  const inviteToken = params.get("invite") || undefined;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectTo = (() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const next = inviteToken ? `/accept-invite/${inviteToken}` : "/you";
    return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
  })();

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function signInWithGoogle() {
    setStatus("sending");
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="surface relative w-full max-w-md p-7"
      >
        <div className="mb-6 flex flex-col items-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">The System</div>
          <h1 className="mt-2 font-display text-5xl font-semibold tracking-tighter-display text-fg">Arise.</h1>
          <p className="mt-2 text-center text-sm text-fg-muted">
            {inviteToken ? "Accept your invite to join the System." : "A private workspace for two."}
          </p>
        </div>

        {status !== "sent" && (
          <>
            <form onSubmit={sendMagicLink} className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" disabled={status === "sending"} className="w-full">
                {status === "sending" ? "Sending..." : "Send magic link"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-fg-muted">
              <div className="h-px flex-1 bg-glow/30" />
              or
              <div className="h-px flex-1 bg-glow/30" />
            </div>

            <Button variant="outline" onClick={signInWithGoogle} className="w-full">
              Continue with Google
            </Button>
          </>
        )}

        {status === "sent" && (
          <div className="rounded-md border border-glow/30 bg-bg-card/50 p-4 text-sm text-fg">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">System</p>
            <p className="mt-1">A magic link has been sent to <span className="font-medium">{email}</span>. Open it on the device you want to install The System on.</p>
          </div>
        )}

        {errorMsg && (
          <p className="mt-3 text-xs text-red-400">{errorMsg}</p>
        )}
      </motion.div>
    </div>
  );
}
