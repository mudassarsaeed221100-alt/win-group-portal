
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Login required." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid login session." },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, team_code")
      .eq("id", user.id)
      .single();

    if (adminError || !admin || admin.role !== "admin") {
      return NextResponse.json(
        { error: "Only Admin can access this information." },
        { status: 403 }
      );
    }

    if (!admin.team_code) {
      return NextResponse.json(
        { error: "Your Team Code is missing." },
        { status: 403 }
      );
    }

    // Sirf apni team ke Staff hasil karein.
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, first_name, surname")
      .eq("role", "staff")
      .eq("team_code", admin.team_code);

    if (staffError) {
      return NextResponse.json(
        { error: "Unable to load team members." },
        { status: 500 }
      );
    }

    if (!staff || staff.length === 0) {
      return NextResponse.json({ records: [] });
    }

    const staffIds = staff.map((member) => member.id);

    // Sirf apni team ke Staff ke earning records.
    const { data: submissions, error: submissionError } =
      await supabaseAdmin
        .from("submissions")
        .select("id, user_id, earning_amount, status, created_at")
        .in("user_id", staffIds)
        .gt("earning_amount", 0)
        .order("created_at", { ascending: false });

    if (submissionError) {
      return NextResponse.json(
        { error: "Unable to load earning records." },
        { status: 500 }
      );
    }

    const staffMap = new Map(
      staff.map((member) => [member.id, member])
    );

    const records = (submissions || []).map((item) => {
      const member = staffMap.get(item.user_id);

      return {
        id: item.id,
        user_id: item.user_id,
        username: member?.username || "Staff",
        first_name: member?.first_name || null,
        surname: member?.surname || null,
        earning_amount: Number(item.earning_amount || 0),
        status: item.status || "Unknown",
        created_at: item.created_at,
      };
    });

    return NextResponse.json({ records });
  } catch {
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
