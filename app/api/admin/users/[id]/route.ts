import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

async function getCaller(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "Token missing hai.", status: 401 };

  const { data: userData, error: userErr } =
    await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user)
    return { error: "Session invalid hai. Dobara login karein.", status: 401 };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, team_code")
    .eq("id", userData.user.id)
    .single();

  if (!profile) return { error: "Profile nahi mili.", status: 403 };
  if (!["super_admin", "admin"].includes(profile.role))
    return { error: "Aapko ye permission nahi hai.", status: 403 };

  return { profile };
}

// Check: ye staff hai aur caller ki team ka hai
async function getTargetStaff(id: string, caller: any) {
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("id, role, team_code")
    .eq("id", id)
    .maybeSingle();

  if (!target) return { error: "Staff nahi mila.", status: 404 };
  if (target.role !== "staff")
    return { error: "Sirf staff ko edit/delete kar sakte hain.", status: 403 };
  if (caller.role !== "super_admin" && target.team_code !== caller.team_code)
    return { error: "Ye staff aap ki team ka nahi hai.", status: 403 };

  return { target };
}

// Staff edit karna
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const caller = await getCaller(req);
  if (!caller.profile)
    return NextResponse.json({ error: caller.error }, { status: caller.status });

  const check = await getTargetStaff(id, caller.profile);
  if (!check.target)
    return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json().catch(() => ({}));

  const first_name = String(body.first_name ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const phone = String(body.phone ?? "").trim() || null;

  if (!first_name || !surname)
    return NextResponse.json(
      { error: "First name aur surname zaroori hain." },
      { status: 400 }
    );

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ first_name, surname, phone })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: "Staff update ho gaya" });
}

// Staff delete karna
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const caller = await getCaller(req);
  if (!caller.profile)
    return NextResponse.json({ error: caller.error }, { status: caller.status });

  const check = await getTargetStaff(id, caller.profile);
  if (!check.target)
    return NextResponse.json({ error: check.error }, { status: check.status });

  // Auth user delete karne se profile bhi khud delete ho jayegi
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: "Staff delete ho gaya" });
}
