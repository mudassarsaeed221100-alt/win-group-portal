import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabaseAdmin
    .from("profiles").select("role").eq("id", data.user.id).single();
  if (!me || !["admin", "super_admin", "founder_owner"].includes(me.role))
    return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { data: list, error } = await supabaseAdmin
    .from("departments")
    .select("id, name, description, status, created_at")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const hidden = ["deleted", "archived"];
  const departments = (list || []).filter(
    (d: any) => !hidden.includes(String(d.status || "").toLowerCase())
  );
  return NextResponse.json({ departments });
}
