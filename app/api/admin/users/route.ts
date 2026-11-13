
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const rolePermissions: Record<string, string[]> = {
  founder_owner: ["super_admin", "admin", "staff"],
  super_admin: ["staff"],
  admin: ["staff"],
};

// GET: Staff accounts ki list
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

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role, team_code")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile ||
      !["founder_owner", "super_admin", "admin"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorized." },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from("profiles")
      .select("id, username, first_name, surname, role, team_code, created_at")
      .eq("role", "staff")
      .order("created_at", { ascending: false });

    // Founder tamam Staff dekh sakta hai.
    // Super Admin aur Admin sirf apni team ke Staff dekhenge.
    if (profile.role !== "founder_owner") {
      if (!profile.team_code) {
        return NextResponse.json(
          { error: "Your Team Code is missing." },
          { status: 403 }
        );
      }

      query = query.eq("team_code", profile.team_code);
    }

    const { data: staff, error: staffError } = await query;

    if (staffError) {
      return NextResponse.json(
        { error: "Unable to load Staff accounts." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      staff: staff || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

// POST: New account create karna
export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;

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

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role, team_code")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Account profile not found." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      email,
      password,
      username,
      role,
      first_name,
      surname,
      phone,
      team_code,
    } = body;

    const permittedRoles = rolePermissions[profile.role];

    if (
      !permittedRoles ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof username !== "string" ||
      typeof role !== "string" ||
      !email.trim() ||
      !username.trim() ||
      password.length < 8 ||
      !permittedRoles.includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create this account or the details are invalid.",
        },
        { status: 403 }
      );
    }

    // Super Admin aur Admin apni team mein hi Staff bana sakte hain.
    let assignedTeamCode: string | null = null;

    if (profile.role === "founder_owner") {
      assignedTeamCode =
        typeof team_code === "string" && team_code.trim()
          ? team_code.trim()
          : null;
    } else {
      if (!profile.team_code) {
        return NextResponse.json(
          { error: "Your Team Code is missing." },
          { status: 403 }
        );
      }

      assignedTeamCode = profile.team_code;
    }

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
      });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Account creation failed." },
        { status: 400 }
      );
    }

    createdUserId = created.user.id;

    const profileData: Record<string, any> = {
      id: created.user.id,
      username: username.trim(),
      role,
      team_code: assignedTeamCode,
    };

    if (typeof first_name === "string") {
      profileData.first_name = first_name.trim();
    }

    if (typeof surname === "string") {
      profileData.surname = surname.trim();
    }

    if (typeof phone === "string") {
      profileData.phone = phone.trim();
    }

    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert(profileData);

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      createdUserId = null;

      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
