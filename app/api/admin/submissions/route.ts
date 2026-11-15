import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

async function getCaller(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("id, role, team_code")
    .eq("id", data.user.id)
    .single();
  if (!p || !["founder_owner", "super_admin", "admin"].includes(p.role)) return null;
  return p;
}

async function teamPeople(caller: any) {
  let q = supabaseAdmin.from("profiles").select("id, first_name, surname, username, role");
  if (caller.role !== "founder_owner") q = q.eq("team_code", caller.team_code);
  const { data } = await q;
  return data || [];
}

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const people = await teamPeople(caller);
  const ids = people.map((p: any) => p.id);
  if (ids.length === 0) return NextResponse.json({ submissions: [] });

  const { data: subs, error } = await supabaseAdmin
    .from("work_submissions")
    .select("*")
    .in("user_id", ids)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const taskIds = [...new Set((subs || []).map((s: any) => s.task_id).filter(Boolean))];
  let tasks: any[] = [];
  if (taskIds.length) {
    const { data } = await supabaseAdmin
      .from("work_tasks")
      .select("id, title, reward_amount")
      .in("id", taskIds);
    tasks = data || [];
  }

  const result = (subs || []).map((s: any) => {
    const p: any = people.find((x: any) => x.id === s.user_id);
    const t: any = tasks.find((x: any) => x.id === s.task_id);
    return {
      ...s,
      staff_name: p ? (`${p.first_name || ""} ${p.surname || ""}`.trim() || p.username) : "—",
      task_title: t?.title || "—",
      reward_amount: t?.reward_amount || 0,
    };
  });

  return NextResponse.json({ submissions: result });
}

export async function PATCH(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const people = await teamPeople(caller);
  const ids = people.map((p: any) => p.id);

  const { data: sub } = await supabaseAdmin
    .from("work_submissions")
    .select("*")
    .eq("id", body.id)
    .single();
  if (!sub || !ids.includes(sub.user_id))
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const now = new Date().toISOString();

  if (body.action === "approve") {
    const amount = Number(body.amount) || 0;
    const { error } = await supabaseAdmin
      .from("work_submissions")
      .update({ status: "approved", earning_amount: amount, reviewed_by: caller.id, reviewed_at: now })
      .eq("id", sub.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Earning: pehle se ho to update, warna nayi
    const { data: old } = await supabaseAdmin
      .from("earnings_ledger")
      .select("id, payment_status")
      .eq("submission_id", sub.id)
      .maybeSingle();

    if (old) {
      if (old.payment_status !== "paid") {
        await supabaseAdmin.from("earnings_ledger").update({ amount }).eq("id", old.id);
      }
    } else if (amount > 0) {
      const { error: e2 } = await supabaseAdmin.from("earnings_ledger").insert({
        submission_id: sub.id,
        user_id: sub.user_id,
        amount,
        payment_status: "unpaid",
      });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reject") {
    const { data: old } = await supabaseAdmin
      .from("earnings_ledger")
      .select("id, payment_status")
      .eq("submission_id", sub.id)
      .maybeSingle();
    if (old?.payment_status === "paid")
      return NextResponse.json({ error: "Is ki payment ho chuki hai, reject nahi ho sakta" }, { status: 400 });
    if (old) await supabaseAdmin.from("earnings_ledger").delete().eq("id", old.id);

    const { error } = await supabaseAdmin
      .from("work_submissions")
      .update({ status: "rejected", earning_amount: 0, reviewed_by: caller.id, reviewed_at: now })
      .eq("id", sub.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Galat action" }, { status: 400 });
}
