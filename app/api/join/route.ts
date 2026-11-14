import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

// Link check karna (page kholte waqt)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const { data: inv } = await supabaseAdmin
    .from("referral_invites")
    .select("code, created_by, expires_at, used_by")
    .eq("code", code)
    .maybeSingle();

  if (!inv) return NextResponse.json({ error: "Ye link sahi nahi hai." }, { status: 404 });
  if (inv.used_by) return NextResponse.json({ error: "Ye link pehle hi use ho chuka hai." }, { status: 410 });
  if (new Date(inv.expires_at) < new Date())
    return NextResponse.json({ error: "Ye link expire ho chuka hai (5 minute guzar gaye)." }, { status: 410 });

  const { data: ref } = await supabaseAdmin
    .from("profiles")
    .select("first_name, surname, username")
    .eq("id", inv.created_by)
    .maybeSingle();

  return NextResponse.json({
    expires_at: inv.expires_at,
    referrer: [ref?.first_name, ref?.surname].filter(Boolean).join(" ") || ref?.username || "Member",
  });
}

// Account banana
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  const first_name = String(body.first_name ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim() || null;
  const pw = String(body.pw ?? "");

  if (!code || !first_name || !username || !email || !pw)
    return NextResponse.json({ error: "Tamam zaroori fields bharein." }, { status: 400 });
  if (!/^[a-z0-9_.]{3,30}$/.test(username))
    return NextResponse.json({ error: "Username 3-30 characters ka ho (a-z, 0-9, _ .)." }, { status: 400 });
  if (pw.length < 8)
    return NextResponse.json({ error: "Password kam az kam 8 characters ka ho." }, { status: 400 });

  const { data: taken } = await supabaseAdmin
    .from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return NextResponse.json({ error: "Ye username pehle se maujood hai." }, { status: 409 });

  // Link ko "lock" karna, taake 2 log ek saath use na kar sakein
  const nowIso = new Date().toISOString();
  const { data: claimed } = await supabaseAdmin
    .from("referral_invites")
    .update({ used_at: nowIso })
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .select("code, created_by, team_code")
    .maybeSingle();

  if (!claimed)
    return NextResponse.json({ error: "Link expire ho chuka hai ya pehle use ho chuka hai." }, { status: 410 });

  const unlock = () =>
    supabaseAdmin.from("referral_invites").update({ used_at: null }).eq("code", code);

  const newUser: any = { email, email_confirm: true };
  newUser["password"] = pw;
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser(newUser);

  if (createErr || !created.user) {
    await unlock();
    const msg = createErr?.message?.includes("already") ? "Ye email pehle se registered hai." : createErr?.message || "Account nahi bana.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: profErr } = await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    username, first_name, surname, email, phone,
    role: "staff",
    team_code: claimed.team_code,
    referred_by: claimed.created_by,
    created_by: claimed.created_by,
  });

  if (profErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    await unlock();
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  await supabaseAdmin.from("referral_invites").update({ used_by: created.user.id }).eq("code", code);

  return NextResponse.json({ message: "Account ban gaya!" }, { status: 201 });
}
