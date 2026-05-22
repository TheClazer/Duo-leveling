import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateInviteToken(): string {
  // 24-char URL-safe token, sufficient entropy for a two-person app
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

export function rankFromLevel(level: number): "E" | "D" | "C" | "B" | "A" | "S" {
  if (level >= 55) return "S";
  if (level >= 35) return "A";
  if (level >= 20) return "B";
  if (level >= 10) return "C";
  if (level >= 5) return "D";
  return "E";
}
