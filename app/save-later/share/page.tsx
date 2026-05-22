import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchOG } from "@/lib/apis/og";

export const dynamic = "force-dynamic";

export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Stash the share intent in the redirect to login (we'll restore after auth if needed)
    const params = new URLSearchParams();
    if (sp.title) params.set("title", sp.title);
    if (sp.text)  params.set("text", sp.text);
    if (sp.url)   params.set("url", sp.url);
    redirect(`/login?share=${encodeURIComponent(params.toString())}`);
  }

  // The shared URL may come in via `url` or appear inside `text` (some apps put everything in text)
  const rawUrl = sp.url || extractFirstUrl(sp.text ?? "") || extractFirstUrl(sp.title ?? "");
  if (!rawUrl) {
    redirect("/feed?share=invalid");
  }

  try { new URL(rawUrl); }
  catch { redirect("/feed?share=invalid"); }

  // OG fetch (best-effort)
  let meta = { title: null as string | null, description: null as string | null, image: null as string | null };
  try { meta = await fetchOG(rawUrl); } catch {}

  await supabase.from("save_later").insert({
    user_id: user.id,
    url: rawUrl,
    title: meta.title ?? sp.title ?? hostname(rawUrl),
    description: meta.description ?? sp.text ?? null,
    thumbnail_url: meta.image,
    bucket: "read",
  });

  redirect("/you?saved=1");
}

function extractFirstUrl(s: string): string | null {
  const m = /https?:\/\/\S+/i.exec(s);
  return m?.[0]?.replace(/[),.]+$/, "") ?? null;
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
