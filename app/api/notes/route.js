import { supabaseServer } from "@/app/lib/supabaseServer";
import { NextResponse } from "next/server";

async function getUser() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, user: null, error: "Unauthorized" };
  }

  return { supabase, user, error: null };
}

export async function GET() {
  const { supabase, user, error: authError } = await getUser();

  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req) {
  const { supabase, user, error: authError } = await getUser();

  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: body.title,
      content: body.content,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req) {
  const { supabase, user, error: authError } = await getUser();

  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
  }

  const updates = {};

  if (body.title !== undefined) {
    updates.title = body.title;
  }

  if (body.content !== undefined) {
    updates.content = body.content;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notes")
    .update(updates)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req) {
  const { supabase, user, error: authError } = await getUser();

  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, deleted: data });
}
