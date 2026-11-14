import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token)
    return NextResponse.json({ error: "Token missing hai." }, { status: 401 });

  const { data: userData, error: userErr } =
    await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user)
    return NextResponse.json(
      { error: "Session invalid hai. Dobara login karein." },
      { status: 401 }
    );

  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("role, team_code")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!me || !["super_admin", "admin"].includes(me.role))
    return NextResponse.json(
      { error: "Aapko ye permission nahi hai." },
      { status: 403 }
    );

  if (!me.team_code)
    return NextResponse.json(
      { error: "Aapke account ko Team Code assign nahi hai." },
      { status: 400 }
    );

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, surname, role, team_code, avatar_url")
    .eq("team_code", me.team_code)
    .in("role", ["admin", "staff"])
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    team_code: me.team_code,
    members: data ?? [],
  });
}
