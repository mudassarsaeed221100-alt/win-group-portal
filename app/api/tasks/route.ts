
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

async function verifyUser(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { user, profile };
}

// GET: Staff sirf apne assigned tasks dekhega.
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { profile } = auth;

    if (
      !["founder_owner", "super_admin", "admin", "staff"].includes(
        profile.role
      )
    ) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from("staff_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (profile.role === "staff") {
      const { data: assignments, error: assignmentError } =
        await supabaseAdmin
          .from("task_assignments")
          .select("task_id")
          .eq("staff_id", profile.id);

      if (assignmentError) throw assignmentError;

      const taskIds = (assignments || []).map((item) => item.task_id);

      if (taskIds.length === 0) {
        return NextResponse.json({ tasks: [] });
      }

      query = query.in("id", taskIds);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    const taskList = tasks || [];
    const taskIds = taskList.map((task) => task.id);

    let assigneesByTask: Record<
      string,
      { id: string; username: string }[]
    > = {};

    if (taskIds.length > 0) {
      const { data: assignments, error: listError } =
        await supabaseAdmin
          .from("task_assignments")
          .select("task_id, staff_id")
          .in("task_id", taskIds);

      if (listError) throw listError;

      const staffIds = [
        ...new Set((assignments || []).map((item) => item.staff_id)),
      ];

      let profiles: { id: string; username: string }[] = [];

      if (staffIds.length > 0) {
        const { data: profileRows, error: profileError } =
          await supabaseAdmin
            .from("profiles")
            .select("id, username")
            .in("id", staffIds);

        if (profileError) throw profileError;
        profiles = profileRows || [];
      }

      for (const assignment of assignments || []) {
        const person = profiles.find(
          (item) => item.id === assignment.staff_id
        );

        if (!person) continue;

        if (!assigneesByTask[assignment.task_id]) {
          assigneesByTask[assignment.task_id] = [];
        }

        assigneesByTask[assignment.task_id].push(person);
      }
    }

    const result = taskList.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.id] || [],
    }));

    return NextResponse.json({ tasks: result });
  } catch {
    return NextResponse.json(
      { error: "Could not load tasks" },
      { status: 500 }
    );
  }
}

// POST: Ek task multiple Staff members ko assign karein.
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { user, profile } = auth;

    if (
      !["founder_owner", "super_admin", "admin"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const due_date = body.due_date || null;

    const assignedIds: string[] = Array.isArray(body.assigned_to)
      ? [...new Set(
          body.assigned_to
            .map((id: unknown) => String(id).trim())
            .filter(Boolean)
        )]
      : [];

    if (!title || assignedIds.length === 0) {
      return NextResponse.json(
        { error: "Task title aur kam az kam ek Staff select karein." },
        { status: 400 }
      );
    }

    const { data: staffMembers, error: staffError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("id", assignedIds)
        .eq("role", "staff");

    if (staffError) throw staffError;

    if (!staffMembers || staffMembers.length !== assignedIds.length) {
      return NextResponse.json(
        { error: "Selected Staff mein koi invalid account hai." },
        { status: 400 }
      );
    }

    // Purane task table mein pehla Staff ID bhi rakha ja raha hai
    // taake existing data structure compatible rahe.
    const { data: task, error: taskError } = await supabaseAdmin
      .from("staff_tasks")
      .insert({
        title,
        description: description || null,
        assigned_to: assignedIds[0],
        created_by: user.id,
        due_date,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    const assignmentRows = assignedIds.map((staffId) => ({
      task_id: task.id,
      staff_id: staffId,
    }));

    const { error: assignmentError } = await supabaseAdmin
      .from("task_assignments")
      .insert(assignmentRows);

    if (assignmentError) {
      // Assignment fail ho to naya task bhi remove kar dein.
      await supabaseAdmin
        .from("staff_tasks")
        .delete()
        .eq("id", task.id);

      throw assignmentError;
    }

    return NextResponse.json(
      { task, assigned_count: assignedIds.length },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Could not create task. Dobara try karein." },
      { status: 500 }
    );
  }
}
