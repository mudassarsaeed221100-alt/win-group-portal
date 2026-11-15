import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

async function getCaller(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("id, role, team_code")
    .eq("id", data.user.id)
    .single();
  if (!p || !["founder_owner", "super_admin", "admin"].includes(p.role)) return null;
  return p;
}

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let q = supabaseAdmin
    .from("profiles")
    .select("id, first_name, surname, username, role")
    .eq("role", "staff");
  if (caller.role !== "founder_owner") q = q.eq("team_code", caller.team_code);
  const { data: staff } = await q;
  const ids = (staff || []).map((s: any) => s.id);

  if (ids.length === 0)
    return NextResponse.json({ staff: [], assignments: [], tasks: [], submissions: [], earnings: [] });

  const { data: assignments } = await supabaseAdmin
    .from("task_assignments")
    .select("task_id, staff_id")
    .in("staff_id", ids);

  const taskIds = [...new Set((assignments || []).map((a: any) => a.task_id))];
  let tasks: any[] = [];
  if (taskIds.length) {
    const { data } = await supabaseAdmin
      .from("work_tasks")
      .select("id, deadline, status, deleted_at")
      .in("id", taskIds);
    tasks = (data || []).filter((t: any) => !t.deleted_at);
  }

  const { data: submissions } = await supabaseAdmin
    .from("work_submissions")
    .select("task_id, user_id, status, created_at")
    .in("user_id", ids);

  const { data: earnings } = await supabaseAdmin
    .from("earnings_ledger")
    .select("user_id, amount, payment_status, withdrawn_amount, created_at")
    .in("user_id", ids);

  return NextResponse.json({
    staff: staff || [],
    assignments: assignments || [],
    tasks,
    submissions: submissions || [],
    earnings: earnings || [],
  });
}
