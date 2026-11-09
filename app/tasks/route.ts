import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

async function verifyUser(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!token) return null;

  const { data: { user }, error } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { user, profile };
}

// GET: Admin tasks dekhe, Staff sirf apne tasks
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

    let query = supabaseAdmin
      .from("staff_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (profile.role === "staff") {
      query = query.eq("assigned_to", profile.id);
    } else if (
      !["founder_owner", "super_admin", "admin"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ tasks: data || [] });
  } catch {
    return NextResponse.json(
      { error: "Could not load tasks" },
      { status: 500 }
    );
  }
}

// POST: Authorized roles Staff ko task assign kar sakte hain
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
    const assigned_to = String(body.assigned_to || "").trim();
    const due_date = body.due_date || null;

    if (!title || !assigned_to) {
      return NextResponse.json(
        { error: "Title and Staff selection are required" },
        { status: 400 }
      );
    }

    const { data: staff } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", assigned_to)
      .eq("role", "staff")
      .single();

    if (!staff) {
      return NextResponse.json(
        { error: "Selected Staff account not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("staff_tasks")
      .insert({
        title,
        description: description || null,
        assigned_to: staff.id,
        created_by: user.id,
        due_date,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not create task" },
      { status: 500 }
    );
  }
}
