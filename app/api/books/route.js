import { supabase } from "@/app/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .schema("notes")
    .from("books")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  return NextResponse.json(data);
}
