import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabaseAdmin
    .from("profiles").select("id, role").eq("id", data.user.id).single();
  if (!me) return NextResponse.json({ error: "Profile nahi mili" }, { status: 403 });

  const { data: list, error } = await supabaseAdmin
    .from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const hidden = ["inactive", "draft", "deleted", "archived"];
  const forMe = (n: any) => {
    const r = n.recipient_roles;
    if (!r || (Array.isArray(r) && r.length === 0)) return true;
    const arr = Array.isArray(r) ? r : String(r).split(/[,{}"\s]+/).filter(Boolean);
    return arr.includes("all") || arr.includes(me.role);
  };

  const notifications = (list || [])
    .filter((n: any) => !hidden.includes(String(n.status || "").toLowerCase()))
    .filter(forMe);

  return NextResponse.json({ notifications, user_id: me.id });
}
