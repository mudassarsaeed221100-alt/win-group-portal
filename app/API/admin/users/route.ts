
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const allowedRoles = [
  "super_admin",
  "admin",
  "staff",
];

export async function POST(request: NextRequest) {
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
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "founder_owner"
    ) {
      return NextResponse.json(
        { error: "Founder access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, username, role } = body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof username !== "string" ||
      typeof role !== "string" ||
      !email.trim() ||
      !username.trim() ||
      password.length < 8 ||
      !allowedRoles.includes(role)
    ) {
      return NextResponse.json(
        { error: "Please provide valid account details." },
        { status: 400 }
      );
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

    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: created.user.id,
        username: username.trim(),
        role,
      });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(
        created.user.id
      );

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
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
