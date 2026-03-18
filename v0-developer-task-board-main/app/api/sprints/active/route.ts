import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("user_id", boardOwnerUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}
