import { supabase } from "@/app/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .schema("notes")
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();

  const { data, error } = await supabase
    .schema("notes")
    .from("notes")
    .insert({
      title: body.title,
      content: body.content,
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  return NextResponse.json(data);
}
