import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

async function getCaller(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "Token missing hai.", status: 401 };

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user)
    return { error: "Session invalid hai. Dobara login karein.", status: 401 };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, team_code")
    .eq("id", userData.user.id)
    .single();

  if (!profile) return { error: "Profile nahi mili.", status: 403 };
  if (!["founder_owner", "super_admin", "admin"].includes(profile.role))
    return { error: "Aapko ye permission nahi hai.", status: 403 };

  return { profile };
}

// Staff ki list
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller.profile)
    return NextResponse.json({ error: caller.error }, { status: caller.status });

  let query = supabaseAdmin
    .from("profiles")
    .select("id, username, first_name, surname, phone, role, team_code, created_at")
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  if (!["super_admin", "founder_owner"].includes(caller.profile.role)) {
    query = query.eq("team_code", caller.profile.team_code);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ staff: data ?? [] });
}

// Naya account banana
export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller.profile)
    return NextResponse.json({ error: caller.error }, { status: caller.status });

  const body = await req.json().catch(() => ({}));
  const isFounder = caller.profile.role === "founder_owner";

  const first_name = String(body.first_name ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim() || null;
  const pw = String(body.pw ?? body["password"] ?? "");

  // Founder role aur team code chun sakta hai, baqi sirf staff bana sakte hain
  const role = isFounder && ["super_admin", "admin", "staff"].includes(body.role) ? body.role : "staff";
  const team_code = isFounder
    ? String(body.team_code ?? "").trim().toUpperCase() || null
    : caller.profile.team_code;

  if (!username || !email || !pw)
    return NextResponse.json({ error: "Username, email aur password zaroori hain." }, { status: 400 });
  if (pw.length < 8)
    return NextResponse.json({ error: "Password kam az kam 8 characters ka ho." }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing)
    return NextResponse.json({ error: "Ye username pehle se maujood hai." }, { status: 409 });

  const newUser: any = { email, email_confirm: true };
  newUser["password"] = pw;

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser(newUser);
  if (createErr || !created.user)
    return NextResponse.json({ error: createErr?.message || "User create nahi hua." }, { status: 400 });

  const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    username, first_name, surname, email, phone, role, team_code,
    created_by: caller.profile.id,
  });

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Account ban gaya" }, { status: 201 });
}
