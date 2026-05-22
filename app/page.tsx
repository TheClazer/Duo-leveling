import { redirect } from "next/navigation";

export default function Root() {
  // middleware will route authed users to /you; unauthed → /login
  redirect("/login");
}
