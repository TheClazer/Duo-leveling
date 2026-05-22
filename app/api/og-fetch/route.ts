import { NextResponse } from "next/server";
import { fetchOG } from "@/lib/apis/og";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
  try {
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  const meta = await fetchOG(url);
  return NextResponse.json(meta);
}
