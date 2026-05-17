import { supabaseServer } from "@/app/lib/supabaseServer";

export async function POST(req) {
  const supabase = await supabaseServer();

  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  return Response.json({
    user: data.user,
    session: data.session,
  });
}
