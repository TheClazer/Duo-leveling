import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/you");

  const sp = await searchParams;

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Welcome, hunter</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tighter-display text-fg">Set up your character</h1>
          <p className="mt-2 text-sm text-fg-muted">You can change all of this later.</p>
        </div>
        <OnboardingForm email={user.email ?? ""} inviteToken={sp.invite} />
      </div>
    </div>
  );
}
