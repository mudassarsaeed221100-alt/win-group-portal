import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

async function founder(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await supabaseAdmin.from("profiles").select("id, role").eq("id", data.user.id).single();
  return p?.role === "founder_owner" ? p : null;
}

export async function GET(req: NextRequest) {
  if (!(await founder(req))) return NextResponse.json({ error: "Sirf Founder" }, { status: 403 });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("profiles")
    .update({ account_status: "rejected", payment_reviewed_at: new Date().toISOString() })
    .eq("account_status", "pending")
    .lt("payment_submitted_at", cutoff);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, surname, username, email, phone, team_code, referred_by, account_status, payment_trx_id, payment_amount, payment_submitted_at, payment_reviewed_at")
    .not("payment_trx_id", "is", null)
    .order("payment_submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const refIds = [...new Set((data || []).map((x: any) => x.referred_by).filter(Boolean))];
  let refs: any[] = [];
  if (refIds.length) {
    const { data: r } = await supabaseAdmin.from("profiles").select("id, first_name, surname, username").in("id", refIds);
    refs = r || [];
  }
  const list = (data || []).map((x: any) => {
    const r = refs.find((y) => y.id === x.referred_by);
    return { ...x, referrer: r ? `${r.first_name || ""} ${r.surname || ""}`.trim() || r.username : "—" };
  });
  return NextResponse.json({ list });
}

export async function PATCH(req: NextRequest) {
  const f = await founder(req);
  if (!f) return NextResponse.json({ error: "Sirf Founder" }, { status: 403 });
  const b = await req.json();
  const status = b.approve ? "active" : "rejected";
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ account_status: status, payment_reviewed_by: f.id, payment_reviewed_at: new Date().toISOString() })
    .eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
