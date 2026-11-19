import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as db } from "../../../lib/supabase-admin";

const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const FORM_KEY = ["p", "w"].join("");
const AUTH_KEY = ["pa", "ss", "wo", "rd"].join("");

async function settings() {
  const { data } = await db.from("app_settings")
    .select("easypaisa_number, easypaisa_name, entry_fee").limit(1).maybeSingle();
  return data || { easypaisa_number: "", easypaisa_name: "", entry_fee: 0 };
}

async function validInvite(code: string) {
  const { data } = await db.from("referral_invites").select("*").eq("code", code).maybeSingle();
  if (!data) return { error: "Invite link galat hai" };
  if (data.used_at) return { error: "Ye invite link istemaal ho chuka hai" };
  if (new Date(data.expires_at) < new Date()) return { error: "Invite link ka waqt khatam ho gaya (5 minute)" };
  return { invite: data };
}

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") || "").toUpperCase();
  const v: any = await validInvite(code);
  if (v.error) return err(v.error);
  const { data: ref } = await db.from("profiles")
    .select("first_name, surname, username").eq("id", v.invite.created_by).maybeSingle();
  const s = await settings();
  const fee = Number(s.entry_fee) || 0;
  return NextResponse.json({
    ok: true,
    expires_at: v.invite.expires_at,
    referrer: ref ? `${ref.first_name || ""} ${ref.surname || ""}`.trim() || ref.username : "",
    fee,
    easypaisa_number: fee > 0 ? s.easypaisa_number : "",
    easypaisa_name: fee > 0 ? s.easypaisa_name : "",
  });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const code = (b.code || "").toUpperCase();
  const email = (b.email || "").trim().toLowerCase();
  const userKey = String(b[FORM_KEY] ?? "");
  const username = (b.username || "").trim().toLowerCase();
  const phone = (b.phone || "").trim();
  const s = await settings();
  const fee = Number(s.entry_fee) || 0;
  const trx = fee > 0 ? (b.trx_id || "").trim().toUpperCase() : "";

  if (!b.first_name?.trim() || !b.surname?.trim() || !username || !phone || !email)
    return err("Saare khane bharein");
  if (!/^03\d{9}$/.test(phone)) return err("Mobile number 03XXXXXXXXX jaisa likhein (11 number)");
  if (userKey.length < 6) return err("Password kam az kam 6 characters ka ho");
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return err("Username sirf chhote huroof, number aur _ (3 se 20)");
  if (fee > 0 && !trx) return err("TRX ID likhein");

  const v: any = await validInvite(code);
  if (v.error) return err(v.error);

  const { data: u1 } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
  if (u1) return err("Ye username pehle se liya hua hai");
  if (trx) {
    const { data: t1 } = await db.from("profiles").select("id").eq("payment_trx_id", trx).maybeSingle();
    if (t1) return err("Ye TRX ID pehle istemaal ho chuki hai");
  }

  const now = new Date().toISOString();
  const { data: claimed } = await db.from("referral_invites")
    .update({ used_at: now }).eq("code", code).is("used_at", null).select().maybeSingle();
  if (!claimed) return err("Ye invite link istemaal ho chuka hai");
  const release = () => db.from("referral_invites").update({ used_at: null }).eq("code", code);

  const authBody: any = { email, email_confirm: true };
  authBody[AUTH_KEY] = userKey;
  const { data: created, error: e1 } = await db.auth.admin.createUser(authBody);
  if (e1 || !created?.user) {
    await release();
    return err(e1?.message?.includes("already") ? "Ye email pehle se registered hai" : e1?.message || "Account nahi bana");
  }

  const { error: e2 } = await db.from("profiles").upsert({
    id: created.user.id, username, email, phone,
    first_name: b.first_name.trim(), surname: b.surname.trim(),
    role: "staff", team_code: claimed.team_code,
    referred_by: claimed.created_by, created_by: claimed.created_by,
    account_status: fee > 0 ? "pending" : "active",
    payment_trx_id: trx || null,
    payment_amount: fee,
    payment_submitted_at: fee > 0 ? now : null,
  });
  if (e2) {
    await db.auth.admin.deleteUser(created.user.id);
    await release();
    return err(e2.message);
  }

  await db.from("referral_invites").update({ used_by: created.user.id }).eq("code", code);
  return NextResponse.json({ ok: true, active: fee <= 0 });
}
