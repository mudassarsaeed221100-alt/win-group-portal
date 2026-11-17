import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, team_code")
      .eq("id", authData.user.id)
      .single();

    if (adminError || !admin || !["admin", "super_admin", "founder_owner"].includes(admin.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!admin.team_code && admin.role !== "founder_owner") {
      return NextResponse.json({ records: [], staff: [] });
    }

    let q = supabaseAdmin
      .from("profiles")
      .select("id, first_name, surname, email, username, team_code")
      .eq("role", "staff");
    if (admin.role !== "founder_owner") q = q.eq("team_code", admin.team_code);

    const { data: staff, error: staffError } = await q;
    if (staffError) throw staffError;

    const staffIds = (staff || []).map((m: any) => m.id);
    if (staffIds.length === 0) {
      return NextResponse.json({ records: [], staff: [] });
    }

    const { data: records, error: recordsError } = await supabaseAdmin
      .from("work_submissions")
      .select("id, user_id, status, earning_amount, created_at")
      .in("user_id", staffIds)
      .order("created_at", { ascending: false });
    if (recordsError) throw recordsError;

    return NextResponse.json({ records: records || [], staff: staff || [] });
  } catch (error) {
    console.error("Admin reports error:", error);
    return NextResponse.json({ error: "Reports load nahi ho sake." }, { status: 500 });
  }
}
