
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, role, first_name, surname, avatar_url, phone, phone_verified"
      )
      .eq("id", authData.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      profile: data,
      email: authData.user.email ?? "",
    });
  } catch (error) {
    console.error("Profile GET error:", error);

    return NextResponse.json(
      { error: "Profile load nahi ho saka" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: caller, error: callerError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (callerError || caller?.role !== "founder_owner") {
      return NextResponse.json(
        { error: "Founder access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const first_name = String(body.first_name ?? "").trim();
    const surname = String(body.surname ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const avatar_url =
      body.avatar_url === undefined
        ? undefined
        : String(body.avatar_url ?? "").trim();

    if (
      first_name.length > 80 ||
      surname.length > 80 ||
      phone.length > 25 ||
      (avatar_url !== undefined && avatar_url.length > 1000)
    ) {
      return NextResponse.json(
        { error: "Details bohat lambi hain" },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {
      first_name,
      surname,
      phone,
    };

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", authData.user.id)
      .select(
        "id, username, role, first_name, surname, avatar_url, phone, phone_verified"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error("Profile PATCH error:", error);

    return NextResponse.json(
      { error: "Profile update nahi ho saki" },
      { status: 500 }
    );
  }
}
