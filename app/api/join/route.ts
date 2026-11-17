import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

async function settings() {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("easypaisa_number, easypaisa_name, entry_fee")
    .limit(1)
    .maybeSingle();
  return data || { easypaisa_number: "", easypaisa_name: "", entry_fee: 1000 };
}

async function validInvite(code: string) {
  const { data } = await supabaseAdmin
    .from("referral_invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (!data) return { error: "Invite link galat hai" };
  if (data.used_at) return { error: "Ye invite link istemaal ho chuka hai" };
  if (new Date(data.expires_at) < new Date()) return { error: "Invite link ka waqt khatam ho gaya (5 minute)" };
  return { invite: data };
}

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") || "").toUpperCase();
  const v = await validInvite(code);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });

  const { data: ref } = await supabaseAdmin
    .from("profiles")
    .select("first_name, surname, username")
    .eq("id", v.invite.created_by)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    expires_at: v.invite.expires_at,
    referrer: ref ? `${ref.first_name || ""} ${ref.surname || ""}`.trim() || ref.username : "",
    settings: await settings(),
  });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const code = (b.code || "").toUpperCase();
  const email = (b.email || "").trim().toLowerCase();
  const pwd = b.pw || "";
  const username = (b.username || "").trim().toLowerCase();
  const trx = (b.trx_id || "").trim().toUpperCase();

  if (!b.first_name || !email || !username || !trx)
    return NextResponse.json({ error: "Saare khane bharein" }, { status: 400 });
  if (pwd.length < 6)
    return NextResponse.json({ error: "Password kam az kam 6 characters ka ho" }, { status: 400 });
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return NextResponse.json({ error: "Username sirf chhote huroof, number aur _ (3 se 20)" }, { status: 400 });

  const v = await validInvite(code);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });

  const { data: u1 } = await supabaseAdmin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (u1) return NextResponse.json({ error: "Ye username pehle se liya hua hai" }, { status: 400 });
  const { data: t1 } = await supabaseAdmin.from("profiles").select("id").eq("payment_trx_id", trx).maybeSingle();
  if (t1) return NextResponse.json({ error: "Ye TRX ID pehle istemaal ho chuki hai" }, { status: 400 });

  // Invite ko lock karein (sirf ek dafa)
  const now = new Date().toISOString();
  const { data: claimed } = await supabaseAdmin
    .from("referral_invites")
    .update({ used_at: now })
    .eq("code", code)
    .is("used_at", null)
    .select()
    .maybeSingle();
  if (!claimed) return NextResponse.json({ error: "Ye invite link istemaal ho chuka hai" }, { status: 400 });

  const release = () => supabaseAdmin.from("referral_invites").update({ used_at: null }).eq("code", code);

  const { data: created, error: e1 } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pwd,
    email_confirm: true,
  });
  if (e1 || !created?.user) {
    await release();
    return NextResponse.json({ error: e1?.message?.includes("already") ? "Ye email pehle se registered hai" : (e1?.message || "Account nahi bana") }, { status: 400 });
  }

  const s = await settings();
  const { error: e2 } = await supabaseAdmin.from("profiles").upsert({
    id: created.user.id,
    username,
    first_name: b.first_name,
    surname: b.surname || null,
    phone: b.phone || null,
    email,
    role: "staff",
    team_code: claimed.team_code,
    referred_by: claimed.created_by,
    created_by: claimed.created_by,
    account_status: "pending",
    payment_trx_id: trx,
    payment_amount: s.entry_fee,
    payment_submitted_at: now,
  });
  if (e2) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    await release();
    return NextResponse.json({ error: e2.message }, { status: 400 });
  }

  await supabaseAdmin.from("referral_invites").update({ used_by: created.user.id }).eq("code", code);
  return NextResponse.json({ ok: true });
}
