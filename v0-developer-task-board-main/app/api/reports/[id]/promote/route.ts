import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,apikey,x-client-info",
};

function withCors(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Get the report
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (reportError || !report) {
    return withCors({ error: "Report not found" }, { status: 404 });
  }

  if (report.status === "promoted") {
    return withCors({ error: "Report already promoted" }, { status: 400 });
  }

  // Get next task key
  const { data: counter, error: counterError } = await supabase.rpc(
    "increment_task_counter",
    { p_user_id: auth.userId }
  );

  let taskKey = "BUG-1";
  if (!counterError && counter !== null) {
    taskKey = `BUG-${counter}`;
  }

  // Create a task from the report
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title: report.title,
      description: report.description,
      type: report.type,
      priority: report.priority,
      status: "backlog",
      labels: [],
      assignee: "",
      task_key: taskKey,
      user_id: auth.userId,
      report_id: report.id,
    })
    .select()
    .single();

  if (taskError) {
    return withCors({ error: taskError.message }, { status: 500 });
  }

  // Update report status to promoted with link to the task
  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: "promoted", promoted_task_id: task.id })
    .eq("id", id);

  if (updateError) {
    return withCors({ error: updateError.message }, { status: 500 });
  }

  return withCors({ task, report_id: id }, { status: 201 });
}
