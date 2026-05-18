import { redirect } from "next/navigation";
import NotesPageClient from "./NotesPageClient";
import { supabaseServer } from "../lib/supabaseServer";

export default async function NotesPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth");
  }

  return <NotesPageClient user={user} />;
}
