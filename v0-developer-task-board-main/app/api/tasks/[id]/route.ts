import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { findUserIdByAssigneeName, getTeamProfilesForBoard } from "@/lib/team-members";
import { sendExpoPushToUser } from "@/lib/push";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization,Content-Type,apikey,x-client-info",
};

function jsonWithCors(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  Object.entries(corsHeaders).forEach(([key, value]) =>
    response.headers.set(key, value)
  );
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);
  const { data: existingTask } = await supabase
    .from("tasks")
    .select("id, title, task_key, assignee")
    .eq("id", id)
    .eq("user_id", boardOwnerUserId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("tasks")
    .update(body)
    .eq("id", id)
    .eq("user_id", boardOwnerUserId)
    .select()
    .single();

  if (error) {
    return jsonWithCors({ error: error.message }, { status: 500 });
  }

  try {
    const profiles = await getTeamProfilesForBoard(boardOwnerUserId, authUser.email);
    const oldAssignee = String(existingTask?.assignee ?? "");
    const newAssignee = String(data?.assignee ?? "");
    const oldAssigneeUserId = oldAssignee
      ? findUserIdByAssigneeName(oldAssignee, profiles)
      : null;
    const newAssigneeUserId = newAssignee
      ? findUserIdByAssigneeName(newAssignee, profiles)
      : null;

    if (newAssigneeUserId && newAssigneeUserId !== oldAssigneeUserId) {
      await sendExpoPushToUser(newAssigneeUserId, {
        title: "Task Assigned to You",
        body: `${data.task_key}: ${data.title}`,
        data: { taskId: data.id, type: "task_assigned" },
      });
    } else if (newAssigneeUserId) {
      await sendExpoPushToUser(newAssigneeUserId, {
        title: "Task Updated",
        body: `${data.task_key}: ${data.title}`,
        data: { taskId: data.id, type: "task_updated" },
      });
    }
  } catch {
    // Non-blocking
  }

  return jsonWithCors(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", boardOwnerUserId);

  if (error) {
    return jsonWithCors({ error: error.message }, { status: 500 });
  }

  return jsonWithCors({ success: true });
}
