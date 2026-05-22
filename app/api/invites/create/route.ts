import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInviteToken } from "@/lib/utils";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRaw as { id: string; couple_id: string | null } | null;

  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });
  if (profile.couple_id) return NextResponse.json({ error: "already paired" }, { status: 400 });

  const token = generateInviteToken();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("couple_invites").insert({
    from_user: user.id,
    token,
    expires_at,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  return NextResponse.json({
    token,
    url: `${origin}/accept-invite/${token}`,
    expires_at,
  });
}
