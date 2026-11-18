import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as db } from "../../../lib/supabase-admin";

async function founder(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await db.from("profiles").select("id, role").eq("id", data.user.id).single();
  return p?.role === "founder_owner" ? p : null;
}

const nm = (p: any) => (p ? `${p.first_name || ""} ${p.surname || ""}`.trim() || p.username || "—" : "—");

export async function GET(req: NextRequest) {
  if (!(await founder(req))) return NextResponse.json({ error: "Sirf Founder" }, { status: 403 });
  const { data, error } = await db.from("commissions").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = [...new Set((data || []).flatMap((c: any) => [c.recipient_id, c.source_user_id]).filter(Boolean))];
  let people: any[] = [];
  if (ids.length) {
    const { data: p } = await db.from("profiles").select("id, first_name, surname, username, role").in("id", ids);
    people = p || [];
  }
  const list = (data || []).map((c: any) => ({
    ...c,
    recipient_name: nm(people.find((p) => p.id === c.recipient_id)),
    member_name: nm(people.find((p) => p.id === c.source_user_id)),
  }));
  return NextResponse.json({ list });
}

export async function PATCH(req: NextRequest) {
  if (!(await founder(req))) return NextResponse.json({ error: "Sirf Founder" }, { status: 403 });
  const b = await req.json();
  const status = b.status === "unpaid" ? "unpaid" : "paid";
  const { error } = await db.from("commissions")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
