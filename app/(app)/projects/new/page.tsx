import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewProjectForm } from "./NewProjectForm";
import type { Profile } from "@/lib/supabase/database.types";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const me = meRaw as Profile | null;
  if (!me) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <Link href="/projects" className="text-xs uppercase tracking-widest text-fg-muted hover:text-fg">← Projects</Link>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.4em] text-accent">New quest</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tighter-display text-fg md:text-5xl">Start a project</h1>
        <p className="mt-1 text-sm text-fg-muted">Personal or joint. Light scaffolding — you can fill in details later.</p>
      </div>
      <NewProjectForm hasPartner={!!me.couple_id} />
    </div>
  );
}
