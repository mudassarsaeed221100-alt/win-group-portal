
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

    const { data: submissions, error: submissionError } =
      await supabaseAdmin
        .from("submissions")
        .select("id, user_id, status, earning_amount")
        .in("user_id", staffIds);

    if (submissionError) {
      return NextResponse.json(
        { error: "Unable to load performance records." },
        { status: 500 }
      );
    }

    const records = staff.map((member) => {
      const memberSubmissions = (submissions || []).filter(
        (item) => item.user_id === member.id
      );

      const approved = memberSubmissions.filter(
        (item) => item.status?.toLowerCase() === "approved"
      ).length;

      const pending = memberSubmissions.filter(
        (item) => item.status?.toLowerCase() === "pending"
      ).length;

      const rejected = memberSubmissions.filter(
        (item) => item.status?.toLowerCase() === "rejected"
      ).length;

      const totalEarnings = memberSubmissions.reduce(
        (sum, item) => sum + Math.max(0, Number(item.earning_amount || 0)),
        0
      );

      return {
        user_id: member.id,
        username: member.username || "Staff",
        first_name: member.first_name,
        surname: member.surname,
        total_submissions: memberSubmissions.length,
        approved,
        pending,
        rejected,
        total_earnings: totalEarnings,
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
