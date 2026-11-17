import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Login karein" }, { status: 401 });
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return NextResponse.json({ error: "Login karein" }, { status: 401 });

  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("id, team_code, account_status")
    .eq("id", data.user.id)
    .single();
  if (!p) return NextResponse.json({ error: "Profile nahi mili" }, { status: 400 });
  if (p.account_status === "pending" || p.account_status === "rejected")
    return NextResponse.json({ error: "Aap ka account active nahi" }, { status: 403 });

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from("referral_invites").insert({
    code,
    created_by: p.id,
    team_code: p.team_code,
    expires_at: expires,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ code, expires_at: expires });
}
