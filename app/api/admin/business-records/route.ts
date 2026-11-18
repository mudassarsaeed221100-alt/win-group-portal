import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as db } from "../../../../lib/supabase-admin";

const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

async function getMe(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await db.from("profiles").select("id, role").eq("id", data.user.id).single();
  if (!p || !["admin", "super_admin", "founder_owner"].includes(p.role)) return null;
  return p;
}

async function owns(me: any, id: string) {
  const { data } = await db.from("business_records").select("id, created_by").eq("id", id).single();
  return !!data && data.created_by === me.id;
}

export async function GET(req: NextRequest) {
  const me = await getMe(req);
  if (!me) return err("Unauthorized", 401);
  const { data, error } = await db.from("business_records").select("*")
    .eq("created_by", me.id).order("created_at", { ascending: false });
  if (error) return err(error.message);
  return NextResponse.json({ records: data || [] });
}

export async function POST(req: NextRequest) {
  const me = await getMe(req);
  if (!me) return err("Unauthorized", 401);
  const b = await req.json();
  if (!b.title?.trim() || !(Number(b.amount) > 0)) return err("Title aur valid amount likhein");
  const { error } = await db.from("business_records").insert({
    title: b.title.trim(),
    record_type: b.type === "expense" ? "expense" : "income",
    category: b.type === "expense" ? "Expense" : "Income",
    amount: Number(b.amount),
    description: b.description?.trim() || null,
    record_date: new Date().toISOString().slice(0, 10),
    created_by: me.id,
  });
  if (error) return err(error.message);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const me = await getMe(req);
  if (!me) return err("Unauthorized", 401);
  const b = await req.json();
  if (!(await owns(me, b.id))) return err("Not allowed", 403);
  if (!b.title?.trim() || !(Number(b.amount) > 0)) return err("Title aur valid amount likhein");
  const { error } = await db.from("business_records").update({
    title: b.title.trim(),
    record_type: b.type === "expense" ? "expense" : "income",
    category: b.type === "expense" ? "Expense" : "Income",
    amount: Number(b.amount),
    description: b.description?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("id", b.id);
  if (error) return err(error.message);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const me = await getMe(req);
  if (!me) return err("Unauthorized", 401);
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!(await owns(me, id))) return err("Not allowed", 403);
  const { error } = await db.from("business_records").delete().eq("id", id);
  if (error) return err(error.message);
  return NextResponse.json({ ok: true });
}
