import { authenticateRequest } from "@/lib/auth";
import type { SprintStatus } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { NextResponse } from "next/server";

const ALLOWED_STATUSES: SprintStatus[] = ["planned", "active", "completed"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.startDate === "string") updates.start_date = body.startDate;
  if (typeof body.endDate === "string") updates.end_date = body.endDate;

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid sprint status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (updates.status === "active") {
    const { data: activeSprint } = await supabase
      .from("sprints")
      .select("id")
      .eq("user_id", boardOwnerUserId)
      .eq("status", "active")
      .neq("id", id)
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
    .update(updates)
    .eq("id", id)
    .eq("user_id", boardOwnerUserId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  const { error } = await supabase
    .from("sprints")
    .delete()
    .eq("id", id)
    .eq("user_id", boardOwnerUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
