import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CoupleInvite, Profile, Couple } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}));
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRaw as Profile | null;
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });
  if (profile.couple_id) {
    return NextResponse.json({ error: "already paired" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data: inviteRaw, error: invErr } = await admin
    .from("couple_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  const invite = inviteRaw as CoupleInvite | null;

  if (invErr || !invite) {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }
  if (invite.used) {
    return NextResponse.json({ error: "invite already used" }, { status: 400 });
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "invite expired" }, { status: 400 });
  }
  if (invite.from_user === user.id) {
    return NextResponse.json({ error: "cannot accept own invite" }, { status: 400 });
  }

  const { data: inviterRaw } = await admin
    .from("profiles")
    .select("*")
    .eq("id", invite.from_user)
    .maybeSingle();
  const inviter = inviterRaw as Profile | null;
  if (!inviter) return NextResponse.json({ error: "inviter not found" }, { status: 400 });
  if (inviter.couple_id) {
    return NextResponse.json({ error: "inviter is already paired" }, { status: 400 });
  }

  const { data: coupleRaw, error: cErr } = await admin
    .from("couples")
    .insert({
      user_a: inviter.id,
      user_b: user.id,
      started_date: new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  const couple = coupleRaw as Couple | null;

  if (cErr || !couple) return NextResponse.json({ error: cErr?.message || "couple insert failed" }, { status: 500 });

  await admin.from("profiles").update({ couple_id: couple.id }).eq("id", inviter.id);
  await admin.from("profiles").update({ couple_id: couple.id }).eq("id", user.id);
  await admin.from("couple_invites").update({ used: true }).eq("id", invite.id);

  return NextResponse.json({ ok: true, couple_id: couple.id });
}
