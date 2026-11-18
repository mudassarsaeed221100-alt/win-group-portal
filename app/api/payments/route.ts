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

async function makeCommissions(userId: string, founderId: string) {
  const { data: done } = await db.from("commissions").select("id")
    .eq("source_type", "entry_fee").eq("source_user_id", userId).limit(1);
  if (done && done.length) return;

  const { data: m } = await db.from("profiles")
    .select("id, referred_by, team_code, payment_amount").eq("id", userId).single();
  if (!m) return;
  const fee = Number(m.payment_amount) || 1000;

  let adminId: string | null = null;
  let saId: string | null = null;
  if (m.team_code) {
    const { data: a } = await db.from("profiles").select("id")
      .eq("role", "admin").eq("team_code", m.team_code).limit(1);
    const { data: s } = await db.from("profiles").select("id")
      .eq("role", "super_admin").eq("team_code", m.team_code).limit(1);
    adminId = a?.[0]?.id || null;
    saId = s?.[0]?.id || null;
  }

  const shares: [string, number, string | null][] = [
    ["Direct Referrer", 35, m.referred_by || null],
    ["Admin", 10, adminId],
    ["Super Admin", 5, saId],
    ["Founder", 40, founderId],
    ["Website", 10, founderId],
  ];

  const rows = shares.map(([share, percent, rid]) => ({
    source_type: "entry_fee",
    source_user_id: userId,
    recipient_id: rid || founderId,
    share: rid ? share : `${share} (Founder ko)`,
    percent,
    amount: Math.round((fee * percent) / 100),
    status: share === "Founder" || share === "Website" || !rid ? "paid" : "unpaid",
  }));
  await db.from("commissions").insert(rows);
}

export async function GET(req: NextRequest) {
  if (!(await founder(req))) return NextResponse.json({ error: "Sirf Founder" }, { status: 403 });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.from("profiles")
    .update({ account_status: "rejected", payment_reviewed_at: new Date().toISOString() })
    .eq("account_status", "pending").lt("payment_submitted_at", cutoff);

  const { data, error } = await db.from("profiles")
    .select("id, first_name, surname, username, email, phone, team_code, referred_by, account_status, payment_trx_id, payment_amount, payment_submitted_at, payment_reviewed_at")
    .not("payment_trx_id", "is", null)
    .order("payment_submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const refIds = [...new Set((data || []).map((x: any) => x.referred_by).filter(Boolean))];
  let refs: any[] = [];
  if (refIds.length) {
    const { data: r } = await db.from("profiles").select("id, first_name, surname, username").in("id", refIds);
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
  const { error } = await db.from("profiles")
    .update({ account_status: status, payment_reviewed_by: f.id, payment_reviewed_at: new Date().toISOString() })
    .eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (b.approve) await makeCommissions(b.id, f.id);
  return NextResponse.json({ ok: true });
}
