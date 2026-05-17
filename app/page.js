import { redirect } from "next/navigation";
import { supabaseServer } from "./lib/supabaseServer";
import HomePageClient from "./HomePageClient";

export default async function Home() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/notes");
  }

  return <HomePageClient />;
}
