import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

async function getCaller(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await supabaseAdmin
    .from("profiles").select("id, role, team_code").eq("id", data.user.id).single();
  if (!p || !["founder_owner", "super_admin", "admin"].includes(p.role)) return null;
  return p;
}

function canEdit(caller: any) {
  return caller.role === "super_admin" || caller.role === "founder_owner";
}

async function teamPeople(caller: any) {
  let q = supabaseAdmin.from("profiles").select("id, first_name, surname, username, role");
  if (caller.role !== "founder_owner") q = q.eq("team_code", caller.team_code || "-");
  const { data } = await q;
  return data || [];
}

async function visibleTaskIds(caller: any) {
  const people = await teamPeople(caller);
  const ids = people.map((p: any) => p.id);
  if (!ids.includes(caller.id)) ids.push(caller.id);
  let q = supabaseAdmin.from("work_tasks").select("id").is("deleted_at", null);
  if (caller.role !== "founder_owner") q = q.in("created_by", ids);
  const { data } = await q;
  return (data || []).map((t: any) => t.id);
}

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const people = await teamPeople(caller);
  const staff = people.filter((p: any) => p.role === "staff");
  const ids = await visibleTaskIds(caller);
  if (ids.length === 0) return NextResponse.json({ tasks: [], staff, can_edit: canEdit(caller) });

  const { data: tasks } = await supabaseAdmin
    .from("work_tasks").select("*").in("id", ids).order("created_at", { ascending: false });
  const { data: asg } = await supabaseAdmin
    .from("task_assignments").select("task_id, staff_id").in("task_id", ids);
  const { data: subs } = await supabaseAdmin
    .from("work_submissions").select("task_id, user_id, status").in("task_id", ids);

  const result = (tasks || []).map((t: any) => ({
    ...t,
    assigned: (asg || []).filter((a: any) => a.task_id === t.id).map((a: any) => a.staff_id),
    submitted_by: (subs || []).filter((s: any) => s.task_id === t.id).map((s: any) => s.user_id),
    submitted: (subs || []).filter((s: any) => s.task_id === t.id).length,
    approved: (subs || []).filter((s: any) => s.task_id === t.id && s.status === "approved").length,
  }));

  return NextResponse.json({ tasks: result, staff, can_edit: canEdit(caller) });
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(caller)) return NextResponse.json({ error: "Admin task nahi bana sakta" }, { status: 403 });

  const body = await req.json();
  const title = (body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title zaroori hai" }, { status: 400 });

  const people = await teamPeople(caller);
  const allowed = people.filter((p: any) => p.role === "staff").map((p: any) => p.id);
  const staffIds: string[] = (body.staff_ids || []).filter((id: string) => allowed.includes(id));

  const { data: task, error } = await supabaseAdmin
    .from("work_tasks")
    .insert({
      title,
      description: body.description || null,
      reward_amount: Number(body.reward_amount) || 0,
      deadline: body.deadline || null,
      target_roles: ["staff"],
      status: "active",
      created_by: caller.id,
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (staffIds.length > 0) {
    const { error: e2 } = await supabaseAdmin
      .from("task_assignments")
      .insert(staffIds.map((sid) => ({ task_id: task.id, staff_id: sid })));
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(caller)) return NextResponse.json({ error: "Admin task nahi badal sakta" }, { status: 403 });

  const body = await req.json();
  const ids = await visibleTaskIds(caller);
  if (!ids.includes(body.id)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const status = body.status === "inactive" ? "inactive" : "active";
  const { error } = await supabaseAdmin
    .from("work_tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(caller)) return NextResponse.json({ error: "Admin task delete nahi kar sakta" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id") || "";
  const ids = await visibleTaskIds(caller);
  if (!ids.includes(id)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { error } = await supabaseAdmin
    .from("work_tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
