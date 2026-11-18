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

async function teamStaff(caller: any) {
  let q = supabaseAdmin.from("profiles").select("id, first_name, surname, username").eq("role", "staff");
  if (caller.role !== "founder_owner") q = q.eq("team_code", caller.team_code || "-");
  const { data } = await q;
  return data || [];
}

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await teamStaff(caller);
  const ids = staff.map((s: any) => s.id);

  let team: any[] = [];
  if (ids.length) {
    const { data } = await supabaseAdmin
      .from("support_tickets").select("*").in("user_id", ids).order("created_at", { ascending: false });
    team = (data || []).map((t: any) => {
      const s: any = staff.find((x: any) => x.id === t.user_id);
      return { ...t, staff_name: s ? (`${s.first_name || ""} ${s.surname || ""}`.trim() || s.username) : "Staff" };
    });
  }

  const { data: mine } = await supabaseAdmin
    .from("support_tickets").select("*").eq("user_id", caller.id).order("created_at", { ascending: false });

  return NextResponse.json({ team, mine: mine || [] });
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.subject?.trim() || !b.message?.trim())
    return NextResponse.json({ error: "Subject aur message dono likhein" }, { status: 400 });

  const { error } = await supabaseAdmin.from("support_tickets").insert({
    user_id: caller.id,
    subject: b.subject.trim(),
    message: b.message.trim(),
    category: b.category || "Other",
    priority: b.priority || "normal",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();

  const staff = await teamStaff(caller);
  const ids = staff.map((s: any) => s.id);
  const { data: t } = await supabaseAdmin.from("support_tickets").select("id, user_id").eq("id", b.id).single();
  if (!t || !ids.includes(t.user_id)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("support_tickets").update({
    admin_reply: b.reply || null,
    status: b.status,
    reviewed_by: caller.id,
    reviewed_at: now,
    updated_at: now,
  }).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
