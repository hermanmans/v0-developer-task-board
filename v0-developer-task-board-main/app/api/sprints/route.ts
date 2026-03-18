import { authenticateRequest } from "@/lib/auth";
import type { SprintStatus } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { NextResponse } from "next/server";

const ALLOWED_STATUSES: SprintStatus[] = ["planned", "active", "completed"];

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
    .order("start_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);
  const status = (body.status || "planned") as SprintStatus;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name || !body.startDate || !body.endDate) {
    return NextResponse.json(
      { error: "name, startDate and endDate are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid sprint status" }, { status: 400 });
  }

  if (status === "active") {
    const { data: activeSprint } = await supabase
      .from("sprints")
      .select("id")
      .eq("user_id", boardOwnerUserId)
      .eq("status", "active")
      .maybeSingle();

    if (activeSprint) {
      return NextResponse.json(
        { error: "Only one sprint can be active at a time" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("sprints")
    .insert({
      name,
      start_date: body.startDate,
      end_date: body.endDate,
      status,
      user_id: boardOwnerUserId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
