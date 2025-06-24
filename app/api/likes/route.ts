export const dynamic = "force-dynamic"; // ✅ Force dynamic behavior

import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET: Return total count
export async function GET() {
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count });
}

// POST: Add a like from a unique user
export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  // Try inserting (will fail if already liked)
  const { error: insertError } = await supabase
    .from("likes")
    .insert({ user_id: userId });

  if (insertError && insertError.code !== "23505") {
    // 23505 is duplicate violation (already liked)
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Return updated count
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count });
}
