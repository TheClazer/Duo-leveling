import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AcceptFormClient } from "./AcceptFormClient";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?invite=${encodeURIComponent(token)}`);
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id, couple_id")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRaw as { id: string; couple_id: string | null } | null;

  if (!profile) {
    redirect(`/onboarding?invite=${encodeURIComponent(token)}`);
  }

  if (profile.couple_id) {
    return (
      <div className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-md surface p-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">System</p>
          <h1 className="mt-2 text-xl font-semibold text-fg">You're already linked.</h1>
          <p className="mt-2 text-sm text-fg-muted">You can only be paired with one partner.</p>
          <Button asChild className="mt-5"><Link href="/you">Go to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <AcceptFormClient token={token} />
    </div>
  );
}
