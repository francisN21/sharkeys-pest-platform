import { redirect } from "next/navigation";
import { isAuthed } from "../../../lib/server/auth";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const authed = await isAuthed();
  if (authed) redirect("/account"); // change if needed

  return <LoginClient />;
}