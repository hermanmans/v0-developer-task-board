import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Get the report
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status === "promoted") {
    return NextResponse.json(
      { error: "Report already promoted" },
      { status: 400 }
    );
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
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  // Update report status to promoted with link to the task
  await supabase
    .from("reports")
    .update({ status: "promoted", promoted_task_id: task.id })
    .eq("id", id);

  return NextResponse.json({ task, report_id: id }, { status: 201 });
}
