"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function AcceptFormClient({ token }: { token: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || res.statusText);
      setSubmitting(false);
      return;
    }
    router.push("/you");
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface mx-auto max-w-md p-6 text-center"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">System</p>
      <h1 className="mt-2 text-2xl font-semibold text-fg">An invite awaits.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Accept to pair your account with the sender's. This bond is permanent.
      </p>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <Button onClick={accept} disabled={submitting} size="lg" className="mt-5 w-full">
        {submitting ? "Linking..." : "Accept invite"}
      </Button>
    </motion.div>
  );
}
