import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as db } from "../../../../lib/supabase-admin";

const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const ROLES = ["staff", "admin", "super_admin"];

async function founder(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await db.from("profiles").select("id, role").eq("id", data.user.id).single();
  return p?.role === "founder_owner" ? p : null;
}

export async function GET(req: NextRequest) {
  if (!(await founder(req))) return err("Sirf Founder", 403);
  const { data, error } = await db.from("profiles")
    .select("id, username, first_name, surname, email, role, phone, phone_verified, team_code, referred_by, account_status, created_at")
    .order("created_at", { ascending: false });
  if (error) return err(error.message);
  return NextResponse.json({ members: data || [] });
}

export async function POST(req: NextRequest) {
  const f = await founder(req);
  if (!f) return err("Sirf Founder", 403);
  const b = await req.json();
  const email = (b.email || "").trim().toLowerCase();
  const username = (b.username || "").trim().toLowerCase();
  const pwd=[REDACTED_PASSWORD] || "";
  if (!b.first_name?.trim() || !username || !email) return err("First name, username aur email likhein");
  if (pwd.length < 6) return err("Password kam az kam 6 characters ka ho");
  if (!ROLES.includes(b.role)) return err("Galat role");

  const { data: u } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
  if (u) return err("Ye username pehle se liya hua hai");

  const { data: created, error: e1 } = await db.auth.admin.createUser({ email, password=[REDACTED_PASSWORD] email_confirm: true });
  if (e1 || !created?.user) return err(e1?.message?.includes("already") ? "Ye email pehle se registered hai" : e1?.message || "Account nahi bana");

  const { error: e2 } = await db.from("profiles").upsert({
    id: created.user.id, username, email,
    first_name: b.first_name.trim(), surname: b.surname?.trim() || null,
    phone: b.phone?.trim() || null, role: b.role,
    team_code: b.team_code?.trim() || null,
    account_status: "active", created_by: f.id,
  });
  if (e2) { await db.auth.admin.deleteUser(created.user.id); return err(e2.message); }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await founder(req))) return err("Sirf Founder", 403);
  const b = await req.json();
  const { data: t } = await db.from("profiles").select("role").eq("id", b.id).single();
  if (!t) return err("Member nahi mila", 404);
  if (t.role === "founder_owner") return err("Founder ka account yahan se nahi badla ja sakta", 403);

  const upd: any = {};
  if (b.first_name !== undefined) upd.first_name = b.first_name.trim();
  if (b.surname !== undefined) upd.surname = b.surname.trim() || null;
  if (b.phone !== undefined) upd.phone = b.phone.trim() || null;
  if (b.team_code !== undefined) upd.team_code = b.team_code.trim() || null;
  if (b.role !== undefined) {
    if (!ROLES.includes(b.role)) return err("Galat role");
    upd.role = b.role;
  }
  const { error } = await db.from("profiles").update(upd).eq("id", b.id);
  if (error) return err(error.message);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const f = await founder(req);
  if (!f) return err("Sirf Founder", 403);
  const id = req.nextUrl.searchParams.get("id") || "";
  if (id === f.id) return err("Apna account delete nahi kar sakte");
  const { data: t } = await db.from("profiles").select("role").eq("id", id).single();
  if (t?.role === "founder_owner") return err("Founder ka account delete nahi ho sakta", 403);

  await db.from("profiles").update({ referred_by: null }).eq("referred_by", id);
  await db.from("profiles").update({ created_by: null }).eq("created_by", id);
  await db.from("profiles").delete().eq("id", id);
  const { error } = await db.auth.admin.deleteUser(id);
  if (error && !error.message.toLowerCase().includes("not found")) return err(error.message);
  return NextResponse.json({ ok: true });
}
