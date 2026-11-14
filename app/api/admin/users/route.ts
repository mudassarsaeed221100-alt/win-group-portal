
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const rolePermissions: Record<string, string[]> = {
  founder_owner: ["super_admin", "admin", "staff"],
  super_admin: ["admin", "staff"],
  admin: ["staff"],
};

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return { error: "Login required.", status: 401 as const };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { error: "Invalid login session.", status: 401 as const };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, team_code")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Account profile not found.", status: 403 as const };
  }

  if (!rolePermissions[profile.role]) {
    return { error: "You are not authorized.", status: 403 as const };
  }

  return { user, profile };
}

// GET: Apni team ke Staff ki list
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { profile } = auth;

    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, username, first_name, surname, role, team_code, created_at"
      )
      .eq("role", "staff")
      .order("created_at", { ascending: false });

    if (profile.role !== "founder_owner") {
      if (!profile.team_code) {
        return NextResponse.json(
          { error: "Your Team Code is missing." },
          { status: 403 }
        );
      }

      query = query.eq("team_code", profile.team_code);
    }

    const { data: staff, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Unable to load Staff accounts." },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff: staff || [] });
  } catch {
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

// POST: Account create karna
export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;

  try {
    const auth = await authenticate(request);

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { profile } = auth;
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
      !permittedRoles.includes(role) ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof username !== "string" ||
      !email.trim() ||
      !username.trim() ||
      password.length < 8
    ) {
      return NextResponse.json(
        { error: "Invalid details or account creation permission denied." },
        { status: 400 }
      );
    }

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

      // Super Admin aur Admin ka apna Team Code hi assign hoga.
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

    const profileData: Record<string, unknown> = {
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
